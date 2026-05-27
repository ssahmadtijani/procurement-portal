import { Response } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';

const generateRFQNumber = () =>
  `RFQ-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;

export const createRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const orgId = req.user!.organizationId;
  if (!orgId) { sendError(res, 'Organization context required', 400); return; }

  const { title, description, category, deadline, visibility, budget, currency, items } = req.body;

  const corporateOffice = await prisma.corporateOffice.findUnique({
    where: { userId: req.user!.userId },
  });

  const rfq = await prisma.rFQ.create({
    data: {
      rfqNumber: generateRFQNumber(),
      title,
      description,
      category,
      deadline: new Date(deadline),
      budget: budget ? parseFloat(budget) : undefined,
      currency: currency ?? 'NGN',
      visibility: visibility ?? 'PUBLIC',
      organizationId: orgId,
      createdById: req.user!.userId,
      corporateOfficeId: corporateOffice?.id,
      items: items?.length ? {
        create: (items as Array<{
          itemName: string;
          quantity: number;
          unit?: string;
          specifications?: string;
          estimatedPrice?: number;
        }>).map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          specifications: item.specifications,
          estimatedPrice: item.estimatedPrice,
        })),
      } : undefined,
    },
    include: { items: true },
  });

  sendSuccess(res, rfq, 'RFQ created', 201);
};

export const publishRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const orgId = req.user!.organizationId;

  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: { invitations: { select: { supplierOrgId: true } } },
  });
  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }

  // Org ownership or platform admin
  if (req.user!.role !== 'PLATFORM_ADMIN' && rfq.organizationId !== orgId) {
    sendError(res, 'Forbidden', 403); return;
  }
  if (rfq.status !== 'DRAFT') {
    sendError(res, 'Only DRAFT RFQs can be published', 400); return;
  }

  const updated = await prisma.rFQ.update({
    where: { id },
    data: { status: 'OPEN', publishedAt: new Date() },
  });

  // Determine which supplier orgs to notify
  let targetOrgIds: string[] = [];
  if (rfq.visibility === 'PUBLIC') {
    const verifiedSuppliers = await prisma.supplierProfile.findMany({
      where: { status: 'VERIFIED' },
      select: { organizationId: true },
    });
    targetOrgIds = verifiedSuppliers.map((s) => s.organizationId);
  } else {
    targetOrgIds = rfq.invitations.map((inv) => inv.supplierOrgId);
  }

  if (targetOrgIds.length > 0) {
    const supplierUsers = await prisma.user.findMany({
      where: { organizationId: { in: targetOrgIds }, isActive: true },
      select: { id: true, email: true, firstName: true },
    });

    await Promise.all(
      supplierUsers.map(async (u) => {
        await notificationService.create({
          userId: u.id,
          organizationId: req.user!.organizationId,
          title: 'New RFQ Published',
          message: `A new RFQ "${rfq.title}" is now open for bidding.`,
          type: 'INFO',
          link: `/marketplace/rfqs/${id}`,
        });
        await emailService.sendRFQPublishedEmail(u.email, u.firstName, rfq.title, rfq.deadline);
      })
    );
  }

  sendSuccess(res, updated);
};

export const listRFQs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20', search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const { role, organizationId } = req.user!;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  if (role === 'PLATFORM_ADMIN') {
    // No org filter — sees everything
  } else if (role === 'SUPPLIER' || role === 'ORG_ADMIN' && req.user!.orgType === 'SUPPLIER_COMPANY') {
    // Suppliers see PUBLIC rfqs (any org) + INVITED rfqs for their org, OPEN or above
    where.status = status ? status : { in: ['OPEN', 'EVALUATION', 'AWARDED', 'CLOSED'] };
    where.OR = [
      { visibility: 'PUBLIC' },
      { visibility: 'INVITED', invitations: { some: { supplierOrgId: organizationId } } },
    ];
  } else {
    // BUYER roles: scoped to their org
    where.organizationId = organizationId;
  }

  const [rfqs, total] = await Promise.all([
    prisma.rFQ.findMany({
      where,
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        organization: { select: { id: true, name: true, slug: true } },
        items: true,
        _count: { select: { bids: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rFQ.count({ where }),
  ]);

  sendSuccess(res, { rfqs, total, page: parseInt(page), limit: parseInt(limit) });
};

export const getRFQById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role, organizationId } = req.user!;

  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: {
      items: true,
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      organization: { select: { id: true, name: true, slug: true } },
      corporateOffice: true,
      invitations: { select: { supplierOrgId: true, supplierOrg: { select: { id: true, name: true, slug: true } } } },
      bids: {
        include: {
          supplier: { select: { companyName: true } },
          supplierOrg: { select: { id: true, name: true, slug: true } },
          items: true,
        },
      },
      documents: true,
    },
  });
  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }

  // Access control
  if (role !== 'PLATFORM_ADMIN') {
    const isBuyerOrg = rfq.organizationId === organizationId;
    const isPublic = rfq.visibility === 'PUBLIC';
    const isInvited = rfq.invitations.some((inv) => inv.supplierOrgId === organizationId);
    if (!isBuyerOrg && !isPublic && !isInvited) {
      sendError(res, 'Forbidden', 403); return;
    }
  }

  // Suppliers only see their own bid data
  if (role === 'SUPPLIER' || (role === 'ORG_ADMIN' && req.user!.orgType === 'SUPPLIER_COMPANY')) {
    const supplierProfile = await prisma.supplierProfile.findUnique({
      where: { organizationId: organizationId! },
    });
    rfq.bids = rfq.bids.filter((b) => b.supplierId === supplierProfile?.id) as typeof rfq.bids;
  }

  sendSuccess(res, rfq);
};

export const updateRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { id } = req.params;
  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }
  if (req.user!.role !== 'PLATFORM_ADMIN' && rfq.organizationId !== req.user!.organizationId) {
    sendError(res, 'Forbidden', 403); return;
  }
  if (rfq.status !== 'DRAFT') { sendError(res, 'Only DRAFT RFQs can be updated', 400); return; }

  const { title, description, category, deadline, visibility } = req.body;
  const updated = await prisma.rFQ.update({
    where: { id },
    data: { title, description, category, visibility, deadline: deadline ? new Date(deadline) : undefined },
  });
  sendSuccess(res, updated);
};

export const closeRFQ = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }
  if (req.user!.role !== 'PLATFORM_ADMIN' && rfq.organizationId !== req.user!.organizationId) {
    sendError(res, 'Forbidden', 403); return;
  }
  const updated = await prisma.rFQ.update({ where: { id }, data: { status: 'EVALUATION' } });
  sendSuccess(res, updated);
};

// ── RFQ Invitations (INVITED visibility) ──────────────────────────────────────

export const addRFQInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { supplierOrgId } = req.body;

  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }
  if (req.user!.role !== 'PLATFORM_ADMIN' && rfq.organizationId !== req.user!.organizationId) {
    sendError(res, 'Forbidden', 403); return;
  }

  const supplierOrg = await prisma.organization.findUnique({ where: { id: supplierOrgId } });
  if (!supplierOrg || supplierOrg.type !== 'SUPPLIER_COMPANY') {
    sendError(res, 'Invalid supplier organization', 400); return;
  }

  await prisma.rFQInvitation.upsert({
    where: { rfqId_supplierOrgId: { rfqId: id, supplierOrgId } },
    create: { rfqId: id, supplierOrgId },
    update: {},
  });

  sendSuccess(res, null, 'Supplier invited to RFQ', 201);
};

export const removeRFQInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id, supplierOrgId } = req.params;

  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) { sendError(res, 'RFQ not found', 404); return; }
  if (req.user!.role !== 'PLATFORM_ADMIN' && rfq.organizationId !== req.user!.organizationId) {
    sendError(res, 'Forbidden', 403); return;
  }

  await prisma.rFQInvitation.delete({
    where: { rfqId_supplierOrgId: { rfqId: id, supplierOrgId } },
  }).catch(() => null);

  sendSuccess(res, null, 'Invitation removed');
};
