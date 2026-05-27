'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2, Clock, DollarSign, Users, FileText,
  Package, Cpu, Hammer, Briefcase, Wrench, ShoppingCart, Zap,
  ArrowRight, Flame, Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const STATUSES = ['', 'DRAFT', 'OPEN', 'EVALUATION', 'AWARDED', 'CLOSED', 'CANCELLED'];

const CARD_ACCENTS = [
  'from-blue-600 via-blue-500 to-cyan-400',
  'from-violet-600 via-purple-500 to-indigo-500',
  'from-emerald-600 via-teal-500 to-green-400',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-rose-600 via-pink-500 to-red-400',
  'from-cyan-600 via-sky-500 to-blue-400',
  'from-fuchsia-600 via-purple-500 to-pink-400',
];
const CATEGORY_ICONS = [Package, Cpu, Hammer, Briefcase, Wrench, ShoppingCart, Zap];

const accentFor = (cat?: string) => CARD_ACCENTS[(cat?.charCodeAt(0) ?? 0) % CARD_ACCENTS.length];
const iconFor = (cat?: string): React.ComponentType<{ className?: string }> =>
  CATEGORY_ICONS[(cat?.charCodeAt(0) ?? 0) % CATEGORY_ICONS.length];

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

type RFQItem = {
  id: string; title: string; deadline: string; status: string;
  visibility: string; category?: string; budget?: number; currency?: string;
  createdAt?: string; _count: { bids: number }; organization: { name: string; slug: string };
};

export default function RFQsPage() {
  const { user } = useAuth();
  const params = useParams();
  const slug = params.slug as string;
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const isSupplier = user?.organization?.type === 'SUPPLIER_COMPANY';

  const { data, isLoading } = useQuery({
    queryKey: ['rfqs', status, search],
    queryFn: () =>
      api.get('/rfqs', { params: { status: status || undefined, search: search || undefined } })
        .then((r) => r.data.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/rfqs/${id}/publish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rfqs'] }); toast({ title: 'RFQ Published' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  const rfqs: RFQItem[] = data?.rfqs ?? [];
  const openCount = rfqs.filter((r) => r.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* ── Hero banner ── */}
      <div
        className="rounded-2xl overflow-hidden relative p-8"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e1b4b 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="absolute -top-10 right-0 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-40 h-40 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 text-sm font-medium uppercase tracking-wider">
                {isSupplier ? 'Marketplace' : 'Procurement'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {isSupplier ? 'Browse Open RFQs' : 'Request for Quotations'}
            </h1>
            <p className="text-slate-400 mt-1 text-sm max-w-md">
              {isSupplier
                ? 'Discover and bid on procurement opportunities from verified buyers'
                : 'Manage your procurement requests and evaluate supplier bids'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {!isLoading && (
              <>
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-center min-w-[72px]">
                  <div className="text-2xl font-bold text-white">{openCount}</div>
                  <div className="text-xs text-slate-400">Open</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-center min-w-[72px]">
                  <div className="text-2xl font-bold text-white">{rfqs.length}</div>
                  <div className="text-xs text-slate-400">Total</div>
                </div>
              </>
            )}
            {!isSupplier && (
              <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold shadow-lg shadow-cyan-500/25">
                <Link href={`/org/${slug}/rfqs/new`}>+ Create RFQ</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <input
          placeholder="Search RFQs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {(status || search) && (
          <button onClick={() => { setStatus(''); setSearch(''); }} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        /* ── Skeleton ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-2xl overflow-hidden border">
              <div className="h-28 bg-muted animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 bg-muted animate-pulse rounded-full" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-14 bg-muted animate-pulse rounded-xl" />
                  <div className="h-14 bg-muted animate-pulse rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isSupplier ? (
        /* ── Supplier: card grid ── */
        rfqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">No RFQs found</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new procurement opportunities.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {rfqs.map((rfq) => {
              const accent = accentFor(rfq.category);
              const CategoryIcon = iconFor(rfq.category);
              const days = daysUntil(rfq.deadline);
              const isNew = rfq.createdAt
                ? Date.now() - new Date(rfq.createdAt).getTime() < 86_400_000 * 2
                : false;
              return (
                <div
                  key={rfq.id}
                  className="bg-card border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-200 hover:-translate-y-1 flex flex-col group"
                >
                  {/* Gradient header panel */}
                  <div className={`relative h-28 bg-gradient-to-br ${accent} flex items-center justify-center overflow-hidden`}>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
                    />
                    <CategoryIcon className="w-14 h-14 text-white/25" />
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={rfq.status} />
                    </div>
                    {isNew && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5 text-white text-xs font-semibold">
                        <Sparkles className="w-3 h-3 text-yellow-300" /> New
                      </div>
                    )}
                    {days <= 3 && days >= 0 && (
                      <div className="absolute bottom-2.5 right-3 flex items-center gap-1 bg-red-500/90 rounded-full px-2 py-0.5 text-white text-xs font-bold">
                        <Flame className="w-3 h-3" /> Urgent
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full self-start">
                      {rfq.category ?? 'General'}
                    </span>

                    <Link
                      href={`/org/${slug}/rfqs/${rfq.id}`}
                      className="font-bold text-base leading-snug line-clamp-2 flex-1 group-hover:text-primary transition-colors"
                    >
                      {rfq.title}
                    </Link>

                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate text-xs">{rfq.organization?.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/60 rounded-xl p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <DollarSign className="w-3 h-3" /> Budget
                        </div>
                        <p className="font-bold text-sm truncate">
                          {rfq.budget ? formatCurrency(rfq.budget, rfq.currency) : 'Open'}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 ${days <= 7 && days >= 0 ? 'bg-red-50 dark:bg-red-950/40' : 'bg-muted/60'}`}>
                        <div className={`flex items-center gap-1 text-xs mb-1 ${days <= 7 && days >= 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          <Clock className="w-3 h-3" /> Deadline
                        </div>
                        <p className={`font-bold text-sm ${days <= 7 && days >= 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {days < 0 ? 'Expired' : days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : formatDate(rfq.deadline)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-auto">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1 font-medium">
                        <Users className="w-3 h-3" /> {rfq._count.bids} bid{rfq._count.bids !== 1 ? 's' : ''}
                      </span>
                      <Button size="sm" className="gap-1.5 text-xs" asChild>
                        <Link href={`/org/${slug}/rfqs/${rfq.id}`}>
                          View &amp; Bid <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── Buyer: table view ── */
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Bids</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((rfq) => (
                <TableRow key={rfq.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Link href={`/org/${slug}/rfqs/${rfq.id}`} className="text-primary hover:underline font-medium">
                      {rfq.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{rfq.category ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(rfq.deadline)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm font-medium">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />{rfq._count.bids}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={rfq.visibility} /></TableCell>
                  <TableCell><StatusBadge status={rfq.status} /></TableCell>
                  <TableCell>
                    {rfq.status === 'DRAFT' && (
                      <Button size="sm" variant="outline" onClick={() => publishMutation.mutate(rfq.id)}>
                        Publish
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rfqs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No RFQs found. Create your first RFQ to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
