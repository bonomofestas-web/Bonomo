import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CommercialFunnel } from '../types/admin';

export const funnelService = {
  async getAll(): Promise<CommercialFunnel[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('commercial_funnels')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar funis:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        category: row.category || 'Marketing Digital',
        description: row.description || '',
        venueId: row.venue_id,
        allowedCollaboratorIds: row.allowed_collaborator_ids || [],
        badge: row.badge || row.category,
        badgeColor: row.badge_color || '#3B82F6',
        icon: row.icon || 'target',
        customImageUrl: row.custom_image_url,
        isPinned: row.is_pinned ?? false,
        stagesCount: row.stages_count || 4,
        isPrimary: row.is_primary || false,
        isDemo: row.is_demo || false,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Falha em funnelService.getAll:', err);
      return [];
    }
  },

  async upsert(funnel: Partial<CommercialFunnel> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(funnel.id);

      const payload: any = {};
      if (funnel.name !== undefined) payload.name = funnel.name;
      if (funnel.category !== undefined) payload.category = funnel.category;
      if (funnel.description !== undefined) payload.description = funnel.description;
      if (funnel.venueId !== undefined) payload.venue_id = funnel.venueId;
      if (funnel.allowedCollaboratorIds !== undefined) payload.allowed_collaborator_ids = funnel.allowedCollaboratorIds;
      if (funnel.badge !== undefined) payload.badge = funnel.badge;
      if (funnel.badgeColor !== undefined) payload.badge_color = funnel.badgeColor;
      if (funnel.icon !== undefined) payload.icon = funnel.icon;
      if (funnel.customImageUrl !== undefined) payload.custom_image_url = funnel.customImageUrl;
      if (funnel.isPinned !== undefined) payload.is_pinned = funnel.isPinned;
      if (funnel.stagesCount !== undefined) payload.stages_count = funnel.stagesCount;
      if (funnel.isPrimary !== undefined) payload.is_primary = funnel.isPrimary;
      if (funnel.isDemo !== undefined) payload.is_demo = funnel.isDemo;

      if (isUuid) {
        const { data: updated, error: updateErr } = await supabase
          .from('commercial_funnels')
          .update(payload)
          .eq('id', funnel.id)
          .select('id');

        if (!updateErr && updated && updated.length > 0) {
          return true;
        }

        payload.id = funnel.id;
        const { error: insertErr } = await supabase.from('commercial_funnels').insert(payload);
        if (insertErr) {
          console.error('❌ Erro ao inserir funil no Supabase:', insertErr);
          return false;
        }
        return true;
      } else {
        // Se id não for UUID puro (ex: indicacao_venueId), busca pelo venue_id correspondente
        const venueMatch = funnel.venueId || (funnel.id.includes('_') ? funnel.id.split('_')[1] : null);
        if (venueMatch) {
          const { data: found } = await supabase
            .from('commercial_funnels')
            .select('id')
            .eq('venue_id', venueMatch)
            .eq('is_primary', true)
            .maybeSingle();

          if (found?.id) {
            const { error: updErr } = await supabase
              .from('commercial_funnels')
              .update(payload)
              .eq('id', found.id);
            if (!updErr) return true;
          }
        }
        return false;
      }
    } catch (err) {
      console.error('Falha em funnelService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('commercial_funnels').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar funil comercial:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em funnelService.delete:', err);
      return false;
    }
  }
};
