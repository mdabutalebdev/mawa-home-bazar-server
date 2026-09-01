import express from 'express';
import WalletController from './wallet.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

router.use(authMiddleware);

// ── Account holder ──────────────────────────────────
router.get('/me', WalletController.myWallet);
router.get('/me/transactions', WalletController.myTransactions);
router.post('/deposit', WalletController.deposit);
router.post('/withdraw', WalletController.withdraw);

// ── Owner ───────────────────────────────────────────
const owner = [authorizeRoles('admin')];
router.get('/requests', ...owner, WalletController.listRequests);
router.patch('/requests/:id/approve', ...owner, WalletController.approve);
router.patch('/requests/:id/reject', ...owner, WalletController.reject);
router.patch('/:userId/profit-rate', ...owner, WalletController.setProfitRate);
router.post('/run-profit', ...owner, WalletController.runProfit);
router.post('/:userId/recompute', ...owner, WalletController.recompute);

export const WalletRoutes = router;
