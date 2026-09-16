import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Client, ClientDocument, ClientActivity } from '../types/admin';

import { isUuid, generateUuid } from '../utils/uuid';

export const clientService = {
  async getAll(): Promise<Client[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar clientes no Supabase:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        payerName: row.payer_name,
        payerRelationship: row.payer_relationship,
        payerCpf: row.payer_cpf,
        payerPhone: row.payer_phone,
        payerEmail: row.payer_email,
        payerAddress: row.payer_address,
        payerNeighborhood: row.payer_neighborhood,
        payerCity: row.payer_city,
        birthdayPersonName: row.birthday_person_name || row.name,
        birthdayPersonAge: row.birthday_person_age,
        birthdayPersonBirthdate: row.birthday_person_birthdate,
        eventType: row.event_type || '15_anos',
        eventDate: row.event_date,
        eventTime: row.event_time,
        guestCount: row.guest_count || 0,
        venueId: row.venue_id,
        venueName: row.venue_name,
        packageSold: row.package_sold,
        dealValue: Number(row.deal_value || 0),
        contractDate: row.contract_date,
        contractStatus: row.contract_status || 'aguardando_sinal',
        contractSignedAt: row.contract_signed_at,
        signalPaid: Boolean(row.signal_paid),
        signalValue: row.signal_value ? Number(row.signal_value) : undefined,
        signalPaidAt: row.signal_paid_at,
        paymentTerms: row.payment_terms,
        paymentStatus: row.payment_status,
        stage: row.stage || 'onboarding',
        contacts: (row.contacts as any) || [],
        assignedSuccessManagerId: row.assigned_success_manager_id,
        assignedSuccessManagerName: row.assigned_success_manager_name,
        debutanteId: row.debutante_id,
        debutanteSlug: row.debutante_slug,
        commercialLeadId: row.commercial_lead_id,
        commercialLeadCode: row.commercial_lead_code,
        commercialHistory: row.commercial_history,
        notes: row.notes || '',
        documents: (row.documents as ClientDocument[]) || [],
        activities: (row.activities as ClientActivity[]) || [],
        createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('Falha inesperada ao carregar clientes do Supabase:', err);
      return [];
    }
  },

  async upsert(client: Partial<Client> & { id: string }): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const clientId = isUuid(client.id) ? client.id : generateUuid();
      const payload: Record<string, any> = {
        id: clientId,
        updated_at: new Date().toISOString(),
      };

      if (client.code !== undefined) payload.code = client.code;
      if (client.name !== undefined) payload.name = client.name;
      if (client.payerName !== undefined) payload.payer_name = client.payerName;
      if (client.payerRelationship !== undefined) payload.payer_relationship = client.payerRelationship;
      if (client.payerCpf !== undefined) payload.payer_cpf = client.payerCpf;
      if (client.payerPhone !== undefined) payload.payer_phone = client.payerPhone;
      if (client.payerEmail !== undefined) payload.payer_email = client.payerEmail;
      if (client.payerAddress !== undefined) payload.payer_address = client.payerAddress;
      if (client.payerNeighborhood !== undefined) payload.payer_neighborhood = client.payerNeighborhood;
      if (client.payerCity !== undefined) payload.payer_city = client.payerCity;
      if (client.birthdayPersonName !== undefined) payload.birthday_person_name = client.birthdayPersonName;
      if (client.birthdayPersonAge !== undefined) payload.birthday_person_age = client.birthdayPersonAge;
      if (client.birthdayPersonBirthdate !== undefined) payload.birthday_person_birthdate = client.birthdayPersonBirthdate;
      if (client.eventType !== undefined) payload.event_type = client.eventType;
      if (client.eventDate !== undefined) payload.event_date = client.eventDate;
      if (client.eventTime !== undefined) payload.event_time = client.eventTime;
      if (client.guestCount !== undefined) payload.guest_count = client.guestCount;
      if (client.venueId !== undefined) payload.venue_id = isUuid(client.venueId) ? client.venueId : null;
      if (client.venueName !== undefined) payload.venue_name = client.venueName;
      if (client.packageSold !== undefined) payload.package_sold = client.packageSold;
      if (client.dealValue !== undefined) payload.deal_value = client.dealValue;
      if (client.contractDate !== undefined) payload.contract_date = client.contractDate;
      if (client.contractStatus !== undefined) payload.contract_status = client.contractStatus;
      if (client.contractSignedAt !== undefined) payload.contract_signed_at = client.contractSignedAt;
      if (client.signalPaid !== undefined) payload.signal_paid = client.signalPaid;
      if (client.signalValue !== undefined) payload.signal_value = client.signalValue;
      if (client.signalPaidAt !== undefined) payload.signal_paid_at = client.signalPaidAt;
      if (client.paymentTerms !== undefined) payload.payment_terms = client.paymentTerms;
      if (client.paymentStatus !== undefined) payload.payment_status = client.paymentStatus;
      if (client.stage !== undefined) payload.stage = client.stage;
      if (client.contacts !== undefined) payload.contacts = client.contacts;
      if (client.assignedSuccessManagerId !== undefined) payload.assigned_success_manager_id = isUuid(client.assignedSuccessManagerId) ? client.assignedSuccessManagerId : null;
      if (client.assignedSuccessManagerName !== undefined) payload.assigned_success_manager_name = client.assignedSuccessManagerName;
      if (client.debutanteId !== undefined) payload.debutante_id = isUuid(client.debutanteId) ? client.debutanteId : null;
      if (client.debutanteSlug !== undefined) payload.debutante_slug = client.debutanteSlug;
      if (client.commercialLeadId !== undefined) payload.commercial_lead_id = isUuid(client.commercialLeadId) ? client.commercialLeadId : null;
      if (client.commercialLeadCode !== undefined) payload.commercial_lead_code = client.commercialLeadCode;
      if (client.commercialHistory !== undefined) payload.commercial_history = client.commercialHistory;
      if (client.notes !== undefined) payload.notes = client.notes;
      if (client.documents !== undefined) payload.documents = client.documents;
      if (client.activities !== undefined) payload.activities = client.activities;
      if (client.createdAt !== undefined) payload.created_at = client.createdAt;

      const { error } = await supabase
        .from('clients')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar cliente no Supabase, tentando fallback seguro:', error);
        // Fallback: retry nullifying foreign key references in case of FK constraint mismatch
        if (payload.commercial_lead_id || payload.venue_id || payload.debutante_id || payload.assigned_success_manager_id) {
          const fallbackPayload = {
            ...payload,
            commercial_lead_id: null,
            venue_id: null,
            debutante_id: null,
            assigned_success_manager_id: null,
          };
          const { error: retryError } = await supabase.from('clients').upsert(fallbackPayload, { onConflict: 'id' });
          if (retryError) {
            console.error('Falha ao salvar cliente no Supabase (fallback):', retryError);
          }
        }
      }
    } catch (err) {
      console.error('Falha ao salvar cliente no Supabase:', err);
    }
  },

  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) console.error('Erro ao excluir cliente no Supabase:', error);
    } catch (err) {
      console.error('Falha ao excluir cliente:', err);
    }
  }
};
