import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';
import { poService } from '../services/po.service';

export const submitBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { rfqId, totalAmount, currency, notes, validUntil, items } = req.body;

  const supplierProfile = await prisma.supplierProfile.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!supplierProfile || supplierProfile.status !== 'VERIFIED') {
    sendError(res, 'Only verified suppliers can submit bids', 403);
    return;
  }

  const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
  if (!rfq || rfq.status !== 'OPEN') {
    sendError(res, 'RFQ is not open for bidding', 400);
    return;
  }

  const existing = await prisma.bid.findUnique({
    where: { rfqId_supplierId: { rfqId, supplierId: supplierProfile.id } },
  });
  if (existing) {
    sendError(res, 'You have already submitted a bid for this RFQ', 409);
    return;
  }

  const bid = await prisma.bid.create({
    data: {
      rfqId,
      supplierId: supplierProfile.id,
      totalAmount,
      currency: currency ?? 'USD',
      notes,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      items: {
        create: (items as Array<{
          rfqItemId: string;
          unitPrice: number;
          totalPrice: number;
          notes?: string;
        }>).map((item) => ({
          rfqItemId: item.rfqItemId,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        })),
      },
    },
    include: { items: true },
  });

  // Notify procurement officers
  const officers = await prisma.user.findMany({
    where: { role: 'PROCUREMENT_OFFICER', isActive: true },
  });
  await Promise.all(
    officers.map((o) =>
      notificationService.create({
        userId: o.id,
        title: 'New Bid Submitted',
        message: `${supplierProfile.companyName} submitted a bid for RFQ "${rfq.title}".`,
        type: 'INFO',
        link: `/procurement/rfq/${rfqId}`,
      })
    )
  );

  sendSuccess(res, bid, 'Bid submitted', 201);
};

export const updateBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const supplierProfile = await prisma.supplierProfile.findUnique({
    where: { userId: req.user!.userId },
  });

  const bid = await prisma.bid.findUnique({ where: { id }, include: { rfq: true } });
  if (!bid || bid.supplierId !== supplierProfile?.id) {
    sendError(res, 'Bid not found', 404);
    return;
  }
  if (bid.status !== 'SUBMITTED') {
    sendError(res, 'Cannot update a bid that has been processed', 400);
    return;
  }
  if (bid.rfq.status !== 'OPEN') {
    sendError(res, 'RFQ is no longer open', 400);
    return;
  }

  const { totalAmount, currency, notes, validUntil } = req.body;
  const updated = await prisma.bid.update({
    where: { id },
    data: { totalAmount, currency, notes, validUntil: validUntil ? new Date(validUntil) : undefined },
    include: { items: true },
  });
  sendSuccess(res, updated);
};

export const getBidsForRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const { rfqId } = req.params;
  const { role, userId } = req.user!;

  // Suppliers only see their own bid
  if (role === 'SUPPLIER') {
    const supplierProfile = await prisma.supplierProfile.findUnique({
      where: { userId },
    });
    const bid = await prisma.bid.findUnique({
      where: {
        rfqId_supplierId: { rfqId, supplierId: supplierProfile?.id ?? '' },
      },
      include: { items: { include: { rfqItem: true } } },
    });
    sendSuccess(res, bid ? [bid] : []);
    return;
  }

  const bids = await prisma.bid.findMany({
    where: { rfqId },
    include: {
      supplier: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
      items: { include: { rfqItem: true } },
      documents: true,
    },
    orderBy: { totalAmount: 'asc' },
  });
  sendSuccess(res, bids);
};

export const evaluateBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action, score, evaluationNotes } = req.body;
  // action: SHORTLIST | REJECT

  const bid = await prisma.bid.findUnique({ where: { id } });
  if (!bid) { sendError(res, 'Bid not found', 404); return; }

  const status = action === 'SHORTLIST' ? 'SHORTLISTED' : 'REJECTED';
  const updated = await prisma.bid.update({
    where: { id },
    data: { status, score, evaluationNotes },
  });

  await notificationService.create({
    userId: (await prisma.supplierProfile.findUnique({ where: { id: bid.supplierId }, include: { user: true } }))!.userId,
    title: `Bid ${status === 'SHORTLISTED' ? 'Shortlisted' : 'Rejected'}`,
    message: `Your bid has been ${status.toLowerCase()}.`,
    type: status === 'SHORTLISTED' ? 'SUCCESS' : 'WARNING',
    link: `/supplier/bids/${id}`,
  });

  sendSuccess(res, updated);
};

export const awardBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const bid = await prisma.bid.findUnique({
    where: { id },
    include: {
      rfq: { include: { items: true, corporateOffice: true } },
      supplier: { include: { user: true } },
      items: { include: { rfqItem: true } },
    },
  });

  if (!bid) { sendError(res, 'Bid not found', 404); return; }
  if (bid.rfq.status !== 'EVALUATION') {
    sendError(res, 'RFQ must be in EVALUATION status to award', 400);
    return;
  }

  // Mark all other bids as REJECTED
  await prisma.bid.updateMany({
    where: { rfqId: bid.rfqId, id: { not: id } },
    data: { status: 'REJECTED' },
  });

  // Award this bid
  await prisma.bid.update({ where: { id }, data: { status: 'AWARDED' } });

  // Update RFQ status
  await prisma.rFQ.update({ where: { id: bid.rfqId }, data: { status: 'AWARDED' } });

  // Auto-create PO
  const po = await poService.createFromBid(bid);

  // Notify supplier
  await notificationService.create({
    userId: bid.supplier.userId,
    title: 'Bid Awarded',
    message: `Congratulations! Your bid for "${bid.rfq.title}" has been awarded. A Purchase Order has been created.`,
    type: 'SUCCESS',
    link: `/supplier/purchase-orders/${po.id}`,
  });

  await emailService.sendBidAwardedEmail(
    bid.supplier.user.email,
    bid.supplier.user.firstName,
    bid.rfq.title,
    po.poNumber
  );

  sendSuccess(res, { bid, purchaseOrder: po });
};

export const getMyBids = async (req: AuthRequest, res: Response): Promise<void> => {
  const supplierProfile = await prisma.supplierProfile.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!supplierProfile) {
    sendError(res, 'Supplier profile not found', 404);
    return;
  }

  const bids = await prisma.bid.findMany({
    where: { supplierId: supplierProfile.id },
    include: {
      rfq: { select: { title: true, deadline: true, status: true } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, bids);
};
