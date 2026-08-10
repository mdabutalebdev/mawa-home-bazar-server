import express from 'express';
import MarketingOfficerController from './marketingOfficer.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
    applyMarketingOfficerValidation,
    updateMyMarketingOfficerValidation,
    approveMarketingOfficerValidation,
    rejectMarketingOfficerValidation,
    suspendMarketingOfficerValidation,
    updateMarketingOfficerValidation,
    fileReportValidation,
    stampLocationValidation,
    addVisitValidation,
} from './marketingOfficer.validation';

const router = express.Router();

// ── Officer (self) ───────────────────────────────
router.post('/apply', authMiddleware, validateRequest(applyMarketingOfficerValidation), MarketingOfficerController.apply);
router.get('/me', authMiddleware, MarketingOfficerController.getMe);
router.patch('/me', authMiddleware, validateRequest(updateMyMarketingOfficerValidation), MarketingOfficerController.updateMe);

// ── Daily report ─────────────────────────────────
// Every literal path here is declared before `/reports/:id` and `/:id`, or
// Express would hand `my` and `check-in` to the admin handlers as ids.
router.post('/reports/check-in', authMiddleware, authorizeRoles('marketing_officer'), validateRequest(stampLocationValidation), MarketingOfficerController.checkIn);
router.post('/reports/check-out', authMiddleware, authorizeRoles('marketing_officer'), validateRequest(stampLocationValidation), MarketingOfficerController.checkOut);
router.post('/reports/visits', authMiddleware, authorizeRoles('marketing_officer'), validateRequest(addVisitValidation), MarketingOfficerController.addVisit);
router.get('/reports/my', authMiddleware, authorizeRoles('marketing_officer'), MarketingOfficerController.getMyReports);
router.post('/reports', authMiddleware, authorizeRoles('marketing_officer'), validateRequest(fileReportValidation), MarketingOfficerController.fileReport);
router.get('/reports', authMiddleware, authorizeRoles('admin', 'superadmin'), MarketingOfficerController.getAllReports);
router.get('/reports/:id', authMiddleware, authorizeRoles('admin', 'superadmin'), MarketingOfficerController.getReportById);

// ── Admin ────────────────────────────────────────
router.get('/', authMiddleware, authorizeRoles('admin', 'superadmin'), MarketingOfficerController.getAll);
router.get('/:id/performance', authMiddleware, authorizeRoles('admin', 'superadmin'), MarketingOfficerController.getPerformance);
router.get('/:id', authMiddleware, authorizeRoles('admin', 'superadmin'), MarketingOfficerController.getById);
router.patch('/:id/approve', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(approveMarketingOfficerValidation), MarketingOfficerController.approve);
router.patch('/:id/reject', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(rejectMarketingOfficerValidation), MarketingOfficerController.reject);
router.patch('/:id/suspend', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(suspendMarketingOfficerValidation), MarketingOfficerController.suspend);
router.patch('/:id', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(updateMarketingOfficerValidation), MarketingOfficerController.update);

export const MarketingOfficerRoutes = router;
