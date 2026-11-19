import React from 'react';
import { Target } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { DeltaBadge, Panel, formatBRL } from './DashboardKpi';
import type { CommercialDashboardData, VenueRow } from '../../../hooks/useCommercialDashboardData';

const UNIT_COLORS = ['#14A9D7', '#D4AF37', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];

type PacingLevel = 'none' | 'green' | 'yellow' | 'red';

/** Verde = no ritmo; amarelo = atencao; vermelho = critico (ex.: fim do periodo abaixo de 50%). */
export const getPacingLevel = (p: CommercialDashboardData['pacing']): PacingLevel => {
  if (p.target <= 0) return 'none';
  if (p.expectedPct >= 80 && (p.pct ?? 0) < 50) return 'red';
  if (p.expected <= 0) return 'green';
  const ratio = p.revenue / p.expected;
  if (ratio >= 0.9) return 'green';
  if (ratio >= 0.6) return 'yellow';
  return 'red';
};

const LEVELS: Record<PacingLevel, { color: string; label: string }> = {
  none: { color: '#64748B', label: 'Sem meta definida' },
  green: { color: '#10B981', label: 'No ritmo' },
  yellow: { color: '#F59E0B', label: 'Atenção' },
  red: { color: '#EF4444', label: 'Crítico' },
};

interface Props {
  pacing: CommercialDashboardData['pacing'];
  revenuePct: number | null;
  comparedLabel: string;
  onConfigureGoals?: () => void;
  /** Com varias unidades no escopo: divisao do faturamento entre elas. */
  venueRows?: VenueRow[];
}

export const PacingThermometer: React.FC<Props> = ({ pacing, revenuePct, comparedLabel, onConfigureGoals, venueRows }) => {
  const level = getPacingLevel(pacing);
  const { color, label } = LEVELS[level];
  const fill = pacing.target > 0 ? Math.min(100, (pacing.revenue / pacing.target) * 100) : 0;
  const marker = Math.min(100, pacing.expectedPct);

  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--adm-text-muted)' }}>
          <Target size={15} />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Faturamento fechado vs meta
          </span>
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px',
          color, border: `1px solid ${color}`, background: `${color}22`,
        }}>
          {label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>
          {formatBRL(pacing.revenue)}
        </span>
        {pacing.target > 0 && (
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            de {formatBRL(pacing.target)} · {pacing.pct}%
          </span>
        )}
        <DeltaBadge pct={revenuePct} hasCurrent={pacing.revenue > 0} />
        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>vs {comparedLabel}</span>
      </div>
      {pacing.target > 0 && (
        <div style={{ position: 'relative', width: 150, height: 84 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={[{ v: fill || 0.0001 }, { v: Math.max(0.0001, 100 - fill) }]} dataKey="v"
                startAngle={180} endAngle={0} cx="50%" cy="100%" innerRadius={52} outerRadius={70}
                cornerRadius={6} stroke="none" isAnimationActive={false}
              >
                <Cell fill={color} />
                <Cell fill="rgba(148,163,184,0.2)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center', fontSize: '1.15rem',
            fontWeight: 800, color, fontVariantNumeric: 'tabular-nums',
          }}>
            {pacing.pct}%
          </div>
        </div>
      )}
      </div>

      {pacing.target > 0 ? (
        <div>
          <div style={{ position: 'relative', height: '14px', borderRadius: '7px', background: 'var(--adm-bg-input)' }}>
            <div style={{
              width: `${fill}%`, height: '100%', borderRadius: '7px', background: color, transition: 'width 0.4s ease',
            }} />
            <div
              title={`Ritmo esperado hoje: ${formatBRL(pacing.expected)} (${pacing.expectedPct}%)`}
              style={{
                position: 'absolute', top: '-4px', bottom: '-4px', left: `${marker}%`, width: '2px',
                background: 'var(--adm-text-title)', borderRadius: '1px',
              }}
            />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.68rem',
            color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums',
          }}>
            <span>Ritmo esperado até hoje: {formatBRL(pacing.expected)} ({pacing.expectedPct}%)</span>
            <span>Faltam {formatBRL(Math.max(0, pacing.target - pacing.revenue))}</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
          Defina a meta de faturamento da unidade para acompanhar o ritmo.{' '}
          {onConfigureGoals && (
            <button type="button" onClick={onConfigureGoals} style={{
              background: 'none', border: 'none', color: 'var(--adm-accent)', fontWeight: 700, cursor: 'pointer', padding: 0,
            }}>
              Configurar metas
            </button>
          )}
        </div>
      )}

      {venueRows && venueRows.length > 1 && pacing.revenue > 0 && (
        <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '12px' }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)', marginBottom: '8px' }}>
            Faturamento por unidade
          </div>
          <div style={{ display: 'flex', height: '10px', borderRadius: '999px', overflow: 'hidden', background: 'var(--adm-bg-input)' }}>
            {venueRows.map((v, i) => {
              const share = (v.revenue / pacing.revenue) * 100;
              return share > 0 ? <div key={v.id} title={`${v.name}: ${Math.round(share)}%`} style={{ width: `${share}%`, background: UNIT_COLORS[i % UNIT_COLORS.length] }} /> : null;
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: '10px' }}>
            {venueRows.map((v, i) => (
              <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: UNIT_COLORS[i % UNIT_COLORS.length] }} />
                <strong>{v.name}</strong> {formatBRL(v.revenue)}
                <span style={{ color: 'var(--adm-text-muted)' }}>{Math.round((v.revenue / pacing.revenue) * 100)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
};
