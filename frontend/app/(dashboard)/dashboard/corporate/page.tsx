'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/shared/stat-card';
import { FileText, ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function CorporateDashboard() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'corporate'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data.data),
  });

  if (!data) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Corporate Office Dashboard</h1>
        <Link
          href="/dashboard/corporate/rfqs/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          + Create RFQ
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total RFQs" value={data.totalRFQs} icon={FileText} />
        <StatCard title="Open RFQs" value={data.openRFQs} icon={Clock} colorClass="bg-blue-100 text-blue-600" />
        <StatCard title="Awarded RFQs" value={data.awardedRFQs} icon={CheckCircle} colorClass="bg-green-100 text-green-600" />
        <StatCard title="Purchase Orders" value={data.totalPOs} icon={ShoppingBag} />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent RFQs</CardTitle></CardHeader>
        <CardContent>
          {data.recentRFQs?.length === 0 && (
            <p className="text-muted-foreground text-sm">No RFQs yet. Create your first RFQ.</p>
          )}
          <div className="space-y-3">
            {data.recentRFQs?.map((rfq: { id: string; title: string; status: string; deadline: string; _count: { bids: number } }) => (
              <Link
                key={rfq.id}
                href={`/dashboard/corporate/rfqs/${rfq.id}`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{rfq.title}</p>
                  <p className="text-xs text-muted-foreground">Deadline: {formatDate(rfq.deadline)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{rfq._count.bids} bids</span>
                  <StatusBadge status={rfq.status} />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
