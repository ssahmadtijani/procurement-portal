'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Check } from 'lucide-react';

const PLANS = [
  { id: 'FREE', name: 'Free', price: '₦0/mo', rfqs: 5, members: 3, features: ['5 RFQs/month', '3 members', 'Basic marketplace access'] },
  { id: 'STARTER', name: 'Starter', price: '₦75,000/mo', rfqs: 20, members: 10, features: ['20 RFQs/month', '10 members', 'Marketplace + Invited RFQs', 'Email notifications'] },
  { id: 'PROFESSIONAL', name: 'Professional', price: '₦225,000/mo', rfqs: 100, members: 50, features: ['100 RFQs/month', '50 members', 'Analytics & Reports', 'Priority support'] },
  { id: 'ENTERPRISE', name: 'Enterprise', price: 'Custom', rfqs: -1, members: -1, features: ['Unlimited RFQs', 'Unlimited members', 'Dedicated support', 'Custom integrations'] },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = user?.organizationId;

  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => api.get(`/subscriptions/${orgId}`).then((r) => r.data.data),
    enabled: !!orgId,
  });

  const upgradeMutation = useMutation({
    mutationFn: (plan: string) => api.put(`/subscriptions/${orgId}/plan`, { plan }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscription', orgId] }); toast({ title: 'Plan updated' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const currentPlan = sub?.plan ?? 'FREE';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscription & Billing</h1>
        {sub && <StatusBadge status={sub.status ?? 'ACTIVE'} />}
      </div>

      {sub && (
        <div className="bg-card border rounded-lg p-5 space-y-2 text-sm">
          <p><span className="text-muted-foreground">Current Plan: </span><span className="font-semibold">{sub.plan}</span></p>
          {sub.currentPeriodEnd && <p><span className="text-muted-foreground">Renews: </span>{formatDate(sub.currentPeriodEnd)}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`bg-card border rounded-xl p-5 space-y-4 flex flex-col ${isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              <div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-2xl font-bold text-primary mt-1">{plan.price}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button disabled variant="outline" className="w-full">Current Plan</Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.id === 'ENTERPRISE' ? 'outline' : 'default'}
                  onClick={() => plan.id !== 'ENTERPRISE' && upgradeMutation.mutate(plan.id)}
                  disabled={upgradeMutation.isPending}
                >
                  {plan.id === 'ENTERPRISE' ? 'Contact Sales' : 'Upgrade'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
