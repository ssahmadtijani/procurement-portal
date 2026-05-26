'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/ui/use-toast';

const schema = z.object({
  companyName: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
});
type ProfileForm = z.infer<typeof schema>;

export default function SupplierProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  if (user?.organization?.type !== 'SUPPLIER_COMPANY') {
    return <p className="text-muted-foreground">This page is only for Supplier organisations.</p>;
  }

  const { data: profile, isLoading } = useQuery({
    queryKey: ['supplier-profile-my'],
    queryFn: () => api.get('/suppliers/profile').then((r) => r.data.data).catch(() => null),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (profile) reset(profile);
  }, [profile, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      profile ? api.put('/suppliers/profile', data) : api.post('/suppliers/register', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-profile-my'] }); toast({ title: 'Profile saved' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supplier Profile</h1>
        {profile && <StatusBadge status={profile.verificationStatus ?? 'PENDING'} />}
      </div>
      {!profile && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Complete your supplier profile to appear in the marketplace and receive RFQ invitations.
        </div>
      )}
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Company Name</Label>
            <Input {...register('companyName')} />
          </div>
          <div className="space-y-1">
            <Label>Category / Industry</Label>
            <Input {...register('category')} placeholder="IT Services, Logistics…" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <textarea {...register('description')} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Country</Label><Input {...register('country')} /></div>
          <div className="space-y-1"><Label>Address</Label><Input {...register('address')} /></div>
          <div className="space-y-1"><Label>Phone</Label><Input {...register('phone')} /></div>
          <div className="space-y-1"><Label>Website</Label><Input {...register('website')} placeholder="https://…" /></div>
          <div className="space-y-1"><Label>Tax ID</Label><Input {...register('taxId')} /></div>
          <div className="space-y-1"><Label>Bank Name</Label><Input {...register('bankName')} /></div>
        </div>
        <div className="space-y-1"><Label>Bank Account</Label><Input {...register('bankAccount')} /></div>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : profile ? 'Update Profile' : 'Register as Supplier'}
        </Button>
      </form>
    </div>
  );
}
