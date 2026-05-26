'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SupplierBidsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-bids'],
    queryFn: () => api.get('/bids/my').then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Bids</h1>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ</TableHead>
                <TableHead>RFQ Number</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.bids?.map((bid: {
                id: string;
                totalAmount: number;
                validUntil?: string;
                status: string;
                createdAt: string;
                rfq: { title: string; rfqNumber: string };
              }) => (
                <TableRow key={bid.id}>
                  <TableCell className="font-medium">{bid.rfq.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{bid.rfq.rfqNumber}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(bid.totalAmount)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(bid.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{bid.validUntil ? formatDate(bid.validUntil) : '–'}</TableCell>
                  <TableCell><StatusBadge status={bid.status} /></TableCell>
                </TableRow>
              ))}
              {data?.bids?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bids submitted yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
