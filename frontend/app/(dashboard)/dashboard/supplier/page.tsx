'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/shared/stat-card';
import { FileText, Star, ShoppingBag, Receipt, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SupplierDashboard() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'supplier'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data.data),
  });

  const { data: profileData } = useQuery({
    queryKey: ['supplier-profile'],
    queryFn: () => api.get('/suppliers/profile/me').then((r) => r.data.data),
  });

  if (!data) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading…</div>;

  const isPending = profileData?.status === 'PENDING' || !profileData;
  const isRejected = profileData?.status === 'REJECTED';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Supplier Dashboard</h1>

      {!profileData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 font-medium">Complete your supplier profile to start bidding on RFQs.</p>
          <Link href="/dashboard/supplier/profile" className="text-sm text-yellow-700 underline mt-1 block">
            Set up profile →
          </Link>
        </div>
      )}
      {isPending && profileData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">Your profile is pending verification by an administrator.</p>
        </div>
      )}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-medium">Your profile was rejected.</p>
          {profileData?.rejectionNote && (
            <p className="text-sm text-red-700 mt-1">Reason: {profileData.rejectionNote}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Bids" value={data.totalBids} icon={Star} />
        <StatCard title="Awarded Bids" value={data.awardedBids} icon={Star} colorClass="bg-green-100 text-green-600" />
        <StatCard title="Active POs" value={data.activePOs} icon={ShoppingBag} />
        <StatCard title="Pending Invoices" value={data.pendingInvoices} icon={Receipt} colorClass="bg-orange-100 text-orange-600" />
        <StatCard title="Total Earnings" value={formatCurrency(data.totalEarnings)} icon={CreditCard} colorClass="bg-green-100 text-green-600" />
        <StatCard title="Avg Rating" value={`${(data.averageRating ?? 0).toFixed(1)} / 5`} icon={Star} colorClass="bg-yellow-100 text-yellow-600" />
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Browse RFQs', href: '/dashboard/supplier/rfqs' },
            { label: 'My Bids', href: '/dashboard/supplier/bids' },
            { label: 'Purchase Orders', href: '/dashboard/supplier/purchase-orders' },
            { label: 'Invoices', href: '/dashboard/supplier/invoices' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-center p-4 border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors text-center"
            >
              {label}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
