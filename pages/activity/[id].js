import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { fetchActivity } from '../../lib/indexer';
import { getProfile, shortAddr } from '../../lib/contracts';

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
        if (a) {
          if (a.actorAddress) {
            getProfile(a.actorAddress).then((p) => !cancelled && setActorProfile(p)).catch(() => {});
          }
          if (a.targetAddress) {
            getProfile(a.targetAddress).then((p) => !cancelled && setTargetProfile(p)).catch(() => {});
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/activity"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-accent"
        >
          ← Back to activity
        </Link>

        <h1 className="font-sans text-2xl font-bold mt-4 mb-1">Activity #{id}</h1>

        {error && (
          <div className="border border-red-800 bg-red-900/20 text-red-300 p-4 font-mono text-[12px] mt-4">
            {error}
          </div>
        )}

        {activity === undefined && !error && <Skeleton />}
        {activity === null && (
          <div className="border border-line bg-bg-1 p-8 mt-6 text-center">
            <p className="font-mono text-[12px] text-ink-3">activity not found</p>
          </div>
        )}

        {activity && (
          <div className="mt-6 space-y-4">
            <Hero activity={activity} actorProfile={actorProfile} targetProfile={targetProfile} />
            <Meta activity={activity} />
            <Participants
              actor={activity.actorAddress}
              target={activity.targetAddress}
              actorProfile={actorProfile}
              targetProfile={targetProfile}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}

function Hero({ activity, actorProfile, targetProfile }) {
  return (
    <div className="border border-line bg-bg-1 p-5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
        {typeLabel(activity.type)}
      </div>
      <p className="font-sans text-[15px] text-ink-1">
        {phrasing(activity, actorProfile?.name, targetProfile?.name)}
      </p>
    </div>
  );
}

function Meta({ activity }) {
  return (
    <div className="border border-line bg-bg-1 p-4 font-mono text-[11px] space-y-2">
      <Kv k="event id"       v={String(activity.id)} />
      <Kv k="type"           v={activity.type} />
      <Kv k="block"          v={String(activity.blockNumber)} />
      <Kv k="tx hash"        v={activity.txHash} link={`https://testnet.asentum.com/tx/${activity.txHash}`} />
      <Kv k="log index"      v={String(activity.logIndex)} />
      <Kv k="indexer time"   v={new Date(Number(activity.ts)).toISOString()} />
    </div>
  );
}

function Participants({ actor, target, actorProfile, targetProfile }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Participant label="Actor" addr={actor} profile={actorProfile} />
      {target && <Participant label="Target" addr={target} profile={targetProfile} />}
    </div>
  );
}

function Participant({ label, addr, profile }) {
  if (!addr) return null;
  return (
    <Link
      href={`/u/${addr}`}
      className="border border-line bg-bg-1 p-4 hover:border-accent transition-colors block"
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1">{label}</div>
      <div className="font-sans text-[15px] font-bold text-ink-0">
        {profile?.name || shortAddr(addr)}
      </div>
      <div className="font-mono text-[11px] text-ink-3 break-all">{addr}</div>
    </Link>
  );
}

function Kv({ k, v, link }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <span className="text-ink-3 uppercase tracking-wider">{k}</span>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="text-ink-1 hover:text-accent break-all underline-offset-2 hover:underline">
          {v} ↗
        </a>
      ) : (
        <span className="text-ink-1 break-all">{v}</span>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="border border-line bg-bg-1 p-5 mt-6 animate-pulse">
      <div className="h-3 w-24 bg-bg-3 mb-3" />
      <div className="h-4 w-3/4 bg-bg-3" />
    </div>
  );
}

function typeLabel(t) {
  return ({
    'post.created':       'POST',
    'profile.created':    'PROFILE CREATED',
    'profile.updated':    'PROFILE UPDATED',
    'follow.followed':    'FOLLOW',
    'follow.unfollowed':  'UNFOLLOW',
  })[t] || t;
}

function phrasing(a, actorName, targetName) {
  const actor = actorName || shortAddr(a.actorAddress);
  const target = targetName || (a.targetAddress ? shortAddr(a.targetAddress) : '');
  switch (a.type) {
    case 'post.created':       return `${actor} posted (post #${a.data?.postId}, ${a.data?.contentLen ?? '?'} chars).`;
    case 'profile.created':    return `${actor} joined as ${a.data?.name || 'unnamed'}.`;
    case 'profile.updated':    return `${actor} updated their profile.`;
    case 'follow.followed':    return `${actor} followed ${target}.`;
    case 'follow.unfollowed':  return `${actor} unfollowed ${target}.`;
    default:                   return `${actor} ${a.type}`;
  }
}
