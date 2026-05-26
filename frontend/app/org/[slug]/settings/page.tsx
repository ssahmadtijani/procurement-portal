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
import { useToast } from '@/components/ui/use-toast';

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});
type SettingsForm = z.infer<typeof schema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = user?.organizationId;

  const { data: org, isLoading } = useQuery({
    queryKey: ['org', orgId],
    queryFn: () => api.get(`/orgs/${orgId}`).then((r) => r.data.data),
    enabled: !!orgId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (org) reset({
      name: org.name,
      description: org.description ?? '',
      contactEmail: org.contactEmail ?? '',
      contactPhone: org.contactPhone ?? '',
      website: org.website ?? '',
      address: org.address ?? '',
      city: org.city ?? '',
      country: org.country ?? '',
    });
  }, [org, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: SettingsForm) => api.put(`/orgs/${orgId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org', orgId] }); toast({ title: 'Settings saved' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Organisation Settings</h1>
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
        <div className="space-y-1">
          <Label>Organisation Name</Label>
          <Input {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <textarea {...register('description')} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Contact Email</Label>
            <Input type="email" {...register('contactEmail')} />
          </div>
          <div className="space-y-1">
            <Label>Contact Phone</Label>
            <Input {...register('contactPhone')} />
          </div>
          <div className="space-y-1">
            <Label>Website</Label>
            <Input {...register('website')} placeholder="https://…" />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input {...register('address')} />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Input {...register('city')} />
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input {...register('country')} />
          </div>
        </div>
        <Button type="submit" disabled={saveMutation.isPending || user?.role !== 'ORG_ADMIN'}>
          {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
        {user?.role !== 'ORG_ADMIN' && (
          <p className="text-xs text-muted-foreground">Only Organisation Admins can change settings.</p>
        )}
      </form>

      {org && (
        <div className="bg-muted/30 border rounded-lg p-4 text-sm space-y-2">
          <p><span className="text-muted-foreground">Slug: </span><code className="bg-muted px-1 rounded">{org.slug}</code></p>
          <p><span className="text-muted-foreground">Type: </span>{org.type}</p>
          <p><span className="text-muted-foreground">Plan: </span>{org.plan}</p>
        </div>
      )}
    </div>
  );
}
