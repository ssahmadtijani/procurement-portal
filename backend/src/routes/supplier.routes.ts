import { Router } from 'express';
import { body } from 'express-validator';
import {
  registerSupplierProfile,
  getMySupplierProfile,
  updateSupplierProfile,
  listSuppliers,
  getSupplierById,
  verifySupplier,
  getVerifiedSuppliers,
} from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Supplier: manage own profile
router.post(
  '/profile',
  authorize('SUPPLIER'),
  [
    body('companyName').trim().notEmpty(),
    body('regNumber').trim().notEmpty(),
  ],
  registerSupplierProfile
);
router.get('/profile/me', authorize('SUPPLIER'), getMySupplierProfile);
router.put('/profile/me', authorize('SUPPLIER'), updateSupplierProfile);

// Admin: manage all suppliers
router.get('/', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'CORPORATE_OFFICE'), listSuppliers);
router.get('/verified', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'CORPORATE_OFFICE'), getVerifiedSuppliers);
router.get('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER'), getSupplierById);
router.post(
  '/:id/verify',
  authorize('ADMIN'),
  [body('action').isIn(['VERIFY', 'REJECT'])],
  verifySupplier
);

export default router;
