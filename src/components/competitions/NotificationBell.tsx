import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

interface NotificationBellProps {
  userId: string;
  initialCount: number;
}

export default function NotificationBell({ userId, initialCount }: NotificationBellProps) {
  const [count, setCount] = useState(initialCount);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const channel = supabase
      .channel(`notif-bell-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setCount((c) => c + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          // Recount unread
          const { count: newCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);
          setCount(newCount ?? 0);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <a
      href="/profile/"
      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label={`${count} notification${count > 1 ? 's' : ''}`}
    >
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold leading-none">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </a>
  );
}
