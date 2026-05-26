'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { FileText, ShoppingBag, Receipt, TrendingUp, DollarSign, Users } from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data.data),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      <p className="text-muted-foreground text-sm">Organisation-level summary for current period.</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.totalRFQs !== undefined && (
          <StatCard title="Total RFQs" value={data.totalRFQs} icon={FileText} />
        )}
        {data?.openRFQs !== undefined && (
          <StatCard title="Open RFQs" value={data.openRFQs} icon={FileText} color="blue" />
        )}
        {data?.awardedRFQs !== undefined && (
          <StatCard title="Awarded RFQs" value={data.awardedRFQs} icon={TrendingUp} color="green" />
        )}
        {data?.totalPOs !== undefined && (
          <StatCard title="Purchase Orders" value={data.totalPOs} icon={ShoppingBag} />
        )}
        {data?.completedPOs !== undefined && (
          <StatCard title="Completed POs" value={data.completedPOs} icon={ShoppingBag} color="green" />
        )}
        {data?.pendingInvoices !== undefined && (
          <StatCard title="Pending Invoices" value={data.pendingInvoices} icon={Receipt} color="yellow" />
        )}
        {data?.totalPaidAmount !== undefined && (
          <StatCard title="Total Paid" value={formatCurrency(data.totalPaidAmount)} icon={DollarSign} color="green" />
        )}
        {data?.totalEarnings !== undefined && (
          <StatCard title="Total Earnings" value={formatCurrency(data.totalEarnings)} icon={DollarSign} color="green" />
        )}
        {data?.totalBids !== undefined && (
          <StatCard title="Bids Submitted" value={data.totalBids} icon={Users} />
        )}
        {data?.awardedBids !== undefined && (
          <StatCard title="Bids Won" value={data.awardedBids} icon={TrendingUp} color="green" />
        )}
      </div>
    </div>
  );
}
