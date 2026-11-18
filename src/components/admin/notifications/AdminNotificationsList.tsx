import React, { useMemo, useState } from 'react';
import { CheckCheck, Trash2, Volume2, VolumeX } from 'lucide-react';
import type { AdminNotification, NotificationPrefs, NotificationType } from '../../../services/notificationService';
import { NOTIFICATION_META, NotificationBadge, timeAgo } from './notificationUi';

interface Props {
  items: AdminNotification[];
  prefs: NotificationPrefs;
  onOpen: (n: AdminNotification) => void;
  onMarkAllRead: () => void;
  onClear: (onlyRead: boolean) => void;
  onTogglePref: (patch: Partial<NotificationPrefs>) => void;
}

const chip = (active: boolean, color = 'var(--adm-accent, #3B82F6)'): React.CSSProperties => ({
  padding: '5px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
  border: `1px solid ${active ? color : 'var(--adm-border, rgba(255,255,255,0.1))'}`,
  background: active ? `${color}22` : 'transparent',
  color: active ? color : 'var(--adm-text-muted, #94A3B8)',
});

export const AdminNotificationsList: React.FC<Props> = ({ items, prefs, onOpen, onMarkAllRead, onClear, onTogglePref }) => {
  const [filter, setFilter] = useState<NotificationType | 'all' | 'unread'>('all');

  // Mensagens do mesmo lead viram uma linha so (ultima mensagem + contador), como no WhatsApp
  const rows = useMemo(() => {
    const filtered = items.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.readAt : n.type === filter);
    const seenLeads = new Map<string, { n: AdminNotification; count: number }>();
    const out: { n: AdminNotification; count: number }[] = [];
    for (const n of filtered) {
      if (n.type === 'message' && n.entityId && !n.readAt) {
        const g = seenLeads.get(n.entityId);
        if (g) { g.count += 1; continue; }
        const entry = { n, count: 1 };
        seenLeads.set(n.entityId, entry);
        out.push(entry);
      } else {
        out.push({ n, count: 1 });
      }
    }
    return out;
  }, [items, filter]);

  const unread = items.filter(n => !n.readAt).length;
  const presentTypes = useMemo(() => Array.from(new Set(items.map(n => n.type))), [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button type="button" style={chip(filter === 'all')} onClick={() => setFilter('all')}>Todas</button>
          <button type="button" style={chip(filter === 'unread')} onClick={() => setFilter('unread')}>Não lidas ({unread})</button>
          {presentTypes.map(t => (
            <button key={t} type="button" style={chip(filter === t, NOTIFICATION_META[t]?.color)} onClick={() => setFilter(t)}>
              {NOTIFICATION_META[t]?.label || t}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" title={prefs.soundEnabled ? 'Silenciar sons' : 'Ativar sons'} style={chip(prefs.soundEnabled)} onClick={() => onTogglePref({ soundEnabled: !prefs.soundEnabled })}>
            {prefs.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button type="button" style={chip(false)} onClick={onMarkAllRead} disabled={unread === 0}>
            <CheckCheck size={13} style={{ verticalAlign: '-2px' }} /> Marcar todas como lidas
          </button>
          <button type="button" style={chip(false, '#EF4444')} onClick={() => onClear(true)} title="Remove as notificações já lidas">
            <Trash2 size={13} style={{ verticalAlign: '-2px' }} /> Limpar lidas
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--adm-text-muted, #94A3B8)', fontSize: '0.88rem', fontWeight: 600 }}>
          Nenhuma notificação por aqui.
        </div>
      ) : rows.map(({ n, count }) => {
        const meta = NOTIFICATION_META[n.type];
        return (
          <div
            key={n.id}
            onClick={() => onOpen(n)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
              background: n.readAt ? 'transparent' : 'var(--adm-bg-card, #111C2E)',
              border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
              borderLeft: `4px solid ${n.readAt ? 'transparent' : meta?.color || '#64748B'}`,
              opacity: n.readAt ? 0.7 : 1,
            }}
          >
            <NotificationBadge n={n} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <strong style={{ fontSize: '0.86rem', color: 'var(--adm-text-title, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
              </div>
              {n.body && <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>}
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
