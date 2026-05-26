'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminSuppliersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-suppliers', search, statusFilter],
    queryFn: () =>
      api
        .get('/suppliers', { params: { search: search || undefined, status: statusFilter || undefined } })
        .then((r) => r.data.data),
  });

  const verify = useMutation({
    mutationFn: ({ id, action, rejectionNote }: { id: string; action: string; rejectionNote?: string }) =>
      api.post(`/suppliers/${id}/verify`, { action, rejectionNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast({ title: 'Supplier status updated' });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Supplier Management</h1>

      <div className="flex gap-3">
        <input
          placeholder="Search by name or reg number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Reg Number</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.suppliers?.map((s: {
                id: string;
                companyName: string;
                regNumber: string;
                categories: string[];
                status: string;
                createdAt: string;
                user: { email: string; firstName: string; lastName: string };
              }) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.companyName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.regNumber}</TableCell>
                  <TableCell className="text-sm">{s.user.firstName} {s.user.lastName}<br /><span className="text-muted-foreground text-xs">{s.user.email}</span></TableCell>
                  <TableCell className="text-sm">{s.categories.join(', ')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell>
                    {s.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => verify.mutate({ id: s.id, action: 'VERIFY' })}>
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const note = prompt('Rejection reason:');
                            if (note) verify.mutate({ id: s.id, action: 'REJECT', rejectionNote: note });
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data?.suppliers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No suppliers found.
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
