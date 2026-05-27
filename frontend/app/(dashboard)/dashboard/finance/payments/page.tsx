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

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  paymentMethod: z.string().min(1),
  paymentDate: z.string().min(1),
  referenceNumber: z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

export default function FinancePaymentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then((r) => r.data.data),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['approved-invoices'],
    queryFn: () => api.get('/invoices', { params: { status: 'APPROVED' } }).then((r) => r.data.data),
    enabled: showForm,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
  });

  const record = useMutation({
    mutationFn: (data: PaymentForm) => api.post('/payments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Payment recorded' });
      reset();
      setShowForm(false);
    },
    onError: () => toast({ title: 'Failed to record payment', variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Record Payment'}
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          <h2 className="font-semibold">Record New Payment</h2>
          <form onSubmit={handleSubmit((d) => record.mutate(d))} className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Invoice</Label>
              <select
                {...register('invoiceId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select approved invoice…</option>
                {invoicesData?.invoices?.map((inv: { id: string; invoiceNumber: string; supplier: { companyName: string }; amount: number }) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.supplier.companyName} ({formatCurrency(inv.amount)})
                  </option>
                ))}
              </select>
              {errors.invoiceId && <p className="text-destructive text-xs">{errors.invoiceId.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0.01" {...register('amount')} />
              {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Payment Method</Label>
              <select
                {...register('paymentMethod')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select method…</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
              {errors.paymentMethod && <p className="text-destructive text-xs">{errors.paymentMethod.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Reference Number</Label>
              <Input {...register('referenceNumber')} placeholder="TXN-12345" />
            </div>

            <div className="space-y-1">
              <Label>Payment Date</Label>
              <Input type="date" {...register('paymentDate')} defaultValue={new Date().toISOString().slice(0, 10)} />
              {errors.paymentDate && <p className="text-destructive text-xs">{errors.paymentDate.message}</p>}
            </div>

            <div className="col-span-2">
              <Button type="submit" disabled={record.isPending}>
                {record.isPending ? 'Recording…' : 'Record Payment'}
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
                <TableHead>Supplier</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.payments?.map((p: {
                id: string;
                amount: number;
                paymentMethod: string;
                referenceNumber?: string;
                status: string;
                paymentDate?: string;
                createdAt: string;
                invoice: { invoiceNumber: string; supplier: { companyName: string } };
              }) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.invoice.invoiceNumber}</TableCell>
                  <TableCell>{p.invoice.supplier.companyName}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-sm">{p.paymentMethod.replace('_', ' ')}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.referenceNumber || '–'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(p.paymentDate ?? p.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
              {data?.payments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payments recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
