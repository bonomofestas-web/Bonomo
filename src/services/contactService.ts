import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid } from '../utils/uuid';
import type { Contact, ContactDependent, Lead, Contract } from '../types/admin';
import { whatsappMediaService } from './whatsappMediaService';

// Gerador client-side Base36 de alta capacidade para códigos alfanuméricos
export function generateBase36Code(prefix: string, length: number = 8): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}

export interface GetContactsParams {
  masterId: string;
  venueIds?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Filtro `.or()` do PostgREST para a busca de contatos NO BANCO.
 * Nome, e-mail e código por texto; telefones e CPF pelas colunas só-dígitos (casam com ou sem máscara/DDI).
 * Retorna undefined quando não há termo.
 */
export function buildContactSearchFilter(search?: string): string | undefined {
  const raw = (search || '').trim();
  if (!raw) return undefined;
  // vírgula, parênteses e aspas quebram a sintaxe do .or(); % e _ são curingas do ilike
  const text = raw.replace(/[,()"\\%_]/g, ' ').replace(/\s+/g, ' ').trim();
  const digits = raw.replace(/\D/g, '');
  const parts: string[] = [];
  if (text) {
    parts.push(`name.ilike.%${text}%`, `email.ilike.%${text}%`, `code.ilike.%${text}%`);
  }
  if (digits.length >= 3) {
    parts.push(
      `primary_phone_digits.ilike.%${digits}%`,
      `secondary_phone_digits.ilike.%${digits}%`,
      `cpf_digits.ilike.%${digits}%`
    );
  }
  return parts.length > 0 ? parts.join(',') : undefined;
}

/** Parentesco inverso (A e X de B  =>  B e Y de A). Usado para gravar o vinculo familiar nos dois sentidos. */
export function reciprocalKinship(kinship: string): string {
  const k = (kinship || '').toLowerCase();
  if (k.includes('filh')) return 'Pai/Mãe';
  if (k.includes('pai') || k.includes('mãe') || k.includes('mae')) return 'Filho(a) / Debutante';
  if (k.includes('cônjuge') || k.includes('conjuge') || k.includes('noiv')) return 'Cônjuge / Noivo(a)';
  if (k.includes('irm')) return 'Irmão(ã)';
  return 'Familiar';
}

/** Lançado quando já existe contato com o mesmo telefone ou CPF no Master. Carrega o contato existente. */
export class ContactDuplicateError extends Error {
  existing: Contact | null;
  constructor(existing: Contact | null, message?: string) {
    super(message || (existing ? `Já cadastrado: ${existing.name}` : 'Já existe um contato com este telefone ou CPF.'));
    this.name = 'ContactDuplicateError';
    this.existing = existing;
  }
}

export const contactService = {
  /**
   * Busca lista paginada e filtrada de contatos respeitando estritamente o isolamento master_id
   */
  async getContacts({
    masterId,
    venueIds,
    search,
    limit = 50,
    offset = 0,
  }: GetContactsParams): Promise<Contact[]> {
    if (!isSupabaseConfigured || !masterId) return [];

    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('master_id', masterId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Busca no banco (nome, e-mail, código, telefones e CPF com ou sem máscara)
      const searchFilter = buildContactSearchFilter(search);
      if (searchFilter) query = query.or(searchFilter);

      // Filtro de unidades físicas (Multi-Venues via contact_venue_access)
      if (venueIds && venueIds.length > 0) {
        const { data: accessRows } = await supabase
          .from('contact_venue_access')
          .select('contact_id')
          .eq('master_id', masterId)
          .in('venue_id', venueIds);

        const allowedContactIds = (accessRows || []).map(r => r.contact_id);
        if (allowedContactIds.length === 0) return [];

        query = query.in('id', allowedContactIds);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar contatos:', error);
        return [];
      }

      return (data || []).map(mapRowToContact);
    } catch (err) {
      console.error('Exceção em contactService.getContacts:', err);
      return [];
    }
  },

  /**
   * Total REAL de contatos no banco (mesmos filtros do getContacts, sem paginação).
   * É este número que as telas mostram — nunca o tamanho da lista carregada.
   */
  async countContacts({
    masterId,
    venueIds,
    search,
  }: { masterId: string; venueIds?: string[]; search?: string }): Promise<number> {
    if (!isSupabaseConfigured || !masterId) return 0;

    try {
      let query = supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('master_id', masterId)
        .is('deleted_at', null);

      const searchFilter = buildContactSearchFilter(search);
      if (searchFilter) query = query.or(searchFilter);

      if (venueIds && venueIds.length > 0) {
        const { data: accessRows } = await supabase
          .from('contact_venue_access')
          .select('contact_id')
          .eq('master_id', masterId)
          .in('venue_id', venueIds);
        const allowedContactIds = (accessRows || []).map(r => r.contact_id);
        if (allowedContactIds.length === 0) return 0;
        query = query.in('id', allowedContactIds);
      }

      const { count, error } = await query;
      if (error) {
        console.error('Erro ao contar contatos:', error);
        return 0;
      }
      return count ?? 0;
    } catch (err) {
      console.error('Exceção em contactService.countContacts:', err);
      return 0;
    }
  },

  /**
   * Localiza contatos do Master pelos telefones informados, em lotes (sem o teto de 500 contatos da busca geral).
   * Casa por tolerância de telefone (nono dígito/DDI) com `isPhoneMatch`. Retorna mapa telefone(dígitos) -> contato.
   */
  async findByPhones(masterId: string, phones: string[]): Promise<Map<string, Contact>> {
    const found = new Map<string, Contact>();
    if (!isSupabaseConfigured || !masterId || phones.length === 0) return found;
    const { isPhoneMatch } = await import('./leadService');
    const unique = Array.from(new Set(phones.map(p => p.replace(/\D/g, '')).filter(p => p.length >= 8)));

    for (let i = 0; i < unique.length; i += 20) {
      const chunk = unique.slice(i, i + 20);
      // Últimos 4 dígitos: robusto a máscaras como "(21) 99999-9999"; o casamento exato é refeito em memória
      const orFilter = chunk
        .flatMap(p => [`primary_phone.ilike.%${p.slice(-4)}%`, `whatsapp_phone.ilike.%${p.slice(-4)}%`])
        .join(',');
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('master_id', masterId)
        .is('deleted_at', null)
        .or(orFilter)
        .limit(1000);
      if (error) { console.warn('findByPhones:', error.message); continue; }
      const contacts = (data || []).map(mapRowToContact);
      for (const phone of chunk) {
        const match = contacts.find(c => isPhoneMatch(phone, c.primaryPhone) || isPhoneMatch(phone, c.whatsappPhone));
        if (match) found.set(phone, match);
      }
    }
    return found;
  },

  /**
   * Obtém detalhes completos de um contato, incluindo dependentes e unidades
   */
  async getContactById(id: string, masterId: string): Promise<Contact | null> {
    if (!isSupabaseConfigured || !id || !masterId) return null;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .eq('master_id', masterId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error || !data) {
        if (error) console.error('Erro ao buscar contato por ID:', error);
        return null;
      }

      const contact = mapRowToContact(data);

      // Carrega dependentes vinculados
      const { data: depRows } = await supabase
        .from('contact_dependents')
        .select(`
          id,
          master_id,
          parent_contact_id,
          dependent_contact_id,
          kinship,
          created_at,
          dependent_contact:contacts!contact_dependents_dependent_contact_id_fkey(*)
        `)
        .eq('parent_contact_id', id)
        .eq('master_id', masterId);

      if (depRows) {
        contact.dependents = depRows.map((r: any) => ({
          id: r.id,
          masterId: r.master_id,
          parentContactId: r.parent_contact_id,
          dependentContactId: r.dependent_contact_id,
          kinship: r.kinship,
          createdAt: r.created_at,
          dependentContact: r.dependent_contact ? mapRowToContact(r.dependent_contact) : undefined,
        }));
      }

      // Carrega unidades vinculadas
      const { data: venueRows } = await supabase
        .from('contact_venue_access')
        .select('venue_id')
        .eq('contact_id', id)
        .eq('master_id', masterId);

      if (venueRows) {
        contact.venueIds = venueRows.map(v => v.venue_id);
      }

      return contact;
    } catch (err) {
      console.error('Exceção em contactService.getContactById:', err);
      return null;
    }
  },

  /** Procura contato existente do Master por telefone (principal/secundário, com tolerância) e/ou CPF. */
  async findExisting(masterId: string, ref: { phones?: Array<string | null | undefined>; cpf?: string | null }): Promise<Contact | null> {
    if (!isSupabaseConfigured || !masterId) return null;
    const phones = (ref.phones || []).map(p => (p || '').replace(/\D/g, '')).filter(p => p.length >= 8);
    if (phones.length) {
      const map = await this.findByPhones(masterId, phones);
      for (const p of phones) { const c = map.get(p); if (c) return c; }
    }
    const cpfDigits = (ref.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length === 11) {
      const { data } = await supabase
        .from('contacts').select('*')
        .eq('master_id', masterId).is('deleted_at', null).eq('cpf_digits', cpfDigits).limit(1).maybeSingle();
      if (data) return mapRowToContact(data);
    }
    return null;
  },

  /**
   * ÚNICA porta de entrada para criar contato: devolve o existente (completando só campos vazios) ou cria.
   */
  async findOrCreateContact(
    data: Partial<Contact> & { masterId: string; venueId?: string }
  ): Promise<{ contact: Contact; created: boolean }> {
    const existing = await this.findExisting(data.masterId, { phones: [data.primaryPhone, data.secondaryPhone], cpf: data.cpf });
    if (existing) {
      const fill: Partial<Contact> = {};
      if (!existing.email && data.email?.trim()) fill.email = data.email.trim();
      if (!existing.cpf && data.cpf?.trim()) fill.cpf = data.cpf.trim();
      if (!existing.secondaryPhone && data.secondaryPhone?.trim()) fill.secondaryPhone = data.secondaryPhone.trim();
      let contact = existing;
      if (Object.keys(fill).length) {
        try { contact = (await this.updateContact(existing.id, data.masterId, fill)) || existing; } catch { /* mantém o existente */ }
      }
      if (data.venueId && isUuid(data.venueId)) {
        await supabase.from('contact_venue_access')
          .upsert({ master_id: data.masterId, contact_id: contact.id, venue_id: data.venueId }, { onConflict: 'contact_id,venue_id' });
      }
      return { contact, created: false };
    }
    try {
      const created = await this.createContact(data);
      if (!created) throw new Error('Falha ao salvar contato.');
      return { contact: created, created: true };
    } catch (err) {
      // Corrida: outro cadastro criou entre a checagem e o insert
      if (err instanceof ContactDuplicateError && err.existing) return { contact: err.existing, created: false };
      throw err;
    }
  },

  /**
   * Cria um novo contato na Central de Contatos. Recusa duplicado (telefone/CPF) com ContactDuplicateError.
   */
  async createContact(
    data: Partial<Contact> & { masterId: string; venueId?: string }
  ): Promise<Contact | null> {
    if (!isSupabaseConfigured || !data.masterId || !data.name || !data.primaryPhone) {
      throw new Error('Nome, telefone principal e masterId são obrigatórios para criar um contato.');
    }

    try {
      const dup = await this.findExisting(data.masterId, { phones: [data.primaryPhone, data.secondaryPhone], cpf: data.cpf });
      if (dup) throw new ContactDuplicateError(dup);

      const code = data.code || generateBase36Code('CONT', 8);
      const payload: Record<string, any> = {
        master_id: data.masterId,
        code,
        name: data.name.trim(),
        nickname: data.nickname?.trim() || null,
        primary_phone: data.primaryPhone.trim(),
        secondary_phone: data.secondaryPhone?.trim() || null,
        email: data.email?.trim() || null,
        cpf: data.cpf?.trim() || null,
        rg: data.rg?.trim() || null,
        birth_date: data.birthDate || null,
        profile_picture_url: data.profilePictureUrl || null,
        postal_code: data.postalCode || null,
        street: data.street || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        relationship_role: data.relationshipRole || 'Titular',
        notes: data.notes || null,
        custom_fields: data.customFields || {},
      };

      const { data: created, error } = await supabase
        .from('contacts')
        .insert(payload)
        .select()
        .single();

      if (error?.code === '23505') {
        const again = await this.findExisting(data.masterId, { phones: [data.primaryPhone, data.secondaryPhone], cpf: data.cpf });
        throw new ContactDuplicateError(again);
      }
      if (error || !created) {
        console.error('Erro ao criar contato:', error);
        throw new Error(error?.message || 'Falha ao salvar contato.');
      }

      // Vincula à unidade de origem se informada
      if (data.venueId && isUuid(data.venueId)) {
        await supabase
          .from('contact_venue_access')
          .insert({
            master_id: data.masterId,
            contact_id: created.id,
            venue_id: data.venueId,
          })
          .maybeSingle();
      }

      return mapRowToContact(created);
    } catch (err: any) {
      console.error('Exceção em contactService.createContact:', err);
      throw err;
    }
  },

  /**
   * Atualiza dados cadastrais de um contato existente
   */
  async updateContact(
    id: string,
    masterId: string,
    updates: Partial<Contact>
  ): Promise<Contact | null> {
    if (!isSupabaseConfigured || !id || !masterId) return null;

    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.nickname !== undefined) payload.nickname = updates.nickname?.trim() || null;
      if (updates.primaryPhone !== undefined) payload.primary_phone = updates.primaryPhone.trim();
      if (updates.secondaryPhone !== undefined) payload.secondary_phone = updates.secondaryPhone?.trim() || null;
      if (updates.email !== undefined) payload.email = updates.email?.trim() || null;
      if (updates.cpf !== undefined) payload.cpf = updates.cpf?.trim() || null;
      if (updates.rg !== undefined) payload.rg = updates.rg?.trim() || null;
      if (updates.birthDate !== undefined) payload.birth_date = updates.birthDate || null;
      if (updates.profilePictureUrl !== undefined) payload.profile_picture_url = updates.profilePictureUrl || null;
      if (updates.postalCode !== undefined) payload.postal_code = updates.postalCode || null;
      if (updates.street !== undefined) payload.street = updates.street || null;
      if (updates.number !== undefined) payload.number = updates.number || null;
      if (updates.complement !== undefined) payload.complement = updates.complement || null;
      if (updates.neighborhood !== undefined) payload.neighborhood = updates.neighborhood || null;
      if (updates.city !== undefined) payload.city = updates.city || null;
      if (updates.state !== undefined) payload.state = updates.state || null;
      if (updates.relationshipRole !== undefined) payload.relationship_role = updates.relationshipRole || null;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      if (updates.customFields !== undefined) payload.custom_fields = updates.customFields;

      const { data, error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', id)
        .eq('master_id', masterId)
        .select()
        .single();

      if (error || !data) {
        console.error('Erro ao atualizar contato:', error);
        return null;
      }

      return mapRowToContact(data);
    } catch (err) {
      console.error('Exceção em contactService.updateContact:', err);
      return null;
    }
  },

  /**
   * Exclusão com proteção rígida de ativos:
   * Bloqueia a exclusão se houver leads ativos ou contratos vigentes vinculados ao contato.
   */
  async deleteContact(id: string, masterId: string): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured || !id || !masterId) {
      return { success: false, message: 'Parâmetros inválidos.' };
    }

    try {
      // 1. Verifica Leads ativos vinculados
      const { count: leadsCount, error: errLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', id)
        .eq('master_id', masterId)
        .neq('is_archived', true);

      if (errLeads) {
        console.error('Erro ao verificar leads do contato:', errLeads);
      }

      // 2. Verifica Contratos ativos vinculados
      const { count: contractsCount, error: errContracts } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', id)
        .eq('master_id', masterId)
        .neq('approval_status', 'canceled');

      if (errContracts) {
        console.error('Erro ao verificar contratos do contato:', errContracts);
      }

      const activeLeads = leadsCount || 0;
      const activeContracts = contractsCount || 0;

      // Bloqueio de segurança se houver ativos vigentes
      if (activeLeads > 0 || activeContracts > 0) {
        return {
          success: false,
          message: `Não é possível excluir este contato: existem ativos vigentes vinculados (${activeLeads} lead(s) em funil comercial e ${activeContracts} contrato(s)). Encerre ou arquive os ativos antes de prosseguir.`,
        };
      }

      // Busca o code do contato para o cascade do avatar no R2
      const { data: contactData } = await supabase
        .from('contacts')
        .select('code')
        .eq('id', id)
        .eq('master_id', masterId)
        .single();

      // Exclusão lógica segura
      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('master_id', masterId);

      if (error) {
        return { success: false, message: error.message };
      }

      // Cascade: remove avatar do R2 (falha silenciosa — foto órfã não é crítico)
      if (contactData?.code) {
        whatsappMediaService.deleteContactAvatar(masterId, contactData.code).catch(() => { });
      }

      return { success: true };
    } catch (err: any) {
      console.error('Exceção em contactService.deleteContact:', err);
      return { success: false, message: err.message || 'Erro inesperado ao excluir contato.' };
    }
  },

  /**
   * Obtém os ativos vinculados ao contato (Leads e Contratos) para visão 360 na ficha
   */
  async getContactAssets(
    contactId: string,
    masterId: string
  ): Promise<{ leads: Lead[]; contracts: Contract[] }> {
    if (!isSupabaseConfigured || !contactId || !masterId) {
      return { leads: [], contracts: [] };
    }

    try {
      const [leadsRes, contractsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('contact_id', contactId)
          .eq('master_id', masterId)
          .order('created_at', { ascending: false }),
        supabase
          .from('contracts')
          .select('*')
          .eq('contact_id', contactId)
          .eq('master_id', masterId)
          .order('created_at', { ascending: false }),
      ]);

      const leads: Lead[] = (leadsRes.data || []).map((r: any) => ({
        id: r.id,
        masterId: r.master_id,
        code: r.code,
        commercialCode: r.commercial_code,
        contactId: r.contact_id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        venueId: r.venue_id,
        venueName: r.venue_name,
        funnelId: r.funnel_id,
        stage: r.stage,
        dealValue: r.deal_value ? Number(r.deal_value) : undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        debutanteId: r.debutante_id,
        debutanteName: r.debutante_name,
        debutanteSlug: r.debutante_slug,
        age: r.age || 15,
        group: r.group || '',
        isValidated: r.is_validated ?? false,
        pointsGranted: r.points_granted || 0,
        participants: [],
        tasks: [],
        activities: [],
      }));

      const contracts: Contract[] = (contractsRes.data || []).map((r: any) => ({
        id: r.id,
        masterId: r.master_id,
        contractCode: r.contract_code,
        contactId: r.contact_id,
        originLeadId: r.origin_lead_id,
        originFunnelId: r.origin_funnel_id,
        venueId: r.venue_id,
        eventType: r.event_type,
        eventTitle: r.event_title,
        eventDate: r.event_date,
        eventTime: r.event_time,
        guestCount: r.guest_count,
        packageName: r.package_name,
        clientSnapshot: r.client_snapshot || {},
        commercialFieldsSnapshot: r.commercial_fields_snapshot || {},
        totalAmount: Number(r.total_amount || 0),
        paymentTerms: r.payment_terms,
        sdrId: r.sdr_id,
        sdrName: r.sdr_name || '',
        closerId: r.closer_id,
        closerName: r.closer_name || '',
        approvalStatus: r.approval_status,
        submittedBy: r.submitted_by,
        submittedAt: r.submitted_at,
        approvedBy: r.approved_by,
        approvedByName: r.approved_by_name,
        approvedByRole: r.approved_by_role,
        approvedAt: r.approved_at,
        rejectionReason: r.rejection_reason,
        targetPosSaleFunnelIds: r.target_pos_sale_funnel_ids || [],
        debutanteId: r.debutante_id,
        debutanteSlug: r.debutante_slug,
        handoverNotes: r.handover_notes,
        contractFileUrl: r.contract_file_url,
        attachments: r.attachments || [],
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      return { leads, contracts };
    } catch (err) {
      console.error('Exceção em getContactAssets:', err);
      return { leads: [], contracts: [] };
    }
  },

  /**
   * Vincula um dependente a um contato titular
   */
  async addContactDependent(params: {
    masterId: string;
    parentContactId: string;
    dependentContactId: string;
    kinship: string;
  }): Promise<ContactDependent | null> {
    if (!isSupabaseConfigured || !params.masterId) return null;

    try {
      const { data, error } = await supabase
        .from('contact_dependents')
        .insert({
          master_id: params.masterId,
          parent_contact_id: params.parentContactId,
          dependent_contact_id: params.dependentContactId,
          kinship: params.kinship.trim(),
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Erro ao adicionar dependente:', error);
        return null;
      }

      return {
        id: data.id,
        masterId: data.master_id,
        parentContactId: data.parent_contact_id,
        dependentContactId: data.dependent_contact_id,
        kinship: data.kinship,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('Exceção em addContactDependent:', err);
      return null;
    }
  },

  /**
   * Cadastra alguem do grupo familiar de um contato.
   * - Se a pessoa ja existe nos contatos (telefone ou CPF, dentro do mesmo Master), reconhece e reaproveita; senao cria o contato.
   * - O vinculo e gravado nos DOIS sentidos: A entra no grupo familiar de B e B entra no de A.
   * Idempotente: repetir nao duplica.
   */
  async linkFamilyMember(params: {
    masterId: string;
    parentContactId: string;
    name: string;
    phone?: string;
    cpf?: string;
    email?: string;
    birthDate?: string;
    notes?: string;
    kinship: string;
    venueId?: string;
    /** Telefone provisorio quando a pessoa ainda nao tem numero proprio. */
    fallbackPhone?: string;
  }): Promise<{ contact: Contact; created: boolean; dependent: ContactDependent | null } | null> {
    if (!isSupabaseConfigured || !params.masterId || !params.parentContactId || !params.name.trim()) return null;
    try {
      const digits = (params.phone || '').replace(/\D/g, '');
      let contact: Contact | null = null;

      if (digits.length >= 8) {
        const found = await this.findByPhones(params.masterId, [digits]);
        contact = found.get(digits) || Array.from(found.values())[0] || null;
      }
      const cpfRaw = (params.cpf || '').trim();
      if (!contact && cpfRaw) {
        const cpfDigits = cpfRaw.replace(/\D/g, '');
        const variants = Array.from(new Set([cpfRaw, cpfDigits].filter(Boolean)));
        const { data } = await supabase
          .from('contacts').select('*').eq('master_id', params.masterId).is('deleted_at', null).in('cpf', variants).limit(1);
        if (data && data.length > 0) contact = mapRowToContact(data[0]);
      }

      let created = false;
      if (!contact) {
        const primaryPhone = digits.length >= 8 ? digits : (params.fallbackPhone || '');
        if (!primaryPhone) return null;
        const res = await this.findOrCreateContact({
          masterId: params.masterId,
          name: params.name.trim(),
          primaryPhone,
          email: params.email,
          cpf: cpfRaw || undefined,
          birthDate: params.birthDate || undefined,
          relationshipRole: params.kinship,
          notes: params.notes,
          venueId: params.venueId,
        });
        contact = res.contact;
        created = res.created;
      }
      if (!contact || contact.id === params.parentContactId) return null;

      const { error } = await supabase.from('contact_dependents').upsert([
        { master_id: params.masterId, parent_contact_id: params.parentContactId, dependent_contact_id: contact.id, kinship: params.kinship.trim() },
        { master_id: params.masterId, parent_contact_id: contact.id, dependent_contact_id: params.parentContactId, kinship: reciprocalKinship(params.kinship) },
      ], { onConflict: 'parent_contact_id,dependent_contact_id', ignoreDuplicates: true });
      if (error) {
        console.error('Erro ao vincular grupo familiar:', error);
        return null;
      }

      const { data: row } = await supabase
        .from('contact_dependents').select('*').eq('master_id', params.masterId)
        .eq('parent_contact_id', params.parentContactId).eq('dependent_contact_id', contact.id).maybeSingle();
      const dependent: ContactDependent | null = row ? {
        id: row.id, masterId: row.master_id, parentContactId: row.parent_contact_id,
        dependentContactId: row.dependent_contact_id, kinship: row.kinship, createdAt: row.created_at, dependentContact: contact,
      } : null;
      return { contact, created, dependent };
    } catch (err) {
      console.error('Exceção em linkFamilyMember:', err);
      return null;
    }
  },

  /**
   * Remove vínculo de dependente
   */
  async removeContactDependent(id: string, masterId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !id || !masterId) return false;

    try {
      const { error } = await supabase
        .from('contact_dependents')
        .delete()
        .eq('id', id)
        .eq('master_id', masterId);

      return !error;
    } catch (err) {
      console.error('Exceção em removeContactDependent:', err);
      return false;
    }
  },
};

function mapRowToContact(row: any): Contact {
  return {
    id: row.id,
    masterId: row.master_id,
    code: row.code,
    name: row.name,
    nickname: row.nickname,
    primaryPhone: row.primary_phone,
    secondaryPhone: row.secondary_phone,
    email: row.email,
    cpf: row.cpf,
    rg: row.rg,
    birthDate: row.birth_date,
    profilePictureUrl: row.profile_picture_url,
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    familyGroupId: row.family_group_id,
    relationshipRole: row.relationship_role || 'Titular',
    notes: row.notes,
    customFields: row.custom_fields || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
