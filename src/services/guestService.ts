import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GuestGroup, GuestGender } from '../types';

export const guestService = {
  async create(debutanteId: string, guestData: {
    name: string;
    phone: string;
    age: number;
    gender?: GuestGender;
    group: GuestGroup;
    plusOnes?: number;
    companionNames?: string[];
    sweetMessage?: string;
    isSelfRegistered?: boolean;
  }): Promise<boolean> {
    if (!isSupabaseConfigured || !debutanteId) return true;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload: any = {
        debutante_id: debutanteId,
        name: guestData.name.trim(),
        phone: guestData.phone?.trim() || null,
        age: guestData.age || 15,
        gender: guestData.gender || 'female',
        group: guestData.group || 'Amigos',
        status: 'confirmed',
        plus_ones: guestData.plusOnes || 0,
        companion_details: (guestData.companionNames || []).map(name => ({ name })),
        sweet_message: guestData.sweetMessage || null,
        is_self_registered: guestData.isSelfRegistered ?? true,
        origin: 'general_link',
        confirmation_source: 'guest',
        is_link_expired: true,
        confirmed_at: todayStr,
      };

      const { error } = await supabase.from('guests').insert([payload]);
      if (error) {
        console.error('Erro ao salvar auto-cadastro de convidado no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em guestService.create:', err);
      return false;
    }
  },

  async updateRsvp(guestId: string, data: {
    status: 'confirmed' | 'declined';
    sweetMessage?: string;
    declinedMessage?: string;
    companionNames?: string[];
  }): Promise<boolean> {
    if (!isSupabaseConfigured || !guestId) return true;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload: any = {
        status: data.status,
        confirmed_at: data.status === 'confirmed' ? todayStr : null,
        sweet_message: data.sweetMessage || null,
        declined_message: data.declinedMessage || null,
        is_link_expired: true,
        confirmation_source: 'guest',
      };

      if (data.companionNames && data.companionNames.length > 0) {
        payload.companion_details = data.companionNames.map(name => ({ name }));
        payload.plus_ones = data.companionNames.length;
      }

      const { error } = await supabase.from('guests').update(payload).eq('id', guestId);
      if (error) {
        console.error('Erro ao atualizar RSVP de convidado:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em guestService.updateRsvp:', err);
      return false;
    }
  },

  async setRemovedStatus(guestId: string, isRemoved: boolean): Promise<boolean> {
    if (!isSupabaseConfigured || !guestId) return true;
    try {
      const { error } = await supabase
        .from('guests')
        .update({ is_removed: isRemoved })
        .eq('id', guestId);

      if (error) {
        console.error('Erro ao atualizar status is_removed do convidado:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em guestService.setRemovedStatus:', err);
      return false;
    }
  },

  async markAsReferred(guestId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !guestId) return true;
    try {
      const { error } = await supabase
        .from('guests')
        .update({ is_referred: true })
        .eq('id', guestId);

      if (error) {
        console.error('Erro ao marcar convidado como indicado:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em guestService.markAsReferred:', err);
      return false;
    }
  },
};
