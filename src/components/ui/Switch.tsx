import React from 'react';

export interface SwitchChangeEvent {
  target: { checked: boolean; name?: string };
  currentTarget: { checked: boolean; name?: string };
  stopPropagation: () => void;
  preventDefault: () => void;
}

export interface SwitchProps {
  checked?: boolean;
  /** Compativel com `e => setX(e.target.checked)`. */
  onChange?(e: SwitchChangeEvent): void;
  disabled?: boolean;
  name?: string;
  id?: string;
  /** Texto ao lado do interruptor. */
  label?: React.ReactNode;
  /** 'md' (36x20, padrao) ou 'sm' (30x17). */
  size?: 'md' | 'sm';
  /** Cor quando ligado (padrao: verde de sucesso). */
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  'aria-label'?: string;
}

/** Interruptor ligado/desligado. Use para opcoes que valem na hora (ativo/inativo); `Checkbox` para escolher itens. */
export const Switch: React.FC<SwitchProps> = ({
  checked = false, onChange, disabled, name, id, label, size = 'md', color = 'var(--adm-success, #10B981)', style, className, title, ...rest
}) => {
  const w = size === 'sm' ? 30 : 36;
  const h = size === 'sm' ? 17 : 20;
  const knob = h - 6;

  const toggle = (ev: React.MouseEvent | React.KeyboardEvent) => {
    if (disabled || !onChange) return;
    const next = !checked;
    onChange({
      target: { checked: next, name },
      currentTarget: { checked: next, name },
      stopPropagation: () => ev.stopPropagation(),
      preventDefault: () => ev.preventDefault(),
    });
  };

  return (
    <span
      role="switch"
      aria-checked={checked}
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
          position: 'relative', width: w, height: h, flexShrink: 0, borderRadius: h,
          background: checked ? color : 'var(--adm-border-strong, #CBD5E1)', transition: 'background .15s',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3, left: checked ? w - knob - 3 : 3, width: knob, height: knob,
            borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'left .15s',
          }}
        />
      </span>
      {label !== undefined && label !== null && <span style={{ minWidth: 0 }}>{label}</span>}
    </span>
  );
};
