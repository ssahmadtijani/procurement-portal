'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/shared/stat-card';
import { Building2, Users, FileText, ShoppingBag, Star, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.get('/platform/stats').then((r) => r.data.data),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Organisations" value={data?.totalOrgs ?? 0} icon={Building2} />
        <StatCard title="Buyer Orgs" value={data?.buyerOrgs ?? 0} icon={Building2} color="blue" />
        <StatCard title="Supplier Orgs" value={data?.supplierOrgs ?? 0} icon={Building2} color="green" />
        <StatCard title="Total Users" value={data?.totalUsers ?? 0} icon={Users} />
        <StatCard title="Total RFQs" value={data?.totalRFQs ?? 0} icon={FileText} />
        <StatCard title="Active RFQs" value={data?.activeRFQs ?? 0} icon={FileText} color="blue" />
        <StatCard title="Purchase Orders" value={data?.totalPOs ?? 0} icon={ShoppingBag} />
        <StatCard title="Pending Verifications" value={data?.pendingVerifications ?? 0} icon={Star} color="yellow" />
      </div>
      {data?.totalTransactionValue !== undefined && (
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Transaction Value</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalTransactionValue)}</p>
        </div>
      )}
    </div>
  );
}
