import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  me,
  refreshToken,
  changePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').optional().trim(),
    // New org flow
    body('orgName').optional().trim().notEmpty(),
    body('orgType').optional().isIn(['BUYER', 'SUPPLIER_COMPANY']),
    body('orgSlug').optional().trim().toLowerCase(),
    // Join via invite flow
    body('invitationToken').optional().trim(),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login
);

router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  changePassword
);

export default router;
