// Inline SVG icon set. Stroke-based, current-colour. Match the mock
// design exactly — no external icon library needed.
//   — milkie

function Stroke({ children, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const IconHome = ({ filled, size }) => (
  <Stroke size={size}>
    <path d="M3.5 11L12 4l8.5 7" />
    <path d="M5.5 10v9a1 1 0 001 1h11a1 1 0 001-1v-9" fill={filled ? 'currentColor' : 'none'} />
  </Stroke>
);

export const IconUser = ({ filled, size }) => (
  <Stroke size={size}>
    <circle cx="12" cy="8.5" r="3.8" fill={filled ? 'currentColor' : 'none'} />
    <path d="M4.5 20c1.4-3.8 4.4-5.8 7.5-5.8s6.1 2 7.5 5.8" fill={filled ? 'currentColor' : 'none'} />
  </Stroke>
);

export const IconHeart = ({ filled, size = 19 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
  </svg>
);

export const IconComment = ({ size = 19 }) => (
  <Stroke size={size}>
    <path d="M21 12a8 8 0 01-11.8 7L4 20l1-4.7A8 8 0 1121 12z" />
  </Stroke>
);

export const IconShare = ({ size = 19 }) => (
  <Stroke size={size}>
    <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
    <path d="M12 3v13" />
    <path d="M7.5 7.5L12 3l4.5 4.5" />
  </Stroke>
);

export const IconPlus = ({ size = 26 }) => (
  <Stroke size={size}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);

export const IconWallet = ({ size = 16 }) => (
  <Stroke size={size}>
    <path d="M3.5 7.5A2.5 2.5 0 016 5h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2.5 2.5 0 01-2.5-2.5v-9z" />
    <circle cx="16.5" cy="12.5" r="1.1" fill="currentColor" />
  </Stroke>
);

export const IconBack = ({ size = 22 }) => (
  <Stroke size={size}><path d="M15 5l-7 7 7 7" /></Stroke>
);

export const IconImage = ({ size = 20 }) => (
  <Stroke size={size}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.4" />
    <path d="M4 17l4.5-4.5 3 3 3.5-3.5L20 17" />
  </Stroke>
);

export const IconClose = ({ size = 22 }) => (
  <Stroke size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Stroke>
);

export const IconCheck = ({ size = 16 }) => (
  <Stroke size={size}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Stroke>
);

export const IconExternal = ({ size = 14 }) => (
  <Stroke size={size}>
    <path d="M14 5h5v5" />
    <path d="M19 5l-9 9" />
    <path d="M19 14v4a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h4" />
  </Stroke>
);
