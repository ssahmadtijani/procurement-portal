'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ProcurementSuppliersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-suppliers', search],
    queryFn: () =>
      api
        .get('/suppliers', { params: { search: search || undefined, status: 'VERIFIED' } })
        .then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Verified Suppliers</h1>

      <input
        placeholder="Search by company name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
      />

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
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell className="text-sm">
                    {s.user.firstName} {s.user.lastName}
                    <br />
                    <span className="text-muted-foreground text-xs">{s.user.email}</span>
                  </TableCell>
                  <TableCell className="text-sm">{s.categories.join(', ')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                </TableRow>
              ))}
              {data?.suppliers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No verified suppliers found.
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
