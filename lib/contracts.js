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

export const RPC_URL = process.env.NEXT_PUBLIC_ASENTUM_RPC || 'https://testnet.asentum.com';

export const CONTRACTS = {
  // Refreshed 2026-06-29 after the chain reset — see
  // packages/social-contracts/deployments/testnet.json in the chain repo
  // for the canonical record + deploy tx hashes.
  profile:  '0x7ef2408bbb378653f2b97b9964da8e211e29fbc0',
  posts:    '0xace43215680ccfd0bee6858a5835dae0677b5c7a',
  follow:   '0xcc01762080517b54b5395e04e3337505a8a9eb0c',
  gallery:  '0x1b58d723ad50671987d373380936f01819cb2085',
  votes:    '0xe3e330fa55724ebc75b7f12983b537677fa8a82b',
  // Premium + comments are separate deploys (task #191 / #200), redeploy
  // those independently and update these lines when their addresses change.
  premium:  '0xa298d3ba8ab21a061a247d95dc383cbbe006ee85',
  comments: '0xa305bccce3a47a81e79d75a0baf0185047609654',
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

// Premium reads. AsentumPremium powers the blue check.
//
// isPremium(addr) returns a boolean ("1"/"0" string from the VM is
// coerced to a JS bool). Backed by an on-chain recurring subscription
// at 3 ASE/week or 10 ASE/month; cron-driven debits keep status fresh.
export const isPremium = async (addr) => {
  const v = await viewCall(CONTRACTS.premium, 'isPremium', [addr]);
  return v === true || v === '1' || v === 1;
};
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

/** Truncate an address for display: 0xabcd…1234 */
export function shortAddr(addr) {
  if (!addr) return '';
  const a = addr.toLowerCase();
  if (!a.startsWith('0x') || a.length < 12) return a;
  return a.slice(0, 6) + '…' + a.slice(-4);
}

/** Time-ago string for unix-second timestamps. */
export function timeAgo(unixSeconds) {
  const ms = Number(unixSeconds) * 1000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h';
  return Math.floor(diff / 86_400_000) + 'd';
}
