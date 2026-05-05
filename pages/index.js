import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import PostComposer from '../components/PostComposer';
import {
  getLatestPostId, getPostRange, getProfile, getScores, getVote,
} from '../lib/contracts';
import { useWallet } from '../lib/wallet';

const PAGE_SIZE = 30;
const HOT_GRAVITY = 1.8; // higher → score decays faster vs. age

export default function Home() {
  const { isConnected, address } = useWallet();
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [scores, setScores] = useState({});
  const [myVotes, setMyVotes] = useState({});
  const [tab, setTab] = useState('hot'); // 'hot' | 'latest'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const latest = BigInt(await getLatestPostId());
        if (latest === 0n) {
          if (!cancelled) { setPosts([]); setProfiles({}); setScores({}); setLoading(false); }
          return;
        }
        const from = latest > BigInt(PAGE_SIZE) ? latest - BigInt(PAGE_SIZE - 1) : 1n;
        const range = await getPostRange(String(from), String(latest));
        if (cancelled) return;
        const sortedByLatest = (range || []).slice().sort((a, b) => Number(b.id) - Number(a.id));
        setPosts(sortedByLatest);

        const ids = sortedByLatest.map((p) => p.id);
        const authors = [...new Set(sortedByLatest.map((p) => p.author?.toLowerCase()))];
        const [profMap, scoreMap] = await Promise.all([
          Promise.all(authors.map(async (a) => {
            try { return [a, await getProfile(a)]; } catch { return [a, null]; }
          })).then((arr) => Object.fromEntries(arr)),
          ids.length ? getScores(ids) : Promise.resolve({}),
        ]);
        if (cancelled) return;
        setProfiles(profMap);
        setScores(scoreMap || {});

        // Best-effort fetch of the connected user's vote on each — don't
        // block render on this; quietly populate as it lands.
        if (address) {
          Promise.all(
            ids.map((id) => getVote(address, id).then((v) => [id, v]).catch(() => [id, '0'])),
          ).then((entries) => {
            if (!cancelled) setMyVotes(Object.fromEntries(entries));
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey, address]);

  // Reddit-style "hot" sort. Higher score = higher rank, but score
  // decays as post age increases.
  const sorted = useMemo(() => {
    if (tab === 'latest') return posts;
    return posts.slice().sort((a, b) => hotScore(b, scores) - hotScore(a, scores));
  }, [posts, scores, tab]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-sans text-3xl font-bold mb-2">Home Feed</h1>
        <p className="font-mono text-[12px] uppercase tracking-wider text-ink-3 mb-6">
          {loading ? 'loading…' : `${posts.length} posts, on-chain`}
        </p>

        {isConnected && (
          <div className="mb-6">
            <PostComposer onPosted={refresh} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-line">
          {[
            { k: 'hot', label: '🔥 Hot' },
            { k: 'latest', label: 'Latest' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`font-mono text-[11px] uppercase tracking-wider px-4 py-2 -mb-px border-b-2 transition-colors ${
                tab === t.k
                  ? 'text-accent border-accent'
                  : 'text-ink-3 border-transparent hover:text-ink-1'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="border border-red-800 bg-red-900/20 text-red-300 p-4 font-mono text-[12px] mb-6">
            {error}
          </div>
        )}

        {!loading && sorted.length === 0 && !error && (
          <div className="border border-line bg-bg-1 p-10 text-center rounded-xl">
            <p className="font-sans text-lg text-ink-1 mb-2">No posts yet</p>
            <p className="font-mono text-[12px] text-ink-3">
              {isConnected ? 'Post the first one above.' : 'Connect a wallet and post the first one.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              profile={profiles[p.author?.toLowerCase()]}
              initialScore={scores[p.id]}
              initialVote={myVotes[p.id] ?? '0'}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
}

function hotScore(post, scoreMap) {
  const s = scoreMap[post.id];
  const score = s ? Number(s.score) : 0;
  const ageHours = Math.max(1, (Date.now() / 1000 - Number(post.ts)) / 3600);
  // "Hot" = score boosted, age dampened. Same shape as Reddit's old
  // formula (sign-aware log of |score|, divided by age^gravity).
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  return sign * order - HOT_GRAVITY * Math.log10(ageHours);
}
