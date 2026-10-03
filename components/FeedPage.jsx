// Feed page. Loads the most-recent N posts from AsentumPosts, fetches
// profiles + scores + my-vote in parallel, and renders the redesigned
// stack of PostCards. Three tabs:
//   "For you"   (default) the filtered and ranked feed from /api/feed,
//               spam rules in lib/feedRank.js.
//   "All"       every recent post, newest first, straight from the chain.
//   "Following" the "All" posts from authors the connected wallet follows.
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

const TABS = [
  { key: 'for-you', label: 'For you' },
  { key: 'all', label: 'All' },
  { key: 'following', label: 'Following' },
];

// getScores returns { [id]: { up, down, score } }; older deploys returned a
// plain array of numbers. Accept both.
function scoreOf(list, id, i) {
  const v = Array.isArray(list) ? list[i] : list?.[id];
  const n = Number(v && typeof v === 'object' ? v.score : v);
  return Number.isFinite(n) ? n : 0;
}

async function loadForYou() {
  const r = await fetch('/api/feed');
  if (!r.ok) {
    let msg = `Feed request failed (${r.status})`;
    try { msg = (await r.json()).error || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  return r.json();
}

export default function FeedPage() {
  const layout = useLayout();
  const { address, isConnected } = useWallet();

  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [scores, setScores] = useState({});
  const [myVotes, setMyVotes] = useState({});
  const [following, setFollowing] = useState(new Set());
  const [filter, setFilter] = useState('for-you'); // 'for-you' | 'all' | 'following'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // "Following" filters the "All" list, so both read the chain directly.
  const source = filter === 'for-you' ? 'for-you' : 'all';
  const [loadedSource, setLoadedSource] = useState(null);

  // Refresh on a manual key + every 15s, plus once when address connects.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        let sorted;
        if (source === 'for-you') {
          const feed = await loadForYou();
          if (cancelled) return;
          sorted = feed.posts || [];
          setPosts(sorted);
          setProfiles(feed.profiles || {});
          setScores(feed.scores || {});
          setLoadedSource(source);
        } else {
          const latest = BigInt(await getLatestPostId());
          if (latest === 0n) {
            if (!cancelled) {
              setPosts([]); setProfiles({}); setScores({}); setMyVotes({});
              setLoadedSource(source);
              setLoading(false);
            }
            return;
          }
          const from = latest > BigInt(PAGE_SIZE) ? latest - BigInt(PAGE_SIZE - 1) : 1n;
          const range = await getPostRange(String(from), String(latest));
          if (cancelled) return;
          sorted = (range || []).slice().sort((a, b) => Number(b.id) - Number(a.id));
          setPosts(sorted);
          setLoadedSource(source);

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
          const scoreIds = sorted.map((p) => String(p.id));
          try {
            const scoreList = await getScores(scoreIds);
            if (cancelled) return;
            const sm = {};
            scoreIds.forEach((id, i) => { sm[id] = scoreOf(scoreList, id, i); });
            setScores(sm);
          } catch { /* leave scores empty */ }
        }

        const ids = sorted.map((p) => String(p.id));

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
  }, [address, refreshKey, source]);

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
    // Never show one tab's posts under another while the switch loads.
    if (loadedSource !== source) return [];
    if (filter !== 'following') return posts;
    const me = address ? address.toLowerCase() : null;
    return posts.filter((p) => {
      const a = (p.author || '').toLowerCase();
      return following.has(a) || a === me;
    });
  }, [posts, filter, following, address, loadedSource, source]);

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
        {TABS.map(({ key: k, label }) => (
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
            {label}
          </button>
        ))}
      </div>

      {loading && visible.length === 0 && (
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
          ) : filter === 'for-you' ? (
            <>Nothing here right now.<br />The All tab has every recent post.</>
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
