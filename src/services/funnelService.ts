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
        customFields: Array.isArray(row.custom_fields) ? row.custom_fields : row.customFields,
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
      if (funnel.duplicateRuleConfig !== undefined) payload.duplicate_rule_config = funnel.duplicateRuleConfig;
      if (funnel.isPrimary !== undefined) payload.is_primary = funnel.isPrimary;
      if (funnel.isDemo !== undefined) payload.is_demo = funnel.isDemo;
      if (funnel.isPostSale !== undefined) payload.is_post_sale = funnel.isPostSale;
      if (funnel.allowedRoles !== undefined) payload.allowed_roles = funnel.allowedRoles;
      if (funnel.packageOptions !== undefined) payload.package_options = funnel.packageOptions;
      if (funnel.paymentOptions !== undefined) payload.payment_options = funnel.paymentOptions;
      if (funnel.predefinedTags !== undefined) payload.predefined_tags = funnel.predefinedTags;
      if (funnel.customFields !== undefined) payload.custom_fields = funnel.customFields;

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
  }
};
