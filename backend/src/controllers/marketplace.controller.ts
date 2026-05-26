import { Request, Response } from 'express';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';

// Public endpoints — no auth required
// Shows PUBLIC + OPEN RFQs as a marketplace browse page

export const listMarketplaceRFQs = async (req: Request, res: Response): Promise<void> => {
  const { category, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = {
    status: 'OPEN',
    visibility: 'PUBLIC',
  };
  if (category) where.category = category;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const [rfqs, total] = await Promise.all([
    prisma.rFQ.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        deadline: true,
        status: true,
        publishedAt: true,
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { bids: true, items: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.rFQ.count({ where }),
  ]);

  sendSuccess(res, { rfqs, total, page: parseInt(page), limit: parseInt(limit) });
};

export const getMarketplaceRFQ = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: {
      items: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!rfq || rfq.status !== 'OPEN' || rfq.visibility !== 'PUBLIC') {
    sendError(res, 'RFQ not found', 404); return;
  }
  sendSuccess(res, rfq);
};

export const listMarketplaceSuppliers = async (req: Request, res: Response): Promise<void> => {
  const { category, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = { status: 'VERIFIED' };
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { country: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.categories = { has: category };

  const [suppliers, total] = await Promise.all([
    prisma.supplierProfile.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        categories: true,
        city: true,
        country: true,
        website: true,
        status: true,
        verifiedAt: true,
        organization: { select: { id: true, name: true, slug: true } },
        ratings: { select: { score: true } },
        _count: { select: { bids: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { companyName: 'asc' },
    }),
    prisma.supplierProfile.count({ where }),
  ]);

  sendSuccess(res, { suppliers, total, page: parseInt(page), limit: parseInt(limit) });
};
