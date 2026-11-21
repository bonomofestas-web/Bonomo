import { financeService } from './financeService';
import { describePlan, parsePlan, planSignalEntry } from '../utils/paymentPlan';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid, generateUuid } from '../utils/uuid';
import { generateBase36Code, buildContactSearchFilter, contactService, reciprocalKinship } from './contactService';
import { generateSearchTermVariants } from '../utils/searchUtils';
import { buildContractTitle, generateContractCode } from '../utils/contractTitle';
import { canChangeEventType } from '../utils/accessPermissions';
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

/**
 * Filtro `.or()` da busca de contratos NO BANCO: código, títulos, SDR/Closer, nome do cliente no snapshot
 * e contratos cujo contato (nome/telefone/CPF/e-mail) combine com o termo.
 */
async function buildContractSearchFilter(masterId: string, search?: string): Promise<string | undefined> {
  const raw = (search || '').trim();
  if (!raw) return undefined;
  const term = raw.replace(/[,()"\\%_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!term) return undefined;

  const variants = generateSearchTermVariants(raw);
  const parts: string[] = [];

  for (const v of variants) {
    parts.push(
      `contract_code.ilike.%${v}%`,
      `contract_title.ilike.%${v}%`,
      `title.ilike.%${v}%`,
      `event_title.ilike.%${v}%`,
      `sdr_name.ilike.%${v}%`,
      `closer_name.ilike.%${v}%`,
      `client_snapshot->>name.ilike.%${v}%`,
      `client_snapshot->>payerName.ilike.%${v}%`,
      `client_snapshot->>birthdayPersonName.ilike.%${v}%`,
      `client_snapshot->>email.ilike.%${v}%`,
      `client_snapshot->>payerEmail.ilike.%${v}%`,
    );
  }

  // Busca textual direta no telefone e CPF
  parts.push(
    `client_snapshot->>phone.ilike.%${term}%`,
    `client_snapshot->>payerPhone.ilike.%${term}%`,
    `client_snapshot->>cpf.ilike.%${term}%`,
    `client_snapshot->>payerCpf.ilike.%${term}%`
  );

  // CPF e Telefone por digitos (suporta busca parcial mesmo se o banco tiver mascara com pontos, tracos e espacos)
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 3) {
    parts.push(`client_snapshot->>cpf.ilike.%${digits}%`);
    parts.push(`client_snapshot->>payerCpf.ilike.%${digits}%`);
    parts.push(`client_snapshot->>phone.ilike.%${digits}%`);
    parts.push(`client_snapshot->>payerPhone.ilike.%${digits}%`);

    // Variacao de CPF com pontos (ex: 201.521 ou 201.521.187)
    if (digits.length >= 6) {
      const p1 = digits.slice(0, 3);
      const p2 = digits.slice(3, 6);
      parts.push(`client_snapshot->>cpf.ilike.%${p1}.${p2}%`);
      parts.push(`client_snapshot->>payerCpf.ilike.%${p1}.${p2}%`);
    }
    if (digits.length >= 9) {
      const p1 = digits.slice(0, 3);
      const p2 = digits.slice(3, 6);
      const p3 = digits.slice(6, 9);
      parts.push(`client_snapshot->>cpf.ilike.%${p1}.${p2}.${p3}%`);
      parts.push(`client_snapshot->>payerCpf.ilike.%${p1}.${p2}.${p3}%`);
    }

    // Variacao de Telefone com traco (ex: 98779-4348)
    if (digits.length >= 8) {
      const last8 = digits.slice(-8);
      const t1 = last8.slice(0, 4);
      const t2 = last8.slice(4);
      parts.push(`client_snapshot->>phone.ilike.%${t1}-${t2}%`);
      parts.push(`client_snapshot->>payerPhone.ilike.%${t1}-${t2}%`);
    }
    if (digits.length >= 9) {
      const last9 = digits.slice(-9);
      const t1 = last9.slice(0, 5);
      const t2 = last9.slice(5);
      parts.push(`client_snapshot->>phone.ilike.%${t1}-${t2}%`);
      parts.push(`client_snapshot->>payerPhone.ilike.%${t1}-${t2}%`);
    }
  }
  if (digits.length === 11) {
    parts.push(`client_snapshot->>cpf.ilike.%${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}%`);
    parts.push(`client_snapshot->>payerCpf.ilike.%${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}%`);
  }
  // Ano ou data do evento: 2026, 2027, dd/mm/aaaa, dd/mm ou aaaa-mm-dd
  if (/^20\d{2}$/.test(term)) {
    parts.push(`event_date.ilike.${term}-%`);
  }
  const br = term.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  const brShort = term.match(/^(\d{1,2})[\/.-](\d{1,2})$/);
  const iso = term.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (br) {
    parts.push(`event_date.eq.${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`);
  } else if (brShort) {
    parts.push(`event_date.ilike.%-${brShort[2].padStart(2, '0')}-${brShort[1].padStart(2, '0')}%`);
  } else if (iso) {
    parts.push(`event_date.eq.${term}`);
  }

  // Contratos do(s) contato(s) encontrado(s) por nome, telefone (com/sem máscara), CPF ou e-mail
  const contactFilter = buildContactSearchFilter(raw);
  if (contactFilter) {
    const { data: matched } = await supabase
      .from('contacts')
      .select('id')
      .eq('master_id', masterId)
      .or(contactFilter)
      .limit(300);
    const ids = (matched || []).map(r => r.id).filter(Boolean);
    if (ids.length > 0) parts.push(`contact_id.in.(${ids.join(',')})`);
  }
  return parts.join(',');
}

/** Grava o status automatico de fechamento no lead de origem (aparece no card, dentro do Ganho). */
export async function setLeadClosingStatus(masterId: string, leadId: string | null | undefined, status: 'em_fechamento' | 'financeiro' | 'ganho'): Promise<void> {
  if (!isSupabaseConfigured || !masterId || !leadId || !isUuid(leadId)) return;
  try {
    const { data: ld } = await supabase.from('leads').select('custom_field_values').eq('id', leadId).eq('master_id', masterId).maybeSingle();
    if (!ld) return;
    const cfv = { ...(ld.custom_field_values || {}), closingStatus: status } as Record<string, any>;
    await supabase.from('leads').update({ custom_field_values: cfv }).eq('id', leadId).eq('master_id', masterId);
  } catch (e) {
    console.warn('[setLeadClosingStatus]', e);
  }
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

      // Busca no banco (código, título do evento, nome/telefone/CPF do cliente, SDR e Closer)
      const searchFilter = await buildContractSearchFilter(masterId, search);
      if (searchFilter) query = query.or(searchFilter);

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
   * Total REAL de contratos no banco (mesmos filtros do getContracts, sem paginação).
   * É este número que as abas e a lista mostram — nunca o tamanho da página carregada.
   */
  async countContracts({
    masterId,
    venueIds,
    approvalStatus = 'all',
    search,
  }: Omit<GetContractsParams, 'limit' | 'offset'>): Promise<number> {
    if (!isSupabaseConfigured || !masterId) return 0;

    try {
      let query = supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('master_id', masterId);

      if (approvalStatus !== 'all') query = query.eq('approval_status', approvalStatus);
      if (venueIds && venueIds.length > 0) query = query.in('venue_id', venueIds);

      const searchFilter = await buildContractSearchFilter(masterId, search);
      if (searchFilter) query = query.or(searchFilter);

      const { count, error } = await query;
      if (error) {
        console.error('Erro ao contar contratos:', error);
        return 0;
      }
      return count ?? 0;
    } catch (err) {
      console.error('Exceção em contractService.countContracts:', err);
      return 0;
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
    /** Data de fechamento da venda (YYYY-MM-DD); sem ela vale o dia da criacao */
    closedAt?: string;
    guestCount?: number;
    packageName?: string;
    clientSnapshot?: Record<string, any>;
    commercialFieldsSnapshot?: Record<string, any>;
    totalAmount?: number;
    dealValue?: number;
    signalAmount?: number;
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
        // Única porta de entrada: acha o contato (telefone/CPF) ou cria, sem duplicar
        try {
          const { contact: ensured } = await contactService.findOrCreateContact({
            masterId: params.masterId,
            name: (params.clientSnapshot?.payerName || params.clientSnapshot?.name || 'Contratante').trim(),
            primaryPhone: params.clientSnapshot?.phone || 'Não informado',
            email: params.clientSnapshot?.email || undefined,
            cpf: params.clientSnapshot?.cpf || undefined,
            address: params.clientSnapshot?.address || undefined,
            neighborhood: params.clientSnapshot?.neighborhood || undefined,
            city: params.clientSnapshot?.city || undefined,
            relationshipRole: params.clientSnapshot?.payerRelationship || 'Titular',
          } as any);
          effectiveContactId = ensured.id;
        } catch (contactErr) {
          console.warn('[contractService.createContract] Aviso ao localizar/criar contato:', contactErr);
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

      let venueName: string | null = null;
      if (params.venueId) {
        const { data: v } = await supabase.from('venues').select('name').eq('id', params.venueId).maybeSingle();
        venueName = v?.name || null;
      }
      const contractCode = params.contractCode || generateContractCode(venueName, params.eventDate);
      // Nome do contrato = padrao unico `Contratante • Protagonista + tipo` (nao e texto livre)
      const snap: any = params.clientSnapshot || {};
      const standardTitle = buildContractTitle({
        contractors: [snap.payerName || snap.name],
        protagonists: snap.birthdayPersonName ? [snap.birthdayPersonName] : [],
        eventType: params.eventType,
        age: snap.birthdayPersonAge,
        contractorIsProtagonist: snap.payerRelationship === 'self',
        contractCode,
      });
      const hasStandardData = Boolean(snap.payerName || snap.name || snap.birthdayPersonName);
      const computedTitle = (hasStandardData ? standardTitle : (params.contractTitle || params.title || params.eventTitle || standardTitle)).trim();

      const totalAmount = Number(params.totalAmount ?? params.dealValue ?? 0);
      const entryAmount = Number(params.entryAmount ?? 0);
      const signalAmount = Number(params.signalAmount ?? 0);
      const balanceAmount = Number(params.balanceAmount ?? Math.max(0, totalAmount - entryAmount - signalAmount));

      // Origem do contrato = origem do lead que o gerou (mesmo Master)
      let originSourceId: string | null = null;
      const originLeadForSource = params.originLeadId || params.leadId;
      if (originLeadForSource && isUuid(originLeadForSource)) {
        const { data: originLeadRow } = await supabase
          .from('leads')
          .select('source_id')
          .eq('id', originLeadForSource)
          .eq('master_id', params.masterId)
          .maybeSingle();
        originSourceId = (originLeadRow?.source_id as string | null) || null;
      }

      const payload: Record<string, any> = {
        master_id: params.masterId,
        contract_code: contractCode,
        client_id: params.clientId && isUuid(params.clientId) ? params.clientId : null,
        contact_id: effectiveContactId,
        ...(originSourceId ? { source_id: originSourceId } : {}),
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
        closed_at: params.closedAt || new Date().toLocaleDateString('en-CA'),
        guest_count: params.guestCount || 0,
        package_name: params.packageName || null,
        client_snapshot: params.clientSnapshot || {},
        commercial_fields_snapshot: params.commercialFieldsSnapshot || {},
        total_amount: totalAmount,
        signal_amount: signalAmount,
        entry_amount: entryAmount,
        balance_amount: balanceAmount,
        payment_summary: (typeof params.paymentTerms === 'object' ? describePlan(parsePlan(params.paymentTerms), totalAmount) : '') || null,
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
          void setLeadClosingStatus(params.masterId, originLead, 'em_fechamento');
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

      void setLeadClosingStatus(params.masterId, payload.origin_lead_id as string | null, 'em_fechamento');
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
      let venueName: string | null = null;
      const vId = params.lead.venueId || (params.lead as any).venue_id;
      if (vId) {
        const { data: v } = await supabase.from('venues').select('name').eq('id', vId).maybeSingle();
        venueName = v?.name || null;
      }
      const contractCode = generateContractCode(venueName, params.eventData.eventDate);

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

      const standardTitleFromLead = buildContractTitle({
        contractors: [params.lead.name],
        protagonists: params.lead.debutanteName ? [params.lead.debutanteName] : [],
        eventType: params.eventData.eventType || params.lead.eventType,
        contractCode,
      });

      const payload: Record<string, any> = {
        master_id: params.masterId,
        contract_code: contractCode,
        contact_id: params.contactId,
        origin_lead_id: params.lead.id,
        lead_id: params.lead.id,
        origin_funnel_id: params.lead.funnelId || null,
        ...(params.lead.sourceId ? { source_id: params.lead.sourceId } : {}),
        venue_id: params.lead.venueId, // REGRA SUPREMA: UNIDADE ÚNICA
        client_id: params.clientId && isUuid(params.clientId) ? params.clientId : null,
        event_type: params.eventData.eventType || params.lead.eventType || '15_anos',
        event_title: params.eventData.eventTitle.trim(),
        contract_title: standardTitleFromLead,
        title: standardTitleFromLead,
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
   * ÚNICA função que cria o card de cliente (pós-venda) a partir de um contrato. Idempotente:
   * se o contrato já tem card, devolve o id existente. O card guarda só o operacional; título, tipo, data,
   * valores e pacote nascem copiados do contrato (o contrato segue sendo a base jurídica, imutável).
   */
  async createClientFromContract(params: {
    contractId: string;
    masterId: string;
    funnelId?: string | null;
  }): Promise<string | null> {
    if (!isSupabaseConfigured || !isUuid(params.contractId) || !params.masterId) return null;
    try {
      const { data: c } = await supabase
        .from('contracts').select('*, contact:contacts(name, primary_phone, email, cpf)')
        .eq('id', params.contractId).eq('master_id', params.masterId).maybeSingle();
      if (!c) return null;
      if (c.client_id) {
        const { data: ex } = await supabase.from('clients').select('id').eq('id', c.client_id).eq('master_id', params.masterId).maybeSingle();
        if (ex?.id) return ex.id as string;
      }

      let funnelId: string | null = params.funnelId && isUuid(params.funnelId) ? params.funnelId : null;
      if (!funnelId && Array.isArray(c.target_pos_sale_funnel_ids) && c.target_pos_sale_funnel_ids.length > 0) funnelId = c.target_pos_sale_funnel_ids[0];
      // Contrato sem funil de pos-venda definido (ex.: subido manualmente): entra no funil de pos-venda da unidade
      if (!funnelId) {
        const { data: psf } = await supabase.from('commercial_funnels').select('id')
          .eq('master_id', params.masterId).eq('venue_id', c.venue_id).eq('is_post_sale', true)
          .order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (psf?.id) funnelId = psf.id as string;
      }
      let stage = 'onboarding';
      if (funnelId) {
        const { data: f } = await supabase.from('commercial_funnels').select('stages, is_entry_stage_active, enable_inbox_stage').eq('id', funnelId).eq('master_id', params.masterId).maybeSingle();
        const isEntryActive = Boolean(f?.is_entry_stage_active || f?.enable_inbox_stage);
        if (Array.isArray(f?.stages) && f!.stages.length > 0) {
          if (isEntryActive) {
            stage = f!.stages[0].id || stage;
          } else {
            const nonEntry = f!.stages.find((st: any) => st.id !== 'new_lead' && st.id !== 'entry');
            stage = nonEntry?.id || f!.stages[0].id || stage;
          }
        }
      }

      const snap = (c.client_snapshot || {}) as Record<string, any>;
      const { data: venue } = await supabase.from('venues').select('name').eq('id', c.venue_id).maybeSingle();
      const clientId = generateUuid();
      const { error } = await supabase.from('clients').insert({
        id: clientId,
        master_id: params.masterId,
        code: generateBase36Code('CLI', 8),
        name: snap.birthdayPersonName || c.contract_title || 'Cliente',
        contract_title: c.contract_title,
        payer_name: snap.payerName || c.contact?.name || snap.name || null,
        payer_phone: snap.phone || c.contact?.primary_phone || null,
        payer_email: snap.email || c.contact?.email || null,
        payer_cpf: snap.cpf || c.contact?.cpf || null,
        birthday_person_name: snap.birthdayPersonName || null,
        event_type: c.event_type,
        event_date: c.event_date || null,
        event_time: c.event_time || null,
        guest_count: c.guest_count || 0,
        venue_id: c.venue_id,
        venue_name: venue?.name || null,
        package_sold: c.package_name || null,
        deal_value: Number(c.total_amount || 0),
        funnel_id: funnelId,
        stage,
        commercial_lead_id: c.origin_lead_id || null,
        migrated_to_contract_id: params.contractId,
      });
      if (error) { console.warn('[createClientFromContract] erro ao criar card:', error.message); return null; }

      const { error: linkErr } = await supabase
        .from('contracts').update({ client_id: clientId, target_pos_sale_funnel_ids: funnelId ? [funnelId] : [] }).eq('id', params.contractId).eq('master_id', params.masterId);
      if (linkErr) {
        // Outro processo ligou um card primeiro (indice unico): descarta o nosso e usa o existente
        await supabase.from('clients').delete().eq('id', clientId).eq('master_id', params.masterId);
        const { data: again } = await supabase.from('contracts').select('client_id').eq('id', params.contractId).eq('master_id', params.masterId).maybeSingle();
        return (again?.client_id as string | null) || null;
      }

      if (funnelId) {
        await supabase.from('contract_funnel_placements').upsert({
          master_id: params.masterId,
          contract_id: params.contractId,
          funnel_id: funnelId,
          stage_id: stage,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'contract_id,funnel_id' });
      }

      return clientId;
    } catch (err) {
      console.warn('[createClientFromContract] excecao:', err);
      return null;
    }
  },

  /**
   * Altera um campo OPERACIONAL do card de cliente e registra o historico (quem, quando, antes -> depois).
   * - Convidados e data do evento: qualquer perfil do pos-venda.
   * - Tipo do evento: SO gerencia (verificado aqui, nao so na tela), motivo obrigatorio; regera o titulo do contrato.
   *   O snapshot juridico do contrato nao e reescrito.
   */
  /**
   * Campos CONECTADOS ao contrato: ao salvar a ficha de um card de pos-venda, os campos compartilhados sao gravados em
   * todos os cards do mesmo contrato (clients.contract_id), no contato, na agenda e no titulo do contrato.
   * So o historico (atividades) continua separado por setor. O snapshot juridico do contrato NAO muda.
   * Devolve os ids dos cards irmaos atualizados (para o estado local refletir a mudanca).
   */
  async syncLinkedCardFields(params: { masterId: string; clientId: string; updates: Record<string, any> }): Promise<{ siblingIds: string[]; patch: Record<string, any> }> {
    const none = { siblingIds: [] as string[], patch: {} as Record<string, any> };
    if (!isSupabaseConfigured || !params.masterId || !isUuid(params.clientId)) return none;
    const MAP: Record<string, string> = {
      birthdayPersonName: 'birthday_person_name', payerName: 'payer_name', payerPhone: 'payer_phone', payerEmail: 'payer_email',
      payerCpf: 'payer_cpf', payerAddress: 'payer_address', eventDate: 'event_date', eventTime: 'event_time', guestCount: 'guest_count',
      eventType: 'event_type', packageSold: 'package_sold', contractTitle: 'contract_title',
    };
    const patch: Record<string, any> = {};
    for (const [k, col] of Object.entries(MAP)) {
      if (params.updates[k] !== undefined) patch[col] = params.updates[k] === '' && (col === 'event_date' || col === 'event_time') ? null : params.updates[k];
    }
    if (Object.keys(patch).length === 0) return none;
    try {
      const { data: me } = await supabase.from('clients').select('id, contract_id').eq('id', params.clientId).eq('master_id', params.masterId).maybeSingle();
      if (!me) return none;
      let contractId = (me.contract_id as string | null) || null;
      if (!contractId) {
        const { data: ct } = await supabase.from('contracts').select('id').eq('client_id', params.clientId).eq('master_id', params.masterId).maybeSingle();
        contractId = (ct?.id as string | undefined) || null;
        if (contractId) await supabase.from('clients').update({ contract_id: contractId }).eq('id', params.clientId).eq('master_id', params.masterId);
      }
      if (!contractId) return none; // card sem contrato (ex.: legado): nada a conectar

      // 1. cards irmaos (todos os setores do mesmo contrato)
      const { data: sibs } = await supabase.from('clients').select('id').eq('master_id', params.masterId).eq('contract_id', contractId).neq('id', params.clientId);
      const siblingIds = (sibs || []).map((r: any) => r.id as string);
      const clientPatch: Record<string, any> = { ...patch };
      if (patch.birthday_person_name) clientPatch.name = patch.birthday_person_name;
      if (siblingIds.length > 0) {
        const { error } = await supabase.from('clients').update({ ...clientPatch, updated_at: new Date().toISOString() }).in('id', siblingIds).eq('master_id', params.masterId);
        if (error) console.warn('[syncLinkedCardFields] cards irmaos:', error.message);
      }

      // 2. contrato (campos operacionais; o snapshot juridico nao muda) e titulo
      const { data: base } = await supabase.from('clients').select('payer_name, birthday_person_name, event_type, contract_title').eq('id', params.clientId).maybeSingle();
      const cPatch: Record<string, any> = {};
      if (patch.event_date !== undefined) cPatch.event_date = patch.event_date;
      if (patch.event_time !== undefined) cPatch.event_time = patch.event_time;
      if (patch.guest_count !== undefined) cPatch.guest_count = patch.guest_count;
      if (patch.event_type !== undefined) cPatch.event_type = patch.event_type;
      if (patch.package_sold !== undefined) cPatch.package_name = patch.package_sold;
      if (patch.contract_title !== undefined) { cPatch.contract_title = patch.contract_title; cPatch.title = patch.contract_title; cPatch.event_title = patch.contract_title; }
      else if (patch.payer_name !== undefined || patch.birthday_person_name !== undefined) {
        const { data: cr } = await supabase.from('contracts').select('contract_code').eq('id', contractId).maybeSingle();
        const title = buildContractTitle({
          contractors: [base?.payer_name || ''].filter(Boolean),
          protagonists: base?.birthday_person_name ? [base.birthday_person_name] : [],
          eventType: base?.event_type || undefined,
          contractCode: cr?.contract_code || '',
        });
        if (title) {
          cPatch.contract_title = title; cPatch.title = title; cPatch.event_title = title;
          await supabase.from('clients').update({ contract_title: title }).eq('contract_id', contractId).eq('master_id', params.masterId);
          patch.contract_title = title;
        }
      }
      if (Object.keys(cPatch).length > 0) {
        await supabase.from('contracts').update({ ...cPatch, updated_at: new Date().toISOString() }).eq('id', contractId).eq('master_id', params.masterId);
      }

      // 3. contato: nome e e-mail (o telefone e a chave do contato e nao e alterado por aqui)
      if (patch.payer_name !== undefined || patch.payer_email !== undefined) {
        const { data: cr } = await supabase.from('contracts').select('contact_id').eq('id', contractId).maybeSingle();
        const contactPatch: Record<string, any> = {};
        if (patch.payer_name) contactPatch.name = patch.payer_name;
        if (patch.payer_email) contactPatch.email = patch.payer_email;
        if (cr?.contact_id && Object.keys(contactPatch).length > 0) {
          await supabase.from('contacts').update({ ...contactPatch, updated_at: new Date().toISOString() }).eq('id', cr.contact_id).eq('master_id', params.masterId);
        }
      }

      // 4. agenda: o evento do contrato acompanha data, convidados e nome
      const allIds = [params.clientId, ...siblingIds];
      const evPatch: Record<string, any> = {};
      if (patch.event_date) evPatch.event_date = patch.event_date;
      if (patch.guest_count !== undefined) evPatch.guest_count = patch.guest_count;
      if (patch.event_time !== undefined) {
        // "20:00 às 02:00" vira inicio/fim; vazio ou ilegivel = evento de dia inteiro
        const tm = String(patch.event_time || '').match(/(\d{1,2})\s*(?:[:h]\s*(\d{2}))?\s*(?:as|às|-|a)\s*(\d{1,2})\s*(?:[:h]\s*(\d{2}))?/i);
        const hhmm = (h: string, m?: string) => `${h.padStart(2, '0')}:${m || '00'}`;
        evPatch.start_time = tm ? hhmm(tm[1], tm[2]) : null;
        evPatch.end_time = tm ? hhmm(tm[3], tm[4]) : null;
      }
      if (patch.contract_title) evPatch.title = patch.contract_title;
      if (patch.payer_name) evPatch.client_name = patch.payer_name;
      if (Object.keys(evPatch).length > 0) {
        await supabase.from('venue_events').update({ ...evPatch, updated_at: new Date().toISOString() }).in('client_id', allIds).eq('master_id', params.masterId);
      }
      return { siblingIds, patch };
    } catch (err) {
      console.warn('[syncLinkedCardFields] falha:', err);
      return none;
    }
  },

  async updateCardField(params: {
    clientId: string;
    masterId: string;
    field: 'guest_count' | 'event_date' | 'event_type';
    value: string | number;
    reason?: string;
    author: { id?: string; name: string; role?: string } & Record<string, any>;
  }): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured || !isUuid(params.clientId) || !params.masterId) return { success: false, message: 'Parâmetros inválidos.' };
    const { field, value, author } = params;
    if (field === 'event_type') {
      if (!canChangeEventType(author as any)) return { success: false, message: 'Só a gerência pode alterar o tipo do evento.' };
      if (!(params.reason || '').trim() || (params.reason || '').trim().length < 3) return { success: false, message: 'Informe o motivo da mudança do tipo do evento.' };
    }
    try {
      const { data: client } = await supabase.from('clients').select('id, guest_count, event_date, event_type, contract_title').eq('id', params.clientId).eq('master_id', params.masterId).maybeSingle();
      if (!client) return { success: false, message: 'Cliente não encontrado.' };
      const { data: contract } = await supabase.from('contracts').select('id, contract_code, event_type, client_snapshot').eq('client_id', params.clientId).eq('master_id', params.masterId).maybeSingle();

      const newValue = field === 'guest_count' ? Math.max(0, Number(value) || 0) : String(value || '');
      const oldValue = (client as any)[field];
      if (String(oldValue ?? '') === String(newValue)) return { success: true };

      const clientUpdate: Record<string, any> = { [field]: field === 'event_date' && !newValue ? null : newValue, updated_at: new Date().toISOString() };
      const changes: Array<{ field: string; old: string; neu: string }> = [{ field, old: String(oldValue ?? ''), neu: String(newValue) }];

      if (field === 'event_type' && contract) {
        const snap: any = contract.client_snapshot || {};
        const title = buildContractTitle({
          contractors: [snap.payerName || snap.name],
          protagonists: snap.birthdayPersonName ? [snap.birthdayPersonName] : [],
          eventType: String(newValue),
          age: snap.birthdayPersonAge,
          contractorIsProtagonist: snap.payerRelationship === 'self',
          contractCode: contract.contract_code,
        });
        clientUpdate.contract_title = title;
        changes.push({ field: 'contract_title', old: String(client.contract_title ?? ''), neu: title });
        const { error: ce } = await supabase.from('contracts')
          .update({ event_type: newValue, contract_title: title, title, event_title: title, updated_at: new Date().toISOString() })
          .eq('id', contract.id).eq('master_id', params.masterId);
        if (ce) return { success: false, message: ce.message };
      }

      const { error } = await supabase.from('clients').update(clientUpdate).eq('id', params.clientId).eq('master_id', params.masterId);
      if (error) return { success: false, message: error.message };

      await supabase.from('contract_card_changes').insert(changes.map(ch => ({
        master_id: params.masterId,
        contract_id: contract?.id || null,
        client_id: params.clientId,
        field: ch.field,
        old_value: ch.old,
        new_value: ch.neu,
        reason: params.reason?.trim() || null,
        author_id: author.id && isUuid(author.id) ? author.id : null,
        author_name: author.name,
        author_role: author.role || null,
      })));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erro ao alterar o card.' };
    }
  },

  /**
   * Vincula um lead SOLTO (sem contrato) ao contratante de um contrato. Idempotente, nesta ordem:
   * (1) contato do lead solto (findOrCreateContact, dentro de linkFamilyMember) -> (2) dependente nos dois sentidos
   * na Central de Contatos -> (3) numero entra como participante do card. Devolve o lead de conversa do card
   * (se houver) para o chamador unificar as mensagens (mergeLeads) e tirar o lead solto do funil.
   */
  async linkLooseLeadToContract(params: {
    masterId: string;
    looseLead: { id: string; name: string; phone: string };
    contractId: string;
    kinship: string;
    disassociateFromContractor?: boolean;
  }): Promise<{ success: boolean; message?: string; clientId?: string; conversationLeadId?: string | null }> {
    if (!isSupabaseConfigured || !params.masterId || !isUuid(params.contractId)) return { success: false, message: 'Parâmetros inválidos.' };
    try {
      const { data: c } = await supabase.from('contracts')
        .select('id, contact_id, client_id, venue_id, client_name, client_phone, client_document, client_email').eq('id', params.contractId).eq('master_id', params.masterId).maybeSingle();
      if (!c) return { success: false, message: 'Contrato não encontrado.' };

      // Garante que o contato do contratante existe na tabela contacts (auto-cura de integridade referencial)
      let parentContactId = c.contact_id;
      let parentExists = false;
      if (parentContactId && isUuid(parentContactId)) {
        const { data: ctCheck } = await supabase.from('contacts').select('id').eq('id', parentContactId).maybeSingle();
        if (ctCheck?.id) parentExists = true;
      }

      if (!parentExists) {
        const parentName = (c as any).client_name || params.looseLead.name;
        const parentPhone = (c as any).client_phone || params.looseLead.phone;
        const parentRes = await contactService.findOrCreateContact({
          masterId: params.masterId,
          name: parentName,
          primaryPhone: parentPhone,
          cpf: (c as any).client_document || undefined,
          email: (c as any).client_email || undefined,
          venueId: c.venue_id,
        });
        if (parentRes.contact?.id) {
          parentContactId = parentRes.contact.id;
          await supabase.from('contracts').update({ contact_id: parentContactId }).eq('id', c.id);
        } else {
          return { success: false, message: 'Contrato sem contratante válido na Central de Contatos.' };
        }
      }

      let isSelf = false;

      // Caso o usuário confirme a desassociação do WhatsApp do contratante titular:
      if (params.disassociateFromContractor) {
        const { data: contractorContact } = await supabase.from('contacts')
          .select('id, name, notes, primary_phone')
          .eq('id', parentContactId)
          .eq('master_id', params.masterId)
          .maybeSingle();

        if (contractorContact) {
          const oldPhone = contractorContact.primary_phone || params.looseLead.phone;
          const transferNote = `[WhatsApp ${oldPhone} desassociado e transferido para ${params.kinship} (${params.looseLead.name}) em ${new Date().toLocaleDateString('pt-BR')}]`;
          const updatedNotes = contractorContact.notes
            ? `${contractorContact.notes}\n${transferNote}`
            : transferNote;

          await supabase.from('contacts').update({
            primary_phone: null,
            primary_phone_digits: '',
            primary_phone_key: '',
            notes: updatedNotes,
            updated_at: new Date().toISOString()
          }).eq('id', contractorContact.id).eq('master_id', params.masterId);
        }

        // Cria ou atualiza o contato individual da Mãe/Familiar com este WhatsApp
        const resMember = await contactService.findOrCreateContact({
          masterId: params.masterId,
          name: params.looseLead.name.trim(),
          primaryPhone: params.looseLead.phone,
          relationshipRole: params.kinship,
          venueId: c.venue_id,
        });

        if (resMember.contact && resMember.contact.id !== parentContactId) {
          // Cria o parentesco mútuo formal na Central de Contatos
          await supabase.from('contact_dependents').upsert([
            { master_id: params.masterId, parent_contact_id: parentContactId, dependent_contact_id: resMember.contact.id, kinship: params.kinship.trim() },
            { master_id: params.masterId, parent_contact_id: resMember.contact.id, dependent_contact_id: parentContactId, kinship: reciprocalKinship(params.kinship) },
          ], { onConflict: 'parent_contact_id,dependent_contact_id', ignoreDuplicates: true });
        }
      } else {
        // Fluxo padrão sem desassociação forçada:
        const leadDigits = (params.looseLead.phone || '').replace(/\D/g, '');
        const kLower = (params.kinship || '').toLowerCase();
        if (kLower.includes('titular') || kLower.includes('contratante')) {
          isSelf = true;
        }

        if (!isSelf && leadDigits.length >= 8) {
          const { data: parentCt } = await supabase.from('contacts').select('id, primary_phone_digits, secondary_phone_digits')
            .eq('id', parentContactId).maybeSingle();
          if (parentCt) {
            const p1 = parentCt.primary_phone_digits || '';
            const p2 = parentCt.secondary_phone_digits || '';
            const last8 = leadDigits.slice(-8);
            if ((p1 && (p1.includes(last8) || last8.includes(p1))) ||
                (p2 && (p2.includes(last8) || last8.includes(p2)))) {
              isSelf = true;
            }
          }
        }

        if (!isSelf) {
          const linked = await contactService.linkFamilyMember({
            masterId: params.masterId,
            parentContactId: parentContactId,
            name: params.looseLead.name,
            phone: params.looseLead.phone,
            kinship: params.kinship,
            venueId: c.venue_id,
          });
          if (!linked) return { success: false, message: 'Não foi possível vincular o contato.' };
        }
      }

      let clientId = (c.client_id as string | null) || null;
      if (!clientId) clientId = await this.createClientFromContract({ contractId: c.id, masterId: params.masterId });
      let conversationLeadId: string | null = null;
      if (clientId) {
        const { data: cl } = await supabase.from('clients').select('contacts, commercial_lead_id, stage, funnel_id').eq('id', clientId).eq('master_id', params.masterId).maybeSingle();
        const digits = (params.looseLead.phone || '').replace(/\D/g, '');
        const list: any[] = Array.isArray(cl?.contacts) ? [...(cl!.contacts as any[])] : [];
        if (digits && !list.some(x => (x?.phone || '').replace(/\D/g, '') === digits)) {
          list.push({
            id: generateUuid(),
            name: params.looseLead.name,
            phone: params.looseLead.phone,
            role: isSelf ? 'titular' : params.kinship.toLowerCase(),
            isPrimaryDecisionMaker: isSelf
          });
        }
        conversationLeadId = (cl?.commercial_lead_id as string | null) || null;
        // Mesma pessoa com outro contrato: o card compartilha a conversa que ja existe (um numero = uma conversa)
        if (!conversationLeadId) {
          const { data: siblings } = await supabase.from('contracts')
            .select('client_id').eq('master_id', params.masterId).eq('contact_id', c.contact_id).neq('id', c.id).not('client_id', 'is', null);
          const siblingIds = (siblings || []).map((x: any) => x.client_id).filter(Boolean);
          if (siblingIds.length > 0) {
            const { data: sib } = await supabase.from('clients').select('commercial_lead_id')
              .eq('master_id', params.masterId).in('id', siblingIds).not('commercial_lead_id', 'is', null).limit(1);
            conversationLeadId = (sib?.[0]?.commercial_lead_id as string | null) || null;
          }
        }
        const upd: Record<string, any> = { contacts: list, updated_at: new Date().toISOString() };
        // REGRA SUPREMA: NUNCA alterar etapa nem resetar card ao vincular contrato
        // Card sem lead de conversa: o proprio lead solto passa a ser a conversa do card (e deixa de aparecer como solto)
        if (!conversationLeadId) upd.commercial_lead_id = params.looseLead.id;
        else if (!cl?.commercial_lead_id) upd.commercial_lead_id = conversationLeadId;
        await supabase.from('clients').update(upd).eq('id', clientId).eq('master_id', params.masterId);

        // Busca o estado atual do lead para preservar estritamente funil e etapa existentes
        const { data: curLead } = await supabase
          .from('leads')
          .select('stage, funnel_id')
          .eq('id', params.looseLead.id)
          .eq('master_id', params.masterId)
          .maybeSingle();

        const preservedStage = curLead?.stage || cl?.stage || 'onboarding';
        const preservedFunnelId = curLead?.funnel_id || cl?.funnel_id;

        // Atualiza o lead solto para apontar para o contato titular, virar is_client e ter o papel de parentesco
        // PRESERVANDO RIGOROSAMENTE A MESMA ETAPA E O MESMO FUNIL DO CARD
        await supabase.from('leads').update({
          contract_id: c.id,
          contact_id: c.contact_id,
          is_client: true,
          primary_contact_role: params.kinship,
          stage: preservedStage,
          funnel_id: preservedFunnelId || undefined,
          updated_at: new Date().toISOString()
        }).eq('id', params.looseLead.id).eq('master_id', params.masterId);

        // Propagação Multi-Funil Instantânea:
        // Se este mesmo contato já interage em outros funis do Master, vincula o contrato a todos eles!
        const leadDigits = (params.looseLead.phone || '').replace(/\D/g, '');
        if (leadDigits.length >= 8) {
          const last8 = leadDigits.slice(-8);
          await supabase.from('leads').update({
            contract_id: c.id,
            is_client: true,
            primary_contact_role: params.kinship,
            updated_at: new Date().toISOString()
          })
          .eq('master_id', params.masterId)
          .ilike('phone', `%${last8}%`)
          .is('contract_id', null);
        }

        // Garante a colocação no funil em contract_funnel_placements sem alterar a etapa
        if (preservedFunnelId && isUuid(preservedFunnelId)) {
          await supabase.from('contract_funnel_placements').upsert({
            master_id: params.masterId,
            contract_id: c.id,
            funnel_id: preservedFunnelId,
            stage_id: preservedStage,
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'contract_id,funnel_id' });
        }
      }
      return { success: true, clientId: clientId || undefined, conversationLeadId: conversationLeadId && conversationLeadId !== params.looseLead.id ? conversationLeadId : null };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erro ao vincular.' };
    }
  },

  /** Ids dos clientes que ja tem contrato vinculado (so ids): o quadro usa para separar card de contrato de card de pessoa. */
  async getLinkedClientIds(masterId: string): Promise<Set<string>> {
    const out = new Set<string>();
    if (!isSupabaseConfigured || !masterId) return out;
    const { data } = await supabase.from('contracts').select('client_id').eq('master_id', masterId).not('client_id', 'is', null).limit(5000);
    (data || []).forEach((r: any) => { if (r.client_id) out.add(r.client_id); });
    return out;
  },

  /** Contrato (documento do sistema) ligado a um card de cliente, ou null se o cliente ainda nao tem contrato. */
  async getContractByClientId(clientId: string, masterId: string): Promise<Contract | null> {
    if (!isSupabaseConfigured || !isUuid(clientId) || !masterId) return null;
    const { data } = await supabase.from('contracts')
      .select('*, contact:contacts(*), venue:venues(id, name)')
      .eq('client_id', clientId).eq('master_id', masterId).maybeSingle();
    return data ? mapRowToContract(data) : null;
  },

  /**
   * Busca resiliente do contrato vinculado para a ficha de inspeção (Gaveta/Inspector).
   * Tenta sucessivamente:
   * 1. clientId (contracts.client_id = clientId)
   * 2. contactId (contracts.contact_id = contactId)
   * 3. leadId (origin_lead_id / lead_id)
   * 4. telefone do cliente/lead (client_snapshot->>phone ou contacts do telefone)
   * Se achar o contrato e este estiver sem client_id, cria e vincula o card de cliente automaticamente.
   */
  async getContractForFicha(params: {
    clientId?: string | null;
    contactId?: string | null;
    leadId?: string | null;
    phone?: string | null;
    masterId: string;
  }): Promise<Contract | null> {
    if (!isSupabaseConfigured || !params.masterId) return null;
    const { clientId, contactId, leadId, phone, masterId } = params;

    // 1. Busca por clientId
    if (clientId && isUuid(clientId)) {
      const { data } = await supabase.from('contracts')
        .select('*, contact:contacts(*), venue:venues(id, name)')
        .eq('client_id', clientId).eq('master_id', masterId).maybeSingle();
      if (data) return mapRowToContract(data);
    }

    // 2. Busca por contactId
    if (contactId && isUuid(contactId)) {
      const { data } = await supabase.from('contracts')
        .select('*, contact:contacts(*), venue:venues(id, name)')
        .eq('contact_id', contactId).eq('master_id', masterId)
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        const ct = mapRowToContract(data);
        if (!data.client_id) {
          void this.createClientFromContract({ contractId: data.id, masterId });
        }
        return ct;
      }
    }

    // 3. Busca por leadId
    if (leadId && isUuid(leadId)) {
      const { data } = await supabase.from('contracts')
        .select('*, contact:contacts(*), venue:venues(id, name)')
        .eq('master_id', masterId)
        .or(`origin_lead_id.eq.${leadId},lead_id.eq.${leadId}`)
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        const ct = mapRowToContract(data);
        if (!data.client_id) {
          void this.createClientFromContract({ contractId: data.id, masterId });
        }
        return ct;
      }
    }

    // 4. Busca por telefone
    const phoneDigits = String(phone || '').replace(/\D/g, '');
    if (phoneDigits.length >= 8) {
      const last8 = phoneDigits.slice(-8);
      const { data: contacts } = await supabase.from('contacts')
        .select('id').eq('master_id', masterId)
        .or(`primary_phone.ilike.%${last8}%,secondary_phone.ilike.%${last8}%`).limit(10);
      
      const cIds = (contacts || []).map((c: any) => c.id);
      let q = supabase.from('contracts')
        .select('*, contact:contacts(*), venue:venues(id, name)')
        .eq('master_id', masterId);

      if (cIds.length > 0) {
        q = q.or(`client_snapshot->>phone.ilike.%${last8}%,contact_id.in.(${cIds.join(',')})`);
      } else {
        q = q.ilike('client_snapshot->>phone', `%${last8}%`);
      }

      const { data } = await q
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        const ct = mapRowToContract(data);
        if (!data.client_id) {
          void this.createClientFromContract({ contractId: data.id, masterId });
        }
        return ct;
      }
    }

    return null;
  },

  /**
   * Localiza automaticamente se um telefone ou contactId pertence a um contrato existente
   * (seja como titular, contratante ou membro familiar/contato vinculado).
   * Utilizado para herança automática de contrato na chegada de novas mensagens em qualquer funil.
   */
  async findContractByPhoneOrContact(params: {
    phone?: string;
    contactId?: string;
    masterId?: string;
  }): Promise<{ contract: Contract | null; kinship?: string; clientId?: string }> {
    if (!isSupabaseConfigured) return { contract: null };
    const masterId = params.masterId;
    const phoneDigits = String(params.phone || '').replace(/\D/g, '');
    const last8 = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : '';

    if (!last8 && !params.contactId) return { contract: null };

    try {
      // 1. Procura na tabela clients se este telefone consta como titular ou contato familiar
      let clientQuery = supabase.from('clients').select('id, contract_id, payer_phone, contacts, name, payer_relationship');
      if (masterId) clientQuery = clientQuery.eq('master_id', masterId);

      const { data: clientsList } = await clientQuery;
      if (clientsList && clientsList.length > 0) {
        for (const cl of clientsList) {
          if (!cl.contract_id) continue;

          // Verifica se é o titular
          const pDigits = (cl.payer_phone || '').replace(/\D/g, '').slice(-8);
          if (last8 && pDigits === last8) {
            const ct = await this.getContractById(cl.contract_id, masterId || '');
            if (ct) return { contract: ct, kinship: 'titular', clientId: cl.id };
          }

          // Verifica se está nos contatos familiares
          if (Array.isArray(cl.contacts)) {
            const matchCt = cl.contacts.find((c: any) => {
              const cp = (c?.phone || '').replace(/\D/g, '').slice(-8);
              return last8 && cp === last8;
            });
            if (matchCt) {
              const ct = await this.getContractById(cl.contract_id, masterId || '');
              if (ct) return { contract: ct, kinship: matchCt.role || 'familiar', clientId: cl.id };
            }
          }
        }
      }

      // 2. Procura diretamente na tabela contracts pelo titular ou snapshot
      let contractQuery = supabase.from('contracts')
        .select('*, contact:contacts(*), venue:venues(id, name)')
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (masterId) contractQuery = contractQuery.eq('master_id', masterId);

      if (last8) {
        contractQuery = contractQuery.ilike('client_snapshot->>phone', `%${last8}%`);
      } else if (params.contactId) {
        contractQuery = contractQuery.eq('contact_id', params.contactId);
      }

      const { data: directContract } = await contractQuery.limit(1).maybeSingle();
      if (directContract) {
        return { contract: mapRowToContract(directContract), kinship: 'titular', clientId: directContract.client_id };
      }
    } catch (err) {
      console.warn('[findContractByPhoneOrContact] Erro ao buscar contrato:', err);
    }

    return { contract: null };
  },

  /**
   * Contratos aprovados que ainda NAO tem card de cliente (candidatos a vinculo), sempre da UNIDADE do funil.
   * Busca livre: contratante, contrato, aniversariante, CPF, celular e data do evento.
   * `ref` (celular/CPF do cliente) lista primeiro os contratos desse telefone ou CPF, sem digitar nada.
   */
  async searchLinkableContracts(masterId: string, search: string, venueId?: string, ref?: { phones?: Array<string | null | undefined>; cpf?: string | null }): Promise<Contract[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    let q = supabase.from('contracts')
      .select('*, contact:contacts(*), venue:venues(id, name)')
      .eq('master_id', masterId).eq('approval_status', 'approved').is('client_id', null);
    if (venueId && isUuid(venueId)) q = q.eq('venue_id', venueId);

    if (!search.trim() && ref) {
      const parts: string[] = [];
      const phoneKeys = (ref.phones || []).map(p => String(p || '').replace(/\D/g, '').slice(-8)).filter(k => k.length === 8);
      const cpfDigits = String(ref.cpf || '').replace(/\D/g, '');
      if (cpfDigits.length === 11) {
        parts.push(`client_snapshot->>cpf.ilike.%${cpfDigits}%`);
        parts.push(`client_snapshot->>cpf.ilike.%${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9)}%`);
      }
      const contactIds = new Set<string>();
      for (const k of phoneKeys) {
        const { data: cs } = await supabase.from('contacts').select('id').eq('master_id', masterId).or(`primary_phone.ilike.%${k},secondary_phone.ilike.%${k}`).limit(50);
        (cs || []).forEach((c: any) => contactIds.add(c.id));
        parts.push(`client_snapshot->>phone.ilike.%${k.slice(0, 4)}%${k.slice(4)}`);
      }
      if (cpfDigits.length === 11) {
        const { data: cs } = await supabase.from('contacts').select('id').eq('master_id', masterId).eq('cpf_digits', cpfDigits).limit(50);
        (cs || []).forEach((c: any) => contactIds.add(c.id));
      }
      if (contactIds.size) parts.push(`contact_id.in.(${Array.from(contactIds).join(',')})`);
      if (parts.length === 0) return [];
      q = q.or(parts.join(','));
      const { data } = await q.order('event_date', { ascending: true }).limit(20);
      return (data || []).map(mapRowToContract);
    }

    const filter = await buildContractSearchFilter(masterId, search);
    if (filter) q = q.or(filter);
    const { data } = await q.order('created_at', { ascending: false }).limit(15);
    return (data || []).map(mapRowToContract);
  },

  /**
   * Vincula um contrato aprovado a um card de cliente: define contracts.client_id (o indice unico impede dois cards
   * no mesmo contrato), copia para o card o que e operacional (titulo, tipo, data, convidados, pacote, valor, nomes)
   * e garante a posicao do card no funil atual em contract_funnel_placements.
   */
  async linkContractToClient(params: { contractId: string; clientId: string; masterId: string }): Promise<{ success: boolean; message?: string; patch?: Record<string, any> }> {
    if (!isSupabaseConfigured || !isUuid(params.contractId) || !isUuid(params.clientId) || !params.masterId) return { success: false, message: 'Parâmetros inválidos.' };
    try {
      const { data: c } = await supabase.from('contracts').select('*').eq('id', params.contractId).eq('master_id', params.masterId).maybeSingle();
      if (!c) return { success: false, message: 'Contrato não encontrado.' };
      if (c.approval_status !== 'approved') return { success: false, message: 'Só contratos aprovados podem ser vinculados.' };
      if (c.client_id && c.client_id !== params.clientId) return { success: false, message: 'Este contrato já está vinculado a outro cliente.' };
      const { data: cl } = await supabase.from('clients').select('id, funnel_id, stage, birthday_person_name, payer_name').eq('id', params.clientId).eq('master_id', params.masterId).maybeSingle();
      if (!cl) return { success: false, message: 'Cliente não encontrado.' };
      const { data: prev } = await supabase.from('contracts').select('id').eq('client_id', params.clientId).eq('master_id', params.masterId).neq('id', params.contractId).maybeSingle();
      if (prev) return { success: false, message: 'Este cliente já tem outro contrato vinculado.' };

      const { error: linkErr } = await supabase.from('contracts').update({ client_id: params.clientId, updated_at: new Date().toISOString() }).eq('id', params.contractId).eq('master_id', params.masterId);
      if (linkErr) return { success: false, message: linkErr.code === '23505' ? 'Este contrato já está vinculado a outro cliente.' : linkErr.message };

      const snap = (c.client_snapshot || {}) as Record<string, any>;
      const clientUpdate: Record<string, any> = {
        contract_title: c.contract_title,
        event_type: c.event_type,
        event_date: c.event_date || null,
        event_time: c.event_time || null,
        guest_count: c.guest_count || 0,
        package_sold: c.package_name || null,
        deal_value: Number(c.total_amount || 0),
        venue_id: c.venue_id,
        updated_at: new Date().toISOString(),
      };
      if (snap.birthdayPersonName && !cl.birthday_person_name) clientUpdate.birthday_person_name = snap.birthdayPersonName;
      if (snap.payerName && !cl.payer_name) clientUpdate.payer_name = snap.payerName;
      await supabase.from('clients').update(clientUpdate).eq('id', params.clientId).eq('master_id', params.masterId);

      if (cl.funnel_id && isUuid(cl.funnel_id)) {
        await supabase.from('contract_funnel_placements').upsert({
          master_id: params.masterId, contract_id: params.contractId, funnel_id: cl.funnel_id, stage_id: cl.stage || 'onboarding', status: 'in_progress',
        }, { onConflict: 'contract_id,funnel_id' });
      }
      try { window.dispatchEvent(new CustomEvent('f5:contracts-changed')); } catch { /* sem window */ }

      return {
        success: true,
        patch: {
          contractTitle: c.contract_title, eventType: c.event_type, eventDate: c.event_date || undefined, eventTime: c.event_time || undefined,
          guestCount: c.guest_count || 0, packageSold: c.package_name || undefined, dealValue: Number(c.total_amount || 0), venueId: c.venue_id,
          ...(snap.birthdayPersonName && !cl.birthday_person_name ? { birthdayPersonName: snap.birthdayPersonName } : {}),
        },
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erro ao vincular contrato.' };
    }
  },

  /**
   * Define SDR e/ou Closer em um ou varios contratos (marcacao em lote pelo gerente comercial).
   * Cada papel so e alterado se vier informado (undefined = nao mexe; id null = deixa sem responsavel).
   * O que existia fica no historico do proprio contrato (commercial_fields_snapshot.teamChanges).
   */
  async updateSalesTeam(params: {
    masterId: string;
    contractIds: string[];
    sdr?: { id: string | null; name: string };
    closer?: { id: string | null; name: string };
    author: { id?: string; name?: string; role?: string };
  }): Promise<{ success: boolean; updated: number; message?: string }> {
    if (!isSupabaseConfigured || !params.masterId || params.contractIds.length === 0) return { success: false, updated: 0, message: 'Parâmetros inválidos.' };
    if (!params.sdr && !params.closer) return { success: false, updated: 0, message: 'Nada para alterar.' };
    try {
      const ids = params.contractIds.filter(isUuid);
      let updated = 0;
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const { data: rows, error } = await supabase
          .from('contracts')
          .select('id, sdr_id, sdr_name, closer_id, closer_name, commercial_fields_snapshot')
          .eq('master_id', params.masterId)
          .in('id', chunk);
        if (error) return { success: false, updated, message: error.message };
        const now = new Date().toISOString();
        const results = await Promise.all((rows || []).map(async (r: any) => {
          const snap = { ...(r.commercial_fields_snapshot || {}) } as Record<string, any>;
          const history: any[] = Array.isArray(snap.teamChanges) ? [...snap.teamChanges] : [];
          const patch: Record<string, any> = { updated_at: now };
          const apply = (field: 'sdr' | 'closer', next?: { id: string | null; name: string }) => {
            if (!next) return;
            history.push({ at: now, by: params.author.name || 'Equipe', byRole: params.author.role || null, field, from: r[field + '_name'] || null, to: next.id ? next.name : null });
            patch[field + '_id'] = next.id && isUuid(next.id) ? next.id : null;
            patch[field + '_name'] = next.id ? next.name : '';
            patch[field + '_email'] = null;
          };
          apply('sdr', params.sdr);
          apply('closer', params.closer);
          patch.commercial_fields_snapshot = { ...snap, teamChanges: history };
          const { error: upErr } = await supabase.from('contracts').update(patch).eq('id', r.id).eq('master_id', params.masterId);
          return !upErr;
        }));
        updated += results.filter(Boolean).length;
      }
      return { success: updated > 0, updated, message: updated === 0 ? 'Nenhum contrato foi atualizado.' : undefined };
    } catch (err: any) {
      return { success: false, updated: 0, message: err?.message || 'Erro ao salvar responsáveis.' };
    }
  },


  /** Registra no historico uma mudanca ja gravada pela tela (convidados/data): quem, quando, antes -> depois. */
  async logCardChange(params: {
    clientId: string; masterId: string; field: 'guest_count' | 'event_date';
    oldValue: string; newValue: string; author: { id?: string; name: string; role?: string };
  }): Promise<void> {
    if (!isSupabaseConfigured || !isUuid(params.clientId) || !params.masterId || params.oldValue === params.newValue) return;
    const { data: contract } = await supabase.from('contracts').select('id').eq('client_id', params.clientId).eq('master_id', params.masterId).maybeSingle();
    await supabase.from('contract_card_changes').insert({
      master_id: params.masterId,
      contract_id: contract?.id || null,
      client_id: params.clientId,
      field: params.field,
      old_value: params.oldValue,
      new_value: params.newValue,
      author_id: params.author.id && isUuid(params.author.id) ? params.author.id : null,
      author_name: params.author.name,
      author_role: params.author.role || null,
    });
  },

  /** Valores ORIGINAIS do contrato (base juridica) para a etiqueta "contrato: N" quando o card difere. */
  async getCardContractInfo(clientId: string, masterId: string): Promise<{ guestCount: number; eventDate: string | null; eventType: string } | null> {
    if (!isSupabaseConfigured || !isUuid(clientId) || !masterId) return null;
    const { data } = await supabase.from('contracts').select('guest_count, event_date, event_type').eq('client_id', clientId).eq('master_id', masterId).maybeSingle();
    return data ? { guestCount: Number(data.guest_count || 0), eventDate: data.event_date || null, eventType: data.event_type } : null;
  },

  /** Historico de alteracoes do card (aba "Histórico de alterações"). */
  async getCardChanges(clientId: string, masterId: string): Promise<Array<{ id: string; field: string; oldValue: string; newValue: string; reason?: string; authorName?: string; authorRole?: string; createdAt: string }>> {
    if (!isSupabaseConfigured || !isUuid(clientId) || !masterId) return [];
    const { data } = await supabase.from('contract_card_changes')
      .select('id, field, old_value, new_value, reason, author_name, author_role, created_at')
      .eq('client_id', clientId).eq('master_id', masterId).order('created_at', { ascending: false }).limit(100);
    return (data || []).map((r: any) => ({ id: r.id, field: r.field, oldValue: r.old_value, newValue: r.new_value, reason: r.reason, authorName: r.author_name, authorRole: r.author_role, createdAt: r.created_at }));
  },

  /**
   * Requisitos para o contrato cair em "Preenchido" (fica disponivel para o financeiro).
   * Devolve a lista do que falta; vazia = pode seguir.
   */
  getFillMissing(c: { contractFileUrl?: string | null; paymentFileUrl?: string | null; attachments?: any[]; totalAmount?: number; signalAmount?: number; paymentTerms?: any; eventDate?: string | null; guestCount?: number | null; clientSnapshot?: Record<string, any> | null; closerName?: string; sdrName?: string }): string[] {
    const missing: string[] = [];
    const hasSigned = Boolean(c.contractFileUrl) || (c.attachments || []).some((a: any) => /contrato|assinad/i.test(`${a?.type || ''} ${a?.name || ''}`));
    if (!hasSigned) missing.push('Contrato assinado anexado');
    if ((c.signalAmount || 0) > 0 && !c.paymentFileUrl && !(c.attachments || []).some((a: any) => /comprov|pagamento|pix/i.test(`${a?.type || ''} ${a?.name || ''}`))) missing.push('Comprovante do sinal');
    if (!(Number(c.totalAmount) > 0)) missing.push('Valor da venda');
    const plan = parsePlan(c.paymentTerms);
    if (!plan || plan.items.length === 0) missing.push('Condições de pagamento (sinal, entrada e parcelas)');
    const snap = c.clientSnapshot || {};
    if (!(snap.name || snap.payerName) || !snap.phone) missing.push('Nome e telefone do contratante');
    if (!c.eventDate) missing.push('Data da festa');
    if (!(Number(c.guestCount) > 0)) missing.push('Número de convidados');
    return missing;
  },

  /**
   * Dados do fechamento preenchidos pelo closer (contrato assinado, comprovante, plano de pagamento).
   * Sinal, entrada, saldo e a descricao em texto saem do plano. So enquanto o contrato nao foi aprovado.
   */
  async saveClosingData(params: {
    contractId: string;
    masterId: string;
    contractFileUrl?: string;
    paymentFileUrl?: string;
    plan?: import('../utils/paymentPlan').PaymentPlan;
  }): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured || !params.contractId || !params.masterId) return { success: false, message: 'Parâmetros inválidos.' };
    const { data: row } = await supabase.from('contracts').select('approval_status, total_amount').eq('id', params.contractId).eq('master_id', params.masterId).maybeSingle();
    if (!row) return { success: false, message: 'Contrato não encontrado.' };
    if (row.approval_status !== 'pending_approval') return { success: false, message: 'Contrato já aprovado: alterações passam pelo financeiro.' };
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (params.contractFileUrl !== undefined) patch.contract_file_url = params.contractFileUrl;
    if (params.paymentFileUrl !== undefined) patch.payment_file_url = params.paymentFileUrl;
    if (params.plan) {
      const total = Number(row.total_amount || 0);
      const { signal, entry } = planSignalEntry(params.plan);
      patch.payment_terms = { ...params.plan, source: 'venda' };
      patch.signal_amount = signal;
      patch.entry_amount = entry;
      patch.balance_amount = Math.max(0, total - signal - entry);
      patch.payment_summary = describePlan(params.plan, total) || null;
    }
    const { error } = await supabase.from('contracts').update(patch).eq('id', params.contractId).eq('master_id', params.masterId);
    return error ? { success: false, message: error.message } : { success: true };
  },

  /** Move o contrato entre as etapas de fechamento. Ao chegar em "Preenchido" valida os requisitos e envia ao financeiro. */
  async setFillStage(params: {
    contractId: string;
    masterId: string;
    stage: 'pendente' | 'aguardando_assinatura' | 'juntando_documentos' | 'preenchido';
    contract?: Contract;
  }): Promise<{ success: boolean; message?: string; missing?: string[] }> {
    if (!isSupabaseConfigured || !params.contractId || !params.masterId) return { success: false, message: 'Parâmetros inválidos.' };
    try {
      const { data: row, error: rErr } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', params.contractId)
        .eq('master_id', params.masterId)
        .maybeSingle();
      if (rErr || !row) return { success: false, message: 'Contrato não encontrado.' };
      if (row.approval_status !== 'pending_approval') return { success: false, message: 'Este contrato já foi aprovado.' };

      if (params.stage === 'preenchido') {
        const c = mapRowToContract(row);
        const missing = this.getFillMissing(c);
        if (missing.length > 0) return { success: false, message: 'Faltam itens para marcar como preenchido.', missing };
      }
      const patch: Record<string, any> = { fill_stage: params.stage, updated_at: new Date().toISOString() };
      // Ajuste feito pelo closer: o recado do financeiro some quando ele reenvia
      if (params.stage === 'preenchido') patch.finance_message = null;
      const { error } = await supabase.from('contracts').update(patch).eq('id', params.contractId).eq('master_id', params.masterId);
      if (error) return { success: false, message: error.message };

      if (params.stage === 'preenchido') {
        await financeService.submitReview({ masterId: params.masterId, contractId: params.contractId, plan: parsePlan(row.payment_terms) });
      }
      void setLeadClosingStatus(params.masterId, row.origin_lead_id || row.lead_id, params.stage === 'preenchido' ? 'financeiro' : 'em_fechamento');
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao mover o contrato.' };
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
    targetPosSaleFunnelIds?: string[];
    lockEventDate?: boolean;
    /** Aprovacao feita pelo financeiro (fluxo novo): sem checagem de alcada da gerencia e sem reenviar ao financeiro. */
    fromFinance?: boolean;
  }): Promise<{ success: boolean; contract?: Contract; message?: string }> {
    if (!isSupabaseConfigured || !params.contractId || !params.masterId) {
      return { success: false, message: 'Parâmetros inválidos.' };
    }

    // 1. Verificação Rígida de Alçada
    const allowedRoles = ['master', 'gerente_geral', 'gerente_comercial', 'admin', 'dev'];
    if (!params.fromFinance && !allowedRoles.includes(params.approverUser.role)) {
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

      // Aprovacao do financeiro: so age em contrato ainda na fila (os importados ja nascem aprovados)
      if (params.fromFinance && contractRow.approval_status !== 'pending_approval') {
        return { success: true, contract: mapRowToContract(contractRow) };
      }

      const contractVenueId = contractRow.venue_id;

      // 3. Validação dos funis selecionados (devem pertencer à MESMA unidade)
      let validFunnelIds: string[] = [];
      const wantedFunnelIds = (params.targetPosSaleFunnelIds && params.targetPosSaleFunnelIds.length > 0)
        ? params.targetPosSaleFunnelIds
        : ((contractRow.target_pos_sale_funnel_ids as string[] | null) || []);
      if (wantedFunnelIds.length > 0) {
        const { data: funnels } = await supabase
          .from('commercial_funnels')
          .select('id, venue_id, stages')
          .eq('master_id', params.masterId)
          .in('id', wantedFunnelIds);

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
          fill_stage: 'preenchido',
          finance_message: null,
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

        // 5a. Card unico do contrato (idempotente), no primeiro funil de pos-venda
        if (!contractRow.client_id) {
          const createdClientId = await this.createClientFromContract({ contractId: params.contractId, masterId: params.masterId, funnelId: validFunnelIds[0] });
          if (createdClientId) contractRow.client_id = createdClientId;
        }

        // 5b. Cada funil de pos-venda e um setor independente: garante um card (client) por funil,
        // ligado ao mesmo lead de origem, na primeira etapa do respectivo funil.
        try {
          const clientId = contractRow.client_id as string | null;
          const originLeadId = contractRow.origin_lead_id as string | null;
          // Liga o card ao contrato (todos os cards irmaos nascem copiando este vinculo)
          if (clientId) await supabase.from('clients').update({ migrated_to_contract_id: params.contractId }).eq('id', clientId).eq('master_id', params.masterId).is('migrated_to_contract_id', null);
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

      // Financeiro: o contrato homologado cai na fila de aprovacao do plano de pagamento (em paralelo ao pos-venda)
      if (!params.fromFinance) try {
        await financeService.submitReview({ masterId: params.masterId, contractId: params.contractId, plan: parsePlan((updated as any).payment_terms) });
      } catch (finErr) {
        console.warn('[approveContract] Aviso ao enviar ao financeiro:', finErr);
      }

      // Sincroniza evento na agenda de eventos da unidade se possuir data e unidade
      if (updated.event_date && updated.venue_id) {
        try {
          const { venueEventService } = await import('./venueEventService');
          await venueEventService.upsert({
            id: updated.id,
            masterId: updated.master_id || undefined,
            venueId: updated.venue_id,
            clientId: updated.client_id || null,
            title: (updated.contract_title || updated.title || 'Evento da Unidade').replace(/\?{2,}/g, ' - ').replace(/\?/g, '').trim(),
            eventType: updated.event_type || '15 Anos',
            eventDate: String(updated.event_date).split('T')[0],
            startTime: updated.event_time || '',
            guestCount: updated.guest_count ? Number(updated.guest_count) : undefined,
            status: 'confirmed',
            blocksVenueDay: true,
            notes: updated.notes || undefined,
            createdByName: params.approverUser?.name || 'Homologação Comercial',
          });
        } catch (evErr) {
          console.warn('[approveContract] Aviso ao sincronizar evento na agenda:', evErr);
        }
      }

      void setLeadClosingStatus(params.masterId, contractRow.origin_lead_id || contractRow.lead_id, 'ganho');
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
   * Colocacoes de varios contratos de uma vez (busca global), sempre escopado por master_id.
   */
  async getPlacementsByContracts(
    contractIds: string[],
    masterId: string
  ): Promise<ContractFunnelPlacement[]> {
    if (!isSupabaseConfigured || contractIds.length === 0 || !masterId) return [];
    try {
      const { data, error } = await supabase
        .from('contract_funnel_placements')
        .select('id, master_id, contract_id, funnel_id, stage_id, status, assigned_to, order_index, created_at, updated_at, funnel:commercial_funnels(id, name)')
        .in('contract_id', contractIds)
        .eq('master_id', masterId)
        .order('order_index', { ascending: true });
      if (error || !data) return [];
      return data.map((p: any) => ({
        id: p.id,
        masterId: p.master_id,
        contractId: p.contract_id,
        funnelId: p.funnel_id,
        funnelName: p.funnel?.name || 'Funil Pós-Venda',
        stageId: p.stage_id,
        status: p.status,
        assignedTo: p.assigned_to,
        orderIndex: p.order_index,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    } catch (err) {
      console.error('Exceção em getPlacementsByContracts:', err);
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
            const contractCode = client.client_code || generateContractCode(null, client.event_date);
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
    sourceId: row.source_id || undefined,
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
    signalAmount: Number(row.signal_amount ?? 0),
    closedAt: row.closed_at || undefined,
    entryAmount,
    balanceAmount,
    paymentSummary: row.payment_summary || undefined,
    fillStage: (row.fill_stage || 'pendente') as Contract['fillStage'],
    financeMessage: row.finance_message || undefined,
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
