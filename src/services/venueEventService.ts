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
  startTime: row.start_time || '',
  endTime: row.end_time || '',
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
      let mapped = (!error && data) ? data.map(formatFromDb) : [];

      // Complementa com contratos homologados que possuem data de evento caso não estejam em venue_events
      try {
        let contractsQuery = supabase
          .from('contracts')
          .select('id, master_id, venue_id, client_id, contract_title, title, event_type, event_date, event_time, guest_count, notes, approval_status, created_at, updated_at')
          .not('event_date', 'is', null);

        if (masterId && isUuid(masterId)) {
          contractsQuery = contractsQuery.or(`master_id.eq.${masterId},master_id.is.null`);
        }

        const { data: contractsData } = await contractsQuery;
        if (contractsData && contractsData.length > 0) {
          const existingIds = new Set(mapped.map(e => e.id));
          const existingClientDates = new Set(
            mapped.filter(e => e.clientId && e.eventDate).map(e => `${e.venueId}:${e.eventDate}:${e.clientId}`)
          );

          for (const c of contractsData) {
            if (!c.event_date || !c.venue_id) continue;
            const clientDateKey = c.client_id ? `${c.venue_id}:${String(c.event_date).split('T')[0]}:${c.client_id}` : '';
            if (existingIds.has(c.id) || (clientDateKey && existingClientDates.has(clientDateKey))) {
              continue;
            }

            const cleanTitle = (c.contract_title || c.title || 'Evento da Unidade')
              .replace(/\?{2,}/g, ' - ')
              .replace(/\?/g, '')
              .trim();

            const synthEvent: VenueEvent = {
              id: c.id,
              masterId: c.master_id || undefined,
              venueId: c.venue_id,
              clientId: c.client_id || null,
              title: cleanTitle,
              eventType: c.event_type || '15 Anos',
              eventDate: String(c.event_date).split('T')[0],
              startTime: c.event_time || '',
              endTime: '',
              guestCount: c.guest_count !== undefined && c.guest_count !== null ? Number(c.guest_count) : undefined,
              status: c.approval_status === 'rejected' ? 'cancelled' : 'confirmed',
              blocksVenueDay: true,
              notes: c.notes || undefined,
              createdByName: 'Contrato Homologado',
              createdAt: c.created_at || undefined,
              updatedAt: c.updated_at || undefined,
            };

            mapped.push(synthEvent);
            existingIds.add(synthEvent.id);
            if (clientDateKey) existingClientDates.add(clientDateKey);
          }
        }
      } catch (errContracts) {
        console.warn('[venueEventService] Aviso ao complementar contratos na agenda:', errContracts);
      }

      mapped.sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));

      if (mapped.length > 0) {
        safeLocalStorageSet(STORAGE_KEY_VENUE_EVENTS, JSON.stringify(mapped));
      } else if (error) {
        return readLocal();
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
        start_time: event.startTime || null,
        end_time: event.endTime || null,
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

