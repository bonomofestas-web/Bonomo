import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  VenueAgendaConfig, 
  AgendaRecurringRule, 
  AgendaDaySchedule,
  CommercialCommitmentType 
} from '../types/admin';
import type { Appointment } from '../types';
import { isUuid, generateUuid } from '../utils/uuid';
import { safeLocalStorageSet } from '../utils/mediaStorage';

const STORAGE_KEY_AGENDA_CONFIGS = 'bonomo_venue_agenda_configs';

/**
 * Gera slots sequenciais com base no horário de início, fim e duração em minutos
 * Ex: '09:00' até '17:00' com 60 min -> ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
 */
export function generateSlotsFromRange(startTime: string, endTime: string, durationMinutes: number = 60): string[] {
  if (!startTime || !endTime || durationMinutes <= 0) return [];
  const parseMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const formatMin = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const start = parseMin(startTime);
  const end = parseMin(endTime);
  if (end <= start) return [];

  const slots: string[] = [];
  let curr = start;
  while (curr + durationMinutes <= end) {
    slots.push(formatMin(curr));
    curr += durationMinutes;
  }
  return slots;
}

export const DEFAULT_DAY_SCHEDULES_VISITS: Record<number, AgendaDaySchedule> = {
  1: { dayOfWeek: 1, enabled: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 60 },
  2: { dayOfWeek: 2, enabled: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 60 },
  3: { dayOfWeek: 3, enabled: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 60 },
  4: { dayOfWeek: 4, enabled: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 60 },
  5: { dayOfWeek: 5, enabled: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 60 },
  6: { dayOfWeek: 6, enabled: true, startTime: '10:00', endTime: '16:00', slotDurationMinutes: 60 },
  0: { dayOfWeek: 0, enabled: false, startTime: '10:00', endTime: '16:00', slotDurationMinutes: 60 },
};

export const DEFAULT_DAY_SCHEDULES_TASTINGS: Record<number, AgendaDaySchedule> = {
  1: { dayOfWeek: 1, enabled: false, startTime: '19:00', endTime: '22:00', slotDurationMinutes: 90 },
  2: { dayOfWeek: 2, enabled: false, startTime: '19:00', endTime: '22:00', slotDurationMinutes: 90 },
  3: { dayOfWeek: 3, enabled: true, startTime: '19:00', endTime: '22:00', slotDurationMinutes: 90 },
  4: { dayOfWeek: 4, enabled: true, startTime: '19:00', endTime: '22:00', slotDurationMinutes: 90 },
  5: { dayOfWeek: 5, enabled: false, startTime: '19:00', endTime: '22:00', slotDurationMinutes: 90 },
  6: { dayOfWeek: 6, enabled: false, startTime: '19:00', endTime: '22:00', slotDurationMinutes: 90 },
  0: { dayOfWeek: 0, enabled: false, startTime: '19:00', endTime: '22:00', slotDurationMinutes: 90 },
};

export const DEFAULT_VISITS_RULE: AgendaRecurringRule = {
  enabledDays: [1, 2, 3, 4, 5, 6], // Segunda a Sábado
  timeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
  durationMinutes: 60,
  maxConcurrentPerSlot: 3,
  maxPaxPerSlot: 15,
  daySchedules: DEFAULT_DAY_SCHEDULES_VISITS,
};

export const DEFAULT_TASTINGS_RULE: AgendaRecurringRule = {
  enabledDays: [3, 4], // Quarta e Quinta-feira
  timeSlots: ['19:00', '20:30'],
  durationMinutes: 90,
  maxConcurrentPerSlot: 4,
  maxPaxPerSlot: 20,
  daySchedules: DEFAULT_DAY_SCHEDULES_TASTINGS,
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
  appliedMode?: 'override' | 'block' | 'recurring' | 'free';
  isFreeMode?: boolean;
  slots: CalculatedSlot[];
}

export const agendaAvailabilityService = {
  getDefaultConfig(venueId: string): VenueAgendaConfig {
    return {
      id: isUuid(venueId) ? venueId : generateUuid(),
      venueId,
      visitsRule: { ...DEFAULT_VISITS_RULE },
      tastingsRule: { ...DEFAULT_TASTINGS_RULE },
      blockRules: [],
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

      return (data || []).map((row: any) => {
        const blackout = row.blackout_dates || [];
        const dateOverrides = Array.isArray(blackout) 
          ? blackout.filter((item: any) => item && !item.startDate)
          : [];
        const rawBlocks = (row.visits_rule as any)?.blockRules || 
          (Array.isArray(blackout) ? blackout.filter((item: any) => item && item.startDate && item.endDate) : []);

        return {
          id: row.id,
          venueId: row.venue_id,
          visitsRule: {
            ...DEFAULT_VISITS_RULE,
            ...(row.visits_rule || {}),
          },
          tastingsRule: {
            ...DEFAULT_TASTINGS_RULE,
            ...(row.tastings_rule || {}),
          },
          blockRules: rawBlocks || [],
          dateOverrides,
          updatedAt: row.updated_at,
        };
      });
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

      // Preserva blockRules embutido dentro de visits_rule e blackout_dates para compatibilidade total
      const enrichedVisitsRule = {
        ...config.visitsRule,
        blockRules: config.blockRules || [],
      };

      const payload: any = {
        venue_id: isUuid(config.venueId) ? config.venueId : null,
        visits_rule: enrichedVisitsRule,
        tastings_rule: config.tastingsRule,
        blackout_dates: [
          ...(config.dateOverrides || []),
          ...(config.blockRules || []).map(b => ({ ...b, isBlockRule: true }))
        ],
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
   * Calcula a disponibilidade de horários com PRECEDÊNCIA:
   * 1º: AgendaDateOverride (bloqueio ou ajuste pontual do dia)
   * 2º: AgendaBlockRule (regra por período de datas que suspende a regra semanal)
   * 3º: AgendaRecurringRule (regra base semanal por dia da semana)
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

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab

    // ── 1 & 2. PRECEDÊNCIA TEMPORAL DINÂMICA: Bloco vs Data Pontual (Override) ──
    const override = config?.dateOverrides?.find(o => o.date === dateStr);
    const targetBlockType = type === 'visit' ? 'visits' : 'tastings';
    const activeBlock = (config?.blockRules || []).find(b => {
      const matchesType = b.type === 'both' || b.type === targetBlockType;
      return matchesType && b.startDate <= dateStr && dateStr <= b.endDate;
    });

    // Timestamps de criação/edição para desempate temporal
    const overrideTime = override?.updatedAt || override?.createdAt ? new Date(override.updatedAt || override.createdAt!).getTime() : 0;
    const blockTime = activeBlock?.updatedAt || activeBlock?.createdAt ? new Date(activeBlock.updatedAt || activeBlock.createdAt!).getTime() : 0;

    // Critério de Precedência:
    // Se ambos existem, a ação mais recente (maior timestamp) prevalece.
    // Se apenas um existe, ele prevalece sobre a recorrência semanal.
    const useOverride = Boolean(override && (!activeBlock || overrideTime >= blockTime));
    const useBlock = Boolean(activeBlock && (!override || blockTime > overrideTime));

    let effectiveSlots: string[] = [];
    let effectiveDuration = rule.durationMinutes || 60;
    let effectiveMaxBookings = rule.maxConcurrentPerSlot || 3;
    let effectiveMaxPax = rule.maxPaxPerSlot;
    let appliedMode: 'override' | 'block' | 'recurring' | 'free' = 'recurring';

    if (useOverride && override) {
      appliedMode = 'override';
      if (override.isBlocked) {
        const msg = override.reason || 'Data bloqueada pela administração.';
        return {
          isBlocked: true,
          isDayAvailable: false,
          blockReason: msg,
          reason: msg,
          appliedMode: 'override',
          slots: [],
        };
      }
      if (override.customSlots && override.customSlots.length > 0) {
        effectiveSlots = override.customSlots;
        effectiveMaxPax = override.maxPaxPerSlot ?? effectiveMaxPax;
      } else {
        effectiveSlots = rule.timeSlots;
      }
    } else if (useBlock && activeBlock) {
      appliedMode = 'block';
      effectiveDuration = activeBlock.durationMinutes || effectiveDuration;
      effectiveMaxBookings = activeBlock.maxConcurrentPerSlot || effectiveMaxBookings;
      effectiveMaxPax = activeBlock.maxPaxPerSlot ?? effectiveMaxPax;

      const blockDaySchedule = activeBlock.daySchedules?.[dayOfWeek];
      if (blockDaySchedule) {
        if (!blockDaySchedule.enabled) {
          return {
            isBlocked: true,
            isDayAvailable: false,
            blockReason: `Data sem atendimento no período configurado (${activeBlock.title || 'Bloco'}).`,
            reason: `Data sem atendimento no período configurado.`,
            appliedMode: 'block',
            slots: [],
          };
        }
        effectiveSlots = blockDaySchedule.timeSlots && blockDaySchedule.timeSlots.length > 0
          ? blockDaySchedule.timeSlots
          : generateSlotsFromRange(blockDaySchedule.startTime, blockDaySchedule.endTime, blockDaySchedule.slotDurationMinutes || effectiveDuration);
      } else if (activeBlock.enabledDays && !activeBlock.enabledDays.includes(dayOfWeek)) {
        return {
          isBlocked: true,
          isDayAvailable: false,
          blockReason: `Dia não disponível no período selecionado (${activeBlock.title || 'Bloco'}).`,
          reason: `Dia não disponível no período selecionado.`,
          appliedMode: 'block',
          slots: [],
        };
      } else if (activeBlock.timeSlots && activeBlock.timeSlots.length > 0) {
        effectiveSlots = activeBlock.timeSlots;
      } else {
        effectiveSlots = rule.timeSlots;
      }
    } else {
      // ── 3. PRECEDÊNCIA BASE: Modo Livre vs Regra Recorrente Semanal ──────────
      const isFreeModeActive = Boolean(rule.isFreeMode || config?.isFreeMode);

      if (isFreeModeActive) {
        appliedMode = 'free';
        effectiveDuration = rule.durationMinutes || 60;
        effectiveMaxBookings = rule.maxConcurrentPerSlot || 10;
        effectiveMaxPax = rule.maxPaxPerSlot || 50;
        effectiveSlots = generateSlotsFromRange('08:00', '22:00', effectiveDuration);
      } else {
        if (rule.enabled === false) {
          return {
            isBlocked: true,
            isDayAvailable: false,
            blockReason: 'Recorrência semanal desativada para este compromisso.',
            reason: 'Recorrência semanal desativada.',
            appliedMode: 'recurring',
            slots: [],
          };
        }

        const daySchedule = rule.daySchedules?.[dayOfWeek];
        const isDayEnabled = daySchedule ? daySchedule.enabled : rule.enabledDays.includes(dayOfWeek);

        if (!isDayEnabled) {
          return {
            isBlocked: true,
            isDayAvailable: false,
            blockReason: 'Não há atendimento para este compromisso neste dia da semana.',
            reason: 'Não há atendimento para este compromisso neste dia da semana.',
            appliedMode: 'recurring',
            slots: [],
          };
        }

        if (daySchedule && daySchedule.enabled) {
          effectiveSlots = daySchedule.timeSlots && daySchedule.timeSlots.length > 0
            ? daySchedule.timeSlots
            : generateSlotsFromRange(daySchedule.startTime, daySchedule.endTime, daySchedule.slotDurationMinutes || effectiveDuration);
          effectiveDuration = daySchedule.slotDurationMinutes || effectiveDuration;
          effectiveMaxBookings = daySchedule.maxConcurrentPerSlot || effectiveMaxBookings;
          effectiveMaxPax = daySchedule.maxPaxPerSlot ?? effectiveMaxPax;
        } else {
          effectiveSlots = rule.timeSlots;
        }
      }
    }

    if (!effectiveSlots || effectiveSlots.length === 0) {
      return {
        isBlocked: true,
        isDayAvailable: false,
        blockReason: 'Nenhum horário de atendimento configurado para este dia.',
        reason: 'Nenhum horário configurado.',
        appliedMode,
        slots: [],
      };
    }

    // ── 4. Filtra agendamentos existentes no dia ─────────────────────────────────
    const targetCategory = type === 'visit' 
      ? ['Visita Comercial', 'Visita Técnica / Apresentação', 'visita'] 
      : ['Degustação Gastronômica', 'Buffet & Degustação', 'degustação', 'degustacao'];

    const dayAppointments = existingAppointments.filter(a => {
      if (a.date !== dateStr) return false;
      if (a.status === 'cancelled') return false;
      const cat = (a.category || '').toLowerCase();
      const title = (a.title || '').toLowerCase();
      return targetCategory.some(tc => cat.includes(tc) || title.includes(tc));
    });

    // ── 5. Calcula vagas e capacidade por slot ──────────────────────────────────
    const calculatedSlots: CalculatedSlot[] = effectiveSlots.map(time => {
      const slotAppointments = dayAppointments.filter(a => a.time === time);
      const currentBookings = slotAppointments.length;
      
      const currentPax = slotAppointments.reduce((acc, a) => {
        const p = a.pax ?? a.guestsCount ?? (type === 'tasting' ? 4 : 2);
        return acc + Number(p);
      }, 0);

      const maxBookings = effectiveMaxBookings;
      const maxPax = effectiveMaxPax;

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
        durationMinutes: effectiveDuration,
      };
    });

    const hasAnyAvailableSpot = calculatedSlots.some(s => s.available);

    return {
      isBlocked: false,
      isDayAvailable: hasAnyAvailableSpot,
      appliedMode,
      slots: calculatedSlots,
    };
  },

  /**
   * Checagem rápida se uma data está aberta para visitas ou degustações
   */
  checkDayAvailability(config: VenueAgendaConfig | null, dateStr: string, type: CommercialCommitmentType): boolean {
    if (!config || !dateStr) return false;
    const res = this.getAvailableSlots(config, dateStr, type, []);
    return !res.isBlocked && res.slots.length > 0;
  },

  /**
   * Filtra blocos ativos (oculta blocos passados onde endDate < todayStr)
   */
  filterActiveBlocks(blocks: import('../types/admin').AgendaBlockRule[] = [], todayStr?: string): import('../types/admin').AgendaBlockRule[] {
    const today = todayStr || new Date().toISOString().split('T')[0];
    return blocks.filter(b => !b.endDate || b.endDate >= today);
  }
};
