// Server side builder for the "For you" feed (used by pages/api/feed.js).
//
// Keeps a rolling window of the newest posts in memory, so a refresh only
// reads the posts created since the last one. Author data (profile, premium,
// post count) and engagement are cached, and every visitor shares one
// computed feed, so the chain sees the same small load however many people
// have the page open. Filtering and ranking rules live in lib/feedRank.js.

import { CONTRACTS, viewCall } from './contracts';
import {
  RULES,
  authorsToCheck,
  buildForYou,
  contentVerdicts,
} from './feedRank';

const FEED_TTL_MS = 15_000; // how long one computed feed is served
const AUTHOR_TTL_MS = 10 * 60_000; // profile, premium and post count
const AUTHOR_FAIL_TTL_MS = 30_000; // retry soon when a read failed
const ENGAGEMENT_TTL_MS = 60_000; // likes and comment counts
const RANGE_MAX = 200; // getPostRange limit in the contract
const CONCURRENCY = 6;

const state = {
  posts: new Map(), // id -> post, newest WINDOW_POSTS only
  latestId: 0n,
  authors: new Map(), // addr -> { at, ttl, info }
  engagement: new Map(), // id -> { at, score, comments }
  feed: null, // { at, payload }
  inflight: null,
};

const truthy = (v) => v === true || v === '1' || v === 1;

async function view(contract, method, args, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      return await viewCall(contract, method, args);
    } catch (err) {
      // A contract revert will not change on retry; a busy RPC might.
      if (i + 1 >= tries || /view \w+: /.test(String(err.message))) throw err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function refreshWindow() {
  const latest = BigInt(await view(CONTRACTS.posts, 'getLatestPostId', []));
  const window = BigInt(RULES.WINDOW_POSTS);
  if (latest < state.latestId) {
    // Chain reset: start over.
    state.posts.clear();
    state.engagement.clear();
    state.latestId = 0n;
  }
  const floor = latest > window ? latest - window + 1n : 1n;
  let from = state.latestId + 1n > floor ? state.latestId + 1n : floor;
  const ranges = [];
  while (from <= latest) {
    const to = from + BigInt(RANGE_MAX - 1) < latest ? from + BigInt(RANGE_MAX - 1) : latest;
    ranges.push([from, to]);
    from = to + 1n;
  }
  const chunks = await mapLimit(ranges, 3, ([lo, hi]) =>
    view(CONTRACTS.posts, 'getPostRange', [String(lo), String(hi)]));
  for (const chunk of chunks) {
    for (const p of chunk || []) state.posts.set(String(p.id), p);
  }
  for (const id of state.posts.keys()) {
    if (BigInt(id) < floor) state.posts.delete(id);
  }
  state.latestId = latest;
}

// Profile first. Premium and post count are read only when the profile alone
// does not settle trust, which keeps a cold start to a few hundred reads.
async function readAuthor(addr, tipBlock) {
  const profile = await view(CONTRACTS.profile, 'getProfile', [addr]).catch(() => undefined);
  const info = { profile: profile || null, premium: false, postCount: 0 };
  const name = String(profile?.name || '').trim();
  const avatar = String(profile?.avatar || '').trim();
  if (name && avatar) return { info, ok: profile !== undefined };
  const joined = Number(profile?.joinedAt || 0);
  if (name && joined > 0 && tipBlock - joined >= RULES.MIN_ACCOUNT_AGE_BLOCKS) {
    info.postCount = Number(await view(CONTRACTS.posts, 'getUserPostCount', [addr]).catch(() => 0));
    if (info.postCount >= RULES.MIN_AUTHOR_POSTS) return { info, ok: true };
  }
  const [lifetime, legacy] = await Promise.all([
    view(CONTRACTS.premiumLifetime, 'isPremium', [addr]).then(truthy).catch(() => false),
    view(CONTRACTS.premium, 'isPremium', [addr]).then(truthy).catch(() => false),
  ]);
  info.premium = lifetime || legacy;
  return { info, ok: profile !== undefined };
}

async function authorInfo(addrs, tipBlock) {
  const now = Date.now();
  const stale = addrs.filter((a) => {
    const hit = state.authors.get(a);
    return !hit || now - hit.at > hit.ttl;
  });
  await mapLimit(stale, CONCURRENCY, async (a) => {
    const { info, ok } = await readAuthor(a, tipBlock);
    state.authors.set(a, { at: Date.now(), ttl: ok ? AUTHOR_TTL_MS : AUTHOR_FAIL_TTL_MS, info });
  });
  // Forget authors that left the window.
  if (state.authors.size > addrs.length * 4) {
    const keep = new Set(addrs);
    for (const a of state.authors.keys()) if (!keep.has(a)) state.authors.delete(a);
  }
  return Object.fromEntries(addrs.map((a) => [a, state.authors.get(a)?.info]));
}

async function engagementFor(ids) {
  const now = Date.now();
  const stale = ids.filter((id) => {
    const hit = state.engagement.get(id);
    return !hit || now - hit.at > ENGAGEMENT_TTL_MS;
  });
  const scores = {};
  for (let i = 0; i < stale.length; i += RANGE_MAX) {
    const batch = stale.slice(i, i + RANGE_MAX);
    try {
      Object.assign(scores, await view(CONTRACTS.votes, 'getScores', [batch]));
    } catch { /* rank without likes for this round */ }
  }
  await mapLimit(stale, CONCURRENCY, async (id) => {
    const comments = Number(await view(CONTRACTS.comments, 'getCommentCount', [id]).catch(() => 0)) || 0;
    state.engagement.set(id, { at: Date.now(), score: Number(scores[id]?.score || 0), comments });
  });
  for (const id of state.engagement.keys()) if (!state.posts.has(id)) state.engagement.delete(id);
  return Object.fromEntries(ids.map((id) => [id, state.engagement.get(id) || { score: 0, comments: 0 }]));
}

async function compute() {
  await refreshWindow();
  const posts = Array.from(state.posts.values());
  const tipBlock = posts.reduce((m, p) => Math.max(m, Number(p.block) || 0), 0);

  // Content rules need no chain reads, so they run first and shrink the
  // set of authors and posts that need any.
  const hidden = contentVerdicts(posts);
  const addrs = authorsToCheck(posts, hidden);
  const authors = await authorInfo(addrs, tipBlock);
  const survivors = posts.filter((p) => !hidden.has(String(p.id)));
  const engagement = await engagementFor(survivors.map((p) => String(p.id)));

  const result = buildForYou({ posts, authors, engagement, tipBlock });
  const counts = {};
  for (const reason of result.hidden.values()) counts[reason] = (counts[reason] || 0) + 1;

  const profiles = {};
  const scores = {};
  for (const p of result.posts) {
    const a = String(p.author || '').toLowerCase();
    const prof = authors[a]?.profile;
    // Components read avatarUrl, the contract stores avatar (see getProfile).
    profiles[a] = prof ? { ...prof, avatarUrl: prof.avatarUrl || prof.avatar || '' } : null;
    scores[String(p.id)] = engagement[String(p.id)]?.score || 0;
  }
  return {
    posts: result.posts,
    profiles,
    scores,
    stats: { window: posts.length, shown: result.posts.length, hidden: counts },
    generatedAt: Date.now(),
  };
}

/** The current "For you" feed, shared by every request within FEED_TTL_MS. */
export async function getForYouFeed() {
  const fresh = state.feed && Date.now() - state.feed.at < FEED_TTL_MS;
  if (fresh) return state.feed.payload;
  if (!state.inflight) {
    state.inflight = compute()
      .then((payload) => {
        state.feed = { at: Date.now(), payload };
        return payload;
      })
      .finally(() => { state.inflight = null; });
  }
  // Serve the previous feed while a refresh runs, if there is one. A failed
  // background refresh is retried on the next request.
  if (state.feed) {
    state.inflight.catch((err) => console.error('[feed] refresh failed:', err?.message || err));
    return state.feed.payload;
  }
  return state.inflight;
}
