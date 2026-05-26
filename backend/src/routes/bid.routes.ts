import { Router } from 'express';
import { body } from 'express-validator';
import {
  submitBid,
  updateBid,
  getBidsForRFQ,
  evaluateBid,
  awardBid,
  getMyBids,
  getAllBids,
} from '../controllers/bid.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// All bids scoped to the user's org (buyers/procurement see their RFQs' bids)
router.get('/', authorize('CORPORATE_OFFICE', 'PROCUREMENT_OFFICER', 'FINANCE', 'ORG_ADMIN', 'PLATFORM_ADMIN'), getAllBids);
router.get('/my', authorize('SUPPLIER', 'ORG_ADMIN'), getMyBids);
router.get('/rfq/:rfqId', getBidsForRFQ);
router.post(
  '/',
  authorize('SUPPLIER', 'ORG_ADMIN'),
  [
    body('rfqId').isUUID(),
    body('totalAmount').optional().isFloat({ gt: 0 }),
    body('amount').optional().isFloat({ gt: 0 }),
  ],
  submitBid
);
router.put('/:id', authorize('SUPPLIER', 'ORG_ADMIN'), updateBid);
router.post(
  '/:id/evaluate',
  authorize('PROCUREMENT_OFFICER', 'ORG_ADMIN'),
  [body('action').isIn(['SHORTLIST', 'REJECT'])],
  evaluateBid
);
router.post('/:id/award', authorize('PROCUREMENT_OFFICER', 'CORPORATE_OFFICE', 'ORG_ADMIN'), awardBid);

export default router;
