import { Router } from 'express';
import { body } from 'express-validator';
import {
  getOrg,
  getOrgBySlug,
  updateOrg,
  listMembers,
  removeMember,
  listInvitations,
  inviteMember,
  validateInvitation,
  revokeInvitation,
} from '../controllers/org.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requireOrgAccess } from '../middleware/rbac.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/invitations/:token', validateInvitation);
router.get('/by-slug/:slug', getOrgBySlug);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.get('/:orgId', authenticate, requireOrgAccess(), getOrg);

router.put(
  '/:orgId',
  authenticate,
  requireOrgAccess(),
  authorize('ORG_ADMIN'),
  [
    body('name').optional().trim().notEmpty(),
    body('website').optional().isURL(),
    body('contactEmail').optional().isEmail().normalizeEmail(),
  ],
  updateOrg
);

router.get(
  '/:orgId/members',
  authenticate,
  requireOrgAccess(),
  authorize('ORG_ADMIN', 'PROCUREMENT_OFFICER'),
  listMembers
);

router.delete(
  '/:orgId/members/:userId',
  authenticate,
  requireOrgAccess(),
  authorize('ORG_ADMIN'),
  removeMember
);

router.get(
  '/:orgId/invitations',
  authenticate,
  requireOrgAccess(),
  authorize('ORG_ADMIN'),
  listInvitations
);

router.post(
  '/:orgId/invitations',
  authenticate,
  requireOrgAccess(),
  authorize('ORG_ADMIN'),
  [
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['ORG_ADMIN', 'CORPORATE_OFFICE', 'PROCUREMENT_OFFICER', 'FINANCE', 'SUPPLIER']),
  ],
  inviteMember
);

router.delete(
  '/:orgId/invitations/:invitationId',
  authenticate,
  requireOrgAccess(),
  authorize('ORG_ADMIN'),
  revokeInvitation
);

export default router;
