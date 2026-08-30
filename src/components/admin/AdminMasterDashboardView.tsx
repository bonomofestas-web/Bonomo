import React, { useState, useMemo } from 'react';
import { 
  Crown, ArrowUpRight, ArrowDownRight,
  DollarSign, Award, Users,
  Activity, MessageSquare, Compass
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminFilterBar, type FilterState } from './AdminFilterBar';
import { getCollaboratorTimeLogs } from '../../hooks/useActiveTimeTracker';

export const AdminMasterDashboardView: React.FC = () => {
  const { 
    leads, 
    collaborators, 
    activeVenueId,
  } = useAdminState();

  const [filterState, setFilterState] = useState<FilterState>({
    period: '7d',
    venueId: 'all',
    collaboratorId: 'all',
  });

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

    const baseMatches = (l: typeof leads[0]) => {
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
  }, [leads, activeVenueId, filterState]);

  // Core KPIs Current Period
  const totalLeads = scopedLeads.length;
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

  // Estimativa de mensagens enviadas
  const estimatedMessagesSent = useMemo(() => {
    return scopedLeads.reduce((acc, l) => acc + ((l as any).activityHistory?.length || 3), 0);
  }, [scopedLeads]);

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
        counts['Indicação no App'] += 1;
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      maxWidth: '1440px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxSizing: 'border-box',
    }}>
      
      {/* ── Header: Master Title ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
            border: '1.5px solid var(--adm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
            boxShadow: '0 0 16px rgba(212, 175, 55, 0.2)',
          }}>
            <Crown size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: 'var(--adm-text-title)',
                letterSpacing: '-0.4px',
                margin: 0,
              }}>
                Dashboard Master • Auditoria & Gestão Executiva
              </h1>
              <span style={{
                background: 'rgba(212,175,55,0.2)',
                color: 'var(--adm-accent)',
                fontSize: '0.66rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(212,175,55,0.4)',
                textTransform: 'uppercase',
              }}>
                Acesso Exclusivo Master
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Métricas consolidadas, auditoria de tempo ativo da equipe, mensagens e comparativos históricos
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTROS TEMPORAIS INTELIGENTES COM COMPARATIVO AUTOMÁTICO ───── */}
      <AdminFilterBar
        filters={filterState}
        onChange={setFilterState}
        resultCount={scopedLeads.length}
        totalCount={leads.length}
        labelUnit="leads"
      />

      {/* ── 4 CARDS EXECUTIVOS COM COMPARATIVO TEMPORAL ANTERIOR ────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '18px',
      }}>
        
        {/* Card 1: Leads Entrados */}
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                Leads Captados
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                <Users size={16} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                {totalLeads}
              </span>
              {renderTrendPill(leadsDelta)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Período anterior: <strong style={{ color: 'var(--adm-text-title)' }}>{prevTotalLeads} leads</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Faturamento Total */}
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                Faturamento Fechado
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                <DollarSign size={16} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                R$ {totalRevenue.toLocaleString('pt-BR')}
              </span>
              {renderTrendPill(revenueDelta)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Período anterior: <strong style={{ color: 'var(--adm-text-title)' }}>R$ {prevRevenue.toLocaleString('pt-BR')}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Vendas & Conversão */}
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                Contratos Fechados
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--adm-accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-accent)' }}>
                <Award size={16} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                {totalSalesCount}
              </span>
              {renderTrendPill(salesDelta)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Taxa de Conversão: <strong style={{ color: '#10B981' }}>{conversionRate}%</strong> (Ticket: R$ {avgTicket.toLocaleString('pt-BR')})
            </div>
          </div>
        </div>

        {/* Card 4: Mensagens Enviadas & Tempo de Resposta */}
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                Atendimentos & Mensagens
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                <MessageSquare size={16} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10B981' }}>
                {estimatedMessagesSent}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>mensagens</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Tempo Médio de Resposta: <strong style={{ color: '#10B981' }}>12 min</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN GRID: ORIGENS DE LEADS & TEMPO ONLINE DA EQUIPE ──────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '20px',
      }}>
        
        {/* Coluna 1: Origens de Leads & Canais de Aquisição */}
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="var(--adm-accent)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Origens de Leads & Eficiência de Canais
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
              {totalLeads} oportunidades
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leadSourcesData.map((src, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: src.color }} />
                    <span style={{ fontWeight: 600, color: 'var(--adm-text-body)' }}>{src.name}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {src.count} leads ({src.pct}%)
                  </span>
                </div>
                <div style={{ height: '7px', background: 'var(--adm-bg-input)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${src.pct}%`, height: '100%', background: src.color, borderRadius: '6px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Tempo Ativo Real dos Colaboradores (com Detecção de Foco de Aba) */}
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#10B981" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Auditoria de Tempo Ativo da Equipe
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 800, background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '12px' }}>
              Aba Ativa / Focada
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--adm-border)' }}
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
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      {collab.name}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                      {collab.role} • {collab.isOnline ? '🟢 Online agora' : '⚪ Ausente'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--adm-accent)' }}>
                    {collab.formattedTime}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                    Tempo focado hoje
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
