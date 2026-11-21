import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PopoverPanel } from './Popover';

export const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** "Dezembro 2026" (sem o "de" do meio) */
export const formatMonthYear = (d: Date): string => `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const nav: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--adm-text-title)', display: 'inline-flex' };

interface PanelProps {
  year: number;
  month: number; // 0-11
  /** Escolheu mes (e ano) */
  onPick: (year: number, month: number) => void;
}

/**
 * Painel de navegacao rapida do calendario: clique no titulo -> escolhe o MES; clique no ANO -> escolhe o ano
 * (blocos de 12 anos). Usado dentro do CalendarGrid e no MonthYearSwitcher (titulos dos demais calendarios).
 */
export const MonthYearPanel: React.FC<PanelProps> = ({ year, month, onPick }) => {
  const [view, setView] = useState<'months' | 'years'>('months');
  const [shownYear, setShownYear] = useState(year);
  const [blockStart, setBlockStart] = useState(year - (year % 12));
  const now = new Date();

  const cell = (active: boolean, current: boolean): React.CSSProperties => ({
    padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: active || current ? 800 : 600,
    border: current && !active ? '1px solid var(--adm-accent, #0284C7)' : '1px solid transparent',
    background: active ? 'var(--adm-accent, #0284C7)' : 'transparent',
    color: active ? '#FFFFFF' : 'var(--adm-text-title)',
  });

  if (view === 'years') {
    return (
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button type="button" aria-label="Anos anteriores" style={nav} onClick={() => setBlockStart(b => b - 12)}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{blockStart} – {blockStart + 11}</span>
          <button type="button" aria-label="Próximos anos" style={nav} onClick={() => setBlockStart(b => b + 12)}><ChevronRight size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {Array.from({ length: 12 }, (_, i) => blockStart + i).map(y => (
            <button key={y} type="button" style={cell(y === year, y === now.getFullYear())} onClick={() => { setShownYear(y); setView('months'); }}>{y}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" aria-label="Ano anterior" style={nav} onClick={() => setShownYear(y => y - 1)}><ChevronLeft size={16} /></button>
        <button type="button" onClick={() => { setBlockStart(shownYear - (shownYear % 12)); setView('years'); }} title="Escolher o ano"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-accent, #0284C7)', padding: '4px 10px', borderRadius: 6 }}>
          {shownYear}
        </button>
        <button type="button" aria-label="Próximo ano" style={nav} onClick={() => setShownYear(y => y + 1)}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {MONTH_SHORT.map((m, i) => (
          <button key={m} type="button" style={cell(shownYear === year && i === month, shownYear === now.getFullYear() && i === now.getMonth())} onClick={() => onPick(shownYear, i)}>{m}</button>
        ))}
      </div>
    </div>
  );
};

interface SwitcherProps {
  year: number;
  month: number; // 0-11
  onChange: (year: number, month: number) => void;
  /** Texto do titulo (padrao: "Novembro 2026") */
  label?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Titulo do calendario clicavel: abre o seletor rapido de mes e ano. Troque o texto fixo "Novembro 2026" dos
 * calendarios por este componente (docs/UI_KIT.md).
 */
export const MonthYearSwitcher: React.FC<SwitcherProps> = ({ year, month, onChange, label, style, className }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchorRef} type="button" className={className} onClick={e => { e.stopPropagation(); setOpen(o => !o); }} aria-haspopup="dialog" aria-expanded={open} title="Ir para outro mês ou ano"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, font: 'inherit', color: 'inherit', fontWeight: 800, ...style }}>
        {label ?? `${MONTH_NAMES[month]} ${year}`}
      </button>
      <PopoverPanel anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} width={260} maxHeight={320}>
        <MonthYearPanel year={year} month={month} onPick={(y, m) => { onChange(y, m); setOpen(false); }} />
      </PopoverPanel>
    </>
  );
};
