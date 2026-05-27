'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function SupplierPOsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-pos'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data.data),
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/acknowledge`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-pos'] }); toast({ title: 'PO acknowledged' }); },
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
                <TableHead>RFQ</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.purchaseOrders?.map((po: {
                id: string;
                poNumber: string;
                totalAmount: number;
                deliveryDate?: string;
                status: string;
                rfq: { title: string };
              }) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>{po.rfq.title}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(po.totalAmount)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{po.deliveryDate ? formatDate(po.deliveryDate) : '–'}</TableCell>
                  <TableCell><StatusBadge status={po.status} /></TableCell>
                  <TableCell>
                    {po.status === 'SENT' && (
                      <Button size="sm" onClick={() => acknowledge.mutate(po.id)}>Acknowledge</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data?.purchaseOrders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchase orders yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
