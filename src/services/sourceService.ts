import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid, generateUuid } from '../utils/uuid';
import type { Source, SourceEventType } from '../types/sources';
import type { Venue, CommercialFunnel } from '../types/admin';

export const sourceService = {
  /**
   * Busca todas as origens com contadores de eventos agregados
   */
  async getAll(): Promise<Source[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (sourcesError) {
        console.error('Erro ao buscar origens:', sourcesError);
        return [];
      }

      // Buscar eventos para calcular métricas
      const { data: eventsData } = await supabase
        .from('source_events')
        .select('source_id, event_type');

      const eventsMap: Record<string, { total: number; views: number; clicks: number; submits: number; leads: number }> = {};

      (eventsData || []).forEach(ev => {
        if (!eventsMap[ev.source_id]) {
          eventsMap[ev.source_id] = { total: 0, views: 0, clicks: 0, submits: 0, leads: 0 };
        }
        eventsMap[ev.source_id].total += 1;
        if (ev.event_type === 'form_view') eventsMap[ev.source_id].views += 1;
        if (ev.event_type === 'link_click') eventsMap[ev.source_id].clicks += 1;
        if (ev.event_type === 'form_submit') eventsMap[ev.source_id].submits += 1;
        if (ev.event_type === 'lead_created') eventsMap[ev.source_id].leads += 1;
      });

      return (sourcesData || []).map(row => ({
        id: row.id,
        venueId: row.venue_id,
        name: row.name,
        type: row.type,
        funnelId: row.funnel_id,
        whatsappInstanceId: row.whatsapp_instance_id || undefined,
        status: (row.status as 'active' | 'inactive') || 'active',
        slug: row.slug || undefined,
        configuration: row.configuration || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        totalEvents: eventsMap[row.id]?.total || 0,
        totalViews: eventsMap[row.id]?.views || 0,
        totalClicks: eventsMap[row.id]?.clicks || 0,
        totalSubmits: eventsMap[row.id]?.submits || 0,
        totalLeads: eventsMap[row.id]?.leads || 0,
      }));
    } catch (err) {
      console.error('Falha em sourceService.getAll:', err);
      return [];
    }
  },

  /**
   * Busca uma origem pública ativa pelo seu slug único (/r/:slug ou /f/:slug)
   */
  async getBySlug(slug: string): Promise<Source | null> {
    if (!isSupabaseConfigured || !slug) return null;
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('slug', slug.trim().toLowerCase())
        .eq('status', 'active')
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        venueId: data.venue_id,
        name: data.name,
        type: data.type,
        funnelId: data.funnel_id,
        whatsappInstanceId: data.whatsapp_instance_id || undefined,
        status: data.status,
        slug: data.slug,
        configuration: data.configuration || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('Falha ao buscar origem por slug:', err);
      return null;
    }
  },

  /**
   * Salva ou atualiza uma origem no Supabase
   */
  async upsert(source: Partial<Source> & { name: string; venueId: string; funnelId?: string; type: Source['type'] }): Promise<Source | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const sourceId = source.id && isUuid(source.id) ? source.id : generateUuid();
      
      let safeVenueId = (source.venueId && source.venueId !== 'all' && isUuid(source.venueId)) ? source.venueId : null;
      if (!safeVenueId) {
        const { data: vList } = await supabase.from('venues').select('id').limit(1);
        safeVenueId = vList?.[0]?.id || 'b2222222-2222-2222-2222-222222222222';
      }

      const payload: any = {
        id: sourceId,
        venue_id: safeVenueId,
        name: source.name,
        type: source.type,
        funnel_id: (source.funnelId && isUuid(source.funnelId)) ? source.funnelId : null,
        whatsapp_instance_id: source.whatsappInstanceId || null,
        status: source.status || 'active',
        slug: source.slug ? source.slug.trim().toLowerCase() : null,
        configuration: source.configuration || {},
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from('sources')
        .upsert(payload)
        .select()
        .single();

      if (error && (error.code === '23502' || error.message?.includes('funnel_id'))) {
        // Fallback de compatibilidade caso a coluna do banco ainda possua restrição NOT NULL
        const { data: anyF } = await supabase.from('commercial_funnels').select('id').limit(1);
        payload.funnel_id = anyF?.[0]?.id || null;
        const retry = await supabase.from('sources').upsert(payload).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Erro ao salvar origem:', error);
        return null;
      }

      return {
        id: data.id,
        venueId: data.venue_id,
        name: data.name,
        type: data.type,
        funnelId: data.funnel_id || '',
        whatsappInstanceId: data.whatsapp_instance_id || undefined,
        status: data.status,
        slug: data.slug,
        configuration: data.configuration || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('Falha em sourceService.upsert:', err);
      return null;
    }
  },

  /**
   * Exclui uma origem
   */
  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('sources').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar origem:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em sourceService.delete:', err);
      return false;
    }
  },

  /**
   * Ativa ou desativa uma origem
   */
  async toggleStatus(id: string, active: boolean): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('sources')
        .update({ status: active ? 'active' : 'inactive', updated_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    } catch (err) {
      console.error('Falha em sourceService.toggleStatus:', err);
      return false;
    }
  },

  /**
   * Registra um evento de origem (link_click, form_view, form_submit, lead_created)
   */
  async recordEvent(
    sourceId: string,
    venueId: string,
    eventType: SourceEventType,
    leadId?: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !sourceId) return false;
    try {
      const eventPayload = {
        id: generateUuid(),
        source_id: sourceId,
        venue_id: venueId,
        event_type: eventType,
        lead_id: leadId || null,
        metadata: {
          ...metadata,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          referrer: typeof document !== 'undefined' ? document.referrer : '',
          timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase.from('source_events').insert(eventPayload);
      if (error) {
        console.warn('Não foi possível gravar evento de origem:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Falha em sourceService.recordEvent:', err);
      return false;
    }
  },

  /**
   * Garante que cada casa de festa tenha sua Origem de Indicação nativa sincronizada.
   * Regra de negócio:
   * - Se houver exatamente 1 funil comercial na conta: vincula automaticamente.
   * - Se houver mais de 1 funil comercial: funnelId fica vazio/pendente para o gestor definir.
   */
  async ensureDefaultReferralSources(venues: Venue[], funnels: CommercialFunnel[]): Promise<void> {
    if (!isSupabaseConfigured || venues.length === 0) return;
    try {
      const existingSources = await this.getAll();

      for (const venue of venues) {
        // Encontra apenas os funis comerciais pertencentes à casa ou ao master da casa (ignora funis de pós-venda)
        const venueFunnels = funnels.filter(f => 
          !f.isPostSale && f.category !== 'Pós-Venda' && f.category !== 'pos_venda' &&
          (f.venueId === venue.id || 
          (f.venueId === 'all' && (f.masterId === venue.masterId || !f.masterId && !venue.masterId)))
        );
        const hasExactlyOneFunnel = venueFunnels.length === 1 && isUuid(venueFunnels[0].id);
        const primaryFunnel = venueFunnels.find(f => f.isPrimary);
        const autoFunnelId = hasExactlyOneFunnel 
          ? venueFunnels[0].id 
          : (primaryFunnel?.id && isUuid(primaryFunnel.id) ? primaryFunnel.id : '');

        const venueSources = existingSources.filter(s => s.venueId === venue.id && s.type === 'referral');
        const expectedName = `Indicações • ${venue.name}`;

        if (venueSources.length === 0) {
          await this.upsert({
            id: generateUuid(),
            venueId: venue.id,
            name: expectedName,
            type: 'referral',
            funnelId: autoFunnelId,
            status: 'active',
            configuration: {
              systemManaged: true,
            },
          });
        } else {
          // Mantém a primeira e atualiza o nome caso a casa de festa tenha sido renomeada
          const primarySource = venueSources[0];
          const isCurrentFunnelValid = primarySource.funnelId && venueFunnels.some(f => f.id === primarySource.funnelId);
          const finalFunnelId = isCurrentFunnelValid ? primarySource.funnelId : autoFunnelId;

          if (primarySource.name !== expectedName || primarySource.funnelId !== finalFunnelId) {
            await this.upsert({
              ...primarySource,
              name: expectedName,
              funnelId: finalFunnelId,
              status: 'active',
            });
          }
          // Remove eventuais duplicatas excedentes
          if (venueSources.length > 1) {
            for (let i = 1; i < venueSources.length; i++) {
              await this.delete(venueSources[i].id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Falha ao sincronizar origens padrão de indicação:', err);
    }
  },

  /**
   * Identifica a sub-origem e o funil de destino com base na mensagem de entrada do WhatsApp
   */
  matchWhatsAppSubSource(source: Source, messageText: string): { subSource?: string; funnelId: string } {
    const defaultFunnelId = source.funnelId;
    if (!messageText || !source.configuration?.subSources || source.configuration.subSources.length === 0) {
      return { subSource: undefined, funnelId: defaultFunnelId };
    }

    const cleanMsg = messageText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    for (const sub of source.configuration.subSources) {
      if (!sub.keyword) continue;

      const cleanKey = sub.keyword
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      if (cleanKey && cleanMsg.includes(cleanKey)) {
        return {
          subSource: sub.name,
          funnelId: sub.funnelId || defaultFunnelId,
        };
      }
    }

    return { subSource: undefined, funnelId: defaultFunnelId };
  }
};

