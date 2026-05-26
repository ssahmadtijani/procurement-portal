import { Response } from 'express';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const PLAN_LIMITS = {
  FREE:         { maxRFQs: 5,   maxMembers: 3,  label: 'Free' },
  STARTER:      { maxRFQs: 20,  maxMembers: 10, label: 'Starter' },
  PROFESSIONAL: { maxRFQs: 100, maxMembers: 50, label: 'Professional' },
  ENTERPRISE:   { maxRFQs: -1,  maxMembers: -1, label: 'Enterprise' }, // -1 = unlimited
};

export const getSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  const { orgId } = req.params;

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });
  if (!subscription) {
    sendError(res, 'Subscription not found', 404);
    return;
  }

  const [rfqCount, memberCount] = await Promise.all([
    prisma.rFQ.count({ where: { organizationId: orgId } }),
    prisma.user.count({ where: { organizationId: orgId, isActive: true } }),
  ]);

  const limits = PLAN_LIMITS[subscription.plan];
  sendSuccess(res, {
    ...subscription,
    limits,
    usage: { rfqs: rfqCount, members: memberCount },
  });
};

// Plan upgrades are manual (no Stripe in v1). Only PLATFORM_ADMIN can change plans.
export const updatePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  const { orgId } = req.params;
  const { plan, billingCycle } = req.body;

  const validPlans = Object.keys(PLAN_LIMITS);
  if (!validPlans.includes(plan)) {
    sendError(res, `Invalid plan. Must be one of: ${validPlans.join(', ')}`, 400);
    return;
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'ANNUAL' ? 12 : 1));

  const subscription = await prisma.subscription.update({
    where: { organizationId: orgId },
    data: { plan, billingCycle: billingCycle ?? 'MONTHLY', currentPeriodEnd: periodEnd },
  });

  await prisma.organization.update({ where: { id: orgId }, data: { plan } });

  sendSuccess(res, subscription, 'Plan updated');
};
