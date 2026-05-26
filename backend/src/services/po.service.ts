import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/db';
import { Bid, BidItem, RFQItem } from '@prisma/client';

type BidWithDetails = Bid & {
  rfq: {
    id: string;
    title: string;
    corporateOfficeId: string | null;
    items: RFQItem[];
  };
  supplier: { id: string; userId: string };
  items: BidItem[];
};

const generatePONumber = () =>
  `PO-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

export const poService = {
  async createFromBid(bid: BidWithDetails) {
    const poNumber = generatePONumber();

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        rfqId: bid.rfqId,
        bidId: bid.id,
        supplierId: bid.supplierId,
        corporateOfficeId: bid.rfq.corporateOfficeId,
        totalAmount: bid.totalAmount,
        currency: bid.currency,
        status: 'DRAFT',
        items: {
          create: bid.rfq.items.map((rfqItem) => {
            const bidItem = bid.items.find((bi) => bi.rfqItemId === rfqItem.id);
            return {
              itemName: rfqItem.itemName,
              quantity: rfqItem.quantity,
              unit: rfqItem.unit ?? undefined,
              unitPrice: bidItem?.unitPrice ?? 0,
              totalPrice: bidItem?.totalPrice ?? 0,
            };
          }),
        },
      },
      include: { items: true },
    });

    return po;
  },
};
