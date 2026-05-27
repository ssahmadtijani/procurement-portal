'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

export default function PaymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isFinance = user?.role === 'FINANCE' || user?.role === 'ORG_ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    invoiceId: '', amount: '', currency: 'NGN',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Bank Transfer', referenceNumber: '', notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then((r) => r.data.data),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['approved-invoices'],
    queryFn: () => api.get('/invoices?status=APPROVED').then((r) => r.data.data),
    enabled: isFinance,
  });
  const approvedInvoices = invoicesData?.invoices ?? [];

  const recordMutation = useMutation({
    mutationFn: () => api.post('/payments', {
      invoiceId: form.invoiceId,
      amount: parseFloat(form.amount),
      currency: form.currency,
      paymentDate: form.paymentDate,
      paymentMethod: form.paymentMethod,
      referenceNumber: form.referenceNumber || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['approved-invoices'] });
      toast({ title: 'Payment recorded' });
      setForm({ invoiceId: '', amount: '', currency: 'NGN', paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: 'Bank Transfer', referenceNumber: '', notes: '' });
      setShowForm(false);
    },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        {isFinance && (
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
            {showForm ? 'Cancel' : '+ Record Payment'}
          </Button>
        )}
      </div>

      {isFinance && showForm && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Record Payment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Invoice</Label>
              <select
                value={form.invoiceId}
                onChange={(e) => {
                  const inv = approvedInvoices.find((i: { id: string }) => i.id === e.target.value);
                  setForm({ ...form, invoiceId: e.target.value, amount: inv?.amount?.toString() ?? '', currency: inv?.currency ?? 'NGN' });
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select an approved invoice…</option>
                {approvedInvoices.map((inv: { id: string; invoiceNumber: string; amount: number; currency: string; po: { poNumber: string } }) => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.po?.poNumber} — {formatCurrency(inv.amount, inv.currency)}</option>
                ))}
              </select>
              {approvedInvoices.length === 0 && <p className="text-xs text-muted-foreground">No approved invoices awaiting payment.</p>}
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Payment Date</Label>
              <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Bank Transfer</option>
                <option>Cash</option>
                <option>Cheque</option>
                <option>Online</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Reference Number (optional)</Label>
              <Input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="TXN-123…" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <Button onClick={() => recordMutation.mutate()} disabled={!form.invoiceId || !form.amount || recordMutation.isPending}>
            {recordMutation.isPending ? 'Recording…' : 'Record Payment'}
          </Button>
        </div>
      )}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.payments?.map((p: { id: string; referenceNumber: string | null; amount: number; currency: string; paymentMethod: string; status: string; paymentDate: string; invoice: { invoiceNumber: string } }) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.referenceNumber ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.invoice?.invoiceNumber}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.amount, p.currency)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.paymentMethod}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(p.paymentDate)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
              {data?.payments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
