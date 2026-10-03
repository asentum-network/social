// "For you" feed rules. Pure functions, no network, so the same code runs in
// the /api/feed route and in the tests.
//
// Two steps:
//   1. Filter. A post is shown only if its author is trusted and the post
//      itself does not look like spam (rules below, thresholds in RULES).
//   2. Rank. Newest first, but some posts get a head start: a post with an
//      image ranks as if it was posted IMAGE_BOOST_MIN minutes later, one
//      with an emoji EMOJI_BOOST_MIN minutes later, and every net like or
//      comment adds ENGAGEMENT_BOOST_MIN minutes (capped). Net downvotes
//      push a post back the same way. Ties break on the higher post id.
//
// Thresholds were tuned on the live testnet feed (about 8 posts a minute,
// most of it airdrop farming: the same five template lines posted from
// dozens of accounts, plus "gm", "gn" and two word filler).

export const RULES = {
  // Candidate pool: the newest N posts (about 4 hours at the current rate).
  WINDOW_POSTS: 2000,
  // How many posts the feed returns.
  FEED_SIZE: 50,
  // One account can fill at most this many slots of the feed.
  MAX_PER_AUTHOR: 2,

  // Author trust.
  // Verified: premium (the blue check), or a profile with both a name and an avatar.
  // Established: a profile name, a profile older than MIN_ACCOUNT_AGE_BLOCKS
  // (about a day at the current ~6s blocks) and at least MIN_AUTHOR_POSTS posts.
  MIN_ACCOUNT_AGE_BLOCKS: 15_000,
  MIN_AUTHOR_POSTS: 3,

  // Post content.
  // Text only posts need at least this many letters or digits once links,
  // mentions, hashtags and emoji are removed (CJK characters count double).
  MIN_TEXT_CHARS: 16,
  // A text whose links take more than this share of its characters is hidden.
  MAX_LINK_SHARE: 0.5,
  // Keyboard mash: 8+ of the same character in a row, or 8+ characters
  // drawn from at most MAX_DISTINCT_CHARS distinct characters ("hahahahaha").
  REPEAT_RUN: 8,
  MAX_DISTINCT_CHARS: 3,
  // Two texts are near duplicates when their character trigram sets overlap
  // this much (Jaccard), after case, digits, punctuation and emoji are removed.
  NEAR_DUP_SIMILARITY: 0.7,
  // A text with this many near duplicate copies in the window (any authors,
  // counting itself) is a template and every copy is hidden.
  TEMPLATE_MIN_COPIES: 3,
  // An author with at least this many posts in the window, of which at least
  // this share broke a content rule, is treated as a spam account and all
  // their posts in the window are hidden.
  SPAM_AUTHOR_MIN_POSTS: 3,
  SPAM_AUTHOR_SHARE: 0.5,

  // Ranking head starts, in minutes.
  IMAGE_BOOST_MIN: 20,
  EMOJI_BOOST_MIN: 5,
  ENGAGEMENT_BOOST_MIN: 3,
  ENGAGEMENT_CAP: 10,
};

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
// Wallet addresses, hex or ase1. Posting them is the most common farming
// pattern (address drops), and hex must never reach the UI anyway.
const ADDRESS_RE = /\b(?:0x[0-9a-fA-F]{40}|ase1[02-9ac-hj-np-z]{38,})\b/i;
const MENTION_TAG_RE = /[@#][\p{L}\p{N}_]+/gu;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

const lower = (a) => String(a || '').toLowerCase();

/** Seconds since epoch; the chain stamps blocks in ms, older posts in s. */
function tsSeconds(ts) {
  const n = Number(ts);
  if (!n || Number.isNaN(n)) return 0;
  return n > 1e11 ? n / 1000 : n;
}

export function hasEmoji(text) {
  return EMOJI_RE.test(String(text || ''));
}

/** Letters and digits left after links, mentions, hashtags and emoji go. CJK counts double. */
export function meaningfulLength(text) {
  const stripped = String(text || '').replace(URL_RE, ' ').replace(MENTION_TAG_RE, ' ');
  let n = 0;
  for (const ch of stripped) {
    if (CJK_RE.test(ch)) n += 2;
    else if (/[\p{L}\p{N}]/u.test(ch)) n += 1;
  }
  return n;
}

/** Comparison key for near duplicate checks: lower case letters and single spaces only. */
export function textKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(URL_RE, ' ')
    .replace(MENTION_TAG_RE, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(key) {
  const s = ` ${key} `;
  const out = new Set();
  for (let i = 0; i + 3 <= s.length; i++) out.add(s.slice(i, i + 3));
  return out;
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const g of small) if (big.has(g)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Content check for one post on its own. Returns a reason string or null.
 */
export function contentProblem(post, rules = RULES) {
  const text = String(post.content || '');
  const hasImage = !!post.imageUrl;
  if (!hasImage) {
    if (meaningfulLength(text) < rules.MIN_TEXT_CHARS) return 'too-short';
  }
  if (ADDRESS_RE.test(text)) return 'wallet-address';
  const linkChars = (text.match(URL_RE) || []).join('').length;
  const total = text.trim().length;
  if (total > 0 && linkChars / total > rules.MAX_LINK_SHARE) return 'mostly-links';
  const compact = text.toLowerCase().replace(/\s+/g, '');
  const run = new RegExp(`(.)\\1{${rules.REPEAT_RUN - 1},}`, 'u');
  if (run.test(compact)) return 'repeated-chars';
  if (compact.length >= 8 && new Set(compact).size <= rules.MAX_DISTINCT_CHARS) return 'repeated-chars';
  return null;
}

/**
 * Author trust. `info` is { profile, premium, postCount } as read from the
 * chain; `tipBlock` is the newest block seen. Returns 'verified',
 * 'established' or null.
 */
export function authorTrust(info, tipBlock, rules = RULES) {
  if (!info) return null;
  const p = info.profile;
  // A name that is just a wallet address does not count as a name.
  const rawName = String(p?.name || '').trim();
  const name = ADDRESS_RE.test(rawName) ? '' : rawName;
  const avatar = String(p?.avatar || p?.avatarUrl || '').trim();
  if (info.premium) return 'verified';
  if (name && avatar) return 'verified';
  if (!name) return null;
  const joined = Number(p?.joinedAt || 0);
  const age = Number(tipBlock || 0) - joined;
  const posts = Number(info.postCount || 0);
  if (joined > 0 && age >= rules.MIN_ACCOUNT_AGE_BLOCKS && posts >= rules.MIN_AUTHOR_POSTS) {
    return 'established';
  }
  return null;
}

/**
 * Near duplicate grouping over the window. Returns, per post index, how many
 * posts in the window (itself included) are near copies, and whether the same
 * author already posted a near copy earlier in the window.
 */
export function duplicateInfo(posts, rules = RULES) {
  const keys = posts.map((p) => textKey(p.content));
  // Work on distinct keys, it is much cheaper than all pairs of posts.
  const uniq = new Map(); // key -> indexes
  keys.forEach((k, i) => {
    if (!k) return;
    if (!uniq.has(k)) uniq.set(k, []);
    uniq.get(k).push(i);
  });
  const ukeys = Array.from(uniq.keys());
  const grams = ukeys.map(trigrams);
  const similar = ukeys.map((_, i) => [i]); // distinct-key index -> similar distinct keys
  for (let i = 0; i < ukeys.length; i++) {
    for (let j = i + 1; j < ukeys.length; j++) {
      if (jaccard(grams[i], grams[j]) >= rules.NEAR_DUP_SIMILARITY) {
        similar[i].push(j);
        similar[j].push(i);
      }
    }
  }
  const keyIndex = new Map(ukeys.map((k, i) => [k, i]));
  return posts.map((p, i) => {
    const k = keys[i];
    if (!k) return { copies: 1, selfRepeat: false };
    const group = similar[keyIndex.get(k)].flatMap((u) => uniq.get(ukeys[u]));
    const author = lower(p.author);
    const myId = BigInt(p.id);
    const selfRepeat = group.some(
      (j) => j !== i && lower(posts[j].author) === author && BigInt(posts[j].id) < myId,
    );
    return { copies: group.length, selfRepeat };
  });
}

/** Ranking key in seconds: post time plus its head start. Higher ranks first. */
export function rankScore(post, engagement = {}, rules = RULES) {
  let bonusMin = 0;
  if (post.imageUrl) bonusMin += rules.IMAGE_BOOST_MIN;
  if (hasEmoji(post.content)) bonusMin += rules.EMOJI_BOOST_MIN;
  const net = Number(engagement.score || 0) + Number(engagement.comments || 0);
  const capped = Math.max(-rules.ENGAGEMENT_CAP, Math.min(rules.ENGAGEMENT_CAP, net));
  bonusMin += capped * rules.ENGAGEMENT_BOOST_MIN;
  return tsSeconds(post.ts) + bonusMin * 60;
}

/**
 * Content pass over the whole window (no author data needed). Returns a
 * Map of post id -> hide reason for every post that fails.
 */
export function contentVerdicts(posts, rules = RULES) {
  const dup = duplicateInfo(posts, rules);
  const hidden = new Map();
  posts.forEach((p, i) => {
    const own = contentProblem(p, rules);
    if (own) hidden.set(String(p.id), own);
    else if (dup[i].copies >= rules.TEMPLATE_MIN_COPIES) hidden.set(String(p.id), 'template');
    else if (dup[i].selfRepeat) hidden.set(String(p.id), 'self-repeat');
  });
  // Accounts whose window is mostly spam lose the rest of their posts too.
  const perAuthor = new Map();
  for (const p of posts) {
    const a = lower(p.author);
    const s = perAuthor.get(a) || { total: 0, bad: 0 };
    s.total++;
    if (hidden.has(String(p.id))) s.bad++;
    perAuthor.set(a, s);
  }
  for (const p of posts) {
    const s = perAuthor.get(lower(p.author));
    if (
      !hidden.has(String(p.id))
      && s.total >= rules.SPAM_AUTHOR_MIN_POSTS
      && s.bad / s.total >= rules.SPAM_AUTHOR_SHARE
    ) {
      hidden.set(String(p.id), 'spam-author');
    }
  }
  return hidden;
}

/**
 * Build the "For you" feed.
 *   posts:      the window, any order
 *   authors:    { [lowercase address]: { profile, premium, postCount } }
 *   engagement: { [post id]: { score, comments } }
 *   tipBlock:   newest block number seen
 * Returns { posts, hidden } where hidden maps post id -> reason.
 */
export function buildForYou({ posts, authors = {}, engagement = {}, tipBlock, rules = RULES }) {
  const hidden = contentVerdicts(posts, rules);
  const candidates = [];
  for (const p of posts) {
    const id = String(p.id);
    if (hidden.has(id)) continue;
    if (!authorTrust(authors[lower(p.author)], tipBlock, rules)) {
      hidden.set(id, 'author-not-trusted');
      continue;
    }
    candidates.push({ post: p, rank: rankScore(p, engagement[id], rules) });
  }
  candidates.sort((a, b) => (b.rank - a.rank) || Number(BigInt(b.post.id) - BigInt(a.post.id)));
  const perAuthor = new Map();
  const out = [];
  for (const c of candidates) {
    const a = lower(c.post.author);
    const n = perAuthor.get(a) || 0;
    if (n >= rules.MAX_PER_AUTHOR) {
      hidden.set(String(c.post.id), 'author-cap');
      continue;
    }
    if (out.length >= rules.FEED_SIZE) break;
    perAuthor.set(a, n + 1);
    out.push(c.post);
  }
  return { posts: out, hidden };
}

/** Authors whose trust still needs chain data after the content pass. */
export function authorsToCheck(posts, hidden) {
  return Array.from(new Set(posts.filter((p) => !hidden.has(String(p.id))).map((p) => lower(p.author))));
}
