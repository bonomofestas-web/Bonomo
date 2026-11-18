import React from 'react';
import { toast } from 'sonner';
import { Bell, CalendarClock, CalendarCheck2, FileSignature, Headset, ListChecks, Megaphone, MessageCircle, Sparkles, Workflow } from 'lucide-react';
import { SafeAvatar } from '../SafeAvatar';
import type { AdminNotification, NotificationType } from '../../../services/notificationService';

export const NOTIFICATION_META: Record<NotificationType, { label: string; color: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  new_opportunity: { label: 'Oportunidades', color: '#10B981', Icon: Sparkles },
  message:         { label: 'Mensagens',     color: '#25D366', Icon: MessageCircle },
  task:            { label: 'Tarefas',       color: '#F59E0B', Icon: ListChecks },
  contract:        { label: 'Contratos',     color: '#8B5CF6', Icon: FileSignature },
  post_sale:       { label: 'Pós-venda',     color: '#06B6D4', Icon: Workflow },
  appointment:     { label: 'Compromissos',  color: '#3B82F6', Icon: CalendarClock },
  visit_tasting:   { label: 'Visitas e degustações', color: '#EC4899', Icon: CalendarCheck2 },
  support:         { label: 'Suporte',       color: '#EF4444', Icon: Headset },
  announcement:    { label: 'Comunicados',   color: '#14A9D7', Icon: Megaphone },
};

export const timeAgo = (iso: string): string => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
};

/** Icone circular do tipo (ou foto do lead/contratante nas mensagens). */
export const NotificationBadge: React.FC<{ n: AdminNotification; size?: number }> = ({ n, size = 40 }) => {
  const meta = NOTIFICATION_META[n.type] || { color: '#64748B', Icon: Bell };
  if (n.type === 'message' || (n.type === 'new_opportunity' && n.payload?.avatarUrl)) {
    return <SafeAvatar name={n.payload?.leadName || n.title} src={n.payload?.avatarUrl} size={size} />;
  }
  const Icon = meta.Icon;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={Math.round(size * 0.5)} color={meta.color} />
    </div>
  );
};

/** Pop-up: mensagem estilo WhatsApp (foto, nome, previa); demais tipos com icone e cor proprios. */
// Chaves ja exibidas: o pop-up local (imediato) e o evento Realtime do mesmo dedupeKey nao duplicam.
const shownKeys = new Set<string>();

/** Retorna false (sem exibir) quando este mesmo evento ja foi mostrado. */
export function showNotificationToast(n: AdminNotification, onOpen: (n: AdminNotification) => void, toastId?: string): boolean {
  if (n.dedupeKey) {
    if (shownKeys.has(n.dedupeKey)) return false;
    shownKeys.add(n.dedupeKey);
    if (shownKeys.size > 500) shownKeys.delete(shownKeys.values().next().value as string);
  }
  const meta = NOTIFICATION_META[n.type];
  toast.custom((id) => (
    <div
      onClick={() => { toast.dismiss(id); onOpen(n); }}
      style={{
        width: 'min(360px, calc(100vw - 32px))',
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px', borderRadius: '14px', cursor: 'pointer',
        background: 'var(--adm-bg-card, #111C2E)',
        border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
        borderLeft: `4px solid ${meta?.color || '#64748B'}`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
      }}
    >
      <NotificationBadge n={n} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <strong style={{ fontSize: '0.84rem', color: 'var(--adm-text-title, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</strong>
          <span style={{ fontSize: '0.64rem', color: meta?.color, fontWeight: 700, flexShrink: 0 }}>{n.type === 'message' ? 'agora' : meta?.label}</span>
        </div>
        {n.body && (
          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {n.body}
          </div>
        )}
      </div>
    </div>
  ), { id: toastId, duration: n.type === 'message' ? 6000 : 8000, position: 'top-right' });
  return true;
}
