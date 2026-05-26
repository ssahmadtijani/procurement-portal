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
  searchSupplierOrgs,
} from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Supplier: manage own profile (SUPPLIER users + ORG_ADMIN of supplier company)
router.post(
  '/profile',
  authorize('SUPPLIER', 'ORG_ADMIN'),
  [
    body('companyName').trim().notEmpty(),
  ],
  registerSupplierProfile
);
// Support both /profile/me and /profile for frontend compatibility
router.get('/profile/me', authorize('SUPPLIER', 'ORG_ADMIN'), getMySupplierProfile);
router.get('/profile', authorize('SUPPLIER', 'ORG_ADMIN'), getMySupplierProfile);
router.put('/profile/me', authorize('SUPPLIER', 'ORG_ADMIN'), updateSupplierProfile);
router.put('/profile', authorize('SUPPLIER', 'ORG_ADMIN'), updateSupplierProfile);

// Admin: manage all suppliers
router.get('/', authorize('ORG_ADMIN', 'PROCUREMENT_OFFICER', 'CORPORATE_OFFICE', 'PLATFORM_ADMIN'), listSuppliers);
router.get('/verified', authorize('ORG_ADMIN', 'PROCUREMENT_OFFICER', 'CORPORATE_OFFICE', 'PLATFORM_ADMIN'), getVerifiedSuppliers);
// Search supplier orgs by name (for invitation picker — returns orgs even without a profile)
router.get('/orgs', authorize('ORG_ADMIN', 'PROCUREMENT_OFFICER', 'CORPORATE_OFFICE', 'PLATFORM_ADMIN'), searchSupplierOrgs);
router.get('/:id', authorize('ORG_ADMIN', 'PROCUREMENT_OFFICER', 'CORPORATE_OFFICE', 'PLATFORM_ADMIN'), getSupplierById);
router.post(
  '/:id/verify',
  authorize('ORG_ADMIN', 'PLATFORM_ADMIN'),
  [body('action').isIn(['VERIFY', 'REJECT'])],
  verifySupplier
);

export default router;
