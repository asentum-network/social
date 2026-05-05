# Asentum Social

A mini-Twitter built entirely on AsentumChain — profiles, posts, follows, galleries, votes — every action is an on-chain Dilithium3-signed transaction.

**Live at:** [social.asentum.com](https://social.asentum.com)

This is one of the reference dApps for AsentumChain. It exists to prove that JavaScript-native smart contracts on a post-quantum L1 can power real, interactive consumer applications — not just defi primitives.

## What's here

| | |
|---|---|
| **5 contracts** | Profile, Posts, Follow, Gallery, Votes — modular, no cross-contract calls |
| **Indexer service** | Tails the chain, materialises events to SQLite, broadcasts via WebSocket |
| **Frontend** | Next.js + Pages Router, mobile-first, native Asentum wallet (extension or Telegram bot) |

The contracts and indexer live in the [AsentumChain monorepo](https://github.com/asentum-network/chain) under `packages/social-contracts` and `packages/social-indexer`. This repo is just the frontend.

## Contract addresses (testnet)

```
AsentumProfile  0xf286cad273e10b7af591e34b348c6213c92ade55
AsentumPosts    0x4541f76e1290911e5ef478f6b02e50765cdfbd5a
AsentumFollow   0x2a47f568c53941d370f6d8581232c9c0b342e09c
AsentumGallery  0x345cc47958d1f8d323f8751ffe7292023f9d0cac
AsentumVotes    0x5bf5af00a0cb2386f558ced2626e47e776e6e03a
```

## Local development

```bash
git clone https://github.com/asentum-network/social
cd social
cp .env.local.example .env.local
# Edit .env.local — point INDEXER_URL/WS at a running indexer (or
# leave at localhost:3001 if you're running one locally)
npm install
npm run dev
```

The frontend reads the chain via the public testnet RPC at `https://testnet.asentum.com`. To submit transactions you'll need to connect a wallet — either install the [Asentum browser extension](https://asentum.com) or connect via [@AsentumBot on Telegram](https://t.me/AsentumBot) using a 6-digit code.

## Design choices worth flagging

- **Three modular contracts, zero cross-contract calls.** Profile knows nothing about Posts, Posts knows nothing about Follow. The frontend stitches the three reads together. Each contract is small enough to audit in one sitting and replaceable independently.
- **Image storage is off-chain (Cloudinary).** AsentumChain's storage is just key-value strings; raw image bytes on-chain would bloat state by ~67KB per 50KB image (base64 expansion). Images go to Cloudinary; the resulting URL is what's stored in `Profile.avatar`, `Posts.imageUrl`, and `Gallery.imageUrl`. **We consider this a known limitation** — see the case study at [asentum.com/case-studies/social](https://asentum.com/case-studies/social) for the full IPFS-vs-centralised tradeoff discussion.
- **Wallet connect is not Ethereum.** AsentumChain uses Dilithium3 (FIPS 204 ML-DSA-65) — Ethereum-style wallets won't work. We support two flows: the native Asentum browser extension (`window.asentum`) and a 6-digit-code session against the Telegram wallet bot. Neither involves AppKit / WalletConnect / RainbowKit.

## License

Apache-2.0
