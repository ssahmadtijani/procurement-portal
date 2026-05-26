'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function UsersPage() {
  const { user } = useAuth();
  const params = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = user?.organizationId;
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('PROCUREMENT_OFFICER');
  const [showInvite, setShowInvite] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () => api.get(`/orgs/${orgId}/members`).then((r) => r.data.data),
    enabled: !!orgId,
  });

  const { data: invitationsData } = useQuery({
    queryKey: ['org-invitations', orgId],
    queryFn: () => api.get(`/orgs/${orgId}/invitations`).then((r) => r.data.data),
    enabled: !!orgId,
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post(`/orgs/${orgId}/invitations`, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      toast({ title: 'Invitation sent', description: inviteEmail });
      setInviteEmail('');
      setShowInvite(false);
      qc.invalidateQueries({ queryKey: ['org-invitations', orgId] });
    },
    onError: (e: unknown) => toast({ title: 'Error', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/orgs/${orgId}/members/${userId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-members', orgId] }); toast({ title: 'Member removed' }); },
  });

  const ROLES = ['ORG_ADMIN', 'CORPORATE_OFFICE', 'PROCUREMENT_OFFICER', 'FINANCE', 'SUPPLIER'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Members</h1>
        {user?.role === 'ORG_ADMIN' && (
          <Button onClick={() => setShowInvite(!showInvite)}>Invite Member</Button>
        )}
      </div>

      {showInvite && (
        <div className="bg-card border rounded-lg p-5 space-y-3 max-w-md">
          <h2 className="font-semibold">Invite New Member</h2>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail || inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
            </Button>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {user?.role === 'ORG_ADMIN' && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.members?.map((m: { id: string; firstName: string; lastName: string; email: string; role: string; createdAt: string }) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.firstName} {m.lastName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.email}</TableCell>
                  <TableCell><StatusBadge status={m.role} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(m.createdAt)}</TableCell>
                  {user?.role === 'ORG_ADMIN' && (
                    <TableCell>
                      {m.id !== user.id && (
                        <Button size="sm" variant="destructive" onClick={() => removeMutation.mutate(m.id)}>Remove</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {invitationsData?.invitations?.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Pending Invitations</h2>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitationsData.invitations.map((inv: { id: string; email: string; role: string; expiresAt: string; status: string }) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell><StatusBadge status={inv.role} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(inv.expiresAt)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
