import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MqlProfile, MqlQuestion, Venue } from '../types/admin';

export const createDefaultMqlQuestionsForVenue = (_venueId: string): MqlQuestion[] => [];

export type MqlProfileResult = { ok: true; profile: MqlProfile } | { ok: false; reason: 'funnel_taken' | 'error' };

const PROFILE_COLUMNS = 'id, master_id, name, is_active, created_by_id, created_by_name, created_at, updated_at';

const mapProfile = (row: any, funnelIds: string[]): MqlProfile => ({
  id: row.id,
  masterId: row.master_id,
  name: row.name,
  isActive: row.is_active !== false,
  createdById: row.created_by_id || undefined,
  createdByName: row.created_by_name || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
  funnelIds,
});

export const mqlService = {
  /** Perfis de qualificacao ativos do Master, com os funis vinculados. */
  async listProfiles(masterId: string): Promise<MqlProfile[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    try {
      const [{ data: profiles, error }, { data: links, error: linkError }] = await Promise.all([
        supabase.from('mql_profiles').select(PROFILE_COLUMNS).eq('master_id', masterId).eq('is_active', true),
        supabase.from('mql_profile_funnels').select('profile_id, funnel_id').eq('master_id', masterId),
      ]);
      if (error || linkError) {
        console.error('[mqlService.listProfiles]', (error || linkError)?.message);
        return [];
      }
      return (profiles || []).map(p =>
        mapProfile(p, (links || []).filter(l => l.profile_id === p.id).map(l => l.funnel_id as string)));
    } catch (err) {
      console.error('Falha em mqlService.listProfiles:', err);
      return [];
    }
  },

  /** Cria o perfil registrando autor e data. A regra "1 funil = 1 MQL" e garantida pelo banco (UNIQUE funnel_id). */
  async createProfile(
    masterId: string,
    input: { name: string; funnelIds: string[]; createdById?: string; createdByName?: string },
  ): Promise<MqlProfileResult> {
    if (!isSupabaseConfigured || !masterId) return { ok: false, reason: 'error' };
    const { data, error } = await supabase
      .from('mql_profiles')
      .insert({
        master_id: masterId,
        name: input.name,
        created_by_id: input.createdById || null,
        created_by_name: input.createdByName || null,
      })
      .select(PROFILE_COLUMNS)
      .single();
    if (error || !data) {
      console.error('[mqlService.createProfile]', error?.message);
      return { ok: false, reason: 'error' };
    }
    const linked = await mqlService.setProfileFunnels(masterId, data.id, input.funnelIds);
    if (!linked.ok) {
      await supabase.from('mql_profiles').delete().eq('id', data.id).eq('master_id', masterId);
      return linked;
    }
    return { ok: true, profile: mapProfile(data, input.funnelIds) };
  },

  /** Renomeia e/ou troca os funis do perfil. Funil ja ocupado por outro perfil e recusado pelo banco. */
  async updateProfile(masterId: string, profileId: string, input: { name?: string; funnelIds?: string[] }): Promise<MqlProfileResult> {
    if (!isSupabaseConfigured || !masterId || !profileId) return { ok: false, reason: 'error' };
    if (input.funnelIds) {
      const linked = await mqlService.setProfileFunnels(masterId, profileId, input.funnelIds);
      if (!linked.ok) return linked;
    }
    const { data, error } = await supabase
      .from('mql_profiles')
      .update({ ...(input.name ? { name: input.name } : {}), updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .eq('master_id', masterId)
      .select(PROFILE_COLUMNS)
      .single();
    if (error || !data) {
      console.error('[mqlService.updateProfile]', error?.message);
      return { ok: false, reason: 'error' };
    }
    return { ok: true, profile: mapProfile(data, input.funnelIds || []) };
  },

  /** Troca os vinculos de funil do perfil (restaura os antigos se um funil ja estiver ocupado). */
  async setProfileFunnels(masterId: string, profileId: string, funnelIds: string[]): Promise<{ ok: true } | { ok: false; reason: 'funnel_taken' | 'error' }> {
    const { data: previous } = await supabase
      .from('mql_profile_funnels').select('funnel_id').eq('profile_id', profileId).eq('master_id', masterId);
    const { error: delError } = await supabase
      .from('mql_profile_funnels').delete().eq('profile_id', profileId).eq('master_id', masterId);
    if (delError) return { ok: false, reason: 'error' };
    if (funnelIds.length === 0) return { ok: true };
    const { error } = await supabase
      .from('mql_profile_funnels')
      .insert(funnelIds.map(funnelId => ({ profile_id: profileId, funnel_id: funnelId, master_id: masterId })));
    if (error) {
      const restore = (previous || []).map(r => ({ profile_id: profileId, funnel_id: r.funnel_id, master_id: masterId }));
      if (restore.length > 0) await supabase.from('mql_profile_funnels').insert(restore);
      return { ok: false, reason: error.code === '23505' ? 'funnel_taken' : 'error' };
    }
    return { ok: true };
  },

  /**
   * Exclusao logica: o perfil e as perguntas ficam inativos e os funis sao liberados.
   * Leads ja respondidos mantem o snapshot do MQL da epoca.
   */
  async deactivateProfile(masterId: string, profileId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId || !profileId) return false;
    const { error } = await supabase
      .from('mql_profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .eq('master_id', masterId);
    if (error) {
      console.error('[mqlService.deactivateProfile]', error.message);
      return false;
    }
    await supabase.from('mql_profile_funnels').delete().eq('profile_id', profileId).eq('master_id', masterId);
    await supabase.from('mql_questions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('profile_id', profileId);
    return true;
  },

  async getAll(): Promise<MqlQuestion[]> {
    if (!isSupabaseConfigured) return [];
    try {
      let { data, error } = await supabase
        .from('mql_questions')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        // Migration de perfis ainda nao aplicada (coluna is_active ausente): le sem o filtro.
        const retry = await supabase.from('mql_questions').select('*').order('order_index', { ascending: true });
        data = retry.data;
        error = retry.error;
      }

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
          profileId: row.profile_id || undefined,
          masterId: row.master_id || undefined,
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
        // So envia perfil/master quando existem: mantem funcionando antes da migration de perfis ser aplicada.
        ...(question.profileId ? { profile_id: question.profileId } : {}),
        ...(question.masterId ? { master_id: question.masterId } : {}),
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
