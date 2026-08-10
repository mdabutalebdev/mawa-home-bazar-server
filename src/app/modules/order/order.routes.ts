import express from 'express';
import OrderController from './order.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createOrderValidation, updateOrderStatusValidation } from './order.validation';
import OrderPartnerController from './order.partner.controller';

const router = express.Router();

// ── Guest checkout (no auth required) ────────────
router.post('/guest-checkout', validateRequest(createOrderValidation), OrderController.guestCheckout);

// ── Public order tracking (no auth required) ─────
router.get('/track/:orderId', OrderController.trackOrder);

// ── User routes ──────────────────────────────────
router.get('/my', authMiddleware, OrderController.getMyOrders);
router.post('/', authMiddleware, validateRequest(createOrderValidation), OrderController.create);
router.patch('/:id/cancel', authMiddleware, OrderController.cancel);

// ── Admin routes ─────────────────────────────────
router.get('/admin/all', authMiddleware, authorizeRoles('admin'), OrderController.getAll);
router.get('/admin/stats', authMiddleware, authorizeRoles('admin'), OrderController.getStats);
router.get('/admin/:id', authMiddleware, authorizeRoles('admin'), OrderController.getById);
router.patch('/admin/:id/status', authMiddleware, authorizeRoles('admin'), validateRequest(updateOrderStatusValidation), OrderController.updateStatus);
router.patch('/admin/:id/payment', authMiddleware, authorizeRoles('admin'), OrderController.updatePaymentStatus);
router.patch('/admin/:id/note', authMiddleware, authorizeRoles('admin'), OrderController.addNote);
router.patch('/admin/:id/tracking', authMiddleware, authorizeRoles('admin'), OrderController.updateOrderTracking);

// ── Partner dashboards ───────────────────────────
// Each of these scopes to the caller's own partner profile; none of them takes
// a dealer/company id from the request.
router.get('/dealer/my', authMiddleware, authorizeRoles('dealer'), OrderPartnerController.getDealerOrders);
router.get('/dealer/stats', authMiddleware, authorizeRoles('dealer'), OrderPartnerController.getDealerStats);
router.patch('/dealer/:id/confirm', authMiddleware, authorizeRoles('dealer'), OrderPartnerController.confirmOrder);

router.get('/company/my', authMiddleware, authorizeRoles('company'), OrderPartnerController.getCompanyOrders);
router.get('/company/stats', authMiddleware, authorizeRoles('company'), OrderPartnerController.getCompanyStats);
router.patch('/company/:id/status', authMiddleware, authorizeRoles('company'), OrderPartnerController.updateCompanyOrderStatus);

router.get('/retailer/my', authMiddleware, authorizeRoles('retailer'), OrderPartnerController.getRetailerOrders);

// ── Legacy/general ───────────────────────────────
router.get('/:id', authMiddleware, OrderController.getById);

export const OrderRoutes = router;
