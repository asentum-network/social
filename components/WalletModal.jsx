// Wallet connect modal. Four platform options: Extension + Telegram
// are live; WhatsApp + Discord render as "Coming soon". Footer link
// out to the wallet-setup docs.
//
// Mobile = slide-up sheet, desktop = centered modal — matching the
// rest of the redesigned chrome.
//   — milkie

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  useWallet,
  createBotSession,
  getBotSessionStatus,
} from '../lib/wallet';
import { useActionToast } from '../lib/actionToast';
import { IconClose, IconCheck, IconExternal } from './Icons';

const DOCS_URL = 'https://asentum.com/docs/getting-started/account-setup';

const PLATFORMS = [
  {
    id: 'extension',
    name: 'Asentum Extension',
    desc: 'Sign locally in the browser.',
    badge: 'Recommended',
    status: 'live',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    desc: 'Pair with @asentum_wallet_bot using a 6-character code.',
    badge: null,
    status: 'live',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Message the Asentum wallet bot.',
    badge: null,
    status: 'soon',
  },
  {
    id: 'discord',
    name: 'Discord',
    desc: 'DM @asentum-wallet on Discord.',
    badge: null,
    status: 'soon',
  },
];

export default function WalletModal({ open, onClose, layout = 'mobile' }) {
  const { onConnected } = useWallet();
  const { show: showToast } = useActionToast();

  // view: 'pick' | 'extension' | 'code' | 'success'
  const [view, setView] = useState('pick');
  const [error, setError] = useState(null);
  const [code, setCode] = useState('------');
  const [ttl, setTtl] = useState('—');
  const [successAddr, setSuccessAddr] = useState(null);

  const pollRef = useRef(null);
  const ttlRef = useRef(null);

  // Reset to pick view every time the modal opens.
  useEffect(() => {
    if (!open) return;
    setView('pick');
    setError(null);
    setCode('------');
    setTtl('—');
    setSuccessAddr(null);
    return stopTimers;
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function stopTimers() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (ttlRef.current) { clearInterval(ttlRef.current); ttlRef.current = null; }
  }

  function handleClose() {
    stopTimers();
    onClose();
  }

  async function startExtension() {
    setView('extension');
    setError(null);
    try {
      const provider = await waitForProvider(3000);
      const res = await provider.connect();
      onConnected({ address: res.address, method: 'extension' });
      setSuccessAddr(res.address);
      setView('success');
      showToast('Wallet connected');
    } catch (err) {
      setError(err?.message || String(err));
    }
  }

  async function startCode() {
    setView('code');
    setError(null);
    setCode('------');
    try {
      const data = await createBotSession({ dappName: 'Asentum Social' });
      setCode(data.code);
      const expires = new Date(data.expiresAt).getTime();

      const tick = () => {
        const ms = expires - Date.now();
        if (ms <= 0) {
          setTtl('expired');
          stopTimers();
          setError('Code expired. Click Back and try again.');
          return;
        }
        const s = Math.floor(ms / 1000);
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        setTtl(`${mm}:${ss < 10 ? '0' : ''}${ss}`);
      };
      tick();
      ttlRef.current = setInterval(tick, 1000);

      pollRef.current = setInterval(async () => {
        try {
          const s = await getBotSessionStatus(data.sessionId);
          if (s.status === 'connected') {
            stopTimers();
            onConnected({ address: s.address, method: 'bot', botSessionId: data.sessionId });
            setSuccessAddr(s.address);
            setView('success');
            showToast('Connected via Telegram');
          } else if (s.status === 'rejected') {
            stopTimers();
            setError('Connection rejected from the bot.');
          } else if (s.status === 'expired') {
            stopTimers();
            setError('Session expired.');
          }
        } catch { /* transient */ }
      }, 2000);
    } catch (err) {
      setError(`Could not reach wallet bot: ${err.message || err}`);
    }
  }

  const isDesktop = layout === 'desktop';

  const sheetStyle = isDesktop
    ? {
        position: 'fixed',
        left: '50%',
        top: '50%',
        zIndex: 60,
        transform: open ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -46%) scale(0.96)',
        width: 460,
        maxWidth: 'calc(100% - 64px)',
        background: 'var(--surface)',
        borderRadius: 24,
        boxShadow: '0 24px 80px rgba(20,22,30,0.24), 0 2px 10px rgba(20,22,30,0.08)',
        padding: '14px 18px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
      }
    : {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        background: 'var(--surface)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        boxShadow: '0 -12px 40px rgba(20,22,30,0.18)',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        padding: '10px 18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      };

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(20, 22, 30, 0.32)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 240ms ease',
        }}
      />

      <div style={sheetStyle}>
        {!isDesktop && (
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 4,
              background: 'var(--border-strong)',
              alignSelf: 'center',
            }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
            {view === 'pick' && 'Connect a wallet'}
            {view === 'extension' && 'Browser extension'}
            {view === 'code' && 'Pair with Telegram'}
            {view === 'success' && 'Connected'}
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-2)',
              padding: 4,
            }}
          >
            <IconClose />
          </button>
        </div>

        {view === 'pick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PLATFORMS.map((p) => (
              <PlatformRow
                key={p.id}
                platform={p}
                onClick={() => {
                  if (p.status !== 'live') return;
                  if (p.id === 'extension') startExtension();
                  else if (p.id === 'telegram') startCode();
                }}
              />
            ))}
          </div>
        )}

        {view === 'extension' && (
          <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Approve the connection in the Asentum extension popup. It may take a second to open.
            </p>
            {error && <p style={{ margin: 0, fontSize: 13, color: '#d04040' }}>{error}</p>}
            <button
              onClick={() => setView('pick')}
              style={{
                marginTop: 8,
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-2)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                padding: '4px 0',
                fontFamily: 'inherit',
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {view === 'code' && (
          <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Open <a href="https://t.me/asentum_wallet_bot" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>@asentum_wallet_bot</a>, tap <strong>🔗 Connect dapp</strong> in the menu, then send it the code below.
            </p>
            <div
              style={{
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontSize: 38,
                fontWeight: 600,
                color: 'var(--text-1)',
                letterSpacing: 6,
                textAlign: 'center',
                background: 'var(--surface-2)',
                borderRadius: 16,
                padding: '20px 12px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {code}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
              expires in {ttl}
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: '#d04040', textAlign: 'center' }}>{error}</p>}
            <button
              onClick={() => { stopTimers(); setView('pick'); }}
              style={{
                marginTop: 4,
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-2)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                padding: '4px 0',
                fontFamily: 'inherit',
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {view === 'success' && (
          <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: 'oklch(94% 0.08 145)',
                color: 'oklch(38% 0.16 145)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCheck size={28} />
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-2)', textAlign: 'center' }}>
              Connected as
            </div>
            <code
              style={{
                fontSize: 14,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                color: 'var(--text-1)',
                background: 'var(--surface-2)',
                padding: '6px 12px',
                borderRadius: 999,
                wordBreak: 'break-all',
              }}
            >
              {successAddr}
            </code>
            <button
              onClick={handleClose}
              style={{
                marginTop: 4,
                padding: '10px 24px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--text-1)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Continue
            </button>
          </div>
        )}

        {view === 'pick' && (
          <div
            style={{
              marginTop: 4,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: 'var(--text-2)',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              How to set up an Asentum wallet
              <IconExternal />
            </a>
          </div>
        )}
      </div>
    </>
  );
}

function PlatformRow({ platform, onClick }) {
  const isLive = platform.status === 'live';
  return (
    <button
      onClick={onClick}
      disabled={!isLive}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 14px',
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        cursor: isLive ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'background 160ms ease, border-color 160ms ease',
        opacity: isLive ? 1 : 0.55,
      }}
      onMouseEnter={(e) => {
        if (isLive) e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <PlatformGlyph id={platform.id} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
            {platform.name}
          </span>
          {platform.badge && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: 999,
                background: 'oklch(94% 0.08 145)',
                color: 'oklch(38% 0.16 145)',
              }}
            >
              {platform.badge}
            </span>
          )}
          {!isLive && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: 999,
                background: 'var(--surface-2)',
                color: 'var(--text-3)',
              }}
            >
              Coming soon
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{platform.desc}</div>
      </div>
    </button>
  );
}

function PlatformGlyph({ id }) {
  const size = 22;
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  const wrap = (children) => (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: 'var(--surface-2)',
        color: 'var(--text-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg {...props}>{children}</svg>
    </div>
  );
  switch (id) {
    case 'extension':
      return wrap(
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M3 10h18" />
          <circle cx="7.5" cy="7.5" r="0.6" fill="currentColor" />
          <circle cx="10" cy="7.5" r="0.6" fill="currentColor" />
        </>,
      );
    case 'telegram':
      return wrap(
        <>
          <path d="M21 4L3 11l6 2 2 6 4-5 5 4z" />
          <path d="M9 13l5 2" />
        </>,
      );
    case 'whatsapp':
      return wrap(
        <>
          <path d="M4 20l1.7-4.4A8 8 0 1112 20H4z" />
          <path d="M9 11c0 1.8 2.2 4 4 4l1.4-1.4-2-1-1 .8a3.6 3.6 0 01-1.8-1.8l.8-1-1-2L9 10v1z" fill="currentColor" stroke="none" />
        </>,
      );
    case 'discord':
      return wrap(
        <>
          <path d="M5 7c2-1 4-1 5-1l.5 1c-.5 0-1 0-2 .3" />
          <path d="M19 7c-2-1-4-1-5-1l-.5 1c.5 0 1 0 2 .3" />
          <path d="M4 8c-1 2-1 5-1 8 1 1 3 2 5 2l1-1.5" />
          <path d="M20 8c1 2 1 5 1 8-1 1-3 2-5 2l-1-1.5" />
          <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
        </>,
      );
    default:
      return wrap(<rect x="4" y="4" width="16" height="16" rx="3" />);
  }
}

function waitForProvider(timeout = 3000) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('not in a browser'));
      return;
    }
    if (window.asentum) {
      resolve(window.asentum);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      if (window.asentum) {
        clearInterval(id);
        resolve(window.asentum);
      } else if (Date.now() - start > timeout) {
        clearInterval(id);
        reject(
          new Error(
            'Asentum extension not detected. Install it from the asentum.com downloads page.',
          ),
        );
      }
    }, 100);
  });
}
