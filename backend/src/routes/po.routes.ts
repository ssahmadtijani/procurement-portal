import { Router } from 'express';
import {
  listPurchaseOrders,
  getPurchaseOrderById,
  sendPurchaseOrder,
  acknowledgePO,
  completePO,
  updatePODetails,
} from '../controllers/po.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listPurchaseOrders);
router.get('/:id', getPurchaseOrderById);
router.put('/:id', authorize('PROCUREMENT_OFFICER'), updatePODetails);
router.post('/:id/send', authorize('PROCUREMENT_OFFICER'), sendPurchaseOrder);
router.post('/:id/acknowledge', authorize('SUPPLIER'), acknowledgePO);
router.post('/:id/complete', authorize('PROCUREMENT_OFFICER', 'CORPORATE_OFFICE'), completePO);

export default router;
