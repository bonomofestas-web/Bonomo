import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { goalsService, type VenueGoalRecord } from '../../services/goalsService';
import { metricsService } from '../../services/metricsService';
import { getGoalStatus, goalPercent } from '../../utils/goalStatus';
import { HeaderActions } from './HeaderActions';
import { 
  Target, DollarSign, Award, Users, Clock, 
  Plus, Calendar,
  TrendingUp, Edit3, X
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminCollaboratorGoalsModal } from './AdminCollaboratorGoalsModal';
import { AdminGoalsNetworkPanel } from './AdminGoalsNetworkPanel';
import type { VenueGoals, TeamGoals, Collaborator } from '../../types/admin';

type GoalType = 'sales' | 'revenue' | 'leads' | 'visits';

interface GoalCardConfig {
  id: string;
  type: GoalType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  prefix?: string;
  deadline?: string;
}

interface TeamGoalCardProps {
  role: 'sdr' | 'closer';
  goal: TeamGoals;
  progress: { revenue: number; closings: number; appointments: number };
  onSave: (goal: TeamGoals) => Promise<void>;
}

const TeamGoalCard: React.FC<TeamGoalCardProps> = ({ role, goal, progress, onSave }) => {
  const [draft, setDraft] = useState({
    revenue: String(goal.revenueTarget || ''),
    appointments: String(goal.appointmentsTarget || ''),
    closings: String(goal.closingsTarget || ''),
    response: String(goal.responseTimeTargetMinutes || ''),
  });
  const [saving, setSaving] = useState(false);

  const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

  // SDR acompanha agendamentos; Closer acompanha faturamento e fechamentos
  const rows = role === 'sdr'
    ? [
        { label: 'Agendamentos', achieved: progress.appointments, target: num(draft.appointments) },
        { label: 'Participações em fechamento', achieved: progress.closings, target: num(draft.closings) },
      ]
    : [
        { label: 'Faturamento (R$)', achieved: progress.revenue, target: num(draft.revenue), money: true },
        { label: 'Fechamentos', achieved: progress.closings, target: num(draft.closings) },
      ];

  const handleSave = async () => {
    const values = [num(draft.revenue), num(draft.appointments), num(draft.closings), num(draft.response)];
    if (values.some(v => !Number.isFinite(v) || v < 0)) {
      toast.warning('Use apenas valores numéricos iguais ou maiores que zero.');
      return;
    }
    setSaving(true);
    await onSave({
      ...goal,
      revenueTarget: values[0],
      appointmentsTarget: values[1],
      closingsTarget: values[2],
      responseTimeTargetMinutes: values[3],
    });
    setSaving(false);
  };

  const field = (label: string, key: keyof typeof draft) => (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>{label}</label>
      <input
        type="number"
        min="0"
        value={draft[key]}
        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
        className="adm-input"
        style={{ width: '100%', height: '36px', borderRadius: '8px', fontSize: '0.82rem' }}
      />
    </div>
  );

  return (
    <div style={{
      background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '16px',
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users size={18} color="var(--adm-accent)" />
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
          {role === 'sdr' ? 'Equipe SDR' : 'Equipe Closer'}
        </span>
      </div>

      {rows.map(r => {
        const pct = goalPercent(r.achieved, r.target);
        const st = getGoalStatus(pct);
        return (
          <div key={r.label} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: 'var(--adm-text-muted)', fontWeight: 700 }}>{r.label}</span>
              <span style={{ color: st.color, fontWeight: 800 }}>
                {r.money ? `R$ ${r.achieved.toLocaleString('pt-BR')}` : r.achieved} / {r.money ? `R$ ${r.target.toLocaleString('pt-BR')}` : r.target}
                {pct !== null ? ` · ${pct}%` : ''}
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--adm-bg-input)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, pct ?? 0)}%`, height: '100%', background: st.color, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        );
      })}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {role === 'closer' ? field('Meta de faturamento (R$)', 'revenue') : field('Meta de agendamentos', 'appointments')}
        {field('Meta de fechamentos', 'closings')}
        {field('1ª resposta máx. (min)', 'response')}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="adm-btn-primary"
        style={{ alignSelf: 'flex-end', padding: '8px 18px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Salvando...' : 'Salvar meta'}
      </button>
    </div>
  );
};

export const AdminVenueGoalsView: React.FC = () => {
  const { venues, activeVenueId, leads, updateVenue, currentUser, collaborators } = useAdminState();
  const [collabForGoals, setCollabForGoals] = useState<Collaborator | null>(null);
  const masterId = currentUser?.masterId || currentUser?.id || '';

  const isAllVenues = !activeVenueId || activeVenueId === 'all' || activeVenueId === 'multi';

  const selectedVenue = useMemo(() => {
    return venues.find(v => v.id === activeVenueId) || venues[0] || null;
  }, [venues, activeVenueId]);

  const nowRef = new Date();
  const goalYear = nowRef.getFullYear();
  const goalMonth = nowRef.getMonth() + 1;

  // Metas reais do banco (venue_goals do mês) e metas de equipe
  const [dbVenueGoal, setDbVenueGoal] = useState<VenueGoals | null>(null);
  const [teamGoals, setTeamGoals] = useState<TeamGoals[]>([]);
  const [allVenueGoals, setAllVenueGoals] = useState<VenueGoalRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!masterId || !selectedVenue) return;
    const [venueRows, teamRows] = await Promise.all([
      goalsService.listVenueGoals(masterId, { year: goalYear, month: goalMonth }),
      goalsService.listTeamGoals(masterId, { venueId: selectedVenue.id, year: goalYear, month: goalMonth }),
    ]);
    setAllVenueGoals(venueRows.filter(r => r.period === 'monthly'));
    setDbVenueGoal(venueRows.find(r => r.venueId === selectedVenue.id && r.period === 'monthly') || null);
    setTeamGoals(teamRows);
  }, [masterId, selectedVenue, goalYear, goalMonth]);

  useEffect(() => {
    setDbVenueGoal(null);
    setTeamGoals([]);
    loadGoals();
  }, [loadGoals]);

  // Modal State for Adding/Editing a Goal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalGoalType, setModalGoalType] = useState<GoalType>('sales');
  const [modalTargetValue, setModalTargetValue] = useState<number>(15);
  const [modalDeadlineDate, setModalDeadlineDate] = useState<string>(() => {
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    return endOfMonth.toISOString().split('T')[0];
  });

  // Current Goals Config for the venue
  // A meta e sempre por unidade; na visao geral ("todas") vale a SOMA das metas das unidades.
  const endOfMonthISO = new Date(goalYear, goalMonth, 0).toISOString().split('T')[0];
  const goals: VenueGoals = useMemo(() => {
    const zero: VenueGoals = {
      revenueTarget: 0, salesTarget: 0, leadsTarget: 0, appointmentsTarget: 0,
      responseTimeTargetMinutes: 0, period: 'monthly', deadlineDate: endOfMonthISO,
    };
    if (isAllVenues) {
      const sum = goalsService.sumNetworkGoals(allVenueGoals, venues.map(v => v.id));
      return sum ? { ...zero, ...sum, period: 'monthly', deadlineDate: endOfMonthISO } : zero;
    }
    if (dbVenueGoal) return { ...zero, ...dbVenueGoal };
    if (selectedVenue?.goals) return { ...zero, ...selectedVenue.goals };
    return zero;
  }, [isAllVenues, allVenueGoals, venues, selectedVenue, dbVenueGoal, endOfMonthISO]);

  // Scoped metrics
  const inCurrentMonth = useCallback((iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && d.getFullYear() === goalYear && d.getMonth() + 1 === goalMonth;
  }, [goalYear, goalMonth]);

  const scopedLeads = useMemo(() => {
    if (isAllVenues) return leads;
    return leads.filter(l => l.venueId === selectedVenue?.id);
  }, [leads, isAllVenues, selectedVenue]);

  // Apenas o mês corrente: a meta é mensal
  const monthLeads = useMemo(() => scopedLeads.filter(l => inCurrentMonth(l.createdAt)), [scopedLeads, inCurrentMonth]);

  const soldLeads = useMemo(() => {
    return scopedLeads.filter(l => l.stage === 'contract_signed' && inCurrentMonth(l.contractDate || l.createdAt));
  }, [scopedLeads, inCurrentMonth]);

  const totalRevenue = useMemo(() => {
    return soldLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  }, [soldLeads]);

  const totalSalesCount = soldLeads.length;
  const totalLeadsCount = monthLeads.length;
  const meetingLeadsCount = scopedLeads.filter(l => l.stage === 'meeting_scheduled').length;

  // Metas por equipe: realizado por papel no mês
  const teamProgress = useMemo(() => {
    const closerLeads = soldLeads.filter(l => l.closerId);
    return {
      closer: {
        revenue: closerLeads.reduce((s, l) => s + (l.dealValue || 0), 0),
        closings: closerLeads.length,
        appointments: 0,
      },
      sdr: {
        revenue: 0,
        closings: soldLeads.filter(l => l.sdrId).length,
        appointments: scopedLeads.filter(l => l.sdrId && l.stage === 'meeting_scheduled').length,
      },
    };
  }, [soldLeads, scopedLeads]);

  // Build Stacked Goal Cards
  const goalCards: GoalCardConfig[] = useMemo(() => {
    return [
      {
        id: 'goal_sales',
        type: 'sales',
        title: 'Meta de Contratos Fechados',
        subtitle: 'Número de celebrações e contratos fechados pela equipe',
        icon: <Award size={22} />,
        iconColor: '#10B981',
        iconBg: 'rgba(16, 185, 129, 0.15)',
        currentValue: totalSalesCount,
        targetValue: goals.salesTarget || 0,
        unit: 'contratos',
        deadline: goals.deadlineDate,
      },
      {
        id: 'goal_revenue',
        type: 'revenue',
        title: 'Meta de Faturamento Bruto',
        subtitle: 'Volume total de faturamento gerado em contratos fechados',
        icon: <DollarSign size={22} />,
        iconColor: '#D4AF37',
        iconBg: 'rgba(212, 175, 55, 0.15)',
        currentValue: totalRevenue,
        targetValue: goals.revenueTarget || 0,
        unit: '',
        prefix: 'R$ ',
        deadline: goals.deadlineDate,
      },
      {
        id: 'goal_leads',
        type: 'leads',
        title: 'Meta de Captação de Leads',
        subtitle: 'Novos contatos e oportunidades comerciais captadas no período',
        icon: <Users size={22} />,
        iconColor: '#3B82F6',
        iconBg: 'rgba(59, 130, 246, 0.15)',
        currentValue: totalLeadsCount,
        targetValue: goals.leadsTarget || 0,
        unit: 'leads',
        deadline: goals.deadlineDate,
      },
      {
        id: 'goal_visits',
        type: 'visits',
        title: 'Meta de Visitas & Degustações',
        subtitle: 'Reuniões presenciais e visitas ao espaço agendadas',
        icon: <Calendar size={22} />,
        iconColor: '#8B5CF6',
        iconBg: 'rgba(139, 92, 246, 0.15)',
        currentValue: meetingLeadsCount,
        targetValue: goals.appointmentsTarget || 0,
        unit: 'agendamentos',
        deadline: goals.deadlineDate,
      },
    ];
  }, [totalSalesCount, totalRevenue, totalLeadsCount, meetingLeadsCount, goals]);

  // Calculate Days Remaining
  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const target = new Date(deadline);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Prazo encerrado';
    if (diffDays === 0) return 'Termina hoje';
    return `${diffDays} dias restantes`;
  };

  const handleOpenAddModal = (type?: GoalType) => {
    if (isAllVenues) {
      toast.info('Selecione uma unidade para definir a meta. A meta geral é a soma das metas das unidades.');
      return;
    }
    const t = type || modalGoalType;
    setModalGoalType(t);
    if (t === 'sales') setModalTargetValue(goals.salesTarget || 0);
    if (t === 'revenue') setModalTargetValue(goals.revenueTarget || 0);
    if (t === 'leads') setModalTargetValue(goals.leadsTarget || 0);
    if (t === 'visits') setModalTargetValue(goals.appointmentsTarget || 0);
    setIsModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue || !masterId) return;
    if (!Number.isFinite(modalTargetValue) || modalTargetValue <= 0) {
      toast.warning('Informe um valor alvo maior que zero.');
      return;
    }

    const updatedGoals: VenueGoals = {
      ...goals,
      deadlineDate: modalDeadlineDate,
      period: 'monthly',
    };
    if (modalGoalType === 'sales') updatedGoals.salesTarget = Number(modalTargetValue);
    if (modalGoalType === 'revenue') updatedGoals.revenueTarget = Number(modalTargetValue);
    if (modalGoalType === 'leads') updatedGoals.leadsTarget = Number(modalTargetValue);
    if (modalGoalType === 'visits') updatedGoals.appointmentsTarget = Number(modalTargetValue);

    setIsSaving(true);
    const ok = await metricsService.upsertVenueGoal({
      masterId,
      venueId: selectedVenue.id,
      revenueTarget: updatedGoals.revenueTarget,
      salesTarget: updatedGoals.salesTarget,
      leadsTarget: updatedGoals.leadsTarget,
      appointmentsTarget: updatedGoals.appointmentsTarget || 0,
      responseTimeTargetMinutes: updatedGoals.responseTimeTargetMinutes,
      period: 'monthly',
      month: goalMonth,
      year: goalYear,
    });
    setIsSaving(false);

    if (!ok) {
      toast.error('Erro ao salvar a meta da unidade.');
      return;
    }
    updateVenue(selectedVenue.id, { goals: updatedGoals });
    setDbVenueGoal(updatedGoals);
    toast.success('Meta da unidade salva.');
    setIsModalOpen(false);
  };

  const emptyTeamGoal = (role: 'sdr' | 'closer'): TeamGoals => ({
    masterId,
    venueId: selectedVenue?.id || '',
    role,
    period: 'monthly',
    month: goalMonth,
    year: goalYear,
    revenueTarget: 0,
    appointmentsTarget: 0,
    closingsTarget: 0,
    responseTimeTargetMinutes: 15,
  });

  const handleSaveTeamGoal = async (goal: TeamGoals) => {
    const ok = await goalsService.upsertTeamGoal(goal);
    if (!ok) {
      toast.error('Erro ao salvar a meta da equipe.');
      return;
    }
    toast.success(`Meta de ${goal.role === 'sdr' ? 'SDRs' : 'Closers'} salva.`);
    loadGoals();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '28px 32px 60px',
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      
      {/* Título no breadcrumb; ações no menu superior */}
      <HeaderActions>

        {/* Action Button: Adicionar / Editar Meta */}
        <button
          type="button"
          onClick={() => handleOpenAddModal()}
          className="adm-btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            fontWeight: 800,
            boxShadow: '0 4px 16px rgba(212, 175, 55, 0.25)',
          }}
        >
          <Plus size={16} />
          <span>Configurar Metas</span>
        </button>
      </HeaderActions>

      {isAllVenues && (
        <div style={{
          fontSize: '0.78rem', color: 'var(--adm-text-muted)', padding: '10px 14px', borderRadius: '10px',
          background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)',
        }}>
          Visão geral: os cartões abaixo mostram a soma das metas de {venues.length} {venues.length === 1 ? 'unidade' : 'unidades'}.
          Para alterar, edite a meta da unidade na tabela ou selecione a unidade.
        </div>
      )}

      {/* ── METAS POR UNIDADE + META TOTAL DA REDE ── */}
      <AdminGoalsNetworkPanel onSaved={loadGoals} />

      {/* ── STACKED GOALS CARDS (Cards Empilhados um acima do outro) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {goalCards.map((g) => {
          const rawPct = goalPercent(g.currentValue, g.targetValue);
          const pct = Math.min(100, rawPct ?? 0);
          const status = getGoalStatus(rawPct);
          const isCompleted = pct >= 100;
          const daysInfo = getDaysRemaining(g.deadline);

          return (
            <div
              key={g.id}
              style={{
                background: 'var(--adm-bg-card)',
                border: isCompleted ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--adm-border)',
                borderRadius: '18px',
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: isCompleted ? '0 8px 24px rgba(16, 185, 129, 0.08)' : '0 4px 14px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Card Top Row: Icon, Title & Actions */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: g.iconBg,
                    color: g.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {g.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                      {g.title}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '2px' }}>
                      {g.subtitle}
                    </p>
                  </div>
                </div>

                {/* Status & Edit Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {g.deadline && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'var(--adm-bg-input)',
                      color: 'var(--adm-text-muted)',
                      border: '1px solid var(--adm-border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}>
                      <Clock size={12} />
                      <span>{daysInfo}</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(g.type as any)}
                    className="adm-btn-secondary"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Ajustar</span>
                  </button>
                </div>
              </div>

              {/* Progress & Values Row */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
              }}>
                {/* Current vs Target Value */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--adm-text-title)', fontFamily: "'Poppins', sans-serif" }}>
                    {g.prefix ? `${g.prefix}${g.currentValue.toLocaleString('pt-BR')}` : g.currentValue.toLocaleString('pt-BR')}
                  </span>
                  <span style={{ fontSize: '0.92rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                    / {g.prefix ? `${g.prefix}${g.targetValue.toLocaleString('pt-BR')}` : `${g.targetValue.toLocaleString('pt-BR')} ${g.unit}`}
                  </span>
                </div>

                {/* Percentage Achieved Badge */}
                <div style={{
                  fontSize: '0.86rem',
                  fontWeight: 900,
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: status.bg,
                  color: status.color,
                  border: `1px solid ${status.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <TrendingUp size={15} />
                  <span>{rawPct === null ? 'Sem meta definida' : `${rawPct}% · ${status.label}`}</span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.06)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: status.color,
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── METAS POR EQUIPE (SDRs vs Closers) ── */}
      {!isAllVenues && selectedVenue && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
            Metas por equipe — {selectedVenue.name}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {(['sdr', 'closer'] as const).map(role => (
              <TeamGoalCard
                key={`${selectedVenue.id}-${role}-${teamGoals.find(t => t.role === role)?.id || 'new'}`}
                role={role}
                goal={teamGoals.find(t => t.role === role && t.period === 'monthly') || emptyTeamGoal(role)}
                progress={teamProgress[role]}
                onSave={handleSaveTeamGoal}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── METAS INDIVIDUAIS (SDRs e Closers) ── */}
      {(() => {
        const people = collaborators.filter(c => c.active && (c.role === 'sdr' || c.role === 'closer')
          && (isAllVenues || !selectedVenue || !c.venueId || c.venueId === 'all' || c.venueId === selectedVenue.id
            || (c.venueIds || []).includes(selectedVenue.id)));
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Metas individuais{selectedVenue && !isAllVenues ? ` — ${selectedVenue.name}` : ''}
              </h3>
              {people.length > 0 && (
                <select
                  value="" aria-label="Nova meta individual"
                  onChange={e => { const c = people.find(p => p.id === e.target.value); if (c) setCollabForGoals(c); }}
                  style={{
                    padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--adm-border)',
                    background: 'var(--adm-bg-input)', color: 'var(--adm-text-title)', fontSize: '0.78rem', fontWeight: 700,
                  }}
                >
                  <option value="">+ Nova meta individual...</option>
                  {people.map(c => <option key={c.id} value={c.id}>{c.name} ({c.role === 'closer' ? 'Closer' : 'SDR'})</option>)}
                </select>
              )}
            </div>
            {(() => {
              const individualRevenue = people.reduce((sum, c) => sum + (c.goals?.cycle === 'weekly' ? 0 : c.goals?.revenueTarget || 0), 0);
              if (individualRevenue <= 0) return null;
              const unitRevenue = !isAllVenues && selectedVenue ? goals.revenueTarget || 0 : 0;
              const cover = unitRevenue > 0 ? Math.round((individualRevenue / unitRevenue) * 100) : null;
              return (
                <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  Soma das metas individuais de faturamento (ciclo mensal):{' '}
                  <strong style={{ color: 'var(--adm-text-title)' }}>
                    {individualRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </strong>
                  {cover !== null && <> · {cover}% da meta de faturamento da unidade</>}
                </div>
              );
            })()}
            {people.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Nenhum SDR ou Closer ativo no escopo.</div>
            ) : (
              <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '4px 16px' }}>
                {people.map(c => {
                  const g = c.goals;
                  const parts: string[] = [];
                  if (g?.revenueTarget) parts.push(`${g.revenueTarget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} faturamento`);
                  if (g?.closingsTarget) parts.push(`${g.closingsTarget} contratos`);
                  if (g?.leadsTarget) parts.push(`${g.leadsTarget} leads/agendamentos`);
                  if (g?.responseTimeTargetMinutes) parts.push(`resposta em ${g.responseTimeTargetMinutes} min`);
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0',
                      borderBottom: '1px solid var(--adm-border)', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{c.role === 'closer' ? 'Closer' : 'SDR'}</div>
                      </div>
                      <div style={{ flex: '2 1 240px', fontSize: '0.76rem', color: parts.length ? 'var(--adm-text-title)' : 'var(--adm-text-muted)' }}>
                        {parts.length ? `${g?.cycle === 'weekly' ? 'Semanal' : 'Mensal'}: ${parts.join(' · ')}` : 'Sem meta definida'}
                      </div>
                      <button
                        type="button" onClick={() => setCollabForGoals(c)}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', background: 'transparent', cursor: 'pointer',
                          border: '1px solid var(--adm-border)', color: 'var(--adm-text-title)', fontSize: '0.74rem', fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                        }}
                      >
                        <Edit3 size={12} /> {parts.length ? 'Editar meta' : 'Definir meta'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {collabForGoals && (
        <AdminCollaboratorGoalsModal collaborator={collabForGoals} onClose={() => setCollabForGoals(null)} />
      )}

      {/* ── MODAL: CONFIGURAR META ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
        }}>
          <div style={{
            background: '#141118',
            border: '1.5px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="var(--adm-accent)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                  Definir Meta da Casa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9E988D', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Goal Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Tipo de Meta
                </label>
                <select
                  value={modalGoalType}
                  onChange={(e) => handleOpenAddModal(e.target.value as GoalType)}
                  className="adm-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
                >
                  <option value="sales">Meta de Contratos Fechados</option>
                  <option value="revenue">Meta de Faturamento (R$)</option>
                  <option value="leads">Meta de Captação de Leads</option>
                  <option value="visits">Meta de Agendamentos (Visitas & Degustações)</option>
                </select>
              </div>

              {/* Target Value */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Valor Alvo {modalGoalType === 'revenue' ? '(em R$)' : '(Quantidade)'} *
                </label>
                <input
                  type="number"
                  min="1"
                  value={modalTargetValue}
                  onChange={(e) => setModalTargetValue(Number(e.target.value))}
                  className="adm-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.86rem', fontWeight: 800 }}
                  required
                />
              </div>

              {/* Deadline Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Data Limite / Fim do Período *
                </label>
                <input
                  type="date"
                  value={modalDeadlineDate}
                  onChange={(e) => setModalDeadlineDate(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
                  required
                />
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="adm-btn-secondary"
                  style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="adm-btn-primary"
                  style={{ padding: '10px 22px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 900, opacity: isSaving ? 0.7 : 1 }}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
