// wallet context.
//
// no AppKit, no wagmi, no ethers. AsentumChain signs Dilithium3 so the
// EVM wallet stack does nothing for us. two paths instead:
//   - the asentum extension (window.asentum)
//   - the telegram bot, paired via a 6-digit code at wallet.asentum.com
//
// rest of the app just calls callContract / deployContract. routing to
// extension vs bot happens in here.
//   — milkie

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const WalletContext = createContext(null);

const WALLET_BOT_API = process.env.NEXT_PUBLIC_WALLET_BOT_URL || 'https://wallet.asentum.com';
const STORAGE_KEY = 'asentum-social.wallet.v1';

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [method, setMethod] = useState(null); // 'extension' | 'bot'
  const [botSessionId, setBotSessionId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore previous session on mount (only the bot session is restorable;
  // extension reconnect happens via window.asentum on click).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.address && saved.method) {
          setAddress(saved.address);
          setMethod(saved.method);
          if (saved.method === 'bot' && saved.botSessionId) {
            setBotSessionId(saved.botSessionId);
          }
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist any change to the connection.
  useEffect(() => {
    if (!hydrated) return;
    if (!address) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ address, method, botSessionId }));
  }, [hydrated, address, method, botSessionId]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const onConnected = useCallback(({ address: a, method: m, botSessionId: sid }) => {
    setAddress(a.toLowerCase());
    setMethod(m);
    setBotSessionId(m === 'bot' ? sid : null);
    setModalOpen(false);
  }, []);

  const disconnect = useCallback(async () => {
    if (typeof window !== 'undefined' && window.asentum && method === 'extension' && window.asentum.disconnect) {
      try { await window.asentum.disconnect(); } catch {}
    }
    setAddress(null);
    setMethod(null);
    setBotSessionId(null);
  }, [method]);

  // Unified sign APIs. Each routes to the active backend.

  const callContract = useCallback(
    async ({ to, method: mname, args = [], value = '0', gasLimit }) => {
      if (!address) throw new Error('not connected');
      if (method === 'extension') {
        if (typeof window === 'undefined' || !window.asentum) {
          throw new Error('extension provider missing');
        }
        return window.asentum.callContract({
          to,
          method: mname,
          args,
          value: String(value),
          gasLimit: gasLimit ? String(gasLimit) : undefined,
        });
      }
      if (method === 'bot') {
        return botSignRequest(botSessionId, {
          type: 'contract_call',
          to,
          method: mname,
          args,
          value: String(value),
          gasLimit: gasLimit ? String(gasLimit) : undefined,
        });
      }
      throw new Error('unknown wallet method: ' + method);
    },
    [address, method, botSessionId],
  );

  const deployContract = useCallback(
    async ({ source }) => {
      if (!address) throw new Error('not connected');
      if (method === 'extension') {
        return window.asentum.deployContract({ source });
      }
      if (method === 'bot') {
        return botSignRequest(botSessionId, { type: 'contract_deploy', source });
      }
      throw new Error('unknown wallet method: ' + method);
    },
    [address, method, botSessionId],
  );

  const value = useMemo(
    () => ({
      address,
      isConnected: !!address,
      method,
      botSessionId,
      modalOpen,
      hydrated,
      openModal,
      closeModal,
      onConnected,
      disconnect,
      callContract,
      deployContract,
    }),
    [address, method, botSessionId, modalOpen, hydrated, openModal, closeModal, onConnected, disconnect, callContract, deployContract],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet() must be used inside <WalletProvider>');
  return ctx;
}

// ─── Bot session helpers ──────────────────────────────────────────────────

export async function createBotSession({ dappName }) {
  const r = await fetch(`${WALLET_BOT_API}/api/sessions/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      dappOrigin: typeof window !== 'undefined' ? location.origin : '',
      dappName: dappName || 'Asentum Social',
    }),
  });
  if (!r.ok) throw new Error(`bot session create failed: HTTP ${r.status}`);
  return r.json(); // { sessionId, code, expiresAt }
}

export async function getBotSessionStatus(sessionId) {
  const r = await fetch(`${WALLET_BOT_API}/api/sessions/${sessionId}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json(); // { status, address?, ... }
}

/**
 * Submit a sign request to the bot for an active session, then poll for
 * approval/rejection. Resolves with the signed result; rejects on
 * rejection / expiry.
 */
export async function botSignRequest(sessionId, payload) {
  if (!sessionId) throw new Error('no active bot session — reconnect via the wallet modal');

  const createRes = await fetch(`${WALLET_BOT_API}/api/sessions/${sessionId}/sign-request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!createRes.ok) {
    throw new Error(`bot sign-request failed: HTTP ${createRes.status} ${await createRes.text()}`);
  }
  const { requestId } = await createRes.json();

  return new Promise((resolve, reject) => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${WALLET_BOT_API}/api/sessions/${sessionId}/sign-requests/${requestId}`);
        if (!r.ok) return; // transient
        const s = await r.json();
        if (s.status === 'approved') {
          clearInterval(iv);
          resolve({ txHash: s.txHash, contractAddress: s.contractAddress });
        } else if (s.status === 'rejected') {
          clearInterval(iv);
          reject(new Error(s.error || 'request rejected in bot'));
        } else if (s.status === 'expired') {
          clearInterval(iv);
          reject(new Error('request expired (5 min). Approve faster next time.'));
        }
      } catch {
        // transient — keep polling
      }
    }, 2000);
  });
}
