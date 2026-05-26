'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function PODetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isBuyer = user?.organization?.type === 'BUYER';
  const isSupplier = user?.organization?.type === 'SUPPLIER_COMPANY';

  const { data: po, isLoading } = useQuery({
    queryKey: ['po', id],
    queryFn: () => api.get(`/purchase-orders/${id}`).then((r) => r.data.data),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['po', id] }); toast({ title: 'PO Sent to Supplier' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  const ackMutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/acknowledge`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['po', id] }); toast({ title: 'PO Acknowledged' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['po', id] }); toast({ title: 'PO Completed' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!po) return <p className="text-destructive">PO not found</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{po.poNumber}</h1>
          <p className="text-muted-foreground text-sm">Issued {formatDate(po.issueDate)}</p>
        </div>
        <StatusBadge status={po.status} />
      </div>

      <div className="bg-card border rounded-lg p-5 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Supplier: </span>{po.supplierProfile?.companyName}</div>
        <div><span className="text-muted-foreground">Amount: </span><span className="font-semibold">{formatCurrency(po.amount, po.currency)}</span></div>
        <div><span className="text-muted-foreground">Delivery Date: </span>{formatDate(po.deliveryDate)}</div>
        {po.rfq && <div><span className="text-muted-foreground">RFQ: </span>{po.rfq.title}</div>}
      </div>

      {po.terms && (
        <div className="bg-card border rounded-lg p-5 space-y-2">
          <h2 className="font-semibold">Terms & Conditions</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{po.terms}</p>
        </div>
      )}

      <div className="flex gap-3">
        {isBuyer && po.status === 'DRAFT' && (
          <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
            Send to Supplier
          </Button>
        )}
        {isSupplier && po.status === 'SENT' && (
          <Button onClick={() => ackMutation.mutate()} disabled={ackMutation.isPending}>
            Acknowledge
          </Button>
        )}
        {isBuyer && po.status === 'ACKNOWLEDGED' && (
          <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );
}
