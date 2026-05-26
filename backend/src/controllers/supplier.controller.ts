import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';
import { notificationService } from '../services/notification.service';

export const registerSupplierProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const existing = await prisma.supplierProfile.findUnique({ where: { organizationId: orgId } });
  if (existing) {
    sendError(res, 'Supplier profile already exists for this organisation', 409);
    return;
  }

  const { companyName, regNumber, taxId, address, city, country, website, categories, bankName, bankAccount, bankBranch } = req.body;

  const profile = await prisma.supplierProfile.create({
    data: {
      organizationId: orgId,
      companyName,
      regNumber,
      taxId,
      address,
      city,
      country,
      website,
      categories: categories ?? [],
      bankName,
      bankAccount,
      bankBranch,
    },
  });

  // Notify platform admins
  const platformAdmins = await prisma.user.findMany({
    where: { role: 'PLATFORM_ADMIN', isActive: true },
    select: { id: true },
  });
  await Promise.all(
    platformAdmins.map((u) =>
      notificationService.create({
        userId: u.id,
        title: 'New Supplier Registration',
        message: `${companyName} has registered and is awaiting verification.`,
        type: 'INFO',
        link: `/platform/suppliers/${profile.id}`,
      })
    )
  );

  sendSuccess(res, profile, 'Supplier profile created', 201);
};

export const getMySupplierProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const profile = await prisma.supplierProfile.findUnique({
    where: { organizationId: orgId },
    include: {
      organization: { select: { id: true, name: true, slug: true, contactEmail: true } },
      documents: true,
    },
  });
  if (!profile) { sendError(res, 'Profile not found', 404); return; }
  sendSuccess(res, profile);
};

export const updateSupplierProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const profile = await prisma.supplierProfile.findUnique({ where: { organizationId: orgId } });
  if (!profile) { sendError(res, 'Profile not found', 404); return; }

  const { companyName, taxId, address, city, country, website, categories, bankName, bankAccount, bankBranch } = req.body;
  const updated = await prisma.supplierProfile.update({
    where: { organizationId: orgId },
    data: { companyName, taxId, address, city, country, website, categories, bankName, bankAccount, bankBranch },
  });
  sendSuccess(res, updated);
};

// ── Platform-admin endpoints ────────────────────────────────────────────────

export const listSuppliers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20', search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { regNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplierProfile.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true, contactEmail: true } },
        _count: { select: { bids: true, purchaseOrders: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierProfile.count({ where }),
  ]);

  sendSuccess(res, { suppliers, total, page: parseInt(page), limit: parseInt(limit) });
};

export const getSupplierById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const supplier = await prisma.supplierProfile.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true, slug: true, contactEmail: true, contactPhone: true } },
      documents: true,
      ratings: true,
    },
  });
  if (!supplier) { sendError(res, 'Supplier not found', 404); return; }
  sendSuccess(res, supplier);
};

export const verifySupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action, rejectionNote } = req.body;

  const supplier = await prisma.supplierProfile.findUnique({
    where: { id },
    include: { organization: { include: { users: { where: { isActive: true }, select: { id: true, email: true, firstName: true } } } } },
  });
  if (!supplier) { sendError(res, 'Supplier not found', 404); return; }

  const status = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
  const updated = await prisma.supplierProfile.update({
    where: { id },
    data: {
      status,
      rejectionNote: action === 'REJECT' ? rejectionNote : null,
      verifiedAt: action === 'VERIFY' ? new Date() : null,
      verifiedBy: action === 'VERIFY' ? req.user!.userId : null,
    },
  });

  // Notify all active users in the supplier org
  await Promise.all(
    supplier.organization.users.map(async (u) => {
      await notificationService.create({
        userId: u.id,
        organizationId: supplier.organizationId,
        title: status === 'VERIFIED' ? 'Profile Verified' : 'Profile Rejected',
        message:
          status === 'VERIFIED'
            ? 'Your supplier profile has been verified. You can now bid on RFQs.'
            : `Your supplier profile was rejected. Reason: ${rejectionNote ?? 'N/A'}`,
        type: status === 'VERIFIED' ? 'SUCCESS' : 'ERROR',
        link: `/org/${supplier.organization.slug}/supplier/profile`,
      });
      await emailService.sendSupplierVerificationEmail(u.email, u.firstName, status, rejectionNote);
    })
  );

  sendSuccess(res, updated);
};

export const getVerifiedSuppliers = async (_req: AuthRequest, res: Response): Promise<void> => {
  const suppliers = await prisma.supplierProfile.findMany({
    where: { status: 'VERIFIED' },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { companyName: 'asc' },
  });
  sendSuccess(res, suppliers);
};
