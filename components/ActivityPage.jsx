// Activity feed. Live + historical chain activity surfaced by the
// social-indexer: profile creates, post creates, follows, votes,
// gallery uploads. Each row is a card linking to the relevant
// detail page where it makes sense.
//   — milkie

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Avatar from './Avatar';
import { fetchActivities } from '../lib/indexer';
import { subscribe } from '../lib/activityStream';
import { getProfile } from '../lib/contracts';
import { fmtCount, shortAddr, timeAgo } from '../lib/format';

const PAGE_SIZE = 50;

export default function ActivityPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const hydrateProfiles = useCallback(async (rows) => {
    const need = new Set();
    rows.forEach((r) => {
      if (r.actorAddress) need.add(r.actorAddress.toLowerCase());
      if (r.targetAddress) need.add(r.targetAddress.toLowerCase());
    });
    const entries = await Promise.all(
      Array.from(need).map(async (a) => {
        try { return [a, await getProfile(a)]; }
        catch { return [a, null]; }
      }),
    );
    setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }, []);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchActivities({ limit: PAGE_SIZE });
      const rows = res.items || [];
      setItems(rows);
      setCursor(res.nextCursor);
      setDone(rows.length < PAGE_SIZE);
      hydrateProfiles(rows);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [hydrateProfiles]);

  const loadMore = useCallback(async () => {
    if (!cursor || done || moreLoading) return;
    setMoreLoading(true);
    try {
      const res = await fetchActivities({ beforeId: cursor, limit: PAGE_SIZE });
      const rows = res.items || [];
      setItems((cur) => [...cur, ...rows]);
      setCursor(res.nextCursor);
      if (rows.length < PAGE_SIZE) setDone(true);
      hydrateProfiles(rows);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setMoreLoading(false);
    }
  }, [cursor, done, moreLoading, hydrateProfiles]);

  useEffect(() => { loadFirstPage(); }, [loadFirstPage]);

  // Live: prepend new activities as they arrive.
  useEffect(() => {
    return subscribe('activity', (a) => {
      setItems((cur) => {
        if (cur.some((x) => x.id === a.id)) return cur;
        hydrateProfiles([a]);
        return [a, ...cur];
      });
    });
  }, [hydrateProfiles]);

  return (
    <div style={{ padding: '20px 14px 140px', maxWidth: 620, margin: '0 auto' }}>
      <h1
        style={{
          margin: '0 0 4px',
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: -0.4,
          color: 'var(--text-1)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Activity
      </h1>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--text-2)' }}>
        Everything happening on-chain, live. Profiles, posts, follows, votes.
      </p>

      {loading && items.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
          Loading activity…
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: 'oklch(96% 0.04 25)',
            border: '1px solid oklch(86% 0.08 25)',
            color: 'oklch(38% 0.12 25)',
            fontSize: 13,
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((a) => (
          <ActivityRow key={a.id} activity={a} profiles={profiles} router={router} />
        ))}
      </div>

      {items.length > 0 && !done && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={loadMore}
            disabled={moreLoading}
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
              fontSize: 13.5,
              fontWeight: 600,
              padding: '10px 22px',
              borderRadius: 999,
              cursor: moreLoading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              opacity: moreLoading ? 0.6 : 1,
            }}
          >
            {moreLoading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {items.length === 0 && !loading && !error && (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Nothing yet. Activity will appear here as people post, follow, and vote.
        </div>
      )}
    </div>
  );
}

function ActivityRow({ activity, profiles, router }) {
  const actor = (activity.actorAddress || '').toLowerCase();
  const actorProfile = profiles[actor] || null;
  const actorName = actorProfile?.name?.trim() || shortAddr(actor);
  const target = (activity.targetAddress || '').toLowerCase();
  const targetProfile = target ? profiles[target] : null;
  const targetName = targetProfile?.name?.trim() || (target ? shortAddr(target) : '');

  const description = describeActivity(activity, actorName, targetName);
  const tsSec = Math.floor(Number(activity.ts) / 1000);

  const onClick = () => {
    if (activity.type === 'post.created' && activity.data?.postId) {
      router.push(`/post/${activity.data.postId}`);
    } else if (activity.type === 'profile.created' || activity.type === 'follow.created') {
      router.push(`/u/${actor}`);
    } else {
      router.push(`/activity/${activity.id}`);
    }
  };

  const actorUser = { address: actor, name: actorProfile?.name, avatarUrl: actorProfile?.avatarUrl };

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'inherit',
        transition: 'border-color 160ms ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <Avatar user={actorUser} size={38} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.4 }}>
          {description}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {timeAgo(tsSec)} · block #{fmtCount(activity.blockNumber)}
        </div>
      </div>
    </button>
  );
}

function describeActivity(activity, actorName, targetName) {
  const a = (
    <strong style={{ fontWeight: 600 }}>{actorName}</strong>
  );
  switch (activity.type) {
    case 'profile.created':
      return <>{a} created a profile{activity.data?.name ? ` (${activity.data.name})` : ''}</>;
    case 'profile.updated':
      return <>{a} updated their profile</>;
    case 'post.created':
      return <>{a} posted{activity.data?.hasImage ? ' an image' : ''}</>;
    case 'follow.created':
      return (
        <>{a} followed <strong style={{ fontWeight: 600 }}>{targetName}</strong></>
      );
    case 'follow.removed':
      return (
        <>{a} unfollowed <strong style={{ fontWeight: 600 }}>{targetName}</strong></>
      );
    case 'vote.up':
      return <>{a} liked a post</>;
    case 'vote.down':
      return <>{a} downvoted a post</>;
    case 'vote.cleared':
      return <>{a} cleared their vote</>;
    case 'gallery.added':
      return <>{a} added to their gallery</>;
    default:
      return <>{a} did {activity.type}</>;
  }
}
