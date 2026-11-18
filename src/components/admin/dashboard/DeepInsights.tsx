import React from 'react';
import { CalendarCheck, Hourglass, Receipt, TrendingDown, Users } from 'lucide-react';
import { DeltaBadge, EmptyHint, KpiCard, Panel, SectionTitle, formatBRL } from './DashboardKpi';
import { sourceLabel } from './TopSources';
import { pctDelta } from '../../../utils/dashboardPeriod';
import type { CommercialDashboardData } from '../../../hooks/useCommercialDashboardData';

const pct1 = (v: number) => `${(Math.round(v * 10) / 10).toLocaleString('pt-BR')}%`;
const days1 = (v: number | null) => (v === null ? '—' : `${(Math.round(v * 10) / 10).toLocaleString('pt-BR')} dias`);

const th: React.CSSProperties = {
  textAlign: 'left', padding: '8px 10px', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--adm-text-muted)', borderBottom: '1px solid var(--adm-border)', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '9px 10px', fontSize: '0.78rem', color: 'var(--adm-text-title)', borderBottom: '1px solid var(--adm-border)',
  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
};

/* Linha secundaria de KPIs: volume, ticket, ciclo, comparecimento e perda */
export const DeepKpiRow: React.FC<{ deep: CommercialDashboardData['deep'] }> = ({ deep }) => {
  const iconProps = { size: 15 } as const;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <KpiCard
        label="Leads captados" icon={<Users {...iconProps} />}
        value={deep.leads.current.toLocaleString('pt-BR')} pct={deep.leads.pct}
        hasCurrent={deep.leads.current > 0} previousLabel={String(deep.leads.previous)}
      />
      <KpiCard
        label="Ticket médio" icon={<Receipt {...iconProps} />}
        value={formatBRL(deep.avgTicket.current)} pct={deep.avgTicket.pct}
        hasCurrent={deep.avgTicket.current > 0} previousLabel={formatBRL(deep.avgTicket.previous)}
      />
      <KpiCard
        label="Ciclo de venda" icon={<Hourglass {...iconProps} />}
        value={days1(deep.salesCycleDays.current)} pct={deep.salesCycleDays.pct}
        hasCurrent={deep.salesCycleDays.current !== null} lowerIsBetter
        previousLabel={days1(deep.salesCycleDays.previous)}
        detail="Da criação do lead ao fechamento"
      />
      <KpiCard
        label="Taxa de comparecimento" icon={<CalendarCheck {...iconProps} />}
        value={deep.showRate.current === null ? '—' : pct1(deep.showRate.current)} pct={deep.showRate.pct}
        hasCurrent={deep.showRate.current !== null}
        previousLabel={deep.showRate.previous === null ? undefined : pct1(deep.showRate.previous)}
        detail={`${deep.showRate.sample} agendamentos finalizados (realizados, faltas e cancelados)`}
      />
      <KpiCard
        label="Taxa de perda" icon={<TrendingDown {...iconProps} />}
        value={pct1(deep.lossRate.current)} pct={deep.lossRate.pct} lowerIsBetter
        hasCurrent={deep.lossRate.current > 0} previousLabel={pct1(deep.lossRate.previous)}
        detail="Leads criados no período que foram perdidos"
      />
    </div>
  );
};

/* Pipeline aberto + leads parados */
export const PipelinePanel: React.FC<{ pipeline: CommercialDashboardData['pipeline'] }> = ({ pipeline }) => {
  const stalledShare = pipeline.openLeads > 0 ? (pipeline.stalledLeads / pipeline.openLeads) * 100 : 0;
  const color = stalledShare >= 50 ? '#EF4444' : stalledShare >= 25 ? '#F59E0B' : '#10B981';
  return (
    <Panel>
      <SectionTitle hint="Situação atual, independe do período">Pipeline aberto</SectionTitle>
      {pipeline.openLeads === 0 ? (
        <EmptyHint>Nenhum lead em aberto no escopo.</EmptyHint>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>
              {formatBRL(pipeline.openValue)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
              em {pipeline.openLeads.toLocaleString('pt-BR')} leads abertos (valor informado nos leads)
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Parados há mais de 7 dias: {pipeline.stalledLeads.toLocaleString('pt-BR')}
              </span>
              <span style={{ color, fontWeight: 800 }}>{pct1(stalledShare)}</span>
            </div>
            <div style={{ height: '8px', borderRadius: '4px', background: 'var(--adm-bg-input)', margin: '6px 0' }}>
              <div style={{ width: `${Math.min(100, stalledShare)}%`, height: '100%', borderRadius: '4px', background: color }} />
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {formatBRL(pipeline.stalledValue)} em risco de esfriar
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};

/* Motivos de perda */
export const LossReasons: React.FC<{ reasons: CommercialDashboardData['lossReasons']; total: number }> = ({ reasons, total }) => {
  const top = reasons.slice(0, 6);
  const max = top[0]?.count || 0;
  return (
    <Panel>
      <SectionTitle hint={`${total} ${total === 1 ? 'lead perdido' : 'leads perdidos'} no período`}>Motivos de perda</SectionTitle>
      {top.length === 0 ? (
        <EmptyHint>Nenhum lead perdido entre os criados no período.</EmptyHint>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {top.map(r => (
            <div key={r.reason} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.76rem', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.reason}
                </span>
                <span style={{ color: 'var(--adm-text-muted)' }}>
                  <strong style={{ color: 'var(--adm-text-title)' }}>{r.count}</strong> · {pct1((r.count / total) * 100)}
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--adm-bg-input)' }}>
                <div style={{ width: `${max > 0 ? (r.count / max) * 100 : 0}%`, height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #F59E0B, #EF4444)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

/* Mapa de calor: entrada de leads por dia da semana x faixa horaria */
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const BANDS = ['00–06h', '06–12h', '12–18h', '18–24h'];

export const LeadHeatmap: React.FC<{ matrix: number[][] }> = ({ matrix }) => {
  const max = Math.max(0, ...matrix.flat());
  return (
    <Panel>
      <SectionTitle hint="Leads criados no período">Quando os leads chegam</SectionTitle>
      {max === 0 ? (
        <EmptyHint>Sem leads criados no período.</EmptyHint>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', gap: '4px', alignItems: 'center' }}>
          <span />
          {DAYS.map(d => (
            <span key={d} style={{ textAlign: 'center', fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>{d}</span>
          ))}
          {BANDS.map((band, b) => (
            <React.Fragment key={band}>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{band}</span>
              {DAYS.map((d, day) => {
                const v = matrix[day][b];
                const intensity = v / max;
                return (
                  <div
                    key={d}
                    title={`${d} ${band}: ${v} ${v === 1 ? 'lead' : 'leads'}`}
                    style={{
                      height: '34px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      background: v === 0 ? 'var(--adm-bg-input)' : `rgba(20,169,215,${0.18 + intensity * 0.72})`,
                      color: intensity > 0.55 ? '#0B111A' : 'var(--adm-text-title)',
                    }}
                  >
                    {v || ''}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          <span />
          <div style={{
            gridColumn: '2 / span 7', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px',
            fontSize: '0.64rem', color: 'var(--adm-text-muted)',
          }}>
            menos
            <span style={{
              flex: 1, maxWidth: '140px', height: '6px', borderRadius: '3px',
              background: 'linear-gradient(90deg, rgba(20,169,215,0.18), rgba(20,169,215,0.9))',
            }} />
            mais leads
          </div>
        </div>
      )}
    </Panel>
  );
};

/* Eficiencia por origem: volume x conversao */
export const SourceEfficiencyTable: React.FC<{ rows: CommercialDashboardData['sourceEfficiency'] }> = ({ rows }) => (
  <Panel>
    <SectionTitle hint="Leads criados no período e quantos já fecharam">Eficiência por origem</SectionTitle>
    {rows.length === 0 ? (
      <EmptyHint>Sem leads criados no período.</EmptyHint>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
          <thead>
            <tr>
              <th style={th}>Origem</th>
              <th style={{ ...th, textAlign: 'right' }}>Leads</th>
              <th style={{ ...th, textAlign: 'right' }}>Contratos</th>
              <th style={{ ...th, textAlign: 'right' }}>Conversão</th>
              <th style={{ ...th, textAlign: 'right' }}>Receita</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map(r => (
              <tr key={r.source}>
                <td style={{ ...td, fontWeight: 700 }}>{sourceLabel(r.source)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r.leads}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r.closed}</td>
                <td style={{
                  ...td, textAlign: 'right', fontWeight: 800,
                  color: r.conversion >= 10 ? '#10B981' : r.conversion >= 4 ? '#F59E0B' : 'var(--adm-text-muted)',
                }}>
                  {pct1(r.conversion)}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>{formatBRL(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);

/* Comparativo entre unidades (so com mais de uma unidade no escopo) */
export const VenueComparison: React.FC<{ rows: CommercialDashboardData['venueRows'] }> = ({ rows }) => {
  if (rows.length < 2) return null;
  return (
    <Panel>
      <SectionTitle hint="Ordenado por receita fechada">Comparativo entre unidades</SectionTitle>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
          <thead>
            <tr>
              <th style={th}>Unidade</th>
              <th style={{ ...th, textAlign: 'right' }}>Leads</th>
              <th style={{ ...th, textAlign: 'right' }}>Contratos</th>
              <th style={{ ...th, textAlign: 'right' }}>Conversão</th>
              <th style={{ ...th, textAlign: 'right' }}>Ticket médio</th>
              <th style={{ ...th, textAlign: 'right' }}>Receita</th>
              <th style={{ ...th, textAlign: 'right' }}>Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 800 }}>{r.name}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r.leads}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r.closings}</td>
                <td style={{ ...td, textAlign: 'right' }}>{pct1(r.conversion)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{formatBRL(r.avgTicket)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 800 }}>{formatBRL(r.revenue)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <DeltaBadge pct={pctDelta(r.revenue, r.revenuePrev)} hasCurrent={r.revenue > 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};
