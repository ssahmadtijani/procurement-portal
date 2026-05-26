'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const newOrgSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  orgName: z.string().min(2),
  orgSlug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  orgType: z.enum(['BUYER', 'SUPPLIER_COMPANY']),
});

const joinOrgSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

type NewOrgForm = z.infer<typeof newOrgSchema>;
type JoinOrgForm = z.infer<typeof joinOrgSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'new' | 'join'>(token ? 'join' : 'new');

  const newForm = useForm<NewOrgForm>({
    resolver: zodResolver(newOrgSchema),
    defaultValues: { orgType: 'BUYER' },
  });
  const joinForm = useForm<JoinOrgForm>({ resolver: zodResolver(joinOrgSchema) });

  const onNewOrg = async (data: NewOrgForm) => {
    setLoading(true);
    try {
      await api.post('/auth/register', data);
      toast({ title: 'Account created!', description: 'Please log in.' });
      router.push('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const onJoinOrg = async (data: JoinOrgForm) => {
    setLoading(true);
    try {
      await api.post('/auth/register', { ...data, invitationToken: token });
      toast({ title: 'Account created!', description: 'Please log in.' });
      router.push('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-lg bg-card rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">Procurement Portal</h1>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </div>

        {!token && (
          <div className="flex rounded-lg border overflow-hidden">
            {(['new', 'join'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {m === 'new' ? 'Create Organisation' : 'Join via Invitation'}
              </button>
            ))}
          </div>
        )}

        {mode === 'new' ? (
          <form onSubmit={newForm.handleSubmit(onNewOrg)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input {...newForm.register('firstName')} />
                {newForm.formState.errors.firstName && <p className="text-xs text-destructive">{newForm.formState.errors.firstName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input {...newForm.register('lastName')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...newForm.register('email')} />
              {newForm.formState.errors.email && <p className="text-xs text-destructive">{newForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" {...newForm.register('password')} />
              {newForm.formState.errors.password && <p className="text-xs text-destructive">{newForm.formState.errors.password.message}</p>}
            </div>
            <hr />
            <div className="space-y-1">
              <Label>Organisation Name</Label>
              <Input placeholder="Acme Corp" {...newForm.register('orgName')} />
            </div>
            <div className="space-y-1">
              <Label>Organisation Slug (URL identifier)</Label>
              <Input placeholder="acme-corp" {...newForm.register('orgSlug')} />
              {newForm.formState.errors.orgSlug && <p className="text-xs text-destructive">{newForm.formState.errors.orgSlug.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Organisation Type</Label>
              <select
                {...newForm.register('orgType')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="BUYER">Buyer (Places RFQs)</option>
                <option value="SUPPLIER_COMPANY">Supplier Company (Responds to RFQs)</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create Organisation & Account'}
            </Button>
          </form>
        ) : (
          <form onSubmit={joinForm.handleSubmit(onJoinOrg)} className="space-y-4">
            {token && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                You have been invited to join an organisation. Complete your profile below.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input {...joinForm.register('firstName')} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input {...joinForm.register('lastName')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...joinForm.register('email')} />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" {...joinForm.register('password')} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Join Organisation'}
            </Button>
          </form>
        )}

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
