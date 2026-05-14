// connect modal — pick extension or 6-digit-code (bot) wallet path.
// keeps the connect-flow plumbing in here; the wallet context just
// gets a callback when it's done.
//   — milkie

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useWallet, createBotSession, getBotSessionStatus } from '../lib/wallet';

export default function ConnectModal() {
  const { modalOpen, closeModal, onConnected } = useWallet();
  const [view, setView] = useState('pick'); // 'pick' | 'extension' | 'code' | 'success'
  const [error, setError] = useState(null);
  const [code, setCode] = useState('------');
  const [ttl, setTtl] = useState('');
  const [successAddr, setSuccessAddr] = useState(null);
  const pollRef = useRef(null);
  const ttlRef = useRef(null);

  // Reset state every time the modal opens.
  useEffect(() => {
    if (modalOpen) {
      setView('pick');
      setError(null);
      setCode('------');
      setTtl('');
    } else {
      stopTimers();
    }
    return stopTimers;
  }, [modalOpen]);

  function stopTimers() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (ttlRef.current) { clearInterval(ttlRef.current); ttlRef.current = null; }
  }

  // Escape-to-close
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, closeModal]);

  if (!modalOpen) return null;

  // ─── extension flow ──────────────────────────────────────────────────────
  async function startExtension() {
    setView('extension');
    setError(null);
    try {
      const provider = await waitForProvider(3000);
      const res = await provider.connect();
      onConnected({ address: res.address, method: 'extension' });
      setSuccessAddr(res.address);
      setView('success');
    } catch (err) {
      setError(err?.message || String(err));
    }
  }

  // ─── code flow ───────────────────────────────────────────────────────────
  async function startCode() {
    setView('code');
    setError(null);
    setCode('------');
    try {
      const data = await createBotSession({ dappName: 'Asentum Social' });
      setCode(data.code);
      const expires = new Date(data.expiresAt).getTime();

      // TTL countdown
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

      // Poll for approval
      pollRef.current = setInterval(async () => {
        try {
          const s = await getBotSessionStatus(data.sessionId);
          if (s.status === 'connected') {
            stopTimers();
            onConnected({ address: s.address, method: 'bot', botSessionId: data.sessionId });
            setSuccessAddr(s.address);
            setView('success');
          } else if (s.status === 'rejected') {
            stopTimers();
            setError('Connection rejected from the bot.');
          } else if (s.status === 'expired') {
            stopTimers();
            setError('Session expired.');
          }
        } catch {
          // transient
        }
      }, 2000);
    } catch (err) {
      setError(`Could not reach wallet bot: ${err.message || err}`);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="w-full max-w-lg bg-bg-1 border border-line shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-mono text-[12px] uppercase tracking-wider text-ink-1">
            {view === 'pick' && 'Connect wallet'}
            {view === 'extension' && 'Browser extension'}
            {view === 'code' && '6-digit code'}
            {view === 'success' && 'Connected'}
          </h2>
          <button onClick={closeModal} className="text-ink-3 hover:text-ink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {view === 'pick' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card icon="🧠" title="Extension" desc="Install the Asentum browser extension to sign locally." onClick={startExtension} />
              <Card icon="📱" title="6-digit code" desc="Connect via @AsentumBot on Telegram. No extension needed." onClick={startCode} />
            </div>
          )}

          {view === 'extension' && (
            <div className="space-y-4">
              <p className="font-mono text-sm text-ink-2">
                Approve the connection in the Asentum extension popup.
              </p>
              {error && <ErrBox text={error} />}
              <BackBtn onClick={() => setView('pick')} />
            </div>
          )}

          {view === 'code' && (
            <div className="space-y-4">
              <p className="font-mono text-[12px] text-ink-2">
                Open <strong className="text-ink-0">@AsentumBot</strong> on Telegram and tap <strong className="text-ink-0">/connect</strong>, then enter:
              </p>
              <div className="flex flex-col items-center py-4">
                <div className="font-mono text-4xl font-bold tracking-[0.25em] text-accent bg-bg-2 border border-line px-6 py-4 inline-block">
                  {code}
                </div>
                <div className="font-mono text-[11px] text-ink-3 mt-2">
                  expires in <span className="text-ink-1">{ttl || '--:--'}</span>
                </div>
              </div>
              {error && <ErrBox text={error} />}
              <BackBtn onClick={() => { stopTimers(); setView('pick'); }} />
            </div>
          )}

          {view === 'success' && (
            <div className="space-y-4">
              <p className="font-mono text-sm text-ink-1">Connected to:</p>
              <div className="font-mono text-[12px] text-accent break-all bg-bg-2 border border-line p-3">
                {successAddr}
              </div>
              <button
                onClick={closeModal}
                className="w-full bg-accent text-bg-0 font-mono text-[11px] uppercase tracking-wider font-bold py-2.5 hover:bg-accent-bright transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-bg-2 border border-line hover:border-ink-3 hover:bg-bg-3 p-5 text-left transition-colors flex flex-col gap-3 w-full"
    >
      <div className="w-10 h-10 bg-bg-3 border border-line flex items-center justify-center text-xl">
        {icon}
      </div>
      <div>
        <h3 className="font-sans text-sm font-bold text-ink-0 mb-1">{title}</h3>
        <p className="font-mono text-[11px] text-ink-2 leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}

function ErrBox({ text }) {
  return (
    <div className="font-mono text-[11px] bg-red-900/30 border border-red-800 text-red-300 p-3">
      {text}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink-0"
    >
      ← Back
    </button>
  );
}

function waitForProvider(timeout = 3000) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.asentum) return resolve(window.asentum);
    const start = Date.now();
    const iv = setInterval(() => {
      if (window.asentum) {
        clearInterval(iv);
        resolve(window.asentum);
      } else if (Date.now() - start > timeout) {
        clearInterval(iv);
        reject(new Error('Asentum extension not detected. Install it from the asentum.com downloads page.'));
      }
    }, 50);
  });
}
