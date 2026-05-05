// Tx receipt poller. Hits the eth-RPC endpoint to wait for a tx to land.
// Used by dApp components to know when an action is confirmed on-chain
// (so they can refresh data, dismiss spinners, etc.).

import { RPC_URL } from './contracts';

export async function waitForReceipt(txHash, { timeoutMs = 30_000, intervalMs = 1500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await fetch(RPC_URL + '/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    });
    if (r.ok) {
      const json = await r.json();
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
  throw new Error(`tx ${txHash} not confirmed within ${timeoutMs}ms`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
