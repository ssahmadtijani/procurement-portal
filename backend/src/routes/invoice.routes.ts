import { Router } from 'express';
import { body } from 'express-validator';
import {
  createInvoice,
  listInvoices,
  getInvoiceById,
  approveInvoice,
} from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listInvoices);
router.get('/:id', getInvoiceById);
router.post(
  '/',
  authorize('SUPPLIER', 'ORG_ADMIN'),
  [
    body('poId').isUUID(),
    body('amount').isFloat({ gt: 0 }),
  ],
  createInvoice
);
router.post(
  '/:id/approve',
  authorize('FINANCE', 'ORG_ADMIN'),
  [body('action').isIn(['APPROVE', 'REJECT'])],
  approveInvoice
);

export default router;
