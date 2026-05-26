'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function PlatformOrgDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['platform-org', id],
    queryFn: () => api.get(`/platform/organizations/${id}`).then((r) => r.data.data),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-destructive">Organisation not found</p>;
  const { org, subscription, rfqCount, poCount } = data;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/platform/organizations" className="text-sm text-primary hover:underline">← Back to Organisations</Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">{org.slug}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={org.type} />
          <StatusBadge status={org.status} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm bg-card border rounded-lg p-5">
        {org.contactEmail && <div><span className="text-muted-foreground">Email: </span>{org.contactEmail}</div>}
        {org.contactPhone && <div><span className="text-muted-foreground">Phone: </span>{org.contactPhone}</div>}
        {org.country && <div><span className="text-muted-foreground">Country: </span>{org.country}</div>}
        <div><span className="text-muted-foreground">Plan: </span>{subscription?.plan ?? org.plan}</div>
        <div><span className="text-muted-foreground">RFQs: </span>{rfqCount ?? 0}</div>
        <div><span className="text-muted-foreground">POs: </span>{poCount ?? 0}</div>
        <div><span className="text-muted-foreground">Members: </span>{org._count?.users ?? 0}</div>
        <div><span className="text-muted-foreground">Created: </span>{formatDate(org.createdAt)}</div>
      </div>
      {org.members?.length > 0 && (
        <div className="bg-card border rounded-lg p-5 space-y-2">
          <h2 className="font-semibold">Members</h2>
          {org.members.map((m: { id: string; firstName: string; lastName: string; email: string; role: string }) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.firstName} {m.lastName} — {m.email}</span>
              <StatusBadge status={m.role} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
