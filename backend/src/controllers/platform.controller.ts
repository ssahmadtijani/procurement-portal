import { Response } from 'express';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

// All endpoints require PLATFORM_ADMIN role (enforced at router level)

export const getPlatformStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [
    totalOrgs, activeOrgs, totalUsers, activeUsers,
    totalRFQs, openRFQs, totalPOs, totalInvoices,
    pendingSuppliers, totalPayments,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.rFQ.count(),
    prisma.rFQ.count({ where: { status: 'OPEN' } }),
    prisma.purchaseOrder.count(),
    prisma.invoice.count(),
    prisma.supplierProfile.count({ where: { status: 'PENDING' } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);

  const orgsByType = await prisma.organization.groupBy({
    by: ['type'],
    _count: { type: true },
  });
  const rfqsByStatus = await prisma.rFQ.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  sendSuccess(res, {
    totalOrgs, activeOrgs, totalUsers, activeUsers,
    totalRFQs, openRFQs, totalPOs, totalInvoices,
    pendingSuppliers,
    totalVolume: totalPayments._sum.amount ?? 0,
    orgsByType,
    rfqsByStatus,
  });
};

export const listOrganizations = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, status, page = '1', limit = '20', search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: {
        subscription: { select: { plan: true, status: true } },
        _count: { select: { users: true, rfqs: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.organization.count({ where }),
  ]);

  sendSuccess(res, { organizations: orgs, total, page: parseInt(page), limit: parseInt(limit) });
};

export const getOrganizationDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true } },
      subscription: true,
      supplierProfile: true,
      rfqs: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!org) { sendError(res, 'Organization not found', 404); return; }
  sendSuccess(res, org);
};

export const updateOrganizationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const updated = await prisma.organization.update({
    where: { id },
    data: { status },
  });
  sendSuccess(res, updated);
};

export const listPendingSuppliers = async (_req: AuthRequest, res: Response): Promise<void> => {
  const suppliers = await prisma.supplierProfile.findMany({
    where: { status: 'PENDING' },
    include: {
      organization: { select: { id: true, name: true, slug: true, contactEmail: true } },
      documents: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  sendSuccess(res, { suppliers });
};
