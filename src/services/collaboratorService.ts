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
        password: row.password,
        masterId: row.master_id || undefined,
        theme: row.theme || 'light',
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Falha em collaboratorService.getAll:', err);
      return [];
    }
  },

  async upsert(collab: Partial<Collaborator> & { id?: string; email?: string; theme?: string }): Promise<boolean> {
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
      if (collab.password !== undefined) payload.password = collab.password;
      if (collab.theme !== undefined) payload.theme = collab.theme;
      if (collab.masterId !== undefined) payload.master_id = collab.masterId;

      if (isUuid) {
        // Try update first so only specified columns are modified
        const { data: updated, error: updateErr } = await supabase
          .from('collaborators')
          .update(payload)
          .eq('id', collab.id)
          .select('id');

        if (!updateErr && updated && updated.length > 0) {
          return true;
        }

        // If not found, insert
        payload.id = collab.id;
        const { error: insertErr } = await supabase.from('collaborators').insert(payload);
        if (insertErr) {
          console.error('Erro ao inserir colaborador:', insertErr);
          return false;
        }
        return true;
      } else if (collab.email) {
        const { data: existing } = await supabase.from('collaborators').select('id').eq('email', collab.email).maybeSingle();
        if (existing?.id) {
          await supabase.from('collaborators').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('collaborators').insert(payload);
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

export const featureFlagService = {
  async getAll(): Promise<{ flags: Record<string, string>; descriptions: Record<string, string> }> {
    if (!isSupabaseConfigured) return { flags: {}, descriptions: {} };
    try {
      const { data, error } = await supabase
        .from('system_feature_flags')
        .select('feature_id, status, coming_soon_message');

      if (error) {
        return { flags: {}, descriptions: {} };
      }

      const flags: Record<string, string> = {};
      const descriptions: Record<string, string> = {};
      (data || []).forEach(row => {
        flags[row.feature_id] = row.status;
        if (row.coming_soon_message) {
          descriptions[row.feature_id] = row.coming_soon_message;
        }
      });
      return { flags, descriptions };
    } catch {
      return { flags: {}, descriptions: {} };
    }
  },

  async update(featureId: string, status: string, comingSoonMessage?: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload: any = {
        feature_id: featureId,
        status,
        updated_at: new Date().toISOString(),
      };
      if (comingSoonMessage !== undefined) {
        payload.coming_soon_message = comingSoonMessage;
      }

      const { error } = await supabase
        .from('system_feature_flags')
        .upsert(payload);

      return !error;
    } catch {
      return false;
    }
  },
};

