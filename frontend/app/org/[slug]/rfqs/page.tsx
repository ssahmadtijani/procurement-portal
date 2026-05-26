'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
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

  const isBuyer = user?.organization?.type === 'BUYER';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">RFQs</h1>
        {isBuyer && (
          <Button asChild>
            <Link href={`/org/${slug}/rfqs/new`}>+ Create RFQ</Link>
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Bids</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Status</TableHead>
                {isBuyer && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.rfqs?.map((rfq: { id: string; title: string; deadline: string; status: string; visibility: string; _count: { bids: number }; organization: { name: string; slug: string } }) => (
                <TableRow key={rfq.id}>
                  <TableCell>
                    <Link href={`/org/${slug}/rfqs/${rfq.id}`} className="text-primary hover:underline font-medium">
                      {rfq.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{rfq.organization?.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(rfq.deadline)}</TableCell>
                  <TableCell>{rfq._count.bids}</TableCell>
                  <TableCell><StatusBadge status={rfq.visibility} /></TableCell>
                  <TableCell><StatusBadge status={rfq.status} /></TableCell>
                  {isBuyer && (
                    <TableCell>
                      {rfq.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={() => publishMutation.mutate(rfq.id)}>
                          Publish
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {data?.rfqs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No RFQs found.
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
