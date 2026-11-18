import React, { useState } from 'react';
import { Award, CalendarCheck, Clock, Percent } from 'lucide-react';
import { useCommercialDashboardData } from '../../hooks/useCommercialDashboardData';
import { DEFAULT_PERIOD, type PeriodSelection } from '../../utils/dashboardPeriod';
import { DashboardPeriodSelector } from './dashboard/DashboardPeriodSelector';
import { KpiCard, formatMinutes } from './dashboard/DashboardKpi';
import { PacingThermometer } from './dashboard/PacingThermometer';
import { FunnelStrip } from './dashboard/FunnelStrip';
import { EvolutionChart } from './dashboard/EvolutionChart';
import { TopSources } from './dashboard/TopSources';
import { ClosersPodium, SdrsPodium } from './dashboard/TeamPodiums';
import { CollaboratorRadar } from './dashboard/CollaboratorRadar';
import { GoalTrack } from './dashboard/GoalTrack';
import { AlertsPanel } from './dashboard/AlertsPanel';
import { AppointmentsChart } from './dashboard/AppointmentsChart';
import {
  DeepKpiRow, PipelinePanel, LossReasons, LeadHeatmap, SourceEfficiencyTable, VenueComparison,
} from './dashboard/DeepInsights';
import type { AdminTabType } from './AdminSidebar';

interface AdminDashboardViewProps {
  onNavigateTab?: (tab: AdminTabType) => void;
}

const SkeletonBlock: React.FC<{ height: number }> = ({ height }) => (
  <div className="animate-pulse" style={{
    height, borderRadius: '14px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)',
  }} />
);

const responseColor = (current: number | null, target: number | null): string | undefined => {
  if (current === null || !target) return undefined;
  if (current <= target) return '#10B981';
  if (current <= target * 1.5) return '#F59E0B';
  return '#EF4444';
};

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigateTab }) => {
  const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const data = useCommercialDashboardData(period);
  const { kpis, resolved } = data;

  const iconProps = { size: 15 } as const;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 28px 60px', width: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
          Dashboard Comercial
        </h2>
        <DashboardPeriodSelector value={period} resolved={resolved} onChange={setPeriod} />
      </div>

      {data.loading ? (
        <>
          <SkeletonBlock height={170} />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={320} />
        </>
      ) : (
        <>
          <AlertsPanel data={data} />

          {/* Foco no time: podios, esteira de metas e radar da equipe logo no topo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            <ClosersPodium closers={data.closers} />
            <SdrsPodium sdrs={data.sdrs} />
          </div>

          <GoalTrack rows={data.collaborators} expectedPct={data.pacing.expectedPct} />

          <CollaboratorRadar rows={data.collaborators} loadingPresence={data.loadingPresence} truncated={data.presenceTruncated} />

          {/* Faixa 1 — Termometro de meta e ritmo + KPIs */}
          <PacingThermometer
            pacing={data.pacing}
            revenuePct={kpis.revenue.pct}
            comparedLabel={resolved.comparedLabel}
            onConfigureGoals={onNavigateTab ? () => onNavigateTab('venue-goals') : undefined}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <KpiCard
              label="Contratos fechados"
              icon={<Award {...iconProps} />}
              value={kpis.closings.current.toLocaleString('pt-BR')}
              pct={kpis.closings.pct}
              hasCurrent={kpis.closings.current > 0}
              previousLabel={String(kpis.closings.previous)}
              spark={data.evolution.map(e => e.closings)}
              sparkColor="#D4AF37"
            />
            <KpiCard
              label="Agendamentos realizados"
              icon={<CalendarCheck {...iconProps} />}
              value={kpis.appointments.current.toLocaleString('pt-BR')}
              pct={kpis.appointments.pct}
              hasCurrent={kpis.appointments.current > 0}
              previousLabel={String(kpis.appointments.previous)}
              spark={data.evolution.map(e => e.visits + e.tastings)}
              sparkColor="#14A9D7"
              detail={
                <>
                  Visita comercial <strong>{kpis.visits.current}</strong>
                  {' · '}Degustação <strong>{kpis.tastings.current}</strong>
                </>
              }
            />
            <KpiCard
              label="Conversão lead → contrato"
              icon={<Percent {...iconProps} />}
              value={`${(Math.round(kpis.conversion.current * 10) / 10).toLocaleString('pt-BR')}%`}
              pct={kpis.conversion.pct}
              hasCurrent={kpis.conversion.current > 0}
              previousLabel={`${(Math.round(kpis.conversion.previous * 10) / 10).toLocaleString('pt-BR')}%`}
            />
            <KpiCard
              label="Tempo médio 1ª resposta"
              icon={<Clock {...iconProps} />}
              value={formatMinutes(kpis.response.current)}
              valueColor={responseColor(kpis.response.current, kpis.response.target)}
              pct={kpis.response.pct}
              hasCurrent={kpis.response.current !== null}
              lowerIsBetter
              previousLabel={formatMinutes(kpis.response.previous)}
              detail={kpis.response.target ? <>Meta: <strong>{formatMinutes(kpis.response.target)}</strong></> : 'Sem meta de tempo definida'}
            />
          </div>

          <DeepKpiRow deep={data.deep} />

          {/* Faixa 2 — Funil, evolucao e origens */}
          <FunnelStrip steps={data.funnel} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            <EvolutionChart data={data.evolution} currentLabel={resolved.currentLabel} comparedLabel={resolved.comparedLabel} />
            <TopSources sources={data.sources} />
          </div>

          <AppointmentsChart data={data.evolution} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            <PipelinePanel pipeline={data.pipeline} />
            <LossReasons reasons={data.lossReasons} total={data.lostCount} />
            <LeadHeatmap matrix={data.heatmap} />
          </div>

          <SourceEfficiencyTable rows={data.sourceEfficiency} />
          <VenueComparison rows={data.venueRows} />

        </>
      )}
    </div>
  );
};
