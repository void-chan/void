/**
 * src/services/walletService.js
 *
 * Blockchain data proxy — fetches ETH + BTC balance and recent transactions
 * from public APIs. Results cached for 18 seconds (frontend polls every 20s).
 *
 * APIs used (free, no key required for basic use):
 *  ETH: Etherscan   https://api.etherscan.io/api
 *  BTC: Blockchain.info  https://blockchain.info
 *
 * WHY proxy server-side instead of directly from frontend:
 *  - CORS blocked on many blockchain APIs
 *  - API keys stay secret on server
 *  - Rate limit pooled across all users
 */

const ETHERSCAN_API = 'https://api.etherscan.io/api';
const BTC_API       = 'https://blockchain.info';
const CACHE_TTL_MS  = 18_000; // 18 seconds

// Simple in-memory cache: Map<string, {data, expiresAt}>
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── ETH ──────────────────────────────────────────────────────────────────────

export async function getEthData(address) {
  const cacheKey = `eth:${address}`;
  const cached   = getCached(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.ETHERSCAN_API_KEY ?? '';
  const keyParam = apiKey ? `&apikey=${apiKey}` : '';

  try {
    const [balRes, txRes] = await Promise.all([
      fetch(`${ETHERSCAN_API}?module=account&action=balance&address=${address}&tag=latest${keyParam}`),
      fetch(`${ETHERSCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10${keyParam}`),
    ]);

    const balJson = await balRes.json();
    const txJson  = await txRes.json();

    const balanceWei = BigInt(balJson.result ?? '0');
    const balanceEth = Number(balanceWei) / 1e18;

    const txs = (txJson.result ?? [])
      .filter((tx) => typeof tx === 'object')
      .slice(0, 10)
      .map((tx) => ({
        hash:      tx.hash,
        from:      tx.from,
        to:        tx.to,
        valueEth:  (Number(BigInt(tx.value ?? '0')) / 1e18).toFixed(6),
        direction: tx.to?.toLowerCase() === address.toLowerCase() ? 'in' : 'out',
        timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
      }));

    const data = { address, balanceEth: balanceEth.toFixed(6), transactions: txs, chain: 'ETH' };
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    return { address, balanceEth: '-.------', transactions: [], chain: 'ETH', error: 'API unavailable' };
  }
}

// ── BTC ──────────────────────────────────────────────────────────────────────

export async function getBtcData(address) {
  const cacheKey = `btc:${address}`;
  const cached   = getCached(cacheKey);
  if (cached) return cached;

  try {
    const res  = await fetch(`${BTC_API}/address/${address}?format=json&limit=10`);
    const json = await res.json();

    const balanceSat = json.final_balance ?? 0;
    const balanceBtc = (balanceSat / 1e8).toFixed(8);

    const txs = (json.txs ?? []).slice(0, 10).map((tx) => {
      // Determine if this address received or sent
      const received = tx.out
        ?.filter((o) => o.addr === address)
        .reduce((s, o) => s + (o.value ?? 0), 0) ?? 0;
      const sent = tx.inputs
        ?.filter((i) => i.prev_out?.addr === address)
        .reduce((s, i) => s + (i.prev_out?.value ?? 0), 0) ?? 0;
      const net = received - sent;

      return {
        hash:      tx.hash,
        valueBtc:  (Math.abs(net) / 1e8).toFixed(8),
        direction: net >= 0 ? 'in' : 'out',
        timestamp: new Date((tx.time ?? 0) * 1000).toISOString(),
      };
    });

    const data = { address, balanceBtc, transactions: txs, chain: 'BTC' };
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    return { address, balanceBtc: '-.--------', transactions: [], chain: 'BTC', error: 'API unavailable' };
  }
}
