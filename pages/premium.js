// social.asentum.com/premium: buy the blue check.
//
// 1000 ASE, one time (AsentumPremiumLifetime, since 2026-09-25). The fee goes
// straight to the merchant; nothing is held back and nothing is charged
// later. The old weekly/monthly subscription (AsentumPremium) takes no new
// sign-ups; anyone still on it keeps the check while it runs and can cancel
// here for a refund of the remaining deposit.

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet';
import {
  CONTRACTS,
  PREMIUM_PRICE_ASE,
  forgetPremium,
  getLifetimeMembership,
  getSubscription,
  hasLifetimePremium,
} from '@/lib/contracts';
import BlueCheck from '@/components/BlueCheck';

const ONE_ASE = 1_000_000_000_000_000_000n;

export default function PremiumPage() {
  const { address, callContract, connect } = useWallet();
  const [lifetime, setLifetime] = useState(null); // membership record or null
  const [legacy, setLegacy] = useState(null); // old subscription record or null
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!address) return;
    let alive = true;
    (async () => {
      const [m, s] = await Promise.all([
        getLifetimeMembership(address).catch(() => null),
        getSubscription(address).catch(() => null),
      ]);
      if (alive) { setLifetime(m); setLegacy(s); setChecked(true); }
    })();
    return () => { alive = false; };
  }, [address, done]);

  async function buy() {
    setError(null);
    setLoading(true);
    try {
      const res = await callContract({
        to: CONTRACTS.premiumLifetime,
        method: 'buy',
        args: [],
        value: (BigInt(PREMIUM_PRICE_ASE) * ONE_ASE).toString(),
        gasLimit: '2000000',
      });
      // The purchase lands a block or two later; wait for it so the page and
      // every blue check in this tab flip as soon as it is on chain.
      for (let i = 0; i < 20; i++) {
        if (await hasLifetimePremium(address).catch(() => false)) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      forgetPremium(address);
      setDone({ kind: 'bought', tx: res?.txHash });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function cancelLegacy() {
    setError(null);
    setLoading(true);
    try {
      const res = await callContract({
        to: CONTRACTS.premium,
        method: 'cancel',
        args: [],
        value: '0',
        gasLimit: '2000000',
      });
      forgetPremium(address);
      setDone({ kind: 'cancelled', tx: res?.txHash });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const fmtAse = (wei) => {
    if (!wei) return '0';
    const w = BigInt(wei);
    const whole = w / ONE_ASE;
    const frac = w % ONE_ASE;
    if (frac === 0n) return whole.toLocaleString();
    return whole.toLocaleString() + '.' + String(frac).padStart(18, '0').slice(0, 2).replace(/0+$/, '');
  };

  return (
    <>
      <Head>
        <title>Premium — Asentum Social</title>
        <meta name="description" content="Get Premium on social.asentum.com: 1000 ASE, one time. The blue check next to your name on posts, comments, your profile and activity." />
      </Head>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--ink-2, #7A7A7A)', fontSize: 13, textDecoration: 'none' }}>← back to feed</Link>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          Premium
          <BlueCheck premium={true} size={28} />
        </h1>
        <p style={{ color: 'var(--ink-2, #7A7A7A)', fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>
          Pay {PREMIUM_PRICE_ASE.toLocaleString()} ASE once and keep the blue check for good. It shows next
          to your name everywhere it appears: your posts, your comments, your profile and the activity feed.
          No subscription, nothing to renew.
        </p>

        {!address && (
          <div style={{ padding: 20, border: '1px solid var(--border, #222)', borderRadius: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 14, marginBottom: 12, color: 'var(--ink-1, #BABABA)' }}>
              Connect a wallet to get Premium.
            </div>
            <button onClick={connect} style={btnPrimary}>Connect wallet</button>
          </div>
        )}

        {address && checked && lifetime && (
          <div style={{ padding: 24, border: '1px solid rgba(127,212,168,0.4)', borderRadius: 12, background: 'rgba(127,212,168,0.05)', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, letterSpacing: 1.5, color: '#7fd4a8', fontWeight: 600 }}>YOU HAVE PREMIUM</span>
              <BlueCheck premium={true} size={16} />
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-1, #BABABA)' }}>
              Since {new Date(Number(lifetime.paidAt) * 1000).toLocaleDateString()}. It never expires.
            </div>
          </div>
        )}

        {address && checked && !lifetime && (
          <div style={{ border: '1px solid rgba(61,169,252,0.4)', borderRadius: 12, padding: 24, background: 'rgba(61,169,252,0.04)', marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 600, color: '#3da9fc', marginBottom: 16 }}>LIFETIME</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{PREMIUM_PRICE_ASE.toLocaleString()} ASE</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2, #7A7A7A)', marginBottom: 20 }}>one time, yours for good</div>
            <button onClick={buy} disabled={loading} style={btnPrimary}>
              {loading ? 'Confirming…' : `Get Premium for ${PREMIUM_PRICE_ASE.toLocaleString()} ASE`}
            </button>
          </div>
        )}

        {address && checked && legacy && (
          <div style={{ padding: 20, border: '1px solid var(--border, #222)', borderRadius: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Your old subscription</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2, #7A7A7A)', lineHeight: 1.5, marginBottom: 12 }}>
              You are on the old {legacy.tier === 'w' ? '3 ASE / week' : '10 ASE / month'} plan with{' '}
              {fmtAse(legacy.balance)} ASE deposited. It keeps your check while it runs, and it can no longer
              be started or topped up. Cancel it any time to get the remaining deposit back.
            </div>
            <button onClick={cancelLegacy} disabled={loading} style={{ ...btnDanger, width: '100%' }}>
              {loading ? 'Confirming…' : 'Cancel old subscription & refund deposit'}
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 24, padding: 12, background: 'rgba(229,135,127,0.12)', border: '1px solid rgba(229,135,127,0.4)', borderRadius: 8, color: '#e5877f', fontSize: 13 }}>
            {error}
          </div>
        )}

        {done && (
          <div style={{ marginTop: 24, padding: 12, background: 'rgba(127,212,168,0.12)', border: '1px solid rgba(127,212,168,0.4)', borderRadius: 8, color: '#7fd4a8', fontSize: 13 }}>
            {done.kind === 'bought' ? '✓ Premium is yours' : '✓ Old subscription cancelled and refunded'}
            {done.tx ? ` · tx ${done.tx.slice(0, 14)}…` : ''}
          </div>
        )}
      </div>
    </>
  );
}

const btnPrimary = {
  width: '100%', padding: '12px 16px', background: '#3da9fc',
  border: 'none', borderRadius: 8, color: 'white', fontSize: 14,
  fontWeight: 600, cursor: 'pointer',
};
const btnDanger = {
  padding: '10px 16px', background: 'transparent',
  border: '1px solid rgba(229,135,127,0.4)', borderRadius: 8, color: '#e5877f',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
