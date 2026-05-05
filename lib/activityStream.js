// Singleton bridge from the indexer's WebSocket to React components.
//
// One open WS per tab. The catch-up `hello` frame fires once on connect;
// every new on-chain activity fires as an `activity` event. Components
// subscribe via `subscribe('activity', fn)` — they don't each open
// their own socket.

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
