import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  mapNotification, notificationService,
  type AdminNotification, type NotificationPrefs,
} from '../services/notificationService';
import { playNotificationTone } from '../utils/audioUtils';
import { logNotif, setNotifChannelStatus } from '../utils/notificationDiag';
import { showNotificationToast } from '../components/admin/notifications/notificationUi';

const DEFAULT_PREFS: NotificationPrefs = { mutedTypes: [], soundEnabled: true, pushEnabled: false };

/**
 * Central de notificacoes do usuario logado.
 * - Lista e contador vem do banco (tudo e gravado la, inclusive para quem estava offline).
 * - Online: Realtime INSERT em `notifications` (filtrado por recipient_id) dispara pop-up + som.
 * - Sem polling: recarrega ao conectar/reconectar o canal e ao voltar o foco da aba.
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

  // Pop-up + som respeitando as preferencias; depois de exibido, a notificacao passa de "pendente" para "entregue"
  const deliver = useCallback((n: AdminNotification) => {
    const p = prefsRef.current;
    if (p.mutedTypes.includes(n.type)) {
      logNotif('exibir', `Tipo "${n.type}" silenciado nas preferências (marcada como entregue)`);
    } else {
      const shown = showNotificationToast(n, x => onOpenRef.current(x));
      if (shown && p.soundEnabled) playNotificationTone(n.type);
      logNotif('exibir', `Pop-up ${shown ? 'exibido' : 'já exibido antes'}${shown && p.soundEnabled ? ' com som' : ''} (${n.type})`);
    }
    const now = new Date().toISOString();
    setItems(prev => prev.map(x => (x.id === n.id ? { ...x, deliveryStatus: 'delivered', deliveredAt: now } : x)));
    void notificationService.markDelivered([n.id]);
  }, []);

  // Carrega a caixa de entrada. O que caiu enquanto o usuario estava fora (pendente) vira UM aviso resumido e e marcado como entregue.
  const reload = useCallback(async () => {
    if (!userId) return;
    const list = await notificationService.list(userId);
    const fresh = list.filter(n => n.deliveryStatus === 'pending' && !seenRef.current.has(n.id));
    list.forEach(n => seenRef.current.add(n.id));
    setItems(list);
    if (fresh.length === 1) {
      deliver(fresh[0]);
    } else if (fresh.length > 1) {
      const p = prefsRef.current;
      const shown = showNotificationToast({
        id: `summary-${Date.now()}`, masterId: fresh[0].masterId, recipientId: userId, type: 'announcement',
        title: `${fresh.length} notificações novas`, body: 'Chegaram enquanto você estava fora. Abra a central para ver.',
        payload: {}, deliveryStatus: 'delivered', createdAt: new Date().toISOString(), dedupeKey: `summary:${Date.now()}`,
      }, x => onOpenRef.current(x));
      if (shown && p.soundEnabled) playNotificationTone('announcement');
      const now = new Date().toISOString();
      const ids = fresh.map(n => n.id);
      setItems(prev => prev.map(x => (ids.includes(x.id) ? { ...x, deliveryStatus: 'delivered', deliveredAt: now } : x)));
      void notificationService.markDelivered(ids);
      logNotif('exibir', `${fresh.length} notificações pendentes entregues em um aviso resumido`);
    }
  }, [userId, deliver]);

  useEffect(() => {
    if (!userId) { setItems([]); setNotifChannelStatus('sem usuário'); return; }
    let cancelled = false;
    seenRef.current = new Set();
    void reload();
    notificationService.getPrefs(userId).then(p => { if (!cancelled) setPrefs(p); });

    if (!isSupabaseConfigured) { setNotifChannelStatus('Supabase não configurado'); return () => { cancelled = true; }; }

    const channel = supabase
      .channel(`f5-notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT' && payload.new?.id) {
          const n = mapNotification(payload.new);
          logNotif('receber', `Notificação recebida em tempo real (${n.type}): ${n.title}`);
          if (seenRef.current.has(n.id)) return;
          seenRef.current.add(n.id);
          setItems(prev => [n, ...prev.filter(p => p.id !== n.id)]);
          deliver(n);
        } else if (payload.eventType === 'UPDATE' && payload.new?.id) {
          const n = mapNotification(payload.new);
          setItems(prev => prev.map(p => (p.id === n.id ? n : p)));
        } else if (payload.eventType === 'DELETE' && payload.old?.id) {
          setItems(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe((status: string, err?: Error) => {
        setNotifChannelStatus(status);
        logNotif('canal', `Canal em tempo real: ${status}${err?.message ? ` (${err.message})` : ''}`, status === 'SUBSCRIBED');
        // Ao (re)conectar, busca o que chegou enquanto o canal estava fora
        if (status === 'SUBSCRIBED') void reload();
      });

    const onFocus = () => { if (document.visibilityState === 'visible') void reload(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      supabase.removeChannel(channel);
    };
  }, [userId, reload, deliver]);

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

  const updatePrefs = useCallback(async (next: NotificationPrefs, masterId: string) => {
    setPrefs(next);
    if (userId) await notificationService.savePrefs(userId, masterId, next);
  }, [userId]);

  /** Grava uma notificacao real para o proprio usuario: valida gravacao, Realtime, pop-up, som e badge. */
  const sendTest = useCallback(async (masterId: string) => {
    if (!userId || !masterId) { logNotif('teste', 'Sem usuário ou Master para o teste', false); return; }
    logNotif('teste', 'Enviando notificação de teste...');
    const err = await notificationService.createMany([{
      masterId,
      recipientId: userId,
      type: 'message',
      title: 'Notificação de teste',
      body: 'Se você viu e ouviu isso, a entrega está funcionando.',
      dedupeKey: `test:${userId}:${Date.now()}`,
    }]);
    logNotif('teste', err ? `Falhou ao gravar: ${err}` : 'Gravada no banco. Aguardando o pop-up em tempo real...', !err);
  }, [userId]);

  return { items, unreadCount, prefs, markRead, markAllRead, updatePrefs, sendTest };
}
