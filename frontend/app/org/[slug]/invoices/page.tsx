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

export default function InvoicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isFinance = user?.role === 'FINANCE';
  const isSupplier = user?.organization?.type === 'SUPPLIER_COMPANY';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ poId: '', amount: '', currency: 'NGN', dueDate: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices').then((r) => r.data.data),
  });

  // Load supplier's eligible POs (ACKNOWLEDGED or COMPLETED)
  const { data: posData } = useQuery({
    queryKey: ['my-pos-for-invoice'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data.data),
    enabled: isSupplier,
  });
  const eligiblePOs = (posData?.purchaseOrders ?? []).filter(
    (po: { status: string }) => ['ACKNOWLEDGED', 'COMPLETED'].includes(po.status)
  );

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Invoice Approved' }); },
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/invoices', {
      poId: form.poId,
      amount: parseFloat(form.amount),
      currency: form.currency,
      dueDate: form.dueDate || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice submitted' });
      setForm({ poId: '', amount: '', currency: 'NGN', dueDate: '', notes: '' });
      setShowForm(false);
    },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        {isSupplier && (
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
            {showForm ? 'Cancel' : '+ Create Invoice'}
          </Button>
        )}
      </div>

      {isSupplier && showForm && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">New Invoice</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Purchase Order</Label>
              <select
                value={form.poId}
                onChange={(e) => setForm({ ...form, poId: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a PO…</option>
                {eligiblePOs.map((po: { id: string; poNumber: string; totalAmount: number; currency: string }) => (
                  <option key={po.id} value={po.id}>{po.poNumber} — {formatCurrency(po.totalAmount, po.currency)}</option>
                ))}
              </select>
              {eligiblePOs.length === 0 && <p className="text-xs text-muted-foreground">No acknowledged or completed POs available.</p>}
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Due Date (optional)</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes…" />
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.poId || !form.amount || createMutation.isPending}
          >
            {createMutation.isPending ? 'Submitting…' : 'Submit Invoice'}
          </Button>
        </div>
      )}
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
