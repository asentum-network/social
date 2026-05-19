import React, { useEffect, useState } from 'react';
import { isPremium } from '@/lib/contracts';

/**
 * Premium check badge — the blue check.
 *
 * Renders as an inline SVG next to a username. Backed by the
 * AsentumPremium contract on-chain (3 ASE/wk or 10 ASE/mo, cron-fired
 * recurring debit). If the user has an active subscription with enough
 * balance to cover the next charge, the badge shows.
 *
 * The component fetches its own premium status. For dense feeds with
 * many usernames, prefer passing `premium` as a prop (parent fetches
 * once via `isPremiumMany`) so we don't fire N view calls.
 */
export default function BlueCheck({ address, premium, size = 14, className = '' }) {
  const [resolved, setResolved] = useState(premium ?? null);

  useEffect(() => {
    if (premium !== undefined && premium !== null) {
      setResolved(premium);
      return;
    }
    if (!address) return;
    let cancelled = false;
    isPremium(address)
      .then((p) => { if (!cancelled) setResolved(p); })
      .catch(() => { if (!cancelled) setResolved(false); });
    return () => { cancelled = true; };
  }, [address, premium]);

  if (!resolved) return null;

  return (
    <span
      className={'inline-flex items-center justify-center align-middle ' + className}
      style={{ marginLeft: 4, lineHeight: 0 }}
      title="Premium subscriber"
      aria-label="Premium subscriber"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11 1.5l2.6 1.4 2.94-.5.5 2.94L19.44 8 18 10.5l1.44 2.5-2.4 1.66-.5 2.94-2.94-.5L11 18.5l-2.6-1.4-2.94.5-.5-2.94L2.56 13 4 10.5 2.56 8 4.96 6.34l.5-2.94 2.94.5L11 1.5z"
          fill="#3da9fc"
          stroke="#3da9fc"
        />
        <path
          d="M7.4 11.4l2.5 2.5 5-5.4"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
