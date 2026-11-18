import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Client, ClientDocument, ClientActivity } from '../types/admin';
import { generateBase36Code } from './contactService';
import { isUuid, generateUuid } from '../utils/uuid';

const cleanDate = (d?: string | null): string | null => {
  if (!d || typeof d !== 'string') return null;
  const trimmed = d.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return null;
  // Se for ISO string (ex: '2026-11-03T12:00:00.000Z'), extrai apenas 'YYYY-MM-DD' para colunas do tipo DATE no Postgres
  if (trimmed.includes('T')) {
    const onlyDate = trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) return onlyDate;
  }
  return trimmed;
};

export const clientService = {
  async getAll(masterId?: string): Promise<Client[]> {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (masterId) {
        query = query.eq('master_id', masterId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar clientes no Supabase:', error);
        return [];
      }

      return (data || []).map(row => {
        const commHist = row.commercial_history && typeof row.commercial_history === 'object' && !Array.isArray(row.commercial_history) ? row.commercial_history : {};
        const rawName = row.name || '';
        let parsedPayer = row.payer_name || commHist.payerName;
        let parsedBirthday = row.birthday_person_name || commHist.birthdayPersonName;

        // Extração inteligente de Protagonista / Debutante quando embutido no título (ex: "Camila (15A Livia 04/02/28)")
        if ((!parsedBirthday || parsedBirthday === rawName) && rawName && /\(15A?\s+([^0-9)]+)/i.test(rawName)) {
          const match = rawName.match(/\(15A?\s+([^0-9)]+)/i);
          if (match && match[1]) {
            parsedBirthday = match[1].trim();
          }
        }

        if (!parsedPayer && rawName) {
          parsedPayer = rawName
            .replace(/\(15A?[^)]*\)/gi, '')
            .replace(/•\s*15\s*Anos/gi, '')
            .replace(/•\s*Casamento/gi, '')
            .replace(/•\s*Infantil/gi, '')
            .replace(/\((mother|father|mae|mãe|pai|aniversariante|debutante|responsavel|responsável|outro|decisor)\)/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        }

        return {
          id: row.id,
          masterId: row.master_id,
          code: row.code,
          name: rawName,
          payerName: parsedPayer || rawName,
          payerRelationship: row.payer_relationship || (rawName && /\((mother|mae|mãe)\)/i.test(rawName) ? 'Mãe' : (rawName && /\((father|pai)\)/i.test(rawName) ? 'Pai' : undefined)),
          payerCpf: row.payer_cpf || commHist.payerCpf,
          payerPhone: row.payer_phone || commHist.payerPhone,
          payerEmail: row.payer_email || commHist.payerEmail,
          payerAddress: row.payer_address || commHist.payerAddress,
          payerNeighborhood: row.payer_neighborhood || commHist.payerNeighborhood,
          payerCity: row.payer_city,
          birthdayPersonName: parsedBirthday || '',
          birthdayPersonAge: row.birthday_person_age,
          birthdayPersonBirthdate: row.birthday_person_birthdate || commHist.birthdayPersonBirthdate,
          birthdayPersonPhone: (row as any).birthday_person_phone || commHist.birthdayPersonPhone,
          eventType: row.event_type || '',
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
          signalPaid: Boolean(row.signal_paid ?? commHist.signalPaid),
          signalValue: row.signal_value ? Number(row.signal_value) : (commHist.signalValue ? Number(commHist.signalValue) : undefined),
          contractDownPayment: row.contract_down_payment !== undefined && row.contract_down_payment !== null 
            ? Number(row.contract_down_payment) 
            : (row.signal_value ? Number(row.signal_value) : (commHist.contractDownPayment ? Number(commHist.contractDownPayment) : (commHist.signalValue ? Number(commHist.signalValue) : undefined))),
          contractInstallmentsRemaining: row.contract_installments_remaining !== undefined && row.contract_installments_remaining !== null 
            ? Number(row.contract_installments_remaining) 
            : (commHist.contractInstallmentsRemaining ? Number(commHist.contractInstallmentsRemaining) : undefined),
          contractInstallmentsCount: row.contract_installments_count !== undefined && row.contract_installments_count !== null 
            ? Number(row.contract_installments_count) 
            : (commHist.contractInstallmentsCount ? Number(commHist.contractInstallmentsCount) : undefined),
          signalPaidAt: row.signal_paid_at,
          paymentTerms: row.payment_terms || commHist.paymentTerms,
          paymentStatus: row.payment_status,
          stage: row.stage || 'onboarding',
          funnelId: row.funnel_id || (row as any).funnelId || (row.commercial_history as any)?.funnelId || undefined,
          contacts: (row.contacts as any) || commHist.contacts || [],
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
          upsellSales: (row.upsell_sales as any) || [],
          baseContractValue: row.base_contract_value 
            ? Number(row.base_contract_value) 
            : (commHist.baseContractValue ? Number(commHist.baseContractValue) : Number(row.deal_value || 0)),
          funnelEnteredAt: row.funnel_entered_at || (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          tags: (row.tags as string[]) || [],
          contractTitle: row.contract_title || commHist.contractTitle || undefined,
          hasCreditCard: row.has_credit_card !== undefined && row.has_credit_card !== null 
            ? Boolean(row.has_credit_card) 
            : (commHist.hasCreditCard !== undefined ? Boolean(commHist.hasCreditCard) : undefined),
          profession: row.profession || commHist.profession || undefined,
          eventYear: row.event_year || commHist.eventYear || undefined,
          createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        };
      });
    } catch (err) {
      console.error('Falha inesperada ao carregar clientes do Supabase:', err);
      return [];
    }
  },

  async upsert(client: Partial<Client> & { id: string }, masterId?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const clientId = isUuid(client.id) ? client.id : generateUuid();
      const payload: Record<string, any> = {
        id: clientId,
        updated_at: new Date().toISOString(),
      };

      // Blindagem estrita de Tenant: Resolve e valida master_id
      let effectiveMasterId = (client.masterId && isUuid(client.masterId))
        ? client.masterId
        : ((client as any).master_id && isUuid((client as any).master_id)
            ? (client as any).master_id
            : (masterId && isUuid(masterId) ? masterId : null));

      if (!effectiveMasterId && client.venueId && isUuid(client.venueId)) {
        const { data: v } = await supabase.from('venues').select('master_id').eq('id', client.venueId).maybeSingle();
        if (v?.master_id && isUuid(v.master_id)) {
          effectiveMasterId = v.master_id;
        }
      }

      if (!effectiveMasterId && client.commercialLeadId && isUuid(client.commercialLeadId)) {
        const { data: l } = await supabase.from('leads').select('master_id').eq('id', client.commercialLeadId).maybeSingle();
        if (l?.master_id && isUuid(l.master_id)) {
          effectiveMasterId = l.master_id;
        }
      }

      if (!effectiveMasterId && isUuid(client.id)) {
        const { data: existingClient } = await supabase.from('clients').select('master_id').eq('id', client.id).maybeSingle();
        if (existingClient?.master_id && isUuid(existingClient.master_id)) {
          effectiveMasterId = existingClient.master_id;
        }
      }

      // REGRA SUPREMA DE BLINDAGEM MULTI-TENANT: Bloqueia gravação de cliente sem master_id
      if (!effectiveMasterId || !isUuid(effectiveMasterId)) {
        console.error('❌ Bloqueio de Segurança Multi-Tenant: Tentativa de upsert de client sem master_id válido.');
        return;
      }

      payload.master_id = effectiveMasterId;
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
      if (client.birthdayPersonBirthdate !== undefined) payload.birthday_person_birthdate = cleanDate(client.birthdayPersonBirthdate);
      if (client.eventType !== undefined) payload.event_type = client.eventType;
      if (client.eventDate !== undefined) payload.event_date = cleanDate(client.eventDate);
      if (client.eventTime !== undefined) payload.event_time = client.eventTime;
      if (client.guestCount !== undefined) payload.guest_count = client.guestCount;
      if (client.venueId !== undefined) payload.venue_id = isUuid(client.venueId) ? client.venueId : null;
      if (client.venueName !== undefined) payload.venue_name = client.venueName;
      if (client.packageSold !== undefined) payload.package_sold = client.packageSold;
      if (client.dealValue !== undefined) payload.deal_value = client.dealValue;
      if (client.baseContractValue !== undefined) payload.base_contract_value = client.baseContractValue;
      if (client.contractDate !== undefined) payload.contract_date = cleanDate(client.contractDate);
      if (client.contractStatus !== undefined) payload.contract_status = client.contractStatus;
      if (client.contractSignedAt !== undefined) payload.contract_signed_at = cleanDate(client.contractSignedAt);
      if (client.signalPaid !== undefined) payload.signal_paid = client.signalPaid;
      if (client.signalValue !== undefined) payload.signal_value = client.signalValue;
      if (client.contractDownPayment !== undefined) payload.contract_down_payment = client.contractDownPayment;
      if (client.contractInstallmentsRemaining !== undefined) payload.contract_installments_remaining = client.contractInstallmentsRemaining;
      if (client.contractInstallmentsCount !== undefined) payload.contract_installments_count = client.contractInstallmentsCount;
      if (client.signalPaidAt !== undefined) payload.signal_paid_at = cleanDate(client.signalPaidAt);
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
      if (client.funnelId !== undefined) {
        payload.funnel_id = isUuid(client.funnelId) ? client.funnelId : null;
      }

      // Espelho resiliente em commercial_history (JSONB nativo) contra perda por colunas Postgres não migradas
      payload.commercial_history = {
        ...((typeof payload.commercial_history === 'object' && !Array.isArray(payload.commercial_history)) ? payload.commercial_history : {}),
        ...((typeof client.commercialHistory === 'object' && !Array.isArray(client.commercialHistory)) ? client.commercialHistory : {}),
        funnelId: client.funnelId !== undefined ? client.funnelId : ((payload.commercial_history as any)?.funnelId),
        hasCreditCard: (client as any).hasCreditCard !== undefined ? (client as any).hasCreditCard : ((payload.commercial_history as any)?.hasCreditCard),
        contractDownPayment: client.contractDownPayment !== undefined ? client.contractDownPayment : ((payload.commercial_history as any)?.contractDownPayment),
        signalValue: client.signalValue !== undefined ? client.signalValue : ((payload.commercial_history as any)?.signalValue),
        signalPaid: client.signalPaid !== undefined ? client.signalPaid : ((payload.commercial_history as any)?.signalPaid),
        contractInstallmentsCount: client.contractInstallmentsCount !== undefined ? client.contractInstallmentsCount : ((payload.commercial_history as any)?.contractInstallmentsCount),
        contractInstallmentsRemaining: client.contractInstallmentsRemaining !== undefined ? client.contractInstallmentsRemaining : ((payload.commercial_history as any)?.contractInstallmentsRemaining),
        baseContractValue: client.baseContractValue !== undefined ? client.baseContractValue : ((payload.commercial_history as any)?.baseContractValue),
        paymentTerms: client.paymentTerms !== undefined ? client.paymentTerms : ((payload.commercial_history as any)?.paymentTerms),
        birthdayPersonPhone: (client as any).birthdayPersonPhone !== undefined ? (client as any).birthdayPersonPhone : ((payload.commercial_history as any)?.birthdayPersonPhone),
        birthdayPersonBirthdate: client.birthdayPersonBirthdate !== undefined ? client.birthdayPersonBirthdate : ((payload.commercial_history as any)?.birthdayPersonBirthdate),
        birthdayPersonName: client.birthdayPersonName !== undefined ? client.birthdayPersonName : ((payload.commercial_history as any)?.birthdayPersonName),
        payerName: client.payerName !== undefined ? client.payerName : ((payload.commercial_history as any)?.payerName),
        payerAddress: client.payerAddress !== undefined ? client.payerAddress : ((payload.commercial_history as any)?.payerAddress),
        payerNeighborhood: client.payerNeighborhood !== undefined ? client.payerNeighborhood : ((payload.commercial_history as any)?.payerNeighborhood),
        payerCpf: client.payerCpf !== undefined ? client.payerCpf : ((payload.commercial_history as any)?.payerCpf),
        payerPhone: client.payerPhone !== undefined ? client.payerPhone : ((payload.commercial_history as any)?.payerPhone),
        payerEmail: client.payerEmail !== undefined ? client.payerEmail : ((payload.commercial_history as any)?.payerEmail),
        profession: (client as any).profession !== undefined ? (client as any).profession : ((payload.commercial_history as any)?.profession),
        eventYear: client.eventYear !== undefined ? client.eventYear : ((payload.commercial_history as any)?.eventYear),
        contractTitle: client.contractTitle !== undefined ? client.contractTitle : ((payload.commercial_history as any)?.contractTitle),
      };
      if ((client as any).hasCreditCard !== undefined) payload.has_credit_card = (client as any).hasCreditCard;
      if ((client as any).profession !== undefined) payload.profession = (client as any).profession;
      if (client.contractTitle !== undefined) payload.contract_title = client.contractTitle;
      if (client.eventYear !== undefined) payload.event_year = String(client.eventYear);
      if (client.notes !== undefined) payload.notes = client.notes;
      if (client.documents !== undefined) payload.documents = client.documents;
      if (client.activities !== undefined) payload.activities = client.activities;
      if (client.upsellSales !== undefined) payload.upsell_sales = client.upsellSales;
      if (client.tags !== undefined) payload.tags = client.tags;
      if (client.funnelEnteredAt !== undefined) payload.funnel_entered_at = client.funnelEnteredAt;
      if (client.createdAt !== undefined) payload.created_at = client.createdAt;

      let { error } = await supabase
        .from('clients')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('⚠️ Erro ao salvar cliente no Supabase, tentando fallback seguro com colunas essenciais:', error.message);
        // Fallback: se falhar por colunas adicionais ainda não migradas no Postgres
        // removemos as novas colunas opcionais mas NUNCA removemos o master_id
        const strippedPayload = { ...payload };
        delete strippedPayload.has_credit_card;
        delete strippedPayload.profession;
        delete strippedPayload.event_year;
        delete strippedPayload.funnel_id;
        delete strippedPayload.contacts;
        delete strippedPayload.signal_paid;
        delete strippedPayload.signal_value;
        delete strippedPayload.contract_down_payment;
        delete strippedPayload.contract_installments_remaining;
        delete strippedPayload.contract_installments_count;
        delete strippedPayload.signal_paid_at;
        delete strippedPayload.base_contract_value;
        delete strippedPayload.contract_status;
        delete strippedPayload.contract_signed_at;
        delete strippedPayload.contract_title;

        let { error: retryError } = await supabase.from('clients').upsert(strippedPayload, { onConflict: 'id' });
        
        // Se ainda falhar por alguma chave estrangeira (FK) legada inexistente
        if (retryError && (retryError.message?.includes('foreign key') || retryError.code === '23503')) {
          strippedPayload.commercial_lead_id = null;
          strippedPayload.debutante_id = null;
          strippedPayload.assigned_success_manager_id = null;
          const retryFk = await supabase.from('clients').upsert(strippedPayload, { onConflict: 'id' });
          retryError = retryFk.error;
        }

        if (retryError) {
          console.error('Falha crítica ao salvar cliente no Supabase (fallback):', retryError);
        } else {
          console.log('✅ Cliente salvo com sucesso no Supabase via fallback seguro!');
        }
      } else {
        console.log('✅ Cliente salvo com sucesso no Supabase!');
      }

      // Sincronização automática do decisor/contratante com a Central de Contatos
      const cleanPhone = (client.payerPhone || '').replace(/\D/g, '');
      const cleanCpf = (client.payerCpf || '').replace(/\D/g, '');
      const contactName = (client.payerName || client.name || '').trim();

      if (effectiveMasterId && (cleanPhone.length >= 8 || cleanCpf.length === 11 || contactName)) {
        try {
          let foundContactId: string | null = null;

          if (cleanCpf.length === 11) {
            const { data: cByCpf } = await supabase
              .from('contacts')
              .select('id')
              .eq('master_id', effectiveMasterId)
              .eq('cpf', cleanCpf)
              .is('deleted_at', null)
              .maybeSingle();
            if (cByCpf?.id) foundContactId = cByCpf.id;
          }

          if (!foundContactId && cleanPhone.length >= 8) {
            const { data: cByPhone } = await supabase
              .from('contacts')
              .select('id')
              .eq('master_id', effectiveMasterId)
              .eq('primary_phone', cleanPhone)
              .is('deleted_at', null)
              .maybeSingle();
            if (cByPhone?.id) foundContactId = cByPhone.id;
          }

          if (!foundContactId) {
            const newCode = generateBase36Code('CONT', 8);
            const { data: newContact } = await supabase
              .from('contacts')
              .insert({
                master_id: effectiveMasterId,
                code: newCode,
                name: contactName || 'Contratante / Decisor',
                primary_phone: cleanPhone || 'Não informado',
                email: client.payerEmail || null,
                cpf: cleanCpf || null,
                street: client.payerAddress || null,
                neighborhood: client.payerNeighborhood || null,
                city: client.payerCity || null,
                relationship_role: client.payerRelationship || 'Contratante',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .maybeSingle();
            if (newContact?.id) foundContactId = newContact.id;
          }

          if (foundContactId) {
            if (client.venueId && isUuid(client.venueId)) {
              await supabase
                .from('contact_venue_access')
                .upsert({
                  master_id: effectiveMasterId,
                  contact_id: foundContactId,
                  venue_id: client.venueId,
                  first_interaction_at: new Date().toISOString(),
                  last_interaction_at: new Date().toISOString(),
                }, { onConflict: 'contact_id,venue_id' });
            }

            await supabase
              .from('clients')
              .update({ migrated_to_contact_id: foundContactId })
              .eq('id', clientId)
              .eq('master_id', effectiveMasterId);
          }
        } catch (contactSyncErr) {
          console.warn('Aviso ao sincronizar decisor para Central de Contatos:', contactSyncErr);
        }
      }
    } catch (err) {
      console.error('Falha ao salvar cliente no Supabase:', err);
    }
  },

  async delete(id: string, masterId?: string): Promise<void> {
    if (!isSupabaseConfigured || !id) return;
    try {
      let query = supabase.from('clients').delete().eq('id', id);
      if (masterId && isUuid(masterId)) {
        query = query.eq('master_id', masterId);
      }
      const { error } = await query;
      if (error) console.error('Erro ao excluir cliente no Supabase:', error);
    } catch (err) {
      console.error('Falha ao excluir cliente:', err);
    }
  }
};
