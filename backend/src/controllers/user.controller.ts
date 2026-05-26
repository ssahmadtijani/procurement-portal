import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { validationResult } from 'express-validator';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, organizationId } = req.user!;
    const where: Record<string, unknown> = {};

    // PLATFORM_ADMIN sees all; org users see only their org's members
    if (role !== 'PLATFORM_ADMIN') {
      where.organizationId = organizationId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, { users });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400);

    const { id } = req.params;
    const { isActive, role: newRole } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sendError(res, 'User not found', 404);

    // Non-platform-admins can only manage users in their own org
    if (req.user!.role !== 'PLATFORM_ADMIN' && user.organizationId !== req.user!.organizationId) {
      return sendError(res, 'Forbidden', 403);
    }

    const data: Record<string, unknown> = {};
    if (typeof isActive === 'boolean') data.isActive = isActive;
    // Only PLATFORM_ADMIN can change roles
    if (newRole && req.user!.role === 'PLATFORM_ADMIN') data.role = newRole;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
    });
    return sendSuccess(res, { user: updated });
  } catch (err) {
    next(err);
  }
};
