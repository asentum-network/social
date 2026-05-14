import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { fetchActivities } from '../lib/indexer';
import { subscribe } from '../lib/activityStream';
import { shortAddr, timeAgo } from '../lib/contracts';

const PAGE_SIZE = 50;

export default function ActivityFeed() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchActivities({ limit: PAGE_SIZE });
      setItems(res.items || []);
      setCursor(res.nextCursor);
      setDone((res.items || []).length < PAGE_SIZE);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFirstPage(); }, [loadFirstPage]);

  // Live: prepend new activities as they arrive.
  useEffect(() => {
    return subscribe('activity', (a) => {
      setItems((cur) => {
        if (cur.some((x) => x.id === a.id)) return cur;
        return [a, ...cur];
      });
    });
  }, []);

  async function loadMore() {
    if (!cursor || moreLoading || done) return;
    setMoreLoading(true);
    try {
      const res = await fetchActivities({ beforeId: cursor, limit: PAGE_SIZE });
      setItems((cur) => [...cur, ...(res.items || [])]);
      setCursor(res.nextCursor);
      if ((res.items || []).length < PAGE_SIZE) setDone(true);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setMoreLoading(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <h1 className="font-sans text-display mb-1">Activity</h1>
        <p className="font-mono text-micro uppercase text-ink-3 mb-6 sm:mb-8">
          Every on-chain event from the social network
        </p>

        {error && (
          <div className="border border-red-800 bg-red-900/20 text-red-300 p-4 font-mono text-[12px] mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <div className="border border-line bg-bg-1 p-10 text-center">
            <p className="font-mono text-[12px] text-ink-3">no on-chain activity yet</p>
          </div>
        ) : (
          <>
            <div className="border border-line bg-bg-1 divide-y divide-line rounded-card overflow-hidden shadow-card">
              {items.map((a) => <Row key={a.id} activity={a} />)}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={loadFirstPage}
                className="font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:text-accent"
              >
                ↻ refresh
              </button>
              {!done && (
                <button
                  onClick={loadMore}
                  disabled={moreLoading}
                  className="font-mono text-[10px] uppercase tracking-wider border border-line hover:border-accent text-ink-2 hover:text-accent px-4 py-2"
                >
                  {moreLoading ? 'loading…' : 'load more →'}
                </button>
              )}
              {done && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  end of feed
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function Row({ activity }) {
  return (
    <Link
      href={`/activity/${activity.id}`}
      className="grid grid-cols-[80px_1fr_auto] sm:grid-cols-[110px_1fr_auto] gap-3 items-center px-4 py-3 hover:bg-bg-2 transition-colors"
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
        {typeBadge(activity.type)}
      </span>
      <span className="font-mono text-[11px] text-ink-1 truncate">
        {summary(activity)}
      </span>
      <span className="font-mono text-[10px] text-ink-3 whitespace-nowrap">
        block {activity.blockNumber} · {timeAgoMs(activity.ts)}
      </span>
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="border border-line bg-bg-1 divide-y divide-line">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="h-3 w-20 bg-bg-3" />
          <div className="h-3 flex-1 bg-bg-3" />
          <div className="h-3 w-32 bg-bg-3" />
        </div>
      ))}
    </div>
  );
}

function typeBadge(t) {
  return ({
    'post.created':      'POST',
    'profile.created':   'JOIN',
    'profile.updated':   'PROFILE',
    'follow.followed':   'FOLLOW',
    'follow.unfollowed': 'UNFOLLOW',
  })[t] || t;
}

function summary(a) {
  const actor = shortAddr(a.actorAddress);
  const target = a.targetAddress ? shortAddr(a.targetAddress) : '';
  switch (a.type) {
    case 'post.created':       return `${actor} posted #${a.data?.postId}`;
    case 'profile.created':    return `${actor} joined as ${a.data?.name || 'unnamed'}`;
    case 'profile.updated':    return `${actor} updated their profile`;
    case 'follow.followed':    return `${actor} → ${target}`;
    case 'follow.unfollowed':  return `${actor} ⊘ ${target}`;
    default:                   return `${actor} ${a.type}`;
  }
}

function timeAgoMs(ms) {
  const diff = Date.now() - Number(ms);
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago';
  return Math.floor(diff / 86_400_000) + 'd ago';
}
