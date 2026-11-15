import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid } from '../utils/uuid';
import { generateBase36Code } from './contactService';
import type { Contract, ContractApprovalStatus, Lead } from '../types/admin';

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
          contact:contacts(*)
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
          `contract_code.ilike.%${term}%,event_title.ilike.%${term}%,sdr_name.ilike.%${term}%,closer_name.ilike.%${term}%`
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
          contact:contacts(*)
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
      eventDate?: string;
      eventTime?: string;
      guestCount?: number;
      packageName?: string;
    };
    financialData: {
      totalAmount: number;
      paymentTerms?: Record<string, any> | string;
    };
    closerUser: { id?: string; name: string; email?: string };
    sdrUser?: { id?: string; name: string; email?: string };
    targetPosSaleFunnelIds?: string[];
    handoverNotes?: string;
    contractFileUrl?: string;
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

      const payload: Record<string, any> = {
        master_id: params.masterId,
        contract_code: contractCode,
        contact_id: params.contactId,
        origin_lead_id: params.lead.id,
        origin_funnel_id: params.lead.funnelId || null,
        venue_id: params.lead.venueId, // REGRA SUPREMA: UNIDADE ÚNICA
        event_type: params.eventData.eventType || params.lead.eventType || '15_anos',
        event_title: params.eventData.eventTitle.trim(),
        event_date: params.eventData.eventDate || null,
        event_time: params.eventData.eventTime || null,
        guest_count: params.eventData.guestCount || params.lead.estimatedGuests || 0,
        package_name: params.eventData.packageName || params.lead.packageSold || null,
        client_snapshot: clientSnapshot,
        commercial_fields_snapshot: commercialFieldsSnapshot,
        total_amount: params.financialData.totalAmount || params.lead.dealValue || 0,
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
        notes: params.lead.notes || '',
      };

      const { data, error } = await supabase
        .from('contracts')
        .insert(payload)
        .select(`
          *,
          contact:contacts(*)
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
          .in('id', params.targetPosSaleFunnelIds);

        // Filtra estritamente os funis da mesma unidade
        validFunnelIds = (funnels || [])
          .filter(f => f.venue_id === contractVenueId)
          .map(f => f.id);
      }

      // 4. Atualiza o status do contrato para 'approved' com snapshot do aprovador
      const { data: updated, error: errUpdate } = await supabase
        .from('contracts')
        .update({
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
          contact:contacts(*)
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

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  /**
   * Atualiza a etapa de um contrato dentro de um funil pós-venda específico
   */
  async updatePlacementStage(
    placementId: string,
    newStageId: string,
    masterId: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !placementId || !masterId) return false;

    try {
      const { error } = await supabase
        .from('contract_funnel_placements')
        .update({
          stage_id: newStageId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', placementId)
        .eq('master_id', masterId);

      return !error;
    } catch (err) {
      console.error('Erro ao atualizar etapa da colocação do contrato:', err);
      return false;
    }
  },
};

function mapRowToContract(row: any): Contract {
  return {
    id: row.id,
    masterId: row.master_id,
    contractCode: row.contract_code,
    contactId: row.contact_id,
    originLeadId: row.origin_lead_id,
    originFunnelId: row.origin_funnel_id,
    venueId: row.venue_id,
    eventType: row.event_type || '15_anos',
    eventTitle: row.event_title,
    eventDate: row.event_date,
    eventTime: row.event_time,
    guestCount: row.guest_count,
    packageName: row.package_name,
    clientSnapshot: row.client_snapshot || {},
    commercialFieldsSnapshot: row.commercial_fields_snapshot || {},
    totalAmount: Number(row.total_amount || 0),
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
