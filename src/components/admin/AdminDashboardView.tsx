import React, { useState, useMemo } from 'react';
import { 
  MoreHorizontal, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminFilterBar, type FilterState } from './AdminFilterBar';
import type { AdminTabType } from './AdminSidebar';

interface AdminDashboardViewProps {
  onNavigateTab?: (tab: AdminTabType) => void;
  onOpenNewDebutanteModal?: () => void;
  onOpenNewVenueModal?: () => void;
  onOpenLead?: (leadId: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = () => {
  const { 
    venues, 
    debutantes, 
    leads, 
    collaborators, 
    currentUser, 
    activeVenueId
  } = useAdminState();
  
  // High-performance filter state — defaults to 7 days (last week)
  const [filterState, setFilterState] = useState<FilterState>({
    period: '7d',
    venueId: 'all',
    collaboratorId: 'all',
  });

  const userRole = currentUser?.role || 'master';
  const isSdr = userRole === 'sdr' || userRole === 'closer';
  const isCloser = userRole === 'closer';
  const isHouseAdmin = userRole === 'admin';

  // Role, Venue, Collaborator and Temporal based lead filtering
  const scopedLeads = useMemo(() => {
    return leads.filter(l => {
      // 1. Role Filter
      if (userRole === 'sdr' && currentUser?.id) {
        if (l.sdrId !== currentUser.id && l.assignedTo !== currentUser.name) return false;
      }
      if (userRole === 'closer' && currentUser?.id) {
        if (l.closerId !== currentUser.id) return false;
      }
      if (isHouseAdmin && currentUser?.venueIds?.[0]) {
        if (l.venueId !== currentUser.venueIds[0]) return false;
      }

      // 2. Venue Filter (Multi-select support)
      const selectedVenues = filterState.venueIds && filterState.venueIds.length > 0
        ? filterState.venueIds
        : (filterState.venueId !== 'all' && filterState.venueId !== 'multi' ? [filterState.venueId] : (activeVenueId ? [activeVenueId] : []));
      if (selectedVenues.length > 0 && !selectedVenues.includes(l.venueId)) return false;

      // 3. Collaborator Filter (Multi-select support)
      const selectedCollabs = filterState.collaboratorIds && filterState.collaboratorIds.length > 0
        ? filterState.collaboratorIds
        : (filterState.collaboratorId !== 'all' && filterState.collaboratorId !== 'multi' ? [filterState.collaboratorId] : []);
      if (selectedCollabs.length > 0) {
        const matches = selectedCollabs.includes(l.sdrId || '') || 
          selectedCollabs.includes(l.closerId || '') || 
          (l.participants || []).some(p => selectedCollabs.includes(p.collaboratorId));
        if (!matches) return false;
      }

      // 4. Temporal Filter (including custom range)
      if (filterState.period !== 'all') {
        const leadDate = new Date(l.createdAt || Date.now());
        const today = new Date();
        const diffDays = Math.ceil((today.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
        const todayStr = today.toISOString().split('T')[0];

        if (filterState.period === 'today' && (l.createdAt || '').split('T')[0] !== todayStr) return false;
        if (filterState.period === '7d' && (diffDays < 0 || diffDays > 7)) return false;
        if (filterState.period === '30d' && (diffDays < 0 || diffDays > 30)) return false;
        if (filterState.period === 'this_month') {
          if (leadDate.getMonth() !== today.getMonth() || leadDate.getFullYear() !== today.getFullYear()) return false;
        }
        if (filterState.period === 'custom' && filterState.customStartDate && filterState.customEndDate) {
          const leadDateStr = (l.createdAt || '').split('T')[0];
          if (leadDateStr < filterState.customStartDate || leadDateStr > filterState.customEndDate) return false;
        }
      }

      return true;
    });
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

  // Core KPIs
  const totalLeads = scopedLeads.length;
  const meetingLeads = scopedLeads.filter(l => l.stage === 'meeting_scheduled');
  const soldLeads = scopedLeads.filter(l => l.stage === 'contract_signed');
  const totalSalesCount = soldLeads.length;

  const totalRevenue = soldLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((totalSalesCount / totalLeads) * 100) : 0;
  const avgTicket = totalSalesCount > 0 ? Math.round(totalRevenue / totalSalesCount) : 0;

  // Category breakdown for Donut Chart (by Venue or Package)
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

  // ── 1. Ranking de SDRs (Top 5 ordenado por reuniões e atendimentos) ──
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
          conversionRate: sdrLeads.length > 0 ? Math.round((meetings / sdrLeads.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.meetingsScheduled - a.meetingsScheduled || b.totalLeads - a.totalLeads)
      .slice(0, 5);
  }, [collaborators, scopedLeads, venues]);

  // ── 2. Ranking de Closers (Top 5 ordenado por faturamento R$ e vendas) ──
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
      .sort((a, b) => b.revenue - a.revenue || b.salesCount - a.salesCount)
      .slice(0, 5);
  }, [collaborators, scopedLeads, venues]);

  // ── 3. Pódio SDRs (Top 3 Campeões de Reuniões) ──
  const sdrPodium = useMemo(() => {
    return {
      first: sdrRankings[0] || null,
      second: sdrRankings[1] || null,
      third: sdrRankings[2] || null,
    };
  }, [sdrRankings]);

  // ── 4. Pódio Closers (Top 3 Campeões de Vendas) ──
  const closerPodium = useMemo(() => {
    return {
      first: closerRankings[0] || null,
      second: closerRankings[1] || null,
      third: closerRankings[2] || null,
    };
  }, [closerRankings]);

  // Top Performers ("Today's Heroes")
  const topHeroes = collaborators.filter(c => c.active).slice(0, 4);

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
      
      {/* ── Dashboard Title & Breadcrumbs Header ────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
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
          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>
            Home • <span style={{ color: 'var(--adm-text-body)' }}>Dashboard Executivo</span>
          </div>
        </div>
      </div>

      {/* ── DASHBOARD FILTERS TOOLBAR ── */}
      <AdminFilterBar
        filters={filterState}
        onChange={setFilterState}
        resultCount={scopedLeads.length}
        totalCount={leads.length}
        labelUnit="leads"
      />

      {/* ── TOP ROW: 3 CARDS (Donut, Activity Bars, Sales Spline) ───────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '18px',
      }}>
        
        {/* Card 1: Faturamento & Donut Breakdown (from Reference: Expected Earnings) */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.5px' }}>
                  R$ {totalRevenue.toLocaleString('pt-BR')}
                </span>
                {totalRevenue > 0 && (
                  <span className="trend-pill-up">
                    <ArrowUpRight size={12} />
                    <span>2.2%</span>
                  </span>
                )}
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '16px' }}>
              Faturamento em Contratos
            </div>
          </div>

          {/* Donut Chart with Category Legends */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            {/* SVG Donut Circle */}
            <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="var(--adm-bg-input)"
                  strokeWidth="3.8"
                />
                {/* Dynamic Segments when revenue > 0 */}
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

            {/* Category Breakdown Legends */}
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

        {/* Card 2: Ticket Médio & Activity Vertical Bars (from Reference: Average Daily Sales) */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.5px' }}>
                  {avgTicket > 0 ? `R$ ${avgTicket.toLocaleString('pt-BR')}` : 'R$ 0'}
                </span>
                {avgTicket > 0 && (
                  <span className="trend-pill-up">
                    <ArrowUpRight size={12} />
                    <span>2.6%</span>
                  </span>
                )}
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Ticket Médio por Contrato
            </div>
          </div>

          {/* Activity Vertical Bars */}
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'scaleY(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.85';
                    e.currentTarget.style.transform = 'scaleY(1)';
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
                  title="Aguardando novos contratos"
                />
              ))
            )}
          </div>
        </div>

        {/* Card 3: Vendas do Mês com Gráfico Spline (from Reference: Sales this months) */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Vendas neste Mês
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
              {totalSalesCount > 0 && (
                <span className="trend-pill-up">
                  <ArrowUpRight size={12} />
                  <span>4.6%</span>
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              {totalSalesCount > 0 ? `Taxa de conversão: ${conversionRate}%` : 'Nenhuma venda registrada ainda'}
            </div>
          </div>

          {/* Sleek Line Chart */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
              <span>04 Ago</span>
              <span>07 Ago</span>
              <span>10 Ago</span>
              <span>13 Ago</span>
              <span>16 Ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE ROW: LEADS META, TEAM HEROES, CONVERSION EVOLUTION ──────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '18px',
      }}>
        
        {/* Card 4: Leads do Mês & Progress Bar (from Reference: Orders this Month / 62%) */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.5px' }}>
                  {totalLeads}
                </span>
                {totalLeads > 0 && (
                  <span className="trend-pill-down">
                    <ArrowDownRight size={12} />
                    <span>2.2%</span>
                  </span>
                )}
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Leads & Indicações no Funil
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '8px' }}>
              <span>{Math.max(0, 30 - totalLeads)} para a Meta</span>
              <span style={{ color: '#10B981' }}>{Math.min(100, Math.round((totalLeads / 30) * 100))}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--adm-bg-input)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, (totalLeads / 30) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #06B6D4 0%, #10B981 100%)',
                borderRadius: '10px',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Card 5: Novos Contatos & Destaques da Equipe (from Reference: Today's Heroes) */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.5px' }}>
                {scopedDebutantes.length}
              </span>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Aniversariantes Ativas
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 700, marginBottom: '8px' }}>
              Destaques da Equipe Comercial
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {topHeroes.map((collab, index) => (
                <img
                  key={collab.id}
                  src={collab.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={collab.name}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    border: '2px solid var(--adm-bg-card)',
                    marginLeft: index === 0 ? 0 : '-10px',
                    objectFit: 'cover',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                  title={`${collab.name} (${collab.role.toUpperCase()})`}
                />
              ))}
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--adm-bg-elevated)',
                border: '2px solid var(--adm-bg-card)',
                marginLeft: '-10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--adm-text-muted)',
              }}>
                +{Math.max(0, collaborators.length - 4)}
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Desempenho & Evolução Comercial (from Reference: Discounted Product Sales) */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Reuniões & Propostas
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginBottom: '10px' }}>
              Conversão de reuniões em fechamentos
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                {meetingLeads.length} <span style={{ fontSize: '0.9rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>reuniões</span>
              </span>
              {meetingLeads.length > 0 && (
                <span className="trend-pill-up">
                  <ArrowUpRight size={12} />
                  <span>2.8%</span>
                </span>
              )}
            </div>
          </div>

          {/* Cyan Spline Line Chart */}
          <div style={{ position: 'relative', marginTop: '12px' }}>
            <svg viewBox="0 0 280 65" style={{ width: '100%', height: '65px', overflow: 'visible' }}>
              {meetingLeads.length > 0 ? (
                <>
                  <defs>
                    <linearGradient id="cyanSplineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 45 L 35 55 L 70 30 L 105 30 L 140 45 L 175 45 L 210 20 L 245 40 L 280 35 L 280 65 L 0 65 Z"
                    fill="url(#cyanSplineGradient)"
                  />
                  <path
                    d="M 0 45 L 35 55 L 70 30 L 105 30 L 140 45 L 175 45 L 210 20 L 245 40 L 280 35"
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <line x1="0" y1="45" x2="280" y2="45" stroke="var(--adm-border)" strokeWidth="1.5" strokeDasharray="5 5" />
              )}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
              <span>04 Ago</span>
              <span>07 Ago</span>
              <span>10 Ago</span>
              <span>13 Ago</span>
              <span>16 Ago</span>
            </div>
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
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎯 Pódio de SDRs (Reuniões & Degustações)</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
                Campeões em agendamento de reuniões e qualificação de indicações
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
            {/* 2º Lugar SDR (Esquerda) */}
            <div style={{
              flex: '0 1 140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              {sdrPodium.second ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={sdrPodium.second.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={sdrPodium.second.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #94A3B8',
                        boxShadow: '0 0 14px rgba(148, 163, 184, 0.4)',
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '-4px', right: '-4px',
                      background: '#94A3B8', color: '#000', fontSize: '0.66rem', fontWeight: 900,
                      width: '18px', height: '18px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      2º
                    </span>
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
              {/* Podium Base 2 */}
              <div style={{
                width: '100%', height: '52px',
                background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.25) 0%, rgba(148, 163, 184, 0.05) 100%)',
                border: '1px solid rgba(148, 163, 184, 0.4)',
                borderRadius: '10px 10px 0 0', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 900, color: '#94A3B8',
              }}>
                🥈 2º
              </div>
            </div>

            {/* 1º Lugar SDR (Centro) */}
            <div style={{
              flex: '0 1 160px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              transform: 'translateY(-10px)',
            }}>
              {sdrPodium.first ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '1.2rem' }}>
                      👑
                    </div>
                    <img
                      src={sdrPodium.first.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'}
                      alt={sdrPodium.first.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #8B5CF6',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.45)',
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '-4px', right: '-4px',
                      background: '#8B5CF6', color: '#FFF', fontSize: '0.72rem', fontWeight: 900,
                      width: '22px', height: '22px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      1º
                    </span>
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#8B5CF6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                    {sdrPodium.first.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 800 }}>
                    {sdrPodium.first.meetingsScheduled} reuniões
                  </div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--adm-green)', fontWeight: 700 }}>
                    {sdrPodium.first.conversionRate}% conv.
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>Nenhum SDR</div>
              )}
              {/* Podium Base 1 */}
              <div style={{
                width: '100%', height: '74px',
                background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid #8B5CF6',
                borderRadius: '12px 12px 0 0', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 900, color: '#8B5CF6',
                boxShadow: '0 0 16px rgba(139, 92, 246, 0.2)',
              }}>
                🥇 1º
              </div>
            </div>

            {/* 3º Lugar SDR (Direita) */}
            <div style={{
              flex: '0 1 140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              {sdrPodium.third ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={sdrPodium.third.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={sdrPodium.third.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #B45309',
                        boxShadow: '0 0 14px rgba(180, 83, 9, 0.3)',
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '-4px', right: '-4px',
                      background: '#B45309', color: '#FFF', fontSize: '0.66rem', fontWeight: 900,
                      width: '18px', height: '18px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      3º
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {sdrPodium.third.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#8B5CF6', fontWeight: 800 }}>
                    {sdrPodium.third.meetingsScheduled} reuniões
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              {/* Podium Base 3 */}
              <div style={{
                width: '100%', height: '40px',
                background: 'linear-gradient(180deg, rgba(180, 83, 9, 0.25) 0%, rgba(180, 83, 9, 0.05) 100%)',
                border: '1px solid rgba(180, 83, 9, 0.4)',
                borderRadius: '10px 10px 0 0', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.95rem', fontWeight: 900, color: '#B45309',
              }}>
                🥉 3º
              </div>
            </div>
          </div>

          {/* Ranking de SDRs Completo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--adm-border)', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Classificação Geral dos SDRs
            </div>
            {sdrRankings.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
                Nenhum SDR com atividades registradas.
              </div>
            ) : (
              sdrRankings.map((sdr, index) => {
                const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                return (
                  <div
                    key={sdr.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'var(--adm-bg-input)',
                      border: `1px solid ${index === 0 ? 'rgba(139,92,246,0.4)' : 'var(--adm-border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, width: '22px', textAlign: 'center' }}>
                        {medalEmoji}
                      </span>
                      <img
                        src={sdr.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={sdr.name}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {sdr.name}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                          {sdr.venueName} • {sdr.totalLeads} leads
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#8B5CF6' }}>
                        {sdr.meetingsScheduled} reuniões
                      </div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--adm-green)', fontWeight: 700 }}>
                        {sdr.conversionRate}% conversão
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 2. PÓDIO & RANKING DE CLOSERS (VENDAS & FATURAMENTO) ── */}
        <div className="saas-card" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          background: 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(212, 175, 55, 0.05) 100%)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏆 Pódio de Closers (Vendas & Faturamento)</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
                Campeões em fechamento de contratos VIP e volume financeiro (R$)
              </p>
            </div>
            <span style={{
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.68rem',
              fontWeight: 800,
              border: '1px solid var(--adm-accent)',
            }}>
              Closers Top Vendas
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
            {/* 2º Lugar Closer (Esquerda) */}
            <div style={{
              flex: '0 1 140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              {closerPodium.second ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={closerPodium.second.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={closerPodium.second.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #94A3B8',
                        boxShadow: '0 0 14px rgba(148, 163, 184, 0.4)',
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '-4px', right: '-4px',
                      background: '#94A3B8', color: '#000', fontSize: '0.66rem', fontWeight: 900,
                      width: '18px', height: '18px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      2º
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {closerPodium.second.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-green)', fontWeight: 800 }}>
                    R$ {closerPodium.second.revenue.toLocaleString('pt-BR')}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              {/* Podium Base 2 */}
              <div style={{
                width: '100%', height: '52px',
                background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.25) 0%, rgba(148, 163, 184, 0.05) 100%)',
                border: '1px solid rgba(148, 163, 184, 0.4)',
                borderRadius: '10px 10px 0 0', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 900, color: '#94A3B8',
              }}>
                🥈 2º
              </div>
            </div>

            {/* 1º Lugar Closer (Centro) */}
            <div style={{
              flex: '0 1 160px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              transform: 'translateY(-10px)',
            }}>
              {closerPodium.first ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '1.2rem' }}>
                      👑
                    </div>
                    <img
                      src={closerPodium.first.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'}
                      alt={closerPodium.first.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid var(--adm-accent)',
                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.45)',
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '-4px', right: '-4px',
                      background: 'var(--adm-accent)', color: '#000', fontSize: '0.72rem', fontWeight: 900,
                      width: '22px', height: '22px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      1º
                    </span>
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                    {closerPodium.first.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-green)', fontWeight: 800 }}>
                    R$ {closerPodium.first.revenue.toLocaleString('pt-BR')}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                    {closerPodium.first.salesCount} contratos VIP
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>Nenhum Closer</div>
              )}
              {/* Podium Base 1 */}
              <div style={{
                width: '100%', height: '74px',
                background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.35) 0%, rgba(212, 175, 55, 0.08) 100%)',
                border: '1px solid var(--adm-accent)',
                borderRadius: '12px 12px 0 0', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-accent)',
                boxShadow: '0 0 16px rgba(212, 175, 55, 0.2)',
              }}>
                🥇 1º
              </div>
            </div>

            {/* 3º Lugar Closer (Direita) */}
            <div style={{
              flex: '0 1 140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              {closerPodium.third ? (
                <>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <img
                      src={closerPodium.third.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={closerPodium.third.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #B45309',
                        boxShadow: '0 0 14px rgba(180, 83, 9, 0.3)',
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '-4px', right: '-4px',
                      background: '#B45309', color: '#FFF', fontSize: '0.66rem', fontWeight: 900,
                      width: '18px', height: '18px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      3º
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {closerPodium.third.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-green)', fontWeight: 800 }}>
                    R$ {closerPodium.third.revenue.toLocaleString('pt-BR')}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem' }}>—</div>
              )}
              {/* Podium Base 3 */}
              <div style={{
                width: '100%', height: '40px',
                background: 'linear-gradient(180deg, rgba(180, 83, 9, 0.25) 0%, rgba(180, 83, 9, 0.05) 100%)',
                border: '1px solid rgba(180, 83, 9, 0.4)',
                borderRadius: '10px 10px 0 0', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.95rem', fontWeight: 900, color: '#B45309',
              }}>
                🥉 3º
              </div>
            </div>
          </div>

          {/* Ranking de Closers Completo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--adm-border)', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Classificação Geral dos Closers
            </div>
            {closerRankings.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
                Nenhum closer com vendas registradas.
              </div>
            ) : (
              closerRankings.map((closer, index) => {
                const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                return (
                  <div
                    key={closer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'var(--adm-bg-input)',
                      border: `1px solid ${index === 0 ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, width: '22px', textAlign: 'center' }}>
                        {medalEmoji}
                      </span>
                      <img
                        src={closer.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'}
                        alt={closer.name}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {closer.name}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                          {closer.venueName} • {closer.salesCount} vendas
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-green)' }}>
                        R$ {closer.revenue.toLocaleString('pt-BR')}
                      </div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                        Ticket Médio: R$ {closer.avgTicket.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

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
