import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Lead, LeadActivity } from '../types/admin';

export const leadService = {
  async getAll(): Promise<Lead[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('Erro ao buscar leads:', leadsError);
        return [];
      }

      // Fetch activities and tasks for leads
      const { data: activitiesData } = await supabase.from('lead_activities').select('*');
      const { data: participantsData } = await supabase.from('lead_participants').select('*');

      return (leadsData || []).map(row => {
        const leadActivities: LeadActivity[] = (activitiesData || [])
          .filter(a => a.lead_id === row.id)
          .map(a => ({
            id: a.id,
            leadId: a.lead_id,
            timestamp: a.timestamp || new Date().toISOString(),
            type: a.type,
            title: a.title,
            text: a.text,
            authorName: a.author_name,
            authorId: a.author_id,
            authorAvatarUrl: a.author_avatar_url,
          }));

        const leadParticipants = (participantsData || [])
          .filter(p => p.lead_id === row.id)
          .map(p => ({
            id: p.id,
            collaboratorId: p.collaborator_id,
            collaboratorName: p.collaborator_name,
            collaboratorRole: p.collaborator_role,
            collaboratorAvatarUrl: p.collaborator_avatar_url,
            action: p.action,
            timestamp: p.timestamp,
          }));

        return {
          id: row.id,
          funnelId: row.funnel_id,
          venueId: row.venue_id,
          debutanteId: row.debutante_id || '',
          debutanteName: row.debutante_name || 'Indicação Externa',
          debutanteSlug: row.debutante_slug || '',
          name: row.name,
          phone: row.phone,
          age: row.age || 14,
          group: row.group || 'Amigos',
          notes: row.notes || '',
          stage: row.stage,
          isValidated: row.is_validated || false,
          pointsGranted: row.points_granted || 0,
          rejectionReason: row.rejection_reason,
          sdrId: row.sdr_id,
          sdrName: row.sdr_name,
          closerId: row.closer_id,
          closerName: row.closer_name,
          assignedTo: row.assigned_to,
          dealValue: row.deal_value ? Number(row.deal_value) : 0,
          packageSold: row.package_sold,
          contractDate: row.contract_date,
          partyDate: row.party_date,
          participants: leadParticipants,
          tasks: [],
          activities: leadActivities,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error('Falha em leadService.getAll:', err);
      return [];
    }
  },

  async upsert(lead: Partial<Lead> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload: any = {
        id: lead.id,
        funnel_id: (lead as any).funnelId || lead.venueId, // fallback
        venue_id: lead.venueId,
        debutante_id: lead.debutanteId || null,
        debutante_name: lead.debutanteName,
        debutante_slug: lead.debutanteSlug,
        name: lead.name,
        phone: lead.phone,
        age: lead.age,
        group: lead.group,
        notes: lead.notes,
        stage: lead.stage,
        is_validated: lead.isValidated,
        points_granted: lead.pointsGranted,
        rejection_reason: lead.rejectionReason,
        sdr_id: lead.sdrId || null,
        sdr_name: lead.sdrName,
        closer_id: lead.closerId || null,
        closer_name: lead.closerName,
        assigned_to: lead.assignedTo,
        deal_value: lead.dealValue,
        package_sold: lead.packageSold,
        contract_date: lead.contractDate,
        party_date: lead.partyDate,
      };

      const { error } = await supabase.from('leads').upsert(payload);
      if (error) {
        console.error('Erro ao salvar lead no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em leadService.upsert:', err);
      return false;
    }
  },

  async addActivity(leadId: string, activity: Omit<LeadActivity, 'id'>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: activity.type,
        title: activity.title,
        text: activity.text,
        author_name: activity.authorName,
        author_id: activity.authorId || null,
        author_avatar_url: activity.authorAvatarUrl,
        timestamp: activity.timestamp || new Date().toISOString(),
      });
      if (error) {
        console.error('Erro ao adicionar atividade:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em leadService.addActivity:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar lead:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em leadService.delete:', err);
      return false;
    }
  }
};
