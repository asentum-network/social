import { useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import '../styles/globals.css';
import { WalletProvider } from '../lib/wallet';
import { startActivityStream } from '../lib/activityStream';

// Browser-only components — load with ssr:false to avoid SSR-time globals.
const ConnectModal = dynamic(() => import('../components/ConnectModal'), { ssr: false });
const ToastLanes = dynamic(() => import('../components/ToastLanes'), { ssr: false });

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Open the singleton WS to the indexer for live toasts + activity feed.
    // Idempotent: safe to call on every route change.
    startActivityStream();
  }, []);

  return (
    <>
      <Head>
        <title>Asentum Social — On-chain</title>
        <meta name="description" content="A social network on AsentumChain. Profiles, posts, follows — all on-chain." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <WalletProvider>
        <Component {...pageProps} />
        <ConnectModal />
        <ToastLanes />
      </WalletProvider>
    </>
  );
}
