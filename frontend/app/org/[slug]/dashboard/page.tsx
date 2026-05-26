'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, ShoppingBag, Star, Receipt, TrendingUp, Users, Building2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data.data),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  const role = user?.role;
  const orgType = user?.organization?.type;

  if (role === 'SUPPLIER' || (role === 'ORG_ADMIN' && orgType === 'SUPPLIER_COMPANY')) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Supplier Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Bids" value={data?.totalBids ?? 0} icon={Star} />
          <StatCard title="Awarded Bids" value={data?.awardedBids ?? 0} icon={TrendingUp} color="green" />
          <StatCard title="Active POs" value={data?.activePOs ?? 0} icon={ShoppingBag} />
          <StatCard title="Pending Invoices" value={data?.pendingInvoices ?? 0} icon={Receipt} color="yellow" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.totalEarnings ?? 0)}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Avg Rating</p>
            <p className="text-2xl font-bold">⭐ {(data?.averageRating ?? 0).toFixed(1)} <span className="text-sm text-muted-foreground">({data?.totalRatings ?? 0})</span></p>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'FINANCE') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Finance Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending Invoices" value={data?.pendingInvoices ?? 0} icon={Receipt} color="yellow" />
          <StatCard title="Approved" value={data?.approvedInvoices ?? 0} icon={Receipt} color="green" />
          <StatCard title="Paid" value={data?.paidInvoices ?? 0} icon={Receipt} color="green" />
          <StatCard title="Total Paid" value={formatCurrency(data?.totalPaidAmount ?? 0)} icon={TrendingUp} color="green" />
        </div>
        {data?.recentInvoices?.length > 0 && (
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Pending Invoices</h2>
            {data.recentInvoices.map((inv: { id: string; invoiceNumber: string; supplier: { companyName: string }; po: { poNumber: string }; amount: number }) => (
              <div key={inv.id} className="flex justify-between text-sm">
                <span>{inv.invoiceNumber} — {inv.supplier?.companyName}</span>
                <span className="font-medium">{formatCurrency(inv.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (role === 'PROCUREMENT_OFFICER') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Procurement Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Open RFQs" value={data?.openRFQs ?? 0} icon={FileText} color="blue" />
          <StatCard title="In Evaluation" value={data?.evaluationRFQs ?? 0} icon={FileText} color="purple" />
          <StatCard title="Pending Bids" value={data?.pendingBids ?? 0} icon={Star} />
          <StatCard title="Total POs" value={data?.totalPOs ?? 0} icon={ShoppingBag} />
        </div>
      </div>
    );
  }

  // Default: CORPORATE_OFFICE, ORG_ADMIN (buyer)
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total RFQs" value={data?.totalRFQs ?? 0} icon={FileText} />
        <StatCard title="Open RFQs" value={data?.openRFQs ?? 0} icon={FileText} color="blue" />
        <StatCard title="Awarded" value={data?.awardedRFQs ?? 0} icon={TrendingUp} color="green" />
        <StatCard title="Total POs" value={data?.totalPOs ?? 0} icon={ShoppingBag} />
      </div>
      {data?.recentRFQs?.length > 0 && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Recent RFQs</h2>
          {data.recentRFQs.map((rfq: { id: string; title: string; deadline: string; status: string; _count: { bids: number } }) => (
            <div key={rfq.id} className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{rfq.title}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground">{rfq._count.bids} bids</span>
                <StatusBadge status={rfq.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
