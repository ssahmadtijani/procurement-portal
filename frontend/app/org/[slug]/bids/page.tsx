'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function BidsPage() {
  const { user } = useAuth();
  const params = useParams();
  const slug = params.slug as string;
  const isSupplier = user?.organization?.type === 'SUPPLIER_COMPANY';

  const { data, isLoading } = useQuery({
    queryKey: ['bids', isSupplier],
    queryFn: () => api.get(isSupplier ? '/bids/my' : '/bids').then((r) => r.data.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isSupplier ? 'My Bids' : 'All Bids'}</h1>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                {!isSupplier && <TableHead>Supplier</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.bids?.map((bid: { id: string; rfqId: string; totalAmount: number; currency: string; status: string; createdAt: string; rfq: { title: string }; supplier: { companyName: string } }) => (
                <TableRow key={bid.id}>
                  <TableCell>
                    <Link href={`/org/${slug}/rfqs/${bid.rfqId}`} className="text-primary hover:underline">
                      {bid.rfq?.title}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(bid.totalAmount, bid.currency)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(bid.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={bid.status} /></TableCell>
                  {!isSupplier && <TableCell>{bid.supplier?.companyName}</TableCell>}
                </TableRow>
              ))}
              {data?.bids?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No bids found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
