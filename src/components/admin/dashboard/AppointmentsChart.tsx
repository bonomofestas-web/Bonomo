import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { EmptyHint, Panel, SectionTitle } from './DashboardKpi';
import type { EvolutionPoint } from '../../../hooks/useCommercialDashboardData';

const GOLD = '#D4AF37';
const CYAN = '#14A9D7';

const NAMES: Record<string, string> = {
  visits: 'Visita comercial', tastings: 'Degustação', visitsPrev: 'Visita (comparado)', tastingsPrev: 'Degustação (comparado)',
};

const DarkTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: '#0B111A', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
      padding: '10px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', minWidth: '190px',
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>{label}</div>
      {payload.map(p => (
        <div key={String(p.dataKey)} style={{
          display: 'flex', justifyContent: 'space-between', gap: '14px', fontSize: '0.72rem', color: '#CBD5E1',
          fontVariantNumeric: 'tabular-nums', marginTop: '3px',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: String(p.color), display: 'inline-block' }} />
            {NAMES[String(p.dataKey)] || String(p.dataKey)}
          </span>
          <strong style={{ color: '#FFFFFF' }}>{p.value ?? 0}</strong>
        </div>
      ))}
    </div>
  );
};

export const AppointmentsChart: React.FC<{ data: EvolutionPoint[] }> = ({ data }) => {
  const hasAny = data.some(d => d.visits || d.tastings || d.visitsPrev || d.tastingsPrev);
  const rows = data.map(d => ({ ...d, total: d.visits + d.tastings, totalPrev: d.visitsPrev + d.tastingsPrev }));
  return (
    <Panel>
      <SectionTitle hint="Realizados por data do agendamento">Evolução de agendamentos</SectionTitle>
      {!hasAny ? (
        <EmptyHint>Nenhum agendamento realizado no período ou no comparado.</EmptyHint>
      ) : (
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="apGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={1} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="apCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity={1} />
                  <stop offset="100%" stopColor={CYAN} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => NAMES[v] || v} />
              <Bar dataKey="visits" stackId="cur" fill="url(#apGold)" />
              <Bar dataKey="tastings" stackId="cur" fill="url(#apCyan)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
};
