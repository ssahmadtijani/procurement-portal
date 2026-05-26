import { Router } from 'express';
import { body } from 'express-validator';
import {
  createRFQ,
  publishRFQ,
  listRFQs,
  getRFQById,
  updateRFQ,
  closeRFQ,
  addRFQInvitation,
  removeRFQInvitation,
} from '../controllers/rfq.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listRFQs);
router.get('/:id', getRFQById);

router.post(
  '/',
  authorize('CORPORATE_OFFICE', 'ORG_ADMIN', 'PROCUREMENT_OFFICER'),
  [
    body('title').trim().notEmpty(),
    body('deadline').isISO8601(),
  ],
  createRFQ
);

router.put(
  '/:id',
  authorize('CORPORATE_OFFICE', 'ORG_ADMIN', 'PROCUREMENT_OFFICER'),
  [body('title').optional().trim().notEmpty()],
  updateRFQ
);

router.post('/:id/publish', authorize('CORPORATE_OFFICE', 'ORG_ADMIN'), publishRFQ);
router.post('/:id/close', authorize('CORPORATE_OFFICE', 'PROCUREMENT_OFFICER', 'ORG_ADMIN'), closeRFQ);

// RFQ Invitations (INVITED visibility)
router.post(
  '/:id/invitations',
  authorize('CORPORATE_OFFICE', 'ORG_ADMIN'),
  [body('supplierOrgId').isUUID()],
  addRFQInvitation
);
router.delete(
  '/:id/invitations/:supplierOrgId',
  authorize('CORPORATE_OFFICE', 'ORG_ADMIN'),
  removeRFQInvitation
);

export default router;
