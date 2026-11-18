import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logNotif } from '../utils/notificationDiag';

export type NotificationType =
  | 'new_opportunity' | 'message' | 'task' | 'contract' | 'post_sale'
  | 'appointment' | 'visit_tasting' | 'support' | 'announcement';

export type NotificationEntityType =
  'lead' | 'contract' | 'task' | 'appointment' | 'placement' | 'ticket' | 'announcement';

export interface AdminNotification {
  id: string;
  masterId: string;
  venueId?: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  payload: Record<string, any>;
  dedupeKey?: string;
  readAt?: string;
  deliveryStatus: 'pending' | 'delivered';
  deliveredAt?: string;
  createdAt: string;
}

export interface NewNotification {
  masterId: string;
  venueId?: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  payload?: Record<string, any>;
  dedupeKey: string;
}

export interface NotificationPrefs {
  mutedTypes: NotificationType[];
  soundEnabled: boolean;
  pushEnabled: boolean;
}

const COLUMNS = 'id, master_id, venue_id, recipient_id, type, title, body, entity_type, entity_id, payload, dedupe_key, read_at, delivery_status, delivered_at, created_at';

export const mapNotification = (r: any): AdminNotification => ({
  id: r.id,
  masterId: r.master_id,
  venueId: r.venue_id || undefined,
  recipientId: r.recipient_id,
  type: r.type,
  title: r.title,
  body: r.body || undefined,
  entityType: r.entity_type || undefined,
  entityId: r.entity_id || undefined,
  payload: r.payload || {},
  dedupeKey: r.dedupe_key || undefined,
  readAt: r.read_at || undefined,
  deliveryStatus: r.delivery_status === 'delivered' ? 'delivered' : 'pending',
  deliveredAt: r.delivered_at || undefined,
  createdAt: r.created_at,
});

export const notificationService = {
  /** Caixa de entrada do usuario logado (RLS tambem restringe ao destinatario). */
  async list(recipientId: string, limit = 400): Promise<AdminNotification[]> {
    if (!isSupabaseConfigured || !recipientId) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select(COLUMNS)
      .eq('recipient_id', recipientId)
      // Mensagem e lead novo sao avisos ao vivo (nao ficam na central); a central guarda tarefa, contrato, compromisso etc.
      .not('type', 'in', '(message,new_opportunity)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('[notifications] list', error.message); return []; }
    return (data || []).map(mapNotification);
  },

  /** Gera notificacoes para varios destinatarios. Duplicadas (mesmo recipient + dedupeKey) sao ignoradas. Retorna a mensagem de erro, se houver. */
  async createMany(rows: NewNotification[]): Promise<string | null> {
    if (!isSupabaseConfigured || rows.length === 0) return null;
    const payload = rows.map(r => ({
      master_id: r.masterId,
      venue_id: r.venueId || null,
      recipient_id: r.recipientId,
      type: r.type,
      title: r.title,
      body: r.body || null,
      entity_type: r.entityType || null,
      entity_id: r.entityId || null,
      payload: r.payload || {},
      dedupe_key: r.dedupeKey,
    }));
    const { error } = await supabase
      .from('notifications')
      .upsert(payload, { onConflict: 'recipient_id,dedupe_key', ignoreDuplicates: true });
    if (error) {
      logNotif('gravar', `Falha ao gravar ${rows.length} notificação(ões): ${error.message}`, false);
      return error.message;
    }
    logNotif('gravar', `${rows.length} notificação(ões) gravada(s) (${rows[0].type})`);
    return null;
  },

  async markRead(ids: string[]): Promise<void> {
    if (!isSupabaseConfigured || ids.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at', null);
  },

  async markAllRead(recipientId: string): Promise<void> {
    if (!isSupabaseConfigured || !recipientId) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', recipientId).is('read_at', null);
  },

  /** Marca como entregue (pop-up/aviso exibido ao destinatario). Idempotente. */
  async markDelivered(ids: string[]): Promise<void> {
    if (!isSupabaseConfigured || ids.length === 0) return;
    await supabase.from('notifications')
      .update({ delivery_status: 'delivered', delivered_at: new Date().toISOString() })
      .in('id', ids).eq('delivery_status', 'pending');
  },

  async getPrefs(collaboratorId: string): Promise<NotificationPrefs> {
    const fallback: NotificationPrefs = { mutedTypes: [], soundEnabled: true, pushEnabled: false };
    if (!isSupabaseConfigured || !collaboratorId) return fallback;
    const { data } = await supabase
      .from('notification_prefs')
      .select('muted_types, sound_enabled, push_enabled')
      .eq('collaborator_id', collaboratorId)
      .maybeSingle();
    if (!data) return fallback;
    return { mutedTypes: data.muted_types || [], soundEnabled: data.sound_enabled !== false, pushEnabled: Boolean(data.push_enabled) };
  },

  async savePrefs(collaboratorId: string, masterId: string, prefs: NotificationPrefs): Promise<void> {
    if (!isSupabaseConfigured || !collaboratorId || !masterId) return;
    await supabase.from('notification_prefs').upsert({
      collaborator_id: collaboratorId,
      master_id: masterId,
      muted_types: prefs.mutedTypes,
      sound_enabled: prefs.soundEnabled,
      push_enabled: prefs.pushEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'collaborator_id' });
  },
};
