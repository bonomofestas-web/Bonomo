import type { Client, Collaborator, CommercialFunnel, Lead } from '../types/admin';
import { buildJourneyCohort, journeyRates, pctOf } from './leadJourney';

/** Metas comerciais: resultado, esteira (taxas), fechamento e atendimento. Marketing (leads captados) fica de fora. */
export type GoalMetricKey =
  | 'revenue' | 'closings' | 'appointments'
  | 'scheduling_rate' | 'attendance_rate' | 'closing_rate'
  | 'response_time' | 'avg_response_time';

/** Metas de volume somam entre colaboradores (teto pela unidade); taxas e tempos sao individuais. */
export const ADDITIVE_METRICS: GoalMetricKey[] = ['revenue', 'closings', 'appointments'];
/** Menor e melhor. */
export const LOWER_IS_BETTER: GoalMetricKey[] = ['response_time', 'avg_response_time'];

export interface ActualsInput {
  leads: Lead[];
  clients: Client[];
  funnels: CommercialFunnel[];
  collaborators: Pick<Collaborator, 'id' | 'role'>[];
}

/** Resumo de tempo de resposta (so comercial) da janela, vindo de responseTimeService. */
export interface ResponseSummaryInput {
  total: { avgAll: number | null; avgFirst: number | null };
  byResponder: Map<string, { avgAll: number | null; avgFirst: number | null }>;
}

export interface VenueActuals {
  revenue: number;
  closings: number;
  appointments: number;
  schedulingRate: number | null;  // qualificado -> agendado
  attendanceRate: number | null;  // realizados / finalizados
  closingRate: number | null;     // fechados / compareceram
  responseTime: number | null;    // 1a resposta
  avgResponseTime: number | null; // qualquer mensagem
}

export type CollaboratorActuals = Record<GoalMetricKey, number | null>;

export interface GoalActuals {
  venue: VenueActuals;
  byCollaborator: Map<string, CollaboratorActuals>;
}

const parseTs = (iso?: string | null): number => {
  if (!iso) return NaN;
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime();
};

const inWindow = (iso: string | undefined | null, start: number, end: number): boolean => {
  const t = parseTs(iso);
  return !Number.isNaN(t) && t >= start && t <= end;
};

/** Datas YYYY-MM-DD (inclusivas, no horario local) para os limites da janela. */
export const windowBounds = (startsOn: string, endsOn: string): { start: number; end: number } => ({
  start: new Date(`${startsOn}T00:00:00`).getTime(),
  end: new Date(`${endsOn}T23:59:59.999`).getTime(),
});

/**
 * Realizado de uma unidade em uma janela. Definicoes iguais as do dashboard (src/utils/leadJourney.ts):
 * fechamentos e faturamento pela data do contrato; agendamentos realizados; comparecimento = realizados / finalizados;
 * taxa de agendamento e de fechamento sobre a coorte de leads criados na janela.
 * Por colaborador: SDR pelo sdrId (agendamento, comparecimento), Closer pelo closerId (faturamento, fechamento).
 * Tempos de resposta (so comercial) vem de `response`, calculado por responseTimeService.
 */
export const computeGoalActuals = (
  input: ActualsInput,
  venueIdOrIds: string | string[],
  startsOn: string,
  endsOn: string,
  response?: ResponseSummaryInput,
): GoalActuals => {
  const { start, end } = windowBounds(startsOn, endsOn);
  // Uma unidade ou varias (visao de gestao soma as casas)
  const venueSet = new Set(Array.isArray(venueIdOrIds) ? venueIdOrIds : [venueIdOrIds]);

  const wonStages = new Set<string>();
  const lossStages = new Set<string>();
  input.funnels.forEach(f => (f.stages || []).forEach(s => { if (s.isWon) wonStages.add(s.id); if (s.isLoss) lossStages.add(s.id); }));
  const isClosed = (l: Lead) => l.stage === 'contract_signed' || wonStages.has(String(l.stage));
  const isLost = (l: Lead) => !isClosed(l) && (lossStages.has(String(l.stage)) || l.stage === 'lost');

  const clientByLead = new Map<string, Client>();
  input.clients.forEach(c => {
    const key = c.commercialLeadId || c.originalLeadId;
    if (key && venueSet.has(c.venueId)) clientByLead.set(key, c);
  });
  const closedDate = (l: Lead) => l.contractDate || clientByLead.get(l.id)?.contractDate || l.updatedAt || l.createdAt;
  const valueOf = (l: Lead) => {
    const c = clientByLead.get(l.id);
    return Number(c?.baseContractValue ?? c?.dealValue ?? l.dealValue ?? 0);
  };

  const scoped = input.leads.filter(l => venueSet.has(l.venueId) && !l.isRemovedFromFunnel);

  interface Row { revenue: number; closings: number; appointments: number; done: number; finished: number }
  const blank = (): Row => ({ revenue: 0, closings: 0, appointments: 0, done: 0, finished: 0 });
  const acc = new Map<string, Row>();
  const ensure = (id: string): Row => {
    let row = acc.get(id);
    if (!row) { row = blank(); acc.set(id, row); }
    return row;
  };
  const venueRow = blank();

  scoped.forEach(l => {
    if (isClosed(l) && inWindow(closedDate(l), start, end)) {
      const value = valueOf(l);
      venueRow.revenue += value;
      venueRow.closings += 1;
      // Closer conta faturamento e fechamento; SDR conta a participacao no fechamento
      [l.closerId, l.sdrId && l.sdrId !== l.closerId ? l.sdrId : undefined].filter(Boolean).forEach(id => {
        const r = ensure(id as string);
        r.revenue += value;
        r.closings += 1;
      });
    }
    [l.visitCommitment, l.tastingCommitment].forEach(c => {
      if (!c) return;
      if (!inWindow(c.completedAt || c.date || c.scheduledAt, start, end)) return;
      if (c.status === 'completed') {
        venueRow.appointments += 1; venueRow.done += 1; venueRow.finished += 1;
        if (l.sdrId) { const r = ensure(l.sdrId); r.appointments += 1; r.done += 1; r.finished += 1; }
      } else if (c.status === 'no_show' || c.status === 'cancelled') {
        venueRow.finished += 1;
        if (l.sdrId) ensure(l.sdrId).finished += 1;
      }
    });
  });

  // Coorte (leads criados na janela): taxa de agendamento por SDR e de fechamento por Closer
  const cohort = scoped.filter(l => inWindow(l.createdAt, start, end));
  const venueRates = journeyRates(buildJourneyCohort(cohort, isClosed, isLost));
  const bySdr = new Map<string, Lead[]>();
  const byCloser = new Map<string, Lead[]>();
  cohort.forEach(l => {
    if (l.sdrId) bySdr.set(l.sdrId, [...(bySdr.get(l.sdrId) || []), l]);
    if (l.closerId) byCloser.set(l.closerId, [...(byCloser.get(l.closerId) || []), l]);
  });

  const venue: VenueActuals = {
    revenue: venueRow.revenue,
    closings: venueRow.closings,
    appointments: venueRow.appointments,
    schedulingRate: venueRates.schedulingRate,
    attendanceRate: pctOf(venueRow.done, venueRow.finished),
    closingRate: venueRates.closingRate,
    responseTime: response?.total.avgFirst ?? null,
    avgResponseTime: response?.total.avgAll ?? null,
  };

  const ids = new Set<string>([...acc.keys(), ...bySdr.keys(), ...byCloser.keys(), ...(response ? response.byResponder.keys() : [])]);
  const byCollaborator = new Map<string, CollaboratorActuals>();
  ids.forEach(id => {
    const row = acc.get(id) || blank();
    const resp = response?.byResponder.get(id);
    const sdrLeads = bySdr.get(id);
    const closerLeads = byCloser.get(id);
    byCollaborator.set(id, {
      revenue: row.revenue,
      closings: row.closings,
      appointments: row.appointments,
      scheduling_rate: sdrLeads ? journeyRates(buildJourneyCohort(sdrLeads, isClosed, isLost)).schedulingRate : null,
      attendance_rate: pctOf(row.done, row.finished),
      closing_rate: closerLeads ? journeyRates(buildJourneyCohort(closerLeads, isClosed, isLost)).closingRate : null,
      response_time: resp?.avgFirst ?? null,
      avg_response_time: resp?.avgAll ?? null,
    });
  });
  return { venue, byCollaborator };
};

/** Valor realizado de uma meta de colaborador (0 nas metas de volume quando a pessoa nao teve atividade). */
export const collaboratorActual = (actuals: GoalActuals, collaboratorId: string, metric: GoalMetricKey): number | null => {
  const row = actuals.byCollaborator.get(collaboratorId);
  if (!row) return ADDITIVE_METRICS.includes(metric) ? 0 : null;
  return row[metric];
};

export const venueActual = (actuals: GoalActuals, metric: GoalMetricKey): number | null => {
  switch (metric) {
    case 'revenue': return actuals.venue.revenue;
    case 'closings': return actuals.venue.closings;
    case 'appointments': return actuals.venue.appointments;
    case 'scheduling_rate': return actuals.venue.schedulingRate;
    case 'attendance_rate': return actuals.venue.attendanceRate;
    case 'closing_rate': return actuals.venue.closingRate;
    case 'response_time': return actuals.venue.responseTime;
    case 'avg_response_time': return actuals.venue.avgResponseTime;
  }
};

/** Meta batida? Tempos de resposta sao "menor e melhor"; as demais, "maior ou igual". */
export const goalMet = (metric: GoalMetricKey, target: number, actual: number | null): boolean => {
  if (actual === null) return false;
  return LOWER_IS_BETTER.includes(metric) ? actual <= target : actual >= target;
};

/** % atingido (tempos: 100% quando esta no limite; acima de 100% quando e mais rapido). */
export const goalPct = (metric: GoalMetricKey, target: number, actual: number | null): number | null => {
  if (target <= 0 || actual === null) return null;
  if (LOWER_IS_BETTER.includes(metric)) return actual <= 0 ? null : Math.round((target / actual) * 100);
  return Math.round((actual / target) * 100);
};
