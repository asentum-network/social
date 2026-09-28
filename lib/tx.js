// tx receipt poller. polls eth_getTransactionReceipt until the tx
// lands so the calling component can refresh data or drop the spinner.
//   — milkie

import { RPC_URL } from './contracts';

// 3 minutes: when blocks are slow a tx can take well over 30 seconds to be
// mined, and the old 30s limit showed an error for posts that went through.
export async function waitForReceipt(txHash, { timeoutMs = 180_000, intervalMs = 1500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let r = null;
    try {
      r = await fetch(RPC_URL + '/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: 1,
        }),
      });
    } catch {
      // a dropped request is not a failed tx; poll again
    }
    if (r && r.ok) {
      const json = await r.json().catch(() => ({}));
      if (json.result) {
        const receipt = json.result;
        return {
          ...receipt,
          status: receipt.status === '0x1' ? 'success' : 'reverted',
          blockNumber: parseInt(receipt.blockNumber, 16),
          gasUsed: parseInt(receipt.gasUsed, 16),
        };
      }
    }
    await sleep(intervalMs);
  }
  throw new Error('Still confirming. The network is slow right now and this usually goes through, so check your feed before you retry.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
