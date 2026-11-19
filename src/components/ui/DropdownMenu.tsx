import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { PopoverPanel } from './Popover';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Dica exibida quando desabilitado (ex.: regra de protecao). */
  disabledReason?: string;
  /** Linha separadora antes do item. */
  separatorBefore?: boolean;
  /** Itens ocultos nao aparecem (evita montar listas com filter). */
  hidden?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  /** Gatilho personalizado; por padrao, botao com tres pontos. */
  trigger?: (props: { open: boolean }) => React.ReactNode;
  'aria-label'?: string;
  align?: 'left' | 'right';
  minWidth?: number;
  style?: React.CSSProperties;
}

/**
 * Menu de acoes do app ("⋯"). Lista em portal (nao e cortada), teclado (setas, Enter, Esc).
 * Use no lugar de uma fileira de botoes quando a linha/card tem varias acoes (docs/UI_KIT.md).
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, trigger, 'aria-label': ariaLabel = 'Ações', align = 'right', minWidth = 220, style }) => {
  const visible = items.filter(i => !i.hidden);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => { if (open) setActive(Math.max(0, visible.findIndex(i => !i.disabled))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  const run = (item: DropdownMenuItem) => {
    if (item.disabled) return;
    close();
    item.onSelect();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(visible.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = visible[active]; if (it) run(it); }
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        onKeyDown={onKey}
        style={trigger ? { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', ...style } : {
          width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text-title)', ...style,
        }}
      >
        {trigger ? trigger({ open }) : <MoreHorizontal size={16} />}
      </button>
      <PopoverPanel anchorRef={anchorRef} open={open} onClose={close} minWidth={minWidth} align={align} maxHeight={380}>
        <div role="menu" style={{ padding: '6px', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          {visible.map((item, i) => (
            <React.Fragment key={item.id}>
              {item.separatorBefore && i > 0 && <div style={{ height: '1px', margin: '5px 4px', background: 'var(--adm-border)' }} />}
              <div
                role="menuitem"
                aria-disabled={item.disabled}
                title={item.disabled ? item.disabledReason : undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => run(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                  cursor: item.disabled ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.45 : 1,
                  color: item.danger ? '#EF4444' : 'var(--adm-text-title)',
                  background: i === active && !item.disabled ? (item.danger ? 'rgba(239,68,68,0.1)' : 'var(--adm-accent-bg, rgba(20,169,215,0.14))') : 'transparent',
                }}
              >
                {item.icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{item.icon}</span>}
                <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </PopoverPanel>
    </>
  );
};
