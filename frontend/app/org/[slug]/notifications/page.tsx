'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {data?.notifications?.some((n: { isRead: boolean }) => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()}>
            Mark all as read
          </Button>
        )}
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {data?.notifications?.map((n: { id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string }) => (
            <div key={n.id} className={`flex items-start gap-3 p-4 rounded-lg border ${n.isRead ? 'bg-card' : 'bg-primary/5 border-primary/20'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-muted' : 'bg-primary/10'}`}>
                <Bell className={`w-4 h-4 ${n.isRead ? 'text-muted-foreground' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${n.isRead ? 'text-muted-foreground' : ''}`}>{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <Button size="sm" variant="ghost" onClick={() => markReadMutation.mutate(n.id)}>
                  <Check className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {data?.notifications?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
