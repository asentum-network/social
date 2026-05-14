// Renders the current action-toast at the bottom of the chrome.
// Position is determined by the parent — pass `bottom` in pixels.
//   — milkie

import { useActionToast } from '../lib/actionToast';

export default function ActionToastView({ bottom = 110 }) {
  const { text } = useActionToast();
  const open = !!text;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom,
        zIndex: 60,
        transform: `translate(-50%, ${open ? 0 : 20}px)`,
        opacity: open ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 220ms ease, transform 220ms ease',
        background: 'var(--text-1)',
        color: '#fff',
        padding: '9px 16px',
        borderRadius: 999,
        fontSize: 13.5,
        fontWeight: 500,
        boxShadow: '0 6px 18px rgba(20,22,30,0.22)',
      }}
    >
      {text || ''}
    </div>
  );
}
