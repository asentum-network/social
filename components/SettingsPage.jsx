// Settings page in the redesign's light-theme language.
// Loads existing profile via getProfile, lets the connected wallet
// set name + bio + avatar via setProfile. Avatar upload routes
// through the existing /api/upload Cloudinary endpoint.
//   — milkie

import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { IconImage, IconCheck } from './Icons';
import { useWallet } from '../lib/wallet';
import { useActionToast } from '../lib/actionToast';
import { CONTRACTS, getProfile } from '../lib/contracts';
import { waitForReceipt } from '../lib/tx';
import { shortAddr } from '../lib/format';

const NAME_MAX = 50;
const BIO_MAX = 280;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function SettingsPage() {
  const { address, isConnected, openModal, callContract } = useWallet();
  const { show: showToast } = useActionToast();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | signing | confirming | saved | error
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

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
          setAvatarUrl(p.avatarUrl || '');
        }
      } catch (err) {
        if (!cancelled) console.warn('[settings] profile load failed:', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isConnected, address]);

  async function pickAvatar(file) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) { setError('jpg / png / webp / gif only'); return; }
    if (file.size > MAX_BYTES) { setError('max 5 MB'); return; }
    setUploading(true);
    try {
      const dataUri = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error('file read failed'));
        fr.readAsDataURL(file);
      });
      const r = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataUri, kind: 'avatar', address }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setAvatarUrl(json.url);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!isConnected) { openModal(); return; }
    setError(null);
    setPhase('signing');
    try {
      const res = await callContract({
        to: CONTRACTS.profile,
        method: 'setProfile',
        args: [name.slice(0, NAME_MAX), bio.slice(0, BIO_MAX), avatarUrl],
      });
      setPhase('confirming');
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('tx reverted on-chain');
      setPhase('saved');
      showToast('Profile saved');
      setTimeout(() => setPhase('idle'), 2000);
    } catch (err) {
      setError(err.message || String(err));
      setPhase('error');
    }
  }

  const me = { address, name, avatarUrl };
  const busy = phase === 'signing' || phase === 'confirming' || uploading;
  const phaseLabel = {
    idle: isConnected ? 'Save profile' : 'Connect wallet',
    signing: 'Sign in wallet…',
    confirming: 'Confirming…',
    saved: 'Saved ✓',
    error: 'Try again',
  }[phase];

  return (
    <div style={{ padding: '20px 14px 140px', maxWidth: 560, margin: '0 auto' }}>
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: -0.4,
          color: 'var(--text-1)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Settings
      </h1>
      <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--text-2)' }}>
        Set how you appear across asentum. Stored on-chain in the Profile contract.
      </p>

      {/* Premium link */}
      <a
        href="/premium"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(61,169,252,0.10), rgba(61,169,252,0.04))',
          border: '1px solid rgba(61,169,252,0.35)',
          borderRadius: 14,
          color: 'var(--text-1)',
          textDecoration: 'none',
          marginBottom: 18,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path d="M11 1.5l2.6 1.4 2.94-.5.5 2.94L19.44 8 18 10.5l1.44 2.5-2.4 1.66-.5 2.94-2.94-.5L11 18.5l-2.6-1.4-2.94.5-.5-2.94L2.56 13 4 10.5 2.56 8 4.96 6.34l.5-2.94 2.94.5L11 1.5z" fill="#3da9fc" stroke="#3da9fc"/>
          <path d="M7.4 11.4l2.5 2.5 5-5.4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Get Premium</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>3 ASE / week — blue check on every post + comment.</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>→</div>
      </a>

      {!isConnected ? (
        <div
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            borderRadius: 22,
            padding: 22,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 14 }}>
            Connect a wallet to edit your profile.
          </div>
          <button
            onClick={openModal}
            style={{
              border: 'none',
              background: 'var(--text-1)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              padding: '10px 22px',
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Connect wallet
          </button>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            borderRadius: 22,
            padding: '22px 22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* avatar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Avatar user={me} size={72} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED.join(',')}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickAvatar(f);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  padding: '8px 14px',
                  borderRadius: 999,
                  cursor: uploading ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  alignSelf: 'flex-start',
                }}
              >
                <IconImage size={16} />
                {uploading ? 'Uploading…' : avatarUrl ? 'Change avatar' : 'Upload avatar'}
              </button>
              {avatarUrl && (
                <button
                  onClick={() => setAvatarUrl('')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-3)',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 0,
                    alignSelf: 'flex-start',
                    fontFamily: 'inherit',
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* name */}
          <Field label="Name" hint={`${name.length}/${NAME_MAX}`}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              placeholder="What should people call you?"
              style={inputStyle}
            />
          </Field>

          {/* bio */}
          <Field label="Bio" hint={`${bio.length}/${BIO_MAX}`}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              placeholder="A line or two about you."
              rows={3}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.4 }}
            />
          </Field>

          {/* address read-only */}
          <Field label="Address">
            <code
              style={{
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontSize: 13,
                color: 'var(--text-2)',
                wordBreak: 'break-all',
                background: 'var(--surface-2)',
                borderRadius: 10,
                padding: '8px 12px',
                display: 'block',
              }}
            >
              {address}
            </code>
          </Field>

          {error && (
            <div
              style={{
                background: 'oklch(96% 0.04 25)',
                border: '1px solid oklch(86% 0.08 25)',
                color: 'oklch(38% 0.12 25)',
                fontSize: 13,
                padding: '10px 14px',
                borderRadius: 12,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={save}
            disabled={busy}
            style={{
              border: 'none',
              cursor: busy ? 'wait' : 'pointer',
              background: phase === 'saved' ? 'oklch(70% 0.16 145)' : 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 22px',
              borderRadius: 999,
              transition: 'background 160ms ease',
              fontFamily: 'inherit',
              opacity: busy ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
            }}
          >
            {phase === 'saved' && <IconCheck size={16} />}
            {phaseLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{label}</span>
        {hint && (
          <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '11px 14px',
  fontSize: 15,
  color: 'var(--text-1)',
  background: 'var(--surface)',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 160ms ease',
};
