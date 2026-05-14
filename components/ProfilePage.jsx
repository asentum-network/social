// User profile page. Banner + avatar + bio + follower stats + post list.
//   — milkie

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '../lib/wallet';
import { useActionToast } from '../lib/actionToast';
import {
  getProfile,
  getUserPosts,
  getPost,
  getFollowerCount,
  getFollowingCount,
  getScores,
  getVote,
  isFollowing as isFollowingFn,
  CONTRACTS,
} from '../lib/contracts';
import { waitForReceipt } from '../lib/tx';
import { fmtCount, shortAddr } from '../lib/format';
import { avatarTone } from '../lib/avatar';
import Avatar from './Avatar';
import PostCard from './PostCard';

export default function ProfilePage({ address: paramAddress }) {
  const lower = (paramAddress || '').toLowerCase();
  const { address: me, isConnected, openModal, callContract } = useWallet();
  const { show: showToast } = useActionToast();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [scores, setScores] = useState({});
  const [myVotes, setMyVotes] = useState({});
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [iFollow, setIFollow] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const isMe = !!me && me.toLowerCase() === lower;
  const tone = avatarTone({ address: lower, name: profile?.name });

  useEffect(() => {
    if (!lower) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [prof, postIds, fCount, gCount] = await Promise.all([
          getProfile(lower).catch(() => null),
          getUserPosts(lower).catch(() => []),
          getFollowerCount(lower).catch(() => 0),
          getFollowingCount(lower).catch(() => 0),
        ]);
        if (cancelled) return;
        setProfile(prof || null);
        setFollowers(Number(fCount) || 0);
        setFollowingCount(Number(gCount) || 0);

        const ids = (postIds || []).slice().reverse().slice(0, 50);
        const posts = await Promise.all(ids.map((id) => getPost(String(id)).catch(() => null)));
        if (cancelled) return;
        const valid = posts.filter(Boolean);
        setPosts(valid);

        const sIds = valid.map((p) => String(p.id));
        try {
          const scoreList = await getScores(sIds);
          if (cancelled) return;
          const sm = {};
          sIds.forEach((id, i) => { sm[id] = Number(scoreList?.[i] ?? 0); });
          setScores(sm);
        } catch {}

        if (me) {
          const voteEntries = await Promise.all(
            sIds.map(async (id) => {
              try { return [id, await getVote(me, id)]; }
              catch { return [id, '0']; }
            }),
          );
          if (cancelled) return;
          setMyVotes(Object.fromEntries(voteEntries));

          if (!isMe) {
            try { setIFollow(await isFollowingFn(me, lower)); } catch {}
          }
        } else {
          setMyVotes({});
          setIFollow(false);
        }
      } catch (err) {
        if (!cancelled) console.error('[profile] load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lower, me, isMe]);

  const toggleFollow = useCallback(async () => {
    if (!isConnected) { openModal(); return; }
    if (followBusy || isMe) return;
    const wasFollowing = iFollow;
    setIFollow(!wasFollowing);
    setFollowers((n) => Math.max(0, n + (wasFollowing ? -1 : 1)));
    setFollowBusy(true);
    try {
      const res = await callContract({
        to: CONTRACTS.follow,
        method: wasFollowing ? 'unfollow' : 'follow',
        args: [lower],
      });
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('reverted');
      showToast(!wasFollowing ? `Following ${profile?.name?.trim() || shortAddr(lower)}` : 'Unfollowed');
    } catch (err) {
      setIFollow(wasFollowing);
      setFollowers((n) => Math.max(0, n + (wasFollowing ? 1 : -1)));
      showToast(err.message || 'Follow failed');
    } finally {
      setFollowBusy(false);
    }
  }, [isConnected, followBusy, isMe, iFollow, lower, profile, callContract, openModal, showToast]);

  const user = useMemo(() => ({
    address: lower,
    name: profile?.name,
    avatarUrl: profile?.avatarUrl,
    bio: profile?.bio,
  }), [lower, profile]);

  const displayName = profile?.name?.trim() || shortAddr(lower);
  const handle = '@' + (profile?.name
    ? profile.name.toLowerCase().replace(/\s+/g, '')
    : shortAddr(lower).replace(/…/g, ''));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 140 }}>
      <div style={{ height: 110, background: `oklch(94% 0.05 ${tone})`, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(135deg, oklch(89% 0.06 ${tone}) 0 1px, transparent 1px 16px)`,
            opacity: 0.6,
          }}
        />
      </div>

      <div style={{ padding: '0 18px', marginTop: -36 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ padding: 4, borderRadius: 999, background: 'var(--bg)' }}>
            <Avatar user={user} size={84} />
          </div>
          {!isMe && lower && (
            <button
              onClick={toggleFollow}
              disabled={followBusy}
              style={{
                marginBottom: 6,
                border: iFollow ? '1px solid var(--border)' : 'none',
                background: iFollow ? 'var(--surface)' : 'var(--text-1)',
                color: iFollow ? 'var(--text-1)' : '#fff',
                fontSize: 14,
                fontWeight: 600,
                padding: '9px 20px',
                borderRadius: 999,
                cursor: followBusy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: followBusy ? 0.7 : 1,
              }}
            >
              {iFollow ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: -0.4,
              color: 'var(--text-1)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {displayName}
          </h1>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{handle}</div>
        </div>

        {profile?.bio && (
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 14.5,
              lineHeight: 1.5,
              color: 'var(--text-1)',
              textWrap: 'pretty',
              whiteSpace: 'pre-wrap',
            }}
          >
            {profile.bio}
          </p>
        )}

        <div style={{ display: 'flex', gap: 22, marginTop: 14, fontSize: 13.5 }}>
          <Stat n={posts.length} label="Posts" />
          <Stat n={followers} label="Followers" />
          <Stat n={followingCount} label="Following" />
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          marginInline: 18,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-1)',
          letterSpacing: 0.2,
        }}
      >
        Posts
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && posts.length === 0 && (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
            Loading…
          </div>
        )}
        {!loading && posts.length === 0 && (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14, lineHeight: 1.5 }}>
            {isMe ? "You haven't posted yet. Tap the + to share something." : 'Nothing here yet.'}
          </div>
        )}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            profile={profile}
            initialScore={scores[String(post.id)] ?? 0}
            initialVote={myVotes[String(post.id)] || '0'}
            isFollowing={iFollow}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'baseline' }}>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-1)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmtCount(n)}
      </span>
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
    </div>
  );
}
