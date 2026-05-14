// Mobile bottom nav: Home / Activity / Profile / Settings tabs +
// floating compose FAB at bottom-left.
//   — milkie

import { useRouter } from 'next/router';
import { useWallet } from '../lib/wallet';
import {
  IconHome, IconUser, IconActivity, IconSettings, IconPlus,
} from './Icons';

export default function BottomNav({ onCompose }) {
  const router = useRouter();
  const { address } = useWallet();
  const path = router.pathname;
  const isFeed = path === '/';
  const isProfile = path.startsWith('/u/');
  const isActivity = path.startsWith('/activity');
  const isSettings = path === '/settings';

  const goProfile = () => {
    if (address) router.push(`/u/${address.toLowerCase()}`);
    else router.push('/u/me');
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '8px 12px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          background: 'rgba(252,251,249,0.88)',
          backdropFilter: 'blur(14px) saturate(160%)',
          WebkitBackdropFilter: 'blur(14px) saturate(160%)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 20,
        }}
      >
        <NavTab active={isFeed} onClick={() => router.push('/')} label="Home">
          <IconHome filled={isFeed} size={24} />
        </NavTab>
        <NavTab active={isActivity} onClick={() => router.push('/activity')} label="Activity">
          <IconActivity filled={isActivity} size={24} />
        </NavTab>
        <NavTab active={isProfile} onClick={goProfile} label="Profile">
          <IconUser filled={isProfile} size={24} />
        </NavTab>
        <NavTab active={isSettings} onClick={() => router.push('/settings')} label="Settings">
          <IconSettings filled={isSettings} size={24} />
        </NavTab>
      </div>

      <button
        onClick={onCompose}
        aria-label="New post"
        style={{
          position: 'absolute',
          left: 20,
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
          zIndex: 25,
          width: 58,
          height: 58,
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          background: 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(98,72,232,0.36), 0 2px 6px rgba(20,22,30,0.1)',
          transition: 'transform 160ms ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <IconPlus />
      </button>
    </>
  );
}

function NavTab({ children, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        flex: 1,
        maxWidth: 80,
        padding: '8px 0',
        borderRadius: 14,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? 'var(--text-1)' : 'var(--text-3)',
        transition: 'color 160ms ease',
      }}
    >
      {children}
    </button>
  );
}
