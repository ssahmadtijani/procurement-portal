'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data.data),
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
                <TableHead>Amount</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.pos?.map((po: { id: string; poNumber: string; amount: number; currency: string; status: string; issueDate: string; deliveryDate: string; supplierProfile: { companyName: string } }) => (
                <TableRow key={po.id}>
                  <TableCell>
                    <Link href={`/org/${slug}/purchase-orders/${po.id}`} className="text-primary hover:underline font-medium">
                      {po.poNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{po.supplierProfile?.companyName}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(po.amount, po.currency)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(po.issueDate)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(po.deliveryDate)}</TableCell>
                  <TableCell><StatusBadge status={po.status} /></TableCell>
                </TableRow>
              ))}
              {data?.pos?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchase orders found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
