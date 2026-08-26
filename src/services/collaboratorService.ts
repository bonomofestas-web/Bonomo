import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Collaborator } from '../types/admin';

export const collaboratorService = {
  async getAll(): Promise<Collaborator[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao buscar colaboradores:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role || 'sdr',
        venueId: row.venue_id || 'all',
        venueIds: row.venue_ids || [],
        avatarUrl: row.avatar_url,
        phone: row.phone,
        active: row.active ?? true,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Falha em collaboratorService.getAll:', err);
      return [];
    }
  },

  async upsert(collab: Partial<Collaborator> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload: any = {
        id: collab.id,
        name: collab.name,
        email: collab.email,
        role: collab.role,
        venue_id: collab.venueId === 'all' ? null : collab.venueId,
        venue_ids: collab.venueIds || [],
        avatar_url: collab.avatarUrl,
        phone: collab.phone,
        active: collab.active,
      };

      const { error } = await supabase.from('collaborators').upsert(payload);
      if (error) {
        console.error('Erro ao salvar colaborador no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em collaboratorService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('collaborators').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar colaborador:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em collaboratorService.delete:', err);
      return false;
    }
  },
};
