'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Building2, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function MarketplaceRFQDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['marketplace-rfq', id],
    queryFn: () => api.get(`/marketplace/rfqs/${id}`).then((r) => r.data.data),
  });

  if (isLoading) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (!rfq) return <p className="text-destructive p-8">RFQ not found</p>;

  return (
    <div className="min-h-screen bg-muted/20 py-8">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <Link href="/marketplace" className="text-sm text-primary hover:underline">← Back to Marketplace</Link>

        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold">{rfq.title}</h1>
            <StatusBadge status={rfq.status} />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{rfq.organization?.name}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />Deadline: {formatDate(rfq.deadline)}</span>
            {rfq.budget && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{formatCurrency(rfq.budget, rfq.currency)}</span>}
          </div>
          <p className="text-muted-foreground leading-relaxed">{rfq.description}</p>
        </div>

        {user?.organization?.type === 'SUPPLIER_COMPANY' ? (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center space-y-3">
            <p className="font-semibold">Interested in this RFQ?</p>
            <Button asChild>
              <Link href={`/org/${user.organization.slug}/rfqs/${rfq.id}`}>Submit a Bid</Link>
            </Button>
          </div>
        ) : (
          <div className="bg-muted/30 border rounded-xl p-6 text-center space-y-3">
            <p className="text-muted-foreground">Sign in as a Supplier to submit a bid</p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Create Supplier Account</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
