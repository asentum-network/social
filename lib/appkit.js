// Reown AppKit init — handles MetaMask + WalletConnect + Coinbase + mobile.
// Mirrors the asentum.com presale-widget config so the visual + UX is
// consistent across both apps. Same projectId; same dark theme.
//
// Important: AppKit must be initialized exactly once on the client.
// `initAppKit()` is idempotent and called from _app.js.

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet } from '@reown/appkit/networks';

let initialized = false;

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'c979efd3dfde8a921dd072943567edc1';

const metadata = {
  name: 'Asentum Social',
  description: 'On-chain social network on AsentumChain',
  url: 'https://social.asentum.com',
  icons: ['https://social.asentum.com/icon.png'],
};

// AsentumChain testnet definition for AppKit. Chain id 1337, native token ASE.
const asentumTestnet = {
  id: 1337,
  name: 'Asentum Testnet',
  nativeCurrency: { name: 'ASE', symbol: 'ASE', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ASENTUM_RPC || 'https://testnet.asentum.com'] },
  },
  blockExplorers: {
    default: { name: 'Asentum Explorer', url: 'https://testnet.asentum.com' },
  },
  testnet: true,
};

export function initAppKit() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  createAppKit({
    adapters: [new EthersAdapter()],
    networks: [asentumTestnet, mainnet],
    defaultNetwork: asentumTestnet,
    metadata,
    projectId,
    features: {
      analytics: false,
      email: false,
      socials: [],
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#26CC6B',
      '--w3m-color-mix': '#26CC6B',
      '--w3m-color-mix-strength': 12,
    },
  });
}
