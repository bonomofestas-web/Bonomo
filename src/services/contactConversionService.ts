import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type ConversionTarget = 'supplier' | 'collaborator';

export interface ConversionImpact {
  /** Contratos registrados (pendentes, aprovados ou concluidos): bloqueiam a transicao */
  contracts: Array<{ id: string; code: string; title: string; status: string; venueName?: string }>;
  /** Leads comerciais em andamento: serao marcados como perdidos */
  leads: Array<{ id: string; name: string; code?: string; funnelName?: string; stageName?: string; venueId?: string }>;
  /** Clientes de pos-venda SEM contrato vinculado: serao marcados como perdidos */
  clients: Array<{ id: string; name: string; code?: string; funnelName?: string }>;
}

const last8 = (p?: string | null) => String(p || '').replace(/\D/g, '').slice(-8);
const LOST_IDS = new Set(['lost', 'perdido', 'cancelado', 'recusado']);
const WON_IDS = new Set(['deal_closed', 'contrato_fechado', 'won', 'contract_signed', 'ganho']);
const CLIENT_DONE = new Set(['completed', 'lost', 'archived', 'festa_realizada', 'cancelado']);

/**
 * Transformar um contato em FORNECEDOR ou COLABORADOR. Regras:
 *  - quem tem contrato registrado (pendente, aprovado ou concluido) NAO pode ser transformado;
 *  - os ativos de funil comercial e de pos-venda (sem contrato vinculado) sao perdidos;
 *  - o usuario sempre confirma antes (o modal mostra o que sera perdido).
 */
export const contactConversionService = {
  async getImpact(masterId: string, contact: { id: string; primaryPhone?: string | null; whatsappPhone?: string | null }): Promise<ConversionImpact> {
    const empty: ConversionImpact = { contracts: [], leads: [], clients: [] };
    if (!isSupabaseConfigured || !masterId || !contact.id) return empty;

    const { data: ctr } = await supabase.from('contracts')
      .select('id, contract_code, contract_title, approval_status, venue:venues(name)')
      .eq('master_id', masterId).eq('contact_id', contact.id).in('approval_status', ['pending_approval', 'approved', 'completed']).limit(100);
    const contracts = (ctr || []).map((c: any) => ({ id: c.id, code: c.contract_code, title: c.contract_title || c.contract_code, status: c.approval_status, venueName: c.venue?.name }));

    // Leads do contato (pelo vinculo ou pelo telefone)
    const keys = [last8(contact.primaryPhone), last8(contact.whatsappPhone)].filter(k => k.length === 8);
    const orParts = [`contact_id.eq.${contact.id}`, ...keys.map(k => `phone.ilike.%${k}`)];
    const { data: leadRows } = await supabase.from('leads')
      .select('id, name, code, stage, funnel_id, venue_id').eq('master_id', masterId).or(orParts.join(',')).limit(200);
    const funnelIds = Array.from(new Set((leadRows || []).map((l: any) => l.funnel_id).filter(Boolean)));
    const funnels = new Map<string, any>();
    if (funnelIds.length) {
      const { data: fs } = await supabase.from('commercial_funnels').select('id, name, stages, is_post_sale').in('id', funnelIds);
      (fs || []).forEach((f: any) => funnels.set(f.id, f));
    }
    const leads: ConversionImpact['leads'] = [];
    for (const l of leadRows || []) {
      const f = funnels.get(l.funnel_id);
      const st = Array.isArray(f?.stages) ? f.stages.find((x: any) => x.id === l.stage) : undefined;
      const closed = LOST_IDS.has(l.stage) || WON_IDS.has(l.stage) || st?.isLoss || st?.isWon;
      if (closed || f?.is_post_sale) continue;
      leads.push({ id: l.id, name: l.name, code: l.code, funnelName: f?.name, stageName: st?.name, venueId: l.venue_id });
    }

    // Clientes de pos-venda sem contrato
    const leadIds = (leadRows || []).map((l: any) => l.id);
    const cOr = [...keys.map(k => `payer_phone.ilike.%${k}`), ...(leadIds.length ? [`commercial_lead_id.in.(${leadIds.join(',')})`] : [])];
    const clients: ConversionImpact['clients'] = [];
    if (cOr.length) {
      const { data: cl } = await supabase.from('clients')
        .select('id, name, code, stage, funnel_id, contract_id').eq('master_id', masterId).or(cOr.join(',')).limit(200);
      for (const c of cl || []) {
        if (c.contract_id || CLIENT_DONE.has(c.stage)) continue;
        clients.push({ id: c.id, name: c.name, code: c.code, funnelName: funnels.get(c.funnel_id)?.name });
      }
    }
    return { contracts, leads, clients };
  },

  /** Executa a transicao (so se nao houver contrato). Apaga os ativos sem contrato e tarefas vinculadas. */
  async convert(params: { masterId: string; contactId: string; contactPhone?: string | null; whatsappPhone?: string | null; target: ConversionTarget; by: { id?: string; name?: string } }): Promise<{ success: boolean; message?: string; lostLeads?: number; lostClients?: number; deletedLeadIds?: string[] }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Sem conexão com o banco.' };
    const impact = await this.getImpact(params.masterId, { id: params.contactId, primaryPhone: params.contactPhone, whatsappPhone: params.whatsappPhone });
    if (impact.contracts.length > 0) return { success: false, message: 'Este contato tem contrato registrado e não pode ser transformado.' };

    const now = new Date().toISOString();
    const deletedLeadIds = impact.leads.map(l => l.id);
    const deletedClientIds = impact.clients.map(c => c.id);

    // Apaga tarefas vinculadas e leads comerciais em andamento (sem jogar para perdido/cancelado)
    if (deletedLeadIds.length > 0) {
      await supabase.from('admin_tasks').delete().eq('master_id', params.masterId).in('lead_id', deletedLeadIds);
      await supabase.from('leads').delete().eq('master_id', params.masterId).in('id', deletedLeadIds);
    }
    // Apaga clientes de pos-venda sem contrato
    if (deletedClientIds.length > 0) {
      await supabase.from('admin_tasks').delete().eq('master_id', params.masterId).in('lead_id', deletedClientIds);
      await supabase.from('clients').delete().eq('master_id', params.masterId).in('id', deletedClientIds);
    }

    const patch: Record<string, any> = { updated_at: now };
    if (params.target === 'supplier') patch.is_supplier = true; else patch.is_collaborator = true;
    const { error } = await supabase.from('contacts').update(patch).eq('id', params.contactId).eq('master_id', params.masterId);
    if (error) return { success: false, message: error.message };
    return { success: true, lostLeads: deletedLeadIds.length, lostClients: deletedClientIds.length, deletedLeadIds };
  },
};
