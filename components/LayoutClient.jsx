// Mobile-first shell. On phones the header carries just the logo +
// connect button; primary navigation lives in a bottom tab bar so the
// app feels native. On desktop the bottom bar disappears and the nav
// items merge into the top bar.

import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Activity as ActivityIcon, User, Settings as SettingsIcon } from 'lucide-react';
import { useWallet } from '../lib/wallet';
import { shortAddr } from '../lib/contracts';

export default function LayoutClient({ children }) {
  const router = useRouter();
  const { address, isConnected, openModal, disconnect, hydrated } = useWallet();

  const tabs = [
    { href: '/',          label: 'Home',     icon: Home,         requireAuth: false },
    { href: '/activity',  label: 'Activity', icon: ActivityIcon, requireAuth: false },
    { href: address ? `/u/${address}` : null, label: 'Profile', icon: User, requireAuth: true,
      match: (path) => path.startsWith('/u/') },
    { href: '/settings',  label: 'Settings', icon: SettingsIcon, requireAuth: true },
  ];
  const visible = tabs.filter((t) => !t.requireAuth || (isConnected && address));

  function tabActive(t) {
    const path = router.asPath.split('?')[0];
    if (t.match) return t.match(path);
    return path === t.href || (t.href !== '/' && path.startsWith(t.href));
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-0 pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-bg-0/80 border-b border-line">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="font-mono text-[15px] font-bold text-accent tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse" />
            asentum.social
          </Link>

          {/* Desktop nav, hidden on mobile (bottom bar instead). */}
          <nav className="hidden md:flex items-center gap-5">
            {visible.map((t) => {
              const active = tabActive(t);
              if (!t.href) return null;
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  className={`font-mono text-caption uppercase ${
                    active ? 'text-ink-0' : 'text-ink-3 hover:text-ink-0'
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          {/* Connect / address pill */}
          {!hydrated ? (
            <div className="w-[120px] h-9" />
          ) : isConnected && address ? (
            <button
              onClick={disconnect}
              className="font-mono text-micro uppercase text-ink-2 hover:text-accent border border-line hover:border-accent px-3 py-1.5 rounded-pill transition-colors"
            >
              {shortAddr(address)}
            </button>
          ) : (
            <button
              onClick={openModal}
              className="font-mono text-micro uppercase bg-ink-0 text-bg-0 hover:bg-accent px-4 py-2 rounded-pill font-bold transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="hidden md:block border-t border-line mt-12 py-6">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between font-mono text-micro uppercase text-ink-3">
          <span>Built on AsentumChain</span>
          <a href="https://testnet.asentum.com" className="hover:text-accent">explorer ↗</a>
        </div>
      </footer>

      {/* Bottom tab bar — phone only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-1/95 backdrop-blur-md border-t border-line">
        <div className="grid grid-cols-4 max-w-md mx-auto">
          {visible.slice(0, 4).map((t) => {
            const active = tabActive(t);
            const Icon = t.icon;
            const onClick = !t.href && t.requireAuth ? openModal : undefined;
            const inner = (
              <div className={`flex flex-col items-center justify-center gap-1 py-2.5 ${
                active ? 'text-accent' : 'text-ink-3'
              }`}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className="font-mono text-[9px] uppercase tracking-wider">{t.label}</span>
              </div>
            );
            return t.href ? (
              <Link key={t.label} href={t.href}>{inner}</Link>
            ) : (
              <button key={t.label} onClick={onClick}>{inner}</button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
