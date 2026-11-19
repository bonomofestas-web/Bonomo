import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ADDITIVE_METRICS, LOWER_IS_BETTER, type GoalMetricKey } from '../utils/goalActuals';

export type GoalPeriodKind = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'custom';
export type GoalStatus = 'pending' | 'active' | 'closed';

export const GOAL_KIND_LABEL: Record<GoalPeriodKind, string> = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  custom: 'Personalizado',
};

export type GoalUnit = 'money' | 'count' | 'percent' | 'minutes';
export type GoalGroup = 'result' | 'sdr' | 'closer' | 'service';

export interface GoalMetricDef {
  key: GoalMetricKey;
  label: string;
  hint: string;          // de onde vem o dado
  unit: GoalUnit;
  group: GoalGroup;
  additive: boolean;     // soma entre colaboradores (teto pela unidade)
  lowerIsBetter: boolean;
}

/** Grupos do catalogo (ordem da tela). */
export const GOAL_GROUPS: { id: GoalGroup; label: string; hint: string }[] = [
  { id: 'result', label: 'Resultado', hint: 'Faturamento e contratos' },
  { id: 'sdr', label: 'SDR · Esteira', hint: 'Do lead qualificado até o comparecimento' },
  { id: 'closer', label: 'Closer · Fechamento', hint: 'De quem compareceu até o contrato' },
  { id: 'service', label: 'Atendimento', hint: 'Tempo de resposta (só comercial)' },
];

const RAW_METRICS: { key: GoalMetricKey; label: string; hint: string; unit: GoalUnit; group: GoalGroup }[] = [
  { key: 'revenue', label: 'Faturamento', hint: 'Valor dos contratos fechados no período', unit: 'money', group: 'result' },
  { key: 'closings', label: 'Contratos fechados', hint: 'Quantidade de contratos fechados', unit: 'count', group: 'result' },
  { key: 'appointments', label: 'Agendamentos realizados', hint: 'Visitas e degustações realizadas', unit: 'count', group: 'sdr' },
  { key: 'scheduling_rate', label: 'Taxa de agendamento', hint: 'Dos leads qualificados, quantos viram agendamento', unit: 'percent', group: 'sdr' },
  { key: 'attendance_rate', label: 'Taxa de comparecimento', hint: 'Realizados sobre agendamentos finalizados', unit: 'percent', group: 'sdr' },
  { key: 'closing_rate', label: 'Taxa de fechamento', hint: 'Dos leads que compareceram, quantos fecharam', unit: 'percent', group: 'closer' },
  { key: 'response_time', label: 'Tempo da 1ª resposta', hint: 'Do primeiro contato até a primeira resposta', unit: 'minutes', group: 'service' },
  { key: 'avg_response_time', label: 'Tempo médio de resposta', hint: 'Média de qualquer mensagem; "Conversa encerrada" conta como respondida', unit: 'minutes', group: 'service' },
];

/** Catalogo de metas comerciais (marketing, como leads captados, entra em modulo proprio depois). */
export const GOAL_METRICS: GoalMetricDef[] = RAW_METRICS.map(m => ({
  ...m,
  additive: ADDITIVE_METRICS.includes(m.key),
  lowerIsBetter: LOWER_IS_BETTER.includes(m.key),
}));

/** Metas pre-marcadas por cargo: SDR -> esteira; Closer -> resultado + fechamento; os dois -> uniao. */
export const suggestedMetrics = (roles: { sdr?: boolean; closer?: boolean }): GoalMetricKey[] => {
  const out: GoalMetricKey[] = [];
  if (roles.closer) out.push('revenue', 'closings', 'closing_rate');
  if (roles.sdr) out.push('appointments', 'scheduling_rate', 'attendance_rate');
  return out;
};

export const GOAL_METRIC_LABEL = Object.fromEntries(GOAL_METRICS.map(m => [m.key, m.label])) as Record<GoalMetricKey, string>;
export const goalMetricDef = (key: GoalMetricKey): GoalMetricDef => GOAL_METRICS.find(m => m.key === key) as GoalMetricDef;

export interface GoalPeriod {
  id: string;
  masterId: string;
  venueId: string;
  kind: GoalPeriodKind;
  startsOn: string; // YYYY-MM-DD
  endsOn: string;
  status: GoalStatus;
  isRecurring: boolean;
  revenueTarget: number;
  closingsTarget: number;
  appointmentsTarget: number;
  schedulingRateTarget: number;   // qualificado -> agendado (%)
  attendanceRateTarget: number;   // comparecimento (%)
  closingRateTarget: number;      // fechamento sobre quem compareceu (%)
  responseTimeTargetMinutes: number;  // 1a resposta
  avgResponseTargetMinutes: number;   // media de qualquer mensagem
  createdByName?: string;
}

/** Meta da unidade para uma metrica (0 = sem meta). */
export const periodTarget = (p: GoalPeriod, metric: GoalMetricKey): number => {
  switch (metric) {
    case 'revenue': return p.revenueTarget;
    case 'closings': return p.closingsTarget;
    case 'appointments': return p.appointmentsTarget;
    case 'scheduling_rate': return p.schedulingRateTarget;
    case 'attendance_rate': return p.attendanceRateTarget;
    case 'closing_rate': return p.closingRateTarget;
    case 'response_time': return p.responseTimeTargetMinutes;
    case 'avg_response_time': return p.avgResponseTargetMinutes;
  }
};

/** Campo do periodo que guarda a meta de cada metrica. */
export const PERIOD_FIELD: Record<GoalMetricKey, keyof GoalPeriod> = {
  revenue: 'revenueTarget', closings: 'closingsTarget', appointments: 'appointmentsTarget',
  scheduling_rate: 'schedulingRateTarget', attendance_rate: 'attendanceRateTarget', closing_rate: 'closingRateTarget',
  response_time: 'responseTimeTargetMinutes', avg_response_time: 'avgResponseTargetMinutes',
};

export interface CollaboratorGoal {
  id: string;
  masterId: string;
  venueId: string;
  periodId: string;
  collaboratorId: string;
  metric: GoalMetricKey;
  targetValue: number;
  status: GoalStatus;
  isRecurring: boolean;
}

export interface GoalResult {
  id: string;
  venueId: string;
  periodId?: string;
  scope: 'venue' | 'collaborator';
  collaboratorId?: string;
  collaboratorName?: string;
  metric: GoalMetricKey;
  startsOn: string;
  endsOn: string;
  targetValue: number;
  actualValue: number;
  pct: number | null;
  outcome: 'met' | 'missed';
  recordedAt: string;
}

export interface GoalActor { id?: string; name?: string }

export type GoalSaveResult<T> = { ok: true; data: T } | { ok: false; reason: 'cap_exceeded' | 'exists' | 'missing_table' | 'forbidden' | 'error' };

const PERIOD_COLUMNS =
  'id, master_id, venue_id, kind, starts_on, ends_on, status, is_recurring, revenue_target, closings_target, appointments_target, scheduling_rate_target, attendance_rate_target, closing_rate_target, response_time_target_minutes, avg_response_target_minutes, created_by_name';
const GOAL_COLUMNS = 'id, master_id, venue_id, period_id, collaborator_id, metric, target_value, status, is_recurring';
const RESULT_COLUMNS =
  'id, venue_id, period_id, scope, collaborator_id, collaborator_name, metric, starts_on, ends_on, target_value, actual_value, pct, outcome, recorded_at';

const mapPeriod = (r: any): GoalPeriod => ({
  id: r.id,
  masterId: r.master_id,
  venueId: r.venue_id,
  kind: r.kind,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  status: r.status,
  isRecurring: !!r.is_recurring,
  revenueTarget: Number(r.revenue_target || 0),
  closingsTarget: Number(r.closings_target || 0),
  appointmentsTarget: Number(r.appointments_target || 0),
  schedulingRateTarget: Number(r.scheduling_rate_target || 0),
  attendanceRateTarget: Number(r.attendance_rate_target || 0),
  closingRateTarget: Number(r.closing_rate_target || 0),
  responseTimeTargetMinutes: Number(r.response_time_target_minutes || 0),
  avgResponseTargetMinutes: Number(r.avg_response_target_minutes || 0),
  createdByName: r.created_by_name || undefined,
});

const mapGoal = (r: any): CollaboratorGoal => ({
  id: r.id,
  masterId: r.master_id,
  venueId: r.venue_id,
  periodId: r.period_id,
  collaboratorId: r.collaborator_id,
  metric: r.metric,
  targetValue: Number(r.target_value || 0),
  status: r.status,
  isRecurring: !!r.is_recurring,
});

const mapResult = (r: any): GoalResult => ({
  id: r.id,
  venueId: r.venue_id,
  periodId: r.period_id || undefined,
  scope: r.scope,
  collaboratorId: r.collaborator_id || undefined,
  collaboratorName: r.collaborator_name || undefined,
  metric: r.metric,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  targetValue: Number(r.target_value),
  actualValue: Number(r.actual_value),
  pct: r.pct === null || r.pct === undefined ? null : Number(r.pct),
  outcome: r.outcome,
  recordedAt: r.recorded_at,
});

/* ───────── Datas (YYYY-MM-DD, calendario local) ───────── */

export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDaysISO = (iso: string, n: number): string => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const todayISO = (): string => toISO(new Date());
const KIND_MONTHS: Record<Exclude<GoalPeriodKind, 'custom'>, number> = { monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6 };

/** Fim do periodo que comeca em `startsOn` (kinds por mes terminam no ultimo dia do ultimo mes). */
export const endForKind = (startsOn: string, kind: Exclude<GoalPeriodKind, 'custom'>): string => {
  const s = fromISO(startsOn);
  return toISO(new Date(s.getFullYear(), s.getMonth() + KIND_MONTHS[kind], 0));
};

/** Proximo periodo, colado no fim do atual: mesmo tipo e, no personalizado, a mesma duracao em dias. */
export const nextWindow = (p: Pick<GoalPeriod, 'kind' | 'startsOn' | 'endsOn'>): { startsOn: string; endsOn: string } => {
  const startsOn = addDaysISO(p.endsOn, 1);
  if (p.kind === 'custom') {
    const days = Math.round((fromISO(p.endsOn).getTime() - fromISO(p.startsOn).getTime()) / 86400000);
    return { startsOn, endsOn: addDaysISO(startsOn, days) };
  }
  return { startsOn, endsOn: endForKind(startsOn, p.kind) };
};

export const periodDays = (p: Pick<GoalPeriod, 'startsOn' | 'endsOn'>): number =>
  Math.round((fromISO(p.endsOn).getTime() - fromISO(p.startsOn).getTime()) / 86400000) + 1;

/** Dias do periodo que caem dentro de [start, end] (datas YYYY-MM-DD). */
export const overlapDays = (p: Pick<GoalPeriod, 'startsOn' | 'endsOn'>, start: string, end: string): number => {
  const s = p.startsOn > start ? p.startsOn : start;
  const e = p.endsOn < end ? p.endsOn : end;
  if (e < s) return 0;
  return Math.round((fromISO(e).getTime() - fromISO(s).getTime()) / 86400000) + 1;
};

/** Traduz o erro do Supabase em um motivo que a tela sabe explicar. */
const failureReason = (error: { code?: string; message?: string } | null | undefined): 'cap_exceeded' | 'exists' | 'missing_table' | 'forbidden' | 'error' => {
  if (!error) return 'error';
  if (error.code === '23505') return 'exists';
  // RLS por Master: sem sessao do Supabase Auth (ou de outro Master) o banco recusa a gravacao
  if (error.code === '42501' || /row-level security/i.test(error.message || '')) return 'forbidden';
  if (error.code === '23514' || /goal_cap_exceeded/.test(error.message || '')) return 'cap_exceeded';
  if (error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(error.message || '')) return 'missing_table';
  return 'error';
};

/* ───────── Servico ───────── */

export const goalPlanService = {
  /** As tabelas de metas existem? (false quando a migration ainda nao foi aplicada) */
  async isAvailable(): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('goal_periods').select('id').limit(1);
    return !error || failureReason(error) !== 'missing_table';
  },

  async listPeriods(masterId: string, filter?: { venueId?: string; statuses?: GoalStatus[]; overlapStart?: string; overlapEnd?: string }): Promise<GoalPeriod[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    let q = supabase.from('goal_periods').select(PERIOD_COLUMNS).eq('master_id', masterId);
    if (filter?.venueId) q = q.eq('venue_id', filter.venueId);
    if (filter?.statuses?.length) q = q.in('status', filter.statuses);
    if (filter?.overlapStart) q = q.gte('ends_on', filter.overlapStart);
    if (filter?.overlapEnd) q = q.lte('starts_on', filter.overlapEnd);
    const { data, error } = await q.order('starts_on', { ascending: false });
    if (error) {
      console.error('[goalPlanService.listPeriods]', error.message);
      return [];
    }
    return (data || []).map(mapPeriod);
  },

  async listCollaboratorGoals(masterId: string, filter?: { venueId?: string; periodIds?: string[]; collaboratorId?: string }): Promise<CollaboratorGoal[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    if (filter?.periodIds && filter.periodIds.length === 0) return [];
    let q = supabase.from('collaborator_goals').select(GOAL_COLUMNS).eq('master_id', masterId);
    if (filter?.venueId) q = q.eq('venue_id', filter.venueId);
    if (filter?.collaboratorId) q = q.eq('collaborator_id', filter.collaboratorId);
    if (filter?.periodIds) q = q.in('period_id', filter.periodIds);
    const { data, error } = await q;
    if (error) {
      console.error('[goalPlanService.listCollaboratorGoals]', error.message);
      return [];
    }
    return (data || []).map(mapGoal);
  },

  async listResults(masterId: string, filter?: { venueId?: string; collaboratorId?: string; limit?: number }): Promise<GoalResult[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    let q = supabase.from('goal_results').select(RESULT_COLUMNS).eq('master_id', masterId);
    if (filter?.venueId) q = q.eq('venue_id', filter.venueId);
    if (filter?.collaboratorId) q = q.eq('collaborator_id', filter.collaboratorId);
    const { data, error } = await q.order('ends_on', { ascending: false }).limit(filter?.limit ?? 500);
    if (error) {
      console.error('[goalPlanService.listResults]', error.message);
      return [];
    }
    return (data || []).map(mapResult);
  },

  /** Cria ou atualiza o periodo da unidade. Quem edita fica no audit; resultados antigos nunca mudam. */
  async savePeriod(
    masterId: string,
    input: Omit<GoalPeriod, 'id' | 'masterId' | 'createdByName'> & { id?: string },
    actor?: GoalActor,
    previous?: GoalPeriod,
  ): Promise<GoalSaveResult<GoalPeriod>> {
    if (!isSupabaseConfigured || !masterId || !input.venueId) return { ok: false, reason: 'error' };
    const row = {
      master_id: masterId,
      venue_id: input.venueId,
      kind: input.kind,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      status: input.status,
      is_recurring: input.isRecurring,
      revenue_target: input.revenueTarget,
      closings_target: input.closingsTarget,
      appointments_target: input.appointmentsTarget,
      scheduling_rate_target: input.schedulingRateTarget,
      attendance_rate_target: input.attendanceRateTarget,
      closing_rate_target: input.closingRateTarget,
      response_time_target_minutes: input.responseTimeTargetMinutes,
      avg_response_target_minutes: input.avgResponseTargetMinutes,
      updated_at: new Date().toISOString(),
      ...(input.id ? {} : { created_by_id: actor?.id || null, created_by_name: actor?.name || null }),
    };
    const query = input.id
      ? supabase.from('goal_periods').update(row).eq('id', input.id).eq('master_id', masterId)
      : supabase.from('goal_periods').insert(row);
    const { data, error } = await query.select(PERIOD_COLUMNS).single();
    if (error || !data) {
      console.error('[goalPlanService.savePeriod]', error?.message);
      return { ok: false, reason: failureReason(error) };
    }
    if (previous) {
      const fields: [string, unknown, unknown][] = [
        ['revenue_target', previous.revenueTarget, input.revenueTarget],
        ['closings_target', previous.closingsTarget, input.closingsTarget],
        ['appointments_target', previous.appointmentsTarget, input.appointmentsTarget],
        ['scheduling_rate_target', previous.schedulingRateTarget, input.schedulingRateTarget],
        ['attendance_rate_target', previous.attendanceRateTarget, input.attendanceRateTarget],
        ['closing_rate_target', previous.closingRateTarget, input.closingRateTarget],
        ['response_time_target_minutes', previous.responseTimeTargetMinutes, input.responseTimeTargetMinutes],
        ['avg_response_target_minutes', previous.avgResponseTargetMinutes, input.avgResponseTargetMinutes],
        ['is_recurring', previous.isRecurring, input.isRecurring],
        ['starts_on', previous.startsOn, input.startsOn],
        ['ends_on', previous.endsOn, input.endsOn],
      ];
      await goalPlanService.audit(masterId, fields.filter(([, a, b]) => a !== b).map(([field, a, b]) => ({
        venueId: input.venueId, periodId: data.id, field, oldValue: String(a), newValue: String(b),
      })), actor);
    }
    return { ok: true, data: mapPeriod(data) };
  },

  async setPeriodStatus(masterId: string, periodId: string, status: GoalStatus): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId) return false;
    const { error } = await supabase
      .from('goal_periods').update({ status, updated_at: new Date().toISOString() })
      .eq('id', periodId).eq('master_id', masterId);
    if (error) console.error('[goalPlanService.setPeriodStatus]', error.message);
    return !error;
  },

  /** Meta individual (upsert por periodo + colaborador + metrica). O banco recusa quem estoura o teto da unidade. */
  async saveCollaboratorGoal(
    masterId: string,
    input: Omit<CollaboratorGoal, 'id' | 'masterId'> & { id?: string },
    actor?: GoalActor,
    previous?: CollaboratorGoal,
  ): Promise<GoalSaveResult<CollaboratorGoal>> {
    if (!isSupabaseConfigured || !masterId) return { ok: false, reason: 'error' };
    const { data, error } = await supabase
      .from('collaborator_goals')
      .upsert({
        master_id: masterId,
        venue_id: input.venueId,
        period_id: input.periodId,
        collaborator_id: input.collaboratorId,
        metric: input.metric,
        target_value: input.targetValue,
        status: input.status,
        is_recurring: input.isRecurring,
        updated_at: new Date().toISOString(),
        ...(previous ? {} : { created_by_id: actor?.id || null, created_by_name: actor?.name || null }),
      }, { onConflict: 'period_id,collaborator_id,metric' })
      .select(GOAL_COLUMNS)
      .single();
    if (error || !data) {
      console.error('[goalPlanService.saveCollaboratorGoal]', error?.message);
      return { ok: false, reason: failureReason(error) };
    }
    if (previous && previous.targetValue !== input.targetValue) {
      await goalPlanService.audit(masterId, [{
        venueId: input.venueId, periodId: input.periodId, collaboratorId: input.collaboratorId, metric: input.metric,
        field: 'target_value', oldValue: String(previous.targetValue), newValue: String(input.targetValue),
      }], actor);
    }
    return { ok: true, data: mapGoal(data) };
  },

  async deleteCollaboratorGoal(masterId: string, goalId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId) return false;
    const { error } = await supabase.from('collaborator_goals').delete().eq('id', goalId).eq('master_id', masterId);
    if (error) console.error('[goalPlanService.deleteCollaboratorGoal]', error.message);
    return !error;
  },

  /** Ativa varias metas de uma vez ("Ativar tudo"): periodo pendente e metas pendentes da unidade. */
  async activateAll(masterId: string, venueId: string, periodIds: string[]): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId || periodIds.length === 0) return false;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('goal_periods').update({ status: 'active', updated_at: now })
      .in('id', periodIds).eq('master_id', masterId).eq('venue_id', venueId).eq('status', 'pending');
    if (error) { console.error('[goalPlanService.activateAll]', error.message); return false; }
    const { error: gError } = await supabase
      .from('collaborator_goals').update({ status: 'active', updated_at: now })
      .in('period_id', periodIds).eq('master_id', masterId).eq('status', 'pending');
    if (gError) console.error('[goalPlanService.activateAll goals]', gError.message);
    return !gError;
  },

  async setGoalStatus(masterId: string, goalId: string, status: GoalStatus): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId) return false;
    const { error } = await supabase
      .from('collaborator_goals').update({ status, updated_at: new Date().toISOString() })
      .eq('id', goalId).eq('master_id', masterId);
    if (error) console.error('[goalPlanService.setGoalStatus]', error.message);
    return !error;
  },

  async audit(
    masterId: string,
    rows: { venueId?: string; periodId?: string; collaboratorId?: string; metric?: string; field: string; oldValue?: string; newValue?: string }[],
    actor?: GoalActor,
  ): Promise<void> {
    if (!isSupabaseConfigured || !masterId || rows.length === 0) return;
    const { error } = await supabase.from('goal_audit').insert(rows.map(r => ({
      master_id: masterId,
      venue_id: r.venueId || null,
      period_id: r.periodId || null,
      collaborator_id: r.collaboratorId || null,
      metric: r.metric || null,
      field: r.field,
      old_value: r.oldValue ?? null,
      new_value: r.newValue ?? null,
      changed_by_id: actor?.id || null,
      changed_by_name: actor?.name || null,
    })));
    if (error) console.error('[goalPlanService.audit]', error.message);
  },

  /** Grava resultados ignorando os que ja existem (virada idempotente). Resultados nunca sao alterados. */
  async insertResults(masterId: string, rows: Omit<GoalResult, 'id' | 'recordedAt'>[]): Promise<void> {
    if (!isSupabaseConfigured || !masterId || rows.length === 0) return;
    const payload = rows.map(r => ({
      master_id: masterId,
      venue_id: r.venueId,
      period_id: r.periodId || null,
      scope: r.scope,
      collaborator_id: r.collaboratorId || null,
      collaborator_name: r.collaboratorName || null,
      metric: r.metric,
      starts_on: r.startsOn,
      ends_on: r.endsOn,
      target_value: r.targetValue,
      actual_value: r.actualValue,
      pct: r.pct,
      outcome: r.outcome,
    }));
    const { error } = await supabase.from('goal_results').insert(payload);
    if (!error) return;
    if (error.code !== '23505') { console.error('[goalPlanService.insertResults]', error.message); return; }
    // Algum resultado ja existia: insere um a um, ignorando duplicados
    for (const row of payload) {
      const { error: oneError } = await supabase.from('goal_results').insert(row);
      if (oneError && oneError.code !== '23505') console.error('[goalPlanService.insertResults]', oneError.message);
    }
  },

  /** Cria o proximo periodo (mesmas metas) e copia as metas individuais. Retorna false se ele ja existia. */
  async createNextPeriod(masterId: string, period: GoalPeriod, goals: CollaboratorGoal[], actor?: GoalActor): Promise<boolean> {
    const win = nextWindow(period);
    const { data, error } = await supabase
      .from('goal_periods')
      .insert({
        master_id: masterId,
        venue_id: period.venueId,
        kind: period.kind,
        starts_on: win.startsOn,
        ends_on: win.endsOn,
        // Recorrente: o proximo periodo ja nasce ativo. Senao, fica pendente para reconfigurar e ativar.
        status: period.isRecurring ? 'active' : 'pending',
        is_recurring: period.isRecurring,
        revenue_target: period.revenueTarget,
        closings_target: period.closingsTarget,
        appointments_target: period.appointmentsTarget,
        scheduling_rate_target: period.schedulingRateTarget,
        attendance_rate_target: period.attendanceRateTarget,
        closing_rate_target: period.closingRateTarget,
        response_time_target_minutes: period.responseTimeTargetMinutes,
        avg_response_target_minutes: period.avgResponseTargetMinutes,
        created_by_name: actor?.name || null,
        created_by_id: actor?.id || null,
      })
      .select('id')
      .single();
    if (error || !data) {
      if (error && error.code !== '23505') console.error('[goalPlanService.createNextPeriod]', error.message);
      return false;
    }
    const copies = goals
      .filter(g => g.status === 'active' || g.status === 'closed')
      .map(g => ({
        master_id: masterId,
        venue_id: g.venueId,
        period_id: data.id,
        collaborator_id: g.collaboratorId,
        metric: g.metric,
        target_value: g.targetValue,
        status: period.isRecurring && g.isRecurring ? 'active' : 'pending',
        is_recurring: g.isRecurring,
      }));
    if (copies.length > 0) {
      const { error: copyError } = await supabase.from('collaborator_goals').insert(copies);
      if (copyError) console.error('[goalPlanService.createNextPeriod copy]', copyError.message);
    }
    return true;
  },
};
