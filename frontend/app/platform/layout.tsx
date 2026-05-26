'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardSidebar } from '@/components/layout/sidebar';
import { DashboardHeader } from '@/components/layout/header';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user && user.role !== 'PLATFORM_ADMIN') {
      if (user.organization) {
        router.replace(`/org/${user.organization.slug}/dashboard`);
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'PLATFORM_ADMIN') return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar slug="platform" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
