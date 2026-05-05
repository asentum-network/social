import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import PostCard from '../../components/PostCard';
import ProfileHeader from '../../components/ProfileHeader';
import { useWallet } from '../../lib/wallet';
import {
  CONTRACTS,
  getFollowerCount,
  getFollowing,
  getFollowingCount,
  getPost,
  getProfile,
  getUserPosts,
  isFollowing as isFollowingFn,
} from '../../lib/contracts';
import { waitForReceipt } from '../../lib/tx';

export default function ProfilePage() {
  const router = useRouter();
  const addrParam = typeof router.query.addr === 'string' ? router.query.addr.toLowerCase() : '';
  const { address: connectedAddr, isConnected, callContract, openModal } = useWallet();
  const isOwn = isConnected && connectedAddr && connectedAddr === addrParam;

  const [profile, setProfile] = useState(undefined); // undefined = loading, null = none
  const [posts, setPosts] = useState(null);
  const [followerCount, setFollowerCount] = useState(null);
  const [followingCount, setFollowingCount] = useState(null);
  const [iFollow, setIFollow] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!addrParam) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [p, fc, gc, ids] = await Promise.all([
          getProfile(addrParam),
          getFollowerCount(addrParam),
          getFollowingCount(addrParam),
          getUserPosts(addrParam),
        ]);
        if (cancelled) return;
        setProfile(p);
        setFollowerCount(fc);
        setFollowingCount(gc);

        // Pull the most recent ~20 posts from this user.
        const idsArr = Array.isArray(ids) ? ids : [];
        const recent = idsArr.slice(-20).reverse();
        const fetched = await Promise.all(recent.map((id) => getPost(id)));
        if (cancelled) return;
        setPosts(fetched.filter(Boolean));

        if (isConnected && connectedAddr && connectedAddr !== addrParam) {
          const follows = await isFollowingFn(connectedAddr, addrParam);
          if (!cancelled) setIFollow(!!follows);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [addrParam, isConnected, connectedAddr]);

  async function handleFollowClick() {
    if (!isConnected) { openModal(); return; }
    setFollowBusy(true);
    setError(null);
    const wasFollowing = iFollow;
    try {
      const res = await callContract({
        to: CONTRACTS.follow,
        method: wasFollowing ? 'unfollow' : 'follow',
        args: [addrParam],
      });
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') {
        throw new Error('tx reverted on-chain');
      }
      // Re-fetch the truth from chain rather than guessing — keeps us
      // honest if anything raced (e.g. you unfollowed elsewhere already).
      const [follows, fc] = await Promise.all([
        isFollowingFn(connectedAddr, addrParam),
        getFollowerCount(addrParam),
      ]);
      setIFollow(!!follows);
      setFollowerCount(fc);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setFollowBusy(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        {error && (
          <div className="border border-red-800 bg-red-900/20 text-red-300 p-4 font-mono text-[12px] mb-6">
            {error}
          </div>
        )}

        <ProfileHeader
          address={addrParam}
          profile={profile === undefined ? null : profile}
          postCount={posts ? String(posts.length) : '—'}
          followerCount={followerCount}
          followingCount={followingCount}
          isOwn={isOwn}
          isFollowing={iFollow}
          onFollowClick={handleFollowClick}
          followBusy={followBusy}
        />

        <div className="flex items-center justify-between mt-10 mb-4">
          <h2 className="font-mono text-[12px] uppercase tracking-wider text-ink-3">
            Posts
          </h2>
          <Link
            href={`/u/${addrParam}/gallery`}
            className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-accent border border-line hover:border-accent px-3 py-1 rounded-md transition-colors"
          >
            Gallery →
          </Link>
        </div>

        {posts === null ? (
          <Skeleton />
        ) : posts.length === 0 ? (
          <div className="border border-line bg-bg-1 p-8 text-center">
            <p className="font-mono text-[12px] text-ink-3">no posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="border border-line bg-bg-1 p-5 animate-pulse">
          <div className="h-3 w-24 bg-bg-3 mb-3" />
          <div className="h-4 w-full bg-bg-3 mb-2" />
          <div className="h-4 w-2/3 bg-bg-3" />
        </div>
      ))}
    </div>
  );
}
