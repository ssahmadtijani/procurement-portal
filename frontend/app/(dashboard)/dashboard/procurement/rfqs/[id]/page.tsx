'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function BidEvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-evaluation', id],
    queryFn: () => api.get(`/rfqs/${id}`).then((r) => r.data.data),
  });

  const shortlist = useMutation({
    mutationFn: (bidId: string) => api.post(`/bids/${bidId}/evaluate`, { action: 'SHORTLIST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rfq-evaluation', id] }); toast({ title: 'Bid shortlisted' }); },
  });

  const award = useMutation({
    mutationFn: (bidId: string) => api.post(`/bids/${bidId}/award`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rfq-evaluation', id] }); toast({ title: 'Bid awarded & PO created!' }); },
  });

  const reject = useMutation({
    mutationFn: ({ bidId, reason }: { bidId: string; reason: string }) => api.post(`/bids/${bidId}/evaluate`, { action: 'REJECT', evaluationNotes: reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rfq-evaluation', id] }); toast({ title: 'Bid rejected' }); },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-muted-foreground">RFQ not found.</p>;

  const { rfq } = data;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Bid Evaluation</h1>
        <p className="text-muted-foreground text-sm">{rfq.rfqNumber} · {rfq.title}</p>
      </div>

      {rfq.bids?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No bids submitted yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Bids ({rfq.bids.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rfq.bids.map((bid: {
                id: string;
                totalAmount: number;
                status: string;
                notes?: string;
                createdAt: string;
                supplier: { companyName: string; id: string };
                items: { id: string; description: string; quantity: number; unitPrice: number; totalPrice: number }[];
              }) => (
                <div key={bid.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{bid.supplier.companyName}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(bid.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{formatCurrency(bid.totalAmount)}</span>
                      <StatusBadge status={bid.status} />
                    </div>
                  </div>

                  {bid.notes && <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">{bid.notes}</p>}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bid.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {bid.status === 'SUBMITTED' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => shortlist.mutate(bid.id)}>Shortlist</Button>
                      <Button size="sm" onClick={() => award.mutate(bid.id)}>Award & Create PO</Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) reject.mutate({ bidId: bid.id, reason });
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {bid.status === 'SHORTLISTED' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => award.mutate(bid.id)}>Award & Create PO</Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) reject.mutate({ bidId: bid.id, reason });
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
