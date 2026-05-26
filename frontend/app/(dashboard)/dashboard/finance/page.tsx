'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/shared/stat-card';
import { Receipt, CreditCard, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import Link from 'next/link';

export default function FinanceDashboard() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'finance'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data.data),
  });

  if (!data) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finance Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Invoices" value={data.pendingInvoices} icon={Clock} colorClass="bg-orange-100 text-orange-600" />
        <StatCard title="Approved Invoices" value={data.approvedInvoices} icon={CheckCircle} colorClass="bg-blue-100 text-blue-600" />
        <StatCard title="Paid Invoices" value={data.paidInvoices} icon={Receipt} colorClass="bg-green-100 text-green-600" />
        <StatCard title="Total Paid" value={formatCurrency(data.totalPaidAmount)} icon={CreditCard} colorClass="bg-green-100 text-green-600" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoices Awaiting Approval</CardTitle>
            <Link href="/dashboard/finance/invoices" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentInvoices?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending invoices.</p>
          ) : (
            <div className="space-y-3">
              {data.recentInvoices?.map((inv: {
                id: string;
                invoiceNumber: string;
                amount: number;
                supplier: { companyName: string };
                po: { poNumber: string };
                createdAt: string;
              }) => (
                <Link
                  key={inv.id}
                  href={`/dashboard/finance/invoices/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.supplier.companyName} · PO {inv.po.poNumber} · {formatDate(inv.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{formatCurrency(inv.amount)}</span>
                    <StatusBadge status="PENDING" />
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
