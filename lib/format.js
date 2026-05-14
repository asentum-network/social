// Tiny formatting helpers shared across components.
//   — milkie

export function fmtCount(n) {
  if (n == null || isNaN(n)) return '0';
  const v = Number(n);
  if (v >= 1000) {
    return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K';
  }
  return String(v);
}

// Time-ago string for a unix-second timestamp.
export function timeAgo(unixSeconds) {
  if (!unixSeconds) return '';
  const seconds = Number(unixSeconds);
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

// Compact 0x-address: 0xabcd…1234.
export function shortAddr(addr) {
  if (!addr) return '';
  const a = addr.toLowerCase();
  if (!a.startsWith('0x') || a.length < 12) return a;
  return a.slice(0, 6) + '…' + a.slice(-4);
}
