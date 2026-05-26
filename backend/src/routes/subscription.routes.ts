import { Router } from 'express';
import { body } from 'express-validator';
import { getSubscription, updatePlan } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requireOrgAccess, requirePlatformAdmin } from '../middleware/rbac.middleware';

const router = Router();

router.get(
  '/:orgId',
  authenticate,
  requireOrgAccess(),
  authorize('ORG_ADMIN'),
  getSubscription
);

// Only PLATFORM_ADMIN can change plans (manual upgrade in v1)
router.put(
  '/:orgId/plan',
  authenticate,
  requirePlatformAdmin(),
  [
    body('plan').isIn(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
    body('billingCycle').optional().isIn(['MONTHLY', 'ANNUAL']),
  ],
  updatePlan
);

export default router;
