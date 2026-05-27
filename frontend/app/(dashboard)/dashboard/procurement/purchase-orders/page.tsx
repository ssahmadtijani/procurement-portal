'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function ProcurementPOsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-pos'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data.data),
  });

  const send = useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurement-pos'] }); toast({ title: 'PO sent to supplier' }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Purchase Orders</h1>

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
                <TableHead>Actions</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">{po.rfq.title}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(po.totalAmount)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(po.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={po.status} /></TableCell>
                  <TableCell>
                    {po.status === 'DRAFT' && (
                      <Button size="sm" onClick={() => send.mutate(po.id)}>Send to Supplier</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data?.purchaseOrders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No purchase orders yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
