import React from 'react';
import { Check, Minus } from 'lucide-react';

export interface CheckboxChangeEvent {
  target: { checked: boolean; name?: string };
  currentTarget: { checked: boolean; name?: string };
  stopPropagation: () => void;
  preventDefault: () => void;
}

export interface CheckboxProps {
  checked?: boolean;
  /** Estado intermediario (ex.: "alguns selecionados"). */
  indeterminate?: boolean;
  /** Compativel com handlers de <input type="checkbox">: `e => setX(e.target.checked)`. */
  onChange?(e: CheckboxChangeEvent): void;
  disabled?: boolean;
  name?: string;
  id?: string;
  /** Lado direito da caixa. */
  label?: React.ReactNode;
  /** 16 (padrao) ou 14. */
  size?: number;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  'aria-label'?: string;
}

/** Substitui `<input type="checkbox">` nativo nas telas do portal. */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false, indeterminate = false, onChange, disabled, name, id, label, size = 16, style, className, title, ...rest
}) => {
  const on = checked || indeterminate;
  const toggle = (ev: React.MouseEvent | React.KeyboardEvent) => {
    if (disabled || !onChange) return;
    const next = indeterminate ? true : !checked;
    onChange({
      target: { checked: next, name },
      currentTarget: { checked: next, name },
      stopPropagation: () => ev.stopPropagation(),
      preventDefault: () => ev.preventDefault(),
    });
  };

  return (
    <span
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-disabled={disabled || undefined}
      aria-label={rest['aria-label']}
      tabIndex={disabled ? -1 : 0}
      id={id}
      title={title}
      className={className}
      onClick={toggle}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(e); } }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        userSelect: 'none', outline: 'none', ...style,
      }}
    >
      <span
        style={{
          width: size, height: size, flexShrink: 0, borderRadius: 4,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${on ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-border-strong, #94A3B8)'}`,
          background: on ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-bg-surface, #FFFFFF)',
          color: '#FFFFFF', transition: 'background .12s, border-color .12s',
        }}
      >
        {indeterminate ? <Minus size={size - 6} strokeWidth={3} /> : checked ? <Check size={size - 6} strokeWidth={3} /> : null}
      </span>
      {label !== undefined && label !== null && <span style={{ minWidth: 0 }}>{label}</span>}
    </span>
  );
};
