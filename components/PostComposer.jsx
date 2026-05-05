import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { useWallet } from '../lib/wallet';
import { CONTRACTS } from '../lib/contracts';
import { waitForReceipt } from '../lib/tx';

const MAX_LEN = 280;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function PostComposer({ onPosted }) {
  const { isConnected, address, openModal, callContract } = useWallet();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | signing | confirming | error
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const len = content.length;
  const overLimit = len > MAX_LEN;
  const empty = content.trim().length === 0 && !imageUrl;
  const disabled = !isConnected || empty || overLimit || uploading || phase === 'signing' || phase === 'confirming';

  async function pickFile(file) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) { setError('jpg / png / webp / gif only'); return; }
    if (file.size > MAX_BYTES) { setError(`max 5 MB`); return; }
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

  async function handleSubmit() {
    if (!isConnected) { openModal(); return; }
    if (empty || overLimit) return;
    setError(null);
    setPhase('signing');
    try {
      const res = await callContract({
        to: CONTRACTS.posts,
        method: 'post',
        args: [content, imageUrl],
      });
      setPhase('confirming');
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('tx reverted on-chain');
      setContent('');
      setImageUrl('');
      setPhase('idle');
      onPosted?.({ txHash: res.txHash, receipt });
    } catch (err) {
      setError(err.message || String(err));
      setPhase('error');
    }
  }

  const phaseLabel = {
    idle: isConnected ? 'Post' : 'Connect to post',
    signing: 'Approve in wallet…',
    confirming: 'Confirming…',
    error: 'Try again',
  }[phase];

  // Auto-infer the placeholder + post type message
  const isImageOnlyMode = imageUrl && !content.trim();
  const placeholder = isImageOnlyMode
    ? 'Add a caption (optional)…'
    : isConnected
      ? "What's happening on-chain?"
      : 'Connect a wallet to post.';

  return (
    <div className="border border-line bg-bg-1 p-5 rounded-xl">
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); if (phase === 'error') setPhase('idle'); }}
        placeholder={placeholder}
        className="w-full bg-bg-2 border border-line text-ink-0 p-3 font-sans text-[15px] placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none rounded-lg"
        rows={3}
        maxLength={MAX_LEN + 100}
        disabled={!isConnected || phase === 'signing' || phase === 'confirming'}
      />

      {imageUrl && (
        <div className="relative mt-3 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="attached"
            className="max-h-64 rounded-lg border border-line bg-bg-2 object-cover"
          />
          <button
            onClick={() => setImageUrl('')}
            className="absolute top-2 right-2 bg-black/70 hover:bg-black text-ink-0 rounded-full w-7 h-7 flex items-center justify-center"
            aria-label="remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 font-mono text-[11px] text-red-400 break-words">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={(e) => pickFile(e.target.files?.[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !isConnected || phase === 'signing' || phase === 'confirming'}
            className="text-ink-2 hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="add image"
            title="add image"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            ) : (
              <ImagePlus className="w-5 h-5" />
            )}
          </button>
          <span className={`font-mono text-[11px] ${overLimit ? 'text-red-400' : 'text-ink-3'}`}>
            {len} / {MAX_LEN}
            {imageUrl && <span className="ml-2 text-accent">+ image</span>}
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className={`font-mono text-[11px] uppercase tracking-wider px-5 py-2 rounded-lg transition-colors ${
            disabled
              ? 'bg-bg-3 text-ink-3 cursor-not-allowed'
              : 'bg-accent text-bg-0 hover:bg-accent-bright font-bold'
          }`}
        >
          {phaseLabel}
        </button>
      </div>
    </div>
  );
}
