import React from 'react';
import { EmptyHint, Panel, SectionTitle } from './DashboardKpi';
import type { FunnelStep } from '../../../hooks/useCommercialDashboardData';

const passColor = (rate: number | null): string => {
  if (rate === null) return '#64748B';
  if (rate >= 50) return '#10B981';
  if (rate >= 25) return '#F59E0B';
  return '#EF4444';
};

export const FunnelStrip: React.FC<{ steps: FunnelStep[] }> = ({ steps }) => {
  const max = steps[0]?.count || 0;
  return (
    <Panel>
      <SectionTitle hint="Leads criados no período que chegaram em cada etapa">Funil de conversão</SectionTitle>
      {steps.length === 0 || max === 0 ? (
        <EmptyHint>Sem leads criados no período para montar o funil.</EmptyHint>
      ) : (
        <div style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', paddingBottom: '4px' }}>
          {steps.map((s, i) => {
            const h = Math.max(8, (s.count / max) * 100);
            const next = steps[i + 1];
            const hNext = next ? Math.max(8, (next.count / max) * 100) : h;
            const a = (100 - h) / 2;
            const b = (100 - hNext) / 2;
            const rate = next ? next.passRate : null;
            return (
              <div key={s.id} style={{ flex: '1 1 0', minWidth: '110px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ padding: '0 8px' }}>
                  <div title={s.name} style={{
                    fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>
                    {s.count.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div style={{
                  height: '110px',
                  background: `linear-gradient(135deg, rgba(20,169,215,${0.95 - i * 0.08}), rgba(212,175,55,${0.35 + i * 0.08}))`,
                  clipPath: `polygon(0 ${a}%, 100% ${b}%, 100% ${100 - b}%, 0 ${100 - a}%)`,
                  transition: 'clip-path 0.4s ease',
                }} />
                <div style={{
                  textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                  color: next ? passColor(rate) : 'transparent', minHeight: '16px',
                }}>
                  {next ? (rate === null ? '—' : `${Math.round(rate)}% passam`) : '.'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
};
