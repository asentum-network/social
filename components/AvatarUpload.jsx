// Drag-drop image picker that uploads to /api/upload and reports back
// the resulting Cloudinary URL via onUploaded(url).
//
// Used for profile avatars and (later) gallery + post images. Same
// component serves all three by passing a different `kind` prop.

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB cap
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function AvatarUpload({
  address,
  kind = 'avatar',
  initialUrl = '',
  onUploaded,
  size = 'md', // 'sm' | 'md' | 'lg'
  shape = 'circle', // 'circle' | 'square'
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const px = size === 'sm' ? 56 : size === 'lg' ? 144 : 96;
  const radius = shape === 'circle' ? '9999px' : '12px';

  async function handleFile(file) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError('jpg / png / webp / gif only');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`max 5 MB (got ${Math.round(file.size / 1024)} KB over)`);
      return;
    }
    setBusy(true);
    try {
      const dataUri = await fileToDataUri(file);
      const r = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataUri, kind, address }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setUrl(json.url);
      onUploaded?.(json.url, json);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setUrl('');
    onUploaded?.('', null);
  }

  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className="relative bg-bg-2 border border-line hover:border-accent transition-colors overflow-hidden flex items-center justify-center"
        style={{ width: px, height: px, borderRadius: radius }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-6 h-6 text-ink-3" />
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="font-mono text-[11px] uppercase tracking-wider border border-line hover:border-accent text-ink-1 hover:text-accent px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {busy ? 'uploading…' : url ? 'replace' : 'upload'}
          </button>
          {url && !busy && (
            <button
              type="button"
              onClick={clear}
              className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-red-400 px-2 py-1.5 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> remove
            </button>
          )}
        </div>
        <p className="font-mono text-[10px] text-ink-3 mt-2 leading-relaxed">
          drop an image here or click to choose. jpg / png / webp / gif, max 5 MB.
          uploaded to cloudinary; the URL is stored on-chain.
        </p>
        {error && (
          <p className="font-mono text-[11px] text-red-400 mt-2 break-words">{error}</p>
        )}
      </div>
    </div>
  );
}

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('file read failed'));
    fr.readAsDataURL(file);
  });
}
