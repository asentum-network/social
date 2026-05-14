// small round avatar. real image when set, otherwise a colour swatch
// hashed off the address. naming is non-unique on this network so the
// fallback has to key off address — two "alice"s with different
// wallets need to look different.
//   — milkie

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
