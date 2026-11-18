import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { EmptyHint, Panel, SectionTitle, formatBRL } from './DashboardKpi';
import type { SourceRank } from '../../../hooks/useCommercialDashboardData';

const SOURCE_LABELS: Record<string, string> = {
  indicacao: 'Indicação',
  instagram: 'Instagram',
  trafego_pago: 'Tráfego pago',
  whatsapp: 'WhatsApp',
  parceria: 'Parcerias',
  evento_externo: 'Evento externo',
  nao_informada: 'Não informada',
};

export const sourceLabel = (raw: string): string => {
  if (SOURCE_LABELS[raw]) return SOURCE_LABELS[raw];
  const text = raw.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const PALETTE = ['#D4AF37', '#14A9D7', '#10B981', '#A78BFA', '#F472B6', '#F59E0B'];

export const TopSources: React.FC<{ sources: SourceRank[] }> = ({ sources }) => {
  const top = sources.slice(0, 6);
  const total = top.reduce((s, r) => s + r.closings, 0);
  return (
    <Panel>
      <SectionTitle hint="Somente origens com contrato fechado">Origens que mais fecham</SectionTitle>
      {top.length === 0 ? (
        <EmptyHint>Nenhum contrato fechado no período.</EmptyHint>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0, margin: '0 auto' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={top} dataKey="closings" nameKey="source" innerRadius={56} outerRadius={80}
                  paddingAngle={top.length > 1 ? 3 : 0} cornerRadius={5} stroke="none"
                >
                  {top.map((s, i) => <Cell key={s.source} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', pointerEvents: 'none',
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>{total}</span>
              <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>contratos</span>
            </div>
          </div>
          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '9px', minWidth: 0 }}>
            {top.map((s, i) => (
              <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sourceLabel(s.source)}
                </span>
                <span style={{ color: 'var(--adm-text-muted)', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: 'var(--adm-text-title)' }}>{s.closings}</strong> · {formatBRL(s.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
};
