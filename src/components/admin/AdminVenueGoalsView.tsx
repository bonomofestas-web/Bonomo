import React, { useState, useMemo } from 'react';
import { 
  Target, DollarSign, Award, Users, Clock, 
  Plus, Calendar, CheckCircle2,
  TrendingUp, Edit3, X
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { VenueGoals } from '../../types/admin';

interface GoalCardConfig {
  id: string;
  type: 'sales' | 'revenue' | 'leads' | 'visits' | 'qualifications';
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

export const AdminVenueGoalsView: React.FC = () => {
  const { venues, activeVenueId, leads, updateVenue } = useAdminState();

  const isAllVenues = !activeVenueId || activeVenueId === 'all' || activeVenueId === 'multi';

  const selectedVenue = useMemo(() => {
    return venues.find(v => v.id === activeVenueId) || venues[0] || null;
  }, [venues, activeVenueId]);

  // Modal State for Adding/Editing a Goal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalGoalType, setModalGoalType] = useState<'sales' | 'revenue' | 'leads' | 'visits'>('sales');
  const [modalTargetValue, setModalTargetValue] = useState<number>(15);
  const [modalDeadlineDate, setModalDeadlineDate] = useState<string>(() => {
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    return endOfMonth.toISOString().split('T')[0];
  });

  // Current Goals Config for the venue
  const goals: VenueGoals = useMemo(() => {
    if (selectedVenue?.goals) return selectedVenue.goals;
    return {
      revenueTarget: 150000,
      salesTarget: 12,
      leadsTarget: 60,
      responseTimeTargetMinutes: 15,
      period: 'monthly',
      deadlineDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    };
  }, [selectedVenue]);

  // Scoped metrics
  const scopedLeads = useMemo(() => {
    if (isAllVenues) return leads;
    return leads.filter(l => l.venueId === selectedVenue?.id);
  }, [leads, isAllVenues, selectedVenue]);

  const soldLeads = useMemo(() => {
    return scopedLeads.filter(l => l.stage === 'contract_signed');
  }, [scopedLeads]);

  const totalRevenue = useMemo(() => {
    return soldLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  }, [soldLeads]);

  const totalSalesCount = soldLeads.length;
  const totalLeadsCount = scopedLeads.length;
  const meetingLeadsCount = scopedLeads.filter(l => l.stage === 'meeting_scheduled').length;
  const qualifiedIcpCount = scopedLeads.filter(l => (l.mqlScore ?? 0) >= 50 || l.mqlLevel === 'top' || l.mqlLevel === 'qualified').length;

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
        targetValue: goals.salesTarget || 12,
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
        targetValue: goals.revenueTarget || 150000,
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
        targetValue: goals.leadsTarget || 60,
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
        targetValue: Math.round((goals.salesTarget || 12) * 1.8),
        unit: 'visitas',
        deadline: goals.deadlineDate,
      },
      {
        id: 'goal_qualifications',
        type: 'qualifications',
        title: 'Meta de Leads Qualificados (ICP A e B)',
        subtitle: 'Leads com alta e média probabilidade identificados pelo SDR',
        icon: <CheckCircle2 size={22} />,
        iconColor: '#EC4899',
        iconBg: 'rgba(236, 72, 153, 0.15)',
        currentValue: qualifiedIcpCount,
        targetValue: Math.round((goals.leadsTarget || 60) * 0.4),
        unit: 'leads ICP',
        deadline: goals.deadlineDate,
      },
    ];
  }, [totalSalesCount, totalRevenue, totalLeadsCount, meetingLeadsCount, qualifiedIcpCount, goals]);

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

  const handleOpenAddModal = (type?: 'sales' | 'revenue' | 'leads' | 'visits') => {
    if (type) {
      setModalGoalType(type);
      if (type === 'sales') setModalTargetValue(goals.salesTarget || 15);
      if (type === 'revenue') setModalTargetValue(goals.revenueTarget || 180000);
      if (type === 'leads') setModalTargetValue(goals.leadsTarget || 80);
      if (type === 'visits') setModalTargetValue(25);
    }
    setIsModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;

    const currentGoals = selectedVenue.goals || goals;
    const updatedGoals: VenueGoals = {
      ...currentGoals,
      deadlineDate: modalDeadlineDate,
      period: 'monthly',
    };

    if (modalGoalType === 'sales') updatedGoals.salesTarget = Number(modalTargetValue);
    if (modalGoalType === 'revenue') updatedGoals.revenueTarget = Number(modalTargetValue);
    if (modalGoalType === 'leads') updatedGoals.leadsTarget = Number(modalTargetValue);

    updateVenue(selectedVenue.id, {
      goals: updatedGoals,
    });

    setIsModalOpen(false);
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
      
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37',
            flexShrink: 0,
          }}>
            <Target size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
              Metas Comerciais • {isAllVenues ? 'Todas as Casas' : selectedVenue?.name}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '4px' }}>
              Acompanhe o progresso em tempo real das metas de fechamento, faturamento, captação e visitas.
            </p>
          </div>
        </div>

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
      </div>

      {/* ── STACKED GOALS CARDS (Cards Empilhados um acima do outro) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {goalCards.map((g) => {
          const pct = Math.min(100, Math.round((g.currentValue / (g.targetValue || 1)) * 100));
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
                  background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : pct >= 50 ? 'rgba(212, 175, 55, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: isCompleted ? '#10B981' : pct >= 50 ? '#D4AF37' : '#60A5FA',
                  border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : pct >= 50 ? 'rgba(212, 175, 55, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <TrendingUp size={15} />
                  <span>{pct}% Atingido</span>
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
                  width: `${Math.max(pct, 3)}%`,
                  height: '100%',
                  background: isCompleted
                    ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                    : pct >= 50
                    ? 'linear-gradient(90deg, #D4AF37 0%, #F59E0B 100%)'
                    : 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

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
                  onChange={(e) => setModalGoalType(e.target.value as any)}
                  className="adm-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
                >
                  <option value="sales">Meta de Contratos Fechados</option>
                  <option value="revenue">Meta de Faturamento (R$)</option>
                  <option value="leads">Meta de Captação de Leads</option>
                  <option value="visits">Meta de Visitas & Degustações</option>
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
                  className="adm-btn-primary"
                  style={{ padding: '10px 22px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 900 }}
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
