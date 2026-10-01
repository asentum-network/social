import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProfilePage from '../../components/ProfilePage';
import { useWallet } from '../../lib/wallet';
import { profileHref, resolveAddrSlug, shortAddr } from '../../lib/format';

export default function ProfileRoute() {
  const router = useRouter();
  const { address: meAddr } = useWallet();

  // Profile URLs are ase1. `me` resolves to the connected wallet; the page
  // decodes the ase1 slug to the internal hex the contracts use. An old 0x
  // link is redirected to its ase1 URL so the hex form never stays visible.
  const raw = router.query.addr;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  const parsed = slug === 'me' ? { hex: (meAddr || '').toLowerCase() } : resolveAddrSlug(slug);
  const resolved = parsed.hex || '';

  useEffect(() => {
    if (parsed.legacyHex && parsed.hex) router.replace(profileHref(parsed.hex));
  }, [parsed.legacyHex, parsed.hex, router]);

  return (
    <>
      <Head>
        <title>{resolved ? `${shortAddr(resolved)} · asentum` : 'asentum'}</title>
      </Head>
      <Layout title="Profile" onBack={() => router.push('/')}>
        {resolved && !parsed.legacyHex && <ProfilePage address={resolved} />}
        {parsed.invalid && router.isReady && (
          <div style={{ padding: 24, fontSize: 14, color: 'var(--text-2)' }}>
            That is not a valid address. Profile links use an ase1 address.
          </div>
        )}
      </Layout>
    </>
  );
}
