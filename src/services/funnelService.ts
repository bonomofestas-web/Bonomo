import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CommercialFunnel } from '../types/admin';
import { generateUuid } from '../utils/uuid';

export const funnelService = {
  async getAll(): Promise<CommercialFunnel[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('commercial_funnels')
        .select('*')
        .order('order', { ascending: true })
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
        venueId: row.venue_id || 'all',
        masterId: row.master_id || undefined,
        sharedVenueIds: Array.isArray(row.shared_venue_ids) ? row.shared_venue_ids : [],
        allowedCollaboratorIds: row.allowed_collaborator_ids || [],
        badge: row.badge || row.category,
        badgeColor: row.badge_color || '#3B82F6',
        icon: row.icon || 'target',
        customImageUrl: row.custom_image_url,
        isPinned: row.is_pinned ?? false,
        stagesCount: row.stages_count || (Array.isArray(row.stages) ? row.stages.length : 4),
        stages: Array.isArray(row.stages) ? row.stages : undefined,
        isEntryStageActive: row.is_entry_stage_active ?? false,
        detectDuplicates: row.detect_duplicates ?? true,
        duplicateRuleConfig: row.duplicate_rule_config || {
          matchPhone: true,
          matchEmail: false,
          matchName: false,
          action: 'keep_recent',
        },
        isPrimary: row.is_primary || false,
        isDemo: row.is_demo || false,
        isPostSale: row.is_post_sale ?? false,
        allowedRoles: row.allowed_roles || [],
        packageOptions: Array.isArray(row.package_options) ? row.package_options : row.packageOptions,
        paymentOptions: Array.isArray(row.payment_options) ? row.payment_options : row.paymentOptions,
        predefinedTags: Array.isArray(row.predefined_tags) ? row.predefined_tags : row.predefinedTags,
        allowCollaboratorsCreateTags: row.allow_collaborators_create_tags ?? row.duplicate_rule_config?._allowCollaboratorsCreateTags ?? false,
        customFields: Array.isArray(row.custom_fields) ? row.custom_fields : (row.customFields || []),
        defaultWhatsAppSourceId: row.default_whatsapp_source_id || row.duplicate_rule_config?._defaultWhatsAppSourceId || '',
        priorityWhatsappPerVenue: row.priority_whatsapp_per_venue || row.duplicate_rule_config?._priorityWhatsappPerVenue || {},
        venueDistributionConfig: row.venue_distribution_config || row.duplicate_rule_config?._venueDistributionConfig || {},
        isWonStageEnabled: row.is_won_stage_enabled ?? true,
        distributionMode: row.distribution_mode || 'manual',
        assignedSdrIds: Array.isArray(row.assigned_sdr_ids) ? row.assigned_sdr_ids : [],
        roundRobinNextIndex: row.round_robin_next_index || 0,
        pinnedAt: row.pinned_at || undefined,
        order: row.order !== undefined ? Number(row.order) : 0,
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
      if (funnel.venueId !== undefined) {
        payload.venue_id = (funnel.venueId === 'all' || !funnel.venueId) ? null : funnel.venueId;
      }
      if (funnel.sharedVenueIds !== undefined) payload.shared_venue_ids = funnel.sharedVenueIds;
      if (funnel.allowedCollaboratorIds !== undefined) payload.allowed_collaborator_ids = funnel.allowedCollaboratorIds;
      if (funnel.badge !== undefined) payload.badge = funnel.badge;
      if (funnel.badgeColor !== undefined) payload.badge_color = funnel.badgeColor;
      if (funnel.icon !== undefined) payload.icon = funnel.icon;
      if (funnel.customImageUrl !== undefined) payload.custom_image_url = funnel.customImageUrl;
      if (funnel.isPinned !== undefined) payload.is_pinned = funnel.isPinned;
      if (funnel.stages !== undefined) payload.stages = funnel.stages;
      if (funnel.stagesCount !== undefined) payload.stages_count = funnel.stagesCount;
      if (funnel.isEntryStageActive !== undefined) payload.is_entry_stage_active = funnel.isEntryStageActive;
      if (funnel.detectDuplicates !== undefined) payload.detect_duplicates = funnel.detectDuplicates;
      
      // Fallback resiliente: guarda as configurações em duplicate_rule_config além das colunas diretas
      const baseDuplicateConfig = funnel.duplicateRuleConfig || {
        matchPhone: true,
        matchEmail: false,
        matchName: false,
        action: 'keep_recent',
      };
      payload.duplicate_rule_config = {
        ...baseDuplicateConfig,
        ...(funnel.priorityWhatsappPerVenue !== undefined ? { _priorityWhatsappPerVenue: funnel.priorityWhatsappPerVenue } : {}),
        ...(funnel.defaultWhatsAppSourceId !== undefined ? { _defaultWhatsAppSourceId: funnel.defaultWhatsAppSourceId } : {}),
        ...(funnel.venueDistributionConfig !== undefined ? { _venueDistributionConfig: funnel.venueDistributionConfig } : {}),
      };

      if (funnel.priorityWhatsappPerVenue !== undefined) payload.priority_whatsapp_per_venue = funnel.priorityWhatsappPerVenue;
      if (funnel.defaultWhatsAppSourceId !== undefined) payload.default_whatsapp_source_id = funnel.defaultWhatsAppSourceId;
      if (funnel.venueDistributionConfig !== undefined) payload.venue_distribution_config = funnel.venueDistributionConfig;

      if (funnel.isPrimary !== undefined) payload.is_primary = funnel.isPrimary;
      if (funnel.isDemo !== undefined) payload.is_demo = funnel.isDemo;
      if (funnel.isPostSale !== undefined) payload.is_post_sale = funnel.isPostSale;
      if (funnel.allowedRoles !== undefined) payload.allowed_roles = funnel.allowedRoles;
      if (funnel.packageOptions !== undefined) payload.package_options = funnel.packageOptions;
      if (funnel.paymentOptions !== undefined) payload.payment_options = funnel.paymentOptions;
      if (funnel.predefinedTags !== undefined) payload.predefined_tags = funnel.predefinedTags;
      if (funnel.allowCollaboratorsCreateTags !== undefined) {
        payload.allow_collaborators_create_tags = funnel.allowCollaboratorsCreateTags;
        payload.duplicate_rule_config._allowCollaboratorsCreateTags = funnel.allowCollaboratorsCreateTags;
      }
      if (funnel.customFields !== undefined) payload.custom_fields = funnel.customFields;
      if (funnel.isWonStageEnabled !== undefined) payload.is_won_stage_enabled = funnel.isWonStageEnabled;
      if (funnel.distributionMode !== undefined) payload.distribution_mode = funnel.distributionMode;
      if (funnel.masterId !== undefined) payload.master_id = funnel.masterId;
      if (funnel.assignedSdrIds !== undefined) payload.assigned_sdr_ids = funnel.assignedSdrIds;
      if (funnel.roundRobinNextIndex !== undefined) payload.round_robin_next_index = funnel.roundRobinNextIndex;
      if (funnel.pinnedAt !== undefined) payload.pinned_at = funnel.pinnedAt || null;
      if (funnel.order !== undefined) payload.order = funnel.order;

      // Se venue_id for nulo mas houver shared_venue_ids válidos, usa o primeiro como primário
      if (!payload.venue_id && funnel.sharedVenueIds && funnel.sharedVenueIds.length > 0) {
        const firstValidVenue = funnel.sharedVenueIds.find(vid => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vid));
        if (firstValidVenue) payload.venue_id = firstValidVenue;
      }

      if (isUuid) {
        const { data: updated, error: updateErr } = await supabase
          .from('commercial_funnels')
          .update(payload)
          .eq('id', funnel.id)
          .select('id');

        if (!updateErr && updated && updated.length > 0) {
          return true;
        }

        if (updateErr) {
          console.warn('⚠️ Tentativa de update completo em commercial_funnels falhou, tentando fallback resiliente com campos principais:', updateErr.message);
          const fallbackPayload: any = {
            name: funnel.name,
            stages: funnel.stages,
            stages_count: funnel.stagesCount,
            category: funnel.category,
            description: funnel.description,
            icon: funnel.icon,
            badge: funnel.badge,
            badge_color: funnel.badgeColor,
            is_pinned: funnel.isPinned,
            pinned_at: funnel.pinnedAt,
            order: funnel.order,
            is_primary: funnel.isPrimary,
            master_id: funnel.masterId,
            duplicate_rule_config: payload.duplicate_rule_config,
          };
          if (payload.venue_id) fallbackPayload.venue_id = payload.venue_id;
          Object.keys(fallbackPayload).forEach(k => fallbackPayload[k] === undefined && delete fallbackPayload[k]);

          const { data: retryUpdated, error: retryErr } = await supabase
            .from('commercial_funnels')
            .update(fallbackPayload)
            .eq('id', funnel.id)
            .select('id');

          if (!retryErr && retryUpdated && retryUpdated.length > 0) {
            return true;
          }
        }

        payload.id = funnel.id;
        let { error: insertErr } = await supabase.from('commercial_funnels').insert(payload);

        // Se falhou por venue_id not-null violation, busca a primeira casa disponível no banco
        if (insertErr && (insertErr.code === '23502' || insertErr.message?.includes('venue_id'))) {
          const { data: vList } = await supabase.from('venues').select('id').limit(1);
          if (vList && vList[0]) {
            payload.venue_id = vList[0].id;
            const retry = await supabase.from('commercial_funnels').insert(payload);
            insertErr = retry.error;
          }
        }

        if (insertErr) {
          console.warn('⚠️ Tentativa de insert completo em commercial_funnels falhou, tentando fallback:', insertErr.message);
          let safeVenueId = payload.venue_id;
          if (!safeVenueId || safeVenueId === 'all' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeVenueId)) {
            const { data: vList } = await supabase.from('venues').select('id').limit(1);
            safeVenueId = vList?.[0]?.id || null;
          }

          const fallbackInsert: any = {
            id: funnel.id,
            name: funnel.name || 'Novo Funil',
            venue_id: safeVenueId,
            master_id: funnel.masterId,
            category: funnel.category || 'Marketing Digital',
            stages: funnel.stages || [],
            stages_count: funnel.stagesCount || (funnel.stages?.length || 4),
          };
          const { error: retryInsErr } = await supabase.from('commercial_funnels').insert(fallbackInsert);
          if (!retryInsErr) return true;
          console.error('❌ Erro final ao inserir funil no Supabase:', insertErr);
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

  /**
   * Garante que a conta possua ao menos um funil comercial padrão (criado no onboarding).
   * Não cria funis adicionais ao adicionar novas unidades (funil é por conta, não por casa).
   */
  async ensureDefaultFunnels(_venues: { id: string; name: string }[], currentFunnels?: CommercialFunnel[]): Promise<CommercialFunnel[]> {
    if (!isSupabaseConfigured) return currentFunnels || [];
    try {
      const allFunnels = currentFunnels && currentFunnels.length > 0 ? [...currentFunnels] : await this.getAll();

      // Se a conta já possui ao menos um funil comercial ativo, NÃO cria funis adicionais por unidade
      if (allFunnels.length > 0) {
        return allFunnels;
      }

      // Se a conta não possui nenhum funil cadastrado (onboarding), cria 1 funil comercial padrão "Funil de Atendimento"
      const defaultFunnel: CommercialFunnel = {
        id: generateUuid(),
        name: 'Funil de Atendimento',
        category: 'Vendas & Atendimento',
        description: 'Funil padrão de captação, atendimento e conversão de leads.',
        venueId: 'all',
        sharedVenueIds: [],
        allowedCollaboratorIds: [],
        badge: 'Atendimento',
        badgeColor: '#D4AF37',
        icon: 'target',
        stagesCount: 5,
        isPrimary: true,
        isDemo: false,
        createdAt: new Date().toISOString(),
      };

      const saved = await this.upsert(defaultFunnel);
      if (saved) {
        allFunnels.push(defaultFunnel);
      }

      return allFunnels;
    } catch (err) {
      console.error('Falha em funnelService.ensureDefaultFunnels:', err);
      return currentFunnels || [];
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
  },

  async reorderFunnels(orderedFunnels: CommercialFunnel[]): Promise<boolean> {
    if (!isSupabaseConfigured || !Array.isArray(orderedFunnels)) return false;
    try {
      const updates = orderedFunnels.map((funnel, index) => 
        supabase
          .from('commercial_funnels')
          .update({ order: index })
          .eq('id', funnel.id)
      );
      await Promise.all(updates);
      return true;
    } catch (err) {
      console.error('Falha em funnelService.reorderFunnels:', err);
      return false;
    }
  }
};
