'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

export default function RFQDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const [bidAmount, setBidAmount] = useState('');
  const [bidNotes, setBidNotes] = useState('');

  const isBuyer = user?.organization?.type === 'BUYER';
  const isSupplier = user?.organization?.type === 'SUPPLIER_COMPANY';

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => api.get(`/rfqs/${id}`).then((r) => r.data.data),
  });

  const { data: bids } = useQuery({
    queryKey: ['rfq-bids', id],
    queryFn: () => api.get(`/bids/rfq/${id}`).then((r) => r.data.data),
    enabled: isBuyer,
  });

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/rfqs/${id}/close`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rfq', id] }); toast({ title: 'RFQ Closed' }); },
  });

  const awardMutation = useMutation({
    mutationFn: (bidId: string) => api.post(`/bids/${bidId}/award`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rfq', id] }); toast({ title: 'Bid Awarded! PO created.' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  const bidMutation = useMutation({
    mutationFn: () => api.post('/bids', { rfqId: id, totalAmount: parseFloat(bidAmount), notes: bidNotes }),
    onSuccess: () => { toast({ title: 'Bid submitted' }); setBidAmount(''); setBidNotes(''); router.push(`/org/${slug}/bids`); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!rfq) return <p className="text-destructive">RFQ not found</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{rfq.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{rfq.organization?.name} · Created {formatDate(rfq.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={rfq.visibility} />
          <StatusBadge status={rfq.status} />
        </div>
      </div>

      <div className="bg-card border rounded-lg p-5 space-y-3">
        <p>{rfq.description}</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Deadline: </span>{formatDate(rfq.deadline)}</div>
          {rfq.budget && <div><span className="text-muted-foreground">Budget: </span>{formatCurrency(rfq.budget, rfq.currency)}</div>}
        </div>
      </div>

      {isBuyer && rfq.status === 'OPEN' && (
        <Button variant="outline" onClick={() => closeMutation.mutate()}>Close RFQ</Button>
      )}

      {isBuyer && bids && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Bids ({bids.length})</h2>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  {rfq.status === 'EVALUATION' && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((bid: { id: string; amount: number; currency: string; status: string; notes: string; supplierProfile: { companyName: string } }) => (
                  <TableRow key={bid.id}>
                    <TableCell>{bid.supplierProfile?.companyName}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(bid.amount, bid.currency)}</TableCell>
                    <TableCell><StatusBadge status={bid.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{bid.notes}</TableCell>
                    {rfq.status === 'EVALUATION' && (
                      <TableCell>
                        {bid.status === 'SUBMITTED' && (
                          <Button size="sm" onClick={() => awardMutation.mutate(bid.id)}>Award</Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {bids.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No bids yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {isSupplier && rfq.status === 'OPEN' && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold">Submit Bid</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Bid Amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes / Proposal</label>
              <textarea
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button onClick={() => bidMutation.mutate()} disabled={!bidAmount || bidMutation.isPending}>
              {bidMutation.isPending ? 'Submitting…' : 'Submit Bid'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
