import { Router } from 'express';
import { param, body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { listUsers, updateUser } from '../controllers/user.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN'), listUsers);

router.patch(
  '/:id',
  authorize('ADMIN'),
  [param('id').isUUID(), body('isActive').isBoolean()],
  updateUser
);

export default router;
