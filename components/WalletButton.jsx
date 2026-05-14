// Wallet connect button in the header. Shows a green dot + truncated
// address when connected, else "Connect wallet" pill.
//   — milkie

import { useWallet } from '../lib/wallet';
import { IconWallet } from './Icons';
import { shortAddr } from '../lib/format';

export default function WalletButton() {
  const { address, isConnected, openModal, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <button
        onClick={disconnect}
        title="Disconnect"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px 7px 8px',
          borderRadius: 999,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            background: 'oklch(70% 0.16 145)',
            boxShadow: 'inset 0 0 0 2px #fff',
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-1)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {shortAddr(address)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={openModal}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'var(--text-1)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'inherit',
        boxShadow: '0 1px 2px rgba(20,22,30,0.18)',
      }}
    >
      <IconWallet />
      <span>Connect wallet</span>
    </button>
  );
}
