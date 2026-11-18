import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  mapNotification, notificationService,
  type AdminNotification, type NotificationPrefs,
} from '../services/notificationService';
import { playNotificationTone } from '../utils/audioUtils';
import { showNotificationToast } from '../components/admin/notifications/notificationUi';

const DEFAULT_PREFS: NotificationPrefs = { mutedTypes: [], soundEnabled: true, pushEnabled: false };

/**
 * Central de notificacoes do usuario logado: carrega a caixa de entrada, escuta INSERT/UPDATE/DELETE
 * em tempo real (filtrado por recipient_id) e dispara pop-up + som por tipo.
 */
export function useNotificationCenter(
  userId: string | undefined,
  onOpen: (n: AdminNotification) => void,
) {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const seenRef = useRef<Set<string>>(new Set());

  // Pop-up + som respeitando as preferencias; ignora evento ja exibido (dedupeKey)
  const deliver = useCallback((n: AdminNotification) => {
    const p = prefsRef.current;
    if (p.mutedTypes.includes(n.type)) return;
    if (showNotificationToast(n, x => onOpenRef.current(x)) && p.soundEnabled) playNotificationTone(n.type);
  }, []);

  // Notificacoes geradas por este proprio cliente chegam na hora, sem esperar o round-trip do banco
  useEffect(() => {
    if (!userId) return;
    const onLocal = (e: Event) => {
      const n = (e as CustomEvent<AdminNotification>).detail;
      if (!n || n.recipientId !== userId) return;
      setItems(prev => (n.dedupeKey && prev.some(p => p.dedupeKey === n.dedupeKey) ? prev : [n, ...prev]));
      deliver(n);
    };
    window.addEventListener('f5:local-notification', onLocal);
    return () => window.removeEventListener('f5:local-notification', onLocal);
  }, [userId, deliver]);

  useEffect(() => {
    if (!userId) { setItems([]); return; }
    let cancelled = false;
    seenRef.current = new Set();
    notificationService.list(userId).then(list => {
      if (cancelled) return;
      list.forEach(n => seenRef.current.add(n.id));
      setItems(list);
    });
    notificationService.getPrefs(userId).then(p => { if (!cancelled) setPrefs(p); });

    if (!isSupabaseConfigured) return () => { cancelled = true; };
    const channel = supabase
      .channel(`f5-notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT' && payload.new?.id) {
          const n = mapNotification(payload.new);
          if (seenRef.current.has(n.id)) return;
          seenRef.current.add(n.id);
          // Substitui a copia local (id provisorio) do mesmo evento pela linha real do banco
          setItems(prev => [n, ...prev.filter(p => p.id !== n.id && !(n.dedupeKey && p.dedupeKey === n.dedupeKey))]);
          deliver(n);
        } else if (payload.eventType === 'UPDATE' && payload.new?.id) {
          const n = mapNotification(payload.new);
          setItems(prev => prev.map(p => (p.id === n.id ? n : p)));
        } else if (payload.eventType === 'DELETE' && payload.old?.id) {
          setItems(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  const unreadCount = useMemo(() => items.filter(n => !n.readAt).length, [items]);

  const markRead = useCallback(async (ids: string[]) => {
    const now = new Date().toISOString();
    setItems(prev => prev.map(n => (ids.includes(n.id) && !n.readAt ? { ...n, readAt: now } : n)));
    await notificationService.markRead(ids);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems(prev => prev.map(n => (n.readAt ? n : { ...n, readAt: now })));
    await notificationService.markAllRead(userId);
  }, [userId]);

  const clear = useCallback(async (onlyRead = true) => {
    if (!userId) return;
    setItems(prev => (onlyRead ? prev.filter(n => !n.readAt) : []));
    await notificationService.clear(userId, onlyRead);
  }, [userId]);

  const updatePrefs = useCallback(async (next: NotificationPrefs, masterId: string) => {
    setPrefs(next);
    if (userId) await notificationService.savePrefs(userId, masterId, next);
  }, [userId]);

  return { items, unreadCount, prefs, markRead, markAllRead, clear, updatePrefs };
}
