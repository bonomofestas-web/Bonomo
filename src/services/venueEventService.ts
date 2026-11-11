import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { VenueEvent } from '../types/admin';
import { isUuid } from '../utils/uuid';
import { safeLocalStorageSet } from '../utils/mediaStorage';

export const STORAGE_KEY_VENUE_EVENTS = 'f5_venue_events_v1';

const formatFromDb = (row: any): VenueEvent => ({
  id: row.id,
  masterId: row.master_id || undefined,
  venueId: row.venue_id,
  venueName: row.venue_name || undefined,
  clientId: row.client_id || null,
  clientName: row.client_name || undefined,
  title: row.title || 'Evento da Unidade',
  eventType: row.event_type || '15 Anos',
  eventDate: row.event_date ? String(row.event_date).split('T')[0] : '',
  startTime: row.start_time || '20:00',
  endTime: row.end_time || '02:00',
  guestCount: row.guest_count !== undefined && row.guest_count !== null ? Number(row.guest_count) : undefined,
  status: (row.status || 'scheduled') as VenueEvent['status'],
  blocksVenueDay: row.blocks_venue_day !== false,
  notes: row.notes || undefined,
  createdById: row.created_by_id || undefined,
  createdByName: row.created_by_name || undefined,
  createdAt: row.created_at || undefined,
  updatedAt: row.updated_at || undefined,
});

export const venueEventService = {
  async getAll(masterId?: string): Promise<VenueEvent[]> {
    const readLocal = (): VenueEvent[] => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_VENUE_EVENTS);
        const parsed: VenueEvent[] = stored ? JSON.parse(stored) : [];
        return masterId ? parsed.filter(e => !e.masterId || e.masterId === masterId) : parsed;
      } catch {
        return [];
      }
    };

    if (!isSupabaseConfigured) {
      return readLocal();
    }

    try {
      let query = supabase
        .from('venue_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (masterId && isUuid(masterId)) {
        query = query.or(`master_id.eq.${masterId},master_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[venueEventService] Fallback para localStorage:', error.message);
        return readLocal();
      }

      const mapped = (data || []).map(formatFromDb);
      if (mapped.length > 0) {
        safeLocalStorageSet(STORAGE_KEY_VENUE_EVENTS, JSON.stringify(mapped));
      }
      return mapped;
    } catch (err) {
      console.error('[venueEventService] Erro ao carregar eventos:', err);
      return readLocal();
    }
  },

  async upsert(event: VenueEvent): Promise<boolean> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VENUE_EVENTS);
      const list: VenueEvent[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(e => e.id === event.id);
      const next = idx >= 0
        ? list.map(e => (e.id === event.id ? event : e))
        : [event, ...list];
      safeLocalStorageSet(STORAGE_KEY_VENUE_EVENTS, JSON.stringify(next));

      if (!isSupabaseConfigured) return true;

      const payload: any = {
        id: isUuid(event.id) ? event.id : undefined,
        master_id: event.masterId && isUuid(event.masterId) ? event.masterId : null,
        venue_id: isUuid(event.venueId) ? event.venueId : null,
        client_id: event.clientId && isUuid(event.clientId) ? event.clientId : null,
        client_name: event.clientName || null,
        title: event.title,
        event_type: event.eventType || '15 Anos',
        event_date: event.eventDate,
        start_time: event.startTime || '20:00',
        end_time: event.endTime || '02:00',
        guest_count: event.guestCount ?? null,
        status: event.status || 'scheduled',
        blocks_venue_day: event.blocksVenueDay !== false,
        notes: event.notes || null,
        created_by_id: event.createdById && isUuid(event.createdById) ? event.createdById : null,
        created_by_name: event.createdByName || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('venue_events')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[venueEventService] Erro ao persistir no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[venueEventService] Falha no upsert:', err);
      return false;
    }
  },

  async remove(id: string): Promise<boolean> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VENUE_EVENTS);
      if (stored) {
        const list: VenueEvent[] = JSON.parse(stored);
        safeLocalStorageSet(STORAGE_KEY_VENUE_EVENTS, JSON.stringify(list.filter(e => e.id !== id)));
      }

      if (!isSupabaseConfigured || !isUuid(id)) return true;

      const { error } = await supabase.from('venue_events').delete().eq('id', id);
      if (error) {
        console.warn('[venueEventService] Erro ao excluir do Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[venueEventService] Falha ao remover evento:', err);
      return false;
    }
  },
};

