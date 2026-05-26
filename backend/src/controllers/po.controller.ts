import { Response } from 'express';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';

export const listPurchaseOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const { role, userId } = req.user!;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (role === 'SUPPLIER') {
    const supplierProfile = await prisma.supplierProfile.findUnique({ where: { userId } });
    if (!supplierProfile) { sendError(res, 'Profile not found', 404); return; }
    where.supplierId = supplierProfile.id;
  } else if (role === 'CORPORATE_OFFICE') {
    const corp = await prisma.corporateOffice.findUnique({ where: { userId } });
    if (corp) where.corporateOfficeId = corp.id;
  }

  const [pos, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { include: { user: { select: { firstName: true, lastName: true } } } },
        corporateOffice: true,
        items: true,
        rfq: { select: { title: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  sendSuccess(res, { purchaseOrders: pos, total, page: parseInt(page), limit: parseInt(limit) });
};

export const getPurchaseOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      corporateOffice: true,
      items: true,
      rfq: { select: { title: true } },
      bid: { select: { totalAmount: true } },
      invoices: true,
      documents: true,
      ratings: true,
    },
  });
  if (!po) { sendError(res, 'Purchase order not found', 404); return; }
  sendSuccess(res, po);
};

export const sendPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: { include: { user: true } } },
  });
  if (!po) { sendError(res, 'PO not found', 404); return; }
  if (po.status !== 'DRAFT') { sendError(res, 'Only DRAFT POs can be sent', 400); return; }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'SENT', sentAt: new Date() },
  });

  await notificationService.create({
    userId: po.supplier.userId,
    title: 'Purchase Order Received',
    message: `Purchase Order ${po.poNumber} has been sent to you. Please acknowledge.`,
    type: 'INFO',
    link: `/supplier/purchase-orders/${id}`,
  });

  await emailService.sendPOEmail(
    po.supplier.user.email,
    po.supplier.user.firstName,
    po.poNumber
  );

  sendSuccess(res, updated);
};

export const acknowledgePO = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const supplierProfile = await prisma.supplierProfile.findUnique({
    where: { userId: req.user!.userId },
  });

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po || po.supplierId !== supplierProfile?.id) {
    sendError(res, 'PO not found', 404); return;
  }
  if (po.status !== 'SENT') { sendError(res, 'PO must be in SENT status to acknowledge', 400); return; }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
  });

  // Notify procurement officers
  const officers = await prisma.user.findMany({ where: { role: 'PROCUREMENT_OFFICER', isActive: true } });
  await Promise.all(officers.map((o) =>
    notificationService.create({
      userId: o.id,
      title: 'PO Acknowledged',
      message: `Purchase Order ${po.poNumber} has been acknowledged by the supplier.`,
      type: 'SUCCESS',
      link: `/procurement/purchase-orders/${id}`,
    })
  ));

  sendSuccess(res, updated);
};

export const completePO = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true },
  });
  if (!po) { sendError(res, 'PO not found', 404); return; }
  if (po.status !== 'ACKNOWLEDGED') {
    sendError(res, 'PO must be acknowledged before marking complete', 400); return;
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  await notificationService.create({
    userId: po.supplier.userId,
    title: 'Purchase Order Completed',
    message: `Purchase Order ${po.poNumber} has been marked as completed.`,
    type: 'SUCCESS',
    link: `/supplier/purchase-orders/${id}`,
  });

  sendSuccess(res, updated);
};

export const updatePODetails = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { deliveryAddress, deliveryDate, terms } = req.body;

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) { sendError(res, 'PO not found', 404); return; }
  if (po.status !== 'DRAFT') { sendError(res, 'Only DRAFT POs can be edited', 400); return; }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      deliveryAddress,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      terms,
    },
  });
  sendSuccess(res, updated);
};
