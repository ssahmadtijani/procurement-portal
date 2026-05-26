import { Router } from 'express';
import { getDashboardStats, getReports } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/reports', authorize('ADMIN', 'FINANCE', 'PROCUREMENT_OFFICER'), getReports);

export default router;
