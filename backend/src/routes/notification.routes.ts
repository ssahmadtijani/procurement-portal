import { Router } from 'express';
import { getNotifications, markRead } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', (req, _res, next) => { req.params.id = 'all'; next(); }, markRead);
router.patch('/:id/read', markRead);

export default router;
