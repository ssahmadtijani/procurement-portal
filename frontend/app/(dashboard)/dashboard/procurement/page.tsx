'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/shared/stat-card';
import { FileText, Star, ShoppingBag, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function ProcurementDashboard() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'procurement'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data.data),
  });

  if (!data) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Procurement Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open RFQs" value={data.openRFQs} icon={FileText} colorClass="bg-blue-100 text-blue-600" />
        <StatCard title="In Evaluation" value={data.evaluationRFQs} icon={Clock} colorClass="bg-purple-100 text-purple-600" />
        <StatCard title="Pending Bids" value={data.pendingBids} icon={Star} colorClass="bg-orange-100 text-orange-600" />
        <StatCard title="Total POs" value={data.totalPOs} icon={ShoppingBag} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bids Awaiting Evaluation</CardTitle>
            <Link href="/dashboard/procurement/rfqs" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentBids?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending bids.</p>
          ) : (
            <div className="space-y-3">
              {data.recentBids?.map((bid: {
                id: string;
                totalAmount: number;
                rfq: { id: string; title: string };
                supplier: { companyName: string; organization: { name: string } };
                createdAt: string;
              }) => (
                <Link
                  key={bid.id}
                  href={`/dashboard/procurement/rfqs/${bid.rfq?.id ?? bid.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{bid.rfq.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {bid.supplier.companyName ?? bid.supplier.organization?.name} · {formatDate(bid.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{formatCurrency(bid.totalAmount)}</span>
                    <StatusBadge status="SUBMITTED" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
