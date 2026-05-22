/** src/routes/wallet.js */
import { Router } from 'express';
import { getEthData, getBtcData } from '../services/walletService.js';
import { sendSuccess, sendError }  from '../utils/response.js';

const router = Router();

// Basic address format validation
const ETH_RE = /^0x[0-9a-fA-F]{40}$/;
const BTC_RE = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;

router.get('/eth/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    if (!ETH_RE.test(address)) return sendError(res, 'Invalid ETH address.', 400);
    const data = await getEthData(address);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/btc/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    if (!BTC_RE.test(address)) return sendError(res, 'Invalid BTC address.', 400);
    const data = await getBtcData(address);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
});

export default router;
