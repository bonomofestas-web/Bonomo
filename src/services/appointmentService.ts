import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Appointment } from '../types';

export const appointmentService = {
  async getAll(): Promise<(Appointment & { debutanteId: string; venueId?: string })[]> {
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
        debutanteId: a.debutante_id,
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
      }));
    } catch (err) {
      console.error('Falha em appointmentService.getAll:', err);
      return [];
    }
  },

  async create(data: {
    debutanteId: string;
    venueId?: string;
    appointment: Omit<Appointment, 'id'>;
  }): Promise<Appointment | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const payload: Record<string, any> = {
        debutante_id: data.debutanteId,
        title: data.appointment.title,
        category: data.appointment.category,
        date: data.appointment.date,
        time: data.appointment.time,
        location: data.appointment.location,
        status: data.appointment.status || 'scheduled',
      };

      if (data.venueId) payload.venue_id = data.venueId;
      if (data.appointment.address) payload.address = data.appointment.address;
      if (data.appointment.notes) payload.notes = data.appointment.notes;
      if (data.appointment.responsibleCollaboratorId) payload.responsible_collaborator_id = data.appointment.responsibleCollaboratorId;
      if (data.appointment.responsibleName) payload.responsible_name = data.appointment.responsibleName;
      if (data.appointment.responsibleRole) payload.responsible_role = data.appointment.responsibleRole;
      if (data.appointment.responsiblePhone) payload.responsible_phone = data.appointment.responsiblePhone;

      const { data: inserted, error } = await supabase
        .from('appointments')
        .insert([payload])
        .select()
        .single();

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

      const { error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id);

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
