# asentum-social

A mini-Twitter built entirely on AsentumChain. Profiles, posts, follows, galleries, Reddit-style votes — every action is an on-chain Dilithium3-signed tx.

**Live:** [social.asentum.com](https://social.asentum.com)

This is one of the reference dApps for AsentumChain. I built it to prove that JS-native smart contracts on a post-quantum L1 can power real consumer applications, not just defi primitives. The case study writeup is at [asentum.com/case-studies/social-network](https://asentum.com/case-studies/social-network).

## what's in here

| | |
|---|---|
| **5 contracts** | Profile, Posts, Follow, Gallery, Votes — modular, no cross-contract calls |
| **Indexer** | Tails the chain, materialises events to SQLite, broadcasts via WebSocket |
| **Frontend** | Next.js + Pages Router, mobile-first, native Asentum wallet (extension or Telegram bot) |

The contracts and indexer live in the [AsentumChain monorepo](https://github.com/asentum-network/chain) under `packages/social-contracts` and `packages/social-indexer`. This repo is just the frontend.

## contract addresses (testnet)

```
AsentumProfile          ase1wzpl065lyld6h8kthew7jc3mudgu5wtgfdwawd
AsentumPosts            ase160qf2uyeaw4exdl9krxe5upah535mxksdcvw7p
AsentumFollow           ase1mzcyhrckdx3xz8ede73yklkx2tx4l5alvzvgw3
AsentumGallery          ase18phq0ez264q9796zq87zkre9l76w5tl9e4cgse
AsentumVotes            ase1htys39ghn5lsgqesn627jw09v68zx6nfdpesfn
AsentumComments         ase1rrs27lyrgwrj9rrdfkvwrstpxyt6dz8fuxnc95
AsentumPremiumLifetime  ase1nnljsc7x7c3n882fprhxn65kazme0q943ewcfv
```

Look any of them up at `https://explorer.asentum.com/address/<ase1 address>`. The canonical list is `CONTRACTS` in `lib/contracts.js`.

## local dev

```bash
git clone https://github.com/asentum-network/social
cd social
cp .env.local.example .env.local
# edit .env.local — point INDEXER_URL/WS at a running indexer (or leave
# at localhost:3001 if you're running one locally)
npm install
npm run dev
```

The frontend reads chain state via the public testnet RPC at `https://testnet.asentum.com`. To submit transactions you need the [Asentum browser extension](https://asentum.com/downloads) or [@AsentumBot](https://t.me/AsentumBot) on Telegram. There's no Ethereum wallet path — Dilithium3 is a different signature scheme entirely, MetaMask et al can't help here.

## things worth knowing before you fork it

- **Three modular contracts (well, five now), zero cross-contract calls.** Profile knows nothing about Posts. Posts knows nothing about Follow. Frontend stitches the reads. Each contract is small enough to audit in one sitting and replaceable independently.
- **Image storage is off-chain (Cloudinary).** AsentumChain's storage is just key-value strings; raw image bytes on-chain would bloat state by ~67 KB per 50 KB image (base64 expansion), times every node forever. Images go to Cloudinary; the URL is what's stored in `Profile.avatar`, `Posts.imageUrl`, `Gallery.imageUrl`. **Known limitation** — the case study covers the IPFS-vs-centralised tradeoff in detail.
- **Wallet connect is not Ethereum.** Two flows: native Asentum extension (`window.asentum.callContract(...)`) or a 6-digit-code session against the Telegram wallet bot. No AppKit, RainbowKit, or wagmi anywhere.

— Milkie

## license

Apache-2.0
