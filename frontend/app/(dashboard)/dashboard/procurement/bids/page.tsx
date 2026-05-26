'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

const STATUSES = ['', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'];

export default function ProcurementBidsPage() {
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-bids', status],
    queryFn: () =>
      api.get('/bids', { params: { status: status || undefined } }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">All Bids</h1>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s || 'All Statuses'}</option>
        ))}
      </select>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.bids?.map((bid: {
                id: string;
                totalAmount: number;
                status: string;
                createdAt: string;
                rfq: { id: string; rfqNumber: string; title: string };
                supplier: { companyName: string };
              }) => (
                <TableRow key={bid.id}>
                  <TableCell>
                    <Link href={`/dashboard/procurement/rfqs/${bid.rfq.id}`} className="text-primary hover:underline font-medium">
                      {bid.rfq.rfqNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">{bid.rfq.title}</p>
                  </TableCell>
                  <TableCell className="text-sm">{bid.supplier.companyName}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(bid.totalAmount)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(bid.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={bid.status} /></TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/procurement/rfqs/${bid.rfq.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Evaluate
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {data?.bids?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No bids found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
