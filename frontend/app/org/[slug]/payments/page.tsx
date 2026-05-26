'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payments</h1>
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
