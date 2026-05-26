import { Router } from 'express';
import { body } from 'express-validator';
import {
  getPlatformStats,
  listOrganizations,
  getOrganizationDetail,
  updateOrganizationStatus,
  listPendingSuppliers,
} from '../controllers/platform.controller';
import { verifySupplier } from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, requirePlatformAdmin());

router.get('/stats', getPlatformStats);
router.get('/organizations', listOrganizations);
router.get('/organizations/:id', getOrganizationDetail);
router.patch(
  '/organizations/:id/status',
  [body('status').isIn(['ACTIVE', 'SUSPENDED', 'INACTIVE'])],
  updateOrganizationStatus
);
router.get('/suppliers/pending', listPendingSuppliers);
router.post('/suppliers/:id/verify', [body('action').isIn(['VERIFY', 'REJECT'])], verifySupplier);

export default router;
