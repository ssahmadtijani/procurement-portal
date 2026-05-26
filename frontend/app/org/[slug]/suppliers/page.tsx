'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Building2, Star, Globe } from 'lucide-react';

export default function SuppliersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Verified Suppliers</h1>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.suppliers?.map((s: { id: string; companyName: string; category: string; country: string; rating: number; verifiedAt: string; organization: { website: string } }) => (
            <Card key={s.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{s.companyName}</h3>
                  <p className="text-sm text-muted-foreground">{s.category}</p>
                </div>
              </div>
              <div className="text-sm space-y-1">
                {s.country && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {s.country}
                  </p>
                )}
                {s.rating && (
                  <p className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {s.rating.toFixed(1)}
                  </p>
                )}
              </div>
              <StatusBadge status="VERIFIED" />
            </Card>
          ))}
          {data?.suppliers?.length === 0 && (
            <p className="text-muted-foreground col-span-3">No verified suppliers found.</p>
          )}
        </div>
      )}
    </div>
  );
}
