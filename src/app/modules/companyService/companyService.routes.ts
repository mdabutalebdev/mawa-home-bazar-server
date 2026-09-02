import express from 'express';
import CompanyServiceController from './companyService.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createCompanyServiceValidation, updateCompanyServiceValidation } from './companyService.validation';

const router = express.Router();

router.get('/', CompanyServiceController.getAll);
router.get('/admin/all', authMiddleware, authorizeRoles('admin'), CompanyServiceController.getAllAdmin);
router.get('/company/my', authMiddleware, authorizeRoles('company'), CompanyServiceController.getMyServices);

router.get('/slug/:slug', CompanyServiceController.getBySlug);
router.get('/:id', CompanyServiceController.getById);

// Admin and Company both can create services (as requested)
router.post(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'company'),
    validateRequest(createCompanyServiceValidation),
    CompanyServiceController.create
);

router.patch(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'company'),
    validateRequest(updateCompanyServiceValidation),
    CompanyServiceController.update
);

router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'company'),
    CompanyServiceController.delete
);

export const CompanyServiceRoutes = router;
