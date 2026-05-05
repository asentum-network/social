// Two parallel toast lanes:
//   • bottom-left  — global activity from other users (2s, plus catch-up replay on connect)
//   • top-right    — confirmations of *your own* on-chain actions (longer, with explorer + post links)
//
// Routing rule: if `activity.actorAddress === connected wallet`, it goes
// to top-right; everything else goes to bottom-left. Catch-up (historical)
// activities go to bottom-left only — never replay your own past actions
// as confirmations.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Toast from './Toast';
import { useWallet } from '../lib/wallet';
import { subscribe } from '../lib/activityStream';
import { shortAddr } from '../lib/contracts';

const MAX_VISIBLE = 5;
const OWN_DURATION_MS = 8000;
const ACTIVITY_DURATION_MS = 2000;

export default function ToastLanes() {
  const { address } = useWallet();
  const [bottomLeft, setBottomLeft] = useState([]);
  const [topRight, setTopRight] = useState([]);

  useEffect(() => {
    const myAddr = address?.toLowerCase() ?? null;

    const offHello = subscribe('hello', (recent) => {
      if (!Array.isArray(recent) || recent.length === 0) return;
      // Drop our own historical events; the user already saw their own
      // confirmations at the time. Push the rest to bottom-left as a
      // single batch with a small stagger so they animate in.
      const others = recent.filter((a) => a.actorAddress?.toLowerCase() !== myAddr);
      others.forEach((a, i) => {
        setTimeout(() => pushBottom(a), i * 80);
      });
    });

    const offActivity = subscribe('activity', (a) => {
      if (a.actorAddress?.toLowerCase() === myAddr) {
        pushTop(a);
      } else {
        pushBottom(a);
      }
    });

    return () => { offHello(); offActivity(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  function pushBottom(a) {
    setBottomLeft((q) => {
      const next = [...q, { ...a, _key: a.id + ':' + Math.random() }];
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    });
  }
  function pushTop(a) {
    setTopRight((q) => {
      const next = [...q, { ...a, _key: a.id + ':' + Math.random() }];
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    });
  }
  const dropBottom = (key) => setBottomLeft((q) => q.filter((x) => x._key !== key));
  const dropTop = (key) => setTopRight((q) => q.filter((x) => x._key !== key));

  return (
    <>
      {/* Top-right: your own confirmations */}
      <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 max-w-sm w-[360px] pointer-events-none">
        {topRight.map((a) => (
          <Toast key={a._key} durationMs={OWN_DURATION_MS} onClose={() => dropTop(a._key)}>
            <OwnConfirmation activity={a} />
          </Toast>
        ))}
      </div>
      {/* Bottom-left: live activity from others */}
      <div className="fixed bottom-4 left-4 z-40 flex flex-col-reverse gap-2 max-w-sm w-[360px] pointer-events-none">
        {bottomLeft.map((a) => (
          <Toast key={a._key} durationMs={ACTIVITY_DURATION_MS} onClose={() => dropBottom(a._key)}>
            <PublicActivity activity={a} />
          </Toast>
        ))}
      </div>
    </>
  );
}

// ─── Toast bodies ──────────────────────────────────────────────────────────

function PublicActivity({ activity }) {
  const actor = activity.actorAddress;
  const target = activity.targetAddress;
  return (
    <div className="font-mono text-[11px] leading-relaxed text-ink-1">
      {actorVerbTarget(activity, actor, target)}
    </div>
  );
}

function OwnConfirmation({ activity }) {
  const txHash = activity.txHash;
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-accent">
        ✓ {labelFor(activity)}
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px] text-ink-3">
        <a
          href={`https://testnet.asentum.com/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-accent underline-offset-2 hover:underline"
        >
          tx ↗
        </a>
        {activity.type === 'post.created' && activity.data?.postId && (
          <Link
            href={`/post/${activity.data.postId}`}
            className="hover:text-accent underline-offset-2 hover:underline"
          >
            view post →
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Phrasing ──────────────────────────────────────────────────────────────

function labelFor(a) {
  switch (a.type) {
    case 'post.created':       return 'Posted on-chain';
    case 'profile.created':    return 'Profile created';
    case 'profile.updated':    return 'Profile updated';
    case 'follow.followed':    return 'Followed';
    case 'follow.unfollowed':  return 'Unfollowed';
    default:                   return a.type;
  }
}

function AddrLink({ addr }) {
  const a = (addr || '').toLowerCase();
  return (
    <Link href={`/u/${a}`} className="text-accent underline-offset-2 hover:underline">
      {shortAddr(a)}
    </Link>
  );
}

function actorVerbTarget(activity, actor, target) {
  switch (activity.type) {
    case 'post.created':
      return (
        <>
          <AddrLink addr={actor} /> just posted{' '}
          {activity.data?.postId && (
            <Link href={`/post/${activity.data.postId}`} className="text-ink-2 hover:text-accent">
              ↗
            </Link>
          )}
        </>
      );
    case 'profile.created':
      return (
        <>
          <AddrLink addr={actor} /> joined as <span className="text-ink-0">{activity.data?.name || 'unnamed'}</span>
        </>
      );
    case 'profile.updated':
      return (
        <>
          <AddrLink addr={actor} /> updated their profile
        </>
      );
    case 'follow.followed':
      return (
        <>
          <AddrLink addr={actor} /> followed <AddrLink addr={target} />
        </>
      );
    case 'follow.unfollowed':
      return (
        <>
          <AddrLink addr={actor} /> unfollowed <AddrLink addr={target} />
        </>
      );
    default:
      return <span className="text-ink-3">{activity.type}</span>;
  }
}
