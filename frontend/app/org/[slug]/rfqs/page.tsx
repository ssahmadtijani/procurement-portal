'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Clock, DollarSign, Users, FileText } from 'lucide-react';
import Link from 'next/link';

const STATUSES = ['', 'DRAFT', 'OPEN', 'EVALUATION', 'AWARDED', 'CLOSED', 'CANCELLED'];

export default function RFQsPage() {
  const { user } = useAuth();
  const params = useParams();
  const slug = params.slug as string;
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const isSupplier = user?.organization?.type === 'SUPPLIER_COMPANY';

  // Deterministic accent colour from category string
  const CARD_ACCENTS = [
    'from-blue-500 to-cyan-500',
    'from-indigo-500 to-purple-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-pink-500',
    'from-violet-500 to-indigo-500',
    'from-cyan-500 to-blue-500',
  ];
  const accentFor = (cat?: string) => CARD_ACCENTS[(cat?.charCodeAt(0) ?? 0) % CARD_ACCENTS.length];

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

  return (
    <div className="space-y-6">
      {/* ── Hero banner ── */}
      <div
        className="rounded-2xl overflow-hidden relative p-8"
        style={{ background: isSupplier
          ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e1b4b 100%)'
          : 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}
      >
        {/* dot-grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 text-sm font-medium uppercase tracking-wider">
                {isSupplier ? 'Marketplace' : 'My RFQs'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {isSupplier ? 'Browse Open RFQs' : 'Request for Quotations'}
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              {isSupplier
                ? 'Discover procurement opportunities from verified buyers'
                : 'Manage your RFQs and evaluate supplier bids'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {data?.rfqs && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                <div className="text-2xl font-bold text-white">{data.rfqs.length}</div>
                <div className="text-xs text-slate-400">{isSupplier ? 'Opportunities' : 'Total RFQs'}</div>
              </div>
            )}
            {!isSupplier && (
              <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold">
                <Link href={`/org/${slug}/rfqs/new`}>+ Create RFQ</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
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
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map((n) => <div key={n} className="h-52 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : isSupplier ? (
        /* ── Supplier: card grid ── */
        <>
          {data?.rfqs?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No open RFQs found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {data?.rfqs?.map((rfq: {
                id: string; title: string; deadline: string; status: string;
                visibility: string; category?: string; budget?: number; currency?: string;
                _count: { bids: number }; organization: { name: string; slug: string };
              }) => (
                <div key={rfq.id} className="bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col">
                  {/* Gradient accent bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${accentFor(rfq.category)}`} />
                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    {/* Category + status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                        {rfq.category ?? 'General'}
                      </span>
                      <StatusBadge status={rfq.status} />
                    </div>

                    {/* Title */}
                    <Link
                      href={`/org/${slug}/rfqs/${rfq.id}`}
                      className="font-semibold text-base hover:text-primary leading-snug line-clamp-2 flex-1"
                    >
                      {rfq.title}
                    </Link>

                    {/* Issuer */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{rfq.organization?.name}</span>
                    </div>

                    {/* Budget + Deadline */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                          <DollarSign className="w-3 h-3" /> Budget
                        </div>
                        <p className="font-semibold text-sm">
                          {rfq.budget ? formatCurrency(rfq.budget, rfq.currency) : '—'}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                          <Clock className="w-3 h-3" /> Deadline
                        </div>
                        <p className="font-semibold text-sm">{formatDate(rfq.deadline)}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1 border-t mt-auto">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> {rfq._count.bids} bid{rfq._count.bids !== 1 ? 's' : ''}
                      </span>
                      <Button size="sm" asChild>
                        <Link href={`/org/${slug}/rfqs/${rfq.id}`}>View &amp; Bid →</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
              {data?.rfqs?.map((rfq: {
                id: string; title: string; deadline: string; status: string;
                visibility: string; category?: string;
                _count: { bids: number }; organization: { name: string; slug: string };
              }) => (
                <TableRow key={rfq.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Link href={`/org/${slug}/rfqs/${rfq.id}`} className="text-primary hover:underline font-medium">
                      {rfq.title}
                    </Link>
                    {rfq.category && <p className="text-xs text-muted-foreground mt-0.5">{rfq.category}</p>}
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
              {data?.rfqs?.length === 0 && (
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
