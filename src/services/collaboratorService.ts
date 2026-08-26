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

  async upsert(collab: Partial<Collaborator> & { id?: string; email?: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const isUuid = !!collab.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collab.id);
      
      const payload: any = {};
      if (collab.name !== undefined) payload.name = collab.name;
      if (collab.email !== undefined) payload.email = collab.email;
      if (collab.role !== undefined) payload.role = collab.role;
      if (collab.venueId !== undefined) payload.venue_id = collab.venueId === 'all' ? null : collab.venueId;
      if (collab.venueIds !== undefined) payload.venue_ids = collab.venueIds;
      if (collab.avatarUrl !== undefined) payload.avatar_url = collab.avatarUrl;
      if (collab.phone !== undefined) payload.phone = collab.phone;
      if (collab.active !== undefined) payload.active = collab.active;

      if (isUuid) {
        payload.id = collab.id;
        const { error } = await supabase.from('collaborators').upsert(payload);
        if (error) {
          console.error('Erro ao salvar colaborador no Supabase:', error);
          if (collab.email) {
            await supabase.from('collaborators').update(payload).eq('email', collab.email);
          }
          return false;
        }
        return true;
      } else if (collab.email) {
        const { data: existing } = await supabase.from('collaborators').select('id').eq('email', collab.email).maybeSingle();
        if (existing?.id) {
          const { error } = await supabase.from('collaborators').update(payload).eq('id', existing.id);
          if (error) console.error('Erro ao atualizar colaborador por email:', error);
        } else {
          const { error } = await supabase.from('collaborators').insert(payload);
          if (error) console.error('Erro ao inserir colaborador:', error);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Falha em collaboratorService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = isUuid 
        ? supabase.from('collaborators').delete().eq('id', id)
        : supabase.from('collaborators').delete().ilike('email', `%${id}%`);
      const { error } = await query;
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
