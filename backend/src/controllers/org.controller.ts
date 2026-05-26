import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const getOrg = async (req: AuthRequest, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      supplierProfile: { select: { id: true, companyName: true, status: true, categories: true } },
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true, billingCycle: true } },
      _count: { select: { users: true, rfqs: true } },
    },
  });
  if (!org) {
    sendError(res, 'Organization not found', 404);
    return;
  }
  sendSuccess(res, org);
};

export const getOrgBySlug = async (req: AuthRequest, res: Response): Promise<void> => {
  const { slug } = req.params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true, status: true, plan: true, logoUrl: true },
  });
  if (!org) {
    sendError(res, 'Organization not found', 404);
    return;
  }
  sendSuccess(res, org);
};

export const updateOrg = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }
  const { orgId } = req.params;
  const { name, logoUrl, website, description, contactEmail, contactPhone, address, city, country } = req.body;
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { name, logoUrl, website, description, contactEmail, contactPhone, address, city, country },
  });
  sendSuccess(res, org, 'Organization updated');
};

export const listMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const members = await prisma.user.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  sendSuccess(res, members);
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  const { orgId, userId } = req.params;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.organizationId !== orgId) {
    sendError(res, 'User not found in this organization', 404);
    return;
  }
  if (target.id === req.user!.userId) {
    sendError(res, 'Cannot remove yourself', 400);
    return;
  }
  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  sendSuccess(res, null, 'Member removed');
};

export const listInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const invitations = await prisma.orgInvitation.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, invitations);
};

export const inviteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }
  const { orgId } = req.params;
  const { email, role } = req.body;

  const existingMember = await prisma.user.findFirst({ where: { email, organizationId: orgId, isActive: true } });
  if (existingMember) {
    sendError(res, 'User is already a member of this organization', 409);
    return;
  }

  const pending = await prisma.orgInvitation.findFirst({
    where: { email, organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pending) {
    sendError(res, 'Active invitation already exists for this email', 409);
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.orgInvitation.create({
    data: { organizationId: orgId, email, role, expiresAt },
  });

  // TODO: send invitation email via email service
  sendSuccess(res, { token: invitation.token, email, role, expiresAt }, 'Invitation created', 201);
};

export const validateInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { token } = req.params;
  const invitation = await prisma.orgInvitation.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true, slug: true, type: true } } },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    sendError(res, 'Invalid or expired invitation', 400);
    return;
  }
  sendSuccess(res, {
    email: invitation.email,
    role: invitation.role,
    organization: invitation.organization,
    expiresAt: invitation.expiresAt,
  });
};

export const revokeInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { orgId, invitationId } = req.params;
  const inv = await prisma.orgInvitation.findFirst({ where: { id: invitationId, organizationId: orgId } });
  if (!inv) {
    sendError(res, 'Invitation not found', 404);
    return;
  }
  await prisma.orgInvitation.delete({ where: { id: invitationId } });
  sendSuccess(res, null, 'Invitation revoked');
};
