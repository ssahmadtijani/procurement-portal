import { Router } from 'express';
import { body } from 'express-validator';
import {
  createRFQ,
  publishRFQ,
  listRFQs,
  getRFQById,
  updateRFQ,
  closeRFQ,
} from '../controllers/rfq.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listRFQs);
router.get('/:id', getRFQById);

router.post(
  '/',
  authorize('CORPORATE_OFFICE'),
  [
    body('title').trim().notEmpty(),
    body('deadline').isISO8601(),
    body('items').isArray({ min: 1 }),
    body('items.*.itemName').trim().notEmpty(),
    body('items.*.quantity').isFloat({ gt: 0 }),
  ],
  createRFQ
);

router.put(
  '/:id',
  authorize('CORPORATE_OFFICE'),
  [body('title').optional().trim().notEmpty()],
  updateRFQ
);

router.post('/:id/publish', authorize('CORPORATE_OFFICE'), publishRFQ);
router.post('/:id/close', authorize('CORPORATE_OFFICE', 'PROCUREMENT_OFFICER'), closeRFQ);

export default router;
