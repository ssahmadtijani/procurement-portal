import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';

export const createRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { title, description, category, deadline, items } = req.body;

  const corporateOffice = await prisma.corporateOffice.findUnique({
    where: { userId: req.user!.userId },
  });

  const rfq = await prisma.rFQ.create({
    data: {
      title,
      description,
      category,
      deadline: new Date(deadline),
      createdById: req.user!.userId,
      corporateOfficeId: corporateOffice?.id,
      items: {
        create: (items as Array<{
          itemName: string;
          quantity: number;
          unit?: string;
          specifications?: string;
          estimatedPrice?: number;
        }>).map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          specifications: item.specifications,
          estimatedPrice: item.estimatedPrice,
        })),
      },
    },
    include: { items: true },
  });

  sendSuccess(res, rfq, 'RFQ created', 201);
};

export const publishRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const rfq = await prisma.rFQ.findUnique({ where: { id } });

  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }
  if (rfq.createdById !== req.user!.userId) {
    sendError(res, 'Forbidden', 403); return;
  }
  if (rfq.status !== 'DRAFT') {
    sendError(res, 'Only DRAFT RFQs can be published', 400); return;
  }

  const updated = await prisma.rFQ.update({
    where: { id },
    data: { status: 'OPEN', publishedAt: new Date() },
  });

  // Notify all verified suppliers
  const suppliers = await prisma.supplierProfile.findMany({
    where: { status: 'VERIFIED' },
    include: { user: true },
  });

  await Promise.all(
    suppliers.map(async (s) => {
      await notificationService.create({
        userId: s.userId,
        title: 'New RFQ Published',
        message: `A new RFQ "${rfq.title}" is now open for bidding.`,
        type: 'INFO',
        link: `/supplier/rfq/${id}`,
      });
      await emailService.sendRFQPublishedEmail(s.user.email, s.user.firstName, rfq.title, rfq.deadline);
    })
  );

  sendSuccess(res, updated);
};

export const listRFQs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20', search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const { role, userId } = req.user!;

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  // Suppliers see only OPEN and above
  if (role === 'SUPPLIER') {
    where.status = { in: ['OPEN', 'EVALUATION', 'AWARDED', 'CLOSED'] };
  }
  // Corporate office only sees own RFQs
  if (role === 'CORPORATE_OFFICE') {
    where.createdById = userId;
  }

  const [rfqs, total] = await Promise.all([
    prisma.rFQ.findMany({
      where,
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        items: true,
        _count: { select: { bids: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rFQ.count({ where }),
  ]);

  sendSuccess(res, { rfqs, total, page: parseInt(page), limit: parseInt(limit) });
};

export const getRFQById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: {
      items: true,
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      corporateOffice: true,
      bids: {
        include: {
          supplier: { include: { user: { select: { firstName: true, lastName: true } } } },
          items: true,
        },
      },
      documents: true,
    },
  });

  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }
  sendSuccess(res, rfq);
};

export const updateRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { id } = req.params;
  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }
  if (rfq.createdById !== req.user!.userId) { sendError(res, 'Forbidden', 403); return; }
  if (rfq.status !== 'DRAFT') { sendError(res, 'Only DRAFT RFQs can be updated', 400); return; }

  const { title, description, category, deadline } = req.body;
  const updated = await prisma.rFQ.update({
    where: { id },
    data: { title, description, category, deadline: deadline ? new Date(deadline) : undefined },
  });
  sendSuccess(res, updated);
};

export const closeRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }

  const updated = await prisma.rFQ.update({
    where: { id },
    data: { status: 'EVALUATION' },
  });
  sendSuccess(res, updated);
};
