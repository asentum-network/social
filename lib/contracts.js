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
  profile: '0x2711c03b9bc29895ef61c6aa6fee4df643c71cad',
  posts:   '0x803b7060675bbda1c90cb791062416f3f23b3811',
  follow:  '0xaac15ce785f755b4187abee755560719fb7a26b3',
  gallery: '0x25cf32a56267d36e32dbca0b26b69d6fe158bf08',
  votes:   '0xd036ee660d1ec338bc18c5ac37dd602e147d86d3',
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
