import React, { useCallback, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { PopoverPanel } from './Popover';
import { CalendarGrid, formatDateBR } from './CalendarGrid';

export interface DateChangeEvent {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
  preventDefault: () => void;
  stopPropagation: () => void;
}

type NativeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'type' | 'style' | 'className' | 'children' | 'name' | 'id' | 'title' | 'disabled' | 'placeholder' | 'min' | 'max'>;

export interface DateFieldProps extends NativeButtonProps {
  value?: string; // YYYY-MM-DD ('' = sem data)
  /** Compativel com handlers de <input>: `e => setX(e.target.value)`. */
  onChange?(e: DateChangeEvent): void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  'aria-label'?: string;
  /** Mostra "Limpar" no calendario (padrao: true quando nao e obrigatorio). */
  clearable?: boolean;
}

/**
 * Campo de data do app: botao com a data em pt-BR e calendario em popover.
 * Substitui `<input type="date">` nas telas do portal (docs/UI_KIT.md).
 */
export const DateField: React.FC<DateFieldProps> = ({
  value = '', onChange, min, max, disabled, required, name, id, placeholder = 'Selecionar data', className, style, title,
  'aria-label': ariaLabel, clearable, onClick, onKeyDown, ...rest
}) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const emit = (next: string) => {
    onChange?.({
      target: { value: next, name },
      currentTarget: { value: next, name },
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        id={id}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        {...rest}
        disabled={disabled}
        onClick={e => { onClick?.(e); if (!e.defaultPrevented) setOpen(o => !o); }}
        onKeyDown={onKeyDown}
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', textAlign: 'left',
          height: '36px', padding: '0 10px', borderRadius: '8px', fontSize: '0.8rem', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1, minWidth: 0, ...style,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: value ? 'inherit' : 'var(--adm-text-muted)' }}>
          {value ? formatDateBR(value) : placeholder}
        </span>
        <Calendar size={14} color="var(--adm-text-muted)" style={{ flexShrink: 0 }} />
      </button>
      <PopoverPanel anchorRef={anchorRef} open={open} onClose={close} width={280} maxHeight={420}>
        <CalendarGrid
          value={value}
          min={min}
          max={max}
          onSelect={d => { emit(d); close(); }}
          onClear={(clearable ?? !required) && value ? () => { emit(''); close(); } : undefined}
        />
      </PopoverPanel>
    </>
  );
};
