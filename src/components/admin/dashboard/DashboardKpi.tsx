import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

export const formatBRL = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const formatMinutes = (v: number | null): string => {
  if (v === null) return '—';
  if (v < 60) return `${Math.round(v)} min`;
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return m ? `${h}h ${m}min` : `${h}h`;
};

interface DeltaBadgeProps {
  pct: number | null;
  /** Quando menor e melhor (ex.: tempo de resposta), inverte as cores. */
  lowerIsBetter?: boolean;
  /** Valores absolutos usados para mostrar "novo" quando nao ha base. */
  hasCurrent?: boolean;
}

export const DeltaBadge: React.FC<DeltaBadgeProps> = ({ pct, lowerIsBetter = false, hasCurrent = false }) => {
  if (pct === null) {
    return (
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
        {hasCurrent ? 'sem base de comparação' : '—'}
      </span>
    );
  }
  const rounded = Math.round(pct * 10) / 10;
  const neutral = rounded === 0;
  const good = lowerIsBetter ? rounded < 0 : rounded > 0;
  const color = neutral ? '#64748B' : good ? '#10B981' : '#EF4444';
  const Icon = neutral ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 800,
      color, fontVariantNumeric: 'tabular-nums',
    }}>
      <Icon size={13} />
      {rounded > 0 ? '+' : ''}{rounded.toLocaleString('pt-BR')}%
    </span>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  pct: number | null;
  hasCurrent?: boolean;
  lowerIsBetter?: boolean;
  /** Linha secundaria (ex.: separacao Visita / Degustacao, meta). */
  detail?: React.ReactNode;
  valueColor?: string;
  previousLabel?: string;
  /** Serie curta para a sparkline (um ponto por bucket do periodo). */
  spark?: number[];
  sparkColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, icon, pct, hasCurrent, lowerIsBetter, detail, valueColor, previousLabel, spark, sparkColor = '#14A9D7',
}) => (
  <div style={{
    background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '14px',
    padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--adm-text-muted)' }}>
      {icon}
      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    </div>
    <div style={{
      fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
      color: valueColor || 'var(--adm-text-title)',
    }}>
      {value}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <DeltaBadge pct={pct} lowerIsBetter={lowerIsBetter} hasCurrent={hasCurrent} />
      {previousLabel && (
        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          vs {previousLabel}
        </span>
      )}
    </div>
    {spark && spark.length > 1 && spark.some(v => v > 0) && (
      <div style={{ height: '38px', marginTop: '2px' }}>
        <ResponsiveContainer>
          <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spark-${sparkColor.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="linear" dataKey="v" stroke={sparkColor} strokeWidth={1.8} fill={`url(#spark-${sparkColor.slice(1)})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
    {detail && <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{detail}</div>}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
    <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{children}</h3>
    {hint && <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{hint}</span>}
  </div>
);

export const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '14px',
    padding: '18px 20px', minWidth: 0, ...style,
  }}>
    {children}
  </div>
);

export const EmptyHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    padding: '28px 12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--adm-text-muted)',
  }}>
    {children}
  </div>
);
