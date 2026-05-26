import { Response } from 'express';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';

export const listPurchaseOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const { role, organizationId } = req.user!;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (role === 'PLATFORM_ADMIN') {
    // no filter
  } else if (role === 'SUPPLIER' || (role === 'ORG_ADMIN' && req.user!.orgType === 'SUPPLIER_COMPANY')) {
    const sp = await prisma.supplierProfile.findUnique({ where: { organizationId: organizationId! } });
    if (!sp) { sendError(res, 'Supplier profile not found', 404); return; }
    where.supplierId = sp.id;
  } else {
    // All buyer roles scoped to their org
    where.buyerOrgId = organizationId;
  }

  const [pos, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { include: { organization: { select: { id: true, name: true, slug: true } } } },
        buyerOrg: { select: { id: true, name: true, slug: true } },
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
  const { role, organizationId } = req.user!;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { include: { organization: { select: { id: true, name: true, slug: true, contactEmail: true } } } },
      buyerOrg: { select: { id: true, name: true, slug: true } },
      supplierOrg: { select: { id: true, name: true, slug: true } },
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

  // Access control
  if (role !== 'PLATFORM_ADMIN') {
    if (po.buyerOrgId !== organizationId && po.supplierOrgId !== organizationId) {
      sendError(res, 'Forbidden', 403); return;
    }
  }

  sendSuccess(res, po);
};

export const sendPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplierOrg: {
        include: {
          users: { where: { isActive: true }, select: { id: true, email: true, firstName: true } },
        },
      },
    },
  });
  if (!po) { sendError(res, 'PO not found', 404); return; }
  if (req.user!.role !== 'PLATFORM_ADMIN' && po.buyerOrgId !== req.user!.organizationId) {
    sendError(res, 'Forbidden', 403); return;
  }
  if (po.status !== 'DRAFT') { sendError(res, 'Only DRAFT POs can be sent', 400); return; }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'SENT', sentAt: new Date() },
  });

  // Notify all active users in the supplier org
  await Promise.all(
    po.supplierOrg!.users.map(async (u) => {
      await notificationService.create({
        userId: u.id,
        organizationId: po.supplierOrgId!,
        title: 'Purchase Order Received',
        message: `Purchase Order ${po.poNumber} has been sent to you. Please acknowledge.`,
        type: 'INFO',
        link: `/org/${po.supplierOrg!.slug}/purchase-orders/${id}`,
      });
      await emailService.sendPOEmail(u.email, u.firstName, po.poNumber);
    })
  );

  sendSuccess(res, updated);
};

export const acknowledgePO = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const sp = await prisma.supplierProfile.findUnique({ where: { organizationId: orgId } });
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });

  if (!po || po.supplierId !== sp?.id) { sendError(res, 'PO not found', 404); return; }
  if (po.status !== 'SENT') { sendError(res, 'PO must be in SENT status to acknowledge', 400); return; }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
  });

  // Notify buyer org's procurement officers
  const officers = await prisma.user.findMany({
    where: { role: 'PROCUREMENT_OFFICER', isActive: true, organizationId: po.buyerOrgId },
  });
  await Promise.all(
    officers.map((o) =>
      notificationService.create({
        userId: o.id,
        organizationId: po.buyerOrgId!,
        title: 'PO Acknowledged',
        message: `Purchase Order ${po.poNumber} has been acknowledged by the supplier.`,
        type: 'SUCCESS',
        link: `/org/${req.user!.orgSlug}/purchase-orders/${id}`,
      })
    )
  );

  sendSuccess(res, updated);
};

export const completePO = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplierOrg: {
        include: {
          users: { where: { isActive: true }, select: { id: true } },
        },
      },
    },
  });
  if (!po) { sendError(res, 'PO not found', 404); return; }
  if (req.user!.role !== 'PLATFORM_ADMIN' && po.buyerOrgId !== req.user!.organizationId) {
    sendError(res, 'Forbidden', 403); return;
  }
  if (po.status !== 'ACKNOWLEDGED') {
    sendError(res, 'PO must be acknowledged before marking complete', 400); return;
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  // Notify supplier org users
  if (po.supplierOrg) {
    await Promise.all(
      po.supplierOrg.users.map((u) =>
        notificationService.create({
          userId: u.id,
          organizationId: po.supplierOrgId!,
          title: 'Purchase Order Completed',
          message: `Purchase Order ${po.poNumber} has been marked as completed.`,
          type: 'SUCCESS',
          link: `/org/${po.supplierOrg!.slug}/purchase-orders/${id}`,
        })
      )
    );
  }

  sendSuccess(res, updated);
};

export const updatePODetails = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { deliveryAddress, deliveryDate, terms } = req.body;

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) { sendError(res, 'PO not found', 404); return; }
  if (req.user!.role !== 'PLATFORM_ADMIN' && po.buyerOrgId !== req.user!.organizationId) {
    sendError(res, 'Forbidden', 403); return;
  }
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
