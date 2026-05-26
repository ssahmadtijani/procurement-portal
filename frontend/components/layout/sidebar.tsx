'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingBag,
  Receipt,
  CreditCard,
  Star,
  Bell,
  BarChart2,
  Building2,
  ChevronRight,
} from 'lucide-react';

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'Suppliers', href: '/dashboard/admin/suppliers', icon: Users },
    { label: 'Users', href: '/dashboard/admin/users', icon: Building2 },
    { label: 'Reports', href: '/dashboard/admin/reports', icon: BarChart2 },
  ],
  CORPORATE_OFFICE: [
    { label: 'Dashboard', href: '/dashboard/corporate', icon: LayoutDashboard },
    { label: 'RFQs', href: '/dashboard/corporate/rfqs', icon: FileText },
    { label: 'Purchase Orders', href: '/dashboard/corporate/purchase-orders', icon: ShoppingBag },
    { label: 'Suppliers', href: '/dashboard/corporate/suppliers', icon: Users },
  ],
  SUPPLIER: [
    { label: 'Dashboard', href: '/dashboard/supplier', icon: LayoutDashboard },
    { label: 'My Profile', href: '/dashboard/supplier/profile', icon: Building2 },
    { label: 'RFQs', href: '/dashboard/supplier/rfqs', icon: FileText },
    { label: 'My Bids', href: '/dashboard/supplier/bids', icon: Star },
    { label: 'Purchase Orders', href: '/dashboard/supplier/purchase-orders', icon: ShoppingBag },
    { label: 'Invoices', href: '/dashboard/supplier/invoices', icon: Receipt },
  ],
  PROCUREMENT_OFFICER: [
    { label: 'Dashboard', href: '/dashboard/procurement', icon: LayoutDashboard },
    { label: 'RFQs', href: '/dashboard/procurement/rfqs', icon: FileText },
    { label: 'Bids', href: '/dashboard/procurement/bids', icon: Star },
    { label: 'Purchase Orders', href: '/dashboard/procurement/purchase-orders', icon: ShoppingBag },
    { label: 'Suppliers', href: '/dashboard/procurement/suppliers', icon: Users },
  ],
  FINANCE: [
    { label: 'Dashboard', href: '/dashboard/finance', icon: LayoutDashboard },
    { label: 'Invoices', href: '/dashboard/finance/invoices', icon: Receipt },
    { label: 'Payments', href: '/dashboard/finance/payments', icon: CreditCard },
    { label: 'Reports', href: '/dashboard/finance/reports', icon: BarChart2 },
  ],
};

export function DashboardSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const nav = NAV_BY_ROLE[user?.role ?? ''] ?? [];

  return (
    <aside className="w-60 bg-card border-r flex flex-col shrink-0">
      <div className="p-4 border-b">
        <h2 className="font-bold text-primary text-lg">Procurement</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {nav.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href ||
            (pathname.startsWith(href + '/') &&
              !nav.some(
                (item) =>
                  item.href !== href &&
                  (pathname === item.href || pathname.startsWith(item.href + '/'))
              ));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && <ChevronRight className="ml-auto w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Link
          href="/dashboard/notifications"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Bell className="w-4 h-4" />
          Notifications
        </Link>
      </div>
    </aside>
  );
}
