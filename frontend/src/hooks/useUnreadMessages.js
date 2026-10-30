'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const POLL_MS = 30000;

/**
 * Unread messages for the logged-in user (polled; refreshed when a thread is read).
 * Users: Meskan's replies. Admins: users' messages waiting for Meskan.
 */
export function useUnreadMessages(user) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return undefined;
    }
    let active = true;
    const path = user.role === 'admin' ? '/admin/support/unread' : '/support/unread';
    const load = () =>
      api.get(path).then(({ data }) => active && setUnread(data.unread || 0)).catch(() => {});
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener('messages-read', load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('messages-read', load);
    };
  }, [user]);
  return unread;
}
