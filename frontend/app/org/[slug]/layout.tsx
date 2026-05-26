'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardSidebar } from '@/components/layout/sidebar';
import { DashboardHeader } from '@/components/layout/header';

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    // Redirect PLATFORM_ADMIN away from org routes
    if (!loading && user?.role === 'PLATFORM_ADMIN') {
      router.replace('/platform/dashboard');
    }
    // Ensure user belongs to this org
    if (!loading && user && user.organization?.slug && user.organization.slug !== slug) {
      router.replace(`/org/${user.organization.slug}/dashboard`);
    }
  }, [user, loading, router, slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <DashboardSidebar slug={slug} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
