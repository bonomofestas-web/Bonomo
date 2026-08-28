import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { JourneyTemplate } from '../types/admin';

export const journeyTemplateService = {
  async getAll(): Promise<JourneyTemplate[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('journey_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        venueId: row.venue_id,
        name: row.name,
        description: row.description || '',
        seasonOrPeriod: row.season_or_period,
        milestones: row.milestones || [],
        vipRewards: row.vip_rewards || [],
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },

  async upsert(template: JourneyTemplate): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(template.id);
      
      const payload: any = {
        name: template.name,
        description: template.description || '',
        season_or_period: template.seasonOrPeriod || null,
        milestones: template.milestones || [],
        vip_rewards: template.vipRewards || [],
      };

      if (template.venueId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(template.venueId)) {
        payload.venue_id = template.venueId;
      }

      if (isUuid) {
        payload.id = template.id;
      }

      const { error } = await supabase.from('journey_templates').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Erro ao salvar journey_template no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Falha em journeyTemplateService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('journey_templates').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }
};
