import express from 'express';
import DeliveryManController from './deliveryMan.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import catchAsync from '../../utils/catchAsync';
import AppError from '../../utils/AppError';
import { DeliveryMan } from './deliveryMan.model';
import {
    applyDeliveryManValidation,
    updateMyDeliveryManValidation,
    adminUpdateDeliveryManValidation,
    rejectDeliveryManValidation,
    availabilityValidation,
    createAssignmentValidation,
    updateAssignmentStatusValidation,
    pushLocationValidation,
} from './deliveryMan.validation';

const router = express.Router();

/**
 * Loads the caller's rider profile onto `req.partner`.
 *
 * Applying already grants the `delivery_man` role, so the JWT alone proves
 * nothing — a pending or suspended rider must not be able to move parcels.
 * Handlers also read the rider id from here rather than the body, which is
 * what stops one rider updating another's assignment.
 */
const requireRider = catchAsync(async (req, res, next) => {
    const rider = await DeliveryMan.findOne({ user: req.user!.userId });
    if (!rider) throw new AppError(404, 'You do not have a delivery man profile.');
    if (rider.status !== 'approved') {
        throw new AppError(403, `Your delivery man account is ${rider.status}.`);
    }
    req.partner = rider as any;
    next();
});

const admin = [authMiddleware, authorizeRoles('admin', 'superadmin')];
const dealerOrAdmin = [authMiddleware, authorizeRoles('dealer', 'admin', 'superadmin')];
const rider = [authMiddleware, requireRider];

// ── Own profile ──────────────────────────────────────
router.post('/apply', authMiddleware, validateRequest(applyDeliveryManValidation), DeliveryManController.apply);
router.get('/me', authMiddleware, DeliveryManController.getMe);
router.patch('/me/availability', ...rider, validateRequest(availabilityValidation), DeliveryManController.setAvailability);
router.patch('/me', authMiddleware, validateRequest(updateMyDeliveryManValidation), DeliveryManController.updateMe);

// ── Assignments ──────────────────────────────────────
router.post('/assignments', ...dealerOrAdmin, validateRequest(createAssignmentValidation), DeliveryManController.createAssignment);
router.get('/assignments/my', ...rider, DeliveryManController.getMyAssignments);
// Tracking is open to anyone entitled to the order — the service decides who.
router.get('/assignments/order/:orderId', authMiddleware, DeliveryManController.getAssignmentForOrder);
router.patch('/assignments/:id/status', ...rider, validateRequest(updateAssignmentStatusValidation), DeliveryManController.updateAssignmentStatus);
router.post('/assignments/:id/location', ...rider, validateRequest(pushLocationValidation), DeliveryManController.pushLocation);

// ── Dealer roster ────────────────────────────────────
router.get('/by-dealer/:dealerId', ...dealerOrAdmin, DeliveryManController.getByDealer);

// ── Admin ────────────────────────────────────────────
// Declared last so the literal paths above are never swallowed by '/:id'.
router.get('/', ...admin, DeliveryManController.getAll);
router.get('/:id', ...admin, DeliveryManController.getById);
router.patch('/:id/approve', ...admin, DeliveryManController.approve);
router.patch('/:id/reject', ...admin, validateRequest(rejectDeliveryManValidation), DeliveryManController.reject);
router.patch('/:id/suspend', ...admin, DeliveryManController.suspend);
router.patch('/:id', ...admin, validateRequest(adminUpdateDeliveryManValidation), DeliveryManController.adminUpdate);

export const DeliveryManRoutes = router;
