// Image in a post. Renders the real Cloudinary URL when present.
// Falls back to a tinted placeholder block (used by the composer
// preview before upload completes, and as a safe default when the
// chain entry has no imageUrl).
//   — milkie

export default function PostImage({ url, tone = 200, label, height = 240, alt = '' }) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        style={{
          width: '100%',
          maxHeight: 420,
          borderRadius: 18,
          objectFit: 'cover',
          boxShadow: 'inset 0 0 0 1px rgba(20,22,30,0.04)',
          display: 'block',
        }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 18,
        background: `oklch(93% 0.06 ${tone})`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(20,22,30,0.04)',
      }}
    >
      {/* Faint diagonal stripe texture, no gradients. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(135deg, oklch(88% 0.07 ${tone}) 0 1px, transparent 1px 14px)`,
          opacity: 0.55,
        }}
      />
      {label && (
        <div
          style={{
            position: 'absolute',
            left: 14,
            bottom: 12,
            padding: '4px 9px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.78)',
            color: `oklch(35% 0.1 ${tone})`,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: 11,
            letterSpacing: 0.3,
            backdropFilter: 'blur(4px)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
