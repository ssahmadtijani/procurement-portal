import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const submitRating = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { poId, score, comments } = req.body;

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po || po.status !== 'COMPLETED') {
    sendError(res, 'Can only rate completed purchase orders', 400);
    return;
  }

  const existing = await prisma.supplierRating.findUnique({
    where: { poId_ratedById: { poId, ratedById: req.user!.userId } },
  });
  if (existing) {
    sendError(res, 'You have already rated this supplier for this PO', 409);
    return;
  }

  const rating = await prisma.supplierRating.create({
    data: {
      supplierId: po.supplierId,
      poId,
      ratedById: req.user!.userId,
      score,
      comments,
    },
  });

  sendSuccess(res, rating, 'Rating submitted', 201);
};

export const getSupplierRatings = async (req: AuthRequest, res: Response): Promise<void> => {
  const { supplierId } = req.params;

  const [ratings, aggregate] = await Promise.all([
    prisma.supplierRating.findMany({
      where: { supplierId },
      include: {
        ratedBy: { select: { firstName: true, lastName: true } },
        po: { select: { poNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierRating.aggregate({
      where: { supplierId },
      _avg: { score: true },
      _count: { score: true },
    }),
  ]);

  sendSuccess(res, {
    ratings,
    averageScore: aggregate._avg.score ?? 0,
    totalRatings: aggregate._count.score,
  });
};
