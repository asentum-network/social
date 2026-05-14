import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProfilePage from '../../components/ProfilePage';
import { useWallet } from '../../lib/wallet';
import { shortAddr } from '../../lib/format';

export default function ProfileRoute() {
  const router = useRouter();
  const { address: meAddr } = useWallet();

  // Resolve `me` to the connected wallet's address.
  const raw = router.query.addr;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  const resolved = slug === 'me' ? (meAddr || '').toLowerCase() : (slug || '').toLowerCase();

  return (
    <>
      <Head>
        <title>{resolved ? `${shortAddr(resolved)} · asentum` : 'asentum'}</title>
      </Head>
      <Layout title="Profile" onBack={() => router.push('/')}>
        {resolved && <ProfilePage address={resolved} />}
      </Layout>
    </>
  );
}
