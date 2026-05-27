'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';
import {
  Search, Building2, Clock, DollarSign, Users, FileText,
  Package, Cpu, Hammer, Briefcase, Wrench, ShoppingCart, Zap,
  ArrowRight, Flame, Sparkles, TrendingUp,
} from 'lucide-react';

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
  id: string; title: string; description: string; deadline: string;
  budget?: number; currency?: string; status: string; category?: string;
  createdAt?: string; _count: { bids: number }; organization: { name: string };
};

export default function MarketplacePage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-rfqs', search],
    queryFn: () =>
      api.get('/marketplace/rfqs', { params: { search: search || undefined } })
        .then((r) => r.data.data),
  });

  const rfqs: RFQItem[] = data?.rfqs ?? [];
  const openCount = rfqs.filter((r) => r.status === 'OPEN').length;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden py-16 px-4"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e1b4b 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute -top-16 right-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-cyan-400 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            Live Procurement Marketplace
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Find Your Next{' '}
            <span style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Contract
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Browse open RFQs from verified buyer organisations and submit competitive bids
          </p>

          {/* Search bar */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white/15 transition"
              placeholder="Search RFQs by title or organisation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Stats row */}
          {!isLoading && (
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{openCount}</div>
                <div className="text-xs text-slate-400">Open RFQs</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{rfqs.length}</div>
                <div className="text-xs text-slate-400">Total Listed</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {rfqs.reduce((s, r) => s + r._count.bids, 0)}
                </div>
                <div className="text-xs text-slate-400">Bids Submitted</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl">Open RFQs</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{openCount} active opportunities</p>
          </div>
          <Link href="/marketplace/suppliers" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
            Browse Suppliers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="rounded-2xl overflow-hidden border bg-card">
                <div className="h-28 bg-muted animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded-full" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-14 bg-muted animate-pulse rounded-xl" />
                    <div className="h-14 bg-muted animate-pulse rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : rfqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">No RFQs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Try a different search term.' : 'Check back later for new opportunities.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  {/* Gradient header */}
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
                      href={`/marketplace/rfqs/${rfq.id}`}
                      className="font-bold text-base leading-snug line-clamp-2 flex-1 group-hover:text-primary transition-colors"
                    >
                      {rfq.title}
                    </Link>

                    <p className="text-xs text-muted-foreground line-clamp-2">{rfq.description}</p>

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
                      <Link
                        href={`/marketplace/rfqs/${rfq.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded-lg"
                      >
                        View RFQ <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
