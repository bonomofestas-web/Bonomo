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
        isPinned: row.is_pinned || false,
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
      const payload: any = {
        id: funnel.id,
        name: funnel.name,
        category: funnel.category,
        description: funnel.description,
        venue_id: funnel.venueId,
        allowed_collaborator_ids: funnel.allowedCollaboratorIds || [],
        badge: funnel.badge,
        badge_color: funnel.badgeColor,
        icon: funnel.icon,
        custom_image_url: funnel.customImageUrl,
        is_pinned: funnel.isPinned,
        stages_count: funnel.stagesCount,
        is_primary: funnel.isPrimary,
        is_demo: funnel.isDemo,
      };

      const { error } = await supabase.from('commercial_funnels').upsert(payload);
      if (error) {
        console.error('Erro ao salvar funil comercial:', error);
        return false;
      }
      return true;
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
