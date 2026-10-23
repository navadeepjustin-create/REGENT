'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RealtimeSyncOptions {
  userId?: string;
  tables: string[];
  onSync: () => void | Promise<void>;
  enabled?: boolean;
}

export function useRealtimeSync({
  userId,
  tables,
  onSync,
  enabled = true,
}: RealtimeSyncOptions) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled || !userId || tables.length === 0) return;

    const supabase = createClient();
    const channelName = `realtime-sync-${tables.join('-')}-${userId.slice(0, 8)}`;
    const channel = supabase.channel(channelName);

    // Subscribe to each table
    tables.forEach((table) => {
      channel.on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onSyncRef.current();
        }
      );
    });

    channel.subscribe();

    // Re-sync on window focus or network reconnect
    const handleFocus = () => onSyncRef.current();
    const handleOnline = () => onSyncRef.current();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [userId, tables.join(','), enabled]);
}
