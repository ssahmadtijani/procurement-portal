import { Router } from 'express';
import { getDashboardStats, getReports } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/reports', authorize('PLATFORM_ADMIN', 'ORG_ADMIN', 'FINANCE', 'PROCUREMENT_OFFICER'), getReports);

export default router;
