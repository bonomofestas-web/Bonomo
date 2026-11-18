import React from 'react';
import { DeltaBadge, EmptyHint, Panel, SectionTitle, formatMinutes } from './DashboardKpi';
import { pctDelta } from '../../../utils/dashboardPeriod';
import { getGoalStatus } from '../../../utils/goalStatus';
import type { CollaboratorRow } from '../../../hooks/useCommercialDashboardData';

const formatHours = (minutes: number | null): string => {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
};

const tmaColor = (value: number | null, target: number | null): string => {
  if (value === null || !target) return '#64748B';
  if (value <= target) return '#10B981';
  if (value <= target * 1.5) return '#F59E0B';
  return '#EF4444';
};

const th: React.CSSProperties = {
  textAlign: 'left', padding: '8px 10px', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--adm-text-muted)', borderBottom: '1px solid var(--adm-border)', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '10px', fontSize: '0.78rem', color: 'var(--adm-text-title)', borderBottom: '1px solid var(--adm-border)',
  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
};

export const CollaboratorRadar: React.FC<{ rows: CollaboratorRow[]; loadingPresence: boolean; truncated?: boolean }> = ({ rows, loadingPresence, truncated }) => (

  <Panel>
    <SectionTitle hint={truncated ? 'Período muito longo: tempo online parcial (limite de atividades atingido)' : 'Tempo online = soma de (última − primeira atividade) de cada dia'}>Radar da equipe</SectionTitle>
    {rows.length === 0 ? (
      <EmptyHint>Nenhum SDR ou Closer ativo no escopo.</EmptyHint>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
          <thead>
            <tr>
              <th style={th}>Colaborador</th>
              <th style={th}>TMA</th>
              <th style={th}>Tempo online</th>
              <th style={th}>Entregas</th>
              <th style={{ ...th, width: '28%' }}>Meta individual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const status = getGoalStatus(r.goalPct);
              const color = tmaColor(r.avgResponseMinutes, r.responseTarget);
              return (
                <tr key={r.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 800 }}>{r.name}</div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                      {r.role === 'closer' ? 'Closer' : 'SDR'}
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                      {formatMinutes(r.avgResponseMinutes)}
                    </span>
                    {r.responseTarget ? (
                      <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>meta {formatMinutes(r.responseTarget)}</div>
                    ) : null}
                    {r.avgResponseMinutes !== null && r.avgResponsePrev !== null && (
                      <DeltaBadge pct={pctDelta(r.avgResponseMinutes, r.avgResponsePrev)} lowerIsBetter />
                    )}
                  </td>
                  <td style={td}>
                    {loadingPresence ? '...' : formatHours(r.activeMinutes)}
                    {!loadingPresence && r.activeDays > 0 && (
                      <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                        {r.activeDays} {r.activeDays === 1 ? 'dia' : 'dias'} com atividade
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    <strong>{r.deliveries}</strong>{' '}
                    <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.7rem' }}>{r.deliveriesLabel}</span>
                    <div><DeltaBadge pct={pctDelta(r.deliveries, r.deliveriesPrev)} hasCurrent={r.deliveries > 0} /></div>
                  </td>
                  <td style={td}>
                    {r.goalPct === null ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Sem meta individual</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--adm-bg-input)' }}>
                          <div style={{
                            width: `${Math.min(100, Math.max(0, r.goalPct))}%`, height: '100%', borderRadius: '4px',
                            background: status.color, transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontWeight: 800, color: status.color, minWidth: '40px', textAlign: 'right' }}>{r.goalPct}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);
