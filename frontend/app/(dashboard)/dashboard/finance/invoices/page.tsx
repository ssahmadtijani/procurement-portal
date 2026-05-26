'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function FinanceInvoicesPage() {
  const [status, setStatus] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['finance-invoices', status],
    queryFn: () =>
      api.get('/invoices', { params: { status: status || undefined } }).then((r) => r.data.data),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/invoices/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-invoices'] }); toast({ title: 'Invoice approved' }); },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.patch(`/invoices/${id}/reject`, { rejectionNote: reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-invoices'] }); toast({ title: 'Invoice rejected' }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Invoices</h1>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="PAID">Paid</option>
      </select>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.invoices?.map((inv: {
                id: string;
                invoiceNumber: string;
                amount: number;
                dueDate?: string;
                status: string;
                supplier: { companyName: string };
                po: { poNumber: string };
              }) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.supplier.companyName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{inv.po.poNumber}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{inv.dueDate ? formatDate(inv.dueDate) : '–'}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell>
                    {inv.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approve.mutate(inv.id)}>Approve</Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason) reject.mutate({ id: inv.id, reason });
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data?.invoices?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
