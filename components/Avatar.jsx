// Avatar tile. If a real `avatarUrl` is provided it renders as a circular
// image. Otherwise falls back to a tinted initials block derived from the
// address / name via lib/avatar.
//   — milkie

import { avatarFor } from '../lib/avatar';

export default function Avatar({ user, size = 40 }) {
  const url = user?.avatarUrl;
  if (url) {
    return (
      <img
        src={url}
        alt={user.name || 'avatar'}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          flexShrink: 0,
          objectFit: 'cover',
          boxShadow: 'inset 0 0 0 1px rgba(20,22,30,0.04)',
        }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  const { tone, label } = avatarFor({
    name: user?.name,
    address: user?.address || user?.id,
  });
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        background: `oklch(94% 0.05 ${tone})`,
        color: `oklch(38% 0.12 ${tone})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size * 0.36,
        letterSpacing: 0.2,
        boxShadow: 'inset 0 0 0 1px rgba(20,22,30,0.04)',
      }}
    >
      {label}
    </div>
  );
}
