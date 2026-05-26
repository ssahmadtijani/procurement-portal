import { Router } from 'express';
import { body } from 'express-validator';
import { submitRating, getSupplierRatings } from '../controllers/rating.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('CORPORATE_OFFICE', 'PROCUREMENT_OFFICER'),
  [
    body('poId').isUUID(),
    body('score').isInt({ min: 1, max: 5 }),
  ],
  submitRating
);

router.get('/:supplierId', getSupplierRatings);

export default router;
