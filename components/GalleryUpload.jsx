// gallery uploader: pick → cloudinary upload → optional caption →
// addImage(url, caption) tx on the Gallery contract. fires onUploaded
// once the receipt is in so the parent can refresh.
//   — milkie

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useWallet } from '../lib/wallet';
import { CONTRACTS } from '../lib/contracts';
import { waitForReceipt } from '../lib/tx';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_CAPTION = 280;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function GalleryUpload({ onUploaded }) {
  const { isConnected, address, openModal, callContract } = useWallet();
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | uploading | signing | confirming | error
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function pickFile(file) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) { setError('jpg / png / webp / gif only'); return; }
    if (file.size > MAX_BYTES) { setError(`max 5 MB`); return; }
    setPhase('uploading');
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
        body: JSON.stringify({ dataUri, kind: 'gallery', address }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setImageUrl(json.url);
      setPhase('idle');
    } catch (err) {
      setError(err.message || String(err));
      setPhase('error');
    }
  }

  async function handleAdd() {
    if (!isConnected) { openModal(); return; }
    if (!imageUrl) { setError('pick an image first'); return; }
    setError(null);
    setPhase('signing');
    try {
      const res = await callContract({
        to: CONTRACTS.gallery,
        method: 'addImage',
        args: [imageUrl, caption],
      });
      setPhase('confirming');
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('tx reverted on-chain');
      setImageUrl('');
      setCaption('');
      setPhase('idle');
      onUploaded?.();
    } catch (err) {
      setError(err.message || String(err));
      setPhase('error');
    }
  }

  function clearImage() {
    setImageUrl('');
    setCaption('');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="border border-line bg-bg-1 p-5 rounded-xl">
      <h3 className="font-mono text-[12px] uppercase tracking-wider text-ink-2 mb-3">
        Upload to your gallery
      </h3>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED.join(',')}
        onChange={(e) => pickFile(e.target.files?.[0])}
        className="hidden"
      />

      {!imageUrl ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f); }}
          disabled={phase === 'uploading'}
          className="w-full bg-bg-2 border border-dashed border-line hover:border-accent rounded-lg py-10 flex flex-col items-center justify-center gap-2 text-ink-2 hover:text-accent transition-colors"
        >
          {phase === 'uploading' ? (
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          ) : (
            <ImagePlus className="w-6 h-6" />
          )}
          <span className="font-mono text-[11px] uppercase tracking-wider">
            {phase === 'uploading' ? 'uploading…' : 'drop or click to choose'}
          </span>
          <span className="font-mono text-[10px] text-ink-3">jpg / png / webp / gif · max 5 MB</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="preview"
              className="max-h-72 rounded-lg border border-line bg-bg-2 object-cover"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-ink-0 rounded-full w-7 h-7 flex items-center justify-center"
              aria-label="discard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            maxLength={MAX_CAPTION + 50}
            className="w-full bg-bg-2 border border-line text-ink-0 px-3 py-2 font-sans text-[14px] focus:outline-none focus:border-accent rounded-lg"
            disabled={phase === 'signing' || phase === 'confirming'}
          />
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[11px] ${caption.length > MAX_CAPTION ? 'text-red-400' : 'text-ink-3'}`}>
              {caption.length} / {MAX_CAPTION}
            </span>
            <button
              onClick={handleAdd}
              disabled={phase === 'signing' || phase === 'confirming' || caption.length > MAX_CAPTION}
              className="bg-accent text-bg-0 hover:bg-accent-bright disabled:opacity-50 disabled:cursor-not-allowed font-mono text-[11px] uppercase tracking-wider font-bold px-5 py-2 rounded-lg transition-colors"
            >
              {phase === 'signing'    && 'Approve in wallet…'}
              {phase === 'confirming' && 'Confirming…'}
              {(phase === 'idle' || phase === 'error') && 'Add to gallery'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 font-mono text-[11px] text-red-400 break-words">{error}</div>
      )}
    </div>
  );
}
