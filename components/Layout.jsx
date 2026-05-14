// Picks the right chrome based on viewport. Lazy-loads the chrome
// components on the client so SSR doesn't choke on the wallet context
// (which reads window / localStorage on mount).
//   — milkie

import dynamic from 'next/dynamic';
import { useLayout } from '../lib/useLayout';

const MobileChrome = dynamic(() => import('./MobileChrome'), {
  ssr: false,
  loading: () => <Loading />,
});
const DesktopChrome = dynamic(() => import('./DesktopChrome'), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-3)',
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}
    >
      loading…
    </div>
  );
}

export default function Layout({ children, title, onBack }) {
  const layout = useLayout();
  const Chrome = layout === 'desktop' ? DesktopChrome : MobileChrome;
  return <Chrome title={title} onBack={onBack}>{children}</Chrome>;
}
