import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BenefitCatalogItem, VipRewardCatalogItem } from '../types/admin';

export const catalogService = {
  // ── Benefits Catalog ──────────────────────────────────────────────────────
  async getAllBenefits(): Promise<BenefitCatalogItem[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('benefit_catalog_items')
        .select('*')
        .order('points_required', { ascending: true });

      if (error) {
        console.error('Erro ao buscar catálogo de benefícios:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        venueId: row.venue_id,
        name: row.name,
        description: row.description || '',
        pointsRequired: row.points_required || 1,
        cardImageUrl: row.card_image_url || '',
        detailImageUrl: row.detail_image_url || '',
        category: row.category || 'festa',
        defaultValue: row.default_value ? Number(row.default_value) : undefined,
        estimatedValue: row.estimated_value ? Number(row.estimated_value) : undefined,
      }));
    } catch (err) {
      console.error('Falha em catalogService.getAllBenefits:', err);
      return [];
    }
  },

  async upsertBenefit(benefit: BenefitCatalogItem): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload: any = {
        id: benefit.id,
        venue_id: benefit.venueId,
        name: benefit.name,
        description: benefit.description,
        points_required: benefit.pointsRequired,
        card_image_url: benefit.cardImageUrl,
        detail_image_url: benefit.detailImageUrl,
        category: benefit.category,
        default_value: benefit.defaultValue,
        estimated_value: benefit.estimatedValue,
      };

      const { error } = await supabase.from('benefit_catalog_items').upsert(payload);
      if (error) {
        console.error('Erro ao salvar benefício:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em catalogService.upsertBenefit:', err);
      return false;
    }
  },

  async deleteBenefit(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('benefit_catalog_items').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar benefício:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em catalogService.deleteBenefit:', err);
      return false;
    }
  },

  // ── VIP Rewards Catalog ───────────────────────────────────────────────────
  async getAllVipRewards(): Promise<VipRewardCatalogItem[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('vip_reward_catalog_items')
        .select('*')
        .order('sales_required', { ascending: true });

      if (error) {
        console.error('Erro ao buscar catálogo VIP:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        venueId: row.venue_id,
        name: row.name,
        description: row.description || '',
        salesRequired: row.sales_required || 1,
        cardImageUrl: row.card_image_url || '',
        detailImageUrl: row.detail_image_url || '',
        badgeTag: row.badge_tag,
        estimatedValue: row.estimated_value ? Number(row.estimated_value) : undefined,
      }));
    } catch (err) {
      console.error('Falha em catalogService.getAllVipRewards:', err);
      return [];
    }
  },

  async upsertVipReward(reward: VipRewardCatalogItem): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload: any = {
        id: reward.id,
        venue_id: reward.venueId,
        name: reward.name,
        description: reward.description,
        sales_required: reward.salesRequired,
        card_image_url: reward.cardImageUrl,
        detail_image_url: reward.detailImageUrl,
        badge_tag: reward.badgeTag,
        estimated_value: reward.estimatedValue,
      };

      const { error } = await supabase.from('vip_reward_catalog_items').upsert(payload);
      if (error) {
        console.error('Erro ao salvar prêmio VIP:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em catalogService.upsertVipReward:', err);
      return false;
    }
  },

  async deleteVipReward(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('vip_reward_catalog_items').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar prêmio VIP:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em catalogService.deleteVipReward:', err);
      return false;
    }
  },
};
