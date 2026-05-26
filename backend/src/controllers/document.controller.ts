import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

type EntityType = 'SUPPLIER' | 'RFQ' | 'BID' | 'PO' | 'INVOICE';

const entityFkMap: Record<EntityType, string> = {
  SUPPLIER: 'supplierId',
  RFQ: 'rfqId',
  BID: 'bidId',
  PO: 'poId',
  INVOICE: 'invoiceId',
};

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    sendError(res, 'No file uploaded', 400);
    return;
  }

  const { entityType, entityId } = req.body as { entityType: EntityType; entityId: string };
  if (!entityType || !entityId) {
    sendError(res, 'entityType and entityId are required', 400);
    return;
  }

  const fkField = entityFkMap[entityType];
  const doc = await prisma.document.create({
    data: {
      entityType,
      entityId,
      uploadedById: req.user!.userId,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      [fkField]: entityId,
    },
  });

  sendSuccess(res, doc, 'Document uploaded', 201);
};

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const { entityType, entityId } = req.query as { entityType: string; entityId: string };
  const docs = await prisma.document.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, docs);
};

export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) { sendError(res, 'Document not found', 404); return; }

  const filePath = path.resolve(doc.filePath);
  if (!filePath.startsWith(path.resolve(env.uploadDir))) {
    sendError(res, 'Forbidden', 403);
    return;
  }

  if (!fs.existsSync(filePath)) {
    sendError(res, 'File not found on server', 404);
    return;
  }

  res.download(filePath, doc.originalName);
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) { sendError(res, 'Document not found', 404); return; }

  if (doc.uploadedById !== req.user!.userId && req.user!.role !== 'ADMIN') {
    sendError(res, 'Forbidden', 403);
    return;
  }

  const filePath = path.resolve(doc.filePath);
  if (filePath.startsWith(path.resolve(env.uploadDir)) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.document.delete({ where: { id } });
  sendSuccess(res, null, 'Document deleted');
};
