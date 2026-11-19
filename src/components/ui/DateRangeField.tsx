import React, { useCallback, useRef, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { PopoverPanel } from './Popover';
import { CalendarGrid, formatDateBR } from './CalendarGrid';

export interface DateRangeFieldProps {
  start?: string; // YYYY-MM-DD
  end?: string;
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

/**
 * Campo de periodo: um unico gatilho ("01/11/2026 – 30/11/2026") e um calendario onde se clica no inicio e no fim.
 * Use no lugar de dois `<input type="date">` (docs/UI_KIT.md).
 */
export const DateRangeField: React.FC<DateRangeFieldProps> = ({
  start = '', end = '', onChange, disabled, placeholder = 'Selecionar período', className, style, 'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string>('');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); setDraftStart(''); }, []);

  const pick = (date: string) => {
    if (!draftStart) { setDraftStart(date); return; }
    const [a, b] = date < draftStart ? [date, draftStart] : [draftStart, date];
    onChange(a, b);
    close();
  };

  const label = start && end ? `${formatDateBR(start)} – ${formatDateBR(end)}` : placeholder;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', textAlign: 'left',
          height: '36px', padding: '0 10px', borderRadius: '8px', fontSize: '0.8rem', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1, minWidth: 0, ...style,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: start && end ? 'inherit' : 'var(--adm-text-muted)' }}>{label}</span>
        <CalendarRange size={14} color="var(--adm-text-muted)" style={{ flexShrink: 0 }} />
      </button>
      <PopoverPanel anchorRef={anchorRef} open={open} onClose={close} width={280} maxHeight={440}>
        <div style={{ padding: '10px 12px 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
          {draftStart ? `Início ${formatDateBR(draftStart)}. Agora escolha o fim.` : 'Escolha o primeiro dia do período.'}
        </div>
        <CalendarGrid
          rangeStart={draftStart || start}
          rangeEnd={draftStart ? undefined : end}
          onSelect={pick}
          showToday={false}
        />
      </PopoverPanel>
    </>
  );
};
