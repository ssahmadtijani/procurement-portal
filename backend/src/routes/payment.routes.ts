import { Router } from 'express';
import { body } from 'express-validator';
import { recordPayment, listPayments } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('FINANCE', 'ADMIN'), listPayments);
router.post(
  '/',
  authorize('FINANCE'),
  [
    body('invoiceId').isUUID(),
    body('amount').isFloat({ gt: 0 }),
    body('paymentDate').isISO8601(),
    body('paymentMethod').notEmpty(),
  ],
  recordPayment
);

export default router;
