'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const invoiceSchema = z.object({
  poId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});
type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function SupplierInvoicesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-invoices'],
    queryFn: () => api.get('/invoices').then((r) => r.data.data),
  });

  const { data: posData } = useQuery({
    queryKey: ['supplier-pos-for-invoice'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data.data),
    enabled: showForm,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
  });

  const create = useMutation({
    mutationFn: (d: InvoiceForm) => api.post('/invoices', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-invoices'] });
      toast({ title: 'Invoice submitted!' });
      reset();
      setShowForm(false);
    },
    onError: () => toast({ title: 'Failed to submit invoice', variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Submit Invoice'}
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          <h2 className="font-semibold">New Invoice</h2>
          <form onSubmit={handleSubmit((d) => create.mutate(d))} className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Purchase Order</Label>
              <select
                {...register('poId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select PO…</option>
                {posData?.purchaseOrders?.filter((po: { status: string }) => ['ACKNOWLEDGED', 'COMPLETED'].includes(po.status)).map((po: { id: string; poNumber: string; totalAmount: number }) => (
                  <option key={po.id} value={po.id}>{po.poNumber} — {formatCurrency(po.totalAmount)}</option>
                ))}
              </select>
              {errors.poId && <p className="text-destructive text-xs">{errors.poId.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input type="date" {...register('dueDate')} />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <textarea
                {...register('notes')}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Submitting…' : 'Submit Invoice'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.invoices?.map((inv: {
                id: string;
                invoiceNumber: string;
                amount: number;
                dueDate?: string;
                status: string;
                po: { poNumber: string };
              }) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.po.poNumber}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{inv.dueDate ? formatDate(inv.dueDate) : '–'}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                </TableRow>
              ))}
              {data?.invoices?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No invoices yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
