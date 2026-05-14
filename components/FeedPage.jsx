// Feed page. Loads the most-recent N posts from AsentumPosts, fetches
// profiles + scores + my-vote in parallel, and renders the redesigned
// stack of PostCards. "For you" shows everything; "Following" filters
// to authors the connected wallet follows.
//   — milkie

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '../lib/wallet';
import {
  getLatestPostId,
  getPostRange,
  getProfile,
  getScores,
  getVote,
  getFollowing,
} from '../lib/contracts';
import { useLayout } from '../lib/useLayout';
import FeaturedRow from './FeaturedRow';
import PostCard from './PostCard';

const PAGE_SIZE = 30;

export default function FeedPage() {
  const layout = useLayout();
  const { address, isConnected } = useWallet();

  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [scores, setScores] = useState({});
  const [myVotes, setMyVotes] = useState({});
  const [following, setFollowing] = useState(new Set());
  const [filter, setFilter] = useState('for-you'); // 'for-you' | 'following'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh on a manual key + every 15s, plus once when address connects.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const latest = BigInt(await getLatestPostId());
        if (latest === 0n) {
          if (!cancelled) {
            setPosts([]); setProfiles({}); setScores({}); setMyVotes({});
            setLoading(false);
          }
          return;
        }
        const from = latest > BigInt(PAGE_SIZE) ? latest - BigInt(PAGE_SIZE - 1) : 1n;
        const range = await getPostRange(String(from), String(latest));
        if (cancelled) return;
        const sorted = (range || []).slice().sort((a, b) => Number(b.id) - Number(a.id));
        setPosts(sorted);

        // Unique authors → fetch profiles
        const authors = Array.from(new Set(sorted.map((p) => (p.author || '').toLowerCase())));
        const profileEntries = await Promise.all(
          authors.map(async (a) => {
            try {
              const prof = await getProfile(a);
              return [a, prof];
            } catch {
              return [a, null];
            }
          }),
        );
        if (cancelled) return;
        setProfiles(Object.fromEntries(profileEntries));

        // Scores in one batch
        const ids = sorted.map((p) => String(p.id));
        try {
          const scoreList = await getScores(ids);
          if (cancelled) return;
          const sm = {};
          ids.forEach((id, i) => { sm[id] = Number(scoreList?.[i] ?? 0); });
          setScores(sm);
        } catch { /* leave scores empty */ }

        // My votes (only if connected)
        if (address) {
          const voteEntries = await Promise.all(
            ids.map(async (id) => {
              try { return [id, await getVote(address, id)]; }
              catch { return [id, '0']; }
            }),
          );
          if (cancelled) return;
          setMyVotes(Object.fromEntries(voteEntries));
        } else {
          setMyVotes({});
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [address, refreshKey]);

  // Soft live-refresh every 15s.
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // Following set
  useEffect(() => {
    if (!address) { setFollowing(new Set()); return; }
    let cancelled = false;
    (async () => {
      try {
        const list = await getFollowing(address);
        if (!cancelled) setFollowing(new Set((list || []).map((a) => a.toLowerCase())));
      } catch { /* leave empty */ }
    })();
    return () => { cancelled = true; };
  }, [address]);

  const handleToggleFollow = useCallback((addr, nowFollowing) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (nowFollowing) next.add(addr); else next.delete(addr);
      return next;
    });
  }, []);

  const visible = useMemo(() => {
    if (filter !== 'following') return posts;
    const me = address ? address.toLowerCase() : null;
    return posts.filter((p) => {
      const a = (p.author || '').toLowerCase();
      return following.has(a) || a === me;
    });
  }, [posts, filter, following, address]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 14px 140px' }}>
      <FeaturedRow layout={layout} />

      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 4,
          background: 'var(--surface-2)',
          borderRadius: 999,
          alignSelf: 'flex-start',
        }}
      >
        {['for-you', 'following'].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              padding: '7px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: filter === k ? 'var(--surface)' : 'transparent',
              color: filter === k ? 'var(--text-1)' : 'var(--text-2)',
              fontSize: 13.5,
              fontWeight: 600,
              boxShadow: filter === k ? '0 1px 2px rgba(20,22,30,0.06)' : 'none',
              transition: 'background 160ms ease',
            }}
          >
            {k === 'for-you' ? 'For you' : 'Following'}
          </button>
        ))}
      </div>

      {loading && posts.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5 }}>
          Loading the feed…
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#d04040', fontSize: 13.5 }}>
          {error}
        </div>
      )}

      {!loading && visible.length === 0 && !error && (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {filter === 'following' ? (
            <>You're not following anyone yet.<br />Tap Follow on a post to start your feed.</>
          ) : (
            <>No posts yet. Be the first.</>
          )}
        </div>
      )}

      {visible.map((post) => {
        const a = (post.author || '').toLowerCase();
        return (
          <PostCard
            key={post.id}
            post={post}
            profile={profiles[a]}
            initialScore={scores[String(post.id)] ?? 0}
            initialVote={myVotes[String(post.id)] || '0'}
            isFollowing={following.has(a)}
            onToggleFollow={handleToggleFollow}
          />
        );
      })}
    </div>
  );
}
