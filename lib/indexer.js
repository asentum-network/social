// Client for the social-indexer service.
//
// HTTP: GET /activities?beforeId=&limit= for paginated reads
// WebSocket: ws[s]://<host>/ for live activity stream
//
// On-connect, the server pushes a `hello` frame with up to 10 most-recent
// activities so we can render historical toasts immediately. After that,
// every new activity arrives as an `activity` frame.

const HTTP_BASE = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:3001';
const WS_URL = process.env.NEXT_PUBLIC_INDEXER_WS
  || HTTP_BASE.replace(/^http/, 'ws').replace(/\/+$/, '');

export async function fetchActivities({ beforeId, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (beforeId) params.set('beforeId', String(beforeId));
  params.set('limit', String(limit));
  const r = await fetch(`${HTTP_BASE}/activities?${params}`);
  if (!r.ok) throw new Error(`/activities → ${r.status}`);
  return r.json();
}

export async function fetchActivity(id) {
  const r = await fetch(`${HTTP_BASE}/activity/${id}`);
  if (!r.ok) {
    if (r.status === 404) return null;
    throw new Error(`/activity/${id} → ${r.status}`);
  }
  return r.json();
}

/**
 * Open a long-lived WebSocket to the indexer. `onActivity` fires for every
 * live activity. `onHello(recent)` fires once on connect with the catch-up
 * batch. Returns a `close()` function.
 *
 * Auto-reconnects with exponential backoff capped at 30s. The browser
 * tab going to sleep can drop the socket — handle visibility changes
 * upstream if you want eager reconnect.
 */
export function openActivityStream({ onHello, onActivity, onError }) {
  let closed = false;
  let ws = null;
  let backoff = 1000;
  let reconnectTimer = null;

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(WS_URL);
    } catch (err) {
      scheduleReconnect();
      return;
    }
    ws.addEventListener('open', () => { backoff = 1000; });
    ws.addEventListener('message', (ev) => {
      try {
        const frame = JSON.parse(ev.data);
        if (frame.type === 'hello' && Array.isArray(frame.recent)) {
          onHello?.(frame.recent);
        } else if (frame.type === 'activity' && frame.activity) {
          onActivity?.(frame.activity);
        }
      } catch (err) {
        onError?.(err);
      }
    });
    ws.addEventListener('close', scheduleReconnect);
    ws.addEventListener('error', () => onError?.(new Error('ws error')));
  };

  const scheduleReconnect = () => {
    if (closed) return;
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      backoff = Math.min(backoff * 2, 30_000);
      connect();
    }, backoff);
  };

  connect();
  return () => {
    closed = true;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) { try { ws.close(); } catch {} }
  };
}
