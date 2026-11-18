import React from 'react';
import { CalendarRange, GitCompareArrows } from 'lucide-react';
import {
  PERIOD_PRESETS, toISODate,
  type PeriodPreset, type PeriodSelection, type ResolvedPeriod,
} from '../../../utils/dashboardPeriod';

interface Props {
  value: PeriodSelection;
  resolved: ResolvedPeriod;
  onChange: (next: PeriodSelection) => void;
}

const dateInput: React.CSSProperties = {
  height: '32px', borderRadius: '8px', fontSize: '0.76rem', padding: '0 8px', width: '132px',
};

export const DashboardPeriodSelector: React.FC<Props> = ({ value, resolved, onChange }) => {
  const set = (patch: Partial<PeriodSelection>) => onChange({ ...value, ...patch });

  const handlePreset = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      set({
        preset,
        customStart: value.customStart || toISODate(resolved.current.start),
        customEnd: value.customEnd || toISODate(resolved.current.end),
      });
      return;
    }
    set({ preset });
  };

  const handleCompareMode = (compareMode: 'auto' | 'custom') => {
    if (compareMode === 'custom') {
      set({
        compareMode,
        compareStart: value.compareStart || toISODate(resolved.compared.start),
        compareEnd: value.compareEnd || toISODate(resolved.compared.end),
      });
      return;
    }
    set({ compareMode });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <CalendarRange size={15} color="var(--adm-text-muted)" />
        {PERIOD_PRESETS.map(p => {
          const active = value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePreset(p.id)}
              aria-pressed={active}
              style={{
                padding: '6px 12px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                background: active ? 'var(--adm-accent)' : 'var(--adm-bg-card)',
                color: active ? '#0B111A' : 'var(--adm-text-title)',
              }}
            >
              {p.label}
            </button>
          );
        })}
        {value.preset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="date" className="adm-input" style={dateInput} value={value.customStart || ''}
              onChange={e => set({ customStart: e.target.value })} aria-label="Data inicial" />
            <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>até</span>
            <input type="date" className="adm-input" style={dateInput} value={value.customEnd || ''}
              onChange={e => set({ customEnd: e.target.value })} aria-label="Data final" />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <GitCompareArrows size={15} color="var(--adm-text-muted)" />
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>Comparar com</span>
        {(['auto', 'custom'] as const).map(mode => {
          const active = value.compareMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleCompareMode(mode)}
              aria-pressed={active}
              style={{
                padding: '5px 11px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                background: active ? 'rgba(212, 175, 55, 0.14)' : 'transparent',
                color: 'var(--adm-text-title)',
              }}
            >
              {mode === 'auto' ? 'Período anterior' : 'Personalizado'}
            </button>
          );
        })}
        {value.compareMode === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="date" className="adm-input" style={dateInput} value={value.compareStart || ''}
              onChange={e => set({ compareStart: e.target.value })} aria-label="Início da comparação" />
            <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>até</span>
            <input type="date" className="adm-input" style={dateInput} value={value.compareEnd || ''}
              onChange={e => set({ compareEnd: e.target.value })} aria-label="Fim da comparação" />
          </div>
        )}
        <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {resolved.currentLabel} vs {resolved.comparedLabel}
        </span>
      </div>
    </div>
  );
};
