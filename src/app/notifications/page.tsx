'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link: string | null;
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch('/api/notifications?pageSize=50')
      .then(r => r.json())
      .then(d => setNotifications(d.data ?? []))
      .finally(() => setLoading(false));
  }

  async function markAll() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) });
    load();
  }

  useEffect(() => { load(); }, []);

  const TYPE_COLORS: Record<string, string> = {
    INFO: 'bg-blue-50 border-blue-200 text-blue-800',
    WARNING: 'bg-orange-50 border-orange-200 text-orange-800',
    ERROR: 'bg-red-50 border-red-200 text-red-800',
    SUCCESS: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAll}>
          <Check className="me-2 h-4 w-4" /> Mark All Read
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`rounded-lg border p-4 ${!n.isRead ? 'bg-muted/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && <div className="h-2 w-2 rounded-full bg-brand-accent shrink-0 mt-1.5" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return <Shell><NotificationsContent /></Shell>;
}
