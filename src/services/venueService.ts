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
        logoUrl: row.logo_url,
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
        welcomeVideoUrl: row.welcome_video_url,
        welcomeVideoName: row.welcome_video_name,
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

  async upsert(venue: Partial<Venue> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload: any = {
        id: venue.id,
        name: venue.name,
        tagline: venue.tagline,
        logo_url: venue.logoUrl,
        ballroom_image_url: venue.ballroomImageUrl,
        description: venue.description,
        experience_text: venue.experienceText,
        address: venue.address,
        years_in_business: venue.yearsInBusiness,
        events_completed: venue.eventsCompleted,
        guests_delighted: venue.guestsDelighted,
        google_maps_embed_url: venue.googleMapsEmbedUrl,
        google_maps_link: venue.googleMapsLink,
        waze_link: venue.wazeLink,
        default_dress_code: venue.defaultDressCode,
        primary_color: venue.primaryColor,
        secondary_color: venue.secondaryColor,
        accent_color: venue.accentColor,
        glow_color: venue.glowColor,
        font_family: venue.fontFamily,
        welcome_video_url: venue.welcomeVideoUrl,
        welcome_video_name: venue.welcomeVideoName,
        lead_distribution_mode: venue.leadDistributionMode,
        lead_distribution_sdr_ids: venue.leadDistributionSdrIds,
        round_robin_next_index: venue.roundRobinNextIndex,
      };

      const { error } = await supabase.from('venues').upsert(payload);
      if (error) {
        console.error('Erro ao salvar casa de festa:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em venueService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('venues').delete().eq('id', id);
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
