// social.asentum.com/premium — get-premium subscription page.
//
// Two tiers: 3 ASE/wk or 10 ASE/mo. User signs ONCE — the contract
// holds a deposit balance and cron-fires the recurring debit. Premium
// status drops the moment the deposit can't cover the next charge.
//
// Backed by AsentumPremium at 0xa298d3ba8ab21a061a247d95dc383cbbe006ee85.

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet';
import {
  CONTRACTS,
  getSubscription,
  getPremiumTiers,
  isPremium,
} from '@/lib/contracts';
import BlueCheck from '@/components/BlueCheck';

const ONE_ASE = 1_000_000_000_000_000_000n;

export default function PremiumPage() {
  const { address, callContract, connect } = useWallet();
  const [tiers, setTiers] = useState(null);
  const [sub, setSub] = useState(null);
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  // Load tier prices + the user's current subscription state.
  useEffect(() => {
    let alive = true;
    getPremiumTiers().then((t) => alive && setTiers(t));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!address) return;
    let alive = true;
    (async () => {
      const s = await getSubscription(address);
      const p = await isPremium(address);
      if (alive) { setSub(s); setPremium(p); }
    })();
    return () => { alive = false; };
  }, [address, done]);

  async function subscribe(tierId, depositAse) {
    setError(null);
    setLoading(true);
    try {
      const valueWei = (BigInt(depositAse) * ONE_ASE).toString();
      const res = await callContract({
        to: CONTRACTS.premium,
        method: 'subscribe',
        args: [tierId],
        value: valueWei,
        gasLimit: '2000000',
      });
      setDone({ kind: 'subscribed', tx: res?.txHash });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
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
      setDone({ kind: 'cancelled', tx: res?.txHash });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function topUp(addAse) {
    setError(null);
    setLoading(true);
    try {
      const valueWei = (BigInt(addAse) * ONE_ASE).toString();
      const res = await callContract({
        to: CONTRACTS.premium,
        method: 'topUp',
        args: [],
        value: valueWei,
        gasLimit: '2000000',
      });
      setDone({ kind: 'topped-up', tx: res?.txHash });
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
        <meta name="description" content="Subscribe to Premium on social.asentum.com. Pay 3 ASE/week or 10 ASE/month. Get the blue check. Cron-fired recurring billing — no card-on-file, no Stripe." />
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
          Subscribe once. Get the blue check next to your name wherever it appears.
          Billing happens on-chain — your deposit covers the next charge, the chain
          itself fires the recurring debit on schedule. Cancel any time and get the
          remainder back.
        </p>

        {!address && (
          <div style={{ padding: 20, border: '1px solid var(--border, #222)', borderRadius: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 14, marginBottom: 12, color: 'var(--ink-1, #BABABA)' }}>
              Connect a wallet to subscribe.
            </div>
            <button onClick={connect} style={btnPrimary}>Connect wallet</button>
          </div>
        )}

        {address && premium && sub && (
          <ActiveSubscription
            sub={sub}
            fmtAse={fmtAse}
            onCancel={cancel}
            onTopUp={topUp}
            loading={loading}
          />
        )}

        {address && !premium && tiers && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <TierCard
              tag="WEEKLY"
              price="3 ASE"
              cadence="every 7 days"
              defaultDeposit={3}
              hint="One week upfront. Top up anytime."
              onSubscribe={(deposit) => subscribe('w', deposit)}
              loading={loading}
            />
            <TierCard
              tag="MONTHLY"
              price="10 ASE"
              cadence="every 30 days"
              defaultDeposit={10}
              hint="Save 30% vs weekly. Best value."
              accent
              onSubscribe={(deposit) => subscribe('m', deposit)}
              loading={loading}
            />
          </div>
        )}

        {error && (
          <div style={{ marginTop: 24, padding: 12, background: 'rgba(229,135,127,0.12)', border: '1px solid rgba(229,135,127,0.4)', borderRadius: 8, color: '#e5877f', fontSize: 13 }}>
            {error}
          </div>
        )}

        {done && (
          <div style={{ marginTop: 24, padding: 12, background: 'rgba(127,212,168,0.12)', border: '1px solid rgba(127,212,168,0.4)', borderRadius: 8, color: '#7fd4a8', fontSize: 13 }}>
            ✓ {done.kind} — tx {done.tx ? done.tx.slice(0, 14) + '…' : 'pending'}
          </div>
        )}

        <details style={{ marginTop: 48, fontSize: 13, color: 'var(--ink-2, #7A7A7A)' }}>
          <summary style={{ cursor: 'pointer', marginBottom: 8 }}>How does it work?</summary>
          <div style={{ lineHeight: 1.6 }}>
            <p style={{ marginTop: 8 }}>
              When you subscribe, your ASE deposit goes into the{' '}
              <code style={{ background: '#161616', padding: '1px 4px', borderRadius: 3 }}>AsentumPremium</code>{' '}
              contract. The chain&apos;s built-in cron registry fires a charge function every
              day. On your next billing period, the contract debits your deposit and sends
              the charge to the merchant address. Status drops the moment your deposit
              can&apos;t cover the next charge.
            </p>
            <p style={{ marginTop: 12 }}>
              No card on file. No Stripe. No off-chain keeper.{' '}
              <Link href="/use-cases/subscriptions" style={{ color: '#7fd4a8' }}>
                How on-chain subscriptions work →
              </Link>
            </p>
          </div>
        </details>
      </div>
    </>
  );
}

function TierCard({ tag, price, cadence, defaultDeposit, hint, accent, onSubscribe, loading }) {
  const [deposit, setDeposit] = useState(defaultDeposit);
  return (
    <div
      style={{
        border: '1px solid ' + (accent ? 'rgba(61,169,252,0.4)' : 'var(--border, #222)'),
        borderRadius: 12,
        padding: 24,
        background: accent ? 'rgba(61,169,252,0.04)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span
          style={{
            fontSize: 10, letterSpacing: 1.5, fontWeight: 600,
            color: accent ? '#3da9fc' : 'var(--ink-2, #7A7A7A)',
          }}
        >
          {tag}
        </span>
        {accent && <span style={{ fontSize: 10, color: '#3da9fc' }}>★ best value</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{price}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2, #7A7A7A)', marginBottom: 20 }}>{cadence}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-2, #7A7A7A)', marginBottom: 8 }}>Initial deposit (ASE)</div>
      <input
        type="number"
        min={defaultDeposit}
        value={deposit}
        onChange={(e) => setDeposit(Math.max(defaultDeposit, parseInt(e.target.value, 10) || defaultDeposit))}
        style={{
          width: '100%', padding: '10px 12px', background: '#0E0E0E',
          border: '1px solid var(--border, #222)', borderRadius: 8, color: 'white',
          fontSize: 14, marginBottom: 12,
        }}
      />
      <div style={{ fontSize: 10, color: 'var(--ink-2, #5A5A5A)', marginBottom: 16 }}>{hint}</div>
      <button
        onClick={() => onSubscribe(deposit)}
        disabled={loading}
        style={accent ? btnPrimary : btnSecondary}
      >
        {loading ? 'Confirming…' : `Subscribe — ${deposit} ASE`}
      </button>
    </div>
  );
}

function ActiveSubscription({ sub, fmtAse, onCancel, onTopUp, loading }) {
  const [topUpAmount, setTopUpAmount] = useState(3);
  const nextChargeDate = new Date(Number(sub.nextCharge) * 1000).toLocaleString();
  return (
    <div style={{ padding: 24, border: '1px solid rgba(127,212,168,0.4)', borderRadius: 12, background: 'rgba(127,212,168,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, color: '#7fd4a8', fontWeight: 600 }}>ACTIVE</span>
        <BlueCheck premium={true} size={16} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, fontSize: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-2, #7A7A7A)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Tier</div>
          <div style={{ fontWeight: 600 }}>{sub.tier === 'w' ? '3 ASE / week' : '10 ASE / month'}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-2, #7A7A7A)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Deposit balance</div>
          <div style={{ fontWeight: 600 }}>{fmtAse(sub.balance)} ASE</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-2, #7A7A7A)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Next charge</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{nextChargeDate}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-2, #7A7A7A)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Next amount</div>
          <div style={{ fontWeight: 600 }}>{fmtAse(sub.amount)} ASE</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border, #222)', paddingTop: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-2, #7A7A7A)', marginBottom: 8 }}>Top up (ASE)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            min={1}
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(parseInt(e.target.value, 10) || 1)}
            style={{ flex: 1, padding: '10px 12px', background: '#0E0E0E', border: '1px solid var(--border, #222)', borderRadius: 8, color: 'white', fontSize: 14 }}
          />
          <button onClick={() => onTopUp(topUpAmount)} disabled={loading} style={btnSecondary}>Top up</button>
        </div>
      </div>

      <button onClick={onCancel} disabled={loading} style={{ ...btnDanger, width: '100%' }}>
        {loading ? 'Confirming…' : 'Cancel & refund remaining deposit'}
      </button>
    </div>
  );
}

const btnPrimary = {
  width: '100%', padding: '12px 16px', background: '#3da9fc',
  border: 'none', borderRadius: 8, color: 'white', fontSize: 14,
  fontWeight: 600, cursor: 'pointer',
};
const btnSecondary = {
  padding: '10px 16px', background: 'transparent',
  border: '1px solid var(--border, #333)', borderRadius: 8, color: 'white',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const btnDanger = {
  padding: '10px 16px', background: 'transparent',
  border: '1px solid rgba(229,135,127,0.4)', borderRadius: 8, color: '#e5877f',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
