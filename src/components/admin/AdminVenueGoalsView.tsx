import { Select } from '../ui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, Building2, CalendarRange, History, Lock, Pencil, Plus, Repeat, Target, Trash2, Users, X, Zap,
} from 'lucide-react';
import { HeaderActions } from './HeaderActions';
import { useAdminState } from '../../context/AdminStateContext';
import { goalsService } from '../../services/goalsService';
import {
  GOAL_KIND_LABEL, GOAL_METRICS, GOAL_METRIC_LABEL, PERIOD_FIELD, endForKind, fromISO, goalMetricDef, goalPlanService, periodTarget, todayISO, toISO,
  type CollaboratorGoal, type GoalPeriod, type GoalResult, type GoalStatus,
} from '../../services/goalPlanService';
import { summarizeVenueResponseWindow, type ResponderStats, type ResponseWindowStats } from '../../services/responseTimeService';
import { ADDITIVE_METRICS, collaboratorActual, computeGoalActuals, goalPct, venueActual, type GoalMetricKey } from '../../utils/goalActuals';
import { useGoalRollover } from '../../hooks/useGoalRollover';
import type { Collaborator } from '../../types/admin';
import { getCommercialRolesInVenue, type FunnelMemberRoles } from '../../utils/funnelResponsibility';
import { GoalWizard, type WizardResult } from './goals/GoalWizard';
import { CollaboratorGoalsModal } from './goals/CollaboratorGoalsModal';
import {
  MetricChip, ProgressBar, StatusChip, UnitBadge, barColor, card, eyebrow, formatMetricValue,
} from './goals/GoalUi';

/** Atalho vindo da tela Colaboradores: abre a aba Equipe ja com o modal da pessoa. */
export const GOALS_COLLAB_KEY = 'f5:goals-collab';

const roleText = (r?: FunnelMemberRoles): string => (r?.sdr && r?.closer ? 'SDR e Closer' : r?.closer ? 'Closer' : 'SDR');
const UNIT_COLORS = ['#14A9D7', '#D4AF37', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];
const fmtDate = (iso: string) => fromISO(iso).toLocaleDateString('pt-BR');
const firstOfMonth = () => { const n = new Date(); return toISO(new Date(n.getFullYear(), n.getMonth(), 1)); };

type Tab = 'unidade' | 'equipe' | 'historico';
const TABS: { id: Tab; label: string; Icon: typeof Target }[] = [
  { id: 'unidade', label: 'Unidade', Icon: Target },
  { id: 'equipe', label: 'Equipe', Icon: Users },
  { id: 'historico', label: 'Histórico', Icon: History },
];

export const AdminVenueGoalsView: React.FC = () => {
  const { venues, activeVenueId, leads, clients, funnels, collaborators, currentUser } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const canEdit = currentUser?.role === 'master' || currentUser?.role === 'admin' || (currentUser as any)?.role === 'manager';
  const actor = useMemo(() => ({ id: currentUser?.id, name: currentUser?.name }), [currentUser]);

  const [venueId, setVenueId] = useState<string>(() => (activeVenueId && venues.some(v => v.id === activeVenueId) ? activeVenueId : venues.length > 1 ? 'all' : venues[0]?.id || ''));
  const scopeAll = venueId === 'all';
  const [tab, setTab] = useState<Tab>('unidade');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [periods, setPeriods] = useState<GoalPeriod[]>([]);
  const [goals, setGoals] = useState<CollaboratorGoal[]>([]);
  const [results, setResults] = useState<GoalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [wizard, setWizard] = useState<{ open: boolean; editing?: GoalPeriod }>({ open: false });
  const [goalsModal, setGoalsModal] = useState<{ open: boolean; collaboratorId?: string }>({ open: false });
  const [roleFilter, setRoleFilter] = useState<'all' | 'sdr' | 'closer'>('all');
  const [histCollab, setHistCollab] = useState<string>('all');
  const [legacyCount, setLegacyCount] = useState(0);
  const [legacyDismissed, setLegacyDismissed] = useState(false);
  const [response, setResponse] = useState<{ total: ResponseWindowStats; byResponder: Map<string, ResponderStats> } | null>(null);

  useEffect(() => { if (!venueId && venues[0]) setVenueId(venues[0].id); }, [venues, venueId]);

  useEffect(() => {
    let cancelled = false;
    goalPlanService.isAvailable().then(ok => { if (!cancelled) setAvailable(ok); });
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    if (!masterId || !venueId) return;
    const ps = await goalPlanService.listPeriods(masterId, scopeAll ? {} : { venueId });
    setPeriods(ps);
    const open = ps.filter(p => p.status !== 'closed').map(p => p.id);
    setGoals(scopeAll ? [] : await goalPlanService.listCollaboratorGoals(masterId, { venueId, periodIds: open }));
    setResults(await goalPlanService.listResults(masterId, scopeAll ? {} : { venueId }));
    setLoading(false);
  }, [masterId, venueId, scopeAll]);

  useEffect(() => { setLoading(true); setSelectedPeriodId(null); void load(); }, [load]);
  useGoalRollover(() => { void load(); });

  // Metas antigas (venue_goals) ainda nao importadas
  useEffect(() => {
    let cancelled = false;
    if (!masterId || !venueId) return;
    const now = new Date();
    goalsService.listVenueGoals(masterId, { year: now.getFullYear(), month: now.getMonth() + 1 })
      .then(rows => { if (!cancelled) setLegacyCount(rows.filter(r => r.venueId === venueId && r.period === 'monthly' && (r.revenueTarget || r.salesTarget || r.appointmentsTarget)).length); })
      .catch(() => { if (!cancelled) setLegacyCount(0); });
    return () => { cancelled = true; };
  }, [masterId, venueId]);

  const venue = venues.find(v => v.id === venueId);
  const openPeriods = useMemo(() => periods.filter(p => p.status !== 'closed').sort((a, b) => a.startsOn.localeCompare(b.startsOn)), [periods]);
  const today = todayISO();
  const defaultPeriod = openPeriods.find(p => p.status === 'active' && p.startsOn <= today && p.endsOn >= today) || openPeriods.find(p => p.status === 'active') || openPeriods[0];
  const period = scopeAll ? undefined : openPeriods.find(p => p.id === selectedPeriodId) || defaultPeriod;

  // Quem pode ter meta: colaborador ativo da unidade que e SDR e/ou Closer nos funis comerciais dela
  const rolesById = useMemo(() => {
    const map: Record<string, FunnelMemberRoles> = {};
    collaborators.forEach(c => { map[c.id] = getCommercialRolesInVenue(funnels, venueId, c); });
    return map;
  }, [collaborators, funnels, venueId]);
  const eligible = useMemo<Collaborator[]>(() => collaborators.filter(c =>
    c.active && (rolesById[c.id]?.sdr || rolesById[c.id]?.closer) &&
    (c.venueId === venueId || c.venueId === 'all' || (c.venueIds || []).includes(venueId) || (!c.venueId && !(c.venueIds || []).length)),
  ), [collaborators, venueId, rolesById]);

  // Atalho da tela Colaboradores
  useEffect(() => {
    if (!venues.length || !collaborators.length) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem(GOALS_COLLAB_KEY); } catch { /* sem sessionStorage */ }
    if (!id) return;
    try { sessionStorage.removeItem(GOALS_COLLAB_KEY); } catch { /* ignora */ }
    const c = collaborators.find(x => x.id === id);
    if (!c) return;
    const target = venues.find(v => v.id === c.venueId) || venues.find(v => (c.venueIds || []).includes(v.id)) || venues[0];
    if (target) setVenueId(target.id);
    setTab('equipe');
    setGoalsModal({ open: true, collaboratorId: c.id });
  }, [venues, collaborators]);

  // Atalho aberto sem periodo de meta na unidade: avisa em vez de abrir um modal vazio
  useEffect(() => {
    if (goalsModal.open && !loading && !period) {
      toast.info('Defina primeiro as metas da unidade; depois distribua para o colaborador.');
      setGoalsModal({ open: false });
    }
  }, [goalsModal.open, loading, period]);

  const periodGoals = useMemo(() => (period ? goals.filter(g => g.periodId === period.id) : []), [goals, period]);
  const distributed = useMemo(() => {
    const out: Partial<Record<GoalMetricKey, number>> = {};
    periodGoals.forEach(g => { if (ADDITIVE_METRICS.includes(g.metric) && g.status !== 'closed') out[g.metric] = (out[g.metric] || 0) + g.targetValue; });
    return out;
  }, [periodGoals]);

  // Tempo de resposta (so comercial) do periodo ativo exibido
  useEffect(() => {
    let cancelled = false;
    setResponse(null);
    if (!period || period.status !== 'active') return;
    summarizeVenueResponseWindow({
      leads, funnels, collaboratorIds: new Set(collaborators.map(c => c.id)), venueId, startsOn: period.startsOn, endsOn: period.endsOn,
    }).then(r => { if (!cancelled) setResponse(r); }).catch(() => { if (!cancelled) setResponse(null); });
    return () => { cancelled = true; };
    // leads muda toda hora; recalcula so ao trocar de periodo/unidade
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period?.id, period?.status, venueId]);

  const actuals = useMemo(
    () => (period && period.status === 'active'
      ? computeGoalActuals({ leads, clients, funnels, collaborators }, venueId, period.startsOn, period.endsOn, response || undefined)
      : null),
    [period, leads, clients, funnels, collaborators, venueId, response],
  );

  // "Todas as unidades": periodo ativo de cada unidade e o realizado dele
  const venueSnaps = useMemo(() => {
    if (!scopeAll) return [];
    const nowISO = todayISO();
    return venues.map(v => {
      const ps = periods.filter(p => p.venueId === v.id && p.status === 'active');
      const p = ps.find(x => x.startsOn <= nowISO && x.endsOn >= nowISO) || ps[0] || null;
      return {
        venue: v,
        period: p,
        actuals: p ? computeGoalActuals({ leads, clients, funnels, collaborators }, v.id, p.startsOn, p.endsOn) : null,
      };
    });
  }, [scopeAll, venues, periods, leads, clients, funnels, collaborators]);

  const goalsByCollab = useMemo(() => {
    const map = new Map<string, CollaboratorGoal[]>();
    periodGoals.forEach(g => map.set(g.collaboratorId, [...(map.get(g.collaboratorId) || []), g]));
    return map;
  }, [periodGoals]);

  const pendingCount = useMemo(() => openPeriods.filter(p => p.status === 'pending').length + goals.filter(g => g.status === 'pending').length, [openPeriods, goals]);

  /* ───── Acoes ───── */

  const submitWizard = async (r: WizardResult) => {
    const editing = wizard.editing;
    const existing = editing || periods.find(p => p.venueId === r.venueId && p.startsOn === r.startsOn && p.endsOn === r.endsOn);
    const base = {
      id: existing?.id, venueId: r.venueId, kind: r.kind, startsOn: r.startsOn, endsOn: r.endsOn,
      status: (existing ? existing.status : r.activateNow ? 'active' : 'pending') as GoalStatus,
      isRecurring: r.isRecurring,
      revenueTarget: 0, closingsTarget: 0, appointmentsTarget: 0, schedulingRateTarget: 0, attendanceRateTarget: 0,
      closingRateTarget: 0, responseTimeTargetMinutes: 0, avgResponseTargetMinutes: 0,
    };
    const input: typeof base = { ...base };
    GOAL_METRICS.forEach(m => {
      const field = PERIOD_FIELD[m.key] as keyof typeof base;
      // Edicao: o que foi desmarcado vira 0. Periodo ja existente (criacao): mantem o que nao foi escolhido.
      const keep = !editing && existing ? periodTarget(existing, m.key) : 0;
      (input[field] as number) = r.targets[m.key] ?? keep;
    });
    const res = await goalPlanService.savePeriod(masterId, input, actor, existing);
    if (!res.ok) {
      toast.error(
        res.reason === 'missing_table' ? 'As tabelas de metas ainda não existem no banco. Aplique as migrations e tente de novo.'
          : res.reason === 'exists' ? 'Já existe uma meta para esse período nesta unidade.'
            : res.reason === 'forbidden' ? 'O banco recusou a gravação (sessão expirada ou sem permissão). Saia do sistema, entre de novo e tente outra vez.'
              : 'Não foi possível salvar as metas. Tente novamente.',
      );
      return;
    }
    toast.success(existing ? 'Metas da unidade atualizadas.' : 'Metas da unidade criadas.');
    setWizard({ open: false });
    if (r.venueId !== venueId) setVenueId(r.venueId);
    setSelectedPeriodId(res.data.id);
    await load();
  };

  const saveCollaboratorGoals = async (collaboratorId: string, rows: { metric: GoalMetricKey; value: number }[], isRecurring: boolean, activateNow: boolean) => {
    if (!period) return;
    const existing = goals.filter(g => g.periodId === period.id && g.collaboratorId === collaboratorId);
    for (const g of existing) {
      if (!rows.some(r => r.metric === g.metric)) await goalPlanService.deleteCollaboratorGoal(masterId, g.id);
    }
    for (const r of rows) {
      const prev = existing.find(g => g.metric === r.metric);
      const res = await goalPlanService.saveCollaboratorGoal(masterId, {
        venueId, periodId: period.id, collaboratorId, metric: r.metric, targetValue: r.value,
        status: prev && prev.status !== 'pending' ? prev.status : activateNow && period.status === 'active' ? 'active' : 'pending',
        isRecurring,
      }, actor, prev);
      if (!res.ok) {
        toast.error(res.reason === 'cap_exceeded' ? `${GOAL_METRIC_LABEL[r.metric]}: passou do que resta da meta da unidade.` : `Não foi possível salvar ${GOAL_METRIC_LABEL[r.metric]}.`);
        await load();
        return;
      }
    }
    toast.success('Metas do colaborador salvas.');
    setGoalsModal({ open: false });
    await load();
  };

  const removeGoal = async (g: CollaboratorGoal) => {
    if (!window.confirm(`Remover a meta de ${GOAL_METRIC_LABEL[g.metric]} deste colaborador? Resultados de períodos já encerrados não são afetados.`)) return;
    if (await goalPlanService.deleteCollaboratorGoal(masterId, g.id)) { toast.success('Meta removida.'); await load(); }
    else toast.error('Não foi possível remover.');
  };

  const activateOne = async (g: CollaboratorGoal) => {
    if (period && period.status !== 'active') { toast.warning('Ative primeiro a meta da unidade deste período.'); return; }
    if (await goalPlanService.setGoalStatus(masterId, g.id, 'active')) await load();
  };

  const activateAll = async () => {
    if (!window.confirm(`Ativar tudo que está pendente nesta unidade (${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'})?`)) return;
    if (await goalPlanService.activateAll(masterId, venueId, openPeriods.map(p => p.id))) { toast.success('Metas ativadas.'); await load(); }
    else toast.error('Não foi possível ativar tudo.');
  };

  const importLegacy = async () => {
    const now = new Date();
    const rows = await goalsService.listVenueGoals(masterId, { year: now.getFullYear(), month: now.getMonth() + 1 });
    const legacy = rows.find(r => r.venueId === venueId && r.period === 'monthly');
    if (!legacy) { toast.info('Nenhuma meta antiga encontrada para este mês.'); return; }
    const startsOn = firstOfMonth();
    const created = await goalPlanService.savePeriod(masterId, {
      venueId, kind: 'monthly', startsOn, endsOn: endForKind(startsOn, 'monthly'), status: 'active', isRecurring: true,
      revenueTarget: legacy.revenueTarget, closingsTarget: legacy.salesTarget,
      appointmentsTarget: legacy.appointmentsTarget || 0, schedulingRateTarget: 0, attendanceRateTarget: 0, closingRateTarget: 0,
      responseTimeTargetMinutes: legacy.responseTimeTargetMinutes, avgResponseTargetMinutes: 0,
    }, actor);
    if (!created.ok) {
      toast.error(
        created.reason === 'missing_table' ? 'As tabelas de metas ainda não existem no banco. Aplique as migrations e tente de novo.'
          : created.reason === 'exists' ? 'Este mês já tem metas nesta unidade. Edite as metas existentes.'
            : created.reason === 'forbidden' ? 'O banco recusou a gravação (sessão expirada ou sem permissão). Saia do sistema, entre de novo e tente outra vez.'
              : 'Não foi possível importar as metas antigas.',
      );
      return;
    }
    let skipped = 0;
    for (const c of eligible) {
      const g = c.goals;
      if (!g) continue;
      const all: { metric: GoalMetricKey; value: number }[] = [
        { metric: 'revenue', value: g.revenueTarget || 0 }, { metric: 'closings', value: g.closingsTarget || 0 },
        { metric: 'appointments', value: g.leadsTarget || 0 }, { metric: 'response_time', value: g.responseTimeTargetMinutes || 0 },
      ];
      for (const i of all.filter(x => x.value > 0)) {
        const res = await goalPlanService.saveCollaboratorGoal(masterId, {
          venueId, periodId: created.data.id, collaboratorId: c.id, metric: i.metric, targetValue: i.value, status: 'active', isRecurring: true,
        }, actor);
        if (!res.ok) skipped += 1;
      }
    }
    toast.success(skipped > 0 ? `Metas importadas. ${skipped} meta(s) individuais ficaram de fora por passarem do teto da unidade.` : 'Metas importadas.');
    setLegacyCount(0);
    await load();
  };

  /* ───── Historico ───── */

  const closedResultsByPeriod = useMemo(() => {
    const filtered = results.filter(r => histCollab === 'all' || r.collaboratorId === histCollab || (histCollab === 'venue' && r.scope === 'venue'));
    const map = new Map<string, GoalResult[]>();
    filtered.forEach(r => { const key = `${r.startsOn}|${r.endsOn}`; map.set(key, [...(map.get(key) || []), r]); });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [results, histCollab]);
  const histCollabOptions = useMemo(() => {
    const m = new Map<string, string>();
    results.forEach(r => { if (r.collaboratorId) m.set(r.collaboratorId, r.collaboratorName || 'Colaborador'); });
    return [...m.entries()];
  }, [results]);

  if (venues.length === 0) {
    return <div style={{ padding: '40px', color: 'var(--adm-text-muted)' }}>Cadastre uma casa de festas para definir metas.</div>;
  }

  const emptyBox = (icon: React.ReactNode, title: string, text: string, action?: React.ReactNode) => (
    <div style={{ ...card, textAlign: 'center', padding: '44px 24px' }}>
      <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)' }}>{icon}</div>
      <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{title}</h3>
      <p style={{ margin: '0 auto 16px', maxWidth: '480px', fontSize: '0.8rem', color: 'var(--adm-text-muted)', lineHeight: 1.5 }}>{text}</p>
      {action}
    </div>
  );

  const newGoalButton = canEdit && (
    <button type="button" className="adm-btn-primary" onClick={() => setWizard({ open: true })} style={{ padding: '10px 22px', borderRadius: '10px', fontWeight: 800 }}>
      Criar metas
    </button>
  );

  /** Botao do topo "Meta de colaborador": precisa de uma unidade escolhida e de metas da unidade no periodo. */
  function openCollaboratorGoals() {
    if (scopeAll) { toast.info('Escolha uma unidade no seletor para definir metas de colaboradores.'); return; }
    setTab('equipe');
    if (!period) { toast.info('Defina primeiro as metas da unidade; depois distribua para o colaborador.'); return; }
    setGoalsModal({ open: true });
  }

  /** Equipe/Historico em "Todas as unidades": pede para escolher a unidade (cartoes com logo). */
  function renderPickVenue() {
    return (
      <div style={{ ...card }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '4px' }}>Escolha uma unidade</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginBottom: '14px' }}>As metas de colaboradores são definidas dentro de cada unidade.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px' }}>
          {venues.map(v => (
            <button key={v.id} type="button" onClick={() => setVenueId(v.id)} style={{
              display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
              border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input)',
            }}><UnitBadge venue={v} /></button>
          ))}
        </div>
      </div>
    );
  }

  /** "Todas as unidades": metas e realizado somados e a divisao entre as unidades. */
  function renderConsolidated() {
    const withPeriod = venueSnaps.filter(v => v.period);
    if (withPeriod.length === 0) {
      return emptyBox(<Target size={26} />, 'Nenhuma meta ativa nas unidades',
        'Escolha uma unidade no seletor e crie as metas dela. Aqui você verá os totais da rede e a divisão por unidade.', newGoalButton);
    }
    const totals = (['revenue', 'closings', 'appointments'] as GoalMetricKey[]).map(key => {
      const target = withPeriod.reduce((sum, v) => sum + periodTarget(v.period as GoalPeriod, key), 0);
      const actual = withPeriod.reduce((sum, v) => sum + (v.actuals ? (venueActual(v.actuals, key) ?? 0) : 0), 0);
      return { key, target, actual };
    }).filter(t => t.target > 0);
    const revenueActualTotal = withPeriod.reduce((sum, v) => sum + (v.actuals?.venue.revenue ?? 0), 0);
    return (
      <>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ ...eyebrow, fontSize: '0.72rem' }}>Rede · todas as unidades</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Soma das metas ativas hoje em {withPeriod.length} {withPeriod.length === 1 ? 'unidade' : 'unidades'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
            {totals.map(t => {
              const pct = goalPct(t.key, t.target, t.actual);
              return (
                <div key={t.key} style={{ border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--adm-bg-input)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MetricChip metric={t.key} size={30} />
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>{goalMetricDef(t.key).label}</span>
                  </div>
                  <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>{formatMetricValue(t.key, t.actual)}</span>
                  <ProgressBar pct={pct} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>Meta {formatMetricValue(t.key, t.target)}{pct !== null ? ` · ${pct}%` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={card}>
          <div style={{ ...eyebrow, fontSize: '0.72rem', marginBottom: '12px' }}>Divisão por unidade</div>
          {revenueActualTotal > 0 && (
            <div style={{ display: 'flex', height: '10px', borderRadius: '999px', overflow: 'hidden', marginBottom: '14px', background: 'var(--adm-bg-input)' }}>
              {withPeriod.map((v, i) => {
                const share = ((v.actuals?.venue.revenue ?? 0) / revenueActualTotal) * 100;
                return share > 0 ? <div key={v.venue.id} title={`${v.venue.name}: ${Math.round(share)}%`} style={{ width: `${share}%`, background: UNIT_COLORS[i % UNIT_COLORS.length] }} /> : null;
              })}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {venueSnaps.map((v, i) => {
              const revenue = v.actuals?.venue.revenue ?? 0;
              const target = v.period ? v.period.revenueTarget : 0;
              const pct = target > 0 ? goalPct('revenue', target, revenue) : null;
              const share = revenueActualTotal > 0 ? Math.round((revenue / revenueActualTotal) * 100) : 0;
              return (
                <button key={v.venue.id} type="button" onClick={() => setVenueId(v.venue.id)} title="Abrir a unidade" style={{
                  display: 'grid', gridTemplateColumns: 'minmax(180px, 1.1fr) 2fr auto', gap: '14px', alignItems: 'center', textAlign: 'left', cursor: 'pointer',
                  padding: '8px 10px', borderRadius: '12px', border: '1px solid transparent', background: 'transparent',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: UNIT_COLORS[i % UNIT_COLORS.length], flexShrink: 0 }} />
                    <UnitBadge venue={v.venue} subtitle={v.period ? `${fmtDate(v.period.startsOn)} a ${fmtDate(v.period.endsOn)}` : 'Sem meta ativa'} />
                  </span>
                  <span>
                    <ProgressBar pct={pct} />
                    <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMetricValue('revenue', revenue)}{target > 0 ? ` de ${formatMetricValue('revenue', target)}${pct !== null ? ` · ${pct}%` : ''}` : ''}
                    </span>
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', textAlign: 'right', minWidth: '70px' }}>{share}% da rede</span>
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  const visibleCollabs = eligible.filter(c => roleFilter === 'all' || rolesById[c.id]?.[roleFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '16px 28px 60px', width: '100%', boxSizing: 'border-box' }}>
      {canEdit && available !== false && (
        <HeaderActions>
          <button type="button" className="adm-btn-secondary" onClick={openCollaboratorGoals}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>
            <Users size={15} /> <span>Meta de colaborador</span>
          </button>
          <button type="button" className="adm-btn-primary" onClick={() => setWizard({ open: true })}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>
            <Plus size={15} /> <span>Meta da unidade</span>
          </button>
        </HeaderActions>
      )}

      {available === false ? (
        emptyBox(<AlertTriangle size={26} />, 'Metas indisponíveis neste banco',
          'As tabelas de metas ainda não foram criadas. Aplique as migrations do projeto (supabase migration up) e recarregue a página.')
      ) : (
        <>
          {/* Unidade e abas */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', border: '1px solid var(--adm-border)',
              }}>
                {venue?.logoUrl ? <img src={venue.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={18} />}
              </span>
              <Select className="adm-input" value={venueId} onChange={e => { setVenueId(e.target.value); if (e.target.value === 'all' && tab === 'equipe') setTab('unidade'); }} aria-label="Unidade"
                style={{ height: '38px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, padding: '0 12px', minWidth: '220px' }}>
                {venues.length > 1 && <option value="all">Todas as unidades</option>}
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </label>
            <div role="tablist" style={{ display: 'inline-flex', padding: '3px', borderRadius: '12px', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)' }}>
              {TABS.map(({ id, label, Icon }) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 800, background: tab === id ? 'var(--adm-bg-card)' : 'transparent', color: tab === id ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                  boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}><Icon size={14} /> {label}{id === 'equipe' && pendingCount > 0 ? <span style={{ background: '#F59E0B', color: '#0B111A', borderRadius: '999px', fontSize: '0.6rem', padding: '1px 6px' }}>{pendingCount}</span> : null}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ ...card, color: 'var(--adm-text-muted)' }}>Carregando metas...</div>
          ) : tab === 'unidade' && scopeAll ? (
            renderConsolidated()
          ) : tab === 'unidade' ? (
            <>
              {canEdit && legacyCount > 0 && openPeriods.length === 0 && !legacyDismissed && (
                <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', borderStyle: 'dashed', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)' }}>
                    <strong>Metas antigas encontradas em {venue?.name}.</strong>{' '}
                    <span style={{ color: 'var(--adm-text-muted)' }}>Importe para o novo modelo, com histórico e recorrência.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="adm-btn-primary" onClick={importLegacy} style={{ padding: '7px 16px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem' }}>Importar</button>
                    <button type="button" aria-label="Dispensar" onClick={() => setLegacyDismissed(true)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', display: 'inline-flex' }}><X size={16} /></button>
                  </div>
                </div>
              )}

              {openPeriods.length === 0 ? emptyBox(<Target size={26} />, `Nenhuma meta definida para ${venue?.name || 'a unidade'}`,
                'Escolha o período e as metas que fazem sentido (por exemplo, só o faturamento). Depois distribua entre os colaboradores.', newGoalButton) : (
                <>
                  {openPeriods.length > 1 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {openPeriods.map(p => (
                        <button key={p.id} type="button" onClick={() => setSelectedPeriodId(p.id)} aria-pressed={p.id === period?.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                          border: `1px solid ${p.id === period?.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`, background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)',
                        }}><CalendarRange size={13} /> {fmtDate(p.startsOn)} a {fmtDate(p.endsOn)} <StatusChip status={p.status} /></button>
                      ))}
                    </div>
                  )}

                  {period && (
                    <div style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ ...eyebrow, fontSize: '0.72rem' }}>Metas da unidade</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>{GOAL_KIND_LABEL[period.kind]} · {fmtDate(period.startsOn)} a {fmtDate(period.endsOn)}</span>
                          <StatusChip status={period.status} />
                          {period.isRecurring && <span title="Repete automaticamente" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}><Repeat size={12} /> Recorrente</span>}
                        </div>
                        {canEdit && (
                          <button type="button" onClick={() => setWizard({ open: true, editing: period })} className="adm-btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 700 }}>
                            <Pencil size={13} /> Editar metas
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
                        {GOAL_METRICS.filter(m => periodTarget(period, m.key) > 0).map(m => {
                          const target = periodTarget(period, m.key);
                          const actual = actuals ? venueActual(actuals, m.key) : null;
                          const pct = actuals ? goalPct(m.key, target, actual) : null;
                          const dist = distributed[m.key] || 0;
                          return (
                            <div key={m.key} style={{ border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--adm-bg-input)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <MetricChip metric={m.key} size={30} />
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>{m.label}</span>
                              </div>
                              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>{formatMetricValue(m.key, target)}</span>
                              {actuals && (
                                <>
                                  <ProgressBar pct={pct} />
                                  <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>Realizado {formatMetricValue(m.key, actual)}{pct !== null ? ` · ${pct}%` : ''}</span>
                                </>
                              )}
                              {m.additive && (
                                <span style={{ fontSize: '0.66rem', color: dist >= target ? '#10B981' : 'var(--adm-text-muted)' }}>
                                  Distribuído {formatMetricValue(m.key, dist)} · disponível {formatMetricValue(m.key, Math.max(0, target - dist))}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : tab === 'equipe' && scopeAll ? (
            renderPickVenue()
          ) : tab === 'equipe' ? (
            !period ? emptyBox(<Users size={26} />, 'Defina primeiro as metas da unidade',
              'As metas dos colaboradores saem da meta da unidade no período: crie as metas da unidade e depois distribua entre a equipe.', newGoalButton) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {([['all', 'Todos'], ['sdr', 'SDR'], ['closer', 'Closer']] as const).map(([id, label]) => (
                      <button key={id} type="button" onClick={() => setRoleFilter(id)} aria-pressed={roleFilter === id} style={{
                        padding: '6px 14px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                        border: `1px solid ${roleFilter === id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                        background: roleFilter === id ? 'var(--adm-accent)' : 'var(--adm-bg-card)', color: roleFilter === id ? '#0B111A' : 'var(--adm-text-title)',
                      }}>{label}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{period.status === 'active' ? 'Período ativo' : 'Período pendente'}: {fmtDate(period.startsOn)} a {fmtDate(period.endsOn)}</span>
                    {canEdit && pendingCount > 0 && (
                      <button type="button" onClick={activateAll} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                        border: '1px solid #10B981', background: 'rgba(16,185,129,0.12)', color: '#10B981',
                      }}><Zap size={14} /> Ativar tudo ({pendingCount})</button>
                    )}
                  </div>
                </div>

                {visibleCollabs.length === 0 ? (
                  <div style={{ ...card, color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>Nenhum colaborador com esse papel nesta unidade.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                    {visibleCollabs.map(c => {
                      const list = goalsByCollab.get(c.id) || [];
                      return (
                        <div key={c.id} style={{ ...card, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <span style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                {c.avatarUrl ? <img src={c.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.name.slice(0, 2).toUpperCase()}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', padding: '1px 6px', borderRadius: '4px', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)' }}>{roleText(rolesById[c.id])}</span>
                              </div>
                            </div>
                            {canEdit && (
                              <button type="button" onClick={() => setGoalsModal({ open: true, collaboratorId: c.id })} className={list.length ? 'adm-btn-secondary' : 'adm-btn-primary'}
                                style={{ padding: '6px 12px', borderRadius: '9px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                {list.length ? 'Editar metas' : 'Definir metas'}
                              </button>
                            )}
                          </div>

                          {list.length === 0 ? (
                            <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>Sem metas neste período.</div>
                          ) : list.map(g => {
                            const def = goalMetricDef(g.metric);
                            const actual = actuals ? collaboratorActual(actuals, c.id, g.metric) : null;
                            const pct = actuals && g.status === 'active' ? goalPct(g.metric, g.targetValue, actual) : null;
                            return (
                              <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                                    <MetricChip metric={g.metric} size={22} /> {def.label}
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    {g.isRecurring && <span title="Recorrente" style={{ display: 'inline-flex' }}><Repeat size={11} color="var(--adm-text-muted)" /></span>}
                                    <StatusChip status={g.status} />
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                    {g.status === 'active' ? formatMetricValue(g.metric, actual) : '—'} <span style={{ color: 'var(--adm-text-muted)', fontWeight: 600 }}>de {formatMetricValue(g.metric, g.targetValue)}</span>
                                  </span>
                                  <span style={{ fontWeight: 800, color: barColor(pct) }}>{pct !== null ? `${pct}%` : ''}</span>
                                </div>
                                <ProgressBar pct={pct} />
                                {canEdit && (
                                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    {g.status === 'pending' && <button type="button" onClick={() => activateOne(g)} style={{ background: 'transparent', border: 'none', color: '#10B981', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}>Ativar</button>}
                                    <button type="button" onClick={() => removeGoal(g)} aria-label="Remover meta" style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'inline-flex' }}><Trash2 size={12} /></button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )
          ) : (
            /* ───── Historico ───── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={eyebrow}>Filtrar</span>
                <Select className="adm-input" value={histCollab} onChange={e => setHistCollab(e.target.value)} style={{ height: '36px', borderRadius: '10px', fontSize: '0.78rem', minWidth: '210px' }}>
                  <option value="all">Unidade e colaboradores</option>
                  <option value="venue">Somente a unidade</option>
                  {histCollabOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </Select>
              </div>
              {closedResultsByPeriod.length === 0 ? emptyBox(<History size={26} />, 'Nenhum período encerrado ainda',
                'Quando um período vence, o resultado de cada meta fica guardado aqui e não muda mais.') : closedResultsByPeriod.map(([key, rows]) => {
                const [s, e] = key.split('|');
                const met = rows.filter(r => r.outcome === 'met').length;
                return (
                  <div key={key} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{fmtDate(s)} a {fmtDate(e)}</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: met === rows.length ? '#10B981' : 'var(--adm-text-muted)' }}>{met} de {rows.length} metas batidas</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {rows.map(r => {
                        const over = r.pct !== null ? r.pct - 100 : null;
                        return (
                          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1.2fr) 2fr auto', gap: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <MetricChip metric={r.metric} size={28} />
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{r.scope === 'venue' ? 'Unidade' : r.collaboratorName || 'Colaborador'}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{GOAL_METRIC_LABEL[r.metric]}</div>
                              </div>
                            </div>
                            <div>
                              <ProgressBar pct={r.pct} color={r.outcome === 'met' ? '#10B981' : barColor(r.pct)} />
                              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                                {formatMetricValue(r.metric, r.actualValue)} de {formatMetricValue(r.metric, r.targetValue)}{r.pct !== null ? ` · ${r.pct}%` : ''}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, textAlign: 'right', color: r.outcome === 'met' ? '#10B981' : '#EF4444' }}>
                              {r.outcome === 'met' ? 'Bateu' : 'Não bateu'}{over !== null && !goalMetricDef(r.metric).lowerIsBetter ? ` (${over >= 0 ? '+' : ''}${over}%)` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!canEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
              <Lock size={13} /> Somente master, administradores e gerentes editam metas.
            </div>
          )}
        </>
      )}

      {wizard.open && (
        <GoalWizard
          venues={venues} lockedVenueId={scopeAll ? undefined : venueId} editing={wizard.editing} distributed={wizard.editing ? distributed : {}}
          onClose={() => setWizard({ open: false })} onSubmit={submitWizard}
        />
      )}
      {goalsModal.open && period && (
        <CollaboratorGoalsModal
          venue={venue} collaborators={eligible} rolesById={rolesById} period={period} goals={goals} initialCollaboratorId={goalsModal.collaboratorId}
          onClose={() => setGoalsModal({ open: false })} onSave={saveCollaboratorGoals}
        />
      )}
    </div>
  );
};
