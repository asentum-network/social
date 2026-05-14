// Responsive layout hook. Returns 'mobile' or 'desktop' based on viewport.
// Accepts an override for forcing one layout (e.g. preview canvas).
//   — milkie

import { useEffect, useState } from 'react';

export function useLayout(override) {
  const [auto, setAuto] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e) => setAuto(e.matches ? 'mobile' : 'desktop');
    if (mq.addEventListener) mq.addEventListener('change', handle);
    else mq.addListener(handle);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handle);
      else mq.removeListener(handle);
    };
  }, []);

  return override || auto;
}
