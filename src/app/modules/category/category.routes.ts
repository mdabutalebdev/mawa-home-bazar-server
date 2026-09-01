import express from 'express';
import CategoryController from './category.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createCategoryValidation, updateCategoryValidation } from './category.validation';

const router = express.Router();

router.get('/', CategoryController.getAll);
router.get('/admin/all', authMiddleware, authorizeRoles('admin'), CategoryController.getAllAdmin);

// ── Company-scoped categories (a seller manages its own; must sit above /:id) ──
router.get('/for-seller', authMiddleware, authorizeRoles('company', 'admin'), CategoryController.getForSeller);
router.get('/company/mine', authMiddleware, authorizeRoles('company'), CategoryController.getMyCompanyCategories);
router.post('/company', authMiddleware, authorizeRoles('company'), CategoryController.createCompanyCategory);
router.patch('/company/:id', authMiddleware, authorizeRoles('company'), CategoryController.updateCompanyCategory);
router.delete('/company/:id', authMiddleware, authorizeRoles('company'), CategoryController.deleteCompanyCategory);

router.get('/:id/subcategories', CategoryController.getSubCategories);
router.get('/:id', CategoryController.getById);
router.post('/', authMiddleware, authorizeRoles('admin'), validateRequest(createCategoryValidation), CategoryController.create);
router.patch('/:id', authMiddleware, authorizeRoles('admin'), validateRequest(updateCategoryValidation), CategoryController.update);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), CategoryController.delete);

export const CategoryRoutes = router;
