import { EntryCashCard } from './dashboard/EntryCashCard';
import { ClosingPipelineCard } from './dashboard/ClosingPipelineCard';
import { Select } from '../ui';
import React, { useState } from 'react';
import { Award, Building2, CalendarCheck, Clock, Percent, Timer } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
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
  DeepKpiRow, LeadJourneyPanel, PipelinePanel, LossReasons, LeadHeatmap, SourceEfficiencyTable, VenueComparison,
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
  const { venues, currentUser } = useAdminState();
  const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const [venueScope, setVenueScope] = useState<string>('all');
  const data = useCommercialDashboardData(period, venueScope);
  const { kpis, resolved } = data;

  const iconProps = { size: 15 } as const;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 28px 60px', width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Titulo fica no cabecalho do portal; aqui so os filtros (periodo e comparacao a esquerda, unidade a direita) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <DashboardPeriodSelector value={period} resolved={resolved} onChange={setPeriod} />
        {venues.length > 1 && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={15} color="var(--adm-text-muted)" />
            <Select
              className="adm-input"
              value={venueScope}
              onChange={e => setVenueScope(e.target.value)}
              aria-label="Filtrar por unidade"
              style={{ height: '34px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, padding: '0 10px', minWidth: '180px' }}
            >
              <option value="all">Todas as unidades</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </label>
        )}
      </div>

      {period.compareMode === 'baseline' && data.baselineMissing && !data.loading && (
        <div style={{
          fontSize: '0.76rem', color: 'var(--adm-text-muted)', padding: '8px 12px', borderRadius: '10px',
          border: '1px dashed var(--adm-border)',
        }}>
          Sem base cadastrada para {venueScope === 'all' ? 'as unidades' : 'esta unidade'}. Preencha em Casas de Festa, seção Métricas base, para comparar.
        </div>
      )}

      {data.loading ? (
        <>
          <SkeletonBlock height={170} />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={320} />
        </>
      ) : (
        <>
          {/* 1. Faturamento fechado vs meta */}
          <PacingThermometer
            pacing={data.pacing}
            revenuePct={kpis.revenue.pct}
            comparedLabel={resolved.comparedLabel}
            onConfigureGoals={onNavigateTab ? () => onNavigateTab('venue-goals') : undefined}
            venueRows={data.venueRows}
          />

          {/* 1b. Entrada em caixa no periodo (logo abaixo do faturamento) */}
          <EntryCashCard revenue={data.kpis.revenue} entry={data.entry} comparedLabel={resolved.comparedLabel} />

          {/* 1c. Vendido ainda em fechamento (contrato nao aprovado pelo financeiro) */}
          <ClosingPipelineCard masterId={currentUser?.masterId || currentUser?.id || ''} venueIds={venueScope !== 'all' ? [venueScope] : venues.map(v => v.id)} />

          {/* 2. Alertas (so icone + texto curto) */}
          <AlertsPanel data={data} />

          {/* 3. Podios */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            <ClosersPodium closers={data.closers} />
            <SdrsPodium sdrs={data.sdrs} />
          </div>

          {/* 4. KPIs principais: contratos fechados ... taxa de perda */}
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
              detail={data.targets.closings !== null ? <>Meta: <strong>{Math.round(data.targets.closings * 10) / 10}</strong></> : undefined}
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
                  {data.targets.appointments !== null && <>{' · '}Meta <strong>{Math.round(data.targets.appointments * 10) / 10}</strong></>}
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
            <KpiCard
              label="Tempo médio de resposta"
              icon={<Timer {...iconProps} />}
              value={formatMinutes(kpis.avgResponse.current)}
              valueColor={responseColor(kpis.avgResponse.current, kpis.avgResponse.target)}
              pct={kpis.avgResponse.pct}
              hasCurrent={kpis.avgResponse.current !== null}
              lowerIsBetter
              previousLabel={formatMinutes(kpis.avgResponse.previous)}
              detail={kpis.avgResponse.target
                ? <>Meta: <strong>{formatMinutes(kpis.avgResponse.target)}</strong></>
                : 'Qualquer mensagem, só comercial'}
            />
          </div>

          <DeepKpiRow deep={data.deep} targets={data.targets} />

          <LeadJourneyPanel journey={data.journey} targets={data.targets} />

          {/* 5. Esteira de metas da equipe e radar */}
          <GoalTrack rows={data.collaborators} expectedPct={data.pacing.expectedPct} />

          <CollaboratorRadar rows={data.collaborators} loadingPresence={data.loadingPresence} truncated={data.presenceTruncated} />

          {/* 6. Funil, evolucao e origens */}
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
