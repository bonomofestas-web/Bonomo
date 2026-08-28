import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Venue } from '../types/admin';

export const venueService = {
  async getAll(): Promise<Venue[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Erro ao buscar casas de festa:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        tagline: row.tagline || '',
        logoUrl: row.logo_url || undefined,
        ballroomImageUrl: row.ballroom_image_url || '',
        description: row.description || '',
        experienceText: row.experience_text || '',
        address: row.address || '',
        yearsInBusiness: row.years_in_business || 0,
        eventsCompleted: row.events_completed || 0,
        guestsDelighted: row.guests_delighted || 0,
        googleMapsEmbedUrl: row.google_maps_embed_url || '',
        googleMapsLink: row.google_maps_link || '',
        wazeLink: row.waze_link || '',
        defaultDressCode: row.default_dress_code || 'Esporte Fino / Gala',
        primaryColor: row.primary_color || '#D4AF37',
        secondaryColor: row.secondary_color || '#AA7C11',
        accentColor: row.accent_color || '#F3E5AB',
        glowColor: row.glow_color || 'rgba(212,175,55,0.4)',
        fontFamily: row.font_family || 'Montserrat',
        welcomeVideoUrl: row.welcome_video_url || undefined,
        welcomeVideoName: row.welcome_video_name || undefined,
        leadDistributionMode: row.lead_distribution_mode || 'queue',
        leadDistributionSdrIds: row.lead_distribution_sdr_ids || [],
        roundRobinNextIndex: row.round_robin_next_index || 0,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Falha em venueService.getAll:', err);
      return [];
    }
  },

  async getById(id: string): Promise<Venue | null> {
    if (!isSupabaseConfigured || !id) return null;
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        tagline: data.tagline || '',
        logoUrl: data.logo_url || undefined,
        ballroomImageUrl: data.ballroom_image_url || '',
        description: data.description || '',
        experienceText: data.experience_text || '',
        address: data.address || '',
        yearsInBusiness: data.years_in_business || 0,
        eventsCompleted: data.events_completed || 0,
        guestsDelighted: data.guests_delighted || 0,
        googleMapsEmbedUrl: data.google_maps_embed_url || '',
        googleMapsLink: data.google_maps_link || '',
        wazeLink: data.waze_link || '',
        defaultDressCode: data.default_dress_code || 'Esporte Fino / Gala',
        primaryColor: data.primary_color || '#D4AF37',
        secondaryColor: data.secondary_color || '#AA7C11',
        accentColor: data.accent_color || '#F3E5AB',
        glowColor: data.glow_color || 'rgba(212,175,55,0.4)',
        fontFamily: data.font_family || 'Montserrat',
        welcomeVideoUrl: data.welcome_video_url || undefined,
        welcomeVideoName: data.welcome_video_name || undefined,
        leadDistributionMode: data.lead_distribution_mode || 'queue',
        leadDistributionSdrIds: data.lead_distribution_sdr_ids || [],
        roundRobinNextIndex: data.round_robin_next_index || 0,
        createdAt: data.created_at || new Date().toISOString(),
      };
    } catch (err) {
      console.error('Falha em venueService.getById:', err);
      return null;
    }
  },

  async upsert(venue: Partial<Venue> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(venue.id);
      
      const payload: any = {};
      if (venue.name !== undefined) payload.name = venue.name;
      if (venue.tagline !== undefined) payload.tagline = venue.tagline;
      if (venue.logoUrl !== undefined) payload.logo_url = venue.logoUrl;
      if (venue.ballroomImageUrl !== undefined) payload.ballroom_image_url = venue.ballroomImageUrl;
      if (venue.description !== undefined) payload.description = venue.description;
      if (venue.experienceText !== undefined) payload.experience_text = venue.experienceText;
      if (venue.address !== undefined) payload.address = venue.address;
      if (venue.yearsInBusiness !== undefined) payload.years_in_business = venue.yearsInBusiness;
      if (venue.eventsCompleted !== undefined) payload.events_completed = venue.eventsCompleted;
      if (venue.guestsDelighted !== undefined) payload.guests_delighted = venue.guestsDelighted;
      if (venue.googleMapsEmbedUrl !== undefined) payload.google_maps_embed_url = venue.googleMapsEmbedUrl;
      if (venue.googleMapsLink !== undefined) payload.google_maps_link = venue.googleMapsLink;
      if (venue.wazeLink !== undefined) payload.waze_link = venue.wazeLink;
      if (venue.defaultDressCode !== undefined) payload.default_dress_code = venue.defaultDressCode;
      if (venue.primaryColor !== undefined) payload.primary_color = venue.primaryColor;
      if (venue.secondaryColor !== undefined) payload.secondary_color = venue.secondaryColor;
      if (venue.accentColor !== undefined) payload.accent_color = venue.accentColor;
      if (venue.glowColor !== undefined) payload.glow_color = venue.glowColor;
      if (venue.fontFamily !== undefined) payload.font_family = venue.fontFamily;
      if (venue.welcomeVideoUrl !== undefined) payload.welcome_video_url = venue.welcomeVideoUrl;
      if (venue.welcomeVideoName !== undefined) payload.welcome_video_name = venue.welcomeVideoName;
      if (venue.leadDistributionMode !== undefined) payload.lead_distribution_mode = venue.leadDistributionMode;
      if (venue.leadDistributionSdrIds !== undefined) payload.lead_distribution_sdr_ids = venue.leadDistributionSdrIds;
      if (venue.roundRobinNextIndex !== undefined) payload.round_robin_next_index = venue.roundRobinNextIndex;

      if (isUuid) {
        // Try update first so only specified fields change
        const { data: updated, error: updateErr } = await supabase
          .from('venues')
          .update(payload)
          .eq('id', venue.id)
          .select('id');

        if (!updateErr && updated && updated.length > 0) {
          return true;
        }

        // If record does not exist yet, insert it
        payload.id = venue.id;
        const { error: insertErr } = await supabase.from('venues').insert(payload);
        if (insertErr) {
          console.error('Erro ao inserir casa de festa por UUID:', insertErr);
          return false;
        }
        return true;
      } else if (venue.name) {
        const { data: existing } = await supabase.from('venues').select('id').eq('name', venue.name).maybeSingle();
        if (existing?.id) {
          await supabase.from('venues').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('venues').insert(payload);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Falha em venueService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = isUuid 
        ? supabase.from('venues').delete().eq('id', id)
        : supabase.from('venues').delete().ilike('name', `%${id}%`);
      const { error } = await query;
      if (error) {
        console.error('Erro ao deletar casa de festa:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em venueService.delete:', err);
      return false;
    }
  }
};
