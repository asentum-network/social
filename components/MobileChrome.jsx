// Mobile chrome: header, scrollable body, bottom nav + FAB, modals.
// Composer + WalletModal mounted here so they live above everything.
//   — milkie

import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from './Header';
import BottomNav from './BottomNav';
import Composer from './Composer';
import WalletModal from './WalletModal';
import ActionToastView from './ActionToastView';
import { useWallet } from '../lib/wallet';

export default function MobileChrome({ children, title, onBack }) {
  const router = useRouter();
  const { modalOpen, closeModal } = useWallet();
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

      <WalletModal
        open={modalOpen}
        onClose={closeModal}
        layout="mobile"
      />

      <ActionToastView bottom={110} />
    </div>
  );
}
