import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid, generateUuid } from '../utils/uuid';
import type { Lead, LeadActivity, LeadParticipant } from '../types/admin';

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

        const leadParticipants: LeadParticipant[] = (participantsData || [])
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
          email: row.email,
          neighborhood: row.neighborhood,
          address: row.address,
          contacts: row.contacts || [],
          primaryContactRole: row.primary_contact_role || 'debutante',
          eventType: row.event_type || '15 Anos',
          eventDate: row.event_date || row.party_date,
          debutanteBirthDate: row.debutante_birth_date,
          estimatedGuests: row.estimated_guests,
          desiredPeriod: row.desired_period,
          interestService: row.interest_service || row.package_sold,
          estimatedBudget: row.estimated_budget ? Number(row.estimated_budget) : (row.deal_value ? Number(row.deal_value) : undefined),
          paymentMethod: row.payment_method,
          temperature: row.temperature || 'warm',
          tags: row.tags || [],
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
      const safeId = isUuid(lead.id) ? lead.id : generateUuid();
      const safeVenueId = isUuid(lead.venueId) ? lead.venueId : 'a1111111-1111-1111-1111-111111111111';
      const safeFunnelId = isUuid((lead as any).funnelId) ? (lead as any).funnelId : 'f1111111-1111-1111-1111-111111111111';
      const safeDebutanteId = isUuid(lead.debutanteId) ? lead.debutanteId : null;

      const payload: any = {
        id: safeId,
        funnel_id: safeFunnelId,
        venue_id: safeVenueId,
        debutante_id: safeDebutanteId,
        debutante_name: lead.debutanteName || 'Indicação Externa',
        debutante_slug: lead.debutanteSlug || '',
        name: lead.name,
        phone: lead.phone,
        age: lead.age || 15,
        group: lead.group || 'Amigos',
        notes: lead.notes || '',
        stage: lead.stage || 'new_lead',
        is_validated: lead.isValidated || false,
        points_granted: lead.pointsGranted || 0,
        rejection_reason: lead.rejectionReason,
        sdr_id: isUuid(lead.sdrId) ? lead.sdrId : null,
        sdr_name: lead.sdrName,
        closer_id: isUuid(lead.closerId) ? lead.closerId : null,
        closer_name: lead.closerName,
        assigned_to: lead.assignedTo,
        deal_value: lead.dealValue,
        package_sold: lead.packageSold,
        contract_date: lead.contractDate,
        party_date: lead.partyDate || lead.eventDate,
      };

      if (lead.email !== undefined) payload.email = lead.email;
      if (lead.neighborhood !== undefined) payload.neighborhood = lead.neighborhood;
      if (lead.address !== undefined) payload.address = lead.address;
      if (lead.contacts !== undefined) payload.contacts = lead.contacts;
      if (lead.primaryContactRole !== undefined) payload.primary_contact_role = lead.primaryContactRole;
      if (lead.eventType !== undefined) payload.event_type = lead.eventType;
      if (lead.eventDate !== undefined) payload.event_date = lead.eventDate;
      if (lead.debutanteBirthDate !== undefined) payload.debutante_birth_date = lead.debutanteBirthDate;
      if (lead.estimatedGuests !== undefined) payload.estimated_guests = lead.estimatedGuests;
      if (lead.desiredPeriod !== undefined) payload.desired_period = lead.desiredPeriod;
      if (lead.interestService !== undefined) payload.interest_service = lead.interestService;
      if (lead.estimatedBudget !== undefined) payload.estimated_budget = lead.estimatedBudget;
      if (lead.paymentMethod !== undefined) payload.payment_method = lead.paymentMethod;
      if (lead.temperature !== undefined) payload.temperature = lead.temperature;
      if (lead.tags !== undefined) payload.tags = lead.tags;

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
        id: generateUuid(),
        lead_id: leadId,
        type: activity.type,
        title: activity.title,
        text: activity.text || '',
        author_name: activity.authorName || 'Administrador',
        author_id: isUuid(activity.authorId) ? activity.authorId : null,
        author_avatar_url: activity.authorAvatarUrl || '',
        timestamp: activity.timestamp || new Date().toISOString(),
      });
      if (error) {
        console.error('❌ Erro ao adicionar atividade no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.addActivity:', err);
      return false;
    }
  },

  async addParticipant(leadId: string, participant: Omit<LeadParticipant, 'id'>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('lead_participants').insert({
        id: generateUuid(),
        lead_id: leadId,
        collaborator_id: isUuid(participant.collaboratorId) ? participant.collaboratorId : null,
        collaborator_name: participant.collaboratorName,
        collaborator_role: participant.collaboratorRole || 'sdr',
        collaborator_avatar_url: participant.collaboratorAvatarUrl || '',
        action: participant.action || 'Assumiu o lead',
        timestamp: participant.timestamp || new Date().toISOString(),
      });
      if (error) {
        console.error('❌ Erro ao adicionar participante no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.addParticipant:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) {
        console.error('❌ Erro ao deletar lead:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.delete:', err);
      return false;
    }
  }
};
