import { useSyncExternalStore } from 'react';

// Contador de nao lidas compartilhado entre o hook da central (AdminPortal) e o sino do menu lateral.
let unread = 0;
const listeners = new Set<() => void>();

export const setUnreadNotifications = (value: number) => {
  if (value === unread) return;
  unread = value;
  listeners.forEach(l => l());
};

export const useUnreadNotifications = (): number =>
  useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => unread,
  );
