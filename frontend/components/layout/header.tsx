'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/utils';
import { LogOut, User } from 'lucide-react';

export function DashboardHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b bg-card px-6 flex items-center justify-between shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-muted-foreground">
            — {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="gap-1">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
