// Mobile chrome: header, scrollable body, bottom nav + FAB, modals.
// Composer mounted here so it lives above everything. The wallet connect
// modal is mounted once by the wallet provider in _app.
//   — milkie

import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from './Header';
import BottomNav from './BottomNav';
import Composer from './Composer';
import ActionToastView from './ActionToastView';

export default function MobileChrome({ children, title, onBack }) {
  const router = useRouter();
  const [composerOpen, setComposerOpen] = useState(false);

  // Default back behaviour: pop the route. Caller can override via prop.
  const handleBack = onBack || (() => router.back());

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <Header onBack={onBack ? handleBack : null} title={title} />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>

      <BottomNav onCompose={() => setComposerOpen(true)} />

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        layout="mobile"
      />

      <ActionToastView bottom={110} />
    </div>
  );
}
