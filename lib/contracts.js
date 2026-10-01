// deployed contract addresses + the read-side helpers.
//
// no ethers — reads go via the chain's native /view endpoint, writes
// go through the wallet context (lib/wallet.js) which routes to the
// extension or the bot. both produce Dilithium3-signed txs natively.
//
// addresses (testnet) live in CONTRACTS below — the canonical record
// is in the asentum-network/chain monorepo at
// packages/social-contracts/deployments/testnet.json.
//   — milkie

import { shortAddr as fmtShortAddr, toUnixSeconds } from './format';

export const RPC_URL = process.env.NEXT_PUBLIC_ASENTUM_RPC || 'https://testnet.asentum.com';

export const CONTRACTS = {
  // Refreshed 2026-09-11 for the Chaum reset (chain 1419). Same deployer as
  // 1418, so profile/posts/follow/gallery/votes keep their addresses; comments
  // is now deployed (it was missing on 1418). Canonical record: chain repo
  // packages/social-contracts/deployments/testnet.json + testnet-comments.json.
  profile:  '0x7083f7ea9f27dbab9ecbbe5de9623be351ca3968',
  posts:    '0xd3c0957099ebab9337e5b0cd9a703dbd234d9ad0',
  follow:   '0xd8b04b8f1669a2611f2dcfa24b7ec652cd5fd3bf',
  gallery:  '0x386e07e44ad5405f174201fc2b0f25ffb4ea2fe5',
  votes:    '0xbac90895179d3f0403309e95e939e5668e236a69',
  comments: '0x18e0af7c834387228c6d4d98e1c1613117a688e9',
  // Premium is a separate deploy, not part of the Chaum reset suite yet.
  // premium: the old weekly/monthly subscription (no new sign-ups since
  // 2026-09-25; existing subscribers keep the check while it runs).
  // premiumLifetime: 1000 ASE once, the only way to buy premium now.
  premium:  '0x82f98b9ab41969f24e7e81008425268d9be2ceac',
  premiumLifetime: '0x9cff2863c6f623339d4908ee69ea96e8b79780b5',
};

// ─── Reads (no signature, no gas) ──────────────────────────────────────────

export async function viewCall(contract, method, args = []) {
  const r = await fetch(`${RPC_URL}/view`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contract, method, args }),
  });
  if (!r.ok) throw new Error(`view ${method} → ${r.status}`);
  const json = await r.json();
  if (!json.ok) throw new Error(`view ${method}: ${json.reason}`);
  return json.returnValue;
}

// Profile reads. The AsentumProfile contract returns `avatar` as the
// image URL field. All frontend components read `avatarUrl`, so we
// normalise here — set both so either spelling works.
export async function getProfile(addr) {
  const p = await viewCall(CONTRACTS.profile, 'getProfile', [addr]);
  if (!p) return p;
  if (p.avatar && !p.avatarUrl) p.avatarUrl = p.avatar;
  if (p.avatarUrl && !p.avatar) p.avatar = p.avatarUrl;
  return p;
}
export const hasProfile = (addr) => viewCall(CONTRACTS.profile, 'hasProfile', [addr]);

// Posts reads
export const getLatestPostId = () => viewCall(CONTRACTS.posts, 'getLatestPostId');
export const getPost = (id) => viewCall(CONTRACTS.posts, 'getPost', [String(id)]);
export const getPostRange = (fromId, toId) =>
  viewCall(CONTRACTS.posts, 'getPostRange', [String(fromId), String(toId)]);
export const getUserPosts = (addr) => viewCall(CONTRACTS.posts, 'getUserPosts', [addr]);
export const getUserPostCount = (addr) => viewCall(CONTRACTS.posts, 'getUserPostCount', [addr]);

// Follow reads
export const isFollowing = (a, b) => viewCall(CONTRACTS.follow, 'isFollowing', [a, b]);
export const getFollowing = (addr) => viewCall(CONTRACTS.follow, 'getFollowing', [addr]);
export const getFollowers = (addr) => viewCall(CONTRACTS.follow, 'getFollowers', [addr]);
export const getFollowerCount = (addr) => viewCall(CONTRACTS.follow, 'getFollowerCount', [addr]);
export const getFollowingCount = (addr) => viewCall(CONTRACTS.follow, 'getFollowingCount', [addr]);

// Gallery reads
export const getImage = (id) => viewCall(CONTRACTS.gallery, 'getImage', [String(id)]);
export const getUserGallery = (addr) => viewCall(CONTRACTS.gallery, 'getUserGallery', [addr]);
export const getUserGalleryCount = (addr) => viewCall(CONTRACTS.gallery, 'getUserGalleryCount', [addr]);
export const getLatestImageId = () => viewCall(CONTRACTS.gallery, 'getLatestImageId');

// Votes reads
export const getVote = (voter, postId) =>
  viewCall(CONTRACTS.votes, 'getVote', [voter, String(postId)]);
export const getScore = (postId) =>
  viewCall(CONTRACTS.votes, 'getScore', [String(postId)]);
export const getScores = (postIds) =>
  viewCall(CONTRACTS.votes, 'getScores', [postIds.map(String)]);

// Premium reads. The blue check shows for anyone who bought lifetime premium
// (1000 ASE once) or still holds a running legacy subscription. Answers are
// cached for a minute and concurrent lookups for one address share a
// request, so a feed with the same author on every card costs one read.
export const PREMIUM_PRICE_ASE = 1000;
const truthy = (v) => v === true || v === '1' || v === 1;
const premiumCache = new Map(); // addr -> { at, promise }
const PREMIUM_TTL_MS = 60_000;

async function readPremium(addr) {
  const [lifetime, legacy] = await Promise.all([
    viewCall(CONTRACTS.premiumLifetime, 'isPremium', [addr]).then(truthy).catch(() => false),
    viewCall(CONTRACTS.premium, 'isPremium', [addr]).then(truthy).catch(() => false),
  ]);
  return lifetime || legacy;
}

export const isPremium = (addr) => {
  if (!addr) return Promise.resolve(false);
  const key = String(addr).toLowerCase();
  const hit = premiumCache.get(key);
  if (hit && Date.now() - hit.at < PREMIUM_TTL_MS) return hit.promise;
  const promise = readPremium(key);
  premiumCache.set(key, { at: Date.now(), promise });
  return promise;
};

/** Forget a cached answer, e.g. right after the viewer buys premium. */
export const forgetPremium = (addr) => premiumCache.delete(String(addr || '').toLowerCase());

export const hasLifetimePremium = (addr) =>
  viewCall(CONTRACTS.premiumLifetime, 'isPremium', [addr]).then(truthy);
export const getLifetimeMembership = (addr) =>
  viewCall(CONTRACTS.premiumLifetime, 'membershipOf', [addr]);
export const getSubscription = (addr) =>
  viewCall(CONTRACTS.premium, 'subscriptionOf', [addr]);
export const getPremiumTiers = () =>
  viewCall(CONTRACTS.premium, 'tiers', []);
export const getPremiumSubscribers = () =>
  viewCall(CONTRACTS.premium, 'subscribers', []);

// Comments reads. Threading is flat-list with parent pointers; the
// client builds the tree by walking parents. Likes on comments reuse
// the Votes contract — comment ids are unique globally so passing
// them as the content id works.
export const getComment = (id) => viewCall(CONTRACTS.comments, 'getComment', [String(id)]);
export const getCommentsForPost = (postId) =>
  viewCall(CONTRACTS.comments, 'getCommentsForPost', [String(postId)]);
export const getCommentsForUser = (addr) =>
  viewCall(CONTRACTS.comments, 'getCommentsForUser', [addr]);
export const getCommentCount = (postId) =>
  viewCall(CONTRACTS.comments, 'getCommentCount', [String(postId)]);
export const getReplyCount = (commentId) =>
  viewCall(CONTRACTS.comments, 'getReplyCount', [String(commentId)]);

// Bulk premium check. Saves one round-trip per address when rendering
// a feed of many authors. Falls back to per-address if the bulk view
// isn't available (contracts can be upgraded later to add a getMany
// method without breaking the per-address path).
export async function isPremiumMany(addrs) {
  const out = {};
  await Promise.all(
    addrs.map(async (a) => {
      try { out[a.toLowerCase()] = await isPremium(a); }
      catch { out[a.toLowerCase()] = false; }
    }),
  );
  return out;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Truncate an address for display (ase1 form): ase1qpzry9…abcd */
export function shortAddr(addr) {
  return fmtShortAddr(addr);
}

/** Time-ago string for unix-second timestamps. */
export function timeAgo(unixSeconds) {
  const ms = toUnixSeconds(unixSeconds) * 1000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h';
  return Math.floor(diff / 86_400_000) + 'd';
}
