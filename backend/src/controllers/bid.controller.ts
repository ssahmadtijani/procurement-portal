import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';
import { poService } from '../services/po.service';

// Helper: get supplier profile for the current user's org
const getSupplierProfile = (orgId: string) =>
  prisma.supplierProfile.findUnique({ where: { organizationId: orgId } });

export const submitBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const supplierProfile = await getSupplierProfile(orgId);
  if (!supplierProfile || supplierProfile.status !== 'VERIFIED') {
    sendError(res, 'Only verified supplier organisations can submit bids', 403);
    return;
  }

  const { rfqId, notes, validUntil, items } = req.body;
  // Support both 'amount' (simple) and 'totalAmount' (itemised)
  const totalAmount: number = req.body.totalAmount ?? req.body.amount;
  if (!totalAmount || totalAmount <= 0) {
    sendError(res, 'Bid amount is required', 422); return;
  }
  const currency: string = req.body.currency ?? 'USD';

  const rfq = await prisma.rFQ.findUnique({
    where: { id: rfqId },
    include: { invitations: { select: { supplierOrgId: true } } },
  });
  if (!rfq || rfq.status !== 'OPEN') {
    sendError(res, 'RFQ is not open for bidding', 400);
    return;
  }

  // Check visibility access
  if (rfq.visibility === 'INVITED') {
    const isInvited = rfq.invitations.some((inv) => inv.supplierOrgId === orgId);
    if (!isInvited) {
      sendError(res, 'Your organisation has not been invited to bid on this RFQ', 403);
      return;
    }
  }

  const existing = await prisma.bid.findUnique({
    where: { rfqId_supplierId: { rfqId, supplierId: supplierProfile.id } },
  });
  if (existing) {
    sendError(res, 'Your organisation has already submitted a bid for this RFQ', 409);
    return;
  }

  const bid = await prisma.bid.create({
    data: {
      rfqId,
      supplierId: supplierProfile.id,
      supplierOrgId: orgId,
      totalAmount,
      currency: currency ?? 'USD',
      notes,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      items: items?.length ? {
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
      } : undefined,
    },
    include: { items: true },
  });

  // Notify buyer org's procurement officers
  const officers = await prisma.user.findMany({
    where: { role: 'PROCUREMENT_OFFICER', isActive: true, organizationId: rfq.organizationId },
  });
  await Promise.all(
    officers.map((o) =>
      notificationService.create({
        userId: o.id,
        organizationId: rfq.organizationId,
        title: 'New Bid Submitted',
        message: `${supplierProfile.companyName} submitted a bid for RFQ "${rfq.title}".`,
        type: 'INFO',
        link: `/org/${req.user!.orgSlug}/rfqs/${rfqId}`,
      })
    )
  );

  sendSuccess(res, bid, 'Bid submitted', 201);
};

export const updateBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const supplierProfile = await getSupplierProfile(orgId);
  const bid = await prisma.bid.findUnique({ where: { id }, include: { rfq: true } });

  if (!bid || bid.supplierId !== supplierProfile?.id) {
    sendError(res, 'Bid not found', 404); return;
  }
  if (bid.status !== 'SUBMITTED') {
    sendError(res, 'Cannot update a bid that has been processed', 400); return;
  }
  if (bid.rfq.status !== 'OPEN') {
    sendError(res, 'RFQ is no longer open', 400); return;
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
  const { role, organizationId } = req.user!;

  // Suppliers only see their own org's bid
  if (role === 'SUPPLIER' || (role === 'ORG_ADMIN' && req.user!.orgType === 'SUPPLIER_COMPANY')) {
    const supplierProfile = await getSupplierProfile(organizationId!);
    const bid = await prisma.bid.findUnique({
      where: { rfqId_supplierId: { rfqId, supplierId: supplierProfile?.id ?? '' } },
      include: { items: { include: { rfqItem: true } } },
    });
    sendSuccess(res, bid ? [bid] : []);
    return;
  }

  const bids = await prisma.bid.findMany({
    where: { rfqId },
    include: {
      supplier: { select: { companyName: true, categories: true, status: true } },
      supplierOrg: { select: { id: true, name: true, slug: true } },
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

  const bid = await prisma.bid.findUnique({ where: { id } });
  if (!bid) { sendError(res, 'Bid not found', 404); return; }

  const status = action === 'SHORTLIST' ? 'SHORTLISTED' : 'REJECTED';
  const updated = await prisma.bid.update({
    where: { id },
    data: { status, score, evaluationNotes },
  });

  // Notify all active users in the supplier org
  const supplierUsers = await prisma.user.findMany({
    where: { organizationId: bid.supplierOrgId, isActive: true },
    select: { id: true },
  });
  await Promise.all(
    supplierUsers.map((u) =>
      notificationService.create({
        userId: u.id,
        organizationId: bid.supplierOrgId,
        title: `Bid ${status === 'SHORTLISTED' ? 'Shortlisted' : 'Rejected'}`,
        message: `Your bid has been ${status.toLowerCase()}.`,
        type: status === 'SHORTLISTED' ? 'SUCCESS' : 'WARNING',
        link: `/org/${req.user!.orgSlug}/bids/${id}`,
      })
    )
  );

  sendSuccess(res, updated);
};

export const awardBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const bid = await prisma.bid.findUnique({
    where: { id },
    include: {
      rfq: { include: { items: true, corporateOffice: true, organization: true } },
      supplier: true,
      items: { include: { rfqItem: true } },
    },
  });

  if (!bid) { sendError(res, 'Bid not found', 404); return; }
  if (bid.rfq.status !== 'EVALUATION') {
    sendError(res, 'RFQ must be in EVALUATION status to award', 400); return;
  }

  // Reject all other bids
  await prisma.bid.updateMany({
    where: { rfqId: bid.rfqId, id: { not: id } },
    data: { status: 'REJECTED' },
  });

  await prisma.bid.update({ where: { id }, data: { status: 'AWARDED' } });
  await prisma.rFQ.update({ where: { id: bid.rfqId }, data: { status: 'AWARDED' } });

  // Auto-create PO with org context
  const po = await poService.createFromBid(bid);

  // Notify all active users in the supplier org
  const supplierUsers = await prisma.user.findMany({
    where: { organizationId: bid.supplierOrgId, isActive: true },
    select: { id: true, email: true, firstName: true },
  });

  await Promise.all(
    supplierUsers.map(async (u) => {
      await notificationService.create({
        userId: u.id,
        organizationId: bid.supplierOrgId,
        title: 'Bid Awarded',
        message: `Congratulations! Your bid for "${bid.rfq.title}" has been awarded. A Purchase Order has been created.`,
        type: 'SUCCESS',
        link: `/org/${req.user!.orgSlug}/purchase-orders/${po.id}`,
      });
      await emailService.sendBidAwardedEmail(u.email, u.firstName, bid.rfq.title, po.poNumber);
    })
  );

  sendSuccess(res, { bid, purchaseOrder: po });
};

export const getAllBids = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, organizationId } = req.user!;

  const where = role === 'PLATFORM_ADMIN'
    ? {}
    : { rfq: { organizationId } };

  const bids = await prisma.bid.findMany({
    where,
    include: {
      rfq: { select: { id: true, title: true, status: true, organizationId: true } },
      supplier: { select: { companyName: true } },
      supplierOrg: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, { bids });
};

export const getMyBids = async (req: AuthRequest, res: Response): Promise<void> => {
  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const supplierProfile = await getSupplierProfile(orgId);
  if (!supplierProfile) {
    sendError(res, 'Supplier profile not found for your organisation', 404); return;
  }

  const bids = await prisma.bid.findMany({
    where: { supplierId: supplierProfile.id },
    include: {
      rfq: {
        select: {
          title: true,
          deadline: true,
          status: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
      },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, { bids });
};
