'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUSES = ['', 'DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'CANCELLED'];

export default function CorporatePurchaseOrdersPage() {
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['corporate-pos', status],
    queryFn: () =>
      api.get('/purchase-orders', { params: { status: status || undefined } }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Purchase Orders</h1>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s || 'All Statuses'}</option>
        ))}
      </select>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>RFQ</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.purchaseOrders?.map((po: {
                id: string;
                poNumber: string;
                totalAmount: number;
                status: string;
                createdAt: string;
                supplier: { companyName: string };
                rfq: { title: string };
              }) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>{po.supplier.companyName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{po.rfq.title}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(po.totalAmount)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(po.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={po.status} /></TableCell>
                </TableRow>
              ))}
              {data?.purchaseOrders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No purchase orders yet.
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
