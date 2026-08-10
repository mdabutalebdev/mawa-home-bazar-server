import express from 'express';
import RetailerController from './retailer.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
    applyRetailerValidation,
    updateMyRetailerValidation,
    adminUpdateRetailerValidation,
    rejectRetailerValidation,
} from './retailer.validation';

const router = express.Router();

// ── Self-service ─────────────────────────────────
router.post('/apply', authMiddleware, validateRequest(applyRetailerValidation), RetailerController.apply);
router.get('/me', authMiddleware, RetailerController.getMe);
router.get('/me/credit', authMiddleware, RetailerController.getMyCredit);
router.patch('/me', authMiddleware, validateRequest(updateMyRetailerValidation), RetailerController.updateMe);

// ── Dealer dashboard ─────────────────────────────
// The handler additionally pins a dealer to their own upazila.
router.get(
    '/by-upazila/:upazilaId',
    authMiddleware,
    authorizeRoles('dealer', 'admin', 'superadmin'),
    RetailerController.getByUpazila
);

// ── Admin ────────────────────────────────────────
// Declared after '/me' and '/by-upazila' so those are not swallowed by '/:id'.
router.get('/', authMiddleware, authorizeRoles('admin', 'superadmin'), RetailerController.getAll);
router.get('/:id', authMiddleware, authorizeRoles('admin', 'superadmin'), RetailerController.getById);
router.patch('/:id/approve', authMiddleware, authorizeRoles('admin', 'superadmin'), RetailerController.approve);
router.patch(
    '/:id/reject',
    authMiddleware,
    authorizeRoles('admin', 'superadmin'),
    validateRequest(rejectRetailerValidation),
    RetailerController.reject
);
router.patch('/:id/suspend', authMiddleware, authorizeRoles('admin', 'superadmin'), RetailerController.suspend);
router.patch(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'superadmin'),
    validateRequest(adminUpdateRetailerValidation),
    RetailerController.update
);

export const RetailerRoutes = router;
