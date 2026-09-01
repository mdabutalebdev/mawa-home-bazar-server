import express from 'express';
import GeoController from './geo.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

// Public — every address form and coverage widget reads these.
router.get('/divisions', GeoController.getDivisions);
router.get('/districts', GeoController.getDistricts);
router.get('/upazilas', GeoController.getUpazilas);
router.get('/upazilas/search', GeoController.searchUpazilas);
router.get('/upazilas/:id', GeoController.getUpazila);
router.get('/coverage', GeoController.getCoverage);

// Admin
router.post('/reseed', authMiddleware, authorizeRoles('admin'), GeoController.reseed);

export const GeoRoutes = router;
