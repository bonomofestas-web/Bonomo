import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateBase36Code } from './contactService';
import type { Proposal, ProposalStatus } from '../types/admin';

const COLUMNS = 'id, master_id, proposal_code, venue_id, lead_id, contact_id, title, event_type, event_date, guest_count, package_name, total_amount, payment_summary, client_snapshot, file_url, attachments, notes, closer_id, closer_name, sdr_id, sdr_name, status, lost_reason, converted_contract_id, converted_at, source, proposal_date, created_by_name, created_at, updated_at';

const mapRow = (r: any): Proposal => ({
  id: r.id,
  masterId: r.master_id,
  proposalCode: r.proposal_code,
  venueId: r.venue_id,
  leadId: r.lead_id,
  contactId: r.contact_id,
  title: r.title,
  eventType: r.event_type,
  eventDate: r.event_date,
  guestCount: r.guest_count,
  packageName: r.package_name,
  totalAmount: Number(r.total_amount || 0),
  paymentSummary: r.payment_summary,
  clientSnapshot: r.client_snapshot || {},
  fileUrl: r.file_url,
  attachments: Array.isArray(r.attachments) ? r.attachments : [],
  notes: r.notes,
  closerId: r.closer_id,
  closerName: r.closer_name,
  sdrId: r.sdr_id,
  sdrName: r.sdr_name,
  status: r.status as ProposalStatus,
  lostReason: r.lost_reason,
  convertedContractId: r.converted_contract_id,
  convertedAt: r.converted_at,
  source: r.source,
  proposalDate: r.proposal_date,
  createdByName: r.created_by_name,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface CreateProposalParams {
  masterId: string;
  venueId: string;
  leadId?: string | null;
  contactId?: string | null;
  title: string;
  eventType?: string;
  eventDate?: string | null;
  guestCount?: number | null;
  packageName?: string | null;
  totalAmount: number;
  paymentSummary?: string | null;
  clientSnapshot?: Record<string, any>;
  fileUrl?: string | null;
  notes?: string | null;
  closerId?: string | null;
  closerName?: string | null;
  sdrId?: string | null;
  sdrName?: string | null;
  source?: string;
  proposalDate?: string | null;
  createdByName?: string | null;
  createdById?: string | null;
}

/** Propostas comerciais: ativo documental do comercial (lead/contato) que, ao evoluir, vira contrato. Sempre escopado por master_id. */
export const proposalService = {
  async list(params: { masterId: string; status?: ProposalStatus; leadId?: string; contactId?: string }): Promise<Proposal[]> {
    if (!isSupabaseConfigured || !params.masterId) return [];
    let q = supabase.from('proposals').select(COLUMNS).eq('master_id', params.masterId).order('created_at', { ascending: false }).limit(500);
    if (params.status) q = q.eq('status', params.status);
    if (params.leadId) q = q.eq('lead_id', params.leadId);
    if (params.contactId) q = q.eq('contact_id', params.contactId);
    const { data, error } = await q;
    if (error) { console.error('[proposalService.list]', error); return []; }
    return (data || []).map(mapRow);
  },

  async create(params: CreateProposalParams): Promise<Proposal> {
    if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');
    let lastError: any = null;
    for (let tries = 0; tries < 5; tries++) {
      const { data, error } = await supabase.from('proposals').insert({
        master_id: params.masterId,
        proposal_code: generateBase36Code('PROP', 8),
        venue_id: params.venueId,
        lead_id: params.leadId || null,
        contact_id: params.contactId || null,
        title: params.title,
        event_type: params.eventType || '15_anos',
        event_date: params.eventDate || null,
        guest_count: params.guestCount ?? null,
        package_name: params.packageName || null,
        total_amount: params.totalAmount || 0,
        payment_summary: params.paymentSummary || null,
        client_snapshot: params.clientSnapshot || {},
        file_url: params.fileUrl || null,
        notes: params.notes || null,
        closer_id: params.closerId || null,
        closer_name: params.closerName || null,
        sdr_id: params.sdrId || null,
        sdr_name: params.sdrName || null,
        source: params.source || 'manual',
        proposal_date: params.proposalDate || new Date().toLocaleDateString('en-CA'),
        created_by_id: params.createdById || null,
        created_by_name: params.createdByName || null,
      }).select(COLUMNS).single();
      if (!error && data) return mapRow(data);
      lastError = error;
      if (error?.code !== '23505') break; // so repete se o codigo colidiu
    }
    throw new Error(lastError?.message || 'Não foi possível salvar a proposta.');
  },

  async update(id: string, masterId: string, patch: Partial<Pick<CreateProposalParams, 'venueId' | 'title' | 'eventType' | 'eventDate' | 'guestCount' | 'packageName' | 'totalAmount' | 'paymentSummary' | 'clientSnapshot' | 'fileUrl' | 'notes' | 'closerId' | 'closerName' | 'sdrId' | 'sdrName'>>): Promise<Proposal> {
    const row: Record<string, any> = { updated_at: new Date().toISOString() };
    if (patch.venueId !== undefined) row.venue_id = patch.venueId;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.eventType !== undefined) row.event_type = patch.eventType;
    if (patch.eventDate !== undefined) row.event_date = patch.eventDate || null;
    if (patch.guestCount !== undefined) row.guest_count = patch.guestCount;
    if (patch.packageName !== undefined) row.package_name = patch.packageName || null;
    if (patch.totalAmount !== undefined) row.total_amount = patch.totalAmount;
    if (patch.paymentSummary !== undefined) row.payment_summary = patch.paymentSummary || null;
    if (patch.clientSnapshot !== undefined) row.client_snapshot = patch.clientSnapshot;
    if (patch.fileUrl !== undefined) row.file_url = patch.fileUrl || null;
    if (patch.notes !== undefined) row.notes = patch.notes || null;
    if (patch.closerId !== undefined) { row.closer_id = patch.closerId || null; row.closer_name = patch.closerName || null; }
    if (patch.sdrId !== undefined) { row.sdr_id = patch.sdrId || null; row.sdr_name = patch.sdrName || null; }
    const { data, error } = await supabase.from('proposals').update(row).eq('id', id).eq('master_id', masterId).eq('status', 'active').select(COLUMNS).single();
    if (error || !data) throw new Error(error?.message || 'Proposta não encontrada ou já encerrada.');
    return mapRow(data);
  },

  async markLost(id: string, masterId: string, reason?: string): Promise<void> {
    const { error } = await supabase.from('proposals').update({ status: 'lost', lost_reason: reason || null, updated_at: new Date().toISOString() }).eq('id', id).eq('master_id', masterId).eq('status', 'active');
    if (error) throw new Error(error.message);
  },

  async reopen(id: string, masterId: string): Promise<void> {
    const { error } = await supabase.from('proposals').update({ status: 'active', lost_reason: null, updated_at: new Date().toISOString() }).eq('id', id).eq('master_id', masterId).eq('status', 'lost');
    if (error) throw new Error(error.message);
  },

  /** A proposta "morre" ao virar contrato: fica registrada como convertida, ligada ao contrato que nasceu dela. */
  async markConverted(id: string, masterId: string, contractId: string): Promise<void> {
    const { error } = await supabase.from('proposals').update({ status: 'converted', converted_contract_id: contractId, converted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).eq('master_id', masterId).eq('status', 'active');
    if (error) throw new Error(error.message);
  },
};
