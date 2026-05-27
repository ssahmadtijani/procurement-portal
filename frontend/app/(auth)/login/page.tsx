'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Users, BarChart2, ShoppingBag } from 'lucide-react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please check your credentials.';
      toast({ title: 'Login Failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 45%, #1e1b4b 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        {/* Dot-grid overlay */}
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

        {/* Hero copy + feature bullets */}
        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Streamline Your<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8, #818cf8)' }}
              >
                Procurement
              </span><br />
              Operations
            </h2>
            <p className="mt-4 text-slate-300 text-lg leading-relaxed">
              Connect buyers and suppliers in one powerful, transparent platform.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: FileText, title: 'Smart RFQ Management', desc: 'Create, publish and evaluate requests for quotation effortlessly' },
              { icon: Users, title: 'Verified Supplier Network', desc: 'Discover and onboard trusted suppliers across every category' },
              { icon: BarChart2, title: 'Real-time Analytics', desc: 'Track spend, compliance and supplier performance at a glance' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
          {[
            { value: '500+', label: 'Active Suppliers' },
            { value: '10K+', label: 'RFQs Processed' },
            { value: '₦2B+', label: 'Total Volume' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg text-primary">ProcureFlow</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Create one free
            </Link>
          </p>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>

          <Link
            href="/marketplace"
            className="flex items-center justify-center gap-2 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-cyan-500" />
            Browse Public Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
