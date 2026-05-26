'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const bidSchema = z.object({
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  items: z.array(z.object({
    rfqItemId: z.string(),
    description: z.string().min(1),
    quantity: z.coerce.number().min(1),
    unitPrice: z.coerce.number().min(0.01),
  })).min(1),
});
type BidForm = z.infer<typeof bidSchema>;

export default function SupplierRFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-detail', id],
    queryFn: () => api.get(`/rfqs/${id}`).then((r) => r.data.data),
  });

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<BidForm>({
    resolver: zodResolver(bidSchema),
    defaultValues: { items: [] },
  });

  const { fields, replace } = useFieldArray({ control, name: 'items' });

  // Populate items from RFQ when loaded
  const rfq = data?.rfq;

  const submitBid = useMutation({
    mutationFn: (bid: BidForm) => api.post('/bids', { rfqId: id, ...bid }),
    onSuccess: () => {
      toast({ title: 'Bid submitted!' });
      router.push('/dashboard/supplier/bids');
    },
    onError: () => toast({ title: 'Failed to submit bid', variant: 'destructive' }),
  });

  // Populate items once RFQ loads
  const [initialized, setInitialized] = useState(false);
  if (rfq && !initialized) {
    replace(rfq.items.map((item: { id: string; description: string; quantity: number }) => ({
      rfqItemId: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: 0,
    })));
    setInitialized(true);
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!rfq) return <p className="text-muted-foreground">RFQ not found.</p>;

  const watchItems = watch('items');
  const totalAmount = watchItems.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{rfq.title}</h1>
          <p className="text-muted-foreground text-sm">{rfq.rfqNumber}</p>
        </div>
        <StatusBadge status={rfq.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Bid Deadline:</span> {formatDate(rfq.bidDeadline)}</div>
        {rfq.deliveryAddress && <div><span className="text-muted-foreground">Delivery:</span> {rfq.deliveryAddress}</div>}
      </div>

      {rfq.description && (
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{rfq.description}</p></CardContent>
        </Card>
      )}

      {rfq.status === 'OPEN' && !data.myBid && (
        <form onSubmit={handleSubmit((d) => submitBid.mutate(d))}>
          <Card>
            <CardHeader><CardTitle>Submit Your Bid</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-4 gap-3 items-end border-b pb-3">
                    <div className="col-span-2">
                      <Label className="text-xs">{rfq.items[index]?.description}</Label>
                      <Input {...register(`items.${index}.description`)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" {...register(`items.${index}.quantity`)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" step="0.01" {...register(`items.${index}.unitPrice`)} className="mt-1" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-right font-semibold">
                Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Valid Until</Label>
                  <Input type="date" {...register('validUntil')} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Notes</Label>
                  <textarea
                    {...register('notes')}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Any additional notes or terms…"
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitBid.isPending}>
                {submitBid.isPending ? 'Submitting…' : 'Submit Bid'}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {data.myBid && (
        <Card>
          <CardHeader><CardTitle>Your Bid</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.myBid.totalAmount)}</span>
              <StatusBadge status={data.myBid.status} />
            </div>
            <p className="text-sm text-muted-foreground">Bid already submitted for this RFQ.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
