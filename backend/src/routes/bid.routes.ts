import { Router } from 'express';
import { body } from 'express-validator';
import {
  submitBid,
  updateBid,
  getBidsForRFQ,
  evaluateBid,
  awardBid,
  getMyBids,
} from '../controllers/bid.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/my', authorize('SUPPLIER'), getMyBids);
router.get('/rfq/:rfqId', getBidsForRFQ);
router.post(
  '/',
  authorize('SUPPLIER'),
  [
    body('rfqId').isUUID(),
    body('totalAmount').isFloat({ gt: 0 }),
    body('items').isArray({ min: 1 }),
    body('items.*.rfqItemId').isUUID(),
    body('items.*.unitPrice').isFloat({ gt: 0 }),
    body('items.*.totalPrice').isFloat({ gt: 0 }),
  ],
  submitBid
);
router.put('/:id', authorize('SUPPLIER'), updateBid);
router.post(
  '/:id/evaluate',
  authorize('PROCUREMENT_OFFICER'),
  [body('action').isIn(['SHORTLIST', 'REJECT'])],
  evaluateBid
);
router.post('/:id/award', authorize('PROCUREMENT_OFFICER'), awardBid);

export default router;
