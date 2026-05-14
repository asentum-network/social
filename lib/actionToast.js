// Simple action-toast context. Used for transient confirmations like
// "Posted", "Disconnected", "Following Maya". Unrelated to the live
// activity stream — that's its own thing (ToastLanes).
//   — milkie

import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ActionToastContext = createContext(null);

export function ActionToastProvider({ children }) {
  const [text, setText] = useState(null);
  const timer = useRef(null);

  const show = useCallback((msg, durationMs = 1800) => {
    if (timer.current) clearTimeout(timer.current);
    setText(msg);
    timer.current = setTimeout(() => setText(null), durationMs);
  }, []);

  return (
    <ActionToastContext.Provider value={{ text, show }}>
      {children}
    </ActionToastContext.Provider>
  );
}

export function useActionToast() {
  return useContext(ActionToastContext) || { text: null, show: () => {} };
}
