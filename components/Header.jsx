// Mobile sticky header. Asentum wordmark + dot on the left, wallet
// button on the right. Renders a back arrow + title instead of the
// wordmark when the route asks for it (profile view).
//   — milkie

import WalletButton from './WalletButton';
import { IconBack } from './Icons';

export default function Header({ onBack, title }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: 'rgba(252,251,249,0.82)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-1)',
              marginLeft: -8,
            }}
          >
            <IconBack />
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: -0.5,
                color: 'var(--text-1)',
              }}
            >
              asepost
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
          </div>
        )}
        {title && (
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>{title}</div>
        )}
      </div>

      <WalletButton />
    </div>
  );
}
