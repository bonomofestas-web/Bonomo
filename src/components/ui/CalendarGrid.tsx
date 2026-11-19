import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** 'YYYY-MM-DD' <-> Date (calendario local, sem fuso). */
export const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromDateStr = (s: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const formatDateBR = (s: string): string => {
  const d = fromDateStr(s);
  return d ? d.toLocaleDateString('pt-BR') : '';
};

interface CalendarGridProps {
  /** Data selecionada (YYYY-MM-DD). */
  value?: string;
  onSelect: (date: string) => void;
  min?: string;
  max?: string;
  /** Intervalo destacado (usado pelo DateRangeField). */
  rangeStart?: string;
  rangeEnd?: string;
  onClear?: () => void;
  showToday?: boolean;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/**
 * Grade de calendario do app (mes a mes). Extraida do cadastro de cliente e compartilhada:
 * nao use `<input type="date">` nativo nas telas do portal, use DateField (src/components/ui).
 */
export const CalendarGrid: React.FC<CalendarGridProps> = ({ value, onSelect, min, max, rangeStart, rangeEnd, onClear, showToday = true }) => {
  const initial = fromDateStr(value || '') || fromDateStr(rangeStart || '') || new Date();
  const [month, setMonth] = useState<Date>(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const today = toDateStr(new Date());

  const days = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const cells: { date: string; num: number; inMonth: boolean }[] = [];
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = new Date(y, m, -i);
      cells.push({ date: toDateStr(d), num: d.getDate(), inMonth: false });
    }
    for (let n = 1; n <= total; n++) cells.push({ date: toDateStr(new Date(y, m, n)), num: n, inMonth: true });
    while (cells.length % 7 !== 0) {
      const d = new Date(y, m + 1, cells.length - firstWeekday - total + 1);
      cells.push({ date: toDateStr(d), num: d.getDate(), inMonth: false });
    }
    return cells;
  }, [month]);

  const nav: React.CSSProperties = {
    background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', borderRadius: '6px',
    color: 'var(--adm-text-title)', display: 'inline-flex',
  };

  return (
    <div style={{ padding: '12px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button type="button" aria-label="Mês anterior" style={nav} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'capitalize' }}>
          {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" aria-label="Próximo mês" style={nav} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.64rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
        {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {days.map(cell => {
          const disabled = (min && cell.date < min) || (max && cell.date > max) || false;
          const selected = value === cell.date || rangeStart === cell.date || rangeEnd === cell.date;
          const inRange = !!(rangeStart && rangeEnd && cell.date > rangeStart && cell.date < rangeEnd);
          const isToday = cell.date === today;
          return (
            <button
              key={cell.date}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cell.date)}
              style={{
                padding: '6px 0', borderRadius: '7px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.74rem',
                border: isToday && !selected ? '1px solid var(--adm-accent, #0284C7)' : '1px solid transparent',
                background: selected ? 'var(--adm-accent, #0284C7)' : inRange ? 'var(--adm-accent-bg, rgba(20,169,215,0.14))' : 'transparent',
                color: selected ? '#FFFFFF' : cell.inMonth ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                fontWeight: selected || isToday ? 800 : 500,
                opacity: disabled ? 0.3 : cell.inMonth ? 1 : 0.45,
              }}
            >
              {cell.num}
            </button>
          );
        })}
      </div>

      {(showToday || onClear) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--adm-border)' }}>
          {showToday ? (
            <button type="button" onClick={() => { setMonth(new Date()); onSelect(today); }} style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>Hoje</button>
          ) : <span />}
          {onClear && (
            <button type="button" onClick={onClear} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Limpar</button>
          )}
        </div>
      )}
    </div>
  );
};
