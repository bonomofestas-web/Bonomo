import React, { useMemo, useState } from 'react';
import { CheckCheck, Volume2, VolumeX } from 'lucide-react';
import type { AdminNotification, NotificationPrefs, NotificationType } from '../../../services/notificationService';
import { NOTIFICATION_META, NotificationBadge, timeAgo } from './notificationUi';

interface Props {
  items: AdminNotification[];
  prefs: NotificationPrefs;
  onOpen: (n: AdminNotification) => void;
  onMarkAllRead: () => void;
  onTogglePref: (patch: Partial<NotificationPrefs>) => void;
}

type Area = 'open' | 'viewed';

const chip = (active: boolean, color = 'var(--adm-accent, #3B82F6)'): React.CSSProperties => ({
  padding: '5px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
  border: `1px solid ${active ? color : 'var(--adm-border, rgba(255,255,255,0.1))'}`,
  background: active ? `${color}22` : 'transparent',
  color: active ? color : 'var(--adm-text-muted, #94A3B8)',
});

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

/**
 * Central de notificacoes: "Em aberto" (ainda nao visualizadas) e "Visualizadas" (historico para revisitar).
 * Nada e apagado nem escondido: cada linha mostra quando foi entregue e quando foi visualizada.
 */
export const AdminNotificationsList: React.FC<Props> = ({ items, prefs, onOpen, onMarkAllRead, onTogglePref }) => {
  const [area, setArea] = useState<Area>('open');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');

  const openItems = useMemo(() => items.filter(n => !n.readAt), [items]);
  const viewedItems = useMemo(() => items.filter(n => n.readAt), [items]);
  const current = area === 'open' ? openItems : viewedItems;
  const presentTypes = useMemo(() => Array.from(new Set(current.map(n => n.type))), [current]);

  // Em aberto: mensagens do mesmo lead viram uma linha so (ultima + contador), como no WhatsApp
  const rows = useMemo(() => {
    const filtered = current.filter(n => typeFilter === 'all' || n.type === typeFilter);
    if (area === 'viewed') return filtered.map(n => ({ n, count: 1 }));
    const groups = new Map<string, { n: AdminNotification; count: number }>();
    const out: { n: AdminNotification; count: number }[] = [];
    for (const n of filtered) {
      if (n.type === 'message' && n.entityId) {
        const g = groups.get(n.entityId);
        if (g) { g.count += 1; continue; }
        const entry = { n, count: 1 };
        groups.set(n.entityId, entry);
        out.push(entry);
      } else {
        out.push({ n, count: 1 });
      }
    }
    return out;
  }, [current, typeFilter, area]);

  const switchArea = (next: Area) => { setArea(next); setTypeFilter('all'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" style={chip(area === 'open')} onClick={() => switchArea('open')}>Em aberto ({openItems.length})</button>
          <button type="button" style={chip(area === 'viewed')} onClick={() => switchArea('viewed')}>Visualizadas ({viewedItems.length})</button>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" title={prefs.soundEnabled ? 'Silenciar sons' : 'Ativar sons'} style={chip(prefs.soundEnabled)} onClick={() => onTogglePref({ soundEnabled: !prefs.soundEnabled })}>
            {prefs.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          {area === 'open' && (
            <button type="button" style={chip(false)} onClick={onMarkAllRead} disabled={openItems.length === 0}>
              <CheckCheck size={13} style={{ verticalAlign: '-2px' }} /> Marcar todas como visualizadas
            </button>
          )}
        </div>
      </div>

      {presentTypes.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button type="button" style={chip(typeFilter === 'all')} onClick={() => setTypeFilter('all')}>Todos os tipos</button>
          {presentTypes.map(t => (
            <button key={t} type="button" style={chip(typeFilter === t, NOTIFICATION_META[t]?.color)} onClick={() => setTypeFilter(t)}>
              {NOTIFICATION_META[t]?.label || t}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--adm-text-muted, #94A3B8)', fontSize: '0.88rem', fontWeight: 600 }}>
          {area === 'open' ? 'Nenhuma notificação em aberto.' : 'Nenhuma notificação visualizada ainda.'}
        </div>
      ) : rows.map(({ n, count }) => {
        const meta = NOTIFICATION_META[n.type];
        const trail = [
          `Recebida ${fmt(n.createdAt)}`,
          n.deliveryStatus === 'delivered' ? `entregue ${fmt(n.deliveredAt)}` : 'pendente de entrega',
          n.readAt ? `visualizada ${fmt(n.readAt)}` : '',
        ].filter(Boolean).join(' · ');
        return (
          <div
            key={n.id}
            onClick={() => onOpen(n)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
              background: n.readAt ? 'transparent' : 'var(--adm-bg-card, #111C2E)',
              border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
              borderLeft: `4px solid ${n.readAt ? 'transparent' : meta?.color || '#64748B'}`,
              opacity: n.readAt ? 0.8 : 1,
            }}
          >
            <NotificationBadge n={n} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <strong style={{ fontSize: '0.86rem', color: 'var(--adm-text-title, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
              </div>
              {n.body && <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>}
              <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '3px', opacity: 0.85 }}>{trail}</div>
            </div>
            {count > 1 && (
              <span style={{ background: meta?.color, color: '#fff', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px' }}>{count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
