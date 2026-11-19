import React from 'react';
import {
  Award, Building2, CalendarCheck, CalendarClock, Check, Clock, Handshake, Timer, UserCheck, Wallet, X,
  type LucideIcon,
} from 'lucide-react';
import { formatBRL, formatMinutes } from '../dashboard/DashboardKpi';
import { goalMetricDef, type GoalMetricDef, type GoalStatus, type GoalUnit } from '../../../services/goalPlanService';
import type { GoalMetricKey } from '../../../utils/goalActuals';
import type { Venue } from '../../../types/admin';

/* Identidade visual das metas: um icone e uma cor por KPI, iguais aos cards do dashboard */

export const METRIC_ICON: Record<GoalMetricKey, LucideIcon> = {
  revenue: Wallet,
  closings: Award,
  appointments: CalendarCheck,
  attendance_rate: UserCheck,
  scheduling_rate: CalendarClock,
  closing_rate: Handshake,
  response_time: Clock,
  avg_response_time: Timer,
};

export const METRIC_COLOR: Record<GoalMetricKey, string> = {
  revenue: '#D4AF37',
  closings: '#10B981',
  appointments: '#8B5CF6',
  attendance_rate: '#F59E0B',
  scheduling_rate: '#14A9D7',
  closing_rate: '#EC4899',
  response_time: '#06B6D4',
  avg_response_time: '#64748B',
};

export const formatGoalValue = (unit: GoalUnit, v: number | null): string => {
  if (v === null) return '—';
  switch (unit) {
    case 'money': return formatBRL(v);
    case 'minutes': return formatMinutes(v);
    case 'percent': return `${Math.round(v * 10) / 10}%`;
    default: return (Math.round(v * 10) / 10).toLocaleString('pt-BR');
  }
};

export const formatMetricValue = (metric: GoalMetricKey, v: number | null): string =>
  formatGoalValue(goalMetricDef(metric).unit, v);

export const unitSuffix = (unit: GoalUnit): string =>
  unit === 'money' ? 'R$' : unit === 'percent' ? '%' : unit === 'minutes' ? 'min' : 'qtd';

export const barColor = (pct: number | null): string =>
  pct === null ? '#94A3B8' : pct >= 100 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444';

export const eyebrow: React.CSSProperties = {
  fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)',
};

export const card: React.CSSProperties = {
  background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '16px', padding: '18px 20px',
};

/* ───────── Pecas ───────── */

export const MetricChip: React.FC<{ metric: GoalMetricKey; size?: number }> = ({ metric, size = 34 }) => {
  const Icon = METRIC_ICON[metric];
  const color = METRIC_COLOR[metric];
  return (
    <span style={{
      width: size, height: size, borderRadius: '10px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}1F`, color, border: `1px solid ${color}40`,
    }}>
      <Icon size={size * 0.5} />
    </span>
  );
};

const STATUS: Record<GoalStatus, { label: string; color: string }> = {
  active: { label: 'Ativa', color: '#10B981' },
  pending: { label: 'Pendente', color: '#F59E0B' },
  closed: { label: 'Encerrada', color: '#94A3B8' },
};

export const StatusChip: React.FC<{ status: GoalStatus }> = ({ status }) => (
  <span style={{
    fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px',
    color: STATUS[status].color, border: `1px solid ${STATUS[status].color}66`, background: `${STATUS[status].color}1A`,
  }}>{STATUS[status].label}</span>
);

export const ProgressBar: React.FC<{ pct: number | null; color?: string }> = ({ pct, color }) => (
  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--adm-bg-input)', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%`, height: '100%', background: color || barColor(pct), transition: 'width 0.3s ease' }} />
  </div>
);

/** Selo da unidade: logo (ou icone de predio) + nome. Aparece em todo assistente para nao haver duvida. */
export const UnitBadge: React.FC<{ venue?: Venue; subtitle?: string }> = ({ venue, subtitle }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
    <span style={{
      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', border: '1px solid var(--adm-border)',
    }}>
      {venue?.logoUrl ? <img src={venue.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={18} />}
    </span>
    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {venue?.name || 'Unidade'}
      </span>
      {subtitle && <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{subtitle}</span>}
    </span>
  </span>
);

export const Modal: React.FC<{
  title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; width?: number; header?: React.ReactNode;
}> = ({ title, onClose, children, footer, width = 600, header }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 1200,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
  }}>
    <div style={{
      background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px', width: '100%', maxWidth: width,
      maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 56px rgba(0,0,0,0.35)',
    }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--adm-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', display: 'inline-flex' }}>
            <X size={18} />
          </button>
        </div>
        {header && <div style={{ marginTop: '12px' }}>{header}</div>}
      </div>
      <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>{footer}</div>
    </div>
  </div>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <button
    type="button" onClick={() => onChange(!checked)} aria-pressed={checked}
    style={{
      display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer', width: '100%',
      border: `1px solid ${checked ? 'var(--adm-accent)' : 'var(--adm-border)'}`, background: checked ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
    }}
  >
    <span style={{ width: '36px', height: '20px', borderRadius: '999px', flexShrink: 0, position: 'relative', background: checked ? 'var(--adm-accent)' : 'var(--adm-border)', transition: 'background 0.15s' }}>
      <span style={{ position: 'absolute', top: '2px', left: checked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
    </span>
    <span>
      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{label}</span>
      {hint && <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>{hint}</span>}
    </span>
  </button>
);

/** Cartao selecionavel de uma meta (passo "Quais metas?"). */
export const MetricPickerCard: React.FC<{
  def: GoalMetricDef; selected: boolean; onToggle: () => void; disabled?: boolean; note?: string;
}> = ({ def, selected, onToggle, disabled, note }) => (
  <button
    type="button" onClick={onToggle} disabled={disabled} aria-pressed={selected}
    style={{
      position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '12px', textAlign: 'left', padding: '12px 14px', borderRadius: '14px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
      border: `1.5px solid ${selected ? METRIC_COLOR[def.key] : 'var(--adm-border)'}`,
      background: selected ? `${METRIC_COLOR[def.key]}14` : 'var(--adm-bg-input)', transition: 'all 0.12s ease',
    }}
  >
    <MetricChip metric={def.key} />
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{def.label}</span>
      <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px', lineHeight: 1.35 }}>{note || def.hint}</span>
    </span>
    <span style={{
      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: `2px solid ${selected ? METRIC_COLOR[def.key] : 'var(--adm-border)'}`, background: selected ? METRIC_COLOR[def.key] : 'transparent',
    }}>
      {selected && <Check size={12} color="#fff" strokeWidth={3} />}
    </span>
  </button>
);
