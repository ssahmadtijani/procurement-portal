'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function InvoicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isFinance = user?.role === 'FINANCE';

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices').then((r) => r.data.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Invoice Approved' }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Invoices</h1>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                {isFinance && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.invoices?.map((inv: { id: string; invoiceNumber: string; amount: number; currency: string; status: string; createdAt: string; dueDate: string | null; supplier: { organization: { name: string } }; po: { poNumber: string } }) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.supplier?.organization?.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{inv.po?.poNumber}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(inv.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  {isFinance && (
                    <TableCell>
                      {inv.status === 'SUBMITTED' && (
                        <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(inv.id)}>Approve</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {data?.invoices?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No invoices found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
