import express from 'express';
import CompanyController from './company.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
    applyCompanyValidation,
    updateMyCompanyValidation,
    updateCompanyValidation,
    rejectCompanyValidation,
} from './company.validation';

const router = express.Router();

// Public — these must stay above `/:id`, which would otherwise swallow /public.
router.get('/public', CompanyController.getPublic);
router.get('/public/:slug', CompanyController.getPublicBySlug);

// Applicant / owner. Reachable while `pending` on purpose: an applicant needs to
// see and fix their own application before it is approved.
router.post('/apply', authMiddleware, validateRequest(applyCompanyValidation), CompanyController.apply);
router.get('/me', authMiddleware, CompanyController.getMe);
router.patch('/me', authMiddleware, validateRequest(updateMyCompanyValidation), CompanyController.updateMe);

// Admin
router.get('/', authMiddleware, authorizeRoles('admin', 'superadmin'), CompanyController.getAll);
router.get('/:id', authMiddleware, authorizeRoles('admin', 'superadmin'), CompanyController.getById);
router.patch('/:id/approve', authMiddleware, authorizeRoles('admin', 'superadmin'), CompanyController.approve);
router.patch('/:id/reject', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(rejectCompanyValidation), CompanyController.reject);
router.patch('/:id/suspend', authMiddleware, authorizeRoles('admin', 'superadmin'), CompanyController.suspend);
router.patch('/:id', authMiddleware, authorizeRoles('admin', 'superadmin'), validateRequest(updateCompanyValidation), CompanyController.update);

export const CompanyRoutes = router;
