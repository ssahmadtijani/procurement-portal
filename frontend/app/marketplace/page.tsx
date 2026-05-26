'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Search, Building2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function MarketplacePage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-rfqs', search],
    queryFn: () =>
      api.get('/marketplace/rfqs', { params: { search: search || undefined } })
        .then((r) => r.data.data),
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="text-3xl font-bold">Procurement Marketplace</h1>
          <p className="text-primary-foreground/80">Browse open RFQs from verified buyer organisations</p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-white text-foreground"
              placeholder="Search RFQs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Open RFQs ({data?.rfqs?.length ?? 0})</h2>
          <div className="flex gap-2">
            <Link href="/marketplace/suppliers" className="text-sm text-primary hover:underline">Browse Suppliers →</Link>
          </div>
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
          <div className="space-y-3">
            {data?.rfqs?.map((rfq: { id: string; title: string; description: string; deadline: string; budget: number; currency: string; status: string; organization: { name: string }; _count: { bids: number } }) => (
              <Card key={rfq.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <Link href={`/marketplace/rfqs/${rfq.id}`} className="text-lg font-semibold text-primary hover:underline">
                      {rfq.title}
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-2">{rfq.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{rfq.organization?.name}</span>
                      <span>Deadline: {formatDate(rfq.deadline)}</span>
                      {rfq.budget && <span>Budget: {formatCurrency(rfq.budget, rfq.currency)}</span>}
                      <span>{rfq._count.bids} bids</span>
                    </div>
                  </div>
                  <StatusBadge status={rfq.status} />
                </div>
              </Card>
            ))}
            {data?.rfqs?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No open RFQs found.</p>
                <p className="text-sm mt-1">Check back later or adjust your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
