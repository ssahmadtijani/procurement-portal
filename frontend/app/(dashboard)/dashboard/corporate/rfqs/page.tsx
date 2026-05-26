'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const STATUSES = ['', 'DRAFT', 'OPEN', 'EVALUATION', 'AWARDED', 'CLOSED', 'CANCELLED'];

export default function CorporateRFQsPage() {
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rfqs', status],
    queryFn: () =>
      api.get('/rfqs', { params: { status: status || undefined } }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My RFQs</h1>
        <Button asChild>
          <Link href="/dashboard/corporate/rfqs/new">+ Create RFQ</Link>
        </Button>
      </div>

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
                <TableHead>RFQ Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Bids</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.rfqs?.map((rfq: {
                id: string;
                rfqNumber: string;
                title: string;
                bidDeadline: string;
                status: string;
                _count: { bids: number };
              }) => (
                <TableRow key={rfq.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/dashboard/corporate/rfqs/${rfq.id}`} className="text-primary hover:underline font-medium">
                      {rfq.rfqNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{rfq.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(rfq.bidDeadline)}</TableCell>
                  <TableCell>{rfq._count.bids}</TableCell>
                  <TableCell><StatusBadge status={rfq.status} /></TableCell>
                </TableRow>
              ))}
              {data?.rfqs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No RFQs found. <Link href="/dashboard/corporate/rfqs/new" className="text-primary underline">Create one →</Link>
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
