// Post composer. Mobile = slide-up sheet. Desktop = centered modal.
// Wires the new mockup design to the real Cloudinary upload endpoint
// (/api/upload) and the AsentumPosts contract's post(content, imageUrl).
//   — milkie

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import PostImage from './PostImage';
import { IconImage } from './Icons';
import { useWallet } from '../lib/wallet';
import { useActionToast } from '../lib/actionToast';
import { CONTRACTS } from '../lib/contracts';
import { waitForReceipt } from '../lib/tx';

const MAX_LEN = 280;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function Composer({ open, onClose, layout = 'mobile' }) {
  const { isConnected, address, openModal, callContract } = useWallet();
  const { show: showToast } = useActionToast();

  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | signing | confirming | error
  const [error, setError] = useState(null);
  const taRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setText('');
      setImageUrl('');
      setError(null);
      setPhase('idle');
      setTimeout(() => taRef.current && taRef.current.focus(), 280);
    }
  }, [open]);

  const remaining = MAX_LEN - text.length;
  const overLimit = remaining < 0;
  const empty = text.trim().length === 0 && !imageUrl;
  const busy = uploading || phase === 'signing' || phase === 'confirming';
  const canPost = isConnected && !empty && !overLimit && !busy;
  const me = address ? { address } : null;

  async function pickFile(file) {
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
        body: JSON.stringify({ dataUri, kind: 'post', address }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setImageUrl(json.url);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!isConnected) { openModal(); return; }
    if (!canPost) return;
    setError(null);
    setPhase('signing');
    try {
      const res = await callContract({
        to: CONTRACTS.posts,
        method: 'post',
        args: [text.trim(), imageUrl],
      });
      setPhase('confirming');
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('tx reverted on-chain');
      setPhase('idle');
      onClose();
      showToast('Posted');
    } catch (err) {
      setError(err.message || String(err));
      setPhase('error');
    }
  }

  const isDesktop = layout === 'desktop';

  const sheetStyle = isDesktop
    ? {
        position: 'fixed',
        left: '50%',
        top: '50%',
        zIndex: 50,
        transform: open ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -46%) scale(0.96)',
        width: 520,
        maxWidth: 'calc(100% - 64px)',
        background: 'var(--surface)',
        borderRadius: 24,
        boxShadow: '0 24px 80px rgba(20,22,30,0.24), 0 2px 10px rgba(20,22,30,0.08)',
        padding: '14px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
      }
    : {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: 'var(--surface)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        boxShadow: '0 -12px 40px rgba(20,22,30,0.18)',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        padding: '10px 18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      };

  const phaseLabel = {
    idle: isConnected ? 'Post' : 'Connect',
    signing: 'Sign…',
    confirming: 'Confirming',
    error: 'Retry',
  }[phase];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(20, 22, 30, 0.32)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 240ms ease',
        }}
      />

      <div style={sheetStyle}>
        {!isDesktop && (
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 4,
              background: 'var(--border-strong)',
              alignSelf: 'center',
            }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-2)',
              fontSize: 15,
              fontWeight: 500,
              padding: '6px 4px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>New post</div>
          <button
            onClick={submit}
            disabled={!canPost}
            style={{
              border: 'none',
              cursor: canPost ? 'pointer' : 'default',
              background: canPost ? 'var(--accent)' : 'var(--border)',
              color: canPost ? '#fff' : 'var(--text-3)',
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 999,
              transition: 'background 160ms ease',
              fontFamily: 'inherit',
            }}
          >
            {phaseLabel}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Avatar user={me} size={40} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              placeholder="What's on your mind?"
              style={{
                width: '100%',
                minHeight: 92,
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: 17,
                lineHeight: 1.45,
                color: 'var(--text-1)',
              }}
            />
            {imageUrl && (
              <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
                <PostImage url={imageUrl} height={180} />
                <button
                  onClick={() => setImageUrl('')}
                  aria-label="Remove image"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'rgba(20,22,30,0.65)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED.join(',')}
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
                e.target.value = '';
              }}
            />
            <ToolButton
              onClick={() => fileRef.current?.click()}
              disabled={!!imageUrl || uploading}
              label="Add photo"
            >
              <IconImage />
            </ToolButton>
            {uploading && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
                uploading…
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {error && (
              <span style={{ fontSize: 12, color: '#d04040', maxWidth: 200, textAlign: 'right' }}>
                {error}
              </span>
            )}
            <div
              style={{
                fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
                color: remaining < 40 ? (remaining < 0 ? '#d04040' : '#b8853a') : 'var(--text-3)',
              }}
            >
              {remaining}
            </div>
          </div>
        </div>

        {!isConnected && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              textAlign: 'center',
              marginTop: -6,
            }}
          >
            Connect a wallet to post.{' '}
            <button
              onClick={openModal}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--accent)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                padding: 0,
              }}
            >
              Connect
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function ToolButton({ children, onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: disabled ? 'var(--text-3)' : 'var(--accent)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
