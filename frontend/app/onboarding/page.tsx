'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.organization) {
      router.replace(`/org/${user.organization.slug}/dashboard`);
    }
    if (!loading && user?.role === 'PLATFORM_ADMIN') {
      router.replace('/platform/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.firstName}!</h1>
          <p className="text-muted-foreground mt-2">
            You don&apos;t belong to an organisation yet. Create one to get started, or ask your
            organisation admin to invite you.
          </p>
        </div>
        <div className="space-y-3">
          <Button asChild className="w-full gap-2">
            <Link href="/register">
              Create an Organisation <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/marketplace">Browse Marketplace</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
