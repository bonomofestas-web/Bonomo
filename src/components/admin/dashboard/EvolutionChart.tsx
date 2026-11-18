import React from 'react';
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipProps,
} from 'recharts';
import { EmptyHint, Panel, SectionTitle, formatBRL } from './DashboardKpi';
import type { EvolutionPoint } from '../../../hooks/useCommercialDashboardData';

const GOLD = '#D4AF37';
const CYAN = '#14A9D7';

interface Props {
  data: EvolutionPoint[];
  currentLabel: string;
  comparedLabel: string;
}

const DarkTooltip: React.FC<TooltipProps<number, string> & { currentLabel: string; comparedLabel: string }> = ({
  active, payload, label, currentLabel, comparedLabel,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const rows: { key: string; title: string; color: string; value: string; dashed?: boolean }[] = payload.map(p => {
    const key = String(p.dataKey);
    const isRevenue = key.startsWith('revenue');
    const isPrev = key.endsWith('Prev');
    return {
      key,
      title: `${isRevenue ? 'Receita' : 'Contratos'} · ${isPrev ? comparedLabel : currentLabel}`,
      color: String(p.color),
      value: isRevenue ? formatBRL(Number(p.value || 0)) : String(p.value ?? 0),
      dashed: isPrev,
    };
  });
  return (
    <div style={{
      background: '#0B111A', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
      padding: '10px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', minWidth: '190px',
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>{label}</div>
      {rows.map(r => (
        <div key={r.key} style={{
          display: 'flex', justifyContent: 'space-between', gap: '14px', fontSize: '0.72rem', color: '#CBD5E1',
          fontVariantNumeric: 'tabular-nums', marginTop: '3px',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '14px', height: 0, borderTop: `2px ${r.dashed ? 'dashed' : 'solid'} ${r.color}`, display: 'inline-block',
            }} />
            {r.title}
          </span>
          <strong style={{ color: '#FFFFFF' }}>{r.value}</strong>
        </div>
      ))}
    </div>
  );
};

export const EvolutionChart: React.FC<Props> = ({ data, currentLabel, comparedLabel }) => {
  const hasAny = data.some(d => d.closings || d.closingsPrev || d.revenue || d.revenuePrev);
  return (
    <Panel>
      <SectionTitle hint="Linha sólida: período atual · tracejada: comparado">Evolução de contratos e receita</SectionTitle>
      {!hasAny ? (
        <EmptyHint>Nenhum contrato fechado no período ou no comparado.</EmptyHint>
      ) : (
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="evoGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="evoCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={32} />
              <YAxis
                yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={56}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip
                content={<DarkTooltip currentLabel={currentLabel} comparedLabel={comparedLabel} />}
                cursor={{ stroke: 'rgba(148,163,184,0.4)' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => {
                  const isRevenue = value.startsWith('revenue');
                  const isPrev = value.endsWith('Prev');
                  return `${isRevenue ? 'Receita' : 'Contratos'}${isPrev ? ' (comparado)' : ''}`;
                }}
              />
              <Area yAxisId="left" type="linear" dataKey="closings" stroke={GOLD} strokeWidth={2.5} fill="url(#evoGold)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line yAxisId="left" type="linear" dataKey="closingsPrev" stroke={GOLD} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Area yAxisId="right" type="linear" dataKey="revenue" stroke={CYAN} strokeWidth={2.5} fill="url(#evoCyan)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line yAxisId="right" type="linear" dataKey="revenuePrev" stroke={CYAN} strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
};
