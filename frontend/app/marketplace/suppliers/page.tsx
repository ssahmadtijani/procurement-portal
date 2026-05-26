'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Building2, Star, Globe } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function MarketplaceSuppliersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-suppliers', search],
    queryFn: () => api.get('/marketplace/suppliers', { params: { search: search || undefined } }).then((r) => r.data.data),
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="bg-primary text-primary-foreground py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link href="/marketplace" className="text-primary-foreground/70 hover:text-primary-foreground text-sm">← Marketplace</Link>
          <h1 className="text-3xl font-bold">Verified Suppliers</h1>
          <div className="relative max-w-md">
            <Input
              className="pl-4 bg-white text-foreground"
              placeholder="Search suppliers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.suppliers?.map((s: { id: string; companyName: string; category: string; country: string; rating: number; description: string }) => (
              <Card key={s.id} className="p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{s.companyName}</h3>
                    <p className="text-sm text-muted-foreground">{s.category}</p>
                  </div>
                </div>
                {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                <div className="flex items-center justify-between text-sm">
                  {s.country && <span className="text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />{s.country}</span>}
                  {s.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />{s.rating.toFixed(1)}</span>}
                </div>
              </Card>
            ))}
            {data?.suppliers?.length === 0 && (
              <p className="text-muted-foreground col-span-3 text-center py-12">No verified suppliers found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
