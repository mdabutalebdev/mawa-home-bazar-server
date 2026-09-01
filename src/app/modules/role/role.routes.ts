import express from 'express';
import RoleController from './role.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { updateUserRoleValidation } from './role.validation';

const router = express.Router();

// ── Permission catalogue (admin, read-only) ──
router.get('/permissions', authMiddleware, authorizeRoles('admin'), RoleController.getPermissions);

// ── Staff management (admin only) ──
router.get('/staff', authMiddleware, authorizeRoles('admin'), RoleController.getStaff);
router.patch(
    '/:userId',
    authMiddleware,
    authorizeRoles('admin'),
    validateRequest(updateUserRoleValidation),
    RoleController.updateUserRole
);

export const RoleRoutes = router;
