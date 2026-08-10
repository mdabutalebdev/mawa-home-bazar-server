import express from 'express';
import DealerController from './dealer.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
    applyDealerValidation,
    updateMyDealerValidation,
    approveDealerValidation,
    rejectDealerValidation,
    suspendDealerValidation,
    updateDealerValidation,
} from './dealer.validation';

const router = express.Router();

// ── Public ───────────────────────────────────────────
// Registered before '/:id' so the literal paths are not swallowed by it.
router.get('/public', DealerController.getPublic);
router.get('/public/by-upazila/:upazilaId', DealerController.getPublicByUpazila);

// ── Dealer (self) ────────────────────────────────────
router.post('/apply', authMiddleware, validateRequest(applyDealerValidation), DealerController.apply);
router.get('/me', authMiddleware, DealerController.getMe);
router.patch('/me', authMiddleware, validateRequest(updateMyDealerValidation), DealerController.updateMe);

// ── Admin ────────────────────────────────────────────
router.get('/', authMiddleware, authorizeRoles('admin', 'superadmin'), DealerController.getAll);
router.patch('/:id/approve', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(approveDealerValidation), DealerController.approve);
router.patch('/:id/reject', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(rejectDealerValidation), DealerController.reject);
router.patch('/:id/suspend', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(suspendDealerValidation), DealerController.suspend);
router.get('/:id', authMiddleware, authorizeRoles('admin', 'superadmin'), DealerController.getById);
router.patch('/:id', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(updateDealerValidation), DealerController.update);

export const DealerRoutes = router;
