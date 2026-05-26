import { Router } from 'express';
import {
  listMarketplaceRFQs,
  getMarketplaceRFQ,
  listMarketplaceSuppliers,
} from '../controllers/marketplace.controller';

const router = Router();

// All public — no authentication required
router.get('/rfqs', listMarketplaceRFQs);
router.get('/rfqs/:id', getMarketplaceRFQ);
router.get('/suppliers', listMarketplaceSuppliers);

export default router;
