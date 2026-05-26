'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function PlatformSuppliersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-pending-suppliers'],
    queryFn: () => api.get('/platform/suppliers/pending').then((r) => r.data.data),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/platform/suppliers/${id}/verify`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-pending-suppliers'] }); toast({ title: 'Supplier verified' }); },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending Supplier Verifications</h1>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.suppliers?.map((s: { id: string; companyName: string; category: string; country: string; verificationStatus: string; createdAt: string; organization: { name: string } }) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.companyName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.organization?.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.category}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.country}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(s.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={s.verificationStatus} /></TableCell>
                  <TableCell>
                    {s.verificationStatus === 'PENDING' && (
                      <Button size="sm" onClick={() => verifyMutation.mutate(s.id)} disabled={verifyMutation.isPending}>
                        Verify
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data?.suppliers?.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pending verifications.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
