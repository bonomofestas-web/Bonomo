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
          masterId: row.master_id || undefined,
          code: row.code,
          funnelId: row.funnel_id,
          venueId: row.venue_id,
          venueName: row.venue_name || undefined,
          sourceId: row.source_id,
          sourceName: row.source_name,
          subSource: row.sub_source,
          source: row.source,
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
          funnelEnteredAt: row.funnel_entered_at || row.created_at || new Date().toISOString(),
          mqlScore: row.mql_score !== null && row.mql_score !== undefined ? Number(row.mql_score) : undefined,
          mqlLevel: row.mql_level || undefined,
          mqlAnswers: row.mql_answers || undefined,
          visitCommitment: row.visit_commitment || undefined,
          tastingCommitment: row.tasting_commitment || undefined,
          customFieldValues: row.custom_field_values || {},
          createdBy: row.created_by || undefined,
          createdByName: row.created_by_name || undefined,
          createdByAvatar: row.created_by_avatar || undefined,
          cpf: row.cpf || undefined,
          birthday: row.birthday || undefined,
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
      const payload: any = {};
      if (lead.code !== undefined) payload.code = lead.code;
      if (lead.name !== undefined) payload.name = lead.name;
      if (lead.phone !== undefined) payload.phone = lead.phone;
      if (lead.age !== undefined) payload.age = lead.age;
      if (lead.group !== undefined) payload.group = lead.group;
      if (lead.notes !== undefined) payload.notes = lead.notes;
      if (lead.stage !== undefined) payload.stage = lead.stage;
      if (lead.isValidated !== undefined) payload.is_validated = lead.isValidated;
      if (lead.pointsGranted !== undefined) payload.points_granted = lead.pointsGranted;
      if (lead.rejectionReason !== undefined) payload.rejection_reason = lead.rejectionReason;
      if (lead.funnelEnteredAt !== undefined) payload.funnel_entered_at = lead.funnelEnteredAt;
      
      if (lead.sourceId !== undefined) payload.source_id = isUuid(lead.sourceId) ? lead.sourceId : null;
      if (lead.sourceName !== undefined) {
        payload.source_name = lead.sourceName;
      } else if (lead.source !== undefined) {
        payload.source_name = String(lead.source);
      }
      if (lead.subSource !== undefined) payload.sub_source = lead.subSource;

      if (lead.mqlScore !== undefined) payload.mql_score = lead.mqlScore;
      if (lead.mqlLevel !== undefined) payload.mql_level = lead.mqlLevel;
      if (lead.mqlAnswers !== undefined) payload.mql_answers = lead.mqlAnswers;

      if (lead.sdrId !== undefined) payload.sdr_id = (lead.sdrId && isUuid(lead.sdrId)) ? lead.sdrId : null;
      if (lead.sdrName !== undefined) payload.sdr_name = lead.sdrName || null;
      if (lead.closerId !== undefined) payload.closer_id = (lead.closerId && isUuid(lead.closerId)) ? lead.closerId : null;
      if (lead.closerName !== undefined) payload.closer_name = lead.closerName || null;
      if (lead.assignedTo !== undefined) payload.assigned_to = lead.assignedTo || null;
      
      if (lead.dealValue !== undefined) payload.deal_value = lead.dealValue;
      if (lead.packageSold !== undefined) payload.package_sold = lead.packageSold;
      if (lead.contractDate !== undefined) payload.contract_date = lead.contractDate;
      if (lead.partyDate !== undefined || lead.eventDate !== undefined) {
        payload.party_date = lead.partyDate || lead.eventDate;
      }
      
      const DEFAULT_COMMERCIAL_FUNNEL_ID = 'f1111111-1111-1111-1111-111111111111';
      if (lead.venueId !== undefined) payload.venue_id = isUuid(lead.venueId) ? lead.venueId : null;
      if (lead.venueName !== undefined) payload.venue_name = lead.venueName;
      if ((lead as any).funnelId !== undefined) {
        const rawFId = (lead as any).funnelId;
        payload.funnel_id = isUuid(rawFId) ? rawFId : (rawFId === 'comercial' || !rawFId ? DEFAULT_COMMERCIAL_FUNNEL_ID : null);
      }
      if (lead.debutanteId !== undefined) payload.debutante_id = isUuid(lead.debutanteId) ? lead.debutanteId : null;
      if (lead.debutanteName !== undefined) payload.debutante_name = lead.debutanteName;
      if (lead.debutanteSlug !== undefined) payload.debutante_slug = lead.debutanteSlug;
      if (lead.masterId !== undefined) payload.master_id = isUuid(lead.masterId) ? lead.masterId : null;

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
      if (lead.visitCommitment !== undefined) payload.visit_commitment = lead.visitCommitment;
      if (lead.tastingCommitment !== undefined) payload.tasting_commitment = lead.tastingCommitment;
      if (lead.customFieldValues !== undefined) payload.custom_field_values = lead.customFieldValues;
      if (lead.createdBy !== undefined) payload.created_by = (lead.createdBy && isUuid(lead.createdBy)) ? lead.createdBy : null;
      if (lead.createdByName !== undefined) payload.created_by_name = lead.createdByName || null;
      if (lead.createdByAvatar !== undefined) payload.created_by_avatar = lead.createdByAvatar || null;
      if (lead.cpf !== undefined) payload.cpf = lead.cpf || null;
      if (lead.birthday !== undefined) payload.birthday = lead.birthday || null;

      if (isUuid(lead.id)) {
        // Tenta fazer UPDATE no registro existente
        const { data: updated, error: updateErr } = await supabase
          .from('leads')
          .update(payload)
          .eq('id', lead.id)
          .select('id');

        if (!updateErr && updated && updated.length > 0) {
          return true;
        }

        // Fallback resiliente: se falhou por coluna ausente antes da migration, retenta sem os campos novos
        if (updateErr) {
          console.warn('⚠️ Tentativa de update completo em leads falhou, aplicando fallback resiliente:', updateErr.message);
          const corePayload = { ...payload };
          delete corePayload.visit_commitment;
          delete corePayload.tasting_commitment;
          delete corePayload.custom_field_values;
          delete corePayload.funnel_entered_at;

          const { data: retryUpdated, error: retryErr } = await supabase
            .from('leads')
            .update(corePayload)
            .eq('id', lead.id)
            .select('id');

          if (!retryErr && retryUpdated && retryUpdated.length > 0) {
            return true;
          }
        }

        // Se não existia ainda, prepara payload completo para INSERT
        payload.id = lead.id;
        if (!payload.name) payload.name = lead.name || 'Sem nome';
        if (!payload.phone) payload.phone = lead.phone || '';
        if (payload.venue_id === undefined && isUuid(lead.venueId)) payload.venue_id = lead.venueId;
        if (payload.funnel_id === undefined || payload.funnel_id === null) {
          const rawFId = (lead as any).funnelId;
          payload.funnel_id = isUuid(rawFId) ? rawFId : DEFAULT_COMMERCIAL_FUNNEL_ID;
        }
        if (payload.stage === undefined) payload.stage = 'new_lead';

        const { error: insertErr } = await supabase.from('leads').insert(payload);
        if (insertErr) {
          console.error('❌ Erro ao inserir novo lead no Supabase:', insertErr);
          return false;
        }
        return true;
      } else {
        // ID não é UUID (ex: lead temporário ou criado por telefone), busca por telefone se houver
        if (lead.phone) {
          const cleanPhone = lead.phone.replace(/\D/g, '');
          const { data: found } = await supabase.from('leads').select('id').ilike('phone', `%${cleanPhone}%`).maybeSingle();
          if (found?.id) {
            const { error: updErr } = await supabase.from('leads').update(payload).eq('id', found.id);
            if (!updErr) return true;
          }
        }
        return false;
      }
    } catch (err) {
      console.error('❌ Falha crítica em leadService.upsert:', err);
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

  async update(id: string, updates: Partial<Lead>): Promise<boolean> {
    return this.upsert({ id, ...updates });
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      // 1. Limpar tarefas e compromissos vinculados a este lead preventivamente
      await supabase.from('admin_tasks').delete().eq('lead_id', id);
      await supabase.from('appointments').delete().eq('lead_id', id);

      // 2. Deletar o lead
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) {
        console.error('❌ Erro ao deletar lead no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.delete:', err);
      return false;
    }
  }
};
