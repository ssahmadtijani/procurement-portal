import { Response } from 'express';
import prisma from '../config/db';
import { sendSuccess } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, userId } = req.user!;

  switch (role) {
    case 'ADMIN': {
      const [
        totalSuppliers,
        pendingSuppliers,
        verifiedSuppliers,
        totalRFQs,
        activeRFQs,
        totalPOs,
        totalInvoices,
        pendingInvoices,
        totalPayments,
      ] = await Promise.all([
        prisma.supplierProfile.count(),
        prisma.supplierProfile.count({ where: { status: 'PENDING' } }),
        prisma.supplierProfile.count({ where: { status: 'VERIFIED' } }),
        prisma.rFQ.count(),
        prisma.rFQ.count({ where: { status: 'OPEN' } }),
        prisma.purchaseOrder.count(),
        prisma.invoice.count(),
        prisma.invoice.count({ where: { status: 'PENDING' } }),
        prisma.payment.aggregate({ _sum: { amount: true } }),
      ]);

      const rfqByStatus = await prisma.rFQ.groupBy({
        by: ['status'],
        _count: { status: true },
      });
      const supplierByCategory = await prisma.supplierProfile.findMany({
        where: { status: 'VERIFIED' },
        select: { categories: true },
      });

      sendSuccess(res, {
        totalSuppliers,
        pendingSuppliers,
        verifiedSuppliers,
        totalRFQs,
        activeRFQs,
        totalPOs,
        totalInvoices,
        pendingInvoices,
        totalPaymentsAmount: totalPayments._sum.amount ?? 0,
        rfqByStatus,
        supplierByCategory,
      });
      break;
    }

    case 'CORPORATE_OFFICE': {
      const corp = await prisma.corporateOffice.findUnique({ where: { userId } });
      const [totalRFQs, openRFQs, awardedRFQs, totalPOs, activePOs] = await Promise.all([
        prisma.rFQ.count({ where: { corporateOfficeId: corp?.id } }),
        prisma.rFQ.count({ where: { corporateOfficeId: corp?.id, status: 'OPEN' } }),
        prisma.rFQ.count({ where: { corporateOfficeId: corp?.id, status: 'AWARDED' } }),
        prisma.purchaseOrder.count({ where: { corporateOfficeId: corp?.id } }),
        prisma.purchaseOrder.count({ where: { corporateOfficeId: corp?.id, status: { in: ['SENT', 'ACKNOWLEDGED'] } } }),
      ]);
      const recentRFQs = await prisma.rFQ.findMany({
        where: { corporateOfficeId: corp?.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { _count: { select: { bids: true } } },
      });
      sendSuccess(res, { totalRFQs, openRFQs, awardedRFQs, totalPOs, activePOs, recentRFQs });
      break;
    }

    case 'SUPPLIER': {
      const sp = await prisma.supplierProfile.findUnique({ where: { userId } });
      const [totalBids, awardedBids, activePOs, pendingInvoices, totalEarnings] = await Promise.all([
        prisma.bid.count({ where: { supplierId: sp?.id } }),
        prisma.bid.count({ where: { supplierId: sp?.id, status: 'AWARDED' } }),
        prisma.purchaseOrder.count({ where: { supplierId: sp?.id, status: { in: ['SENT', 'ACKNOWLEDGED'] } } }),
        prisma.invoice.count({ where: { supplierId: sp?.id, status: 'PENDING' } }),
        prisma.payment.aggregate({
          where: { invoice: { supplierId: sp?.id }, status: 'COMPLETED' },
          _sum: { amount: true },
        }),
      ]);
      const avgRating = await prisma.supplierRating.aggregate({
        where: { supplierId: sp?.id },
        _avg: { score: true },
        _count: { score: true },
      });
      sendSuccess(res, {
        totalBids,
        awardedBids,
        activePOs,
        pendingInvoices,
        totalEarnings: totalEarnings._sum.amount ?? 0,
        averageRating: avgRating._avg.score ?? 0,
        totalRatings: avgRating._count.score,
      });
      break;
    }

    case 'PROCUREMENT_OFFICER': {
      const [openRFQs, evaluationRFQs, pendingBids, totalPOs] = await Promise.all([
        prisma.rFQ.count({ where: { status: 'OPEN' } }),
        prisma.rFQ.count({ where: { status: 'EVALUATION' } }),
        prisma.bid.count({ where: { status: 'SUBMITTED' } }),
        prisma.purchaseOrder.count(),
      ]);
      const recentBids = await prisma.bid.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          rfq: { select: { id: true, title: true } },
          supplier: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      sendSuccess(res, { openRFQs, evaluationRFQs, pendingBids, totalPOs, recentBids });
      break;
    }

    case 'FINANCE': {
      const [pendingInvoices, approvedInvoices, paidInvoices, totalPaid] = await Promise.all([
        prisma.invoice.count({ where: { status: 'PENDING' } }),
        prisma.invoice.count({ where: { status: 'APPROVED' } }),
        prisma.invoice.count({ where: { status: 'PAID' } }),
        prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      ]);
      const recentInvoices = await prisma.invoice.findMany({
        where: { status: 'PENDING' },
        include: {
          supplier: { select: { companyName: true } },
          po: { select: { poNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      sendSuccess(res, {
        pendingInvoices,
        approvedInvoices,
        paidInvoices,
        totalPaidAmount: totalPaid._sum.amount ?? 0,
        recentInvoices,
      });
      break;
    }

    default:
      sendSuccess(res, {});
  }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  const dateFilter = from && to
    ? { gte: new Date(from), lte: new Date(to) }
    : undefined;

  const [pos, invoices, topSuppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      include: {
        supplier: { select: { companyName: true } },
        rfq: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      include: {
        supplier: { select: { companyName: true } },
        po: { select: { poNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierRating.groupBy({
      by: ['supplierId'],
      _avg: { score: true },
      _count: { score: true },
      orderBy: { _avg: { score: 'desc' } },
      take: 10,
    }),
  ]);

  sendSuccess(res, { purchaseOrders: pos, invoices, topSuppliers });
};
