// Wallet context, backed by the shared @asentum/connect kit.
//
// The kit owns the connect modal (extension or Telegram bot pairing), the
// persisted session and the signer routing. This file adapts the kit's
// hooks to the shape the rest of the app already uses (isConnected,
// openModal, callContract and friends) so components stay unchanged.
//
// Reads still go straight to the RPC via lib/contracts.js. Writes go
// through the kit client, which routes to the active signer.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AsentumProvider, ConnectModal, useWallet as useKitWallet, useAsentum } from '@asentum/connect';

const RPC_URL = process.env.NEXT_PUBLIC_ASENTUM_RPC || 'https://testnet.asentum.com';
const WALLET_BOT_API = process.env.NEXT_PUBLIC_WALLET_BOT_URL || 'https://wallet.asentum.com';
const DAPP_NAME = 'Asentum Social';
const TELEGRAM_BOT = 'AsentumBot';

// The kit persists { address, method, sessionId } under this key.
const KIT_STORAGE_KEY = 'asentum:connect:address';
// The previous in-app wallet persisted { address, method, botSessionId } here.
const LEGACY_STORAGE_KEY = 'asentum-social.wallet.v1';

// Carry a session saved by the old in-app wallet over to the kit's key so
// people paired through Telegram do not have to pair again. Runs once,
// before the kit rehydrates.
function migrateLegacySession() {
  if (typeof window === 'undefined') return;
  try {
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return;
    if (!window.localStorage.getItem(KIT_STORAGE_KEY)) {
      const s = JSON.parse(legacy);
      if (s && s.address && s.method) {
        window.localStorage.setItem(
          KIT_STORAGE_KEY,
          JSON.stringify({ address: s.address, method: s.method, sessionId: s.botSessionId || undefined }),
        );
      }
    }
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore, the user simply reconnects
  }
}

function readSavedMethod() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KIT_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.method ? s.method : null;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }) {
  useState(() => { migrateLegacySession(); return true; });
  return (
    <AsentumProvider rpc={RPC_URL} botApi={WALLET_BOT_API} telegramBot={TELEGRAM_BOT} dappName={DAPP_NAME}>
      {children}
      <ConnectModal />
    </AsentumProvider>
  );
}

export function useWallet() {
  const kit = useKitWallet();
  const client = useAsentum();
  const [hydrated, setHydrated] = useState(false);
  const [method, setMethod] = useState(null); // 'extension' | 'bot' | null

  // The kit restores a saved session in an effect after mount; flag the
  // first client render so the header can avoid flashing the wrong button.
  useEffect(() => { setHydrated(true); }, []);

  // The kit records which signer paired; the app only needs it for copy
  // (where to approve a transaction).
  useEffect(() => {
    setMethod(kit.address ? readSavedMethod() : null);
  }, [kit.address]);

  const address = kit.address ? kit.address.toLowerCase() : null;
  const isConnected = !!address;

  const callContract = useCallback(
    async ({ to, method: mname, args = [], value = '0' }) => {
      if (!isConnected) throw new Error('not connected');
      const txHash = await client.call(to, mname, args, String(value));
      return { txHash };
    },
    [client, isConnected],
  );

  const deployContract = useCallback(
    async ({ source }) => {
      if (!isConnected) throw new Error('not connected');
      return client.deploy(source);
    },
    [client, isConnected],
  );

  return useMemo(
    () => ({
      address,
      isConnected,
      method,
      hydrated,
      connecting: kit.connecting,
      error: kit.error,
      openModal: kit.openConnect,
      connect: kit.openConnect,
      disconnect: kit.disconnect,
      callContract,
      deployContract,
    }),
    [address, isConnected, method, hydrated, kit.connecting, kit.error, kit.openConnect, kit.disconnect, callContract, deployContract],
  );
}
