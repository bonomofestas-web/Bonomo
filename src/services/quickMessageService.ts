import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { QuickMessage } from '../types/admin';

export const quickMessageService = {
  async getAll(): Promise<QuickMessage[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('quick_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar quick_messages:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        masterId: row.master_id,
        venueId: row.venue_id,
        keyword: row.keyword,
        message: row.message,
        createdBy: row.created_by || 'Sistema',
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at,
        isActive: row.is_active ?? true,
      }));
    } catch {
      return [];
    }
  },

  async upsert(quickMsg: QuickMessage): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quickMsg.id);

      const payload: any = {
        keyword: quickMsg.keyword.trim().toLowerCase().replace(/^\//, '').replace(/\s+/g, ''),
        message: quickMsg.message,
        created_by: quickMsg.createdBy,
        is_active: quickMsg.isActive,
        updated_at: new Date().toISOString(),
      };

      if (isUuid) {
        payload.id = quickMsg.id;
      }
      if (quickMsg.masterId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quickMsg.masterId)) {
        payload.master_id = quickMsg.masterId;
      }
      if (quickMsg.venueId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quickMsg.venueId)) {
        payload.venue_id = quickMsg.venueId;
      }

      const { error } = await supabase.from('quick_messages').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Erro ao salvar quick_message no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Falha em quickMessageService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('quick_messages').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }
};
