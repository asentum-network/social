import Link from 'next/link';
import { shortAddr } from '../lib/contracts';

export default function ProfileHeader({
  address,
  profile,
  postCount,
  followerCount,
  followingCount,
  isOwn,
  isFollowing,
  onFollowClick,
  followBusy,
}) {
  return (
    <div className="border border-line bg-bg-1 p-6">
      <div className="flex items-start gap-4">
        <Avatar src={profile?.avatar} name={profile?.name} address={address} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-sans text-2xl font-bold text-ink-0">
                {profile?.name || shortAddr(address)}
              </h1>
              <div className="font-mono text-[11px] text-ink-3 mt-1 break-all">
                {address}
              </div>
            </div>
            {!isOwn && onFollowClick && (
              <button
                onClick={onFollowClick}
                disabled={followBusy}
                className={`font-mono text-[11px] uppercase tracking-wider px-4 py-2 transition-colors ${
                  isFollowing
                    ? 'border border-line hover:border-red-500 hover:text-red-400 text-ink-1'
                    : 'bg-accent text-bg-0 hover:bg-accent-bright font-bold'
                } ${followBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {followBusy ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
            {isOwn && (
              <Link
                href="/settings"
                className="font-mono text-[11px] uppercase tracking-wider border border-line hover:border-accent hover:text-accent text-ink-1 px-4 py-2 transition-colors"
              >
                Edit
              </Link>
            )}
          </div>
          {profile?.bio && (
            <p className="font-sans text-sm text-ink-1 mt-3 whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}
          <div className="flex items-center gap-5 mt-4 font-mono text-[11px] text-ink-2">
            <Stat label="Posts" value={postCount} />
            <Stat label="Followers" value={followerCount} />
            <Stat label="Following" value={followingCount} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ src, name, address }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className="w-16 h-16 rounded-full border border-line bg-bg-2 object-cover"
      />
    );
  }
  // Fallback: deterministic colour swatch from the ADDRESS (not name) so two
  // wallets with the same display name still render distinct avatars.
  const seed = (address || name || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const initial = (name?.[0] || seed[2] || '?').toUpperCase();
  return (
    <div
      className="w-16 h-16 rounded-full border border-line flex items-center justify-center font-mono text-2xl font-bold"
      style={{ background: `hsl(${hue}, 60%, 18%)`, color: `hsl(${hue}, 70%, 70%)` }}
    >
      {initial}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <span>
      <span className="text-ink-0 font-bold">{value ?? '—'}</span>{' '}
      <span className="uppercase tracking-wider">{label}</span>
    </span>
  );
}
