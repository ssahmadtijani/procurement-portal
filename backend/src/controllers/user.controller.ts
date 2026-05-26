import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { validationResult } from 'express-validator';
import { sendSuccess, sendError } from '../utils/response.utils';

export const listUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, { users });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400);

    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sendError(res, 'User not found', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
    });
    return sendSuccess(res, { user: updated });
  } catch (err) {
    next(err);
  }
};
