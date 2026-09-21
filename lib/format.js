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
// Accepts seconds or milliseconds: the node stamps blocks in ms, contracts
// store seconds, and a ms value read as seconds made every post show "now".
export function toUnixSeconds(ts) {
  const n = Number(ts);
  if (!n || Number.isNaN(n)) return 0;
  return n > 1e11 ? Math.floor(n / 1000) : Math.floor(n);
}

export function timeAgo(unixSeconds) {
  const seconds = toUnixSeconds(unixSeconds);
  if (!seconds) return '';
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

// Asentum accounts are 20 bytes. Contracts and URLs keep the 0x hex form;
// people see the ase1 form (bech32, hrp "ase"), the same as the wallet,
// explorer and airdrop dashboard show. Encoder matches the chain's.
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const HEX40 = /^0x[0-9a-fA-F]{40}$/;

function bech32Polymod(values) {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= BECH32_GEN[i];
  }
  return chk;
}

function bech32Checksum(hrp, data) {
  const expanded = [];
  for (let i = 0; i < hrp.length; i++) expanded.push(hrp.charCodeAt(i) >> 5);
  expanded.push(0);
  for (let i = 0; i < hrp.length; i++) expanded.push(hrp.charCodeAt(i) & 31);
  const mod = bech32Polymod(expanded.concat(data).concat([0, 0, 0, 0, 0, 0])) ^ 1;
  const out = [];
  for (let i = 0; i < 6; i++) out.push((mod >> (5 * (5 - i))) & 31);
  return out;
}

// Encode a 20-byte 0x address as ase1. Anything else is returned as is.
export function toAse1(addr) {
  if (!addr || !HEX40.test(addr)) return addr || '';
  const bytes = addr.slice(2).match(/../g).map((b) => parseInt(b, 16));
  const data = [];
  let acc = 0;
  let bits = 0;
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      data.push((acc >> bits) & 31);
    }
  }
  if (bits > 0) data.push((acc << (5 - bits)) & 31);
  let out = 'ase1';
  for (const d of data.concat(bech32Checksum('ase', data))) out += BECH32_CHARSET.charAt(d);
  return out;
}

// Compact address for display: ase1qpzry9…abcd (0x input is converted).
export function shortAddr(addr) {
  if (!addr) return '';
  const a = toAse1(String(addr).toLowerCase());
  if (a.length < 16) return a;
  return a.slice(0, 10) + '…' + a.slice(-4);
}
