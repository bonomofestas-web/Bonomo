import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateUuid } from '../utils/uuid';
import type { SupplierQuote, SupplierQuoteStatus } from '../types/admin';

const mapRow = (r: any): SupplierQuote => ({
  id: r.id, masterId: r.master_id, contactId: r.contact_id, venueId: r.venue_id || undefined, contractId: r.contract_id || undefined,
  title: r.title, description: r.description || undefined, amount: Number(r.amount || 0), status: r.status,
  requestedByName: r.requested_by_name || undefined, decidedByName: r.decided_by_name || undefined, decidedAt: r.decided_at || undefined,
  decisionNote: r.decision_note || undefined, createdAt: r.created_at,
});

/** Orcamentos de fornecedores: sao os "ativos" do fornecedor no Contato. */
export const supplierService = {
  async getQuotes(masterId: string, contactId: string): Promise<SupplierQuote[]> {
    if (!isSupabaseConfigured || !masterId || !contactId) return [];
    const { data } = await supabase.from('supplier_quotes').select('*').eq('master_id', masterId).eq('contact_id', contactId).order('created_at', { ascending: false }).limit(500);
    return (data || []).map(mapRow);
  },

  /** Quantidade de orcamentos por status de cada fornecedor (tag na lista de contatos). */
  async getQuoteCounts(masterId: string, contactIds: string[]): Promise<Map<string, { total: number; pendente: number; aprovado: number }>> {
    const out = new Map<string, { total: number; pendente: number; aprovado: number }>();
    if (!isSupabaseConfigured || !masterId || contactIds.length === 0) return out;
    for (let i = 0; i < contactIds.length; i += 100) {
      const { data } = await supabase.from('supplier_quotes').select('contact_id, status').eq('master_id', masterId).in('contact_id', contactIds.slice(i, i + 100));
      (data || []).forEach((r: any) => {
        const e = out.get(r.contact_id) || { total: 0, pendente: 0, aprovado: 0 };
        e.total += 1; if (r.status === 'pendente') e.pendente += 1; if (r.status === 'aprovado') e.aprovado += 1;
        out.set(r.contact_id, e);
      });
    }
    return out;
  },

  async addQuote(params: { masterId: string; contactId: string; title: string; description?: string; amount: number; venueId?: string; contractId?: string; requestedByName?: string }): Promise<SupplierQuote | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.from('supplier_quotes').insert({
      id: generateUuid(), master_id: params.masterId, contact_id: params.contactId, title: params.title.trim(), description: params.description?.trim() || null,
      amount: params.amount, venue_id: params.venueId || null, contract_id: params.contractId || null, requested_by_name: params.requestedByName || null,
    }).select().single();
    if (error) { console.warn('[supplierService.addQuote]', error.message); return null; }
    return mapRow(data);
  },

  /** Aprova ou reprova o orcamento (com quem decidiu e quando). */
  async decide(masterId: string, quoteId: string, status: Exclude<SupplierQuoteStatus, 'pendente'>, by: { name?: string }, note?: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('supplier_quotes').update({
      status, decided_by_name: by.name || null, decided_at: new Date().toISOString(), decision_note: note?.trim() || null, updated_at: new Date().toISOString(),
    }).eq('id', quoteId).eq('master_id', masterId);
    return !error;
  },

  async reopen(masterId: string, quoteId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('supplier_quotes').update({ status: 'pendente', decided_by_name: null, decided_at: null, decision_note: null, updated_at: new Date().toISOString() }).eq('id', quoteId).eq('master_id', masterId);
    return !error;
  },

  async removeQuote(masterId: string, quoteId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('supplier_quotes').delete().eq('id', quoteId).eq('master_id', masterId);
    return !error;
  },
};
