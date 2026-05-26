'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function SupplierRFQsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['open-rfqs', search],
    queryFn: () =>
      api.get('/rfqs', { params: { status: 'OPEN', search: search || undefined } }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Browse Open RFQs</h1>

      <input
        placeholder="Search RFQs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Bid Deadline</TableHead>
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
                office?: { name: string };
              }) => (
                <TableRow key={rfq.id}>
                  <TableCell>
                    <Link href={`/dashboard/supplier/rfqs/${rfq.id}`} className="text-primary hover:underline font-medium">
                      {rfq.rfqNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{rfq.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{rfq.office?.name || '–'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(rfq.bidDeadline)}</TableCell>
                  <TableCell><StatusBadge status={rfq.status} /></TableCell>
                </TableRow>
              ))}
              {data?.rfqs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No open RFQs at the moment.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
