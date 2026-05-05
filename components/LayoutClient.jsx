import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../lib/wallet';
import { shortAddr } from '../lib/contracts';

export default function LayoutClient({ children }) {
  const router = useRouter();
  const { address, isConnected, openModal, disconnect, hydrated } = useWallet();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/activity', label: 'Activity' },
  ];
  if (isConnected && address) {
    navItems.push({ href: `/u/${address}`, label: 'Profile' });
    navItems.push({ href: '/settings', label: 'Settings' });
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-0">
      <header className="border-b border-line">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-mono text-lg font-bold text-accent tracking-wider">
            asentum.social
          </Link>
          <nav className="flex items-center gap-6">
            {navItems.map((it) => {
              const active = router.pathname === it.href || router.asPath === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`font-mono text-[12px] tracking-wider uppercase ${
                    active ? 'text-ink-0' : 'text-ink-2 hover:text-ink-0'
                  }`}
                >
                  {it.label}
                </Link>
              );
            })}
            {/* Avoid hydration flash on connect button — placeholder shape
                until localStorage has been read. */}
            {!hydrated ? (
              <div className="w-[110px] h-[30px]" />
            ) : isConnected && address ? (
              <button
                onClick={disconnect}
                className="font-mono text-[11px] tracking-wider uppercase text-ink-3 hover:text-accent border border-line hover:border-accent px-3 py-1.5 transition-colors"
              >
                {shortAddr(address)} ✕
              </button>
            ) : (
              <button
                onClick={openModal}
                className="font-mono text-[11px] tracking-wider uppercase bg-accent text-bg-0 hover:bg-accent-bright px-4 py-1.5 font-bold transition-colors"
              >
                Connect
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line mt-12 py-6">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-3">
          <span>Built on AsentumChain</span>
          <span>
            <a href="https://testnet.asentum.com" className="hover:text-accent">explorer ↗</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
