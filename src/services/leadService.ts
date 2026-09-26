import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid, generateUuid } from '../utils/uuid';
import { isLidIdentifier } from './uazapiSseService';
import type { Lead, LeadActivity, LeadParticipant } from '../types/admin';

function mapLeadToDatabase(lead: Partial<Lead>): Record<string, any> {
  const payload: Record<string, any> = {};
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
  
  if (lead.venueId !== undefined) payload.venue_id = isUuid(lead.venueId) ? lead.venueId : null;
  if (lead.venueName !== undefined) payload.venue_name = lead.venueName;
  if ((lead as any).funnelId !== undefined) {
    const rawFId = (lead as any).funnelId;
    payload.funnel_id = isUuid(rawFId) ? rawFId : null;
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
  if (lead.eventYear !== undefined) payload.event_year = lead.eventYear;
  if (lead.debutanteBirthDate !== undefined) payload.debutante_birth_date = lead.debutanteBirthDate;
  if (lead.estimatedGuests !== undefined) payload.estimated_guests = lead.estimatedGuests;
  if (lead.desiredPeriod !== undefined) payload.desired_period = lead.desiredPeriod;
  if (lead.urgencyLevel !== undefined) payload.urgency_level = lead.urgencyLevel;
  if (lead.interestService !== undefined) payload.interest_service = lead.interestService;
  if (lead.estimatedBudget !== undefined) payload.estimated_budget = lead.estimatedBudget;
  if (lead.paymentMethod !== undefined) payload.payment_method = lead.paymentMethod;
  if (lead.downPayment !== undefined) payload.down_payment = lead.downPayment;
  if (lead.installments !== undefined) payload.installments = lead.installments;
  if (lead.installmentValue !== undefined) payload.installment_value = lead.installmentValue;
  if (lead.hasCreditCard !== undefined) payload.has_credit_card = lead.hasCreditCard;
  if (lead.profession !== undefined) payload.profession = lead.profession;
  if (lead.decisionMakers !== undefined) payload.decision_makers = lead.decisionMakers;
  if (lead.temperature !== undefined) payload.temperature = lead.temperature;
  if (lead.tags !== undefined) payload.tags = lead.tags;
  if (lead.visitCommitment !== undefined) payload.visit_commitment = lead.visitCommitment;
  if (lead.tastingCommitment !== undefined) payload.tasting_commitment = lead.tastingCommitment;
  if (lead.updatedAt !== undefined) payload.updated_at = lead.updatedAt;

  if (lead.isArchived !== undefined) payload.is_archived = lead.isArchived;
  if (lead.archivedAt !== undefined) payload.archived_at = lead.archivedAt;

  // Preserva dualmente em custom_field_values para compatibilidade total
  payload.custom_field_values = {
    ...(lead.customFieldValues || {}),
    ...(lead.avatarUrl !== undefined ? { avatarUrl: lead.avatarUrl } : {}),
    ...(lead.whatsappJid !== undefined ? { whatsappJid: lead.whatsappJid } : {}),
    ...(lead.whatsappLid !== undefined ? { whatsappLid: lead.whatsappLid } : {}),
    ...(lead.urgencyLevel !== undefined ? { urgencyLevel: lead.urgencyLevel } : {}),
    ...(lead.eventYear !== undefined ? { eventYear: lead.eventYear } : {}),
    ...(lead.downPayment !== undefined ? { downPayment: lead.downPayment } : {}),
    ...(lead.installments !== undefined ? { installments: lead.installments } : {}),
    ...(lead.installmentValue !== undefined ? { installmentValue: lead.installmentValue } : {}),
    ...(lead.hasCreditCard !== undefined ? { hasCreditCard: lead.hasCreditCard } : {}),
    ...(lead.profession !== undefined ? { profession: lead.profession } : {}),
    ...(lead.decisionMakers !== undefined ? { decisionMakers: lead.decisionMakers } : {}),
    ...(lead.isArchived !== undefined ? { is_archived: lead.isArchived } : {}),
    ...(lead.archivedAt !== undefined ? { archived_at: lead.archivedAt } : {}),
  };
  if (lead.createdBy !== undefined) payload.created_by = (lead.createdBy && isUuid(lead.createdBy)) ? lead.createdBy : null;
  if (lead.createdByName !== undefined) payload.created_by_name = lead.createdByName || null;
  if (lead.createdByAvatar !== undefined) payload.created_by_avatar = lead.createdByAvatar || null;
  if (lead.cpf !== undefined) payload.cpf = lead.cpf || null;
  if (lead.birthday !== undefined) payload.birthday = lead.birthday || null;

  return payload;
}

/**
 * Converte um registro bruto de atividade do PostgreSQL / Supabase para o modelo LeadActivity
 */
export function formatActivityFromDb(a: any): LeadActivity {
  const rawText = a.text || '';
  let mediaUrl = (a as any).media_url;
  let mediaType = (a as any).media_type;
  let text = rawText;

  if (rawText.startsWith('[media:')) {
    const match = rawText.match(/^\[media:([^|\]]+)(?:\|([^\]]+))?\]\s*([\s\S]*)$/);
    if (match) {
      mediaUrl = match[1];
      mediaType = match[2] || 'audio';
      text = match[3] || '';
    }
  } else if (rawText.startsWith('{') && (rawText.includes('mimetype') || rawText.includes('audio') || rawText.includes('ptt') || rawText.includes('directPath') || rawText.includes('mmg.whatsapp.net'))) {
    try {
      const parsed = JSON.parse(rawText);
      const foundUrl = parsed.URL || parsed.url || parsed.fileURL || parsed.mediaUrl || parsed.directPath;
      const mimetype = String(parsed.mimetype || parsed.mime || '').toLowerCase();
      if (foundUrl) {
        mediaUrl = foundUrl;
        if (mimetype.includes('image')) {
          mediaType = 'image';
          text = '📷 Foto';
        } else if (mimetype.includes('video')) {
          mediaType = 'video';
          text = '🎥 Vídeo';
        } else if (mimetype.includes('audio') || parsed.ptt || rawText.includes('ptt') || rawText.includes('audioMessage')) {
          mediaType = 'audio';
          text = '🎵 Mensagem de voz';
        } else {
          text = rawText;
        }
      }
    } catch {
      const urlMatch = rawText.match(/"URL"\s*:\s*"([^"]+)"/i) || (rawText.includes('audio') ? rawText.match(/https:\/\/mmg\.whatsapp\.net[^\s"'}]+/i) : null);
      if (urlMatch) {
        mediaUrl = urlMatch[1] || urlMatch[0];
        mediaType = 'audio';
        text = '🎵 Mensagem de voz';
      }
    }
  } else if (!mediaUrl && rawText.startsWith('data:audio/')) {
    mediaUrl = rawText;
    mediaType = 'audio';
  } else if (!mediaUrl && rawText.startsWith('data:image/')) {
    mediaUrl = rawText;
    mediaType = 'image';
  } else if (!mediaUrl && rawText.startsWith('data:video/')) {
    mediaUrl = rawText;
    mediaType = 'video';
  } else if (!mediaUrl && /^https?:\/\/[^\s]+$/i.test(rawText.trim())) {
    const cleanTrimmed = rawText.trim().toLowerCase();
    if (/\.(mp3|ogg|opus|wav|m4a|aac|webm)(\?.*)?$/i.test(cleanTrimmed)) {
      mediaUrl = rawText.trim();
      mediaType = 'audio';
    } else if (/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(cleanTrimmed)) {
      mediaUrl = rawText.trim();
      mediaType = 'video';
    } else if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(cleanTrimmed)) {
      mediaUrl = rawText.trim();
      mediaType = 'image';
    } else if (/\.(pdf|doc|docx|xls|xlsx|txt|zip|rar)(\?.*)?$/i.test(cleanTrimmed)) {
      mediaUrl = rawText.trim();
      mediaType = 'document';
    }
  } else if (!mediaType && (a.title?.toLowerCase().includes('áudio') || a.title?.toLowerCase().includes('voz') || text.includes('🎵 Mensagem de voz'))) {
    mediaType = 'audio';
  }

  let status: 'sending' | 'sent' | 'failed' | 'read' = (a as any).status || 'sent';
  let errorMessage: string | undefined = (a as any).error_message || undefined;

  if (text.startsWith('[failed:')) {
    const failMatch = text.match(/^\[failed:([^\]]+)\]\s*([\s\S]*)$/);
    if (failMatch) {
      status = 'failed';
      errorMessage = failMatch[1];
      text = failMatch[2] || '';
    }
  }

  return {
    id: a.id,
    leadId: a.lead_id,
    timestamp: a.timestamp || a.created_at || new Date().toISOString(),
    type: a.type || 'contact',
    title: a.title || 'Mensagem',
    text,
    authorName: a.author_name || 'Sistema',
    authorId: a.author_id,
    authorAvatarUrl: a.author_avatar_url,
    mediaUrl,
    mediaType,
    status,
    errorMessage,
  };
}

export function formatLeadFromDb(row: any, leadActivities: LeadActivity[] = [], leadParticipants: LeadParticipant[] = []): Lead {
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
    whatsappJid: row.custom_field_values?.whatsappJid || row.whatsapp_jid || undefined,
    whatsappLid: row.custom_field_values?.whatsappLid || row.whatsapp_lid || undefined,
    email: row.email,
    avatarUrl: row.custom_field_values?.avatarUrl || row.avatar_url || row.photo_url || row.avatar || undefined,
    neighborhood: row.neighborhood || row.custom_field_values?.neighborhood,
    address: row.address || row.custom_field_values?.address,
    contacts: row.contacts || [],
    primaryContactRole: row.primary_contact_role || 'debutante',
    eventType: row.event_type || row.custom_field_values?.eventType || undefined,
    eventDate: row.event_date || row.party_date,
    eventYear: row.event_year || row.custom_field_values?.eventYear || (row.party_date ? new Date(row.party_date).getFullYear().toString() : undefined),
    debutanteBirthDate: row.debutante_birth_date,
    estimatedGuests: row.estimated_guests,
    desiredPeriod: row.desired_period,
    urgencyLevel: row.urgency_level || row.custom_field_values?.urgencyLevel || undefined,
    interestService: row.interest_service || row.package_sold,
    estimatedBudget: row.estimated_budget ? Number(row.estimated_budget) : (row.deal_value ? Number(row.deal_value) : undefined),
    paymentMethod: row.payment_method || row.custom_field_values?.paymentMethod,
    downPayment: row.down_payment !== undefined && row.down_payment !== null ? Number(row.down_payment) : (row.custom_field_values?.downPayment !== undefined ? Number(row.custom_field_values.downPayment) : undefined),
    installments: row.installments !== undefined && row.installments !== null ? Number(row.installments) : (row.custom_field_values?.installments !== undefined ? Number(row.custom_field_values.installments) : undefined),
    installmentValue: row.installment_value !== undefined && row.installment_value !== null ? Number(row.installment_value) : (row.custom_field_values?.installmentValue !== undefined ? Number(row.custom_field_values.installmentValue) : undefined),
    hasCreditCard: row.has_credit_card !== undefined && row.has_credit_card !== null ? Boolean(row.has_credit_card) : (row.custom_field_values?.hasCreditCard !== undefined ? Boolean(row.custom_field_values.hasCreditCard) : undefined),
    profession: row.profession || row.custom_field_values?.profession || undefined,
    decisionMakers: row.decision_makers || row.custom_field_values?.decisionMakers || undefined,
    temperature: row.temperature || undefined,
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
    isArchived: Boolean(row.is_archived ?? row.custom_field_values?.is_archived ?? false),
    archivedAt: row.archived_at || row.custom_field_values?.archived_at || undefined,
    participants: leadParticipants,
    tasks: [],
    activities: leadActivities,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

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

      // Paginação completa de todas as atividades (supera a limitação padrão de 1.000 linhas do PostgREST)
      const activitiesData: any[] = [];
      let actFrom = 0;
      const actStep = 1000;
      while (true) {
        const { data: pageData, error: pageErr } = await supabase
          .from('lead_activities')
          .select('*')
          .order('timestamp', { ascending: true })
          .range(actFrom, actFrom + actStep - 1);
        if (pageErr || !pageData || pageData.length === 0) break;
        activitiesData.push(...pageData);
        if (pageData.length < actStep) break;
        actFrom += actStep;
      }

      // Paginação completa de participantes
      const participantsData: any[] = [];
      let partFrom = 0;
      const partStep = 1000;
      while (true) {
        const { data: partPage, error: partErr } = await supabase
          .from('lead_participants')
          .select('*')
          .range(partFrom, partFrom + partStep - 1);
        if (partErr || !partPage || partPage.length === 0) break;
        participantsData.push(...partPage);
        if (partPage.length < partStep) break;
        partFrom += partStep;
      }

      return (leadsData || []).map(row => {
        const leadActivities: LeadActivity[] = (activitiesData || [])
          .filter(a => a.lead_id === row.id)
          .map(a => formatActivityFromDb(a));

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

        return formatLeadFromDb(row, leadActivities, leadParticipants);
      });
    } catch (err) {
      console.error('Falha em leadService.getAll:', err);
      return [];
    }
  },

  async getByPhone(phone: string, masterId?: string, venueIds?: string[]): Promise<Lead | null> {
    if (!isSupabaseConfigured || !phone) return null;
    try {
      const clean = phone.replace(/\D/g, '');
      if (clean.length < 8) return null;
      const digits = clean.slice(-8);
      let query = supabase
        .from('leads')
        .select('*')
        .ilike('phone', `%${digits}%`);

      if (masterId) {
        query = query.eq('master_id', masterId);
      } else if (venueIds && venueIds.length > 0) {
        query = query.in('venue_id', venueIds);
      }

      const { data } = await query.limit(1);

      if (!data || data.length === 0) return null;
      return formatLeadFromDb(data[0]);
    } catch (err) {
      console.warn('Erro ao buscar lead por telefone no Supabase:', err);
      return null;
    }
  },

  async update(id: string, updates: Partial<Lead>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload = mapLeadToDatabase(updates);
      if (Object.keys(payload).length === 0) return true;

      // 1. Tenta atualizar diretamente por ID se for UUID
      if (isUuid(id)) {
        const { data, error } = await supabase.from('leads').update(payload).eq('id', id).select('id');
        if (!error && data && data.length > 0) return true;
      }

      // 2. Tenta por code
      const targetCode = (!isUuid(id) ? id : updates.code) || updates.code;
      if (targetCode) {
        const { data, error } = await supabase.from('leads').update(payload).eq('code', targetCode).select('id');
        if (!error && data && data.length > 0) return true;
      }

      // 3. Tenta por telefone se fornecido (restringindo ao master do lead)
      if (updates.phone) {
        const cleanPhone = updates.phone.replace(/\D/g, '');
        if (cleanPhone.length >= 8) {
          let query = supabase.from('leads').update(payload).ilike('phone', `%${cleanPhone.slice(-8)}%`);
          if (payload.master_id) query = query.eq('master_id', payload.master_id);
          const { data, error } = await query.select('id');
          if (!error && data && data.length > 0) return true;
        }
      }

      return false;
    } catch (err) {
      console.error('❌ Falha em leadService.update:', err);
      return false;
    }
  },

  async upsert(lead: Partial<Lead> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload = mapLeadToDatabase(lead);

      // 1. Tenta por ID
      if (isUuid(lead.id)) {
        const { data, error } = await supabase.from('leads').update(payload).eq('id', lead.id).select('id');
        if (!error && data && data.length > 0) return true;
      }

      // 2. Tenta por code
      const targetCode = lead.code || (!isUuid(lead.id) ? lead.id : undefined);
      if (targetCode) {
        const { data, error } = await supabase.from('leads').update(payload).eq('code', targetCode).select('id');
        if (!error && data && data.length > 0) return true;
      }

      // 3. Tenta por telefone dentro do mesmo master/empresa
      if (lead.phone) {
        const cleanPhone = lead.phone.replace(/\D/g, '');
        if (cleanPhone.length >= 8) {
          let checkQuery = supabase
            .from('leads')
            .select('id, venue_id, funnel_id, stage, master_id')
            .ilike('phone', `%${cleanPhone.slice(-8)}%`);

          if (payload.master_id) {
            checkQuery = checkQuery.eq('master_id', payload.master_id);
          } else if (payload.venue_id) {
            checkQuery = checkQuery.eq('venue_id', payload.venue_id);
          }

          const { data: existingRecords } = await checkQuery.limit(1);

          if (existingRecords && existingRecords.length > 0) {
            const existingRecord = existingRecords[0];
            const safePayload = { ...payload };
            // Preserva estritamente funil, unidade e etapa para mensagens recebidas não sobrescreverem nem desindexarem leads
            if (existingRecord.funnel_id && (!lead.funnelId || !payload.funnel_id)) {
              safePayload.funnel_id = existingRecord.funnel_id;
            }
            if (existingRecord.venue_id && (!lead.venueId || !payload.venue_id)) {
              safePayload.venue_id = existingRecord.venue_id;
            }
            if (existingRecord.stage && (!lead.stage || !payload.stage)) {
              safePayload.stage = existingRecord.stage;
            }
            const { error: updErr } = await supabase
              .from('leads')
              .update(safePayload)
              .eq('id', existingRecord.id);
            if (!updErr) return true;
          }
        }
      }

      // 4. Se não encontrou registro existente, cria novo
      payload.id = isUuid(lead.id) ? lead.id : generateUuid();
      if (!payload.code) payload.code = lead.code || (!isUuid(lead.id) ? lead.id : `LEAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
      if (!payload.name) payload.name = lead.name || 'Sem nome';
      if (!payload.phone) payload.phone = lead.phone || '';
      if (!payload.stage) payload.stage = lead.stage || 'new_lead';

      if (!payload.venue_id) {
        const { data: v } = await supabase.from('venues').select('id').eq('is_active', true).limit(1).maybeSingle();
        if (v?.id) payload.venue_id = v.id;
      }
      if (!payload.funnel_id && payload.venue_id) {
        const { data: f } = await supabase
          .from('commercial_funnels')
          .select('id')
          .eq('venue_id', payload.venue_id)
          .eq('is_post_sale', false)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (f?.id) payload.funnel_id = f.id;
      }
      if (!payload.funnel_id) {
        const { data: f } = await supabase
          .from('commercial_funnels')
          .select('id')
          .eq('is_post_sale', false)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (f?.id) payload.funnel_id = f.id;
      }

      const { error: insertErr } = await supabase.from('leads').insert(payload);
      if (insertErr) {
        if (insertErr.code === '23505') {
          const { error: finalUpdErr } = await supabase.from('leads').update(payload).eq('id', payload.id);
          if (!finalUpdErr) return true;
        }
        console.error('❌ Erro ao inserir novo lead no Supabase:', insertErr);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Falha crítica em leadService.upsert:', err);
      return false;
    }
  },

  async addActivity(leadId: string, activity: LeadActivity | Omit<LeadActivity, 'id'>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      let finalLeadId = leadId;
      if (!isUuid(leadId)) {
        const { data } = await supabase.from('leads').select('id').eq('code', leadId).maybeSingle();
        if (data?.id) finalLeadId = data.id;
      }

      if (!isUuid(finalLeadId)) {
        console.warn(`Lead ID "${leadId}" não pôde ser resolvido para um UUID no Supabase para salvar atividade.`);
        return false;
      }

      let storedText = activity.text || '';
      if (activity.mediaUrl && !storedText.startsWith('[media:')) {
        storedText = `[media:${activity.mediaUrl}|${activity.mediaType || 'audio'}] ${storedText}`.trim();
      }
      if (activity.status === 'failed' && activity.errorMessage && !storedText.startsWith('[failed:')) {
        storedText = `[failed:${activity.errorMessage}] ${storedText}`.trim();
      }

      const activityId = ('id' in activity && activity.id && isUuid(activity.id)) ? activity.id : generateUuid();

      const insertPayload: Record<string, any> = {
        id: activityId,
        lead_id: finalLeadId,
        type: activity.type,
        title: activity.title,
        text: storedText,
        author_name: activity.authorName || 'Administrador',
        author_id: isUuid(activity.authorId) ? activity.authorId : null,
        author_avatar_url: activity.authorAvatarUrl || '',
        timestamp: activity.timestamp || new Date().toISOString(),
      };

      if (activity.status) insertPayload.status = activity.status;
      if (activity.errorMessage) insertPayload.error_message = activity.errorMessage;

      const { error } = await supabase.from('lead_activities').insert(insertPayload);
      if (error) {
        // Se o erro foi por coluna não existente no banco legado, tenta sem as colunas extras
        if (error.message?.includes('status') || error.message?.includes('error_message')) {
          delete insertPayload.status;
          delete insertPayload.error_message;
          await supabase.from('lead_activities').insert(insertPayload);
          return true;
        }
        console.error('❌ Erro ao adicionar atividade no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.addActivity:', err);
      return false;
    }
  },

  async updateActivity(activityId: string, updates: Partial<LeadActivity>): Promise<boolean> {
    if (!isSupabaseConfigured || !isUuid(activityId)) return false;
    try {
      const payload: Record<string, any> = {};
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.text !== undefined || updates.mediaUrl !== undefined || updates.status !== undefined || updates.errorMessage !== undefined) {
        let storedText = updates.text || '';
        if (updates.mediaUrl && !storedText.startsWith('[media:')) {
          storedText = `[media:${updates.mediaUrl}|${updates.mediaType || 'audio'}] ${storedText}`.trim();
        }
        if (updates.status === 'failed' && updates.errorMessage && !storedText.startsWith('[failed:')) {
          storedText = `[failed:${updates.errorMessage}] ${storedText}`.trim();
        }
        payload.text = storedText;
      }
      if (updates.authorName !== undefined) payload.author_name = updates.authorName;
      if (updates.authorAvatarUrl !== undefined) payload.author_avatar_url = updates.authorAvatarUrl;
      if (updates.timestamp !== undefined) payload.timestamp = updates.timestamp;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.errorMessage !== undefined) payload.error_message = updates.errorMessage;

      const { error } = await supabase.from('lead_activities').update(payload).eq('id', activityId);
      if (error) {
        if (error.message?.includes('status') || error.message?.includes('error_message')) {
          delete payload.status;
          delete payload.error_message;
          await supabase.from('lead_activities').update(payload).eq('id', activityId);
          return true;
        }
        console.error('❌ Erro ao atualizar atividade no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.updateActivity:', err);
      return false;
    }
  },

  async addParticipant(leadId: string, participant: Omit<LeadParticipant, 'id'>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      let finalLeadId = leadId;
      if (!isUuid(leadId)) {
        const { data } = await supabase.from('leads').select('id').eq('code', leadId).maybeSingle();
        if (data?.id) finalLeadId = data.id;
      }

      if (!isUuid(finalLeadId)) {
        console.warn(`Lead ID "${leadId}" não pôde ser resolvido para um UUID no Supabase para salvar participante.`);
        return false;
      }

      const { error } = await supabase.from('lead_participants').insert({
        id: generateUuid(),
        lead_id: finalLeadId,
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
      await supabase.from('lead_activities').delete().eq('lead_id', id);
      await supabase.from('lead_participants').delete().eq('lead_id', id);
      await supabase.from('admin_tasks').delete().eq('lead_id', id);
      await supabase.from('appointments').delete().eq('lead_id', id);

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
  },

  async deleteMultiple(ids: string[]): Promise<boolean> {
    if (!isSupabaseConfigured || ids.length === 0) return false;
    try {
      await supabase.from('lead_activities').delete().in('lead_id', ids);
      await supabase.from('lead_participants').delete().in('lead_id', ids);
      await supabase.from('admin_tasks').delete().in('lead_id', ids);
      await supabase.from('appointments').delete().in('lead_id', ids);

      const { error } = await supabase.from('leads').delete().in('id', ids);
      if (error) {
        console.error('❌ Erro ao deletar múltiplos leads no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.deleteMultiple:', err);
      return false;
    }
  },

  async archive(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('leads').update({
        is_archived: true,
        archived_at: now,
        funnel_id: null,
      }).eq('id', id);

      if (error) {
        // Fallback para custom_field_values caso a coluna direta ainda não tenha sido aplicada
        await supabase.from('leads').update({
          funnel_id: null,
          custom_field_values: { is_archived: true, archived_at: now }
        }).eq('id', id);
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.archive:', err);
      return false;
    }
  },

  async unarchive(id: string, funnelId?: string, stageId?: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('leads').update({
        is_archived: false,
        archived_at: null,
        funnel_id: funnelId || null,
        stage: stageId || 'new_lead',
      }).eq('id', id);

      if (error) {
        await supabase.from('leads').update({
          funnel_id: funnelId || null,
          stage: stageId || 'new_lead',
          custom_field_values: { is_archived: false, archived_at: null }
        }).eq('id', id);
      }
      return true;
    } catch (err) {
      console.error('❌ Falha em leadService.unarchive:', err);
      return false;
    }
  },

  /**
   * Consolida leads duplicados com o mesmo número de telefone ou mesmo identificador JID/LID,
   * unificando históricos de mensagens cronologicamente, elegendo o lead com telefone real como Master
   * e eliminando registros duplicados no Supabase.
   */
  async consolidateDuplicatesInDatabase(leadsList?: Lead[]): Promise<{ mergedCount: number; consolidatedLeads: Lead[] }> {
    const list = leadsList || await this.getAll();
    if (!list || list.length === 0) return { mergedCount: 0, consolidatedLeads: [] };

    // 1. Agrupar leads por equivalência de telefone OU JID/LID compartilhado
    const groups: Lead[][] = [];
    for (const lead of list) {
      const cleanPhone = (lead.phone || '').replace(/\D/g, '');
      const leadLid = (lead.whatsappLid || '').replace(/\D/g, '');
      const leadJid = (lead.whatsappJid || '').replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');

      let matchedGroup = groups.find(g => 
        g.some(existing => {
          // REGRA DE OURO MULTI-TENANT: NUNCA mesclar leads de Masters/Empresas diferentes!
          if (existing.masterId && lead.masterId && existing.masterId !== lead.masterId) {
            return false;
          }

          // 1a. Casamento por telefone real
          if (isPhoneMatch(existing.phone, lead.phone)) return true;
          
          // 1b. Casamento por LID compartilhado
          const existingLid = (existing.whatsappLid || (isLidIdentifier(existing.phone) ? existing.phone : '')).replace(/\D/g, '');
          const currentLid = leadLid || (isLidIdentifier(lead.phone) ? cleanPhone : '');
          if (existingLid && currentLid && existingLid.length >= 10 && existingLid === currentLid) return true;

          // 1c. Casamento por JID compartilhado
          const existingJid = (existing.whatsappJid || '').replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
          if (existingJid && leadJid && existingJid.length >= 8 && existingJid === leadJid) return true;

          // 1d. Casamento por Nome Exato quando um dos leads possui telefone LID (ex: duplicatas geradas por @lid)
          const isExistingLid = isLidIdentifier(existing.phone);
          const isLeadLid = isLidIdentifier(lead.phone);
          if (
            (isExistingLid || isLeadLid) &&
            existing.name &&
            lead.name &&
            existing.name.trim().toLowerCase() === lead.name.trim().toLowerCase() &&
            existing.name.trim().length >= 3
          ) {
            return true;
          }

          return false;
        })
      );

      if (matchedGroup) {
        matchedGroup.push(lead);
      } else {
        groups.push([lead]);
      }
    }

    let mergedCount = 0;
    const consolidatedLeads: Lead[] = [];

    for (const group of groups) {
      if (group.length === 1) {
        consolidatedLeads.push(group[0]);
        continue;
      }

      // Mais de um lead no grupo: eleger o Lead Master (com prioridade MASSIVA para telefone real e nome completo)
      group.sort((a, b) => {
        const scoreA = scoreLeadCompleteness(a);
        const scoreB = scoreLeadCompleteness(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      const master = { ...group[0] };
      const secondaries = group.slice(1);

      // Unificar dados e mensagens de todos os secundários no Master
      for (const secondary of secondaries) {
        mergedCount++;

        // Unificar histórico de atividades/mensagens ordenadas cronologicamente
        master.activities = mergeAndSortActivities(master.activities || [], secondary.activities || [], master.id);

        // Preencher campos vazios do Master com dados válidos do secundário
        if (isGenericOrFamilyNickname(master.name) && !isGenericOrFamilyNickname(secondary.name)) {
          master.name = secondary.name;
        }

        // Se o master tiver telefone LID e o secundário tiver telefone real, atualiza
        if (isLidIdentifier(master.phone) && !isLidIdentifier(secondary.phone) && secondary.phone) {
          master.phone = secondary.phone;
        }

        // Herda identificadores WhatsApp
        if (!master.whatsappJid && secondary.whatsappJid) master.whatsappJid = secondary.whatsappJid;
        if (!master.whatsappLid && secondary.whatsappLid) master.whatsappLid = secondary.whatsappLid;
        if (isLidIdentifier(secondary.phone) && !master.whatsappLid) master.whatsappLid = secondary.phone;

        if (!master.avatarUrl && secondary.avatarUrl) master.avatarUrl = secondary.avatarUrl;
        if (!master.email && secondary.email) master.email = secondary.email;
        if (!master.cpf && secondary.cpf) master.cpf = secondary.cpf;
        if (!master.birthday && secondary.birthday) master.birthday = secondary.birthday;
        if (!master.eventDate && secondary.eventDate) master.eventDate = secondary.eventDate;
        if (!master.partyDate && secondary.partyDate) master.partyDate = secondary.partyDate;
        if (!master.estimatedGuests && secondary.estimatedGuests) master.estimatedGuests = secondary.estimatedGuests;
        if (!master.desiredPeriod && secondary.desiredPeriod) master.desiredPeriod = secondary.desiredPeriod;
        if (!master.interestService && secondary.interestService) master.interestService = secondary.interestService;
        if (!master.estimatedBudget && secondary.estimatedBudget) master.estimatedBudget = secondary.estimatedBudget;
        if (!master.sdrId && secondary.sdrId) {
          master.sdrId = secondary.sdrId;
          master.sdrName = secondary.sdrName;
        }
        if (!master.closerId && secondary.closerId) {
          master.closerId = secondary.closerId;
          master.closerName = secondary.closerName;
        }
        if (secondary.notes && secondary.notes !== master.notes) {
          master.notes = master.notes ? `${master.notes}\n---\n${secondary.notes}` : secondary.notes;
        }

        // Migrar no Supabase
        if (isSupabaseConfigured && isUuid(master.id) && isUuid(secondary.id)) {
          try {
            await supabase.from('lead_activities').update({ lead_id: master.id }).eq('lead_id', secondary.id);
            await supabase.from('admin_tasks').update({ lead_id: master.id }).eq('lead_id', secondary.id);
            await supabase.from('appointments').update({ lead_id: master.id }).eq('lead_id', secondary.id);
            await supabase.from('leads').delete().eq('id', secondary.id);
          } catch (err) {
            console.warn(`[Consolidate DB] Falha ao migrar/deletar secundário ${secondary.id}:`, err);
          }
        }
      }

      // Atualiza o Master no Supabase com os dados enriquecidos
      if (isSupabaseConfigured && isUuid(master.id)) {
        try {
          await this.update(master.id, master);
        } catch (err) {
          console.warn(`[Consolidate DB] Falha ao atualizar master ${master.id}:`, err);
        }
      }

      consolidatedLeads.push(master);
    }

    return { mergedCount, consolidatedLeads };
  },

  /**
   * Unifica explicitamente dois leads selecionados pelo usuário.
   * Transfere todas as atividades, tarefas e dados de contato do secundário para o primário,
   * adiciona uma nota/atividade de auditoria da unificação e remove o secundário no Supabase.
   */
  async mergeTwoLeads(
    primaryLead: Lead,
    secondaryLead: Lead,
    authorName: string = 'Administrador'
  ): Promise<Lead> {
    const master = { ...primaryLead };

    // 1. Unificar histórico de atividades com desduplicação e ordenação cronológica
    const combinedActs = mergeAndSortActivities(master.activities || [], secondaryLead.activities || [], master.id);
    
    // Adiciona atividade de auditoria da unificação
    const auditActivity: LeadActivity = {
      id: generateUuid(),
      leadId: master.id,
      timestamp: new Date().toISOString(),
      type: 'status_change',
      title: 'Leads Unificados',
      text: `Lead unificado manualmente com histórico e dados de "${secondaryLead.name}" (${secondaryLead.phone || 'Sem telefone'}).`,
      authorName,
    };
    master.activities = [...combinedActs, auditActivity];

    // 2. Herança inteligente de dados faltantes no Master
    if (isGenericOrFamilyNickname(master.name) && !isGenericOrFamilyNickname(secondaryLead.name)) {
      master.name = secondaryLead.name;
    }
    if (isLidIdentifier(master.phone) && !isLidIdentifier(secondaryLead.phone) && secondaryLead.phone) {
      master.phone = secondaryLead.phone;
    }
    if (!master.whatsappJid && secondaryLead.whatsappJid) master.whatsappJid = secondaryLead.whatsappJid;
    if (!master.whatsappLid && secondaryLead.whatsappLid) master.whatsappLid = secondaryLead.whatsappLid;
    if (isLidIdentifier(secondaryLead.phone) && !master.whatsappLid) master.whatsappLid = secondaryLead.phone;

    if (!master.avatarUrl && secondaryLead.avatarUrl) master.avatarUrl = secondaryLead.avatarUrl;
    if (!master.email && secondaryLead.email) master.email = secondaryLead.email;
    if (!master.cpf && secondaryLead.cpf) master.cpf = secondaryLead.cpf;
    if (!master.birthday && secondaryLead.birthday) master.birthday = secondaryLead.birthday;
    if (!master.eventDate && secondaryLead.eventDate) master.eventDate = secondaryLead.eventDate;
    if (!master.partyDate && secondaryLead.partyDate) master.partyDate = secondaryLead.partyDate;
    if (!master.estimatedGuests && secondaryLead.estimatedGuests) master.estimatedGuests = secondaryLead.estimatedGuests;
    if (!master.desiredPeriod && secondaryLead.desiredPeriod) master.desiredPeriod = secondaryLead.desiredPeriod;
    if (!master.interestService && secondaryLead.interestService) master.interestService = secondaryLead.interestService;
    if (!master.estimatedBudget && secondaryLead.estimatedBudget) master.estimatedBudget = secondaryLead.estimatedBudget;
    if (!master.sdrId && secondaryLead.sdrId) {
      master.sdrId = secondaryLead.sdrId;
      master.sdrName = secondaryLead.sdrName;
    }
    if (!master.closerId && secondaryLead.closerId) {
      master.closerId = secondaryLead.closerId;
      master.closerName = secondaryLead.closerName;
    }
    if (secondaryLead.notes && secondaryLead.notes !== master.notes) {
      master.notes = master.notes ? `${master.notes}\n---\n${secondaryLead.notes}` : secondaryLead.notes;
    }

    // 3. Mesclar contatos adicionais sem duplicatas
    const existingPhones = new Set([
      (master.phone || '').replace(/\D/g, ''),
      ...(master.contacts || []).map(c => (c.phone || '').replace(/\D/g, ''))
    ]);
    const mergedContacts = [...(master.contacts || [])];
    if (secondaryLead.phone && !existingPhones.has(secondaryLead.phone.replace(/\D/g, ''))) {
      mergedContacts.push({
        id: generateUuid(),
        name: secondaryLead.name || 'Contato Secundário',
        phone: secondaryLead.phone,
        role: 'outro',
        isPrimaryDecisionMaker: false,
      });
      existingPhones.add(secondaryLead.phone.replace(/\D/g, ''));
    }
    for (const c of secondaryLead.contacts || []) {
      const clean = (c.phone || '').replace(/\D/g, '');
      if (clean && !existingPhones.has(clean)) {
        mergedContacts.push(c);
        existingPhones.add(clean);
      }
    }
    master.contacts = mergedContacts;
    master.updatedAt = new Date().toISOString().split('T')[0];

    // 4. Migração e Exclusão no Supabase
    if (isSupabaseConfigured && isUuid(master.id) && isUuid(secondaryLead.id)) {
      try {
        await supabase.from('lead_activities').update({ lead_id: master.id }).eq('lead_id', secondaryLead.id);
        await supabase.from('admin_tasks').update({ lead_id: master.id }).eq('lead_id', secondaryLead.id);
        await supabase.from('appointments').update({ lead_id: master.id }).eq('lead_id', secondaryLead.id);
        await supabase.from('leads').delete().eq('id', secondaryLead.id);
        await this.update(master.id, master);
      } catch (err) {
        console.warn(`[Merge Leads DB] Falha ao migrar banco:`, err);
      }
    }

    return master;
  },
};

/**
 * Detecta apelidos informais de agenda pessoal ou nomes genéricos (ex: Mãe, Pai, Amor, LEAD-XXXX)
 * que não devem substituir o nome completo do lead no CRM.
 */
export function isGenericOrFamilyNickname(name?: string): boolean {
  if (!name || !name.trim()) return true;
  const clean = name.trim().toLowerCase();
  if (
    clean === 'sem nome' ||
    clean === 'lead sem nome' ||
    clean.startsWith('lead-') ||
    clean.startsWith('cliente (') ||
    clean.startsWith('whatsapp')
  ) {
    return true;
  }
  const familyNicknames = new Set([
    'mãe', 'mae', 'painho', 'pai', 'mainha', 'amor', 'vida', 'mozi', 'esposa', 'marido',
    'filho', 'filha', 'filhão', 'filhote', 'irmão', 'irmao', 'irmã', 'irma',
    'tia', 'tio', 'vó', 'vo', 'vovó', 'vovo', 'vô', 'vovô', 'sobrinho', 'sobrinha',
    'casa', 'trabalho', 'namorado', 'namorada', 'noivo', 'noiva', 'contato', 'indicação'
  ]);
  return familyNicknames.has(clean);
}

/**
 * Função utilitária para verificar correspondência entre números de telefone
 * com tolerância ao nono dígito e DDD.
 */
export function isPhoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const c1 = p1.replace(/\D/g, '');
  const c2 = p2.replace(/\D/g, '');
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  const s1 = c1.slice(-8);
  const s2 = c2.slice(-8);
  if (s1.length === 8 && s2.length === 8 && s1 === s2) {
    const ddd1 = c1.length >= 10 ? c1.slice(-10, -8) : '';
    const ddd2 = c2.length >= 10 ? c2.slice(-10, -8) : '';
    if (ddd1 && ddd2 && ddd1 !== ddd2) return false;
    return true;
  }
  return false;
}

/**
 * Mescla e ordena rigorosamente todas as atividades de forma cronológica ascendente
 * eliminando duplicatas exatas.
 */
export function mergeAndSortActivities(acts1: LeadActivity[] = [], acts2: LeadActivity[] = [], masterLeadId: string): LeadActivity[] {
  const allActs = [...acts1, ...acts2].map(a => ({ ...a, leadId: masterLeadId }));
  const uniqueActs: LeadActivity[] = [];

  for (const act of allActs) {
    const isDuplicate = uniqueActs.some(existing => {
      if (existing.id && act.id && existing.id === act.id) return true;
      if (existing.type === act.type && existing.text === act.text) {
        const t1 = new Date(existing.timestamp || 0).getTime();
        const t2 = new Date(act.timestamp || 0).getTime();
        if (Math.abs(t1 - t2) < 90000) return true;
      }
      return false;
    });
    if (!isDuplicate) {
      uniqueActs.push(act);
    }
  }

  // Ordenação cronológica ascendente
  uniqueActs.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
  return uniqueActs;
}

/**
 * Avalia o nível de completude e qualidade do Lead.
 * Prioriza DECISIVAMENTE leads com número de telefone real e nomes completos de clientes.
 */
export function scoreLeadCompleteness(l: Lead): number {
  let score = 0;
  
  // 1. Telefone real (10 a 13 dígitos e não LID): +150 pontos
  const isLid = isLidIdentifier(l.phone);
  const cleanPhone = (l.phone || '').replace(/\D/g, '');
  if (!isLid && cleanPhone.length >= 10 && cleanPhone.length <= 13) {
    score += 150;
  }

  // 2. Nome completo real (não genérico e não apelido de agenda "Mãe"): +60 pontos
  if (l.name && !isGenericOrFamilyNickname(l.name)) {
    score += 60;
  }

  if (l.dealValue && l.dealValue > 0) score += 30;
  if (l.eventDate || l.partyDate) score += 20;
  if (l.sdrId || l.closerId) score += 10;
  if (l.avatarUrl) score += 10;
  if (l.email) score += 10;
  if (l.notes) score += 5;
  score += (l.activities || []).length;
  return score;
}

/**
 * Busca de lead em duas etapas:
 * 1ª Prioridade (90%+ dos casos): Correspondência por Número de Telefone Real.
 * 2ª Prioridade (Fallback JID/LID): Correspondência por JID/LID registrado (whatsappLid, whatsappJid, ou phone temporário).
 */
export function findMatchingLead(
  leads: Lead[],
  identifiers: {
    phone?: string;
    jid?: string;
    lid?: string;
    rawPayload?: any;
  }
): { matchedLead: Lead | null; matchType: 'phone' | 'jid' | 'lid' | null } {
  if (!leads || leads.length === 0) return { matchedLead: null, matchType: null };

  const cleanPhone = (identifiers.phone || '').replace(/\D/g, '');
  const cleanJid = (identifiers.jid || '').trim();
  const cleanLid = (identifiers.lid || '').trim();
  const rawJidClean = (identifiers.rawPayload?.key?.remoteJid || identifiers.rawPayload?.remoteJid || '').replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');

  // ── ETAPA 1 (Prioridade Absoluta - 90%+ das vezes): Telefone Real ──────────────────
  if (cleanPhone && !isLidIdentifier(cleanPhone) && cleanPhone.length >= 8 && cleanPhone.length <= 13) {
    // 1a. Prioridade máxima: Telefone principal do Lead (l.phone)
    const directMatch = leads.find(l => l.phone && !isLidIdentifier(l.phone) && isPhoneMatch(l.phone, cleanPhone));
    if (directMatch) return { matchedLead: directMatch, matchType: 'phone' };

    // 1b. Prioridade secundária: Telefone de Contatos Adicionais (apenas se nenhum lead tiver como telefone principal)
    const contactMatch = leads.find(l => l.contacts && l.contacts.some(c => c.phone && !isLidIdentifier(c.phone) && isPhoneMatch(c.phone, cleanPhone)));
    if (contactMatch) return { matchedLead: contactMatch, matchType: 'phone' };
  }

  // Se rawJidClean for telefone real
  if (rawJidClean && !isLidIdentifier(rawJidClean) && rawJidClean.length >= 8 && rawJidClean.length <= 13) {
    const directMatch = leads.find(l => l.phone && !isLidIdentifier(l.phone) && isPhoneMatch(l.phone, rawJidClean));
    if (directMatch) return { matchedLead: directMatch, matchType: 'phone' };

    const contactMatch = leads.find(l => l.contacts && l.contacts.some(c => c.phone && !isLidIdentifier(c.phone) && isPhoneMatch(c.phone, rawJidClean)));
    if (contactMatch) return { matchedLead: contactMatch, matchType: 'phone' };
  }

  // ── ETAPA 2: JID / LID (Fallback secundário) ─────────────────────
  const getLeadLid = (l: Lead) => (l.whatsappLid || (l.customFieldValues as any)?.whatsappLid || (l.customFieldValues as any)?.whatsapp_lid || '').toString();
  const getLeadJid = (l: Lead) => (l.whatsappJid || (l.customFieldValues as any)?.whatsappJid || (l.customFieldValues as any)?.whatsapp_jid || '').toString();

  // 2a. Busca por whatsappLid ou whatsappJid explícito
  if (cleanLid || cleanJid) {
    const targetLidDigits = (cleanLid || cleanJid).replace(/\D/g, '');
    const matched = leads.find(l => {
      const lidVal = getLeadLid(l);
      const jidVal = getLeadJid(l);
      if (cleanLid && lidVal && (lidVal === cleanLid || lidVal.replace(/\D/g, '') === targetLidDigits)) return true;
      if (cleanJid && jidVal && (jidVal === cleanJid || jidVal.replace(/\D/g, '') === targetLidDigits)) return true;
      if (targetLidDigits && isLidIdentifier(l.phone) && l.phone.replace(/\D/g, '') === targetLidDigits) return true;
      return false;
    });
    if (matched) return { matchedLead: matched, matchType: cleanLid ? 'lid' : 'jid' };
  }

  // 2b. Se o próprio cleanPhone for LID
  if (cleanPhone && isLidIdentifier(cleanPhone)) {
    const targetDigits = cleanPhone.replace(/\D/g, '');
    const matched = leads.find(l => {
      const lidVal = getLeadLid(l);
      const jidVal = getLeadJid(l);
      if (lidVal && (lidVal === cleanPhone || lidVal.replace(/\D/g, '') === targetDigits)) return true;
      if (jidVal && (jidVal === cleanPhone || jidVal.replace(/\D/g, '') === targetDigits)) return true;
      if (isLidIdentifier(l.phone) && l.phone.replace(/\D/g, '') === targetDigits) return true;
      return false;
    });
    if (matched) return { matchedLead: matched, matchType: 'lid' };
  }

  return { matchedLead: null, matchType: null };
}
