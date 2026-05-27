'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { Building2, Users, FileText, ShoppingBag, Receipt, Banknote, Clock, CheckCircle } from 'lucide-react';

export default function PlatformReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.get('/platform/stats').then((r) => r.data.data),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Platform Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide analytics across all organisations.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">Organisations</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Orgs" value={data?.totalOrgs ?? 0} icon={Building2} />
          <StatCard title="Active Orgs" value={data?.activeOrgs ?? 0} icon={Building2} color="green" />
          <StatCard title="Total Users" value={data?.totalUsers ?? 0} icon={Users} />
          <StatCard title="Active Users" value={data?.activeUsers ?? 0} icon={Users} color="blue" />
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">Procurement Activity</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total RFQs" value={data?.totalRFQs ?? 0} icon={FileText} />
          <StatCard title="Open RFQs" value={data?.openRFQs ?? 0} icon={FileText} color="blue" />
          <StatCard title="Purchase Orders" value={data?.totalPOs ?? 0} icon={ShoppingBag} />
          <StatCard title="Invoices" value={data?.totalInvoices ?? 0} icon={Receipt} />
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">Financial</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Volume" value={formatCurrency(data?.totalVolume ?? 0)} icon={Banknote} color="green" />
          <StatCard title="Pending Supplier Verifications" value={data?.pendingSuppliers ?? 0} icon={Clock} color="yellow" />
        </div>
      </div>

      {data?.orgsByType?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">Orgs by Type</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.orgsByType.map((g: { type: string; _count: { type: number } }) => (
              <StatCard key={g.type} title={g.type} value={g._count.type} icon={Building2} />
            ))}
          </div>
        </div>
      )}

      {data?.rfqsByStatus?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">RFQs by Status</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.rfqsByStatus.map((g: { status: string; _count: { status: number } }) => (
              <StatCard key={g.status} title={g.status} value={g._count.status} icon={CheckCircle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
