import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { taskService } from './taskService';
import { generateUuid } from '../utils/uuid';
import { describePlan, expandPlan, parsePlan, toCents, fromCents, validatePlan, type PaymentPlan } from '../utils/paymentPlan';
import type { FinContractSummary, FinStageKey, FinReview, FinReceivable, FinManualStage } from '../types/finance';

const num = (v: unknown) => Number(v || 0);

const mapSummary = (r: any): FinContractSummary => ({
  contractId: r.contract_id,
  masterId: r.master_id,
  venueId: r.venue_id,
  contractCode: r.contract_code,
  contractTitle: r.contract_title,
  clientId: r.client_id,
  contactId: r.contact_id,
  contractTotal: num(r.contract_total),
  receivablesTotal: num(r.receivables_total),
  paidAmount: num(r.paid_amount),
  pendingAmount: num(r.pending_amount),
  overdueAmount: num(r.overdue_amount),
  overdueCount: num(r.overdue_count),
  nextDueDate: r.next_due_date,
  eventDate: r.event_date,
  dueSoon: Boolean(r.due_soon),
  maxOverdueDays: num(r.max_overdue_days),
  partialCount: num(r.partial_count),
  manualStage: r.manual_stage || null,
  manualNote: r.manual_note || null,
  receivablesCount: num(r.receivables_count),
  reviewStatus: r.review_status,
  stageKey: r.stage_key as FinStageKey,
});

const mapReceivable = (r: any): FinReceivable => ({
  id: r.id,
  contractId: r.contract_id,
  kind: r.kind,
  seq: r.seq,
  totalSeq: r.total_seq,
  dueDate: r.due_date,
  dueRule: r.due_rule,
  amount: num(r.amount),
  paidAmount: num(r.paid_amount),
  status: r.status,
  paymentMethod: r.payment_method,
  installments: r.installments,
  terminalId: r.terminal_id,
});

const mapReview = (r: any): FinReview => ({
  id: r.id,
  contractId: r.contract_id,
  status: r.status,
  plan: parsePlan(r.plan_snapshot),
  reviewerName: r.reviewer_name,
  reason: r.reason,
  submittedAt: r.submitted_at,
  reviewedAt: r.reviewed_at,
});

const planHash = (plan: PaymentPlan | null) => {
  const s = JSON.stringify(plan?.items || []);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
};

const audit = async (masterId: string, entity: string, entityId: string, action: string, before: unknown, after: unknown, by?: { id?: string; name?: string }) => {
  try {
    await supabase.from('fin_audit_log').insert({
      master_id: masterId, entity, entity_id: entityId, action,
      before_data: before ?? null, after_data: after ?? null,
      by_id: by?.id && /^[0-9a-f-]{36}$/i.test(by.id) ? by.id : null, by_name: by?.name || null,
    });
  } catch (e) {
    console.warn('[financeService.audit]', e);
  }
};

/** Contrato vindo da importacao: nao pode ser reprovado/cancelado, so conferido e ajustado pelo financeiro. */
export interface CashCalendarData {
  inflows: Array<{ id: string; date: string; amount: number; paid: number; contractId: string; title: string; kind: string; seq: number; totalSeq: number; venueId: string | null }>;
  outflows: Array<{ id: string; date: string; amount: number; description: string; venueId: string | null }>;
}

export const isImportedContract = (snapshot: any): boolean => Boolean(snapshot?.importKey);

/**
 * Servico do financeiro. Toda leitura e gravacao filtra por master_id; a checagem de quem pode usar o financeiro
 * (canAccessFinance) e feita pela tela, porque o banco segue o padrao aberto das demais tabelas (ver docs/PLANO_FINANCEIRO.md, secao 6).
 */
export const financeService = {
  /** Entradas (parcelas a receber, pelo vencimento) e saidas (contas a pagar) de um periodo, para o calendario financeiro. */
  async getCashCalendar(masterId: string, from: string, to: string, venueIds: string[]): Promise<CashCalendarData> {
    const empty: CashCalendarData = { inflows: [], outflows: [] };
    if (!isSupabaseConfigured || !masterId || venueIds.length === 0) return empty;
    const { data: recs } = await supabase.from('fin_receivables')
      .select('id, due_date, amount, paid_amount, status, kind, seq, total_seq, contract_id, venue_id')
      .eq('master_id', masterId).in('venue_id', venueIds).gte('due_date', from).lte('due_date', to)
      .not('status', 'in', '(cancelado,estornado)').limit(5000);
    const rows = recs || [];
    const ids = Array.from(new Set(rows.map((r: any) => r.contract_id as string)));
    const titles = new Map<string, string>();
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabase.from('contracts').select('id, contract_title, contract_code').eq('master_id', masterId).in('id', ids.slice(i, i + 100));
      (data || []).forEach((c: any) => titles.set(c.id, c.contract_title || c.contract_code));
    }
    const { data: pays } = await supabase.from('fin_payables')
      .select('id, due_date, amount, description, venue_id, status')
      .eq('master_id', masterId).gte('due_date', from).lte('due_date', to).neq('status', 'cancelado').limit(5000);
    return {
      inflows: rows.map((r: any) => ({
        id: r.id, date: String(r.due_date).slice(0, 10), amount: Number(r.amount || 0), paid: Math.min(Number(r.paid_amount || 0), Number(r.amount || 0)),
        contractId: r.contract_id, title: titles.get(r.contract_id) || 'Contrato', kind: r.kind, seq: r.seq, totalSeq: r.total_seq, venueId: r.venue_id,
      })),
      outflows: (pays || []).filter((p: any) => !p.venue_id || venueIds.includes(p.venue_id)).map((p: any) => ({
        id: p.id, date: String(p.due_date).slice(0, 10), amount: Number(p.amount || 0), description: p.description, venueId: p.venue_id,
      })),
    };
  },

  /** Maquininhas cadastradas (a taxa por parcelas vem da tabela fee_table). */
  async getCardTerminals(masterId: string): Promise<Array<{ id: string; name: string; feeTable: Record<string, number> }>> {
    if (!isSupabaseConfigured || !masterId) return [];
    const { data, error } = await supabase.from('fin_card_terminals').select('id, name, fee_table').eq('master_id', masterId).eq('active', true).order('name');
    if (error) { console.warn('[financeService.getCardTerminals]', error.message); return []; }
    return (data || []).map((t: any) => ({ id: t.id, name: t.name, feeTable: (t.fee_table || {}) as Record<string, number> }));
  },

  /** Situacao financeira de cada contrato aprovado do Master (a etapa do funil financeiro e calculada na view). */
  async getContractSummaries(masterId: string, venueIds?: string[]): Promise<FinContractSummary[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    let q = supabase.from('v_fin_contract_summary').select('*').eq('master_id', masterId);
    if (venueIds && venueIds.length) q = q.in('venue_id', venueIds);
    const { data, error } = await q.limit(2000);
    if (error) {
      console.warn('[financeService.getContractSummaries]', error.message);
      return [];
    }
    return (data || []).map(mapSummary);
  },

  /**
   * Move o contrato para uma etapa MANUAL do funil (negociacao ou cancelamento) ou o devolve ao automatico (stage = null).
   * Cancelamento exige motivo. O fluxo contabil do distrato (estorno, multa, devolucao) e a Fase 3B.
   */
  async setManualStage(params: { masterId: string; contractId: string; stage: FinManualStage | null; note?: string; by?: { id?: string; name?: string } }): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Sem conexão com o banco.' };
    const { masterId, contractId, stage } = params;
    if (stage === 'cancelamento' && (params.note || '').trim().length < 3) return { success: false, message: 'Informe o motivo do cancelamento.' };
    const { data: before } = await supabase.from('fin_contract_stage_overrides').select('manual_stage, note').eq('contract_id', contractId).eq('master_id', masterId).maybeSingle();
    if (stage === null) {
      const { error } = await supabase.from('fin_contract_stage_overrides').delete().eq('contract_id', contractId).eq('master_id', masterId);
      if (error) return { success: false, message: error.message };
    } else {
      const { error } = await supabase.from('fin_contract_stage_overrides').upsert({
        contract_id: contractId, master_id: masterId, manual_stage: stage, note: params.note || null,
        set_by: params.by?.id && /^[0-9a-f-]{36}$/i.test(params.by.id) ? params.by.id : null, set_by_name: params.by?.name || null, set_at: new Date().toISOString(),
      }, { onConflict: 'contract_id' });
      if (error) return { success: false, message: error.message };
    }
    await audit(masterId, 'fin_contract_stage', contractId, stage ? 'etapa_manual:' + stage : 'etapa_automatica', before, { stage, note: params.note || null }, params.by);
    return { success: true };
  },
  /** Dados do contrato para a ficha financeira (contrato aprovado, ja com parcelas). */
  async getContractForFinance(masterId: string, contractId: string): Promise<any | null> {
    if (!isSupabaseConfigured || !masterId || !contractId) return null;
    const { data } = await supabase.from('contracts')
      .select('id, contract_code, contract_title, event_date, guest_count, total_amount, entry_amount, signal_amount, payment_summary, package_name, sdr_name, closer_name, closed_at, handover_notes, venue_id, client_id, contact_id, client_snapshot, commercial_fields_snapshot, contract_file_url, payment_file_url, attachments, payment_terms, event_type')
      .eq('master_id', masterId).eq('id', contractId).maybeSingle();
    return data || null;
  },

  /** Ultima revisao do contrato (pendente, aprovada ou reprovada). */
  async getLatestReview(masterId: string, contractId: string): Promise<FinReview | null> {
    if (!isSupabaseConfigured || !masterId || !contractId) return null;
    const { data } = await supabase.from('fin_contract_reviews').select('*').eq('master_id', masterId).eq('contract_id', contractId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data ? mapReview(data) : null;
  },

  /**
   * Envia o contrato homologado para o financeiro (idempotente: nao duplica se ja ha revisao pendente ou aprovada).
   * O plano de pagamento vem do contrato (payment_terms) e o financeiro pode ajusta-lo antes de aprovar.
   */
  async submitReview(params: { masterId: string; contractId: string; plan?: PaymentPlan | null }): Promise<{ created: boolean; reviewId?: string }> {
    if (!isSupabaseConfigured || !params.masterId || !params.contractId) return { created: false };
    const last = await this.getLatestReview(params.masterId, params.contractId);
    if (last && (last.status === 'pendente' || last.status === 'aprovado')) return { created: false, reviewId: last.id };
    let plan = params.plan ?? null;
    if (plan === undefined || plan === null) {
      const { data: c } = await supabase.from('contracts').select('payment_terms').eq('id', params.contractId).eq('master_id', params.masterId).maybeSingle();
      plan = parsePlan(c?.payment_terms);
    }
    const id = generateUuid();
    const { error } = await supabase.from('fin_contract_reviews').insert({
      id, master_id: params.masterId, contract_id: params.contractId, status: 'pendente',
      plan_snapshot: plan || { version: 1, items: [] }, plan_hash: planHash(plan),
    });
    if (error) { console.warn('[financeService.submitReview]', error.message); return { created: false }; }
    return { created: true, reviewId: id };
  },

  /** Revisoes pendentes de aprovacao, com os dados do contrato e do cliente para o card. */
  async getPendingReviews(masterId: string, venueIds?: string[]): Promise<Array<FinReview & { contract: any }>> {
    if (!isSupabaseConfigured || !masterId) return [];
    const { data: reviews } = await supabase.from('fin_contract_reviews').select('*').eq('master_id', masterId).eq('status', 'pendente').order('submitted_at', { ascending: true }).limit(1000);
    if (!reviews?.length) return [];
    const ids = reviews.map((r: any) => r.contract_id);
    const rows: any[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabase.from('contracts')
        .select('id, contract_code, contract_title, event_date, guest_count, total_amount, entry_amount, venue_id, client_id, contact_id, client_snapshot, commercial_fields_snapshot, contract_file_url, payment_file_url, attachments, closer_name, sdr_name, event_type, handover_notes')
        .eq('master_id', masterId).in('id', ids.slice(i, i + 100));
      rows.push(...(data || []));
    }
    const byId = new Map(rows.map(r => [r.id, r]));
    return reviews
      .map((r: any) => ({ ...mapReview(r), contract: byId.get(r.contract_id) }))
      .filter(r => r.contract && (!venueIds?.length || venueIds.includes(r.contract.venue_id)));
  },

  async getReceivables(masterId: string, contractId: string): Promise<FinReceivable[]> {
    if (!isSupabaseConfigured || !masterId || !contractId) return [];
    const { data } = await supabase.from('fin_receivables').select('*').eq('master_id', masterId).eq('contract_id', contractId).order('due_date', { ascending: true, nullsFirst: false }).order('seq');
    return (data || []).map(mapReceivable);
  },

  /** Guarda o rascunho do plano na revisao (sem aprovar). */
  async saveDraftPlan(params: { masterId: string; reviewId: string; plan: PaymentPlan }): Promise<boolean> {
    const { error } = await supabase.from('fin_contract_reviews')
      .update({ plan_snapshot: params.plan, plan_hash: planHash(params.plan) }).eq('id', params.reviewId).eq('master_id', params.masterId).eq('status', 'pendente');
    return !error;
  },

  /**
   * APROVA: valida o plano (soma = total, datas completas), cria as parcelas a receber, reconhece a receita na data da festa
   * e grava historico. Se o plano foi editado pelo financeiro, ele vira o plano oficial do contrato (payment_terms).
   * Parcelas ja vencidas geram UMA tarefa (sem responsavel e sem data) para conferir comprovantes e dar baixa retroativa.
   */
  async approveReview(params: { masterId: string; reviewId: string; contractId: string; plan: PaymentPlan; reviewer: { id?: string; name?: string } }): Promise<{ success: boolean; message?: string; receivables?: number }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Sem conexão com o banco.' };
    const { masterId, contractId, reviewId, reviewer } = params;
    const { data: c } = await supabase.from('contracts')
      .select('id, venue_id, contract_title, contract_code, total_amount, event_date, client_id, contact_id, payment_terms, commercial_fields_snapshot')
      .eq('id', contractId).eq('master_id', masterId).maybeSingle();
    if (!c) return { success: false, message: 'Contrato não encontrado.' };

    const v = validatePlan(params.plan, num(c.total_amount), { requireDates: true, hasEventDate: Boolean(c.event_date), eventDate: c.event_date });
    if (!v.ok) return { success: false, message: v.errors[0] };

    const { count } = await supabase.from('fin_receivables').select('id', { count: 'exact', head: true }).eq('master_id', masterId).eq('contract_id', contractId);
    if ((count || 0) > 0) return { success: false, message: 'Este contrato já tem parcelas geradas.' };

    const rows = expandPlan(params.plan, { eventDate: c.event_date, totalAmount: num(c.total_amount) }).map(r => ({
      id: generateUuid(), master_id: masterId, venue_id: c.venue_id, contract_id: contractId, client_id: c.client_id, contact_id: c.contact_id,
      kind: r.kind, seq: r.seq, total_seq: r.totalSeq, due_date: r.dueDate, due_rule: r.dueRule, amount: r.amount,
      payment_method: r.paymentMethod || null, installments: r.installments || null, terminal_id: r.terminalId || null,
      competence_date: c.event_date || null, source: isImportedContract(c.commercial_fields_snapshot) ? 'importacao' : 'plano_contrato',
      import_key: `plano:${contractId}:${r.kind}:${r.seq}`, created_by: reviewer.id && /^[0-9a-f-]{36}$/i.test(reviewer.id) ? reviewer.id : null,
    }));
    const { error: recErr } = await supabase.from('fin_receivables').insert(rows);
    if (recErr) return { success: false, message: 'Não foi possível criar as parcelas: ' + recErr.message };

    // receita por competencia (data da festa)
    if (c.event_date) {
      await supabase.from('fin_revenue_recognition').insert({ master_id: masterId, venue_id: c.venue_id, contract_id: contractId, competence_date: c.event_date, amount: num(c.total_amount), kind: 'evento' });
    }

    // plano final vira o plano oficial do contrato (guardando o que existia no historico)
    const signalCents = rows.filter(r => r.kind === 'sinal').reduce((a, r) => a + toCents(r.amount), 0);
    const entryCents = rows.filter(r => r.kind === 'entrada').reduce((a, r) => a + toCents(r.amount), 0);
    const finalPlan: PaymentPlan = { ...params.plan, source: 'financeiro' };
    await supabase.from('contracts').update({
      payment_terms: finalPlan, signal_amount: fromCents(signalCents), entry_amount: fromCents(entryCents),
      balance_amount: Math.max(0, num(c.total_amount) - fromCents(signalCents + entryCents)),
      payment_summary: describePlan(finalPlan, num(c.total_amount)) || null, updated_at: new Date().toISOString(),
    }).eq('id', contractId).eq('master_id', masterId);
    await audit(masterId, 'contract_payment_plan', contractId, 'aprovado', parsePlan(c.payment_terms), finalPlan, reviewer);

    await supabase.from('fin_contract_reviews').update({
      status: 'aprovado', plan_snapshot: finalPlan, plan_hash: planHash(finalPlan),
      reviewer_id: reviewer.id && /^[0-9a-f-]{36}$/i.test(reviewer.id) ? reviewer.id : null, reviewer_name: reviewer.name || null, reviewed_at: new Date().toISOString(),
    }).eq('id', reviewId).eq('master_id', masterId);

    // parcelas vencidas: uma tarefa livre para dar baixa retroativa
    const today = new Date().toISOString().split('T')[0];
    const overdue = rows.filter(r => r.due_date && r.due_date < today);
    if (overdue.length) {
      try {
        await taskService.upsert({
          id: generateUuid(), databaseId: 'default_collabs', venueId: c.venue_id || undefined, masterId,
          title: `Conferir comprovantes e dar baixa: ${c.contract_title}`,
          description: `- ${overdue.length} ${overdue.length === 1 ? 'parcela com vencimento já passado' : 'parcelas com vencimento já passado'} neste contrato. Conferir os comprovantes e registrar as baixas retroativas.`,
          priority: 'medium', status: 'todo', dueDate: '', assignedToIds: [], createdByName: 'Financeiro',
          customProperties: { masterId, clientId: c.client_id, contractId, contactId: c.contact_id, leadName: c.contract_title, clientName: c.contract_title, origem: 'financeiro_baixa_retroativa', sector: 'financeiro', semResponsavel: true },
        } as any, masterId);
      } catch (e) { console.warn('[financeService.approveReview] tarefa de baixa retroativa', e); }
    }
    return { success: true, receivables: rows.length };
  },

  /**
   * REPROVA: o contrato volta ao Closer com o motivo (tarefa urgente). Contratos importados nao podem ser reprovados:
   * o financeiro confere e ajusta o plano, depois aprova.
   */
  async rejectReview(params: { masterId: string; reviewId: string; contractId: string; reason: string; reviewer: { id?: string; name?: string } }): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Sem conexão com o banco.' };
    const reason = params.reason.trim();
    if (reason.length < 3) return { success: false, message: 'Informe o motivo da reprovação.' };
    const { data: c } = await supabase.from('contracts')
      .select('id, venue_id, contract_title, contract_code, closer_id, closer_name, origin_lead_id, commercial_fields_snapshot')
      .eq('id', params.contractId).eq('master_id', params.masterId).maybeSingle();
    if (!c) return { success: false, message: 'Contrato não encontrado.' };
    if (isImportedContract(c.commercial_fields_snapshot)) return { success: false, message: 'Contrato importado não pode ser reprovado: ajuste o plano de pagamento e aprove.' };

    const { error } = await supabase.from('fin_contract_reviews').update({
      status: 'reprovado', reason, reviewer_id: params.reviewer.id && /^[0-9a-f-]{36}$/i.test(params.reviewer.id) ? params.reviewer.id : null,
      reviewer_name: params.reviewer.name || null, reviewed_at: new Date().toISOString(),
    }).eq('id', params.reviewId).eq('master_id', params.masterId);
    if (error) return { success: false, message: error.message };
    await audit(params.masterId, 'contract_payment_plan', params.contractId, 'reprovado', null, { reason }, params.reviewer);
    // Fluxo novo: o contrato volta para "Pendente" com o recado do financeiro (o closer ajusta e reenvia)
    await supabase.from('contracts').update({
      fill_stage: 'pendente', finance_message: reason, finance_message_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', params.contractId).eq('master_id', params.masterId).eq('approval_status', 'pending_approval');
    if (c.origin_lead_id) {
      const { data: ld } = await supabase.from('leads').select('custom_field_values').eq('id', c.origin_lead_id).eq('master_id', params.masterId).maybeSingle();
      if (ld) await supabase.from('leads').update({ custom_field_values: { ...(ld.custom_field_values || {}), closingStatus: 'em_fechamento' } }).eq('id', c.origin_lead_id).eq('master_id', params.masterId);
    }

    try {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await taskService.upsert({
        id: generateUuid(), databaseId: 'default_collabs', venueId: c.venue_id || undefined,
        leadId: c.origin_lead_id || undefined, masterId: params.masterId,
        title: `Ajustar plano de pagamento ${c.contract_code}: ${reason.slice(0, 60)}`,
        description: `O financeiro reprovou o plano de pagamento do contrato ${c.contract_code} (${c.contract_title || ''}).\nMotivo: ${reason}\nReprovado por: ${params.reviewer.name || 'Financeiro'}.\nCorrija o plano de pagamento e reenvie.`,
        priority: 'urgent', status: 'todo', dueDate,
        assignedToIds: c.closer_id && /^[0-9a-f-]{36}$/i.test(c.closer_id) ? [c.closer_id] : [],
        createdByName: params.reviewer.name || 'Financeiro',
        customProperties: { masterId: params.masterId, contractCode: c.contract_code, rejectionReason: reason, source: 'finance_plan_rejection', sector: 'comercial' },
      } as any, params.masterId);
    } catch (e) { console.warn('[financeService.rejectReview] tarefa ao closer', e); }
    return { success: true };
  },

  /**
   * Baixa de uma parcela: valor BRUTO pago, data, meio. No cartao, a taxa (%) gera o liquido e o calendario de liquidacao
   * (cada parcela do cartao cai liquida em seu mes). Atualiza o status da parcela (parcial ou pago).
   */
  async registerPayment(params: {
    masterId: string; receivableId: string; amount: number; date: string; method?: string;
    feePct?: number; installments?: number; terminalId?: string; settlementDays?: number; proofUrl?: string; description?: string; by?: { id?: string; name?: string };
  }): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Sem conexão com o banco.' };
    const { data: r } = await supabase.from('fin_receivables').select('*').eq('id', params.receivableId).eq('master_id', params.masterId).maybeSingle();
    if (!r) return { success: false, message: 'Parcela não encontrada.' };
    const grossCents = toCents(params.amount);
    if (grossCents <= 0) return { success: false, message: 'Informe o valor pago.' };
    const openCents = toCents(r.amount) - toCents(r.paid_amount);
    if (grossCents > openCents + 1) return { success: false, message: 'O valor pago é maior que o saldo da parcela.' };
    const isCard = (params.method || r.payment_method) === 'cartao_credito';
    const feeCents = isCard ? Math.round(grossCents * (Number(params.feePct) || 0) / 100) : 0;

    const txId = generateUuid();
    const { error: txErr } = await supabase.from('fin_transactions').insert({
      id: txId, master_id: params.masterId, venue_id: r.venue_id, direction: 'in', tx_date: params.date, kind: 'recebimento',
      gross_amount: fromCents(grossCents), fee_amount: fromCents(feeCents), method: params.method || r.payment_method || null,
      receivable_id: r.id, contract_id: r.contract_id, terminal_id: params.terminalId || r.terminal_id || null,
      installments: isCard ? (params.installments || r.installments || 1) : null, proof_url: params.proofUrl || null, description: params.description || null,
      created_by: params.by?.id && /^[0-9a-f-]{36}$/i.test(params.by.id) ? params.by.id : null,
    });
    if (txErr) return { success: false, message: txErr.message };

    if (isCard) {
      const n = Math.max(1, params.installments || r.installments || 1);
      const settleDays = params.settlementDays || 30;
      const grossEach = Math.floor(grossCents / n);
      const feeEach = Math.floor(feeCents / n);
      const settlements = Array.from({ length: n }, (_, i) => {
        const d = new Date(`${params.date}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + settleDays * (i + 1));
        const lastG = grossCents - grossEach * (n - 1);
        const lastF = feeCents - feeEach * (n - 1);
        return { master_id: params.masterId, transaction_id: txId, seq: i + 1, total_seq: n, expected_date: d.toISOString().split('T')[0],
          gross_part: fromCents(i === n - 1 ? lastG : grossEach), fee_part: fromCents(i === n - 1 ? lastF : feeEach) };
      });
      await supabase.from('fin_card_settlements').insert(settlements);
    }

    const newPaid = toCents(r.paid_amount) + grossCents;
    const status = newPaid >= toCents(r.amount) - 1 ? 'pago' : 'parcial';
    await supabase.from('fin_receivables').update({ paid_amount: fromCents(newPaid), status }).eq('id', r.id).eq('master_id', params.masterId);
    await audit(params.masterId, 'fin_receivable', r.id, 'baixa', { paid_amount: r.paid_amount, status: r.status }, { paid_amount: fromCents(newPaid), status, gross: fromCents(grossCents), fee: fromCents(feeCents) }, params.by);
    return { success: true };
  },
};
