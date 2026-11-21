import { useEffect, useMemo, useRef, useState } from 'react';
import { responseTimeService, summarizeResponsePairs, type ResponsePair } from '../services/responseTimeService';
import { useAdminState } from '../context/AdminStateContext';
import { goalsService, type VenueBaseline, type VenueGoalRecord } from '../services/goalsService';
import { leadService } from '../services/leadService';
import { metricsService } from '../services/metricsService';
import { MQL_QUALIFIED_MIN } from '../utils/mqlScore';
import { buildJourneyCohort, commitmentDone, hasMql, isDisqualified, pctOf, wasAttended, wasScheduled } from '../utils/leadJourney';
import {
  goalPlanService, overlapDays, periodDays, toISO,
  type CollaboratorGoal, type GoalPeriod,
} from '../services/goalPlanService';
import { useGoalRollover } from './useGoalRollover';
import { getCommercialRolesInVenue, isCommercialCollaborator } from '../utils/funnelResponsibility';
import {
  bucketCount, bucketIndex, bucketLabel, inRange as baseInRange, pctDelta, pickGranularity, rangeDays, resolvePeriod,
  type DateRange, type PeriodSelection, type ResolvedPeriod,
} from '../utils/dashboardPeriod';
import type { Client, CollaboratorGoals, CommercialCommitment, CommercialFunnel, Lead } from '../types/admin';

/* ───────────── Tipos de saida ───────────── */

export interface WindowKpis {
  leadsCreated: number;
  closings: number;
  revenue: number;
  visits: number;     // Visitas comerciais realizadas
  tastings: number;   // Degustacoes realizadas
  appointments: number;
  conversionRate: number;      // % de leads criados na janela que viraram contrato
  avgResponseMinutes: number | null;
}

export interface Delta {
  current: number;
  previous: number;
  pct: number | null; // null = sem base de comparacao
}

export interface EvolutionPoint {
  label: string;
  closings: number;
  closingsPrev: number;
  revenue: number;
  revenuePrev: number;
  visits: number;
  visitsPrev: number;
  tastings: number;
  tastingsPrev: number;
}

export interface FunnelStep {
  id: string;
  name: string;
  count: number;
  passRate: number | null; // % vindo da etapa anterior
}

export interface SourceRank { source: string; closings: number; revenue: number }

export interface CloserRank {
  id: string;
  name: string;
  revenue: number;
  closings: number;
  revenuePrev: number;
  closingsPrev: number;
  topSdrName: string | null;
  topSdrCount: number;
  avatarUrl?: string;
}

export interface SdrRank {
  id: string;
  name: string;
  visits: number;
  tastings: number;
  appointments: number;
  appointmentsPrev: number;
  closingParticipations: number;
  avatarUrl?: string;
  qualified: number;          // leads criados na janela dentro da base de qualificacao
  scheduledLeads: number;     // desses, quantos foram agendados
  attendedFinished: number;   // agendamentos finalizados (realizados, faltas, cancelados) na janela
  attendedDone: number;       // agendamentos realizados na janela
  qualToSchedRate: number | null;   // % qualificado -> agendado
  schedToAttendRate: number | null; // % agendado -> compareceu
  closingRate: number | null;       // % qualificado -> fechou (participacao em fechamento)
  score: number | null;       // nota 0-100 (null = sem dados suficientes)
  ranked: boolean;            // false = volume abaixo do minimo para disputar posicao
}

/** Esteira do lead (coorte: leads criados na janela). */
export interface LeadJourney {
  captured: Delta;
  mqlInUse: boolean;        // ha ao menos um lead com MQL respondido na coorte
  qualified: number;        // mqlScore >= MQL_QUALIFIED_MIN
  disqualified: number;     // mqlScore < MQL_QUALIFIED_MIN
  withoutMql: number;       // sem MQL respondido
  notDisqualified: number;  // captados - desqualificados
  scheduled: number;
  attended: number;
  won: number;
  lost: number;
  open: number;
  qualToSchedRate: number | null;
  schedToAttendRate: number | null;
  attendToWonRate: number | null;
  winRate: number | null;   // ganhos / captados
  lossRate: number | null;  // perdidos / captados
  dropoff: { stage: string; count: number }[]; // etapa em que os perdidos desistiram
}

export { MQL_QUALIFIED_MIN };
/** Pesos da nota do SDR (so o que ele controla): qualificado->agendado e agendado->compareceu. */
export const SDR_SCORE_WEIGHTS = { qualToSched: 0.4, schedToAttend: 0.6 } as const;
/** Forca da suavizacao rumo a media do time (tentativas "virtuais"): evita 1 de 1 = 100%, sem excluir ninguem. */
export const SDR_SMOOTHING_K = 5;

export interface CollaboratorRow {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  avgResponseMinutes: number | null; // 1a resposta (so comercial)
  avgReplyMinutes: number | null;    // media de qualquer mensagem respondida (so comercial)
  deliveries: number; // fechamentos (closer) ou agendamentos (sdr)
  deliveriesLabel: string;
  goals?: CollaboratorGoals;
  goalPct: number | null;
  responseTarget: number | null; // meta individual, ou da unidade como fallback
  activeMinutes: number | null;  // soma (ultima - primeira atividade) por dia
  activeDays: number;
  messages: number;      // mensagens enviadas na janela
  conversations: number; // conversas distintas atendidas na janela
  deliveriesPrev: number;
  avgResponsePrev: number | null;
  goalDetail: string | null; // ex.: "R$ 12.000 de R$ 30.000"
}

export interface DeepKpis {
  leads: Delta;
  avgTicket: Delta;
  salesCycleDays: { current: number | null; previous: number | null; pct: number | null };
  showRate: { current: number | null; previous: number | null; pct: number | null; sample: number };
  lossRate: Delta;
}

export interface PipelineSnapshot {
  openLeads: number;
  openValue: number;
  stalledLeads: number; // abertos sem interacao ha mais de 7 dias
  stalledValue: number;
}

export interface LossReasonRow { reason: string; count: number }

export interface SourceEfficiency { source: string; leads: number; closed: number; conversion: number; revenue: number }

export interface VenueRow {
  id: string;
  name: string;
  leads: number;
  closings: number;
  revenue: number;
  revenuePrev: number;
  conversion: number;
  avgTicket: number;
}

export interface CommercialDashboardData {
  loading: boolean;
  /** Metas do periodo ativo, proporcionais a janela (null = sem meta). */
  targets: { closings: number | null; appointments: number | null; schedulingRate: number | null; attendanceRate: number | null; closingRate: number | null };
  responseTruncated: boolean; // leitura de conversas atingiu o limite: tempos de resposta podem estar incompletos
  closedWithoutDate: number; // contratos do periodo sem data de fechamento (usam a ultima edicao)
  baselineMissing: boolean;  // comparando com "Base da unidade", mas nenhuma casa do escopo tem base cadastrada
  presenceTruncated: boolean;
  deep: DeepKpis;
  journey: LeadJourney;
  pipeline: PipelineSnapshot;
  lossReasons: LossReasonRow[];
  lostCount: number;
  heatmap: number[][]; // [diaDaSemana 0=dom..6=sab][faixa 0..3] leads criados
  sourceEfficiency: SourceEfficiency[];
  venueRows: VenueRow[];
  loadingPresence: boolean;
  resolved: ResolvedPeriod;
  granularity: 'day' | 'week' | 'month';
  kpis: {
    closings: Delta;
    appointments: Delta;
    visits: Delta;
    tastings: Delta;
    conversion: Delta;
    response: { current: number | null; previous: number | null; pct: number | null; target: number | null };
    /** Tempo medio de resposta a QUALQUER mensagem (so comercial; "Conversa Encerrada" conta como respondida). */
    avgResponse: { current: number | null; previous: number | null; pct: number | null; target: number | null };
    revenue: Delta;
  };
  pacing: { revenue: number; target: number; expected: number; pct: number | null; expectedPct: number };
  /** Entrada no periodo: o que entrou em caixa (entradas/sinais pagos, liquido) e o contratado dos fechamentos do periodo */
  entry: { cash: Delta; contracted: Delta; hasCashData: boolean };
  funnel: FunnelStep[];
  evolution: EvolutionPoint[];
  sources: SourceRank[];
  closers: CloserRank[];
  sdrs: SdrRank[];
  collaborators: CollaboratorRow[];
  hasData: boolean;
}

/* ───────────── Helpers puros ───────────── */

// Cache de parse de datas: evita reconverter a mesma string ISO a cada varredura.
const tsCache = new Map<string, number>();
const parseTs = (iso: string): number => {
  let t = tsCache.get(iso);
  if (t === undefined) {
    t = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime();
    if (tsCache.size > 200000) tsCache.clear();
    tsCache.set(iso, t);
  }
  return t;
};
const inRange = (iso: string | undefined | null, range: DateRange): boolean => {
  if (!iso) return false;
  const t = parseTs(iso);
  return !Number.isNaN(t) && t >= range.start.getTime() && t <= range.end.getTime();
};
void baseInRange;

const commitmentDate = (c?: CommercialCommitment): string | undefined => c?.completedAt || c?.date || c?.scheduledAt;

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;

const delta = (current: number, previous: number): Delta => ({ current, previous, pct: pctDelta(current, previous) });

/**
 * Meta de faturamento (venue_goals) prorrateada pelos dias de cada mes que a janela cobre.
 * Por unidade e mes vale uma unica meta (sem somar duplicatas): prefere a mensal; sem ela,
 * usa a trimestral (1/3) ou a anual (1/12) do ano.
 */
const targetForRange = (goals: VenueGoalRecord[], venueIds: string[], range: DateRange): number => {
  const monthlyTarget = (venueId: string, y: number, m: number): number => {
    const mine = goals.filter(g => g.venueId === venueId && g.year === y);
    const monthly = mine.filter(g => g.period === 'monthly' && g.month === m);
    if (monthly.length > 0) return Math.max(...monthly.map(g => g.revenueTarget));
    const quarterly = mine.filter(g => g.period === 'quarterly');
    if (quarterly.length > 0) return Math.max(...quarterly.map(g => g.revenueTarget)) / 3;
    const yearly = mine.filter(g => g.period === 'yearly');
    if (yearly.length > 0) return Math.max(...yearly.map(g => g.revenueTarget)) / 12;
    return 0;
  };
  let total = 0;
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  while (cursor <= range.end) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    const overlapStart = monthStart > range.start ? monthStart : range.start;
    const overlapEnd = monthEnd < range.end ? monthEnd : range.end;
    const overlapDays = Math.max(0, rangeDays({ start: overlapStart, end: overlapEnd }));
    const monthDays = new Date(y, m, 0).getDate();
    const monthly = venueIds.reduce((sum, id) => sum + monthlyTarget(id, y, m), 0);
    total += monthly * (overlapDays / monthDays);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
};

/**
 * Quantos "meses" a janela representa, pelos dias reais de cada mes (meta mensal / dias do mes * dias da janela).
 * Ex.: meta de R$ 400 mil em um mes de 31 dias: janela de 7 dias = 7/31 da meta.
 */
const monthsEquivalent = (range: DateRange): number => {
  let total = 0;
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  while (cursor <= range.end) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    const overlapStart = monthStart > range.start ? monthStart : range.start;
    const overlapEnd = monthEnd < range.end ? monthEnd : range.end;
    total += Math.max(0, rangeDays({ start: overlapStart, end: overlapEnd })) / new Date(y, m, 0).getDate();
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
};

const clientLeadKey =(c: Client): string | undefined => c.commercialLeadId || c.originalLeadId;

/* ───────────── Hook ───────────── */

export const useCommercialDashboardData = (selection: PeriodSelection, venueScope: string = 'all'): CommercialDashboardData => {
  const { leads, clients, collaborators, funnels, venues, activeVenueId, currentUser } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';

  // Venues no escopo: dados de `venues` ja vem isolados por Master no contexto.
  // venueScope ('all' | id) e o filtro proprio do dashboard; dentro dele vale tambem o activeVenueId global.
  const venueIds = useMemo(() => {
    const all = venues.map(v => v.id);
    const base = !activeVenueId || activeVenueId === 'all' || activeVenueId === 'multi' || !all.includes(activeVenueId)
      ? all
      : [activeVenueId];
    if (venueScope && venueScope !== 'all' && base.includes(venueScope)) return [venueScope];
    return base;
  }, [venues, activeVenueId, venueScope]);

  // Metricas base das casas (comparacao "Base da unidade")
  const [baselines, setBaselines] = useState<VenueBaseline[]>([]);
  const wantsBaseline = selection.compareMode === 'baseline';
  useEffect(() => {
    let cancelled = false;
    if (!masterId || !wantsBaseline) return;
    goalsService.listVenueBaselines(masterId)
      .then(rows => { if (!cancelled) setBaselines(rows); })
      .catch(() => { if (!cancelled) setBaselines([]); });
    return () => { cancelled = true; };
  }, [masterId, wantsBaseline]);

  const resolved = useMemo(() => resolvePeriod(selection), [selection]);

  // Metas de unidade (venue_goals) reais, para o termometro de meta
  const [venueGoals, setVenueGoals] = useState<VenueGoalRecord[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const goalYear = resolved.goalRange.start.getFullYear();
  const goalEndYear = resolved.goalRange.end.getFullYear();

  // Tempo real: contrato criado/aprovado/cancelado (evento do AdminStateContext) refaz a busca das metas
  const [realtimeTick, setRealtimeTick] = useState(0);
  useEffect(() => {
    const onChanged = () => setRealtimeTick(t => t + 1);
    window.addEventListener('f5:contracts-changed', onChanged);
    return () => window.removeEventListener('f5:contracts-changed', onChanged);
  }, []);

  // Contratos fechados (data de fechamento) e entradas pagas: alimentam faturamento sem lead e a metrica de entrada
  const [contractFacts, setContractFacts] = useState<Array<{ id: string; venueId: string; total: number; entry: number; closedAt: string; originLeadId: string | null }>>([]);
  const [entryCashFacts, setEntryCashFacts] = useState<Array<{ date: string; net: number; venueId: string }>>([]);
  const venueIdsKey = venueIds.join(',');
  useEffect(() => {
    let cancelled = false;
    if (!masterId) return;
    Promise.all([metricsService.getClosedContractFacts(masterId, venueIds), metricsService.getEntryCashFacts(masterId, venueIds)])
      .then(([c, e]) => { if (!cancelled) { setContractFacts(c); setEntryCashFacts(e); } })
      .catch(() => { if (!cancelled) { setContractFacts([]); setEntryCashFacts([]); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterId, venueIdsKey, realtimeTick]);

  useEffect(() => {
    let cancelled = false;
    if (!masterId) {
      setLoadingGoals(false);
      return;
    }
    // Skeleton so na primeira carga; trocas de periodo atualizam as metas sem apagar a tela.
    goalsService.listVenueGoals(masterId)
      .then(rows => {
        if (cancelled) return;
        setVenueGoals(rows.filter(r => r.year >= goalYear && r.year <= goalEndYear));
      })
      .catch(() => { if (!cancelled) setVenueGoals([]); })
      .finally(() => { if (!cancelled) setLoadingGoals(false); });
    return () => { cancelled = true; };
  }, [masterId, goalYear, goalEndYear, realtimeTick]);

  // Metas por periodo (novo modelo): metas da unidade e metas individuais ATIVAS que tocam a janela
  const [goalPeriods, setGoalPeriods] = useState<GoalPeriod[]>([]);
  const [collabGoals, setCollabGoals] = useState<CollaboratorGoal[]>([]);
  const [goalsTick, setGoalsTick] = useState(0);
  useGoalRollover(() => setGoalsTick(t => t + 1)); // virada de periodo: grava resultado e abre o proximo
  const planStart = toISO(resolved.goalRange.start < resolved.current.start ? resolved.goalRange.start : resolved.current.start);
  const planEnd = toISO(resolved.goalRange.end > resolved.current.end ? resolved.goalRange.end : resolved.current.end);
  useEffect(() => {
    let cancelled = false;
    if (!masterId) return;
    goalPlanService.listPeriods(masterId, { statuses: ['active'], overlapStart: planStart, overlapEnd: planEnd })
      .then(async ps => {
        if (cancelled) return;
        setGoalPeriods(ps);
        const gs = await goalPlanService.listCollaboratorGoals(masterId, { periodIds: ps.map(p => p.id) });
        if (!cancelled) setCollabGoals(gs.filter(g => g.status === 'active'));
      })
      .catch(() => { if (!cancelled) { setGoalPeriods([]); setCollabGoals([]); } });
    return () => { cancelled = true; };
  }, [masterId, planStart, planEnd, realtimeTick, goalsTick]);

  // Tempo de resposta (so COMERCIAL): pares "mensagem do cliente -> resposta da equipe ou Conversa Encerrada".
  // Leads de funis de pos-venda nunca entram (4 em cada 5 conversas do banco local sao de pos-venda).
  const commercialFunnelIds = useMemo(() => new Set(funnels.filter(f => !f.isPostSale).map(f => f.id)), [funnels]);
  const responseInput = useMemo(() => {
    const ids: string[] = [];
    const created = new Map<string, number>();
    const owner = new Map<string, string>();
    leads.forEach(l => {
      if (!venueIds.includes(l.venueId) || l.isRemovedFromFunnel) return;
      if (l.funnelId && !commercialFunnelIds.has(l.funnelId)) return; // funil de pos-venda (ou fora do escopo): fora
      ids.push(l.id);
      created.set(l.id, new Date(l.createdAt).getTime());
      const o = l.sdrId || l.closerId;
      if (o) owner.set(l.id, o);
    });
    return { ids, created, owner };
  }, [leads, venueIds, commercialFunnelIds]);
  const responseInputRef = useRef(responseInput);
  responseInputRef.current = responseInput;
  const collaboratorsRef = useRef(collaborators);
  collaboratorsRef.current = collaborators;

  const [responsePairs, setResponsePairs] = useState<ResponsePair[]>([]);
  const [responseTruncated, setResponseTruncated] = useState(false);
  const respStart = Math.min(resolved.current.start.getTime(), resolved.compared.start.getTime());
  const respEnd = Math.max(resolved.current.end.getTime(), resolved.compared.end.getTime());
  const respKey = `${masterId}|${venueIds.join(',')}|${respStart}|${respEnd}|${responseInput.ids.length}`;
  useEffect(() => {
    let cancelled = false;
    const { ids, owner } = responseInputRef.current;
    if (!masterId || ids.length === 0) {
      setResponsePairs([]);
      setResponseTruncated(false);
      return;
    }
    responseTimeService
      .fetchPairs({
        leadIds: ids, startMs: respStart, endMs: respEnd, ownerByLead: owner,
        collaboratorIds: new Set(collaboratorsRef.current.map(c => c.id)),
      })
      .then(r => { if (!cancelled) { setResponsePairs(r.pairs); setResponseTruncated(r.truncated); } })
      .catch(() => { if (!cancelled) { setResponsePairs([]); setResponseTruncated(false); } });
    return () => { cancelled = true; };
    // respKey ja resume escopo, janela e quantidade de leads; os dados em si vem pelos refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respKey]);

  // Presenca: primeira e ultima atividade (lead_activities) de cada colaborador por dia, na janela atual.
  const [presence, setPresence] = useState<Record<string, { minutes: number; days: number; messages: number; conversations: number }>>({});
  const [loadingPresence, setLoadingPresence] = useState(true);
  const collabIdsKey = useMemo(
    () => collaborators.filter(c => c.active && isCommercialCollaborator(c)).map(c => c.id).sort().join(','),
    [collaborators],
  );
  const presenceStart = resolved.current.start.getTime();
  const presenceEnd = resolved.current.end.getTime();

  const [presenceTruncated, setPresenceTruncated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ids = collabIdsKey ? collabIdsKey.split(',') : [];
    if (!masterId || ids.length === 0) {
      setPresence({});
      setPresenceTruncated(false);
      setLoadingPresence(false);
      return;
    }
    setLoadingPresence(true);
    leadService
      .getAuthorActivityPresence(ids, new Date(presenceStart).toISOString(), new Date(presenceEnd).toISOString())
      .then(r => {
        if (cancelled) return;
        setPresence(r.presence);
        setPresenceTruncated(r.truncated);
      })
      .catch(() => { if (!cancelled) { setPresence({}); setPresenceTruncated(false); } })
      .finally(() => { if (!cancelled) setLoadingPresence(false); });
    return () => { cancelled = true; };
  }, [masterId, collabIdsKey, presenceStart, presenceEnd]);

  return useMemo<CommercialDashboardData>(() => {
    const { current, compared } = resolved;

    const scopedLeads = leads.filter(l => venueIds.includes(l.venueId) && !l.isRemovedFromFunnel);
    const clientByLead = new Map<string, Client>();
    clients.forEach(c => {
      const key = clientLeadKey(c);
      if (key && venueIds.includes(c.venueId)) clientByLead.set(key, c);
    });

    // Etapas ganhas configuradas nos funis comerciais do escopo
    const commercialFunnels: CommercialFunnel[] = funnels.filter(f => !f.isPostSale && (venueIds.includes(f.venueId) || (f.sharedVenueIds || []).some(id => venueIds.includes(id))));
    const closedDate = (l: Lead): string | undefined =>
      l.contractDate || clientByLead.get(l.id)?.contractDate || l.updatedAt || l.createdAt;
    const wonStageIds = new Set<string>();
    commercialFunnels.forEach(f => (f.stages || []).forEach(s => { if (s.isWon) wonStageIds.add(s.id); }));

    const isClosed = (l: Lead): boolean => l.stage === 'contract_signed' || wonStageIds.has(String(l.stage));

    const valueOf = (l: Lead): number => {
      const client = clientByLead.get(l.id);
      return Number(client?.baseContractValue ?? client?.dealValue ?? l.dealValue ?? 0);
    };

    const closedLeads = scopedLeads.filter(isClosed);

    // Contratos que NAO vieram de um lead fechado (ex.: importados) tambem contam, pela data de fechamento
    const closedLeadIdSet = new Set(closedLeads.map(l => l.id));
    const extraContracts = contractFacts.filter(c => !c.originLeadId || !closedLeadIdSet.has(c.originLeadId));
    const contractDay = (c: { closedAt: string }) => `${c.closedAt}T12:00:00`;

    const lossStageIds = new Set<string>();
    commercialFunnels.forEach(f => (f.stages || []).forEach(s => { if (s.isLoss) lossStageIds.add(s.id); }));
    const isLost = (l: Lead): boolean => !isClosed(l) && (lossStageIds.has(String(l.stage)) || l.stage === 'lost' || (lossStageIds.size === 0 && !!l.lossReason));

    /* KPIs por janela */
    const kpisFor = (range: DateRange): WindowKpis => {
      const created = scopedLeads.filter(l => inRange(l.createdAt, range));
      const closed = closedLeads.filter(l => inRange(closedDate(l), range));
      const extraClosed = extraContracts.filter(c => inRange(contractDay(c), range));
      const cohortClosed = created.filter(isClosed).length;
      let visits = 0;
      let tastings = 0;
      scopedLeads.forEach(l => {
        if (commitmentDone(l.visitCommitment) && inRange(commitmentDate(l.visitCommitment), range)) visits += 1;
        if (commitmentDone(l.tastingCommitment) && inRange(commitmentDate(l.tastingCommitment), range)) tastings += 1;
      });
      return {
        leadsCreated: created.length,
        closings: closed.length + extraClosed.length,
        revenue: closed.reduce((s, l) => s + valueOf(l), 0) + extraClosed.reduce((a, c) => a + c.total, 0),
        visits,
        tastings,
        appointments: visits + tastings,
        conversionRate: created.length > 0 ? (cohortClosed / created.length) * 100 : 0,
        avgResponseMinutes: null, // preenchido abaixo com o tempo real de 1a resposta (responseTimeService)
      };
    };

    const cur = kpisFor(current);
    const prevPeriod = kpisFor(compared);

    // Tempo de resposta real (so comercial): 1a resposta e media de qualquer mensagem
    const respCur = summarizeResponsePairs(responsePairs, { start: current.start.getTime(), end: current.end.getTime() }, responseInput.created);
    const respPrev = summarizeResponsePairs(responsePairs, { start: compared.start.getTime(), end: compared.end.getTime() }, responseInput.created);
    cur.avgResponseMinutes = respCur.total.avgFirst;
    prevPeriod.avgResponseMinutes = respPrev.total.avgFirst;

    /* Base da unidade: agrega as metricas-base das casas do escopo (absolutos somados, taxas ponderadas por leads/mes) */
    const myBaselines = wantsBaseline ? baselines.filter(b => venueIds.includes(b.venueId)) : [];
    const baselineMissing = wantsBaseline && myBaselines.length === 0;
    const sumOf = (pick: (b: VenueBaseline) => number | null): number | null => {
      const vals = myBaselines.map(pick).filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    };
    const weighted = (pick: (b: VenueBaseline) => number | null, weight: (b: VenueBaseline) => number | null): number | null => {
      const rows = myBaselines.map(b => ({ v: pick(b), w: weight(b) })).filter((r): r is { v: number; w: number | null } => r.v !== null);
      if (rows.length === 0) return null;
      const totalW = rows.reduce((s, r) => s + (r.w ?? 0), 0);
      return totalW > 0 ? rows.reduce((s, r) => s + r.v * (r.w ?? 0), 0) / totalW : mean(rows.map(r => r.v));
    };
    const byLeads = (b: VenueBaseline) => b.leadsPerMonth;
    const monthScale = monthsEquivalent(current); // base e mensal; proporcional aos dias reais do periodo
    const scaled = (v: number | null): number => (v === null ? 0 : v * monthScale);
    const bl = wantsBaseline ? {
      leads: sumOf(b => b.leadsPerMonth),
      appointments: sumOf(b => b.appointmentsPerMonth),
      contracts: sumOf(b => b.contractsPerMonth),
      revenue: sumOf(b => b.monthlyRevenue ?? (b.contractsPerMonth !== null && b.avgTicket !== null ? b.contractsPerMonth * b.avgTicket : null)),
      conversion: weighted(b => b.conversionRate, byLeads),
      ticket: weighted(b => b.avgTicket, b => b.contractsPerMonth),
      response: weighted(b => b.responseTimeMinutes, byLeads),
      avgResponse: weighted(b => b.avgResponseMinutes, byLeads),
      show: weighted(b => b.schedToAttendRate, b => b.appointmentsPerMonth),
      loss: weighted(b => b.lossRate, byLeads),
    } : null;
    const prev: WindowKpis = bl
      ? {
          ...prevPeriod,
          leadsCreated: scaled(bl.leads),
          closings: scaled(bl.contracts),
          revenue: scaled(bl.revenue),
          appointments: scaled(bl.appointments),
          visits: 0,
          tastings: 0,
          conversionRate: bl.conversion ?? 0,
          avgResponseMinutes: bl.response,
        }
      : prevPeriod;

    // Meta do tempo medio de resposta (qualquer mensagem), dos periodos ativos do novo modelo
    const avgResponseTarget = (() => {
      const curStartISO = toISO(current.start);
      const curEndISO = toISO(current.end);
      const t = goalPeriods
        .filter(p => venueIds.includes(p.venueId) && p.avgResponseTargetMinutes > 0 && overlapDays(p, curStartISO, curEndISO) > 0)
        .map(p => p.avgResponseTargetMinutes);
      return t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : null;
    })();

    // Meta de tempo de resposta: media das metas das unidades no escopo nos meses que o periodo cobre.
    const responseTarget = (() => {
      const curStartISO = toISO(current.start);
      const curEndISO = toISO(current.end);
      const planTargets = goalPeriods
        .filter(p => venueIds.includes(p.venueId) && p.responseTimeTargetMinutes > 0 && overlapDays(p, curStartISO, curEndISO) > 0)
        .map(p => p.responseTimeTargetMinutes);
      if (planTargets.length) return Math.round(planTargets.reduce((a, b) => a + b, 0) / planTargets.length);
      const targets = venueGoals
        .filter(g => {
          if (!venueIds.includes(g.venueId) || g.responseTimeTargetMinutes <= 0) return false;
          if (g.period !== 'monthly') return true;
          const monthStart = new Date(g.year, g.month - 1, 1);
          const monthEnd = new Date(g.year, g.month, 0, 23, 59, 59, 999);
          return monthStart <= current.end && monthEnd >= current.start;
        })
        .map(g => g.responseTimeTargetMinutes);
      return targets.length ? Math.round(targets.reduce((a, b) => a + b, 0) / targets.length) : null;
    })();

    // Metas de volume (contratos, leads, agendamentos) proporcionais aos dias da janela; taxas = media dos periodos ativos
    const curS = toISO(current.start);
    const curE = toISO(current.end);
    const prorated = (pick: (p: GoalPeriod) => number): number | null => {
      const mine = goalPeriods.filter(p => venueIds.includes(p.venueId) && overlapDays(p, curS, curE) > 0);
      const total = mine.reduce((s, p) => s + pick(p) * (overlapDays(p, curS, curE) / periodDays(p)), 0);
      return total > 0 ? total : null;
    };
    const rateTarget = (pick: (p: GoalPeriod) => number): number | null => {
      const t = goalPeriods.filter(p => venueIds.includes(p.venueId) && pick(p) > 0 && overlapDays(p, curS, curE) > 0).map(pick);
      return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null;
    };
    const targets = {
      closings: prorated(p => p.closingsTarget),
      appointments: prorated(p => p.appointmentsTarget),
      schedulingRate: rateTarget(p => p.schedulingRateTarget),
      attendanceRate: rateTarget(p => p.attendanceRateTarget),
      closingRate: rateTarget(p => p.closingRateTarget),
    };

    /* Pacing (termometro) */
    // Meta de faturamento: periodos ativos do novo modelo (proporcional aos dias da janela); sem periodo, usa a meta antiga
    const goalStartISO = toISO(resolved.goalRange.start);
    const goalEndISO = toISO(resolved.goalRange.end);
    const target = venueIds.reduce((sum, vid) => {
      const mine = goalPeriods.filter(p => p.venueId === vid && overlapDays(p, goalStartISO, goalEndISO) > 0);
      if (mine.length === 0) return sum + targetForRange(venueGoals, [vid], resolved.goalRange);
      return sum + mine.reduce((s, p) => s + p.revenueTarget * (overlapDays(p, goalStartISO, goalEndISO) / periodDays(p)), 0);
    }, 0);
    const expected = target * resolved.elapsedFraction;
    const pacing = {
      revenue: cur.revenue,
      target,
      expected,
      pct: target > 0 ? Math.round((cur.revenue / target) * 100) : null,
      expectedPct: Math.round(resolved.elapsedFraction * 100),
    };

    /* Evolucao alinhada por bucket */
    const granularity = pickGranularity(rangeDays(current));
    const n = Math.max(bucketCount(current, granularity), bucketCount(compared, granularity));
    const evo: EvolutionPoint[] = Array.from({ length: n }, (_, i) => ({
      label: bucketLabel(i, current, granularity),
      closings: 0, closingsPrev: 0, revenue: 0, revenuePrev: 0,
      visits: 0, visitsPrev: 0, tastings: 0, tastingsPrev: 0,
    }));
    scopedLeads.forEach(l => {
      (['visits', 'tastings'] as const).forEach(kind => {
        const c = kind === 'visits' ? l.visitCommitment : l.tastingCommitment;
        if (!commitmentDone(c)) return;
        const d = commitmentDate(c);
        const ci = bucketIndex(d, current, granularity);
        if (ci >= 0 && ci < n) evo[ci][kind] += 1;
        const pi = bucketIndex(d, compared, granularity);
        if (pi >= 0 && pi < n) evo[pi][kind === 'visits' ? 'visitsPrev' : 'tastingsPrev'] += 1;
      });
    });
    closedLeads.forEach(l => {
      const d = closedDate(l);
      const ci = bucketIndex(d, current, granularity);
      if (ci >= 0 && ci < n) { evo[ci].closings += 1; evo[ci].revenue += valueOf(l); }
      const pi = bucketIndex(d, compared, granularity);
      if (pi >= 0 && pi < n) { evo[pi].closingsPrev += 1; evo[pi].revenuePrev += valueOf(l); }
    });
    extraContracts.forEach(c => {
      const d = contractDay(c);
      const ci = bucketIndex(d, current, granularity);
      if (ci >= 0 && ci < n) { evo[ci].closings += 1; evo[ci].revenue += c.total; }
      const pi = bucketIndex(d, compared, granularity);
      if (pi >= 0 && pi < n) { evo[pi].closingsPrev += 1; evo[pi].revenuePrev += c.total; }
    });
    // Nao exibe buckets futuros do periodo atual (ex.: dias que ainda nao aconteceram)
    const now = Date.now();
    const visibleEvo = evo.filter((_, i) => {
      const startOfBucket = new Date(current.start);
      startOfBucket.setDate(startOfBucket.getDate() + (granularity === 'day' ? i : granularity === 'week' ? i * 7 : 0));
      return granularity === 'month' ? true : startOfBucket.getTime() <= now;
    });

    /* Funil: coorte de leads criados na janela, volume que alcancou cada etapa */
    const cohort = scopedLeads.filter(l => inRange(l.createdAt, current));
    const dominantFunnel = (() => {
      const counts = new Map<string, number>();
      cohort.forEach(l => { if (l.funnelId) counts.set(l.funnelId, (counts.get(l.funnelId) || 0) + 1); });
      const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return commercialFunnels.find(f => f.id === topId) || commercialFunnels[0];
    })();
    const funnelStages = (dominantFunnel?.stages || []).filter(s => !s.isLoss);
    const funnelSteps: FunnelStep[] = [];
    if (dominantFunnel && funnelStages.length > 0) {
      const ordered = [...funnelStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const wonIdx = ordered.findIndex(s => s.isWon || s.id === 'contract_signed');
      const lastIdx = wonIdx >= 0 ? wonIdx : ordered.length - 1;
      const steps = ordered.slice(0, lastIdx + 1);
      const orderOf = new Map(steps.map((s, i) => [s.id, i]));
      const funnelCohort = cohort.filter(l => !l.funnelId || l.funnelId === dominantFunnel.id);
      // Sem historico de etapas: um lead perdido que teve visita/degustacao realizada
      // e contado ao menos ate a primeira etapa de reuniao.
      const meetingIdx = steps.findIndex(s => s.isMeetingStage);
      const reachedIdx = (l: Lead): number => {
        if (isClosed(l)) return steps.length - 1;
        const idx = orderOf.get(String(l.stage));
        if (idx !== undefined) return idx;
        const hadMeeting = commitmentDone(l.visitCommitment) || commitmentDone(l.tastingCommitment);
        return isLost(l) && hadMeeting && meetingIdx >= 0 ? meetingIdx : 0;
      };
      steps.forEach((s, i) => {
        const count = funnelCohort.filter(l => reachedIdx(l) >= i).length;
        funnelSteps.push({ id: s.id, name: s.name, count: i === 0 ? funnelCohort.length : count, passRate: null });
      });
      funnelSteps.forEach((st, i) => {
        st.passRate = i === 0 ? null : funnelSteps[i - 1].count > 0 ? (st.count / funnelSteps[i - 1].count) * 100 : null;
      });
    }

    /* Origens que geraram contratos fechados */
    const sourceMap = new Map<string, SourceRank>();
    closedLeads.filter(l => inRange(closedDate(l), current)).forEach(l => {
      const key = String(l.source || 'nao_informada');
      const row = sourceMap.get(key) || { source: key, closings: 0, revenue: 0 };
      row.closings += 1;
      row.revenue += valueOf(l);
      sourceMap.set(key, row);
    });
    const sources = [...sourceMap.values()].sort((a, b) => b.closings - a.closings || b.revenue - a.revenue);

    /* ───── Indicadores aprofundados ───── */
    const DAY_MS = 86400000;

    const deepFor = (range: DateRange) => {
      const created = scopedLeads.filter(l => inRange(l.createdAt, range));
      const closed = closedLeads.filter(l => inRange(closedDate(l), range));
      const revenue = closed.reduce((s, l) => s + valueOf(l), 0);
      const cycles = closed
        .map(l => (new Date(closedDate(l) as string).getTime() - new Date(l.createdAt).getTime()) / DAY_MS)
        .filter(v => Number.isFinite(v) && v >= 0);
      let done = 0;
      let total = 0;
      scopedLeads.forEach(l => {
        [l.visitCommitment, l.tastingCommitment].forEach(c => {
          if (!c || !inRange(commitmentDate(c), range)) return;
          if (c.status === 'completed') { done += 1; total += 1; }
          else if (c.status === 'no_show' || c.status === 'cancelled') total += 1;
        });
      });
      return {
        leads: created.length,
        avgTicket: closed.length > 0 ? revenue / closed.length : 0,
        cycle: mean(cycles),
        show: total > 0 ? (done / total) * 100 : null,
        showSample: total,
        lossRate: created.length > 0 ? (created.filter(isLost).length / created.length) * 100 : 0,
      };
    };
    const dCur = deepFor(current);
    const dPrevPeriod = deepFor(compared);
    const dPrev: typeof dPrevPeriod = bl
      ? {
          leads: scaled(bl.leads),
          avgTicket: bl.ticket ?? 0,
          cycle: null,
          show: bl.show,
          showSample: dPrevPeriod.showSample,
          lossRate: bl.loss ?? 0,
        }
      : dPrevPeriod;
    const nullableDelta = (a: number | null, b: number | null) => ({
      current: a, previous: b, pct: a !== null && b !== null ? pctDelta(a, b) : null,
    });
    const deep: DeepKpis = {
      leads: delta(dCur.leads, dPrev.leads),
      avgTicket: delta(dCur.avgTicket, dPrev.avgTicket),
      salesCycleDays: nullableDelta(dCur.cycle, dPrev.cycle),
      showRate: { ...nullableDelta(dCur.show, dPrev.show), sample: dCur.showSample },
      lossRate: delta(dCur.lossRate, dPrev.lossRate),
    };

    /* ───── Esteira do lead (coorte criada na janela) ───── */
    // Regras da esteira compartilhadas com as metas: src/utils/leadJourney.ts
    const rate = pctOf;
    const journeyFor = (range: DateRange) =>
      buildJourneyCohort(scopedLeads.filter(l => inRange(l.createdAt, range)), isClosed, isLost);
    const jCur = journeyFor(current);
    const jPrev = journeyFor(compared);
    const dropMap = new Map<string, number>();
    const bumpDrop = (k: string) => dropMap.set(k, (dropMap.get(k) || 0) + 1);
    jCur.lost.forEach(l => {
      if (isDisqualified(l)) bumpDrop('Desqualificado pelo MQL');
      else if (wasAttended(l)) bumpDrop('Compareceu, não fechou');
      else if (wasScheduled(l)) bumpDrop('Agendado, não compareceu');
      else bumpDrop('Antes do agendamento');
    });
    const journey: LeadJourney = {
      captured: delta(jCur.coh.length, jPrev.coh.length),
      mqlInUse: jCur.mqlInUse,
      qualified: jCur.mqlInUse ? jCur.base.length : 0,
      disqualified: jCur.coh.filter(isDisqualified).length,
      withoutMql: jCur.mqlInUse ? jCur.coh.filter(l => !hasMql(l)).length : jCur.coh.length,
      notDisqualified: jCur.coh.length - jCur.coh.filter(isDisqualified).length,
      scheduled: jCur.scheduled.length,
      attended: jCur.attended.length,
      won: jCur.won.length,
      lost: jCur.lost.length,
      open: jCur.coh.length - jCur.won.length - jCur.lost.length,
      qualToSchedRate: rate(jCur.scheduled.length, jCur.base.length),
      schedToAttendRate: rate(jCur.attended.length, jCur.scheduled.length),
      attendToWonRate: rate(jCur.wonFromAttended.length, jCur.attended.length),
      winRate: rate(jCur.won.length, jCur.coh.length),
      lossRate: rate(jCur.lost.length, jCur.coh.length),
      dropoff: [...dropMap.entries()].map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count),
    };

    // Pipeline aberto hoje (nao depende do periodo)
    const nowMs = Date.now();
    const openLeads = scopedLeads.filter(l => !isClosed(l) && !isLost(l));
    const stalled = openLeads.filter(l => {
      const last = new Date(l.lastInteractionAt || l.updatedAt || l.createdAt).getTime();
      return Number.isFinite(last) && nowMs - last > 7 * DAY_MS;
    });
    const sumDeal = (arr: Lead[]) => arr.reduce((s, l) => s + Number(l.dealValue || 0), 0);
    const pipeline: PipelineSnapshot = {
      openLeads: openLeads.length,
      openValue: sumDeal(openLeads),
      stalledLeads: stalled.length,
      stalledValue: sumDeal(stalled),
    };

    // Motivos de perda (coorte do periodo)
    const lostCohort = cohort.filter(isLost);
    const reasonMap = new Map<string, number>();
    lostCohort.forEach(l => {
      const key = (l.lossReason || '').trim() || 'Não informado';
      reasonMap.set(key, (reasonMap.get(key) || 0) + 1);
    });
    const lossReasons = [...reasonMap.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);

    // Mapa de calor: leads criados por dia da semana x faixa horaria
    const heatmap = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
    cohort.forEach(l => {
      const d = new Date(l.createdAt);
      if (Number.isNaN(d.getTime())) return;
      heatmap[d.getDay()][Math.min(3, Math.floor(d.getHours() / 6))] += 1;
    });

    // Eficiencia por origem (coorte)
    const effMap = new Map<string, SourceEfficiency>();
    cohort.forEach(l => {
      const key = String(l.source || 'nao_informada');
      const row = effMap.get(key) || { source: key, leads: 0, closed: 0, conversion: 0, revenue: 0 };
      row.leads += 1;
      if (isClosed(l)) { row.closed += 1; row.revenue += valueOf(l); }
      effMap.set(key, row);
    });
    const sourceEfficiency = [...effMap.values()]
      .map(r => ({ ...r, conversion: r.leads > 0 ? (r.closed / r.leads) * 100 : 0 }))
      .sort((a, b) => b.leads - a.leads);

    // Comparativo entre unidades
    const venueRows: VenueRow[] = venueIds.length > 1
      ? venueIds.map(id => {
          const vLeads = scopedLeads.filter(l => l.venueId === id);
          const created = vLeads.filter(l => inRange(l.createdAt, current));
          const closedCur = vLeads.filter(l => isClosed(l) && inRange(closedDate(l), current));
          const closedPrev = vLeads.filter(l => isClosed(l) && inRange(closedDate(l), compared));
          const vExtra = extraContracts.filter(c => c.venueId === id);
          const extraCur = vExtra.filter(c => inRange(contractDay(c), current));
          const extraPrev = vExtra.filter(c => inRange(contractDay(c), compared));
          const revenue = closedCur.reduce((s, l) => s + valueOf(l), 0) + extraCur.reduce((a, c) => a + c.total, 0);
          const closingsTotal = closedCur.length + extraCur.length;
          return {
            id,
            name: venues.find(v => v.id === id)?.name || 'Unidade',
            leads: created.length,
            closings: closingsTotal,
            revenue,
            revenuePrev: closedPrev.reduce((s, l) => s + valueOf(l), 0) + extraPrev.reduce((a, c) => a + c.total, 0),
            conversion: created.length > 0 ? (created.filter(isClosed).length / created.length) * 100 : 0,
            avgTicket: closingsTotal > 0 ? revenue / closingsTotal : 0,
          };
        }).sort((a, b) => b.revenue - a.revenue)
      : [];

    /* Podio de Closers (+ SDR parceiro) */
    const nameOf = (id?: string, fallback?: string) => collaborators.find(c => c.id === id)?.name || fallback || 'Sem nome';
    const closerMap = new Map<string, CloserRank & { partners: Map<string, number> }>();
    const ensureCloser = (id: string, name: string) => {
      let row = closerMap.get(id);
      if (!row) {
        row = { id, name, revenue: 0, closings: 0, revenuePrev: 0, closingsPrev: 0, topSdrName: null, topSdrCount: 0, partners: new Map() };
        closerMap.set(id, row);
      }
      return row;
    };
    closedLeads.forEach(l => {
      if (!l.closerId) return;
      const d = closedDate(l);
      const inCur = inRange(d, current);
      const inPrev = inRange(d, compared);
      if (!inCur && !inPrev) return;
      const row = ensureCloser(l.closerId, nameOf(l.closerId, l.closerName));
      if (inCur) {
        row.closings += 1;
        row.revenue += valueOf(l);
        if (l.sdrId && l.sdrId !== l.closerId) row.partners.set(l.sdrId, (row.partners.get(l.sdrId) || 0) + 1);
      }
      if (inPrev) { row.closingsPrev += 1; row.revenuePrev += valueOf(l); }
    });
    const closers: CloserRank[] = [...closerMap.values()]
      .map(({ partners, ...row }) => {
        const top = [...partners.entries()].sort((a, b) => b[1] - a[1])[0];
        return {
          ...row, topSdrName: top ? nameOf(top[0]) : null, topSdrCount: top ? top[1] : 0,
          avatarUrl: collaborators.find(c => c.id === row.id)?.avatarUrl,
        };
      })
      .filter(r => r.closings > 0)
      .sort((a, b) => b.revenue - a.revenue || b.closings - a.closings);

    /* Podio de SDRs */
    const sdrMap = new Map<string, SdrRank>();
    const ensureSdr = (id: string, name: string) => {
      let row = sdrMap.get(id);
      if (!row) {
        row = {
          id, name, visits: 0, tastings: 0, appointments: 0, appointmentsPrev: 0, closingParticipations: 0,
          qualified: 0, scheduledLeads: 0, attendedFinished: 0, attendedDone: 0,
          qualToSchedRate: null, schedToAttendRate: null, closingRate: null, score: null, ranked: false,
        };
        sdrMap.set(id, row);
      }
      return row;
    };
    scopedLeads.forEach(l => {
      if (!l.sdrId) return;
      const sdrName = nameOf(l.sdrId, l.sdrName);
      const v = l.visitCommitment;
      const t = l.tastingCommitment;
      if (commitmentDone(v)) {
        const d = commitmentDate(v);
        if (inRange(d, current)) { const r = ensureSdr(l.sdrId, sdrName); r.visits += 1; r.appointments += 1; }
        if (inRange(d, compared)) ensureSdr(l.sdrId, sdrName).appointmentsPrev += 1;
      }
      if (commitmentDone(t)) {
        const d = commitmentDate(t);
        if (inRange(d, current)) { const r = ensureSdr(l.sdrId, sdrName); r.tastings += 1; r.appointments += 1; }
        if (inRange(d, compared)) ensureSdr(l.sdrId, sdrName).appointmentsPrev += 1;
      }
      if (isClosed(l) && inRange(closedDate(l), current)) ensureSdr(l.sdrId, sdrName).closingParticipations += 1;
      // Comparecimento: agendamentos finalizados na janela (realizado, falta ou cancelado)
      [v, t].forEach(c => {
        if (!c || !inRange(commitmentDate(c), current)) return;
        if (c.status === 'completed') { const r = ensureSdr(l.sdrId as string, sdrName); r.attendedDone += 1; r.attendedFinished += 1; }
        else if (c.status === 'no_show' || c.status === 'cancelled') ensureSdr(l.sdrId as string, sdrName).attendedFinished += 1;
      });
    });
    // Qualificados e agendados: coorte de leads do SDR criados na janela
    jCur.base.forEach(l => {
      if (!l.sdrId) return;
      const r = ensureSdr(l.sdrId, nameOf(l.sdrId, l.sdrName));
      r.qualified += 1;
      if (wasScheduled(l)) r.scheduledLeads += 1;
    });
    // Nota do SDR (so agendamento e comparecimento; fechamento e do Closer). Fica no calculo, nao e exibida.
    // Cada taxa e suavizada rumo a media do time no periodo: (acertos + k*media) / (tentativas + k).
    // Nao ha volume minimo: amostra pequena apenas pesa menos, entao 1 de 1 nao vira 100%.
    const sdrList = [...sdrMap.values()];
    const sum = (pick: (r: SdrRank) => number) => sdrList.reduce((s, r) => s + pick(r), 0);
    const teamQualToSched = rate(sum(r => r.scheduledLeads), sum(r => r.qualified));
    const teamSchedToAttend = rate(sum(r => r.attendedDone), sum(r => r.attendedFinished));
    const smooth = (wins: number, tries: number, bench: number | null): number | null => {
      if (bench === null) return tries > 0 ? (wins / tries) * 100 : null;
      return ((wins + (SDR_SMOOTHING_K * bench) / 100) / (tries + SDR_SMOOTHING_K)) * 100;
    };
    const sdrs = sdrList
      .map(r => {
        const qualToSchedRate = rate(r.scheduledLeads, r.qualified);
        const schedToAttendRate = rate(r.attendedDone, r.attendedFinished);
        const closingRate = rate(r.closingParticipations, r.qualified);
        const adjSched = smooth(r.scheduledLeads, r.qualified, teamQualToSched);
        const adjAttend = smooth(r.attendedDone, r.attendedFinished, teamSchedToAttend);
        const score = adjSched !== null && adjAttend !== null
          ? SDR_SCORE_WEIGHTS.qualToSched * Math.min(100, adjSched) + SDR_SCORE_WEIGHTS.schedToAttend * Math.min(100, adjAttend)
          : adjSched ?? adjAttend;
        return {
          ...r, qualToSchedRate, schedToAttendRate, closingRate, score,
          ranked: score !== null,
          avatarUrl: collaborators.find(c => c.id === r.id)?.avatarUrl,
        };
      })
      .filter(r => r.scheduledLeads > 0 || r.attendedFinished > 0 || r.appointments > 0)
      .sort((a, b) =>
        Number(b.ranked) - Number(a.ranked)
        || (b.score ?? -1) - (a.score ?? -1)
        || b.closingParticipations - a.closingParticipations // desempate: maior participacao em venda
        || b.attendedDone - a.attendedDone
        || b.appointments - a.appointments);

    /* Linhas por colaborador (TMA, entregas, progresso da meta individual) */
    const inVenueScope = (c: (typeof collaborators)[number]): boolean =>
      !c.venueId || c.venueId === 'all' || venueIds.includes(c.venueId) || (c.venueIds || []).some(id => venueIds.includes(id));
    // O cargo no cadastro e generico (crm, admin...): SDR e Closer vem da equipe dos funis comerciais da unidade
    const roleFlags = (c: (typeof collaborators)[number]) => venueIds.reduce(
      (acc, vid) => { const r = getCommercialRolesInVenue(funnels, vid, c); return { sdr: acc.sdr || r.sdr, closer: acc.closer || r.closer }; },
      { sdr: false, closer: false },
    );
    const scopedCollabs = collaborators.filter(c => {
      if (!c.active || !inVenueScope(c)) return false;
      const f = roleFlags(c);
      return f.sdr || f.closer;
    });
    const leadsByCloser = new Map<string, Lead[]>();
    const leadsBySdr = new Map<string, Lead[]>();
    scopedLeads.forEach(l => {
      if (l.closerId) { const a = leadsByCloser.get(l.closerId); if (a) a.push(l); else leadsByCloser.set(l.closerId, [l]); }
      if (l.sdrId) { const a = leadsBySdr.get(l.sdrId); if (a) a.push(l); else leadsBySdr.set(l.sdrId, [l]); }
    });
    const collabRows: CollaboratorRow[] = scopedCollabs.map(c => {
      const flags = roleFlags(c);
      const isCloser = flags.closer && (!flags.sdr || (leadsByCloser.get(c.id)?.length || 0) >= (leadsBySdr.get(c.id)?.length || 0));
      const mine = (isCloser ? leadsByCloser : leadsBySdr).get(c.id) || [];
      const closedMine = mine.filter(l => isClosed(l) && inRange(closedDate(l), current));
      const deliveries = isCloser
        ? closedMine.length
        : (sdrMap.get(c.id)?.appointments ?? 0);
      const deliveriesPrev = isCloser
        ? mine.filter(l => isClosed(l) && inRange(closedDate(l), compared)).length
        : (sdrMap.get(c.id)?.appointmentsPrev ?? 0);
      const g = c.goals;
      let goalPct: number | null = null;
      let goalDetail: string | null = null;
      const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

      // Metas do novo modelo: uma pessoa em varias unidades vira um unico card (soma das metas de cada unidade,
      // proporcionais aos dias da janela em cada periodo).
      const plan = { revenue: 0, closings: 0, appointments: 0, response: [] as number[] };
      collabGoals.forEach(cg => {
        if (cg.collaboratorId !== c.id || !venueIds.includes(cg.venueId)) return;
        const p = goalPeriods.find(x => x.id === cg.periodId);
        if (!p) return;
        const od = overlapDays(p, toISO(current.start), toISO(current.end));
        if (od <= 0) return;
        const share = od / periodDays(p);
        if (cg.metric === 'revenue') plan.revenue += cg.targetValue * share;
        else if (cg.metric === 'closings') plan.closings += cg.targetValue * share;
        else if (cg.metric === 'appointments') plan.appointments += cg.targetValue * share;
        else plan.response.push(cg.targetValue);
      });
      const hasPlan = plan.revenue > 0 || plan.closings > 0 || plan.appointments > 0;
      const planResponse = plan.response.length ? Math.round(plan.response.reduce((a, b) => a + b, 0) / plan.response.length) : null;
      if (hasPlan) {
        const revenueMine = closedMine.reduce((s, l) => s + valueOf(l), 0);
        if (plan.revenue > 0) {
          goalPct = Math.round((revenueMine / plan.revenue) * 100);
          goalDetail = `${money(revenueMine)} de ${money(plan.revenue)}`;
        } else if (plan.closings > 0) {
          goalPct = Math.round((closedMine.length / plan.closings) * 100);
          goalDetail = `${closedMine.length} de ${Math.round(plan.closings * 10) / 10} contratos`;
        } else {
          goalPct = Math.round((deliveries / plan.appointments) * 100);
          goalDetail = `${deliveries} de ${Math.round(plan.appointments * 10) / 10} agendamentos`;
        }
      } else if (g) {
        const revenueMine = closedMine.reduce((s, l) => s + valueOf(l), 0);
        // Metas individuais mensais dividem pelos dias reais de cada mes; semanais por 7 dias.
        const scale = Math.max(g.cycle === 'weekly' ? rangeDays(current) / 7 : monthsEquivalent(current), 0.0001);
        if (g.revenueTarget) {
          goalPct = Math.round((revenueMine / (g.revenueTarget * scale)) * 100);
          goalDetail = `${money(revenueMine)} de ${money(g.revenueTarget * scale)}`;
        } else if (g.closingsTarget) {
          goalPct = Math.round((closedMine.length / (g.closingsTarget * scale)) * 100);
          goalDetail = `${closedMine.length} de ${Math.round(g.closingsTarget * scale * 10) / 10} contratos`;
        } else if (g.leadsTarget) {
          goalPct = Math.round((deliveries / (g.leadsTarget * scale)) * 100);
          goalDetail = `${deliveries} de ${Math.round(g.leadsTarget * scale * 10) / 10} agendamentos`;
        }
      }
      return {
        id: c.id,
        name: c.name,
        role: c.role,
        avatarUrl: c.avatarUrl,
        avgResponseMinutes: respCur.byResponder.get(c.id)?.avgFirst ?? null,
        avgReplyMinutes: respCur.byResponder.get(c.id)?.avgAll ?? null,
        deliveries,
        deliveriesLabel: isCloser ? 'fechamentos' : 'agendamentos',
        goals: g,
        goalPct,
        responseTarget: planResponse || g?.responseTimeTargetMinutes || responseTarget,
        activeMinutes: presence[c.id]?.minutes ?? null,
        activeDays: presence[c.id]?.days ?? 0,
        messages: presence[c.id]?.messages ?? 0,
        conversations: presence[c.id]?.conversations ?? 0,
        deliveriesPrev,
        avgResponsePrev: respPrev.byResponder.get(c.id)?.avgFirst ?? null,
        goalDetail,
      };
    });

    const closedWithoutDate = closedLeads.filter(
      l => inRange(closedDate(l), current) && !l.contractDate && !clientByLead.get(l.id)?.contractDate,
    ).length;

    return {
      loading: loadingGoals,
      responseTruncated,
      targets,
      closedWithoutDate,
      presenceTruncated,
      baselineMissing,
      deep,
      journey,
      pipeline,
      lossReasons,
      lostCount: lostCohort.length,
      heatmap,
      sourceEfficiency,
      venueRows,
      loadingPresence,
      resolved,
      granularity,
      kpis: {
        closings: delta(cur.closings, prev.closings),
        appointments: delta(cur.appointments, prev.appointments),
        visits: delta(cur.visits, prev.visits),
        tastings: delta(cur.tastings, prev.tastings),
        conversion: delta(cur.conversionRate, prev.conversionRate),
        response: {
          current: cur.avgResponseMinutes,
          previous: prev.avgResponseMinutes,
          pct: cur.avgResponseMinutes !== null && prev.avgResponseMinutes !== null
            ? pctDelta(cur.avgResponseMinutes, prev.avgResponseMinutes)
            : null,
          target: responseTarget,
        },
        avgResponse: (() => {
          const previous = bl ? bl.avgResponse : respPrev.total.avgAll;
          return {
            current: respCur.total.avgAll,
            previous,
            pct: respCur.total.avgAll !== null && previous !== null ? pctDelta(respCur.total.avgAll, previous) : null,
            target: avgResponseTarget,
          };
        })(),
        revenue: delta(cur.revenue, prev.revenue),
      },
      pacing,
      entry: (() => {
        const cashIn = (r: DateRange) => entryCashFacts.filter(t => inRange(`${t.date}T12:00:00`, r)).reduce((a, t) => a + t.net, 0);
        const contractedIn = (r: DateRange) => contractFacts.filter(c => inRange(contractDay(c), r)).reduce((a, c) => a + c.entry, 0);
        return { cash: delta(cashIn(current), cashIn(compared)), contracted: delta(contractedIn(current), contractedIn(compared)), hasCashData: entryCashFacts.length > 0 };
      })(),
      funnel: funnelSteps,
      evolution: visibleEvo,
      sources,
      closers,
      sdrs,
      collaborators: collabRows,
      hasData: scopedLeads.length > 0,
    };
  }, [resolved, leads, clients, collaborators, funnels, venueIds, venueGoals, loadingGoals, presence, presenceTruncated, loadingPresence, wantsBaseline, baselines, goalPeriods, collabGoals, responsePairs, responseInput, responseTruncated, contractFacts, entryCashFacts]);
};
