import React, { useState, useMemo } from 'react';
import { 
  MoreHorizontal, ArrowUpRight, ArrowDownRight, Target,
  DollarSign, Award, Users, Clock,
  Activity, Compass
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminFilterBar, type FilterState } from './AdminFilterBar';
import { AdminVenueGoalsModal } from './AdminVenueGoalsModal';
import { getCollaboratorTimeLogs } from '../../hooks/useActiveTimeTracker';
import type { AdminTabType } from './AdminSidebar';
import type { Venue, VenueGoals } from '../../types/admin';

interface AdminDashboardViewProps {
  onNavigateTab?: (tab: AdminTabType) => void;
  onOpenNewDebutanteModal?: () => void;
  onOpenNewVenueModal?: () => void;
  onOpenLead?: (leadId: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateTab,
}) => {
  const { 
    venues, 
    debutantes, 
    leads, 
    collaborators, 
    currentUser, 
    activeVenueId,
  } = useAdminState();
  
  const [selectedVenueForGoals, setSelectedVenueForGoals] = useState<Venue | null>(null);
  
  // High-performance filter state — defaults to 7 days
  const [filterState, setFilterState] = useState<FilterState>({
    period: '7d',
    venueId: 'all',
    collaboratorId: 'all',
  });

  const userRole = currentUser?.role || 'master';
  const isSdr = userRole === 'sdr';
  const isCloser = userRole === 'closer';
  const isHouseAdmin = userRole === 'admin';

  const activeVenueObj = useMemo(() => {
    return venues.find(v => v.id === activeVenueId) || null;
  }, [venues, activeVenueId]);

  // Lead filtering logic with comparison period calculations
  const { scopedLeads, previousPeriodLeads } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0];

    // Filter leads by user role & venue & collab
    const baseMatches = (l: typeof leads[0]) => {
      if (userRole === 'sdr' && currentUser?.id) {
        if (l.sdrId !== currentUser.id && l.assignedTo !== currentUser.name) return false;
      }
      if (userRole === 'closer' && currentUser?.id) {
        if (l.closerId !== currentUser.id) return false;
      }
      if (isHouseAdmin && currentUser?.venueIds?.[0]) {
        if (l.venueId !== currentUser.venueIds[0]) return false;
      }

      const selectedVenues = filterState.venueIds && filterState.venueIds.length > 0
        ? filterState.venueIds
        : (filterState.venueId !== 'all' && filterState.venueId !== 'multi' ? [filterState.venueId] : (activeVenueId ? [activeVenueId] : []));
      if (selectedVenues.length > 0 && !selectedVenues.includes(l.venueId)) return false;

      const selectedCollabs = filterState.collaboratorIds && filterState.collaboratorIds.length > 0
        ? filterState.collaboratorIds
        : (filterState.collaboratorId !== 'all' && filterState.collaboratorId !== 'multi' ? [filterState.collaboratorId] : []);
      if (selectedCollabs.length > 0) {
        const matches = selectedCollabs.includes(l.sdrId || '') || 
          selectedCollabs.includes(l.closerId || '') || 
          (l.participants || []).some(p => selectedCollabs.includes(p.collaboratorId));
        if (!matches) return false;
      }
      return true;
    };

    const current: typeof leads = [];
    const previous: typeof leads = [];

    leads.forEach(l => {
      if (!baseMatches(l)) return;

      const leadDate = new Date(l.createdAt || Date.now());
      const leadDateStr = (l.createdAt || '').split('T')[0];
      const diffDays = Math.ceil((today.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));

      if (filterState.period === 'today') {
        if (leadDateStr === todayStr) current.push(l);
        else if (leadDateStr === yesterdayStr) previous.push(l);
      } else if (filterState.period === 'yesterday') {
        if (leadDateStr === yesterdayStr) current.push(l);
        else if (leadDateStr === dayBeforeYesterdayStr) previous.push(l);
      } else if (filterState.period === '7d') {
        if (diffDays >= 0 && diffDays <= 7) current.push(l);
        else if (diffDays > 7 && diffDays <= 14) previous.push(l);
      } else if (filterState.period === '30d') {
        if (diffDays >= 0 && diffDays <= 30) current.push(l);
        else if (diffDays > 30 && diffDays <= 60) previous.push(l);
      } else if (filterState.period === 'this_month') {
        if (leadDate.getMonth() === today.getMonth() && leadDate.getFullYear() === today.getFullYear()) current.push(l);
        else {
          const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
          const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
          if (leadDate.getMonth() === prevMonth && leadDate.getFullYear() === prevYear) previous.push(l);
        }
      } else if (filterState.period === '6m') {
        if (diffDays >= 0 && diffDays <= 180) current.push(l);
        else if (diffDays > 180 && diffDays <= 360) previous.push(l);
      } else if (filterState.period === 'custom' && filterState.customStartDate && filterState.customEndDate) {
        if (leadDateStr >= filterState.customStartDate && leadDateStr <= filterState.customEndDate) current.push(l);
      } else {
        current.push(l);
      }
    });

    return { scopedLeads: current, previousPeriodLeads: previous };
  }, [leads, userRole, currentUser, isHouseAdmin, activeVenueId, filterState]);

  const scopedDebutantes = useMemo(() => {
    return debutantes.filter(d => {
      if (isHouseAdmin && currentUser?.venueIds?.[0]) {
        if (d.venueId !== currentUser.venueIds[0]) return false;
      }
      const selectedVenues = filterState.venueIds && filterState.venueIds.length > 0
        ? filterState.venueIds
        : (filterState.venueId !== 'all' && filterState.venueId !== 'multi' ? [filterState.venueId] : (activeVenueId ? [activeVenueId] : []));
      if (selectedVenues.length > 0 && !selectedVenues.includes(d.venueId)) return false;
      return true;
    });
  }, [debutantes, isHouseAdmin, currentUser, filterState.venueId, filterState.venueIds, activeVenueId]);

  // Core KPIs Current Period
  const totalLeads = scopedLeads.length;
  const meetingLeads = scopedLeads.filter(l => l.stage === 'meeting_scheduled');
  const soldLeads = scopedLeads.filter(l => l.stage === 'contract_signed');
  const totalSalesCount = soldLeads.length;
  const totalRevenue = soldLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((totalSalesCount / totalLeads) * 100) : 0;
  const avgTicket = totalSalesCount > 0 ? Math.round(totalRevenue / totalSalesCount) : 0;

  // Previous Period Comparisons for Trends
  const prevTotalLeads = previousPeriodLeads.length;
  const prevSoldLeads = previousPeriodLeads.filter(l => l.stage === 'contract_signed');
  const prevSalesCount = prevSoldLeads.length;
  const prevRevenue = prevSoldLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

  const calculateDeltaPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const leadsDelta = calculateDeltaPct(totalLeads, prevTotalLeads);
  const revenueDelta = calculateDeltaPct(totalRevenue, prevRevenue);
  const salesDelta = calculateDeltaPct(totalSalesCount, prevSalesCount);

  // Venue Breakdown for Donut Chart
  const venueBreakdown = venues.map((v, i) => {
    const venueSales = soldLeads.filter(l => l.venueId === v.id);
    const rev = venueSales.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
    const colors = ['#06B6D4', '#EC4899', '#F59E0B', '#8B5CF6', '#10B981'];
    return {
      name: v.name,
      revenue: rev,
      color: colors[i % colors.length],
    };
  });

  // Effective Venue Goals (From active venue or average across venues)
  const currentGoals: VenueGoals = useMemo(() => {
    if (activeVenueObj?.goals) return activeVenueObj.goals;
    if (venues.length > 0 && venues[0].goals) return venues[0].goals;
    return {
      revenueTarget: 150000,
      salesTarget: 12,
      leadsTarget: 60,
      responseTimeTargetMinutes: 15,
      period: 'monthly',
    };
  }, [activeVenueObj, venues]);

  // Lead Sources Distribution
  const leadSourcesData = useMemo(() => {
    const counts: Record<string, number> = {
      'Indicação no App': 0,
      'Tráfego Pago (Ads)': 0,
      'Instagram / Social': 0,
      'WhatsApp Direto': 0,
      'Parcerias & Cerimonial': 0,
    };

    scopedLeads.forEach(l => {
      if (l.debutanteId && l.debutanteId !== 'manual') {
        counts['Indicação no App'] += 1;
      } else if (l.source === 'trafego_pago') {
        counts['Tráfego Pago (Ads)'] += 1;
      } else if (l.source === 'instagram') {
        counts['Instagram / Social'] += 1;
      } else if (l.source === 'whatsapp') {
        counts['WhatsApp Direto'] += 1;
      } else if (l.source === 'parceria') {
        counts['Parcerias & Cerimonial'] += 1;
      } else {
        counts['Indicação no App'] += 1; // Default
      }
    });

    const total = totalLeads || 1;
    return Object.entries(counts).map(([name, count], index) => {
      const colors = ['#10B981', '#3B82F6', '#EC4899', '#22C55E', '#D4AF37'];
      return {
        name,
        count,
        pct: Math.round((count / total) * 100),
        color: colors[index % colors.length],
      };
    }).sort((a, b) => b.count - a.count);
  }, [scopedLeads, totalLeads]);

  // Active Time Spent by Collaborators (From useActiveTimeTracker storage)
  const collaboratorTimeRankings = useMemo(() => {
    const timeLogs = getCollaboratorTimeLogs();
    const todayStr = new Date().toISOString().split('T')[0];

    return collaborators
      .filter(c => c.active)
      .map(c => {
        // Find logs for today or sum up
        const logKey = `${c.id}_${todayStr}`;
        const log = timeLogs[logKey];
        const activeSeconds = log?.activeSeconds || 0;
        const isOnline = Date.now() - (log?.lastActiveTimestamp || 0) < 60000;

        const hours = Math.floor(activeSeconds / 3600);
        const minutes = Math.floor((activeSeconds % 3600) / 60);

        return {
          id: c.id,
          name: c.name,
          role: c.role,
          avatarUrl: c.avatarUrl,
          activeSeconds,
          formattedTime: `${hours}h ${minutes}m`,
          isOnline,
        };
      })
      .sort((a, b) => b.activeSeconds - a.activeSeconds);
  }, [collaborators]);

  // SDR Rankings (Only performers with meetings > 0)
  const sdrRankings = useMemo(() => {
    return collaborators
      .filter(c => c.active && (c.role === 'sdr' || c.role === 'crm' || c.role === 'admin' || c.role === 'master'))
      .map(sdr => {
        const sdrLeads = scopedLeads.filter(l => l.sdrId === sdr.id || l.assignedTo === sdr.name);
        const meetings = sdrLeads.filter(l => l.stage === 'meeting_scheduled' || l.stage === 'contract_signed').length;
        const sales = sdrLeads.filter(l => l.stage === 'contract_signed').length;
        const vName = venues.find(v => v.id === sdr.venueId)?.name || 'Rede Geral';
        return {
          id: sdr.id,
          name: sdr.name,
          avatarUrl: sdr.avatarUrl,
          role: sdr.role,
          venueName: vName,
          totalLeads: sdrLeads.length,
          meetingsScheduled: meetings,
          salesCount: sales,
        };
      })
      .filter(sdr => sdr.meetingsScheduled > 0)
      .sort((a, b) => b.meetingsScheduled - a.meetingsScheduled || b.totalLeads - a.totalLeads)
      .slice(0, 5);
  }, [collaborators, scopedLeads, venues]);

  // Closer Rankings (Only performers with revenue or sales > 0)
  const closerRankings = useMemo(() => {
    return collaborators
      .filter(c => c.active && (c.role === 'closer' || c.role === 'crm' || c.role === 'admin' || c.role === 'master'))
      .map(closer => {
        const closerSales = scopedLeads.filter(l => (l.closerId === closer.id || l.assignedTo === closer.name) && l.stage === 'contract_signed');
        const rev = closerSales.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
        const vName = venues.find(v => v.id === closer.venueId)?.name || 'Rede Geral';
        return {
          id: closer.id,
          name: closer.name,
          avatarUrl: closer.avatarUrl,
          role: closer.role,
          venueName: vName,
          salesCount: closerSales.length,
          revenue: rev,
          avgTicket: closerSales.length > 0 ? Math.round(rev / closerSales.length) : 0,
        };
      })
      .filter(closer => closer.revenue > 0 || closer.salesCount > 0)
      .sort((a, b) => b.revenue - a.revenue || b.salesCount - a.salesCount)
      .slice(0, 5);
  }, [collaborators, scopedLeads, venues]);

  const sdrPodium = {
    first: sdrRankings[0] || null,
    second: sdrRankings[1] || null,
    third: sdrRankings[2] || null,
  };

  const closerPodium = {
    first: closerRankings[0] || null,
    second: closerRankings[1] || null,
    third: closerRankings[2] || null,
  };

  const renderTrendPill = (delta: number) => {
    if (delta > 0) {
      return (
        <span className="trend-pill-up">
          <ArrowUpRight size={12} />
          <span>+{delta}%</span>
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.68rem',
          fontWeight: 800,
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#EF4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <ArrowDownRight size={12} />
          <span>{delta}%</span>
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.68rem',
        fontWeight: 700,
        background: 'var(--adm-bg-input)',
        color: 'var(--adm-text-muted)',
      }}>
        0%
      </span>
    );
  };

  return (
    <div className="admin-dashboard-container" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      maxWidth: '1440px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Poppins', sans-serif",
      boxSizing: 'border-box',
    }}>
      
      {/* ── Dashboard Title & Navigation Header ────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              letterSpacing: '-0.4px',
              margin: '0 0 4px 0',
            }}>
              {isCloser 
                ? `Dashboard do Closer • ${currentUser?.name}`
                : isSdr 
                ? `Dashboard do SDR • ${currentUser?.name}`
                : 'Painel Comercial & Performance'}
            </h1>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>
            {activeVenueObj ? (
              <span style={{ color: 'var(--adm-accent)', fontWeight: 700 }}>
                Unidade: {activeVenueObj.name}
              </span>
            ) : (
              <span>Visão Operacional da Equipe • Faturamento, Vendas e Pódios</span>
            )}
          </div>
        </div>

        {/* Action Button: Go to Venue Goals */}
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('venue-goals') : setSelectedVenueForGoals(activeVenueObj || venues[0] || null)}
          className="adm-btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '0.78rem',
            fontWeight: 800,
            borderColor: 'var(--adm-accent)',
            color: 'var(--adm-accent)',
          }}
        >
          <Target size={15} />
          <span>Ver Metas da Casa</span>
        </button>
      </div>

      {/* ── DASHBOARD FILTERS TOOLBAR COM COMPARATIVO AUTOMÁTICO ── */}
      <AdminFilterBar
        filters={filterState}
        onChange={setFilterState}
        resultCount={scopedLeads.length}
        totalCount={leads.length}
        labelUnit="leads"
      />

      {/* ── SEÇÃO DE METAS ESTRATÉGICAS DA CASA ATIVA ─────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(212, 175, 55, 0.06) 100%)',
        border: '1.5px solid var(--adm-border)',
        borderRadius: '20px',
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--adm-accent-bg)',
              border: '1px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <Target size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Metas da Casa • {activeVenueObj?.name || 'Rede Geral'}
              </h3>
              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                Ciclo Mensal • Progresso em tempo real
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedVenueForGoals(activeVenueObj || venues[0] || null)}
            style={{
              background: 'transparent',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              padding: '5px 10px',
              color: 'var(--adm-accent)',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Ajustar Objetivos
          </button>
        </div>

        {/* 4 Cards de Metas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}>
          {/* Meta 1: Faturamento */}
          {(() => {
            const pct = Math.min(100, Math.round((totalRevenue / (currentGoals.revenueTarget || 1)) * 100));
            return (
              <div style={{ background: 'var(--adm-bg-input)', borderRadius: '14px', padding: '14px', border: '1px solid var(--adm-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>Faturamento</span>
                  <DollarSign size={15} color="#10B981" />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                  R$ {totalRevenue.toLocaleString('pt-BR')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '4px', marginBottom: '8px' }}>
                  <span>Meta: R$ {currentGoals.revenueTarget.toLocaleString('pt-BR')}</span>
                  <span style={{ fontWeight: 800, color: pct >= 100 ? '#10B981' : 'var(--adm-accent)' }}>{pct}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--adm-bg-card)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#10B981', borderRadius: '6px' }} />
                </div>
              </div>
            );
          })()}

          {/* Meta 2: Vendas Fechadas */}
          {(() => {
            const pct = Math.min(100, Math.round((totalSalesCount / (currentGoals.salesTarget || 1)) * 100));
            return (
              <div style={{ background: 'var(--adm-bg-input)', borderRadius: '14px', padding: '14px', border: '1px solid var(--adm-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>Contratos Fechados</span>
                  <Award size={15} color="var(--adm-accent)" />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                  {totalSalesCount} <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>vendas</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '4px', marginBottom: '8px' }}>
                  <span>Meta: {currentGoals.salesTarget} contratos</span>
                  <span style={{ fontWeight: 800, color: pct >= 100 ? '#10B981' : 'var(--adm-accent)' }}>{pct}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--adm-bg-card)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--adm-accent)', borderRadius: '6px' }} />
                </div>
              </div>
            );
          })()}

          {/* Meta 3: Leads no Funil */}
          {(() => {
            const pct = Math.min(100, Math.round((totalLeads / (currentGoals.leadsTarget || 1)) * 100));
            return (
              <div style={{ background: 'var(--adm-bg-input)', borderRadius: '14px', padding: '14px', border: '1px solid var(--adm-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>Leads & Captação</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {renderTrendPill(leadsDelta)}
                    <Users size={15} color="#3B82F6" />
                  </div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                  {totalLeads} <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>leads ({scopedDebutantes.length} aniversariantes)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '4px', marginBottom: '8px' }}>
                  <span>Meta: {currentGoals.leadsTarget} leads ({meetingLeads.length} reuniões)</span>
                  <span style={{ fontWeight: 800, color: pct >= 100 ? '#10B981' : '#3B82F6' }}>{pct}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--adm-bg-card)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#3B82F6', borderRadius: '6px' }} />
                </div>
              </div>
            );
          })()}

          {/* Meta 4: Tempo de Resposta (TMA) */}
          <div style={{ background: 'var(--adm-bg-input)', borderRadius: '14px', padding: '14px', border: '1px solid var(--adm-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>Tempo de Resposta (TMA)</span>
              <Clock size={15} color="#F59E0B" />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10B981' }}>
              12 min <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>médio</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '4px', marginBottom: '8px' }}>
              <span>Meta máx: {currentGoals.responseTimeTargetMinutes} min</span>
              <span style={{ fontWeight: 800, color: '#10B981' }}>Excelente</span>
            </div>
            <div style={{ height: '6px', background: 'var(--adm-bg-card)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: '80%', height: '100%', background: '#10B981', borderRadius: '6px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP ROW: 3 CARDS (Donut, Activity Bars, Sales Spline) ───────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '18px',
      }}>
        
        {/* Card 1: Faturamento & Donut Breakdown */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.5px' }}>
                  R$ {totalRevenue.toLocaleString('pt-BR')}
                </span>
                {renderTrendPill(revenueDelta)}
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '16px' }}>
              Faturamento em Contratos vs Período Anterior
            </div>
          </div>

          {/* Donut Chart with Category Legends */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="var(--adm-bg-input)"
                  strokeWidth="3.8"
                />
                {totalRevenue > 0 && (() => {
                  let acc = 0;
                  return venueBreakdown.filter(v => v.revenue > 0).map((item, i) => {
                    const pct = (item.revenue / totalRevenue) * 100;
                    const offset = -acc;
                    acc += pct;
                    return (
                      <path
                        key={i}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="4"
                        strokeDasharray={`${pct}, 100`}
                        strokeDashoffset={`${offset}`}
                        strokeLinecap="round"
                      />
                    );
                  });
                })()}
              </svg>
              {totalRevenue === 0 && (
                <div style={{ position: 'absolute', fontSize: '0.62rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                  R$ 0
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
              {venues.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                  Nenhuma casa cadastrada
                </div>
              ) : (
                venueBreakdown.slice(0, 3).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name.replace('Espaço ', '').replace(' Ballroom', '')}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--adm-text-title)', paddingLeft: '8px' }}>
                      {item.revenue > 0 ? `R$ ${item.revenue.toLocaleString('pt-BR')}` : '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Ticket Médio & Activity Vertical Bars */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.5px' }}>
                  {avgTicket > 0 ? `R$ ${avgTicket.toLocaleString('pt-BR')}` : 'R$ 0'}
                </span>
                {avgTicket > 0 && renderTrendPill(salesDelta)}
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Ticket Médio por Contrato
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', height: '80px', marginTop: '16px' }}>
            {totalSalesCount > 0 ? (
              [35, 55, 40, 85, 60, 95, 45, 75, 50, 90].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: i === 5 || i === 9 ? 'var(--adm-accent)' : '#06B6D4',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    opacity: 0.85,
                  }}
                  title={`Atividade dia ${i + 1}`}
                />
              ))
            ) : (
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '14px',
                    background: 'var(--adm-bg-input)',
                    border: '1px dashed var(--adm-border)',
                    borderRadius: '4px',
                    opacity: 0.7,
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Card 3: Vendas do Período */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Vendas & Contratos
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginBottom: '10px' }}>
              Fechamentos por todos os consultores
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                {totalSalesCount} <span style={{ fontSize: '0.9rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>vendas</span>
              </span>
              {renderTrendPill(salesDelta)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              {totalSalesCount > 0 ? `Taxa de conversão: ${conversionRate}%` : 'Nenhuma venda registrada ainda'}
            </div>
          </div>

          <div style={{ position: 'relative', marginTop: '12px' }}>
            <svg viewBox="0 0 280 65" style={{ width: '100%', height: '65px', overflow: 'visible' }}>
              {totalSalesCount > 0 ? (
                <>
                  <defs>
                    <linearGradient id="splineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 50 L 35 40 L 70 40 L 105 20 L 140 20 L 175 48 L 210 42 L 245 42 L 280 25 L 280 65 L 0 65 Z"
                    fill="url(#splineGradient)"
                  />
                  <path
                    d="M 0 50 L 35 40 L 70 40 L 105 20 L 140 20 L 175 48 L 210 42 L 245 42 L 280 25"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <line x1="0" y1="45" x2="280" y2="45" stroke="var(--adm-border)" strokeWidth="1.5" strokeDasharray="5 5" />
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* ── MIDDLE ROW: ORIGENS DE LEADS & TEMPO ONLINE DOS COLABORADORES ─────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px',
      }}>
        
        {/* Card: Origens de Leads / Canais de Aquisição */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="var(--adm-accent)" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Origens de Leads & Aquisição
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
              {totalLeads} oportunidades
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leadSourcesData.map((src, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: src.color }} />
                    <span style={{ fontWeight: 600, color: 'var(--adm-text-body)' }}>{src.name}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {src.count} ({src.pct}%)
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--adm-bg-input)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${src.pct}%`, height: '100%', background: src.color, borderRadius: '6px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Tempo Ativo dos Colaboradores no App (com Detecção de Foco) */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#10B981" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Tempo Ativo da Equipe no App
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 800, background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '12px' }}>
              Aba Focada
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {collaboratorTimeRankings.map(collab => (
              <div
                key={collab.id}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={collab.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                      alt={collab.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: collab.isOnline ? '#10B981' : '#64748B',
                      border: '2px solid var(--adm-bg-input)',
                    }} />
                  </div>

                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      {collab.name}
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                      {collab.role} • {collab.isOnline ? 'Online agora' : 'Ausente'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--adm-accent)' }}>
                    {collab.formattedTime}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>
                    Tempo trabalhado hoje
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: 2 PODIUMS & RANKINGS (SDRs on Left, Closers on Right) ────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '20px',
      }}>
        
        {/* ── 1. PÓDIO & RANKING DE SDRs (QUALIFICAÇÃO & REUNIÕES) ── */}
        <div className="saas-card" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          background: 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎯 Pódio de SDRs (Reuniões & Degustações)</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
                Campeões em agendamento de reuniões e qualificação
              </p>
            </div>
            <span style={{
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#8B5CF6',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.68rem',
              fontWeight: 800,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              SDRs Top Performers
            </span>
          </div>

          {/* 3D Podium Display SDRs */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '14px',
            padding: '16px 8px 6px 8px',
            minHeight: '180px',
          }}>
            {/* 2º Lugar SDR */}
            <div style={{ flex: '0 1 140px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {sdrPodium.second ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={sdrPodium.second.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={sdrPodium.second.name}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #94A3B8' }}
                    />
                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#94A3B8', color: '#000', fontSize: '0.66rem', fontWeight: 900, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2º</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {sdrPodium.second.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#8B5CF6', fontWeight: 800 }}>
                    {sdrPodium.second.meetingsScheduled} reuniões
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              <div style={{ width: '100%', height: '54px', background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.3) 0%, rgba(148, 163, 184, 0.08) 100%)', borderTop: '2px solid #94A3B8', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#94A3B8', fontSize: '1.1rem', marginTop: '6px' }}>2</div>
            </div>

            {/* 1º Lugar SDR (Centro) */}
            <div style={{ flex: '0 1 150px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {sdrPodium.first ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={sdrPodium.first.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={sdrPodium.first.name}
                      style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #D4AF37' }}
                    />
                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#D4AF37', color: '#000', fontSize: '0.72rem', fontWeight: 900, width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1º</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                    {sdrPodium.first.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#D4AF37', fontWeight: 900 }}>
                    {sdrPodium.first.meetingsScheduled} reuniões
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              <div style={{ width: '100%', height: '80px', background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.4) 0%, rgba(212, 175, 55, 0.1) 100%)', borderTop: '3px solid #D4AF37', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#D4AF37', fontSize: '1.4rem', marginTop: '6px' }}>1</div>
            </div>

            {/* 3º Lugar SDR */}
            <div style={{ flex: '0 1 140px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {sdrPodium.third ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={sdrPodium.third.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={sdrPodium.third.name}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #CD7F32' }}
                    />
                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#CD7F32', color: '#FFF', fontSize: '0.64rem', fontWeight: 900, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3º</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {sdrPodium.third.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#8B5CF6', fontWeight: 800 }}>
                    {sdrPodium.third.meetingsScheduled} reuniões
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              <div style={{ width: '100%', height: '36px', background: 'linear-gradient(180deg, rgba(205, 127, 50, 0.3) 0%, rgba(205, 127, 50, 0.08) 100%)', borderTop: '2px solid #CD7F32', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#CD7F32', fontSize: '0.95rem', marginTop: '6px' }}>3</div>
            </div>
          </div>
        </div>

        {/* ── 2. PÓDIO & RANKING DE CLOSERS (RECEITA & VENDAS) ── */}
        <div className="saas-card" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          background: 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏆 Pódio de Closers (Faturamento & Vendas)</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
                Campeões em conversão e receita fechada
              </p>
            </div>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.68rem',
              fontWeight: 800,
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              Closers Top Performers
            </span>
          </div>

          {/* 3D Podium Display Closers */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '14px',
            padding: '16px 8px 6px 8px',
            minHeight: '180px',
          }}>
            {/* 2º Lugar Closer */}
            <div style={{ flex: '0 1 140px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {closerPodium.second ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={closerPodium.second.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={closerPodium.second.name}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #94A3B8' }}
                    />
                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#94A3B8', color: '#000', fontSize: '0.66rem', fontWeight: 900, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2º</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {closerPodium.second.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 800 }}>
                    R$ {closerPodium.second.revenue.toLocaleString('pt-BR')}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              <div style={{ width: '100%', height: '54px', background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.3) 0%, rgba(148, 163, 184, 0.08) 100%)', borderTop: '2px solid #94A3B8', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#94A3B8', fontSize: '1.1rem', marginTop: '6px' }}>2</div>
            </div>

            {/* 1º Lugar Closer (Centro) */}
            <div style={{ flex: '0 1 150px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {closerPodium.first ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={closerPodium.first.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={closerPodium.first.name}
                      style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #D4AF37' }}
                    />
                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#D4AF37', color: '#000', fontSize: '0.72rem', fontWeight: 900, width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1º</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                    {closerPodium.first.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#D4AF37', fontWeight: 900 }}>
                    R$ {closerPodium.first.revenue.toLocaleString('pt-BR')} ({closerPodium.first.salesCount} vendas)
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              <div style={{ width: '100%', height: '80px', background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.4) 0%, rgba(212, 175, 55, 0.1) 100%)', borderTop: '3px solid #D4AF37', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#D4AF37', fontSize: '1.4rem', marginTop: '6px' }}>1</div>
            </div>

            {/* 3º Lugar Closer */}
            <div style={{ flex: '0 1 140px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {closerPodium.third ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={closerPodium.third.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={closerPodium.third.name}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #CD7F32' }}
                    />
                    <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#CD7F32', color: '#FFF', fontSize: '0.64rem', fontWeight: 900, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3º</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {closerPodium.third.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 800 }}>
                    R$ {closerPodium.third.revenue.toLocaleString('pt-BR')}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              <div style={{ width: '100%', height: '36px', background: 'linear-gradient(180deg, rgba(205, 127, 50, 0.3) 0%, rgba(205, 127, 50, 0.08) 100%)', borderTop: '2px solid #CD7F32', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#CD7F32', fontSize: '0.95rem', marginTop: '6px' }}>3</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Metas da Casa de Festa */}
      <AdminVenueGoalsModal
        isOpen={!!selectedVenueForGoals}
        onClose={() => setSelectedVenueForGoals(null)}
        venue={selectedVenueForGoals}
      />

      <style>{`
        @media (max-width: 900px) {
          .admin-dashboard-container {
            padding: 16px 12px 60px 12px !important;
            gap: 16px !important;
          }
          .saas-card {
            padding: 16px !important;
            border-radius: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
