import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid, generateUuid } from '../utils/uuid';
import type { EventSchedule, EventScheduleStatus, EventShift } from '../types/admin';

export interface GetEventSchedulesParams {
  masterId: string;
  venueId?: string;
  contractId?: string;
  contactId?: string;
  startDate?: string;
  endDate?: string;
  status?: EventScheduleStatus | 'all';
  limit?: number;
  offset?: number;
}

export const eventScheduleService = {
  /**
   * Busca lista paginada e filtrada de eventos agendados com rigoroso isolamento multi-tenant (master_id)
   */
  async getEvents({
    masterId,
    venueId,
    contractId,
    contactId,
    startDate,
    endDate,
    status = 'all',
    limit = 100,
    offset = 0,
  }: GetEventSchedulesParams): Promise<EventSchedule[]> {
    if (!isSupabaseConfigured || !masterId) return [];

    try {
      let query = supabase
        .from('event_schedules')
        .select(`
          *,
          contract:contracts(id, contract_code, event_title, total_amount, venue_id),
          contact:contacts(id, name, primary_phone, email)
        `)
        .eq('master_id', masterId)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })
        .range(offset, offset + limit - 1);

      if (venueId && venueId !== 'all' && isUuid(venueId)) {
        query = query.eq('venue_id', venueId);
      }

      if (contractId && isUuid(contractId)) {
        query = query.eq('contract_id', contractId);
      }

      if (contactId && isUuid(contactId)) {
        query = query.eq('contact_id', contactId);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.gte('event_date', startDate);
      }

      if (endDate) {
        query = query.lte('event_date', endDate);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[eventScheduleService.getEvents] Erro ao consultar agendamentos:', error);
        return [];
      }

      return (data || []).map(mapRowToEventSchedule);
    } catch (err) {
      console.error('[eventScheduleService.getEvents] Exceção:', err);
      return [];
    }
  },

  /**
   * Obtém detalhes de um agendamento por ID
   */
  async getEventById(id: string, masterId: string): Promise<EventSchedule | null> {
    if (!isSupabaseConfigured || !id || !masterId) return null;

    try {
      const { data, error } = await supabase
        .from('event_schedules')
        .select(`
          *,
          contract:contracts(*),
          contact:contacts(*)
        `)
        .eq('id', id)
        .eq('master_id', masterId)
        .maybeSingle();

      if (error || !data) {
        if (error) console.error('[eventScheduleService.getEventById] Erro:', error);
        return null;
      }

      return mapRowToEventSchedule(data);
    } catch (err) {
      console.error('[eventScheduleService.getEventById] Exceção:', err);
      return null;
    }
  },

  /**
   * REGRA ESTRITA DE BLOQUEIO DE DATAS:
   * Verifica se existe sobreposição de eventos confirmados para o mesmo espaço/salão (venue_id)
   * na mesma data e turno.
   */
  async checkOverlap(params: {
    masterId: string;
    venueId: string;
    eventDate: string;
    shift: EventShift;
    excludeEventId?: string;
  }): Promise<{ hasConflict: boolean; conflictingEvent?: EventSchedule; message?: string }> {
    if (!isSupabaseConfigured || !params.masterId || !params.venueId || !params.eventDate) {
      return { hasConflict: false };
    }

    try {
      let query = supabase
        .from('event_schedules')
        .select(`
          *,
          contract:contracts(contract_code, event_title),
          contact:contacts(name, primary_phone)
        `)
        .eq('master_id', params.masterId)
        .eq('venue_id', params.venueId)
        .eq('event_date', params.eventDate)
        .in('status', ['confirmado', 'em_andamento']);

      if (params.excludeEventId && isUuid(params.excludeEventId)) {
        query = query.neq('id', params.excludeEventId);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return { hasConflict: false };
      }

      // Avaliação de sobreposição de turno:
      // - Turno 'dia_inteiro' bloqueia todos os turnos do dia
      // - Turno específico colide com 'dia_inteiro' ou com o mesmo turno
      const targetShift = params.shift;
      const conflictRow = data.find(row => {
        const rowShift: EventShift = row.shift || 'noite';
        if (targetShift === 'dia_inteiro' || rowShift === 'dia_inteiro') return true;
        return rowShift === targetShift;
      });

      if (conflictRow) {
        const conflict = mapRowToEventSchedule(conflictRow);
        const shiftLabel = getShiftLabel(conflict.shift);
        return {
          hasConflict: true,
          conflictingEvent: conflict,
          message: `Conflito de Agenda: O espaço já possui o evento "${conflict.title}" confirmado para a data ${conflict.eventDate} no turno ${shiftLabel}.`,
        };
      }

      return { hasConflict: false };
    } catch (err) {
      console.error('[eventScheduleService.checkOverlap] Exceção:', err);
      return { hasConflict: false };
    }
  },

  /**
   * Cria um novo agendamento com validação obrigatória de Contrato, Contato e Trava de Sobreposição
   */
  async createEvent(params: {
    masterId: string;
    venueId: string;
    contractId: string;
    contactId: string;
    title: string;
    eventType?: string;
    eventDate: string;
    shift?: EventShift;
    startTime?: string;
    endTime?: string;
    guestCount?: number;
    status?: EventScheduleStatus;
    blocksVenueDay?: boolean;
    notes?: string;
    createdById?: string;
    createdByName?: string;
  }): Promise<{ success: boolean; event?: EventSchedule; conflict?: boolean; message?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Banco de dados não configurado.' };
    }

    // 1. Validações de integridade
    if (!params.masterId || !params.venueId || !params.contractId || !params.contactId || !params.eventDate || !params.title) {
      return {
        success: false,
        message: 'Campos obrigatórios ausentes: Unidade, Contrato, Contato, Data e Título do evento são mandatórios.',
      };
    }

    const effectiveShift: EventShift = params.shift || 'noite';
    const effectiveStatus: EventScheduleStatus = params.status || 'pre_reserva';

    // 2. Trava Estrita de Sobreposição para status 'confirmado' ou 'em_andamento'
    if (effectiveStatus === 'confirmado' || effectiveStatus === 'em_andamento') {
      const overlapCheck = await this.checkOverlap({
        masterId: params.masterId,
        venueId: params.venueId,
        eventDate: params.eventDate,
        shift: effectiveShift,
      });

      if (overlapCheck.hasConflict) {
        return {
          success: false,
          conflict: true,
          message: overlapCheck.message,
        };
      }
    }

    try {
      const eventId = generateUuid();
      const payload = {
        id: eventId,
        master_id: params.masterId,
        venue_id: params.venueId,
        contract_id: params.contractId,
        contact_id: params.contactId,
        title: params.title.trim(),
        event_type: params.eventType || '15_anos',
        event_date: params.eventDate,
        shift: effectiveShift,
        start_time: params.startTime || '20:00',
        end_time: params.endTime || '02:00',
        guest_count: params.guestCount || 0,
        status: effectiveStatus,
        blocks_venue_day: params.blocksVenueDay !== false,
        notes: params.notes || null,
        created_by_id: params.createdById && isUuid(params.createdById) ? params.createdById : null,
        created_by_name: params.createdByName || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('event_schedules')
        .insert(payload)
        .select(`
          *,
          contract:contracts(id, contract_code, total_amount),
          contact:contacts(id, name, primary_phone)
        `)
        .single();

      if (error || !data) {
        console.error('[eventScheduleService.createEvent] Erro ao gravar agendamento:', error);
        return { success: false, message: error?.message || 'Falha ao salvar agendamento.' };
      }

      // Sincroniza espelho legado em venue_events para compatibilidade de visualização em calendários antigos
      try {
        await supabase.from('venue_events').upsert({
          id: eventId,
          master_id: params.masterId,
          venue_id: params.venueId,
          title: params.title.trim(),
          event_type: params.eventType || '15_anos',
          event_date: params.eventDate,
          start_time: params.startTime || '20:00',
          end_time: params.endTime || '02:00',
          guest_count: params.guestCount || 0,
          status: effectiveStatus === 'confirmado' ? 'confirmed' : 'scheduled',
          blocks_venue_day: params.blocksVenueDay !== false,
          notes: params.notes || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (mirrorErr) {
        console.warn('[eventScheduleService.createEvent] Aviso ao atualizar espelho venue_events:', mirrorErr);
      }

      return {
        success: true,
        event: mapRowToEventSchedule(data),
      };
    } catch (err: any) {
      console.error('[eventScheduleService.createEvent] Exceção:', err);
      return { success: false, message: err.message || 'Erro inesperado ao criar agendamento.' };
    }
  },

  /**
   * Atualiza dados de um agendamento existente
   */
  async updateEvent(
    id: string,
    masterId: string,
    updates: Partial<EventSchedule>
  ): Promise<{ success: boolean; event?: EventSchedule; conflict?: boolean; message?: string }> {
    if (!isSupabaseConfigured || !id || !masterId) {
      return { success: false, message: 'Parâmetros inválidos.' };
    }

    try {
      // 1. Busca dados atuais do evento
      const current = await this.getEventById(id, masterId);
      if (!current) {
        return { success: false, message: 'Agendamento não encontrado.' };
      }

      const targetVenueId = updates.venueId || current.venueId;
      const targetDate = updates.eventDate || current.eventDate;
      const targetShift: EventShift = updates.shift || current.shift;
      const targetStatus: EventScheduleStatus = updates.status || current.status;

      // 2. Trava de Sobreposição caso esteja ou mude para 'confirmado' ou 'em_andamento'
      if (targetStatus === 'confirmado' || targetStatus === 'em_andamento') {
        const overlapCheck = await this.checkOverlap({
          masterId,
          venueId: targetVenueId,
          eventDate: targetDate,
          shift: targetShift,
          excludeEventId: id,
        });

        if (overlapCheck.hasConflict) {
          return {
            success: false,
            conflict: true,
            message: overlapCheck.message,
          };
        }
      }

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.venueId !== undefined) payload.venue_id = updates.venueId;
      if (updates.contractId !== undefined) payload.contract_id = updates.contractId;
      if (updates.contactId !== undefined) payload.contact_id = updates.contactId;
      if (updates.title !== undefined) payload.title = updates.title.trim();
      if (updates.eventType !== undefined) payload.event_type = updates.eventType;
      if (updates.eventDate !== undefined) payload.event_date = updates.eventDate;
      if (updates.shift !== undefined) payload.shift = updates.shift;
      if (updates.startTime !== undefined) payload.start_time = updates.startTime;
      if (updates.endTime !== undefined) payload.end_time = updates.endTime;
      if (updates.guestCount !== undefined) payload.guest_count = updates.guestCount;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.blocksVenueDay !== undefined) payload.blocks_venue_day = updates.blocksVenueDay;
      if (updates.notes !== undefined) payload.notes = updates.notes;

      const { data, error } = await supabase
        .from('event_schedules')
        .update(payload)
        .eq('id', id)
        .eq('master_id', masterId)
        .select(`
          *,
          contract:contracts(id, contract_code, total_amount),
          contact:contacts(id, name, primary_phone)
        `)
        .single();

      if (error || !data) {
        console.error('[eventScheduleService.updateEvent] Erro:', error);
        return { success: false, message: error?.message || 'Falha ao atualizar agendamento.' };
      }

      return {
        success: true,
        event: mapRowToEventSchedule(data),
      };
    } catch (err: any) {
      console.error('[eventScheduleService.updateEvent] Exceção:', err);
      return { success: false, message: err.message || 'Erro inesperado ao atualizar agendamento.' };
    }
  },

  /**
   * Atualização rápida de status com validação de bloqueio
   */
  async updateStatus(
    id: string,
    masterId: string,
    newStatus: EventScheduleStatus
  ): Promise<{ success: boolean; conflict?: boolean; message?: string }> {
    return this.updateEvent(id, masterId, { status: newStatus });
  },

  /**
   * Exclui um agendamento do banco
   */
  async deleteEvent(id: string, masterId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !id || !masterId) return false;

    try {
      const { error } = await supabase
        .from('event_schedules')
        .delete()
        .eq('id', id)
        .eq('master_id', masterId);

      if (error) {
        console.error('[eventScheduleService.deleteEvent] Erro:', error);
        return false;
      }

      // Remove espelho se existir
      try {
        await supabase
          .from('venue_events')
          .delete()
          .eq('id', id)
          .eq('master_id', masterId);
      } catch {}

      return true;
    } catch (err) {
      console.error('[eventScheduleService.deleteEvent] Exceção:', err);
      return false;
    }
  },
};

function mapRowToEventSchedule(row: any): EventSchedule {
  return {
    id: row.id,
    masterId: row.master_id,
    venueId: row.venue_id,
    contractId: row.contract_id,
    contactId: row.contact_id,
    title: row.title,
    eventType: row.event_type || '15_anos',
    eventDate: row.event_date ? String(row.event_date).split('T')[0] : '',
    shift: (row.shift as EventShift) || 'noite',
    startTime: row.start_time || '20:00',
    endTime: row.end_time || '02:00',
    guestCount: row.guest_count !== null && row.guest_count !== undefined ? Number(row.guest_count) : undefined,
    status: (row.status as EventScheduleStatus) || 'pre_reserva',
    blocksVenueDay: row.blocks_venue_day !== false,
    notes: row.notes || undefined,
    createdById: row.created_by_id || undefined,
    createdByName: row.created_by_name || undefined,
    contract: row.contract ? {
      ...row.contract,
      contractCode: row.contract.contract_code,
      totalAmount: Number(row.contract.total_amount || 0),
    } : undefined,
    contact: row.contact ? {
      ...row.contact,
      primaryPhone: row.contact.primary_phone,
    } : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getShiftLabel(shift: EventShift): string {
  switch (shift) {
    case 'manha':
      return 'Manhã';
    case 'tarde':
      return 'Tarde';
    case 'noite':
      return 'Noite';
    case 'dia_inteiro':
      return 'Dia Inteiro';
    default:
      return shift;
  }
}
