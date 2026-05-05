// One toast. Self-dismissing on a timer, hover-pausable, manual-close
// via X button. Accepts a render function so each lane can decorate
// the activity differently.

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function Toast({ children, durationMs = 2000, onClose }) {
  const [closing, setClosing] = useState(false);
  const remaining = useRef(durationMs);
  const startedAt = useRef(Date.now());
  const timer = useRef(null);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose?.(), 180); // matches the fade-out CSS
  };

  const startTimer = () => {
    startedAt.current = Date.now();
    timer.current = setTimeout(close, remaining.current);
  };

  const pauseTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      const elapsed = Date.now() - startedAt.current;
      remaining.current = Math.max(0, remaining.current - elapsed);
    }
  };

  useEffect(() => {
    startTimer();
    return () => pauseTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`bg-bg-1 border border-line shadow-lg pointer-events-auto transition-all duration-150 ${
        closing ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
      }`}
      onMouseEnter={pauseTimer}
      onMouseLeave={() => { remaining.current = Math.max(remaining.current, 600); startTimer(); }}
    >
      <div className="flex items-start gap-2 p-3 pr-2">
        <div className="flex-1 min-w-0">{children}</div>
        <button
          onClick={close}
          className="text-ink-3 hover:text-ink-0 mt-0.5"
          aria-label="dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
