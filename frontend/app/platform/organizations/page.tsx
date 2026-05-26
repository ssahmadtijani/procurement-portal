'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

export default function PlatformOrgsPage() {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-orgs', type, status],
    queryFn: () =>
      api.get('/platform/organizations', { params: { type: type || undefined, status: status || undefined } })
        .then((r) => r.data.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      api.patch(`/platform/organizations/${id}/status`, { status: newStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-orgs'] }); toast({ title: 'Status updated' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Organisations</h1>
      <div className="flex gap-3">
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none">
          <option value="">All Types</option>
          <option value="BUYER">Buyer</option>
          <option value="SUPPLIER_COMPANY">Supplier</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.organizations?.map((org: { id: string; name: string; slug: string; type: string; plan: string; status: string; createdAt: string; _count: { users: number } }) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link href={`/platform/organizations/${org.id}`} className="text-primary hover:underline font-medium">{org.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{org.slug}</TableCell>
                  <TableCell><StatusBadge status={org.type} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{org.plan}</TableCell>
                  <TableCell>{org._count?.users ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(org.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={org.status} /></TableCell>
                  <TableCell>
                    {org.status === 'ACTIVE' ? (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => statusMutation.mutate({ id: org.id, newStatus: 'SUSPENDED' })}>
                        Suspend
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: org.id, newStatus: 'ACTIVE' })}>
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data?.organizations?.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No organisations found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
