import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  VenueAgendaConfig, 
  AgendaRecurringRule, 
  CommercialCommitmentType 
} from '../types/admin';
import type { Appointment } from '../types';
import { isUuid, generateUuid } from '../utils/uuid';
import { safeLocalStorageSet } from '../utils/mediaStorage';

const STORAGE_KEY_AGENDA_CONFIGS = 'bonomo_venue_agenda_configs';

export const DEFAULT_VISITS_RULE: AgendaRecurringRule = {
  enabledDays: [1, 2, 3, 4, 5, 6], // Segunda a Sábado
  timeSlots: ['10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
  durationMinutes: 45,
  maxConcurrentPerSlot: 3, // Até 3 visitas simultâneas por horário
  maxPaxPerSlot: 15,
};

export const DEFAULT_TASTINGS_RULE: AgendaRecurringRule = {
  enabledDays: [3, 4], // Quarta e Quinta-feira
  timeSlots: ['19:00', '20:00'],
  durationMinutes: 90,
  maxConcurrentPerSlot: 4, // Até 4 famílias por sessão
  maxPaxPerSlot: 20,       // Até 20 pessoas no total da sessão
};

export interface CalculatedSlot {
  time: string;
  available: boolean;
  isAvailable: boolean;
  currentBookings: number;
  maxBookings: number;
  currentPax: number;
  maxPax?: number;
  remainingSpots: number;
  remainingPax: number;
  durationMinutes: number;
}

export interface AvailabilityResult {
  isBlocked: boolean;
  isDayAvailable: boolean;
  blockReason?: string;
  reason?: string;
  slots: CalculatedSlot[];
}

export const agendaAvailabilityService = {
  getDefaultConfig(venueId: string): VenueAgendaConfig {
    return {
      id: isUuid(venueId) ? venueId : generateUuid(),
      venueId,
      visitsRule: { ...DEFAULT_VISITS_RULE },
      tastingsRule: { ...DEFAULT_TASTINGS_RULE },
      dateOverrides: [],
      updatedAt: new Date().toISOString(),
    };
  },

  async getAll(): Promise<VenueAgendaConfig[]> {
    if (!isSupabaseConfigured) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_AGENDA_CONFIGS);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }

    try {
      const { data, error } = await supabase
        .from('venue_agenda_configs')
        .select('*');

      if (error) {
        console.warn('⚠️ Erro ao buscar venue_agenda_configs no Supabase (usando localStorage):', error.message);
        const stored = localStorage.getItem(STORAGE_KEY_AGENDA_CONFIGS);
        return stored ? JSON.parse(stored) : [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        venueId: row.venue_id,
        visitsRule: row.visits_rule || { ...DEFAULT_VISITS_RULE },
        tastingsRule: row.tastings_rule || { ...DEFAULT_TASTINGS_RULE },
        dateOverrides: row.blackout_dates || [],
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.error('Falha em agendaAvailabilityService.getAll:', err);
      return [];
    }
  },

  async getAllConfigs(): Promise<VenueAgendaConfig[]> {
    return this.getAll();
  },

  async upsert(config: VenueAgendaConfig): Promise<boolean> {
    try {
      // Salva no LocalStorage imediatamente
      const stored = localStorage.getItem(STORAGE_KEY_AGENDA_CONFIGS);
      const list: VenueAgendaConfig[] = stored ? JSON.parse(stored) : [];
      const updated = list.filter(c => c.venueId !== config.venueId);
      updated.push(config);
      safeLocalStorageSet(STORAGE_KEY_AGENDA_CONFIGS, JSON.stringify(updated));

      if (!isSupabaseConfigured) return true;

      const payload: any = {
        venue_id: isUuid(config.venueId) ? config.venueId : null,
        visits_rule: config.visitsRule,
        tastings_rule: config.tastingsRule,
        blackout_dates: config.dateOverrides || [],
        updated_at: new Date().toISOString(),
      };

      if (config.id && isUuid(config.id)) {
        payload.id = config.id;
      }

      const { data, error } = await supabase
        .from('venue_agenda_configs')
        .upsert(payload, { onConflict: 'venue_id' })
        .select('id');

      if (error) {
        console.warn('⚠️ Falha ao salvar venue_agenda_configs no Supabase (persistido localmente):', error.message);
        return false;
      }

      return Boolean(data && data.length > 0);
    } catch (err) {
      console.error('Falha em agendaAvailabilityService.upsert:', err);
      return false;
    }
  },

  async saveConfig(config: VenueAgendaConfig): Promise<boolean> {
    return this.upsert(config);
  },

  /**
   * Calcula a disponibilidade de horários para um determinado dia e tipo de compromisso,
   * suportando tanto chamada (config, dateStr, type, appointments) quanto (dateStr, type, venueId, appointments, config).
   */
  getAvailableSlots(
    arg1: any,
    arg2: any,
    arg3?: any,
    arg4?: any,
    arg5?: any
  ): AvailabilityResult {
    let config: VenueAgendaConfig | null = null;
    let dateStr: string = '';
    let type: CommercialCommitmentType = 'visit';
    let existingAppointments: Appointment[] = [];

    // Checa assinatura: se arg1 for string ('2026-09-18'), é (dateStr, type, venueId, appointments, config)
    if (typeof arg1 === 'string') {
      dateStr = arg1;
      type = (arg2 as CommercialCommitmentType) || 'visit';
      existingAppointments = Array.isArray(arg4) ? arg4 : [];
      config = (arg5 as VenueAgendaConfig) || null;
    } else {
      // Assinatura: (config, dateStr, type, existingAppointments)
      config = (arg1 as VenueAgendaConfig) || null;
      dateStr = String(arg2 || '');
      type = (arg3 as CommercialCommitmentType) || 'visit';
      existingAppointments = Array.isArray(arg4) ? arg4 : [];
    }

    if (!dateStr) {
      return {
        isBlocked: true,
        isDayAvailable: false,
        blockReason: 'Selecione uma data.',
        reason: 'Selecione uma data.',
        slots: [],
      };
    }

    const defaultRule = type === 'visit' ? DEFAULT_VISITS_RULE : DEFAULT_TASTINGS_RULE;
    const rule = (type === 'visit' ? config?.visitsRule : config?.tastingsRule) || defaultRule;

    // 1. Verifica se há bloqueio específico para esta data (Google Calendar style)
    const override = config?.dateOverrides?.find(o => o.date === dateStr);
    if (override && override.isBlocked) {
      const msg = override.reason || 'Data bloqueada pela gerência.';
      return {
        isBlocked: true,
        isDayAvailable: false,
        blockReason: msg,
        reason: msg,
        slots: [],
      };
    }

    // 2. Verifica o dia da semana (0=Dom, 1=Seg, ..., 6=Sab)
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    if (!rule.enabledDays.includes(dayOfWeek) && !override?.customSlots) {
      const msg = 'Não há atendimento para este compromisso neste dia da semana.';
      return {
        isBlocked: true,
        isDayAvailable: false,
        blockReason: msg,
        reason: msg,
        slots: [],
      };
    }

    // 3. Obtém a lista de slots disponíveis para o dia
    const timeSlots = override?.customSlots && override.customSlots.length > 0
      ? override.customSlots
      : rule.timeSlots;

    // 4. Filtra agendamentos existentes neste dia para a categoria correspondente
    const targetCategory = type === 'visit' 
      ? ['Visita Comercial', 'Visita Técnica / Apresentação'] 
      : ['Degustação Gastronômica', 'Buffet & Degustação'];

    const dayAppointments = existingAppointments.filter(a => {
      if (a.date !== dateStr) return false;
      if (a.status === 'cancelled') return false;
      return targetCategory.includes(a.category) || 
             a.title.toLowerCase().includes(type === 'visit' ? 'visita' : 'degust');
    });

    // 5. Para cada horário configurado, calcula capacidade e disponibilidade
    const calculatedSlots: CalculatedSlot[] = timeSlots.map(time => {
      const slotAppointments = dayAppointments.filter(a => a.time === time);
      const currentBookings = slotAppointments.length;
      
      const currentPax = slotAppointments.reduce((acc, a) => {
        const p = a.pax ?? a.guestsCount ?? 2;
        return acc + Number(p);
      }, 0);

      const maxBookings = rule.maxConcurrentPerSlot;
      const maxPax = rule.maxPaxPerSlot;

      const remainingSpots = Math.max(0, maxBookings - currentBookings);
      const remainingPax = maxPax !== undefined ? Math.max(0, maxPax - currentPax) : 999;

      const isAvailable = remainingSpots > 0 && remainingPax > 0;

      return {
        time,
        available: isAvailable,
        isAvailable,
        currentBookings,
        maxBookings,
        currentPax,
        maxPax,
        remainingSpots,
        remainingPax,
        durationMinutes: rule.durationMinutes,
      };
    });

    return {
      isBlocked: false,
      isDayAvailable: true,
      slots: calculatedSlots,
    };
  }
};
