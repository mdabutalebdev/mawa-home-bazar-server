import express from 'express';
import { upload } from '../../utils/cloudinary';
import { uploadController } from './upload.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

// POST /api/upload/image  — single image (admin + product-listing partners).
// Companies (and dealers) upload product images through the shared product form,
// so they need this endpoint too.
router.post(
    '/image',
    authMiddleware,
    authorizeRoles('admin', 'company', 'dealer'),
    upload.single('image'),
    uploadController.uploadSingle,
);

// POST /api/upload/images — multiple up to 10 (admin + product-listing partners)
router.post(
    '/images',
    authMiddleware,
    authorizeRoles('admin', 'company', 'dealer'),
    upload.array('images', 10),
    uploadController.uploadMultiple,
);

// POST /api/upload/my-images — multiple up to 5 (any logged-in user, e.g. return requests)
router.post(
    '/my-images',
    authMiddleware,
    upload.array('images', 5),
    uploadController.uploadMultiple,
);

export const UploadRoutes = router;
