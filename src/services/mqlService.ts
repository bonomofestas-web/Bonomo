import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MqlQuestion, Venue } from '../types/admin';

export const createDefaultMqlQuestionsForVenue = (_venueId: string): MqlQuestion[] => [];

export const mqlService = {
  async getAll(): Promise<MqlQuestion[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('mql_questions')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Erro ao buscar perguntas de MQL do Supabase:', error);
        return [];
      }

      return (data || []).map(row => {
        const rawVenueIds: string[] = Array.isArray(row.venue_ids) 
          ? row.venue_ids 
          : (row.venue_id ? [row.venue_id] : []);

        const rawFunnelIds: string[] = Array.isArray(row.funnel_ids)
          ? row.funnel_ids
          : (row.funnel_id ? [row.funnel_id] : []);

        return {
          id: row.id,
          venueId: row.venue_id || (rawVenueIds[0] || 'all'),
          venueIds: rawVenueIds,
          funnelId: row.funnel_id || (rawFunnelIds[0] || undefined),
          funnelIds: rawFunnelIds,
          profileName: row.profile_name || '',
          title: row.title,
          description: row.description || '',
          weight: row.weight ?? 1,
          order: row.order_index ?? 0,
          options: Array.isArray(row.options) ? row.options : [],
        };
      });
    } catch (err) {
      console.error('Falha em mqlService.getAll:', err);
      return [];
    }
  },

  async upsert(question: MqlQuestion): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      const venueIds = (question.venueIds || [])
        .filter(id => uuidRegex.test(id));

      if (venueIds.length === 0 && question.venueId && uuidRegex.test(question.venueId)) {
        venueIds.push(question.venueId);
      }

      const primaryVenueId = venueIds[0] || (question.venueId && uuidRegex.test(question.venueId) ? question.venueId : null);

      const funnelIds = (question.funnelIds || [])
        .filter(id => uuidRegex.test(id));

      if (funnelIds.length === 0 && question.funnelId && uuidRegex.test(question.funnelId)) {
        funnelIds.push(question.funnelId);
      }

      const primaryFunnelId = funnelIds[0] || (question.funnelId && uuidRegex.test(question.funnelId) ? question.funnelId : null);

      const payload: any = {
        id: question.id,
        venue_id: primaryVenueId,
        venue_ids: venueIds,
        funnel_id: primaryFunnelId,
        funnel_ids: funnelIds,
        profile_name: question.profileName || null,
        title: question.title,
        description: question.description || null,
        weight: question.weight ?? 1,
        order_index: question.order ?? 0,
        options: question.options || [],
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('mql_questions')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar pergunta MQL no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em mqlService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('mql_questions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar pergunta MQL:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em mqlService.delete:', err);
      return false;
    }
  },

  async ensureDefaultQuestions(_venues: Venue[]): Promise<MqlQuestion[]> {
    return [];
  },
};
