import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';
import { v4 as uuidv4 } from 'uuid';

const generateInvoiceNumber = () =>
  `INV-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;

export const createInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const supplierProfile = await prisma.supplierProfile.findUnique({ where: { organizationId: orgId } });
  if (!supplierProfile) { sendError(res, 'Supplier profile not found', 404); return; }

  const { poId, amount, currency, dueDate, notes } = req.body;

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po || po.supplierId !== supplierProfile.id) {
    sendError(res, 'Purchase order not found', 404); return;
  }
  if (!['ACKNOWLEDGED', 'COMPLETED'].includes(po.status)) {
    sendError(res, 'Invoice can only be submitted for acknowledged or completed POs', 400); return;
  }

  const existing = await prisma.invoice.findFirst({
    where: { poId, supplierId: supplierProfile.id, status: { not: 'REJECTED' } },
  });
  if (existing) { sendError(res, 'An invoice for this PO already exists', 409); return; }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      poId,
      supplierId: supplierProfile.id,
      buyerOrgId: po.buyerOrgId!,
      amount,
      currency: currency ?? 'NGN',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
    },
  });

  // Notify buyer org's finance users
  const financeUsers = await prisma.user.findMany({
    where: { role: 'FINANCE', isActive: true, organizationId: po.buyerOrgId },
  });
  await Promise.all(
    financeUsers.map((f) =>
      notificationService.create({
        userId: f.id,
        organizationId: po.buyerOrgId!,
        title: 'New Invoice Submitted',
        message: `Invoice ${invoice.invoiceNumber} submitted by ${supplierProfile.companyName} for PO ${po.poNumber}.`,
        type: 'INFO',
        link: `/org/${req.user!.orgSlug}/finance/invoices/${invoice.id}`,
      })
    )
  );

  sendSuccess(res, invoice, 'Invoice submitted', 201);
};

export const listInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const { role, organizationId } = req.user!;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (role === 'PLATFORM_ADMIN') {
    // sees everything
  } else if (role === 'SUPPLIER' || (role === 'ORG_ADMIN' && req.user!.orgType === 'SUPPLIER_COMPANY')) {
    const sp = await prisma.supplierProfile.findUnique({ where: { organizationId: organizationId! } });
    if (!sp) { sendSuccess(res, { invoices: [], total: 0, page: parseInt(page), limit: parseInt(limit) }); return; }
    where.supplierId = sp.id;
  } else {
    // FINANCE, CORPORATE_OFFICE, PROCUREMENT_OFFICER, ORG_ADMIN (buyer)
    where.buyerOrgId = organizationId;
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        supplier: { include: { organization: { select: { id: true, name: true, slug: true } } } },
        po: { select: { poNumber: true, totalAmount: true } },
        payments: true,
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.count({ where }),
  ]);

  sendSuccess(res, { invoices, total, page: parseInt(page), limit: parseInt(limit) });
};

export const getInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role, organizationId } = req.user!;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      supplier: { include: { organization: { select: { id: true, name: true, slug: true } } } },
      po: { include: { items: true } },
      payments: true,
      documents: true,
    },
  });
  if (!invoice) { sendError(res, 'Invoice not found', 404); return; }

  // Access control
  if (role !== 'PLATFORM_ADMIN') {
    const orgOk = invoice.buyerOrgId === organizationId;
    const supplierOk = invoice.supplier.organizationId === organizationId;
    if (!orgOk && !supplierOk) { sendError(res, 'Forbidden', 403); return; }
  }

  sendSuccess(res, invoice);
};

export const approveInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action, rejectionNote } = req.body;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      supplier: {
        include: {
          organization: {
            include: {
              users: { where: { isActive: true }, select: { id: true, email: true, firstName: true } },
            },
          },
        },
      },
    },
  });
  if (!invoice) { sendError(res, 'Invoice not found', 404); return; }
  if (invoice.buyerOrgId !== req.user!.organizationId && req.user!.role !== 'PLATFORM_ADMIN') {
    sendError(res, 'Forbidden', 403); return;
  }
  if (invoice.status !== 'PENDING') { sendError(res, 'Invoice is not pending approval', 400); return; }

  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status,
      approvedBy: action === 'APPROVE' ? req.user!.userId : null,
      approvedAt: action === 'APPROVE' ? new Date() : null,
      rejectionNote: action === 'REJECT' ? rejectionNote : null,
    },
  });

  // Notify all active users in the supplier org
  await Promise.all(
    invoice.supplier.organization.users.map(async (u) => {
      await notificationService.create({
        userId: u.id,
        organizationId: invoice.supplier.organizationId,
        title: `Invoice ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: `Invoice ${invoice.invoiceNumber} has been ${status.toLowerCase()}.${status === 'REJECTED' ? ` Reason: ${rejectionNote}` : ''}`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR',
        link: `/org/${invoice.supplier.organization.slug}/invoices/${id}`,
      });
      await emailService.sendInvoiceStatusEmail(u.email, u.firstName, invoice.invoiceNumber, status, rejectionNote);
    })
  );

  sendSuccess(res, updated);
};
