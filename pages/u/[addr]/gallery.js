import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../../components/Layout';
import { IconImage, IconPlus } from '../../../components/Icons';
import { useWallet } from '../../../lib/wallet';
import { useActionToast } from '../../../lib/actionToast';
import {
  CONTRACTS,
  getImage,
  getProfile,
  getUserGallery,
} from '../../../lib/contracts';
import { waitForReceipt } from '../../../lib/tx';
import { shortAddr } from '../../../lib/format';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;
const CAPTION_MAX = 280;

export default function GalleryPage() {
  const router = useRouter();
  const addrParam = typeof router.query.addr === 'string' ? router.query.addr.toLowerCase() : '';
  const { address: me, isConnected, openModal, callContract } = useWallet();
  const { show: showToast } = useActionToast();
  const isOwn = isConnected && me && me.toLowerCase() === addrParam;

  const [profile, setProfile] = useState(null);
  const [images, setImages] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stagedUrl, setStagedUrl] = useState('');
  const [caption, setCaption] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!addrParam) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, ids] = await Promise.all([
          getProfile(addrParam).catch(() => null),
          getUserGallery(addrParam).catch(() => []),
        ]);
        if (cancelled) return;
        setProfile(p);
        const newest = (Array.isArray(ids) ? ids : []).slice().reverse();
        const fetched = await Promise.all(newest.map((id) => getImage(String(id)).catch(() => null)));
        if (!cancelled) setImages(fetched.filter(Boolean));
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [addrParam, refreshKey]);

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
        body: JSON.stringify({ dataUri, kind: 'gallery', address: me }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setStagedUrl(json.url);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!isConnected) { openModal(); return; }
    if (!stagedUrl || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await callContract({
        to: CONTRACTS.gallery,
        method: 'addImage',
        args: [stagedUrl, caption.trim()],
      });
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('tx reverted on-chain');
      setStagedUrl('');
      setCaption('');
      setRefreshKey((k) => k + 1);
      showToast('Added to gallery');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = profile?.name?.trim() || shortAddr(addrParam);

  return (
    <>
      <Head>
        <title>{displayName}'s gallery · asentum</title>
      </Head>
      <Layout title="Gallery" onBack={() => router.push(`/u/${addrParam}`)}>
        <div style={{ padding: '20px 14px 140px', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: -0.4,
                color: 'var(--text-1)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {displayName}'s gallery
            </h1>
            <a
              href={`/u/${addrParam}`}
              style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}
            >
              View profile →
            </a>
          </div>

          {isOwn && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 22,
                padding: 16,
                marginBottom: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
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
              {!stagedUrl ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    border: '2px dashed var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '24px 16px',
                    borderRadius: 18,
                    cursor: uploading ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <IconImage size={20} />
                  {uploading ? 'Uploading…' : 'Add an image to your gallery'}
                </button>
              ) : (
                <>
                  <img
                    src={stagedUrl}
                    alt="staged"
                    style={{ width: '100%', maxHeight: 340, objectFit: 'cover', borderRadius: 16 }}
                  />
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
                    placeholder="Caption (optional)"
                    rows={2}
                    style={{
                      width: '100%',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontSize: 14,
                      color: 'var(--text-1)',
                      background: 'var(--surface)',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.4,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setStagedUrl(''); setCaption(''); }}
                      disabled={submitting}
                      style={pillSecondary}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submit}
                      disabled={submitting}
                      style={{ ...pillPrimary, opacity: submitting ? 0.7 : 1 }}
                    >
                      {submitting ? 'Adding…' : 'Add to gallery'}
                    </button>
                  </div>
                </>
              )}
              {error && (
                <div style={{ fontSize: 13, color: '#d04040' }}>{error}</div>
              )}
            </div>
          )}

          {images === null && !error && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              Loading…
            </div>
          )}

          {images && images.length === 0 && !error && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              {isOwn ? 'Your gallery is empty. Upload one above.' : 'Nothing here yet.'}
            </div>
          )}

          {images && images.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {images.map((img) => (
                <GalleryTile key={img.id} image={img} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

function GalleryTile({ image }) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <img
        src={image.imageUrl}
        alt={image.caption || ''}
        style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      {image.caption && (
        <div style={{ padding: '8px 12px', fontSize: 12.5, color: 'var(--text-2)' }}>
          {image.caption}
        </div>
      )}
    </div>
  );
}

const pillPrimary = {
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 600,
  padding: '8px 16px',
  borderRadius: 999,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const pillSecondary = {
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-2)',
  fontSize: 13.5,
  fontWeight: 500,
  padding: '8px 16px',
  borderRadius: 999,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
