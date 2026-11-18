import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid, generateUuid } from '../utils/uuid';
import { generateBase36Code } from './contactService';
import { taskService } from './taskService';
import type { Contract, ContractApprovalStatus, ContractFunnelPlacement, Lead } from '../types/admin';

export interface GetContractsParams {
  masterId: string;
  venueIds?: string[];
  approvalStatus?: ContractApprovalStatus | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}

export const contractService = {
  /**
   * Busca contratos com suporte a abas ("Aguardando Aprovação" e "Aprovados/Vigentes")
   */
  async getContracts({
    masterId,
    venueIds,
    approvalStatus = 'all',
    search,
    limit = 50,
    offset = 0,
  }: GetContractsParams): Promise<Contract[]> {
    if (!isSupabaseConfigured || !masterId) return [];

    try {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          contact:contacts(*),
          venue:venues(id, name)
        `)
        .eq('master_id', masterId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Filtro de Status de Aprovação
      if (approvalStatus !== 'all') {
        query = query.eq('approval_status', approvalStatus);
      }

      // Filtro de Unidades (Multi-Venues: cada contrato pertence a uma única unidade)
      if (venueIds && venueIds.length > 0) {
        query = query.in('venue_id', venueIds);
      }

      // Busca textual (Código do Contrato, Título do Evento ou Nome do Cliente)
      if (search && search.trim()) {
        const term = search.trim();
        query = query.or(
          `contract_code.ilike.%${term}%,contract_title.ilike.%${term}%,title.ilike.%${term}%,event_title.ilike.%${term}%,sdr_name.ilike.%${term}%,closer_name.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar contratos:', error);
        return [];
      }

      return (data || []).map(mapRowToContract);
    } catch (err) {
      console.error('Exceção em contractService.getContracts:', err);
      return [];
    }
  },

  /**
   * Obtém detalhes de um contrato por ID, incluindo suas colocações nos funis de pós-venda
   */
  async getContractById(id: string, masterId: string): Promise<Contract | null> {
    if (!isSupabaseConfigured || !id || !masterId) return null;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          contact:contacts(*),
          venue:venues(id, name)
        `)
        .eq('id', id)
        .eq('master_id', masterId)
        .maybeSingle();

      if (error || !data) {
        if (error) console.error('Erro ao buscar contrato por ID:', error);
        return null;
      }

      const contract = mapRowToContract(data);

      // Carrega colocações multi-funil no pós-venda
      const { data: placements } = await supabase
        .from('contract_funnel_placements')
        .select(`
          *,
          funnel:commercial_funnels(id, name)
        `)
        .eq('contract_id', id)
        .eq('master_id', masterId);

      if (placements) {
        contract.placements = placements.map((p: any) => ({
          id: p.id,
          masterId: p.master_id,
          contractId: p.contract_id,
          funnelId: p.funnel_id,
          funnelName: p.funnel?.name || 'Funil Pós-Venda',
          stageId: p.stage_id,
          status: p.status,
          assignedTo: p.assigned_to,
          completedAt: p.completed_at,
          notes: p.notes,
          orderIndex: p.order_index,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
      }

      return contract;
    } catch (err) {
      console.error('Exceção em contractService.getContractById:', err);
      return null;
    }
  },

  /**
   * Cria um registro oficial na tabela contracts com master_id blindado, código CTR-...,
   * title: contractTitle, dealValue, client_id, venue_id, datas e anexos.
   */
  async createContract(params: {
    masterId: string;
    contractCode?: string;
    clientId?: string;
    contactId?: string;
    leadId?: string;
    originLeadId?: string;
    originFunnelId?: string;
    venueId: string;
    venueName?: string;
    eventType?: string;
    eventTitle?: string;
    contractTitle?: string;
    title?: string;
    eventDate?: string;
    eventTime?: string;
    guestCount?: number;
    packageName?: string;
    clientSnapshot?: Record<string, any>;
    commercialFieldsSnapshot?: Record<string, any>;
    totalAmount?: number;
    dealValue?: number;
    entryAmount?: number;
    balanceAmount?: number;
    paymentTerms?: Record<string, any> | string;
    sdrId?: string | null;
    sdrName?: string;
    sdrEmail?: string | null;
    closerId?: string | null;
    closerName?: string;
    closerEmail?: string | null;
    approvalStatus?: ContractApprovalStatus;
    targetPosSaleFunnelIds?: string[];
    handoverNotes?: string;
    contractFileUrl?: string;
    paymentFileUrl?: string;
    attachments?: Array<{ name: string; url: string; size?: number; type?: string }>;
    notes?: string;
  }): Promise<Contract | null> {
    if (!isSupabaseConfigured || !params.masterId || !params.venueId) {
      throw new Error('masterId e venueId são obrigatórios para criação do contrato.');
    }

    try {
      // 1. Resolução ou criação do contato titular (contact_id) com blindagem de master_id
      let effectiveContactId = params.contactId && isUuid(params.contactId) ? params.contactId : null;

      if (!effectiveContactId) {
        const phone = (params.clientSnapshot?.phone || '').replace(/\D/g, '');
        const cpf = (params.clientSnapshot?.cpf || '').replace(/\D/g, '');

        if (phone || cpf) {
          let query = supabase
            .from('contacts')
            .select('id')
            .eq('master_id', params.masterId)
            .is('deleted_at', null);

          if (cpf && cpf.length === 11) {
            query = query.eq('cpf', params.clientSnapshot?.cpf);
          } else if (phone) {
            query = query.eq('primary_phone', params.clientSnapshot?.phone);
          }

          const { data: existingContact } = await query.maybeSingle();
          if (existingContact?.id) {
            effectiveContactId = existingContact.id;
          }
        }

        // Se ainda não localizou contato cadastrado na Central de Contatos, cria registro limpo
        if (!effectiveContactId) {
          const newContactCode = generateBase36Code('CONT', 8);
          const contactName = params.clientSnapshot?.payerName || params.clientSnapshot?.name || 'Contratante';
          const { data: createdContact, error: contactErr } = await supabase
            .from('contacts')
            .insert({
              master_id: params.masterId,
              code: newContactCode,
              name: contactName.trim(),
              primary_phone: params.clientSnapshot?.phone || 'Não informado',
              email: params.clientSnapshot?.email || null,
              cpf: params.clientSnapshot?.cpf || null,
              address: params.clientSnapshot?.address || null,
              neighborhood: params.clientSnapshot?.neighborhood || null,
              city: params.clientSnapshot?.city || null,
              relationship_role: params.clientSnapshot?.payerRelationship || 'Titular',
            })
            .select('id')
            .single();

          if (createdContact?.id) {
            effectiveContactId = createdContact.id;
          } else if (contactErr) {
            console.warn('[contractService.createContract] Aviso ao criar contato fallback:', contactErr);
          }
        }
      }

      if (!effectiveContactId) {
        // Fallback: busca qualquer contato existente do tenant
        const { data: firstContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('master_id', params.masterId)
          .limit(1)
          .maybeSingle();
        if (firstContact?.id) effectiveContactId = firstContact.id;
      }

      if (!effectiveContactId) {
        throw new Error('Não foi possível associar um contato válido ao contrato.');
      }

      // Garante permissão de unidade (Multi-Venues) em contact_venue_access
      if (effectiveContactId && params.venueId) {
        try {
          await supabase
            .from('contact_venue_access')
            .upsert({
              master_id: params.masterId,
              contact_id: effectiveContactId,
              venue_id: params.venueId,
              first_interaction_at: new Date().toISOString(),
              last_interaction_at: new Date().toISOString(),
            }, { onConflict: 'contact_id,venue_id' });
        } catch (cvaErr) {
          console.warn('[contractService.createContract] Aviso ao vincular contact_venue_access:', cvaErr);
        }
      }

      const year = params.eventDate
        ? new Date(params.eventDate).getFullYear()
        : new Date().getFullYear();

      const contractCode = params.contractCode || generateBase36Code(`CTR-${year}`, 6);
      const computedTitle = (params.contractTitle || params.title || params.eventTitle || 'Contrato').trim();

      const totalAmount = Number(params.totalAmount ?? params.dealValue ?? 0);
      const entryAmount = Number(params.entryAmount ?? 0);
      const balanceAmount = Number(params.balanceAmount ?? Math.max(0, totalAmount - entryAmount));

      const payload: Record<string, any> = {
        master_id: params.masterId,
        contract_code: contractCode,
        client_id: params.clientId && isUuid(params.clientId) ? params.clientId : null,
        contact_id: effectiveContactId,
        origin_lead_id: params.originLeadId && isUuid(params.originLeadId) ? params.originLeadId : (params.leadId && isUuid(params.leadId) ? params.leadId : null),
        lead_id: params.leadId && isUuid(params.leadId) ? params.leadId : (params.originLeadId && isUuid(params.originLeadId) ? params.originLeadId : null),
        origin_funnel_id: params.originFunnelId && isUuid(params.originFunnelId) ? params.originFunnelId : null,
        venue_id: params.venueId,
        event_type: params.eventType || '15_anos',
        event_title: computedTitle,
        contract_title: computedTitle,
        title: computedTitle,
        event_date: params.eventDate || null,
        event_time: params.eventTime || null,
        guest_count: params.guestCount || 0,
        package_name: params.packageName || null,
        client_snapshot: params.clientSnapshot || {},
        commercial_fields_snapshot: params.commercialFieldsSnapshot || {},
        total_amount: totalAmount,
        entry_amount: entryAmount,
        balance_amount: balanceAmount,
        payment_terms: params.paymentTerms || {},
        sdr_id: params.sdrId && isUuid(params.sdrId) ? params.sdrId : null,
        sdr_name: params.sdrName || 'Equipe Comercial',
        sdr_email: params.sdrEmail || null,
        closer_id: params.closerId && isUuid(params.closerId) ? params.closerId : null,
        closer_name: params.closerName || 'Closer Responsável',
        closer_email: params.closerEmail || null,
        approval_status: params.approvalStatus || 'pending_approval',
        target_pos_sale_funnel_ids: params.targetPosSaleFunnelIds || [],
        handover_notes: params.handoverNotes || null,
        contract_file_url: params.contractFileUrl || null,
        payment_file_url: params.paymentFileUrl || null,
        attachments: params.attachments || [],
        notes: params.notes || '',
      };

      // Idempotencia por lead de origem: se ja existe contrato pendente/rejeitado do mesmo lead
      // (ex.: criado no ganho e completado no fechamento com anexos), atualiza em vez de duplicar.
      const originLead = payload.origin_lead_id as string | null;
      if (originLead) {
        const { data: existing } = await supabase
          .from('contracts')
          .select('*')
          .eq('master_id', params.masterId)
          .eq('origin_lead_id', originLead)
          .in('approval_status', ['pending_approval', 'rejected'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          const update: Record<string, any> = { ...payload };
          delete update.master_id;
          delete update.contract_code;
          // Nao sobrescreve com vazio o que ja foi preenchido
          if (!params.handoverNotes) delete update.handover_notes;
          if (!params.contractFileUrl) delete update.contract_file_url;
          if (!params.paymentFileUrl) delete update.payment_file_url;
          if (!params.attachments || params.attachments.length === 0) delete update.attachments;
          if (!params.clientId) delete update.client_id;
          if (!params.commercialFieldsSnapshot) delete update.commercial_fields_snapshot;
          update.approval_status = 'pending_approval';
          update.rejection_reason = null;
          update.updated_at = new Date().toISOString();

          const { data: updated, error: updErr } = await supabase
            .from('contracts')
            .update(update)
            .eq('id', existing.id)
            .eq('master_id', params.masterId)
            .select(`*, contact:contacts(*), venue:venues(id, name)`)
            .single();
          if (updErr || !updated) {
            throw new Error(updErr?.message || 'Falha ao atualizar contrato existente.');
          }
          // Reenvio apos negativa: encerra o modo "alteracao contratual" do lead
          if (existing.approval_status === 'rejected') {
            try {
              const { data: ld } = await supabase
                .from('leads')
                .select('custom_field_values')
                .eq('id', originLead)
                .eq('master_id', params.masterId)
                .maybeSingle();
              const cfv = { ...(ld?.custom_field_values || {}) } as Record<string, any>;
              if (cfv.contract_rejection) {
                delete cfv.contract_rejection;
                await supabase.from('leads').update({ custom_field_values: cfv }).eq('id', originLead).eq('master_id', params.masterId);
              }
            } catch (e) {
              console.warn('[contractService.createContract] Aviso ao limpar alteracao contratual:', e);
            }
          }
          return mapRowToContract(updated);
        }
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert(payload)
        .select(`
          *,
          contact:contacts(*),
          venue:venues(id, name)
        `)
        .single();

      if (error || !data) {
        console.error('Erro ao inserir contrato no Supabase:', error);
        throw new Error(error?.message || 'Falha ao salvar contrato no banco.');
      }

      return mapRowToContract(data);
    } catch (err: any) {
      console.error('Exceção em contractService.createContract:', err);
      throw err;
    }
  },

  /**
   * Cria um novo Contrato a partir da conversão de um Lead Comercial:
   * Gera código Base36, congela snapshots e entra na fila 'pending_approval'
   */
  async createContractFromLead(params: {
    masterId: string;
    lead: Lead;
    contactId: string;
    eventData: {
      eventType?: string;
      eventTitle: string;
      contractTitle?: string;
      eventDate?: string;
      eventTime?: string;
      guestCount?: number;
      packageName?: string;
    };
    financialData: {
      totalAmount: number;
      entryAmount?: number;
      balanceAmount?: number;
      paymentTerms?: Record<string, any> | string;
    };
    closerUser: { id?: string; name: string; email?: string };
    sdrUser?: { id?: string; name: string; email?: string };
    targetPosSaleFunnelIds?: string[];
    handoverNotes?: string;
    contractFileUrl?: string;
    paymentFileUrl?: string;
    clientId?: string;
  }): Promise<Contract | null> {
    if (!isSupabaseConfigured || !params.masterId || !params.contactId || !params.lead.venueId) {
      throw new Error('Parâmetros obrigatórios ausentes para geração de contrato.');
    }

    try {
      const year = params.eventData.eventDate
        ? new Date(params.eventData.eventDate).getFullYear()
        : new Date().getFullYear();
      
      const contractCode = generateBase36Code(`CTR-${year}`, 6);

      // 1. Snapshot Cadastral Imutável (Blindagem Unilateral)
      const clientSnapshot = {
        name: params.lead.name,
        phone: params.lead.phone,
        email: params.lead.email,
        cpf: params.lead.cpf,
        address: params.lead.address,
        neighborhood: params.lead.neighborhood,
        birthdayPersonName: params.lead.debutanteName || params.lead.name,
        capturedAt: new Date().toISOString(),
      };

      // 2. Snapshot Comercial Imutável dos Campos Herdados do Funil
      const commercialFieldsSnapshot = {
        customFields: params.lead.customFieldsData || {},
        profession: params.lead.profession,
        hasCreditCard: params.lead.hasCreditCard,
        decisionMakers: params.lead.decisionMakers,
        desiredPeriod: params.lead.desiredPeriod,
        mqlAnswers: params.lead.mqlAnswers || {},
        originFunnelId: params.lead.funnelId,
        capturedAt: new Date().toISOString(),
      };

      const totalAmount = Number(params.financialData.totalAmount || params.lead.dealValue || 0);
      const entryAmount = Number(
        params.financialData.entryAmount ?? 
        (params.lead as any).downPayment ?? 
        (params.lead as any).down_payment ?? 
        0
      );
      const balanceAmount = Number(
        params.financialData.balanceAmount ?? 
        Math.max(0, totalAmount - entryAmount)
      );

      const payload: Record<string, any> = {
        master_id: params.masterId,
        contract_code: contractCode,
        contact_id: params.contactId,
        origin_lead_id: params.lead.id,
        lead_id: params.lead.id,
        origin_funnel_id: params.lead.funnelId || null,
        venue_id: params.lead.venueId, // REGRA SUPREMA: UNIDADE ÚNICA
        client_id: params.clientId && isUuid(params.clientId) ? params.clientId : null,
        event_type: params.eventData.eventType || params.lead.eventType || '15_anos',
        event_title: params.eventData.eventTitle.trim(),
        contract_title: params.eventData.contractTitle?.trim() || params.eventData.eventTitle.trim(),
        title: params.eventData.contractTitle?.trim() || params.eventData.eventTitle.trim(),
        event_date: params.eventData.eventDate || null,
        event_time: params.eventData.eventTime || null,
        guest_count: params.eventData.guestCount || params.lead.estimatedGuests || 0,
        package_name: params.eventData.packageName || params.lead.packageSold || null,
        client_snapshot: clientSnapshot,
        commercial_fields_snapshot: commercialFieldsSnapshot,
        total_amount: totalAmount,
        entry_amount: entryAmount,
        balance_amount: balanceAmount,
        payment_terms: params.financialData.paymentTerms || {},
        sdr_id: params.sdrUser?.id && isUuid(params.sdrUser.id) ? params.sdrUser.id : null,
        sdr_name: params.sdrUser?.name || params.lead.sdrName || 'Equipe Comercial',
        sdr_email: params.sdrUser?.email || null,
        closer_id: params.closerUser?.id && isUuid(params.closerUser.id) ? params.closerUser.id : null,
        closer_name: params.closerUser?.name || params.lead.closerName || 'Closer Responsável',
        closer_email: params.closerUser?.email || null,
        approval_status: 'pending_approval',
        target_pos_sale_funnel_ids: params.targetPosSaleFunnelIds || [],
        handover_notes: params.handoverNotes || null,
        contract_file_url: params.contractFileUrl || null,
        payment_file_url: params.paymentFileUrl || null,
        notes: params.lead.notes || '',
      };

      const { data, error } = await supabase
        .from('contracts')
        .insert(payload)
        .select(`
          *,
          contact:contacts(*),
          venue:venues(id, name)
        `)
        .single();

      if (error || !data) {
        console.error('Erro ao criar contrato a partir de lead:', error);
        throw new Error(error?.message || 'Falha ao salvar novo contrato.');
      }

      return mapRowToContract(data);
    } catch (err: any) {
      console.error('Exceção em contractService.createContractFromLead:', err);
      throw err;
    }
  },

  /**
   * Homologa o Contrato na Mesa de Aprovação:
   * - Permissão estrita: apenas gerente_comercial, gerente_geral ou master
   * - Restringe os funis de pós-venda selecionados à MESMA unidade do contrato
   * - Cria colocações em contract_funnel_placements para os funis de pós-venda
   */
  async approveContract(params: {
    contractId: string;
    masterId: string;
    approverUser: { id: string; name: string; role: string };
    targetPosSaleFunnelIds: string[];
    lockEventDate?: boolean;
  }): Promise<{ success: boolean; contract?: Contract; message?: string }> {
    if (!isSupabaseConfigured || !params.contractId || !params.masterId) {
      return { success: false, message: 'Parâmetros inválidos.' };
    }

    // 1. Verificação Rígida de Alçada
    const allowedRoles = ['master', 'gerente_geral', 'gerente_comercial', 'admin', 'dev'];
    if (!allowedRoles.includes(params.approverUser.role)) {
      return {
        success: false,
        message: 'Apenas Gerente Comercial, Gerente Geral ou Master têm autorização para homologar contratos.',
      };
    }

    try {
      // 2. Busca o contrato e sua unidade única
      const { data: contractRow, error: errContract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', params.contractId)
        .eq('master_id', params.masterId)
        .single();

      if (errContract || !contractRow) {
        return { success: false, message: 'Contrato não encontrado.' };
      }

      const contractVenueId = contractRow.venue_id;

      // 3. Validação dos funis selecionados (devem pertencer à MESMA unidade)
      let validFunnelIds: string[] = [];
      if (params.targetPosSaleFunnelIds && params.targetPosSaleFunnelIds.length > 0) {
        const { data: funnels } = await supabase
          .from('commercial_funnels')
          .select('id, venue_id, stages')
          .eq('master_id', params.masterId)
          .in('id', params.targetPosSaleFunnelIds);

        // Filtra estritamente os funis da mesma unidade
        validFunnelIds = (funnels || [])
          .filter(f => f.venue_id === contractVenueId)
          .map(f => f.id);
      }

      // 3b. Congela a jornada do lead no contrato (snapshot imutavel: etapas e tempo em cada uma)
      let frozenSnapshot: Record<string, any> = { ...(contractRow.commercial_fields_snapshot || {}) };
      const journeyLeadId = contractRow.origin_lead_id || contractRow.lead_id;
      if (journeyLeadId && !frozenSnapshot.journey) {
        const { data: hist } = await supabase
          .from('lead_stage_history')
          .select('stage_id, stage_name, funnel_id, entered_at, left_at, moved_by_name')
          .eq('lead_id', journeyLeadId)
          .eq('master_id', params.masterId)
          .order('entered_at', { ascending: true });
        if (hist && hist.length > 0) {
          frozenSnapshot = {
            ...frozenSnapshot,
            journey: hist,
            journeyTotalMs: Date.now() - new Date(hist[0].entered_at as string).getTime(),
            journeyFrozenAt: new Date().toISOString(),
          };
        }
      }

      // 4. Atualiza o status do contrato para 'approved' com snapshot do aprovador
      const { data: updated, error: errUpdate } = await supabase
        .from('contracts')
        .update({
          commercial_fields_snapshot: frozenSnapshot,
          approval_status: 'approved',
          approved_by: params.approverUser.id && isUuid(params.approverUser.id) ? params.approverUser.id : null,
          approved_by_name: params.approverUser.name,
          approved_by_role: params.approverUser.role,
          approved_at: new Date().toISOString(),
          target_pos_sale_funnel_ids: validFunnelIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.contractId)
        .eq('master_id', params.masterId)
        .select(`
          *,
          contact:contacts(*),
          venue:venues(id, name)
        `)
        .single();

      if (errUpdate || !updated) {
        return { success: false, message: errUpdate?.message || 'Erro ao homologar contrato.' };
      }

      // 5. Criação das Colocações nos Funis de Pós-Venda (contract_funnel_placements)
      if (validFunnelIds.length > 0) {
        const { data: funnels } = await supabase
          .from('commercial_funnels')
          .select('id, stages')
          .eq('master_id', params.masterId)
          .in('id', validFunnelIds);

        const placementInserts = (funnels || []).map(funnel => {
          // Determina a etapa inicial do funil
          let initialStageId = 'onboarding';
          if (Array.isArray(funnel.stages) && funnel.stages.length > 0) {
            initialStageId = funnel.stages[0].id || 'onboarding';
          }

          return {
            master_id: params.masterId,
            contract_id: params.contractId,
            funnel_id: funnel.id,
            stage_id: initialStageId,
            status: 'in_progress',
          };
        });

        if (placementInserts.length > 0) {
          await supabase
            .from('contract_funnel_placements')
            .upsert(placementInserts, { onConflict: 'contract_id,funnel_id' });
        }

        // 5b. Cada funil de pos-venda e um setor independente: garante um card (client) por funil,
        // ligado ao mesmo lead de origem, na primeira etapa do respectivo funil.
        try {
          const clientId = contractRow.client_id as string | null;
          const originLeadId = contractRow.origin_lead_id as string | null;
          let baseClient: Record<string, any> | null = null;
          if (clientId) {
            const { data: c } = await supabase.from('clients').select('*').eq('id', clientId).eq('master_id', params.masterId).maybeSingle();
            baseClient = c || null;
          }
          if (baseClient) {
            const leadKey = originLeadId || baseClient.commercial_lead_id || null;
            for (const funnel of funnels || []) {
              if (baseClient.funnel_id === funnel.id) continue;
              let existsQuery = supabase.from('clients').select('id').eq('master_id', params.masterId).eq('funnel_id', funnel.id);
              existsQuery = leadKey ? existsQuery.eq('commercial_lead_id', leadKey) : existsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
              const { data: already } = await existsQuery.limit(1).maybeSingle();
              if (already?.id) continue;
              const firstStage = Array.isArray(funnel.stages) && funnel.stages.length > 0 ? funnel.stages[0].id : 'onboarding';
              const copy: Record<string, any> = { ...baseClient };
              delete copy.migrated_to_contract_id;
              delete copy.migrated_to_contact_id;
              delete copy.migrated_at;
              copy.id = generateUuid();
              copy.code = `${baseClient.code || 'CLI'}-${String(funnel.id).slice(0, 4).toUpperCase()}`;
              copy.funnel_id = funnel.id;
              copy.stage = firstStage;
              copy.created_at = new Date().toISOString();
              copy.updated_at = new Date().toISOString();
              const { error: cErr } = await supabase.from('clients').insert(copy);
              if (cErr) console.warn('[approveContract] Aviso ao criar card do funil setorial:', cErr.message);
            }
          }
        } catch (siblingErr) {
          console.warn('[approveContract] Aviso ao criar cards setoriais:', siblingErr);
        }
      }

      return {
        success: true,
        contract: mapRowToContract(updated),
      };
    } catch (err: any) {
      console.error('Exceção em contractService.approveContract:', err);
      return { success: false, message: err.message || 'Erro inesperado ao aprovar contrato.' };
    }
  },

  /**
   * Rejeita ou solicita ajustes comerciais para um contrato pendente
   * Automatização: Gera tarefa prioritária para o closer responsável
   */
  async rejectContract(params: {
    contractId: string;
    masterId: string;
    rejectionReason: string;
    approverUser: { id: string; name: string; role: string };
  }): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured || !params.contractId || !params.masterId) {
      return { success: false, message: 'Parâmetros inválidos.' };
    }

    try {
      // 1. Busca dados do contrato para atribuição correta da tarefa
      const { data: contract } = await supabase
        .from('contracts')
        .select('contract_code, closer_id, closer_name, origin_lead_id, venue_id, event_title')
        .eq('id', params.contractId)
        .eq('master_id', params.masterId)
        .maybeSingle();

      const { error } = await supabase
        .from('contracts')
        .update({
          approval_status: 'rejected',
          rejection_reason: params.rejectionReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.contractId)
        .eq('master_id', params.masterId);

      if (error) {
        return { success: false, message: error.message };
      }

      // 1b. Devolve o lead para a etapa anterior ao ganho (tela de alteracao contratual) e arquiva o client pre-criado
      if (contract?.origin_lead_id && isUuid(contract.origin_lead_id)) {
        try {
          const { data: lead } = await supabase
            .from('leads')
            .select('id, stage, funnel_id, custom_field_values')
            .eq('id', contract.origin_lead_id)
            .eq('master_id', params.masterId)
            .maybeSingle();
          if (lead) {
            let targetStage: string | undefined;
            if (lead.funnel_id) {
              const { data: funnel } = await supabase
                .from('commercial_funnels')
                .select('stages')
                .eq('id', lead.funnel_id)
                .maybeSingle();
              const stages: Array<{ id: string; isWon?: boolean; isLoss?: boolean }> = Array.isArray(funnel?.stages) ? funnel!.stages : [];
              const wonIdx = stages.findIndex(s => s.isWon);
              const before = (wonIdx > 0 ? stages.slice(0, wonIdx) : stages).filter(s => !s.isLoss && !s.isWon);
              targetStage = before.length > 0 ? before[before.length - 1].id : undefined;
            }
            const rejection = {
              contractId: params.contractId,
              contractCode: contract.contract_code,
              reason: params.rejectionReason.trim(),
              rejectedBy: params.approverUser.name,
              rejectedByRole: params.approverUser.role,
              rejectedAt: new Date().toISOString(),
              deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
            const leadUpdate: Record<string, any> = {
              custom_field_values: { ...(lead.custom_field_values || {}), contract_rejection: rejection },
            };
            if (targetStage) leadUpdate.stage = targetStage;
            await supabase.from('leads').update(leadUpdate).eq('id', lead.id).eq('master_id', params.masterId);
          }
          await supabase
            .from('clients')
            .update({ stage: 'archived' })
            .eq('commercial_lead_id', contract.origin_lead_id)
            .eq('master_id', params.masterId);
        } catch (leadErr) {
          console.warn('[contractService.rejectContract] Aviso ao devolver lead ao funil comercial:', leadErr);
        }
      }

      // 2. Se o contrato existir, gera tarefa prioritária para o Closer via taskService blindado
      if (contract) {
        const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        try {
          await taskService.upsert({
            id: generateUuid(),
            databaseId: 'default_collabs',
            venueId: contract.venue_id && isUuid(contract.venue_id) ? contract.venue_id : undefined,
            leadId: contract.origin_lead_id && isUuid(contract.origin_lead_id) ? contract.origin_lead_id : undefined,
            masterId: params.masterId,
            title: `Ajustar Contrato ${contract.contract_code}: ${params.rejectionReason.trim().slice(0, 60)}`,
            description: `A gerência negou o contrato ${contract.contract_code} (${contract.event_title || ''}).\nOrientações de quem negou: ${params.rejectionReason.trim()}\nDevolvido por: ${params.approverUser.name} (${params.approverUser.role}).\nPrazo: 24h. Ajuste os dados na tela de Alteração Contratual do lead e reenvie para aprovação.`,
            priority: 'urgent',
            status: 'todo',
            dueDate,
            assignedToIds: contract.closer_id && isUuid(contract.closer_id) ? [contract.closer_id] : [],
            createdByName: params.approverUser.name,
            customProperties: {
              masterId: params.masterId,
              contractCode: contract.contract_code,
              rejectionReason: params.rejectionReason.trim(),
              source: 'contract_rejection',
            },
          }, params.masterId);
        } catch (taskErr) {
          console.warn('[contractService.rejectContract] Aviso ao criar tarefa automática de ajuste:', taskErr);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  /**
   * Cancela 100% um contrato aprovado: sai de todos os funis vinculados (remove placements)
   * e arquiva o client. O contrato e o snapshot permanecem (imutabilidade). Somente gerente/master.
   */
  async cancelContract(params: {
    contractId: string;
    masterId: string;
    reason: string;
    actor: { id: string; name: string; role: string; commercialRole?: string };
  }): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured || !params.contractId || !params.masterId) {
      return { success: false, message: 'Parâmetros inválidos.' };
    }
    const roles = [params.actor.role, params.actor.commercialRole].map(r => (r || '').toLowerCase());
    const allowed = roles.some(r => ['master', 'gerente_geral', 'gerente_comercial'].includes(r));
    if (!allowed) {
      return { success: false, message: 'Somente gerente ou master pode cancelar contratos.' };
    }
    if (!params.reason.trim()) {
      return { success: false, message: 'Informe o motivo do cancelamento.' };
    }
    try {
      const { data: contract } = await supabase
        .from('contracts')
        .select('id, client_id, origin_lead_id, notes')
        .eq('id', params.contractId)
        .eq('master_id', params.masterId)
        .maybeSingle();
      if (!contract) return { success: false, message: 'Contrato não encontrado.' };

      const stamp = new Date().toLocaleString('pt-BR');
      const note = `[Cancelado em ${stamp} por ${params.actor.name}] ${params.reason.trim()}`;
      const { error } = await supabase
        .from('contracts')
        .update({
          approval_status: 'canceled',
          rejection_reason: params.reason.trim(),
          notes: contract.notes ? `${contract.notes}\n${note}` : note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.contractId)
        .eq('master_id', params.masterId);
      if (error) return { success: false, message: error.message };

      // Sai de todos os funis vinculados
      const { error: plErr } = await supabase
        .from('contract_funnel_placements')
        .delete()
        .eq('contract_id', params.contractId)
        .eq('master_id', params.masterId);
      if (plErr) console.warn('[contractService.cancelContract] Aviso ao remover placements:', plErr);

      if (contract.client_id) {
        await supabase
          .from('clients')
          .update({ stage: 'archived' })
          .eq('id', contract.client_id)
          .eq('master_id', params.masterId);
      }
      // Tambem arquiva os cards irmaos (um por funil setorial) do mesmo lead de origem
      if (contract.origin_lead_id) {
        await supabase
          .from('clients')
          .update({ stage: 'archived' })
          .eq('commercial_lead_id', contract.origin_lead_id)
          .eq('master_id', params.masterId);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  /**
   * Mantem a esteira (contract_funnel_placements) alinhada ao card movido no Kanban do funil:
   * cada funil atualiza apenas a propria colocacao.
   */
  async syncPlacementFromClient(params: {
    clientId: string;
    commercialLeadId?: string | null;
    funnelId?: string | null;
    stageId: string;
    masterId: string;
  }): Promise<void> {
    if (!isSupabaseConfigured || !params.masterId || !params.funnelId || !isUuid(params.funnelId)) return;
    try {
      let q = supabase.from('contracts').select('id').eq('master_id', params.masterId).neq('approval_status', 'canceled');
      q = params.commercialLeadId && isUuid(params.commercialLeadId)
        ? q.or(`client_id.eq.${params.clientId},origin_lead_id.eq.${params.commercialLeadId}`)
        : q.eq('client_id', params.clientId);
      const { data: ctrs } = await q;
      const ids = (ctrs || []).map((c: any) => c.id as string);
      if (ids.length === 0) return;
      const { data: pls } = await supabase
        .from('contract_funnel_placements')
        .select('id')
        .eq('master_id', params.masterId)
        .eq('funnel_id', params.funnelId)
        .in('contract_id', ids);
      for (const p of pls || []) {
        await contractService.updatePlacementStage(p.id as string, params.stageId, params.masterId);
      }
    } catch (err) {
      console.warn('[syncPlacementFromClient] Aviso:', err);
    }
  },

  /**
   * Atualiza a etapa de um contrato dentro de um funil pós-venda específico
   * e avalia a conclusão global do contrato (Regra 3 Multi-Funil).
   */
  async updatePlacementStage(
    placementId: string,
    newStageId: string,
    masterId: string,
    explicitStatus?: 'in_progress' | 'completed' | 'on_hold'
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !placementId || !masterId) return false;

    try {
      // 1. Busca a colocação para obter o contract_id
      const { data: placement, error: fetchErr } = await supabase
        .from('contract_funnel_placements')
        .select('id, contract_id, funnel_id, stage_id, status')
        .eq('id', placementId)
        .eq('master_id', masterId)
        .single();

      if (fetchErr || !placement) {
        console.error('Colocação não encontrada:', fetchErr);
        return false;
      }

      // Determina se a nova etapa representa conclusão
      const isCompletedStage = 
        explicitStatus === 'completed' ||
        newStageId === 'completed' ||
        newStageId === 'festa_realizada' ||
        newStageId === 'finalizado' ||
        newStageId.toLowerCase().includes('realizad') ||
        newStageId.toLowerCase().includes('concluid');

      const nextStatus = explicitStatus || (isCompletedStage ? 'completed' : 'in_progress');
      const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

      const { error: updateErr } = await supabase
        .from('contract_funnel_placements')
        .update({
          stage_id: newStageId,
          status: nextStatus,
          completed_at: completedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', placementId)
        .eq('master_id', masterId);

      if (updateErr) {
        console.error('Erro ao atualizar etapa da colocação do contrato:', updateErr);
        return false;
      }

      // 2. REGRA DE CONCLUSÃO GLOBAL MULTI-FUNIL:
      // O contrato só muda para 'completed' quando todos os funis setoriais ativos tiverem suas etapas finalizadas.
      await this.syncContractGlobalCompletion(placement.contract_id, masterId);

      return true;
    } catch (err) {
      console.error('Erro ao atualizar etapa da colocação do contrato:', err);
      return false;
    }
  },

  /**
   * Sincroniza a conclusão global do Contrato Multi-Funil (Regra 3):
   * O contrato só atinge status 'completed' quando TODAS as colocações ativas em funis de pós-venda
   * estiverem com status === 'completed'. Se qualquer funil setorial estiver em andamento,
   * o contrato permanece em 'approved' (ativo/vigente).
   */
  async syncContractGlobalCompletion(
    contractId: string,
    masterId: string
  ): Promise<{ isCompleted: boolean; contractStatus: string }> {
    if (!isSupabaseConfigured || !contractId || !masterId) {
      return { isCompleted: false, contractStatus: 'unknown' };
    }

    try {
      // 1. Busca todas as colocações do contrato
      const { data: placements, error: errPlacements } = await supabase
        .from('contract_funnel_placements')
        .select('id, status, stage_id')
        .eq('contract_id', contractId)
        .eq('master_id', masterId);

      if (errPlacements || !placements) {
        console.error('Erro ao consultar colocações do contrato para conclusão global:', errPlacements);
        return { isCompleted: false, contractStatus: 'unknown' };
      }

      // 2. Busca o contrato atual
      const { data: contract, error: errContract } = await supabase
        .from('contracts')
        .select('id, approval_status')
        .eq('id', contractId)
        .eq('master_id', masterId)
        .single();

      if (errContract || !contract) {
        return { isCompleted: false, contractStatus: 'unknown' };
      }

      // Se o contrato estiver cancelado, rejeitado ou pendente de aprovação, não altera
      if (
        contract.approval_status === 'canceled' ||
        contract.approval_status === 'rejected' ||
        contract.approval_status === 'pending_approval'
      ) {
        return { isCompleted: false, contractStatus: contract.approval_status };
      }

      const totalPlacements = placements.length;
      const allCompleted = totalPlacements > 0 && placements.every(p => p.status === 'completed');

      if (allCompleted) {
        if (contract.approval_status !== 'completed') {
          await supabase
            .from('contracts')
            .update({
              approval_status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', contractId)
            .eq('master_id', masterId);
        }
        return { isCompleted: true, contractStatus: 'completed' };
      } else {
        // Se alguma etapa ainda não foi finalizada e o contrato estava como 'completed', reverte para 'approved'
        if (contract.approval_status === 'completed') {
          await supabase
            .from('contracts')
            .update({
              approval_status: 'approved',
              updated_at: new Date().toISOString(),
            })
            .eq('id', contractId)
            .eq('master_id', masterId);
        }
        return { isCompleted: false, contractStatus: 'approved' };
      }
    } catch (err) {
      console.error('Erro ao sincronizar conclusão global do contrato:', err);
      return { isCompleted: false, contractStatus: 'error' };
    }
  },

  /**
   * Obtém todas as colocações de um contrato nos funis de pós-venda
   */
  async getPlacementsByContract(
    contractId: string,
    masterId: string
  ): Promise<ContractFunnelPlacement[]> {
    if (!isSupabaseConfigured || !contractId || !masterId) return [];

    try {
      const { data, error } = await supabase
        .from('contract_funnel_placements')
        .select(`
          *,
          funnel:commercial_funnels(id, name)
        `)
        .eq('contract_id', contractId)
        .eq('master_id', masterId)
        .order('order_index', { ascending: true });

      if (error || !data) {
        console.error('Erro ao buscar colocações do contrato:', error);
        return [];
      }

      return data.map((p: any) => ({
        id: p.id,
        masterId: p.master_id,
        contractId: p.contract_id,
        funnelId: p.funnel_id,
        funnelName: p.funnel?.name || 'Funil Pós-Venda',
        stageId: p.stage_id,
        status: p.status,
        completedAt: p.completed_at,
        assignedTo: p.assigned_to,
        notes: p.notes,
        orderIndex: p.order_index,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    } catch (err) {
      console.error('Exceção em getPlacementsByContract:', err);
      return [];
    }
  },

  /**
   * Colocações (funis de pós-venda) do(s) contrato(s) ligados a um client legado.
   * Sempre escopado por master_id.
   */
  async getPlacementsByClient(
    clientId: string,
    masterId: string
  ): Promise<ContractFunnelPlacement[]> {
    if (!isSupabaseConfigured || !clientId || !masterId) return [];
    try {
      // Cards irmaos (um por funil setorial) compartilham o lead de origem e o mesmo contrato
      const { data: cli } = await supabase.from('clients').select('commercial_lead_id').eq('id', clientId).eq('master_id', masterId).maybeSingle();
      const leadKey = cli?.commercial_lead_id as string | null | undefined;
      let ctrQuery = supabase
        .from('contracts')
        .select('id')
        .eq('master_id', masterId)
        .neq('approval_status', 'canceled');
      ctrQuery = leadKey && isUuid(leadKey)
        ? ctrQuery.or(`client_id.eq.${clientId},origin_lead_id.eq.${leadKey}`)
        : ctrQuery.eq('client_id', clientId);
      const { data: ctrs } = await ctrQuery;
      const ids = (ctrs || []).map((c: any) => c.id as string);
      if (ids.length === 0) return [];
      const lists = await Promise.all(ids.map(id => contractService.getPlacementsByContract(id, masterId)));
      return lists.flat();
    } catch (err) {
      console.error('Exceção em getPlacementsByClient:', err);
      return [];
    }
  },

  /**
   * Obtém todas as colocações ativas de um funil de pós-venda específico
   * com contrato e dados do contato resolvidos (visão Kanban setorial)
   */
  async getPlacementsByFunnel(
    funnelId: string,
    masterId: string
  ): Promise<ContractFunnelPlacement[]> {
    if (!isSupabaseConfigured || !funnelId || !masterId) return [];

    try {
      const { data, error } = await supabase
        .from('contract_funnel_placements')
        .select(`
          *,
          contract:contracts(
            *,
            contact:contacts(*)
          )
        `)
        .eq('funnel_id', funnelId)
        .eq('master_id', masterId)
        .order('order_index', { ascending: true });

      if (error || !data) {
        console.error('Erro ao buscar colocações por funil:', error);
        return [];
      }

      return data.map((p: any) => ({
        id: p.id,
        masterId: p.master_id,
        contractId: p.contract_id,
        funnelId: p.funnel_id,
        stageId: p.stage_id,
        status: p.status,
        completedAt: p.completed_at,
        assignedTo: p.assigned_to,
        notes: p.notes,
        orderIndex: p.order_index,
        contract: p.contract ? mapRowToContract(p.contract) : undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    } catch (err) {
      console.error('Exceção em getPlacementsByFunnel:', err);
      return [];
    }
  },

  /**
   * Adiciona um contrato a um funil setorial de pós-venda adicional (Geral, Decoração, Cerimonial, Coreografia)
   */
  async addContractPlacement(params: {
    contractId: string;
    funnelId: string;
    stageId?: string;
    masterId: string;
    assignedTo?: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured || !params.contractId || !params.funnelId || !params.masterId) return false;

    try {
      // 1. Determina etapa inicial se não informada
      let initialStage = params.stageId;
      if (!initialStage) {
        const { data: f } = await supabase
          .from('commercial_funnels')
          .select('stages')
          .eq('id', params.funnelId)
          .eq('master_id', params.masterId)
          .maybeSingle();

        if (f && Array.isArray(f.stages) && f.stages.length > 0) {
          initialStage = f.stages[0].id;
        } else {
          initialStage = 'onboarding';
        }
      }

      // 2. Insere colocação
      const { error } = await supabase
        .from('contract_funnel_placements')
        .upsert({
          master_id: params.masterId,
          contract_id: params.contractId,
          funnel_id: params.funnelId,
          stage_id: initialStage,
          assigned_to: params.assignedTo && isUuid(params.assignedTo) ? params.assignedTo : null,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'contract_id,funnel_id' });

      if (error) {
        console.error('Erro ao adicionar colocação de contrato:', error);
        return false;
      }

      // 3. Atualiza target_pos_sale_funnel_ids no contrato se não estiver presente
      const { data: contract } = await supabase
        .from('contracts')
        .select('target_pos_sale_funnel_ids')
        .eq('id', params.contractId)
        .eq('master_id', params.masterId)
        .maybeSingle();

      const currentIds: string[] = Array.isArray(contract?.target_pos_sale_funnel_ids) ? contract.target_pos_sale_funnel_ids : [];
      if (!currentIds.includes(params.funnelId)) {
        await supabase
          .from('contracts')
          .update({
            target_pos_sale_funnel_ids: [...currentIds, params.funnelId],
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.contractId)
          .eq('master_id', params.masterId);
      }

      // Re-sincroniza conclusão global
      await this.syncContractGlobalCompletion(params.contractId, params.masterId);

      return true;
    } catch (err) {
      console.error('Exceção em addContractPlacement:', err);
      return false;
    }
  },

  /**
   * Executa a migração segura e idempotente de registros da tabela legada 'clients'
   * para 'contacts' e 'contracts' formais com isolamento por master_id (Regra 4)
   */
  async migrateLegacyClients(masterId?: string): Promise<{ total: number; migrated: number; skipped: number; errors: number }> {
    if (!isSupabaseConfigured) return { total: 0, migrated: 0, skipped: 0, errors: 0 };

    try {
      let query = supabase
        .from('clients')
        .select('*')
        .not('master_id', 'is', null);

      if (masterId && isUuid(masterId)) {
        query = query.eq('master_id', masterId);
      }

      const { data: legacyClients, error } = await query;
      if (error || !legacyClients) {
        console.error('Erro ao buscar clientes legados para migração:', error);
        return { total: 0, migrated: 0, skipped: 0, errors: 1 };
      }

      let migratedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const client of legacyClients) {
        try {
          const clientMasterId = client.master_id;
          if (!clientMasterId) {
            skippedCount++;
            continue;
          }

          const rawPhone = client.contact_phone || client.phone || '';
          const cleanPhone = rawPhone.replace(/\D/g, '');

          // 1. Encontra ou cria Contato
          let contactId: string | null = null;
          if (cleanPhone.length >= 8) {
            const { data: existingContacts } = await supabase
              .from('contacts')
              .select('id')
              .eq('master_id', clientMasterId)
              .is('deleted_at', null)
              .or(`primary_phone.eq.${cleanPhone},primary_phone.ilike.%${cleanPhone.slice(-8)}%`)
              .limit(1);

            if (existingContacts && existingContacts.length > 0) {
              contactId = existingContacts[0].id;
            }
          }

          if (!contactId && client.payer_cpf) {
            const { data: cpfContacts } = await supabase
              .from('contacts')
              .select('id')
              .eq('master_id', clientMasterId)
              .eq('cpf', client.payer_cpf)
              .is('deleted_at', null)
              .limit(1);

            if (cpfContacts && cpfContacts.length > 0) {
              contactId = cpfContacts[0].id;
            }
          }

          if (!contactId) {
            const newCode = generateBase36Code('CONT', 8);
            const { data: createdContact, error: createContactErr } = await supabase
              .from('contacts')
              .insert({
                master_id: clientMasterId,
                code: newCode,
                name: client.contact_name || client.name || `Cliente ${client.client_code || ''}`.trim(),
                primary_phone: cleanPhone || rawPhone || `sem-telefone-${client.id.slice(0, 8)}`,
                email: client.contact_email || client.email || null,
                cpf: client.payer_cpf || null,
                street: client.payer_address || null,
                neighborhood: client.payer_neighborhood || null,
                city: client.payer_city || null,
                relationship_role: 'Contratante',
                created_at: client.created_at || new Date().toISOString(),
                updated_at: client.updated_at || new Date().toISOString(),
              })
              .select('id')
              .single();

            if (!createContactErr && createdContact) {
              contactId = createdContact.id;
            }
          }

          if (!contactId) {
            errorCount++;
            continue;
          }

          // Vincula unidade em contact_venue_access
          if (client.venue_id && isUuid(client.venue_id)) {
            await supabase
              .from('contact_venue_access')
              .upsert({
                master_id: clientMasterId,
                contact_id: contactId,
                venue_id: client.venue_id,
                first_interaction_at: client.created_at || new Date().toISOString(),
                last_interaction_at: new Date().toISOString(),
              }, { onConflict: 'contact_id,venue_id' })
              .maybeSingle();
          }

          // 2. Encontra ou cria Contrato
          let contractId: string | null = null;
          let contractQuery = supabase
            .from('contracts')
            .select('id')
            .eq('master_id', clientMasterId);

          if (client.commercial_lead_id) {
            contractQuery = contractQuery.eq('origin_lead_id', client.commercial_lead_id);
          } else if (client.client_code) {
            contractQuery = contractQuery.eq('contract_code', client.client_code);
          } else {
            contractQuery = contractQuery.eq('id', client.id);
          }

          const { data: existingContract } = await contractQuery.limit(1).maybeSingle();

          if (existingContract) {
            contractId = existingContract.id;
            skippedCount++;
          } else {
            const year = client.event_date ? new Date(client.event_date).getFullYear() : new Date().getFullYear();
            const contractCode = client.client_code || generateBase36Code(`CTR-${year}`, 6);
            const isCompleted = client.stage === 'completed' || client.stage === 'festa_realizada';

            const clientSnapshot = {
              name: client.contact_name || client.name,
              phone: cleanPhone || rawPhone,
              email: client.contact_email || client.email,
              cpf: client.payer_cpf,
              address: client.payer_address,
              neighborhood: client.payer_neighborhood,
              city: client.payer_city,
              birthdayPersonName: client.birthday_person_name || client.name,
              capturedAt: client.created_at || new Date().toISOString(),
            };

            const { data: newContract, error: newContractErr } = await supabase
              .from('contracts')
              .insert({
                master_id: clientMasterId,
                contract_code: contractCode,
                contact_id: contactId,
                origin_lead_id: client.commercial_lead_id || null,
                origin_funnel_id: client.funnel_id || null,
                venue_id: client.venue_id,
                event_type: client.event_type || '15_anos',
                event_title: client.birthday_person_name || `${client.contact_name || client.name || 'Cliente'} - Evento`,
                event_date: client.event_date || null,
                event_time: client.event_time || null,
                guest_count: client.guest_count || 0,
                package_name: client.package_sold || null,
                client_snapshot: clientSnapshot,
                commercial_fields_snapshot: {},
                total_amount: Number(client.deal_value || 0),
                sdr_name: 'Equipe Comercial',
                closer_name: 'Closer Responsável',
                approval_status: isCompleted ? 'completed' : 'approved',
                approved_at: client.created_at || new Date().toISOString(),
                approved_by_name: 'Sistema (Migração Automática)',
                approved_by_role: 'master',
                target_pos_sale_funnel_ids: client.funnel_id ? [client.funnel_id] : [],
                notes: client.notes || '',
                attachments: Array.isArray(client.documents) ? client.documents : [],
                created_at: client.created_at || new Date().toISOString(),
                updated_at: client.updated_at || new Date().toISOString(),
              })
              .select('id')
              .single();

            if (!newContractErr && newContract) {
              contractId = newContract.id;
              migratedCount++;

              // Cria colocação em contract_funnel_placements se houver funil de pós-venda
              if (client.funnel_id && isUuid(client.funnel_id)) {
                await supabase
                  .from('contract_funnel_placements')
                  .upsert({
                    master_id: clientMasterId,
                    contract_id: newContract.id,
                    funnel_id: client.funnel_id,
                    stage_id: client.stage || 'onboarding',
                    status: isCompleted ? 'completed' : 'in_progress',
                    completed_at: isCompleted ? (client.updated_at || new Date().toISOString()) : null,
                  }, { onConflict: 'contract_id,funnel_id' });
              }
            } else {
              console.error('Erro ao inserir contrato migrado:', newContractErr);
              errorCount++;
            }
          }

          // Marca o registro legado em clients
          if (contractId) {
            await supabase
              .from('clients')
              .update({
                updated_at: new Date().toISOString(),
              })
              .eq('id', client.id)
              .eq('master_id', clientMasterId);
          }
        } catch (itemErr) {
          console.error('Erro ao migrar cliente legado individual:', itemErr);
          errorCount++;
        }
      }

      return { total: legacyClients.length, migrated: migratedCount, skipped: skippedCount, errors: errorCount };
    } catch (err) {
      console.error('Falha geral em migrateLegacyClients:', err);
      return { total: 0, migrated: 0, skipped: 0, errors: 1 };
    }
  },
};

function mapRowToContract(row: any): Contract {
  const totalAmount = Number(row.total_amount ?? row.contract_value ?? 0);
  const entryAmount = Number(row.entry_amount ?? row.payment_terms?.entryAmount ?? row.payment_terms?.downPayment ?? 0);
  const balanceAmount = Number(row.balance_amount ?? row.payment_terms?.balanceAmount ?? Math.max(0, totalAmount - entryAmount));

  return {
    id: row.id,
    masterId: row.master_id,
    contractCode: row.contract_code,
    contactId: row.contact_id,
    originLeadId: row.origin_lead_id || row.lead_id,
    leadId: row.lead_id || row.origin_lead_id,
    originFunnelId: row.origin_funnel_id,
    venueId: row.venue_id,
    venueName: row.venue?.name || row.venue_name || '',
    eventType: row.event_type || '15_anos',
    eventTitle: row.event_title || row.contract_title || row.title || '',
    contractTitle: row.contract_title || row.title || row.event_title || '',
    title: row.title || row.contract_title || row.event_title || '',
    clientId: row.client_id || undefined,
    eventDate: row.event_date,
    eventTime: row.event_time,
    guestCount: row.guest_count,
    packageName: row.package_name,
    clientSnapshot: row.client_snapshot || {},
    commercialFieldsSnapshot: row.commercial_fields_snapshot || {},
    totalAmount,
    entryAmount,
    balanceAmount,
    contractValue: totalAmount,
    paymentTerms: row.payment_terms,
    sdrId: row.sdr_id,
    sdrName: row.sdr_name || '',
    sdrEmail: row.sdr_email,
    closerId: row.closer_id,
    closerName: row.closer_name || '',
    closerEmail: row.closer_email,
    approvalStatus: row.approval_status || 'pending_approval',
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name,
    approvedByRole: row.approved_by_role,
    approvedAt: row.approved_at,
    rejectionReason: row.rejection_reason,
    targetPosSaleFunnelIds: row.target_pos_sale_funnel_ids || [],
    debutanteId: row.debutante_id,
    debutanteSlug: row.debutante_slug,
    handoverNotes: row.handover_notes,
    contractFileUrl: row.contract_file_url,
    paymentFileUrl: row.payment_file_url,
    attachments: row.attachments || [],
    notes: row.notes,
    contact: row.contact ? {
      id: row.contact.id,
      masterId: row.contact.master_id,
      code: row.contact.code,
      name: row.contact.name,
      nickname: row.contact.nickname,
      primaryPhone: row.contact.primary_phone,
      secondaryPhone: row.contact.secondary_phone,
      email: row.contact.email,
      cpf: row.contact.cpf,
      rg: row.contact.rg,
      birthDate: row.contact.birth_date,
      profilePictureUrl: row.contact.profile_picture_url,
      postalCode: row.contact.postal_code,
      street: row.contact.street,
      number: row.contact.number,
      complement: row.contact.complement,
      neighborhood: row.contact.neighborhood,
      city: row.contact.city,
      state: row.contact.state,
      relationshipRole: row.contact.relationship_role,
      notes: row.contact.notes,
      customFields: row.contact.custom_fields || {},
      createdAt: row.contact.created_at,
      updatedAt: row.contact.updated_at,
    } : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
