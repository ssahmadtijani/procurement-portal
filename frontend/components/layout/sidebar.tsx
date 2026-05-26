'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, FileText, ShoppingBag, Receipt,
  CreditCard, Star, Bell, BarChart2, Building2, ChevronRight,
  Globe, Settings, Package, Shield,
} from 'lucide-react';

type NavItem = { label: string; href: string; icon: React.ElementType };

function buildOrgNav(slug: string, role: string, orgType: string): NavItem[] {
  const base = `/org/${slug}`;
  const isBuyer = orgType === 'BUYER';
  const isSupplier = orgType === 'SUPPLIER_COMPANY';

  const shared: NavItem[] = [
    { label: 'Dashboard', href: `${base}/dashboard`, icon: LayoutDashboard },
  ];
  const buyerItems: NavItem[] = [
    { label: 'RFQs', href: `${base}/rfqs`, icon: FileText },
    { label: 'Purchase Orders', href: `${base}/purchase-orders`, icon: ShoppingBag },
    { label: 'Invoices', href: `${base}/invoices`, icon: Receipt },
    { label: 'Payments', href: `${base}/payments`, icon: CreditCard },
    { label: 'Suppliers', href: `${base}/suppliers`, icon: Users },
  ];
  const procurementItems: NavItem[] = [
    { label: 'RFQs', href: `${base}/rfqs`, icon: FileText },
    { label: 'Bids', href: `${base}/bids`, icon: Star },
    { label: 'Purchase Orders', href: `${base}/purchase-orders`, icon: ShoppingBag },
    { label: 'Suppliers', href: `${base}/suppliers`, icon: Users },
  ];
  const financeItems: NavItem[] = [
    { label: 'Invoices', href: `${base}/invoices`, icon: Receipt },
    { label: 'Payments', href: `${base}/payments`, icon: CreditCard },
    { label: 'Reports', href: `${base}/reports`, icon: BarChart2 },
  ];
  const supplierItems: NavItem[] = [
    { label: 'My Profile', href: `${base}/profile`, icon: Building2 },
    { label: 'Browse RFQs', href: `${base}/rfqs`, icon: FileText },
    { label: 'My Bids', href: `${base}/bids`, icon: Star },
    { label: 'Purchase Orders', href: `${base}/purchase-orders`, icon: ShoppingBag },
    { label: 'Invoices', href: `${base}/invoices`, icon: Receipt },
  ];
  const adminItems: NavItem[] = [
    { label: 'Users', href: `${base}/users`, icon: Users },
    { label: 'Settings', href: `${base}/settings`, icon: Settings },
    { label: 'Subscription', href: `${base}/subscription`, icon: Package },
  ];

  if (isSupplier) return [...shared, ...supplierItems, ...adminItems];
  if (isBuyer) {
    if (role === 'CORPORATE_OFFICE') return [...shared, ...buyerItems];
    if (role === 'PROCUREMENT_OFFICER') return [...shared, ...procurementItems];
    if (role === 'FINANCE') return [...shared, ...financeItems];
    // ORG_ADMIN gets everything
    return [...shared, ...buyerItems, ...adminItems];
  }
  return shared;
}

const PLATFORM_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/platform/dashboard', icon: LayoutDashboard },
  { label: 'Organizations', href: '/platform/organizations', icon: Building2 },
  { label: 'Pending Suppliers', href: '/platform/suppliers', icon: Shield },
  { label: 'Reports', href: '/platform/reports', icon: BarChart2 },
];

export function DashboardSidebar({ slug }: { slug?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const isPlatform = user?.role === 'PLATFORM_ADMIN';
  const nav: NavItem[] = isPlatform
    ? PLATFORM_NAV
    : slug
    ? buildOrgNav(slug, user?.role ?? '', user?.organization?.type ?? '')
    : [];

  const orgName = isPlatform ? 'Platform Admin' : user?.organization?.name ?? 'Loading…';
  const orgType = isPlatform ? 'PLATFORM' : user?.organization?.type ?? '';

  return (
    <aside className="w-64 bg-card border-r flex flex-col shrink-0">
      <div className="p-4 border-b space-y-1">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary shrink-0" />
          <h2 className="font-bold text-primary text-sm truncate">{orgName}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {user?.firstName} {user?.lastName} · {orgType.replace(/_/g, ' ')}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
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
              <span className="truncate">{label}</span>
              {active && <ChevronRight className="ml-auto w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-1">
        {!isPlatform && slug && (
          <Link
            href={`/org/${slug}/notifications`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Bell className="w-4 h-4" />
            Notifications
          </Link>
        )}
        <Link
          href="/marketplace"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Globe className="w-4 h-4" />
          Marketplace
        </Link>
      </div>
    </aside>
  );
}
