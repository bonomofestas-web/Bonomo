import { useEffect, useMemo, useState } from 'react';
import { useAdminState } from '../context/AdminStateContext';
import { goalsService, type VenueGoalRecord } from '../services/goalsService';
import { leadService } from '../services/leadService';
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
}

export interface CollaboratorRow {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  avgResponseMinutes: number | null;
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
  closedWithoutDate: number; // contratos do periodo sem data de fechamento (usam a ultima edicao)
  presenceTruncated: boolean;
  deep: DeepKpis;
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
    revenue: Delta;
  };
  pacing: { revenue: number; target: number; expected: number; pct: number | null; expectedPct: number };
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

const commitmentDone = (c?: CommercialCommitment): boolean => !!c && c.status === 'completed';
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

const clientLeadKey = (c: Client): string | undefined => c.commercialLeadId || c.originalLeadId;

/* ───────────── Hook ───────────── */

export const useCommercialDashboardData = (selection: PeriodSelection): CommercialDashboardData => {
  const { leads, clients, collaborators, funnels, venues, activeVenueId, currentUser } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';

  // Venues no escopo: dados de `venues` ja vem isolados por Master no contexto.
  const venueIds = useMemo(() => {
    const all = venues.map(v => v.id);
    if (!activeVenueId || activeVenueId === 'all' || activeVenueId === 'multi') return all;
    return all.includes(activeVenueId) ? [activeVenueId] : all;
  }, [venues, activeVenueId]);

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

  // Presenca: primeira e ultima atividade (lead_activities) de cada colaborador por dia, na janela atual.
  const [presence, setPresence] = useState<Record<string, { minutes: number; days: number; messages: number; conversations: number }>>({});
  const [loadingPresence, setLoadingPresence] = useState(true);
  const collabIdsKey = useMemo(
    () => collaborators.filter(c => c.active && (c.role === 'sdr' || c.role === 'closer')).map(c => c.id).sort().join(','),
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

    const lossStageIds = new Set<string>();
    commercialFunnels.forEach(f => (f.stages || []).forEach(s => { if (s.isLoss) lossStageIds.add(s.id); }));
    const isLost = (l: Lead): boolean => !isClosed(l) && (lossStageIds.has(String(l.stage)) || l.stage === 'lost' || (lossStageIds.size === 0 && !!l.lossReason));

    /* KPIs por janela */
    const kpisFor = (range: DateRange): WindowKpis => {
      const created = scopedLeads.filter(l => inRange(l.createdAt, range));
      const closed = closedLeads.filter(l => inRange(closedDate(l), range));
      const cohortClosed = created.filter(isClosed).length;
      let visits = 0;
      let tastings = 0;
      scopedLeads.forEach(l => {
        if (commitmentDone(l.visitCommitment) && inRange(commitmentDate(l.visitCommitment), range)) visits += 1;
        if (commitmentDone(l.tastingCommitment) && inRange(commitmentDate(l.tastingCommitment), range)) tastings += 1;
      });
      const responses = created.map(l => Number(l.responseTimeMinutes)).filter(v => Number.isFinite(v) && v > 0);
      return {
        leadsCreated: created.length,
        closings: closed.length,
        revenue: closed.reduce((s, l) => s + valueOf(l), 0),
        visits,
        tastings,
        appointments: visits + tastings,
        conversionRate: created.length > 0 ? (cohortClosed / created.length) * 100 : 0,
        avgResponseMinutes: mean(responses),
      };
    };

    const cur = kpisFor(current);
    const prev = kpisFor(compared);

    // Meta de tempo de resposta: media das metas das unidades no escopo nos meses que o periodo cobre.
    const responseTarget = (() => {
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

    /* Pacing (termometro) */
    const target = targetForRange(venueGoals, venueIds, resolved.goalRange);
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
    const dPrev = deepFor(compared);
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
          const revenue = closedCur.reduce((s, l) => s + valueOf(l), 0);
          return {
            id,
            name: venues.find(v => v.id === id)?.name || 'Unidade',
            leads: created.length,
            closings: closedCur.length,
            revenue,
            revenuePrev: closedPrev.reduce((s, l) => s + valueOf(l), 0),
            conversion: created.length > 0 ? (created.filter(isClosed).length / created.length) * 100 : 0,
            avgTicket: closedCur.length > 0 ? revenue / closedCur.length : 0,
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
        row = { id, name, visits: 0, tastings: 0, appointments: 0, appointmentsPrev: 0, closingParticipations: 0 };
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
    });
    const sdrs = [...sdrMap.values()]
      .map(r => ({ ...r, avatarUrl: collaborators.find(c => c.id === r.id)?.avatarUrl }))
      .filter(r => r.appointments > 0 || r.closingParticipations > 0)
      .sort((a, b) => b.appointments - a.appointments || b.closingParticipations - a.closingParticipations);

    /* Linhas por colaborador (TMA, entregas, progresso da meta individual) */
    const inVenueScope = (c: (typeof collaborators)[number]): boolean =>
      !c.venueId || c.venueId === 'all' || venueIds.includes(c.venueId) || (c.venueIds || []).some(id => venueIds.includes(id));
    const scopedCollabs = collaborators.filter(c => c.active && (c.role === 'sdr' || c.role === 'closer') && inVenueScope(c));
    const leadsByCloser = new Map<string, Lead[]>();
    const leadsBySdr = new Map<string, Lead[]>();
    scopedLeads.forEach(l => {
      if (l.closerId) { const a = leadsByCloser.get(l.closerId); if (a) a.push(l); else leadsByCloser.set(l.closerId, [l]); }
      if (l.sdrId) { const a = leadsBySdr.get(l.sdrId); if (a) a.push(l); else leadsBySdr.set(l.sdrId, [l]); }
    });
    const collabRows: CollaboratorRow[] = scopedCollabs.map(c => {
      const isCloser = c.role === 'closer';
      const mine = (isCloser ? leadsByCloser : leadsBySdr).get(c.id) || [];
      const responses = mine
        .filter(l => inRange(l.createdAt, current))
        .map(l => Number(l.responseTimeMinutes))
        .filter(v => Number.isFinite(v) && v > 0);
      const closedMine = mine.filter(l => isClosed(l) && inRange(closedDate(l), current));
      const deliveries = isCloser
        ? closedMine.length
        : (sdrMap.get(c.id)?.appointments ?? 0);
      const responsesPrev = mine
        .filter(l => inRange(l.createdAt, compared))
        .map(l => Number(l.responseTimeMinutes))
        .filter(v => Number.isFinite(v) && v > 0);
      const deliveriesPrev = isCloser
        ? mine.filter(l => isClosed(l) && inRange(closedDate(l), compared)).length
        : (sdrMap.get(c.id)?.appointmentsPrev ?? 0);
      const g = c.goals;
      let goalPct: number | null = null;
      let goalDetail: string | null = null;
      if (g) {
        const revenueMine = closedMine.reduce((s, l) => s + valueOf(l), 0);
        // Metas individuais sao mensais (ou semanais): escala pelo tamanho do periodo selecionado.
        const cycleDays = g.cycle === 'weekly' ? 7 : 30;
        const scale = Math.max(rangeDays(current) / cycleDays, 0.0001);
        const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
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
        avgResponseMinutes: mean(responses),
        deliveries,
        deliveriesLabel: isCloser ? 'fechamentos' : 'agendamentos',
        goals: g,
        goalPct,
        responseTarget: g?.responseTimeTargetMinutes || responseTarget,
        activeMinutes: presence[c.id]?.minutes ?? null,
        activeDays: presence[c.id]?.days ?? 0,
        messages: presence[c.id]?.messages ?? 0,
        conversations: presence[c.id]?.conversations ?? 0,
        deliveriesPrev,
        avgResponsePrev: mean(responsesPrev),
        goalDetail,
      };
    });

    const closedWithoutDate = closedLeads.filter(
      l => inRange(closedDate(l), current) && !l.contractDate && !clientByLead.get(l.id)?.contractDate,
    ).length;

    return {
      loading: loadingGoals,
      closedWithoutDate,
      presenceTruncated,
      deep,
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
        revenue: delta(cur.revenue, prev.revenue),
      },
      pacing,
      funnel: funnelSteps,
      evolution: visibleEvo,
      sources,
      closers,
      sdrs,
      collaborators: collabRows,
      hasData: scopedLeads.length > 0,
    };
  }, [resolved, leads, clients, collaborators, funnels, venueIds, venueGoals, loadingGoals, presence, presenceTruncated, loadingPresence]);
};
