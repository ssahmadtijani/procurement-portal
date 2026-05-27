import { Response } from 'express';
import prisma from '../config/db';
import { sendSuccess } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, organizationId } = req.user!;

  switch (role) {
    case 'PLATFORM_ADMIN': {
      const [
        totalOrgs,
        buyerOrgs,
        supplierOrgs,
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
        prisma.organization.count({ where: { status: 'ACTIVE' } }),
        prisma.organization.count({ where: { type: 'BUYER', status: 'ACTIVE' } }),
        prisma.organization.count({ where: { type: 'SUPPLIER_COMPANY', status: 'ACTIVE' } }),
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

      sendSuccess(res, {
        totalOrgs, buyerOrgs, supplierOrgs,
        totalSuppliers, pendingSuppliers, verifiedSuppliers,
        totalRFQs, activeRFQs,
        totalPOs, totalInvoices, pendingInvoices,
        totalPaymentsAmount: totalPayments._sum.amount ?? 0,
        rfqByStatus,
      });
      break;
    }

    case 'ORG_ADMIN': {
      if (req.user!.orgType === 'SUPPLIER_COMPANY') {
        const sp = await prisma.supplierProfile.findUnique({ where: { organizationId: organizationId! } });
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
          totalBids, awardedBids, activePOs, pendingInvoices,
          totalEarnings: totalEarnings._sum.amount ?? 0,
          averageRating: avgRating._avg.score ?? 0,
          totalRatings: avgRating._count.score,
        });
        break;
      }
      // Buyer ORG_ADMIN falls through to CORPORATE_OFFICE logic
    }
    case 'CORPORATE_OFFICE': {
      const [totalRFQs, openRFQs, awardedRFQs, totalPOs, activePOs] = await Promise.all([
        prisma.rFQ.count({ where: { organizationId: organizationId! } }),
        prisma.rFQ.count({ where: { organizationId: organizationId!, status: 'OPEN' } }),
        prisma.rFQ.count({ where: { organizationId: organizationId!, status: 'AWARDED' } }),
        prisma.purchaseOrder.count({ where: { buyerOrgId: organizationId! } }),
        prisma.purchaseOrder.count({ where: { buyerOrgId: organizationId!, status: { in: ['SENT', 'ACKNOWLEDGED'] } } }),
      ]);
      const recentRFQs = await prisma.rFQ.findMany({
        where: { organizationId: organizationId! },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { _count: { select: { bids: true } } },
      });
      sendSuccess(res, { totalRFQs, openRFQs, awardedRFQs, totalPOs, activePOs, recentRFQs });
      break;
    }

    case 'SUPPLIER': {
      const sp = await prisma.supplierProfile.findUnique({ where: { organizationId: organizationId! } });
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
        totalBids, awardedBids, activePOs, pendingInvoices,
        totalEarnings: totalEarnings._sum.amount ?? 0,
        averageRating: avgRating._avg.score ?? 0,
        totalRatings: avgRating._count.score,
      });
      break;
    }

    case 'PROCUREMENT_OFFICER': {
      const [openRFQs, evaluationRFQs, pendingBids, totalPOs] = await Promise.all([
        prisma.rFQ.count({ where: { organizationId: organizationId!, status: 'OPEN' } }),
        prisma.rFQ.count({ where: { organizationId: organizationId!, status: 'EVALUATION' } }),
        prisma.bid.count({ where: { rfq: { organizationId: organizationId! }, status: 'SUBMITTED' } }),
        prisma.purchaseOrder.count({ where: { buyerOrgId: organizationId! } }),
      ]);
      const recentBids = await prisma.bid.findMany({
        where: { rfq: { organizationId: organizationId! }, status: 'SUBMITTED' },
        include: {
          rfq: { select: { id: true, title: true } },
          supplier: { include: { organization: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      sendSuccess(res, { openRFQs, evaluationRFQs, pendingBids, totalPOs, recentBids });
      break;
    }

    case 'FINANCE': {
      const [pendingInvoices, approvedInvoices, paidInvoices, totalPaid] = await Promise.all([
        prisma.invoice.count({ where: { buyerOrgId: organizationId!, status: 'PENDING' } }),
        prisma.invoice.count({ where: { buyerOrgId: organizationId!, status: 'APPROVED' } }),
        prisma.invoice.count({ where: { buyerOrgId: organizationId!, status: 'PAID' } }),
        prisma.payment.aggregate({
          where: { invoice: { buyerOrgId: organizationId! }, status: 'COMPLETED' },
          _sum: { amount: true },
        }),
      ]);
      const recentInvoices = await prisma.invoice.findMany({
        where: { buyerOrgId: organizationId!, status: 'PENDING' },
        include: {
          supplier: { select: { companyName: true } },
          po: { select: { poNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      sendSuccess(res, {
        pendingInvoices, approvedInvoices, paidInvoices,
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
  const { role, organizationId } = req.user!;

  const dateFilter = from && to ? { gte: new Date(from), lte: new Date(to) } : undefined;

  const orgFilter = role === 'PLATFORM_ADMIN' ? {} : { buyerOrgId: organizationId! };

  const [pos, invoices, topSuppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { ...orgFilter, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      include: {
        supplier: { select: { companyName: true } },
        rfq: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({
      where: { ...orgFilter, ...(dateFilter ? { createdAt: dateFilter } : {}) },
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
