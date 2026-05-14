import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Avatar from '../../components/Avatar';
import { IconExternal } from '../../components/Icons';
import { fetchActivity } from '../../lib/indexer';
import { getProfile, RPC_URL } from '../../lib/contracts';
import { shortAddr, timeAgo } from '../../lib/format';

export default function ActivityDetail() {
  const router = useRouter();
  const id = router.query.id;
  const [activity, setActivity] = useState(undefined);
  const [actorProfile, setActorProfile] = useState(null);
  const [targetProfile, setTargetProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const a = await fetchActivity(id);
        if (cancelled) return;
        setActivity(a);
        if (a?.actorAddress) {
          getProfile(a.actorAddress).then((p) => !cancelled && setActorProfile(p)).catch(() => {});
        }
        if (a?.targetAddress) {
          getProfile(a.targetAddress).then((p) => !cancelled && setTargetProfile(p)).catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const actor = activity?.actorAddress?.toLowerCase() || '';
  const target = activity?.targetAddress?.toLowerCase() || '';
  const actorName = actorProfile?.name?.trim() || shortAddr(actor);
  const targetName = targetProfile?.name?.trim() || shortAddr(target);
  const tsSec = activity ? Math.floor(Number(activity.ts) / 1000) : 0;

  return (
    <>
      <Head>
        <title>Activity #{id} · asentum</title>
      </Head>
      <Layout title="Activity" onBack={() => router.push('/activity')}>
        <div style={{ padding: '20px 14px 140px', maxWidth: 560, margin: '0 auto' }}>
          {error && (
            <div
              style={{
                background: 'oklch(96% 0.04 25)',
                border: '1px solid oklch(86% 0.08 25)',
                color: 'oklch(38% 0.12 25)',
                fontSize: 13,
                padding: '12px 16px',
                borderRadius: 12,
              }}
            >
              {error}
            </div>
          )}

          {activity === undefined && !error && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              Loading…
            </div>
          )}

          {activity === null && !error && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              Activity not found.
            </div>
          )}

          {activity && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 22,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar
                  user={{ address: actor, name: actorProfile?.name, avatarUrl: actorProfile?.avatarUrl }}
                  size={52}
                />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-1)' }}>
                    {actorName}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {humanType(activity.type)} · {timeAgo(tsSec)}
                  </div>
                </div>
              </div>

              <Row label="Type" value={activity.type} />
              <Row label="Block" value={`#${Number(activity.blockNumber).toLocaleString()}`} />
              <Row
                label="Tx"
                value={(
                  <a
                    href={`https://explorer.asentum.com/tx/${activity.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--accent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                      fontSize: 12.5,
                      wordBreak: 'break-all',
                    }}
                  >
                    {activity.txHash.slice(0, 10)}…{activity.txHash.slice(-6)}
                    <IconExternal />
                  </a>
                )}
              />
              {activity.actorAddress && (
                <Row label="Actor" value={<AddressLink addr={actor} name={actorProfile?.name} />} />
              )}
              {activity.targetAddress && (
                <Row label="Target" value={<AddressLink addr={target} name={targetProfile?.name} />} />
              )}
              {activity.data && Object.keys(activity.data).length > 0 && (
                <Row
                  label="Data"
                  value={(
                    <pre
                      style={{
                        margin: 0,
                        fontSize: 12,
                        background: 'var(--surface-2)',
                        padding: '10px 12px',
                        borderRadius: 10,
                        color: 'var(--text-2)',
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(activity.data, null, 2)}
                    </pre>
                  )}
                />
              )}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12, alignItems: 'baseline' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-1)', minWidth: 0 }}>{value}</div>
    </div>
  );
}

function AddressLink({ addr, name }) {
  return (
    <a
      href={`/u/${addr}`}
      style={{
        color: 'var(--accent)',
        fontFamily: name ? 'inherit' : 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: name ? 14 : 12.5,
      }}
    >
      {name?.trim() || shortAddr(addr)}
    </a>
  );
}

function humanType(type) {
  return {
    'profile.created': 'Created a profile',
    'profile.updated': 'Updated profile',
    'post.created': 'Posted',
    'follow.created': 'Followed',
    'follow.removed': 'Unfollowed',
    'vote.up': 'Liked a post',
    'vote.down': 'Downvoted a post',
    'vote.cleared': 'Cleared vote',
    'gallery.added': 'Added to gallery',
  }[type] || type;
}
