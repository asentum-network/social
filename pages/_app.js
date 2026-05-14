import Head from 'next/head';
import '../styles/globals.css';
import { WalletProvider } from '../lib/wallet';
import { ActionToastProvider } from '../lib/actionToast';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>asentum</title>
        <meta name="description" content="A social network on AsentumChain. Profiles, posts, follows — all on-chain." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#fcfbf9" />
      </Head>
      <WalletProvider>
        <ActionToastProvider>
          <Component {...pageProps} />
        </ActionToastProvider>
      </WalletProvider>
    </>
  );
}
