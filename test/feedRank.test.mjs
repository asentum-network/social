// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RULES,
  authorTrust,
  buildForYou,
  contentProblem,
  contentVerdicts,
  meaningfulLength,
  rankScore,
  textKey,
} from '../lib/feedRank.js';

const TIP = 400_000;
const OLD = String(TIP - RULES.MIN_ACCOUNT_AGE_BLOCKS - 1);
const verified = { profile: { name: 'Ana', avatar: 'https://img/a.png', joinedAt: String(TIP - 10) }, premium: false, postCount: 1 };
const established = { profile: { name: 'Bo', avatar: '', joinedAt: OLD }, premium: false, postCount: 5 };
const fresh = { profile: { name: 'Cy', avatar: '', joinedAt: String(TIP - 10) }, premium: false, postCount: 50 };
const premium = { profile: null, premium: true, postCount: 0 };

let nextId = 1;
const T0 = 1_791_000_000_000; // ms, like the chain stamps blocks
function post(author, content, extra = {}) {
  const id = nextId++;
  return { id: String(id), author, content, imageUrl: '', ts: String(T0 + id * 6000), block: String(TIP - 1000 + id), ...extra };
}

test('meaningful length ignores links, tags, mentions and emoji; CJK counts double', () => {
  assert.equal(meaningfulLength('gm'), 2);
  assert.equal(meaningfulLength('#asentum @bob https://x.y/z 👋'), 0);
  assert.equal(meaningfulLength('早安'), 4);
});

test('text key folds case, digits and punctuation so templates match', () => {
  assert.equal(textKey('Day 15 on Asentum testnet!'), textKey('day on asentum testnet'));
});

test('content rules', () => {
  assert.equal(contentProblem(post('a', 'gm')), 'too-short');
  assert.equal(contentProblem(post('a', 'gm', { imageUrl: 'https://img/x.png' })), null);
  assert.equal(contentProblem(post('a', '0x69F915a76C97F8e8a621342ef962E73d1b89147A')), 'wallet-address');
  assert.equal(contentProblem(post('a', 'new airdrop live now https://example.com/a/very/long/link/here/and/more/path/abcdef')), 'mostly-links');
  assert.equal(contentProblem(post('a', 'aaaaaaaaaaaaaaaaaaaaaaaaaa')), 'repeated-chars');
  assert.equal(contentProblem(post('a', 'hahahahahahahahahahaha')), 'repeated-chars');
  assert.equal(contentProblem(post('a', 'Small LP, big lessons: impermanent loss is gentler when amounts are dust.')), null);
});

test('a line posted by three accounts is a template, all copies hidden', () => {
  const posts = [
    post('x1', '1423 is live. Shipping a social post on AsentumChain'),
    post('x2', '1423 is live. Shipping a social post on AsentumChain'),
    post('x3', '1423 is live, shipping a social post on AsentumChain!!'),
    post('y', 'Fresh air helped, still wrapping my head around Dilithium on a live chain'),
  ];
  const hidden = contentVerdicts(posts);
  assert.equal(hidden.get(posts[0].id), 'template');
  assert.equal(hidden.get(posts[2].id), 'template');
  assert.equal(hidden.has(posts[3].id), false);
});

test('an author repeating themselves keeps only the first copy', () => {
  const a = post('z', 'Testing smart contract state management on Asentum today');
  const b = post('z', 'Testing smart contract state management on Asentum today');
  const hidden = contentVerdicts([b, a]);
  assert.equal(hidden.has(a.id), false);
  assert.equal(hidden.get(b.id), 'self-repeat');
});

test('an account whose window is mostly spam loses its other posts', () => {
  const posts = [
    post('s', 'gm'), post('s', 'gn'),
    post('s', 'A perfectly fine sentence about the testnet today'),
  ];
  assert.equal(contentVerdicts(posts).get(posts[2].id), 'spam-author');
});

test('author trust', () => {
  assert.equal(authorTrust(verified, TIP), 'verified');
  assert.equal(authorTrust(premium, TIP), 'verified');
  assert.equal(authorTrust(established, TIP), 'established');
  assert.equal(authorTrust(fresh, TIP), null);
  assert.equal(authorTrust({ profile: null, premium: false, postCount: 99 }, TIP), null);
  const addrName = { ...established, profile: { ...established.profile, name: '0x69F915a76C97F8e8a621342ef962E73d1b89147A' } };
  assert.equal(authorTrust(addrName, TIP), null);
});

test('ranking: newest first, images and emoji get a head start, engagement counts', () => {
  const older = post('a', 'An older post with a picture attached', { imageUrl: 'https://img/p.png' });
  const newer = post('b', 'A newer plain text post about the chain');
  assert.ok(rankScore(older) > rankScore(newer));
  const emoji = post('c', 'Plain text post with a smile 🙂');
  assert.equal(rankScore(emoji) - rankScore({ ...emoji, content: 'Plain text post with a smile' }), RULES.EMOJI_BOOST_MIN * 60);
  const liked = rankScore(newer, { score: 2, comments: 1 }) - rankScore(newer);
  assert.equal(liked, 3 * RULES.ENGAGEMENT_BOOST_MIN * 60);
  const capped = rankScore(newer, { score: 500 }) - rankScore(newer);
  assert.equal(capped, RULES.ENGAGEMENT_CAP * RULES.ENGAGEMENT_BOOST_MIN * 60);
});

test('buildForYou filters, caps per author and is deterministic', () => {
  const authors = { v: verified, e: established, f: fresh };
  const posts = [
    post('v', 'First thought of the day about post quantum signatures'),
    post('v', 'Second thought, the explorer looks much faster this week'),
    post('v', 'Third thought, liquidity on the pools is getting deeper'),
    post('e', 'Shipped a small contract, storage reads feel quick now'),
    post('f', 'Brand new account with a long enough post to pass'),
    post('nobody', 'No profile at all but a long and unique post here'),
  ];
  const a = buildForYou({ posts, authors, tipBlock: TIP });
  const b = buildForYou({ posts: posts.slice().reverse(), authors, tipBlock: TIP });
  assert.deepEqual(a.posts.map((p) => p.id), b.posts.map((p) => p.id));
  assert.deepEqual(a.posts.map((p) => p.author), ['e', 'v', 'v']);
  assert.equal(a.hidden.get(posts[0].id), 'author-cap');
  assert.equal(a.hidden.get(posts[4].id), 'author-not-trusted');
  assert.equal(a.hidden.get(posts[5].id), 'author-not-trusted');
});
