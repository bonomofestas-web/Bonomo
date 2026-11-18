import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { classifyMediaKind, type MediaKind } from '../utils/mediaStoragePolicy';

/**
 * Registro de mídias do WhatsApp (tabela whatsapp_media): alimenta política de peso, "Fixar",
 * medidor de uso e a limpeza sazonal. Sempre escopado por master_id (RLS também restringe ao Master logado).
 */

export type MediaStatus = 'stored' | 'pending' | 'purged' | 'unavailable';

export interface RegisterMediaParams {
  masterId: string;
  venueId?: string;
  sourceId?: string;
  leadId?: string;
  activityId?: string;
  messageId?: string;
  mediaType?: string;
  mimetype?: string;
  fileName?: string;
  sizeBytes?: number;
  r2Key?: string;
  publicUrl?: string;
  status: MediaStatus;
  failureReason?: string;
}

export interface MediaUsage {
  totalBytes: number;
  byKind: Record<MediaKind, { count: number; bytes: number }>;
}

const touchedToday = new Set<string>();

export const mediaStorageService = {
  /** Cria ou atualiza o registro da mídia (idempotente por master_id + message_id). Falhas não interrompem o fluxo do chat. */
  async register(params: RegisterMediaParams): Promise<void> {
    if (!isSupabaseConfigured || !params.masterId) return;
    try {
      const kind = classifyMediaKind(params.mediaType, params.mimetype);
      const row: Record<string, any> = {
        master_id: params.masterId,
        venue_id: params.venueId || null,
        source_id: params.sourceId || null,
        lead_id: params.leadId || null,
        activity_id: params.activityId || null,
        message_id: params.messageId || null,
        kind,
        mimetype: params.mimetype || null,
        file_name: params.fileName || null,
        size_bytes: params.sizeBytes ?? null,
        r2_key: params.r2Key || null,
        public_url: params.publicUrl || null,
        status: params.status,
        failure_reason: params.failureReason || null,
      };

      if (params.messageId) {
        const { data: existing } = await supabase
          .from('whatsapp_media')
          .select('id')
          .eq('master_id', params.masterId)
          .eq('message_id', params.messageId)
          .maybeSingle();
        if (existing?.id) {
          await supabase.from('whatsapp_media').update(row).eq('id', existing.id).eq('master_id', params.masterId);
          return;
        }
      }
      await supabase.from('whatsapp_media').insert([row]);
    } catch (err) {
      console.warn('[mediaStorage] Falha ao registrar mídia:', err);
    }
  },

  /** Fixa/desafixa a mídia de uma atividade (fixada nunca é apagada pela limpeza). */
  async setPinned(masterId: string, activityId: string, pinned: boolean): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId || !activityId) return false;
    const { error } = await supabase
      .from('whatsapp_media')
      .update({ pinned })
      .eq('master_id', masterId)
      .eq('activity_id', activityId);
    return !error;
  },

  /** Marca "aberta agora" (no máximo 1 gravação por mídia por sessão/dia, para poupar escrita no Supabase Free). */
  async touchAccessed(masterId: string, activityId: string): Promise<void> {
    if (!isSupabaseConfigured || !masterId || !activityId) return;
    const key = `${activityId}:${new Date().toISOString().slice(0, 10)}`;
    if (touchedToday.has(key)) return;
    touchedToday.add(key);
    await supabase
      .from('whatsapp_media')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('master_id', masterId)
      .eq('activity_id', activityId)
      .eq('status', 'stored');
  },

  /** Uso de armazenamento por tipo do Master (apenas colunas mínimas). */
  async getUsage(masterId: string): Promise<MediaUsage> {
    const empty = (): { count: number; bytes: number } => ({ count: 0, bytes: 0 });
    const usage: MediaUsage = {
      totalBytes: 0,
      byKind: { image: empty(), video: empty(), audio: empty(), document: empty(), other: empty() },
    };
    if (!isSupabaseConfigured || !masterId) return usage;
    const { data } = await supabase
      .from('whatsapp_media')
      .select('kind, size_bytes')
      .eq('master_id', masterId)
      .eq('status', 'stored')
      .limit(10000);
    for (const row of data || []) {
      const k = (row.kind as MediaKind) in usage.byKind ? (row.kind as MediaKind) : 'other';
      const bytes = Number(row.size_bytes) || 0;
      usage.byKind[k].count += 1;
      usage.byKind[k].bytes += bytes;
      usage.totalBytes += bytes;
    }
    return usage;
  },
};
