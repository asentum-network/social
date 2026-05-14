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
    <div className="border border-line bg-bg-1 p-5 sm:p-6 rounded-card shadow-card">
      <div className="flex items-start gap-4 sm:gap-5">
        <Avatar src={profile?.avatar} name={profile?.name} address={address} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-sans text-page text-ink-0 truncate">
                {profile?.name || shortAddr(address)}
              </h1>
              <div className="font-mono text-micro text-ink-3 mt-1 break-all">
                {address}
              </div>
            </div>
            {!isOwn && onFollowClick && (
              <button
                onClick={onFollowClick}
                disabled={followBusy}
                className={`font-mono text-micro uppercase px-4 py-2 rounded-pill flex-shrink-0 transition-colors ${
                  isFollowing
                    ? 'border border-line hover:border-red-500 hover:text-red-400 text-ink-1'
                    : 'bg-ink-0 text-bg-0 hover:bg-accent font-bold'
                } ${followBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {followBusy ? '…' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            {isOwn && (
              <Link
                href="/settings"
                className="font-mono text-micro uppercase border border-line hover:border-accent hover:text-accent text-ink-1 px-4 py-2 rounded-pill flex-shrink-0 transition-colors"
              >
                Edit
              </Link>
            )}
          </div>
          {profile?.bio && (
            <p className="font-sans text-card text-ink-1 mt-3 whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}
          <div className="flex items-center gap-4 sm:gap-6 mt-4 font-mono text-caption text-ink-2">
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
  const sizeClasses = 'w-20 h-20 sm:w-24 sm:h-24 rounded-full flex-shrink-0 shadow-avatar';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={`${sizeClasses} bg-bg-2 object-cover`}
      />
    );
  }
  const seed = (address || name || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const initial = (name?.[0] || seed[2] || '?').toUpperCase();
  return (
    <div
      className={`${sizeClasses} flex items-center justify-center font-mono text-3xl font-bold`}
      style={{ background: `hsl(${hue}, 60%, 18%)`, color: `hsl(${hue}, 70%, 70%)` }}
    >
      {initial}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-ink-0 font-bold text-[15px] tabular-nums">{value ?? '—'}</span>
      <span className="uppercase">{label}</span>
    </span>
  );
}
