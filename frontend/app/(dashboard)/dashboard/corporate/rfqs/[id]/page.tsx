'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function CorporateRFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => api.get(`/rfqs/${id}`).then((r) => r.data.data),
  });

  const action = useMutation({
    mutationFn: (act: 'publish' | 'close' | 'cancel') =>
      api.patch(`/rfqs/${id}/${act}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rfq', id] });
      toast({ title: 'RFQ updated' });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-muted-foreground">RFQ not found.</p>;

  const { rfq } = data;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{rfq.title}</h1>
          <p className="text-muted-foreground text-sm">{rfq.rfqNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={rfq.status} />
          {rfq.status === 'DRAFT' && (
            <Button onClick={() => action.mutate('publish')}>Publish RFQ</Button>
          )}
          {rfq.status === 'OPEN' && (
            <Button variant="outline" onClick={() => action.mutate('close')}>Close Bidding</Button>
          )}
          {['DRAFT', 'OPEN'].includes(rfq.status) && (
            <Button variant="destructive" onClick={() => action.mutate('cancel')}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Bid Deadline:</span> {formatDateTime(rfq.bidDeadline)}</div>
        {rfq.requiredDeliveryDate && <div><span className="text-muted-foreground">Delivery Date:</span> {formatDate(rfq.requiredDeliveryDate)}</div>}
        {rfq.deliveryAddress && <div><span className="text-muted-foreground">Delivery Address:</span> {rfq.deliveryAddress}</div>}
        <div><span className="text-muted-foreground">Created:</span> {formatDateTime(rfq.createdAt)}</div>
      </div>

      {rfq.description && (
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{rfq.description}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Specifications</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfq.items?.map((item: { id: string; description: string; quantity: number; unit: string; specifications?: string }, i: number) => (
                <TableRow key={item.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.specifications || '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {rfq.bids?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Bids ({rfq.bids.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.bids.map((bid: {
                  id: string;
                  totalAmount: number;
                  status: string;
                  createdAt: string;
                  supplier: { companyName: string };
                }) => (
                  <TableRow key={bid.id}>
                    <TableCell className="font-medium">{bid.supplier.companyName}</TableCell>
                    <TableCell>{formatCurrency(bid.totalAmount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(bid.createdAt)}</TableCell>
                    <TableCell><StatusBadge status={bid.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
