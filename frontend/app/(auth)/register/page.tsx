'use client';

import { Suspense, useState } from 'react';
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
import { ShoppingBag, CheckCircle2 } from 'lucide-react';

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

function RegisterForm() {
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
    <div className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[40%] relative overflow-hidden flex-col justify-between p-12 sticky top-0 h-screen"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 45%, #1e1b4b 100%)' }}
      >
        <div className="absolute -top-32 -right-32 w-[380px] h-[380px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[380px] h-[380px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">ProcureFlow</span>
        </div>

        {/* Copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Join the Future<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8, #818cf8)' }}
              >
                of Procurement
              </span>
            </h2>
            <p className="mt-3 text-slate-300 text-base leading-relaxed">
              Create your organisation and start connecting with buyers and suppliers today.
            </p>
          </div>

          <div className="space-y-4">
            {[
              'Publish RFQs to a verified supplier network',
              'Streamline bid evaluation and PO management',
              'Manage invoices and payments end-to-end',
              'Real-time spend visibility and compliance reporting',
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-500 text-xs">
          Already have an account?{' '}
          <a href="/login" className="text-cyan-400 hover:underline">Sign in</a>
        </p>
      </div>

      {/* ── Right scrollable form ── */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="min-h-full flex items-start justify-center py-12 px-8">
          <div className="w-full max-w-lg space-y-6">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg text-primary">ProcureFlow</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Create your account</h1>
              <p className="text-sm text-muted-foreground">Get started in minutes — no credit card required</p>
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
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
