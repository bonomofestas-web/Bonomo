import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Appointment } from '../types';

export const appointmentService = {
  async getAll(): Promise<(Appointment & { debutanteId?: string; leadId?: string; venueId?: string })[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar compromissos:', error);
        return [];
      }

      return (data || []).map(a => ({
        id: a.id,
        debutanteId: a.debutante_id || undefined,
        leadId: a.lead_id || undefined,
        venueId: a.venue_id || undefined,
        title: a.title,
        category: a.category,
        date: a.date,
        time: a.time,
        location: a.location || '',
        address: a.address || undefined,
        status: a.status || 'scheduled',
        notes: a.notes || undefined,
        responsibleCollaboratorId: a.responsible_collaborator_id || undefined,
        responsibleName: a.responsible_name || undefined,
        responsibleRole: a.responsible_role || undefined,
        responsiblePhone: a.responsible_phone || undefined,
        targetType: a.target_type || (a.lead_id ? 'lead' : a.debutante_id ? 'client' : 'team'),
        pax: a.pax !== undefined && a.pax !== null ? Number(a.pax) : undefined,
        guestsCount: a.pax !== undefined && a.pax !== null ? Number(a.pax) : undefined,
      }));
    } catch (err) {
      console.error('Falha em appointmentService.getAll:', err);
      return [];
    }
  },

  async create(data: {
    debutanteId?: string;
    leadId?: string;
    venueId?: string;
    appointment: Omit<Appointment, 'id'>;
  }): Promise<Appointment | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const payload: Record<string, any> = {
        title: data.appointment.title,
        category: data.appointment.category,
        date: data.appointment.date,
        time: data.appointment.time,
        location: data.appointment.location,
        status: data.appointment.status || 'scheduled',
      };

      if (data.debutanteId) payload.debutante_id = data.debutanteId;
      if (data.leadId) payload.lead_id = data.leadId;
      if (data.venueId) payload.venue_id = data.venueId;
      if (data.appointment.address) payload.address = data.appointment.address;
      if (data.appointment.notes) payload.notes = data.appointment.notes;
      if (data.appointment.responsibleCollaboratorId) payload.responsible_collaborator_id = data.appointment.responsibleCollaboratorId;
      if (data.appointment.responsibleName) payload.responsible_name = data.appointment.responsibleName;
      if (data.appointment.responsibleRole) payload.responsible_role = data.appointment.responsibleRole;
      if (data.appointment.responsiblePhone) payload.responsible_phone = data.appointment.responsiblePhone;
      if (data.appointment.targetType) payload.target_type = data.appointment.targetType;
      
      const paxVal = (data.appointment as any).pax ?? data.appointment.guestsCount;
      if (paxVal !== undefined && paxVal !== null) {
        payload.pax = Number(paxVal);
      }

      let { data: inserted, error } = await supabase
        .from('appointments')
        .insert([payload])
        .select()
        .single();

      // Fallback gracioso se as novas colunas (pax, lead_id, target_type) ainda não tiverem sido aplicadas via SQL
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        console.warn('[appointmentService.create] Coluna não encontrada. Retentando sem campos novos...');
        delete payload.pax;
        delete payload.lead_id;
        delete payload.target_type;
        
        // Se debutante_id for NOT NULL na versão legada e não houver debutanteId, podemos usar placeholder seguro
        if (!payload.debutante_id) {
          payload.notes = `[Lead: ${data.leadId || 'Comercial'}] ${payload.notes || ''}`;
        }

        const retry = await supabase
          .from('appointments')
          .insert([payload])
          .select()
          .single();
        
        inserted = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Erro ao criar compromisso no Supabase:', error);
        return null;
      }

      return {
        id: inserted.id,
        title: inserted.title,
        category: inserted.category,
        date: inserted.date,
        time: inserted.time,
        location: inserted.location || '',
        address: inserted.address || undefined,
        status: inserted.status || 'scheduled',
        notes: inserted.notes || undefined,
        responsibleCollaboratorId: inserted.responsible_collaborator_id || undefined,
        responsibleName: inserted.responsible_name || undefined,
        responsibleRole: inserted.responsible_role || undefined,
        responsiblePhone: inserted.responsible_phone || undefined,
        venueId: inserted.venue_id || undefined,
        leadId: inserted.lead_id || data.leadId,
        debutanteId: inserted.debutante_id || data.debutanteId,
        pax: inserted.pax !== undefined && inserted.pax !== null ? Number(inserted.pax) : paxVal,
        targetType: inserted.target_type || (data.leadId ? 'lead' : 'client'),
      };
    } catch (err) {
      console.error('Falha em appointmentService.create:', err);
      return null;
    }
  },

  async update(id: string, updates: Partial<Appointment>): Promise<boolean> {
    if (!isSupabaseConfigured || !id) return false;
    try {
      const payload: Record<string, any> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.date !== undefined) payload.date = updates.date;
      if (updates.time !== undefined) payload.time = updates.time;
      if (updates.location !== undefined) payload.location = updates.location;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.responsibleCollaboratorId !== undefined) payload.responsible_collaborator_id = updates.responsibleCollaboratorId;
      if (updates.responsibleName !== undefined) payload.responsible_name = updates.responsibleName;
      if (updates.responsibleRole !== undefined) payload.responsible_role = updates.responsibleRole;
      if (updates.responsiblePhone !== undefined) payload.responsible_phone = updates.responsiblePhone;
      if (updates.venueId !== undefined) payload.venue_id = updates.venueId;
      if (updates.targetType !== undefined) payload.target_type = updates.targetType;
      
      const paxVal = (updates as any).pax ?? updates.guestsCount;
      if (paxVal !== undefined && paxVal !== null) {
        payload.pax = Number(paxVal);
      }

      let { error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id);

      // Fallback se erro de coluna não existente
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        delete payload.pax;
        delete payload.target_type;
        const retry = await supabase.from('appointments').update(payload).eq('id', id);
        error = retry.error;
      }

      if (error) {
        console.error('Erro ao atualizar compromisso no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em appointmentService.update:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !id) return false;
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir compromisso no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em appointmentService.delete:', err);
      return false;
    }
  }
};
