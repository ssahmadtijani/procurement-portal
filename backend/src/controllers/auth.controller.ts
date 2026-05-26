import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/db';
import { hashPassword, comparePassword } from '../utils/password.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.utils';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict' as const,
};

const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ── Register ──────────────────────────────────────────────────────────────────
// Two flows:
//   1. Create new org  → body: { email, password, firstName, lastName, orgName, orgType, orgSlug }
//   2. Join via invite → body: { email, password, firstName, lastName, invitationToken }
export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { email, password, firstName, lastName, phone, invitationToken, orgName, orgType, orgSlug } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    sendError(res, 'Email already registered', 409);
    return;
  }

  const passwordHash = await hashPassword(password);

  // ── Flow 1: Join via invitation ──
  if (invitationToken) {
    const invitation = await prisma.orgInvitation.findUnique({
      where: { token: invitationToken },
      include: { organization: { select: { id: true, name: true, slug: true, type: true } } },
    });

    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      sendError(res, 'Invalid or expired invitation', 400);
      return;
    }
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      sendError(res, 'Email does not match invitation', 400);
      return;
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          role: invitation.role,
          organizationId: invitation.organizationId,
        },
      });
      await tx.orgInvitation.update({
        where: { token: invitationToken },
        data: { acceptedAt: new Date() },
      });
      return newUser;
    });

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organization: invitation.organization,
    }, 'Registration successful', 201);
    return;
  }

  // ── Flow 2: Create new organisation ──
  if (!orgName || !orgType || !orgSlug) {
    sendError(res, 'Provide either an invitationToken or organization details (orgName, orgType, orgSlug)', 400);
    return;
  }

  if (!['BUYER', 'SUPPLIER_COMPANY'].includes(orgType)) {
    sendError(res, 'orgType must be BUYER or SUPPLIER_COMPANY', 400);
    return;
  }

  if (!/^[a-z0-9-]+$/.test(orgSlug)) {
    sendError(res, 'orgSlug must contain only lowercase letters, numbers, and hyphens', 400);
    return;
  }

  const existingOrg = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (existingOrg) {
    sendError(res, 'Organization slug already taken', 409);
    return;
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: orgName, slug: orgSlug, type: orgType, status: 'PENDING', plan: 'FREE' },
    });
    const user = await tx.user.create({
      data: { email, passwordHash, firstName, lastName, phone, role: 'ORG_ADMIN', organizationId: org.id },
    });
    await tx.subscription.create({
      data: {
        organizationId: org.id,
        plan: 'FREE',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });
    return { user, org };
  });

  sendSuccess(res, {
    id: result.user.id,
    email: result.user.email,
    firstName: result.user.firstName,
    lastName: result.user.lastName,
    role: result.user.role,
    organization: {
      id: result.org.id,
      name: result.org.name,
      slug: result.org.slug,
      type: result.org.type,
      status: result.org.status,
    },
  }, 'Registration successful. Your organisation is pending activation.', 201);
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: { select: { id: true, slug: true, type: true, status: true } } },
  });

  if (!user || !user.isActive) {
    sendError(res, 'Invalid credentials', 401);
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    sendError(res, 'Invalid credentials', 401);
    return;
  }

  const payload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    organizationId: user.organizationId ?? undefined,
    orgSlug: user.organization?.slug ?? undefined,
    orgType: user.organization?.type ?? undefined,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setTokenCookies(res, accessToken, refreshToken);

  sendSuccess(res, {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organization: user.organization,
    },
    accessToken,
  });
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) {
    sendError(res, 'Refresh token required', 401);
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { token } });

    if (!stored || stored.expiresAt < new Date()) {
      sendError(res, 'Invalid refresh token', 401);
      return;
    }

    // Rotate: delete old, get fresh user+org data
    await prisma.refreshToken.delete({ where: { token } });

    const freshUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { organization: { select: { id: true, slug: true, type: true } } },
    });

    if (!freshUser || !freshUser.isActive) {
      sendError(res, 'User not found or inactive', 401);
      return;
    }

    const newPayload = {
      userId: freshUser.id,
      role: freshUser.role,
      email: freshUser.email,
      organizationId: freshUser.organizationId ?? undefined,
      orgSlug: freshUser.organization?.slug ?? undefined,
      orgType: freshUser.organization?.type ?? undefined,
    };

    const newAccess = generateAccessToken(newPayload);
    const newRefresh = generateRefreshToken(newPayload);

    await prisma.refreshToken.create({
      data: {
        token: newRefresh,
        userId: freshUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setTokenCookies(res, newAccess, newRefresh);
    sendSuccess(res, { accessToken: newAccess });
  } catch {
    sendError(res, 'Invalid refresh token', 401);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => null);
  }
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
  sendSuccess(res, null, 'Logged out successfully');
};

// ── Me ────────────────────────────────────────────────────────────────────────
export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          plan: true,
          logoUrl: true,
          supplierProfile: { select: { id: true, companyName: true, status: true, categories: true } },
        },
      },
      corporateProfile: { select: { id: true, officeName: true, department: true } },
    },
  });

  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }
  sendSuccess(res, user);
};

// ── Change Password ───────────────────────────────────────────────────────────
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 422, errors.array());
    return;
  }

  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    sendError(res, 'Current password is incorrect', 400);
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
  sendSuccess(res, null, 'Password changed. Please log in again.');
};
