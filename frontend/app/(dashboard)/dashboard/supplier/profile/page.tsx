'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

const schema = z.object({
  companyName: z.string().min(2),
  regNumber: z.string().min(2),
  taxNumber: z.string().optional(),
  address: z.string().min(5),
  city: z.string().min(2),
  country: z.string().min(2),
  phone: z.string().min(7),
  website: z.string().optional(),
  categories: z.string().min(1, 'Enter at least one category'),
  description: z.string().optional(),
});
type ProfileForm = z.infer<typeof schema>;

export default function SupplierProfilePage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-profile'],
    queryFn: () => api.get('/suppliers/profile/me').then((r) => r.data.data).catch(() => null),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (data) {
      reset({
        ...data,
        categories: data.categories?.join(', ') ?? '',
      });
    }
  }, [data, reset]);

  const save = useMutation({
    mutationFn: (formData: ProfileForm) => {
      const payload = { ...formData, categories: formData.categories.split(',').map((c) => c.trim()).filter(Boolean) };
      return data ? api.put('/suppliers/profile', payload) : api.post('/suppliers/profile', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-profile'] });
      toast({ title: 'Profile saved!' });
    },
    onError: () => toast({ title: 'Failed to save profile', variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supplier Profile</h1>
        {data && <StatusBadge status={data.status} />}
      </div>

      {data?.status === 'REJECTED' && data.rejectionNote && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          Rejection reason: {data.rejectionNote}
        </div>
      )}

      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Company Name</Label>
                <Input {...register('companyName')} />
                {errors.companyName && <p className="text-destructive text-xs">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Registration Number</Label>
                <Input {...register('regNumber')} />
                {errors.regNumber && <p className="text-destructive text-xs">{errors.regNumber.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Tax Number</Label>
                <Input {...register('taxNumber')} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input {...register('phone')} />
                {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input {...register('website')} placeholder="https://…" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Address</Label>
              <Input {...register('address')} />
              {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>City</Label>
                <Input {...register('city')} />
                {errors.city && <p className="text-destructive text-xs">{errors.city.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input {...register('country')} />
                {errors.country && <p className="text-destructive text-xs">{errors.country.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Business Categories <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
              <Input {...register('categories')} placeholder="Office Supplies, IT Equipment, Printing" />
              {errors.categories && <p className="text-destructive text-xs">{errors.categories.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Company Description</Label>
              <textarea
                {...register('description')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Brief description of your company and services…"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : data ? 'Update Profile' : 'Create Profile'}
        </Button>
      </form>
    </div>
  );
}
