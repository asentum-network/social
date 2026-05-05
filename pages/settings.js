import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import AvatarUpload from '../components/AvatarUpload';
import { useWallet } from '../lib/wallet';
import { CONTRACTS, getProfile, shortAddr } from '../lib/contracts';
import { waitForReceipt } from '../lib/tx';

const NAME_MAX = 50;
const BIO_MAX = 280;
const AVATAR_MAX = 500;

export default function Settings() {
  const { isConnected, address, openModal, callContract } = useWallet();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | signing | confirming | saved | error
  const [error, setError] = useState(null);
  const [savedTxHash, setSavedTxHash] = useState(null);

  useEffect(() => {
    if (!isConnected || !address) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const p = await getProfile(address);
        if (cancelled) return;
        if (p) {
          setName(p.name || '');
          setBio(p.bio || '');
          setAvatar(p.avatar || '');
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isConnected, address]);

  async function handleSave() {
    if (!isConnected) { openModal(); return; }
    setError(null);
    setPhase('signing');
    try {
      const res = await callContract({
        to: CONTRACTS.profile,
        method: 'setProfile',
        args: [name, bio, avatar],
      });
      setPhase('confirming');
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('tx reverted on-chain');
      setSavedTxHash(res.txHash);
      setPhase('saved');
      setTimeout(() => setPhase('idle'), 2500);
    } catch (err) {
      setError(err.message || String(err));
      setPhase('error');
    }
  }

  const nameOver = name.length > NAME_MAX;
  const bioOver = bio.length > BIO_MAX;
  const avatarOver = avatar.length > AVATAR_MAX;
  const disabled = !isConnected || nameOver || bioOver || avatarOver || phase === 'signing' || phase === 'confirming';

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-sans text-3xl font-bold mb-1">Settings</h1>
        <p className="font-mono text-[12px] uppercase tracking-wider text-ink-3 mb-8">
          Edit your on-chain profile
        </p>

        {!isConnected ? (
          <DisconnectedNotice openModal={openModal} />
        ) : !loaded ? (
          <div className="border border-line bg-bg-1 p-8 animate-pulse">
            <div className="h-3 w-32 bg-bg-3 mb-4" />
            <div className="h-10 w-full bg-bg-3 mb-4" />
            <div className="h-3 w-32 bg-bg-3 mb-4" />
            <div className="h-20 w-full bg-bg-3" />
          </div>
        ) : (
          <div className="border border-line bg-bg-1 p-6 space-y-6">
            <div className="font-mono text-[11px] text-ink-3 break-all">
              connected: <span className="text-accent">{shortAddr(address)}</span>
              <span className="ml-2 text-ink-3">{address}</span>
            </div>

            <Field
              label="Display name"
              hint={`${name.length} / ${NAME_MAX}`}
              error={nameOver}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="alice"
                maxLength={NAME_MAX + 50}
                className="w-full bg-bg-2 border border-line text-ink-0 px-3 py-2 font-sans text-[15px] focus:outline-none focus:border-accent"
              />
            </Field>

            <Field
              label="Bio"
              hint={`${bio.length} / ${BIO_MAX}`}
              error={bioOver}
            >
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short description of you, on-chain."
                rows={3}
                maxLength={BIO_MAX + 50}
                className="w-full bg-bg-2 border border-line text-ink-0 px-3 py-2 font-sans text-[15px] focus:outline-none focus:border-accent resize-none"
              />
            </Field>

            <Field
              label="Avatar"
              hint={avatar ? `${avatar.length} chars stored on-chain` : 'no avatar set'}
              error={avatarOver}
            >
              <AvatarUpload
                address={address}
                kind="avatar"
                initialUrl={avatar}
                onUploaded={(url) => setAvatar(url)}
                size="md"
                shape="circle"
              />
            </Field>

            {error && (
              <div className="border border-red-800 bg-red-900/20 text-red-300 p-3 font-mono text-[11px]">
                {error}
              </div>
            )}

            {phase === 'saved' && savedTxHash && (
              <div className="border border-accent bg-accent-dark/40 text-accent-bright p-3 font-mono text-[11px]">
                ✓ Saved on-chain.{' '}
                <a
                  href={`https://testnet.asentum.com/tx/${savedTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-accent"
                >
                  view tx ↗
                </a>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={disabled}
                className={`font-mono text-[11px] uppercase tracking-wider px-5 py-2 transition-colors ${
                  disabled
                    ? 'bg-bg-3 text-ink-3 cursor-not-allowed'
                    : 'bg-accent text-bg-0 hover:bg-accent-bright font-bold'
                }`}
              >
                {phase === 'signing' && 'Approve in wallet…'}
                {phase === 'confirming' && 'Confirming…'}
                {phase === 'saved' && 'Saved'}
                {(phase === 'idle' || phase === 'error') && 'Save profile'}
              </button>
              {address && (
                <Link
                  href={`/u/${address}`}
                  className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-accent"
                >
                  view profile →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="font-mono text-[11px] uppercase tracking-wider text-ink-2">{label}</label>
        <span className={`font-mono text-[11px] ${error ? 'text-red-400' : 'text-ink-3'}`}>{hint}</span>
      </div>
      {children}
    </div>
  );
}

function DisconnectedNotice({ openModal }) {
  return (
    <div className="border border-line bg-bg-1 p-8 text-center">
      <p className="font-sans text-lg text-ink-1 mb-3">Connect to edit your profile</p>
      <button
        onClick={openModal}
        className="font-mono text-[11px] uppercase tracking-wider bg-accent text-bg-0 hover:bg-accent-bright px-5 py-2 font-bold"
      >
        Connect
      </button>
    </div>
  );
}
