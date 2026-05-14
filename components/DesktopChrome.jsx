// Desktop chrome: top bar with wordmark + tabs + wallet, centered
// scrolling column, floating compose FAB bottom-left.
//   — milkie

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import WalletButton from './WalletButton';
import Composer from './Composer';
import WalletModal from './WalletModal';
import ActionToastView from './ActionToastView';
import { useWallet } from '../lib/wallet';
import { IconHome, IconUser, IconPlus, IconBack } from './Icons';

export default function DesktopChrome({ children, title, onBack }) {
  const router = useRouter();
  const { address, modalOpen, closeModal } = useWallet();
  const [composerOpen, setComposerOpen] = useState(false);

  const path = router.pathname;
  const isFeed = path === '/';
  const isProfile = path.startsWith('/u/');
  const handleBack = onBack || (() => router.back());

  const goProfile = () => {
    if (address) router.push(`/u/${address.toLowerCase()}`);
    else router.push('/u/me');
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--bg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 32px',
          background: 'rgba(252,251,249,0.85)',
          backdropFilter: 'blur(14px) saturate(160%)',
          WebkitBackdropFilter: 'blur(14px) saturate(160%)',
          borderBottom: '1px solid var(--border)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, flexBasis: 0 }}>
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: -0.6,
                color: 'var(--text-1)',
              }}
            >
              asentum
            </span>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: 'var(--accent)',
                display: 'inline-block',
                transform: 'translateY(-2px)',
              }}
            />
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-2)', borderRadius: 999 }}>
          <DesktopTab active={isFeed} onClick={() => router.push('/')}>
            <IconHome filled={isFeed} size={17} />
            <span>Home</span>
          </DesktopTab>
          <DesktopTab active={isProfile} onClick={goProfile}>
            <IconUser filled={isProfile} size={17} />
            <span>Profile</span>
          </DesktopTab>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            flex: 1,
            flexBasis: 0,
          }}
        >
          <WalletButton />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: 0 }}>
          {onBack && (
            <div style={{ padding: '14px 14px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleBack}
                aria-label="Back"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-1)',
                }}
              >
                <IconBack />
              </button>
              {title && (
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{title}</div>
              )}
            </div>
          )}
          {children}
        </div>
      </div>

      <button
        onClick={() => setComposerOpen(true)}
        aria-label="New post"
        style={{
          position: 'absolute',
          left: 32,
          bottom: 32,
          zIndex: 25,
          width: 60,
          height: 60,
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          background: 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 24px rgba(98,72,232,0.36), 0 2px 6px rgba(20,22,30,0.1)',
          transition: 'transform 160ms ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <IconPlus />
      </button>

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        layout="desktop"
      />

      <WalletModal
        open={modalOpen}
        onClose={closeModal}
        layout="desktop"
      />

      <ActionToastView bottom={44} />
    </div>
  );
}

function DesktopTab({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 14px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--text-1)' : 'var(--text-2)',
        fontSize: 13.5,
        fontWeight: 600,
        boxShadow: active ? '0 1px 2px rgba(20,22,30,0.06)' : 'none',
        transition: 'background 160ms ease',
      }}
    >
      {children}
    </button>
  );
}
