// Small round avatar — uses the user's uploaded image when present,
// falls back to a deterministic colour swatch derived from the *address*
// (not name) so two wallets with the same display name stay distinct.

export default function MiniAvatar({ src, name, address, size = 36 }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className="rounded-full border border-line bg-bg-2 object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const seed = (address || name || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const initial = (name?.[0] || seed[2] || '?').toUpperCase();
  return (
    <div
      className="rounded-full border border-line flex items-center justify-center font-mono font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `hsl(${hue}, 60%, 18%)`,
        color: `hsl(${hue}, 70%, 70%)`,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initial}
    </div>
  );
}
