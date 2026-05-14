// Avatar derivation. Maps an Ethereum-style address (or a fallback name)
// to a deterministic { tone, label } pair so every user gets a stable,
// soft-coloured initials tile when they don't have a real avatarUrl set.
//   — milkie

const TONES = [25, 60, 110, 145, 195, 270, 280, 320];

// Hash a string to a non-negative integer (FNV-1a-ish).
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

// Derive the two-letter label.
//   • If a name is set, use the first two initials.
//   • Otherwise, fall back to chars 2..3 of the address (after '0x').
export function avatarLabel({ name, address }) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }
  if (address && address.length >= 4) {
    return address.slice(2, 4).toUpperCase();
  }
  return '??';
}

// Derive a stable OKLCH hue (0–359) from the address (or name as fallback).
export function avatarTone({ name, address }) {
  const key = (address || name || '').toLowerCase();
  return TONES[hashStr(key) % TONES.length];
}

// One-shot helper combining the two.
export function avatarFor({ name, address }) {
  return {
    label: avatarLabel({ name, address }),
    tone: avatarTone({ name, address }),
  };
}
