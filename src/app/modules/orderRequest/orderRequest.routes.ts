import express from 'express';
import OrderRequestController from './orderRequest.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

// Public — a customer submits a service request from the storefront.
router.post('/', OrderRequestController.create);

// Dealer — the requests routed to this dealer's area.
router.get('/dealer', authMiddleware, authorizeRoles('dealer'), OrderRequestController.getForDealer);
router.get('/dealer/counts', authMiddleware, authorizeRoles('dealer'), OrderRequestController.dealerCounts);

// Admin — every request.
router.get('/admin', authMiddleware, authorizeRoles('admin'), OrderRequestController.getAllAdmin);

// Dealer (own) or Admin — update status / note.
router.patch('/:id/status', authMiddleware, authorizeRoles('dealer', 'admin'), OrderRequestController.updateStatus);

export const OrderRequestRoutes = router;
