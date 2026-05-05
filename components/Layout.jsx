// Layout wrapper. The actual layout uses AppKit hooks (useAppKitAccount,
// useDisconnect, etc.) which require AppKit to be initialized — that only
// happens on the client. So we dynamic-import the real layout with
// ssr:false to keep static pre-rendering happy.

import dynamic from 'next/dynamic';

const LayoutClient = dynamic(() => import('./LayoutClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-bg-0 flex items-center justify-center">
      <div className="font-mono text-[11px] tracking-wider uppercase text-ink-3">
        loading…
      </div>
    </div>
  ),
});

export default function Layout({ children }) {
  return <LayoutClient>{children}</LayoutClient>;
}
