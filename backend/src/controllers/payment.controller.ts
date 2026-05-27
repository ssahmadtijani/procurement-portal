import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { invoiceId, amount, currency, paymentDate, paymentMethod, referenceNumber, notes } = req.body;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) { sendError(res, 'Invoice not found', 404); return; }
  if (invoice.status !== 'APPROVED') {
    sendError(res, 'Invoice must be approved before recording payment', 400); return;
  }
  if (req.user!.role !== 'PLATFORM_ADMIN' && invoice.buyerOrgId !== req.user!.organizationId) {
    sendError(res, 'Forbidden', 403); return;
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount,
      currency: currency ?? 'NGN',
      paymentDate: new Date(paymentDate),
      paymentMethod,
      referenceNumber,
      notes,
      status: 'COMPLETED',
    },
  });

  // Mark invoice as PAID
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID' } });

  sendSuccess(res, payment, 'Payment recorded', 201);
};

export const listPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const { role, organizationId, orgType } = req.user!;

  const where: Record<string, unknown> = {};
  if (role !== 'PLATFORM_ADMIN') {
    if (orgType === 'SUPPLIER_COMPANY') {
      where.invoice = { supplier: { organizationId } };
    } else {
      where.invoice = { buyerOrgId: organizationId };
    }
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            supplier: { select: { companyName: true } },
            po: { select: { poNumber: true } },
          },
        },
      },
      skip,
      take: parseInt(limit),
      orderBy: { paymentDate: 'desc' },
    }),
    prisma.payment.count({ where }),
  ]);

  sendSuccess(res, { payments, total, page: parseInt(page), limit: parseInt(limit) });
};
