import React from 'react';
import { MQL_BAND_STYLE, mqlBand } from '../../utils/mqlScore';

interface Props {
  score?: number | null;
  /** Versao fina para cards: so a barra com a porcentagem. */
  compact?: boolean;
}

/** Barra de carregamento do MQL: vermelho (<30%), amarelo (30-59%), verde (60%+); <10% = desqualificado. */
export const MqlScoreBar: React.FC<Props> = ({ score, compact }) => {
  const defined = typeof score === 'number' && Number.isFinite(score);
  const value = defined ? Math.max(0, Math.min(100, score as number)) : 0;
  const band = mqlBand(defined ? value : undefined);
  const color = MQL_BAND_STYLE[band].color;
  const label = MQL_BAND_STYLE[band].label;

  return (
    <div
      title={defined ? `MQL ${value}% (${label})` : 'MQL ainda não respondido'}
      style={{ display: 'flex', flexDirection: 'column', gap: compact ? '3px' : '5px', width: '100%' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: compact ? '0.6rem' : '0.66rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}>
          MQL{!compact && <span style={{ marginLeft: '6px', color, textTransform: 'none', letterSpacing: 0 }}>{label}</span>}
        </span>
        <span style={{ fontSize: compact ? '0.64rem' : '0.74rem', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
          {defined ? `${Math.round(value)}%` : '—'}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={defined ? Math.round(value) : undefined}
        style={{ height: compact ? '4px' : '7px', borderRadius: '999px', background: 'var(--adm-bg-input, rgba(148,163,184,0.18))', overflow: 'hidden' }}
      >
        <div style={{ width: `${value}%`, height: '100%', borderRadius: '999px', background: color, transition: 'width 0.35s ease' }} />
      </div>
    </div>
  );
};
