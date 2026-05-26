'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatCard } from '@/components/shared/stat-card';
import { Users, FileText, ShoppingBag, Receipt, CreditCard, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data.data),
  });

  if (!data) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading…</div>;

  const rfqChartData = data.rfqByStatus?.map((r: { status: string; _count: { status: number } }) => ({
    name: r.status,
    count: r._count.status,
  })) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Suppliers" value={data.totalSuppliers} icon={Users} />
        <StatCard title="Pending Verification" value={data.pendingSuppliers} icon={AlertCircle} colorClass="bg-yellow-100 text-yellow-600" />
        <StatCard title="Total RFQs" value={data.totalRFQs} icon={FileText} />
        <StatCard title="Active RFQs" value={data.activeRFQs} icon={FileText} colorClass="bg-blue-100 text-blue-600" />
        <StatCard title="Total POs" value={data.totalPOs} icon={ShoppingBag} />
        <StatCard title="Pending Invoices" value={data.pendingInvoices} icon={Receipt} colorClass="bg-orange-100 text-orange-600" />
        <StatCard title="Total Payments" value={formatCurrency(data.totalPaymentsAmount)} icon={CreditCard} colorClass="bg-green-100 text-green-600" />
        <StatCard title="Verified Suppliers" value={data.verifiedSuppliers} icon={Users} colorClass="bg-green-100 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>RFQs by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rfqChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Supplier Status Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Verified', value: data.verifiedSuppliers },
                    { name: 'Pending', value: data.pendingSuppliers },
                    { name: 'Total', value: data.totalSuppliers - data.verifiedSuppliers - data.pendingSuppliers },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
