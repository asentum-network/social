// singleton WS bridge to react land.
//
// one socket per tab. components subscribe via subscribe('activity', fn)
// rather than each opening their own — saves the indexer from drowning
// in connections when the user has half a dozen tabs open.
//   — milkie

import { openActivityStream } from './indexer';

const emitter = typeof window === 'undefined' ? null : new EventTarget();
let closeFn = null;
let started = false;

export function startActivityStream() {
  if (typeof window === 'undefined' || started) return;
  started = true;
  closeFn = openActivityStream({
    onHello: (recent) => emitter.dispatchEvent(new CustomEvent('hello', { detail: recent })),
    onActivity: (a) => emitter.dispatchEvent(new CustomEvent('activity', { detail: a })),
    onError: (err) => console.warn('[activityStream]', err?.message || err),
  });
}

export function stopActivityStream() {
  if (closeFn) { closeFn(); closeFn = null; }
  started = false;
}

/**
 * Subscribe to either 'hello' (one-shot historical batch on connect)
 * or 'activity' (live, one per on-chain event). Returns an unsubscribe.
 */
export function subscribe(eventName, handler) {
  if (!emitter) return () => {};
  const wrapped = (e) => handler(e.detail);
  emitter.addEventListener(eventName, wrapped);
  return () => emitter.removeEventListener(eventName, wrapped);
}
