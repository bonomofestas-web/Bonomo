import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { PopoverPanel } from './Popover';

export interface SelectChangeEvent {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
  preventDefault: () => void;
  stopPropagation: () => void;
}

interface FlatOption { value: string; label: React.ReactNode; text: string; disabled: boolean; group?: string }

/** Texto puro de um conteudo de <option> (strings, numeros e arrays). */
const nodeText = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return nodeText(node.props.children);
  return '';
};

/** Achata <option>, <optgroup> e fragmentos em uma lista unica. */
const collectOptions = (children: React.ReactNode, group?: string, out: FlatOption[] = []): FlatOption[] => {
  React.Children.forEach(children, child => {
    if (!React.isValidElement<Record<string, any>>(child)) return;
    if (child.type === React.Fragment) { collectOptions(child.props.children, group, out); return; }
    if (child.type === 'optgroup') { collectOptions(child.props.children, String(child.props.label ?? ''), out); return; }
    if (child.type === 'option') {
      const text = nodeText(child.props.children);
      out.push({
        value: child.props.value !== undefined ? String(child.props.value) : text,
        label: child.props.children,
        text,
        disabled: Boolean(child.props.disabled),
        group,
      });
    }
  });
  return out;
};

type NativeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'type' | 'style' | 'className' | 'children' | 'name' | 'id' | 'title' | 'disabled' | 'placeholder'>;

export interface SelectProps extends NativeButtonProps {
  value?: string | number | null;
  /** Compativel com handlers de <select>: `e => setX(e.target.value)`. */
  onChange?(e: SelectChangeEvent): void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  placeholder?: string;
  'aria-label'?: string;
  /** Largura minima da lista (padrao: largura do gatilho). */
  menuMinWidth?: number;
  /** Mostra a busca quando ha mais opcoes que isso (padrao 8). */
  searchThreshold?: number;
  children?: React.ReactNode;
}

/**
 * Dropdown do app. Substitui `<select>` nas telas do portal (docs/UI_KIT.md): aceita os mesmos <option>/<optgroup>,
 * lista em portal (nao e cortada por modais), teclado (setas, Enter, Esc, digitar), busca automatica em listas longas.
 */
export const Select: React.FC<SelectProps> = ({
  value, onChange, disabled, name, id, className, style, title, placeholder = 'Selecionar', 'aria-label': ariaLabel,
  menuMinWidth, searchThreshold = 8, children, onClick, onKeyDown: userKeyDown, ...rest
}) => {
  const options = useMemo(() => collectOptions(children), [children]);
  const current = value === null || value === undefined ? '' : String(value);
  const selected = options.find(o => o.value === current);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchable = options.length > searchThreshold;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.text.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  const pick = (opt: FlatOption) => {
    if (opt.disabled) return;
    onChange?.({
      target: { value: opt.value, name },
      currentTarget: { value: opt.value, name },
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
    close();
    anchorRef.current?.focus();
  };

  // Ao abrir, a opcao ativa e a selecionada
  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex(o => o.value === current);
    setActive(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    userKeyDown?.(e as React.KeyboardEvent<HTMLButtonElement>);
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = filtered[active]; if (o) pick(o); }
    else if (e.key === 'Tab') close();
    else if (!searchable && e.key.length === 1) {
      // Digitar vai para a primeira opcao que comeca com a letra
      const idx = filtered.findIndex(o => o.text.toLowerCase().startsWith(e.key.toLowerCase()));
      if (idx >= 0) setActive(idx);
    }
  };

  let lastGroup: string | undefined;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        id={id}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
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
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selected && selected.value !== '' ? 'inherit' : selected ? 'var(--adm-text-muted)' : 'var(--adm-text-muted)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} color="var(--adm-text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      <PopoverPanel anchorRef={anchorRef} open={open} onClose={close} minWidth={menuMinWidth} maxHeight={320}>
        {searchable && (
          <div style={{ padding: '8px', borderBottom: '1px solid var(--adm-border)', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
            <input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder="Buscar"
              className="adm-input"
              style={{ width: '100%', height: '32px', borderRadius: '8px', paddingLeft: '28px', fontSize: '0.78rem' }}
            />
          </div>
        )}
        <div ref={listRef} role="listbox" style={{ overflowY: 'auto', padding: '4px' }}>
          {filtered.length === 0 && <div style={{ padding: '10px', fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>Nada encontrado</div>}
          {filtered.map((o, i) => {
            const header = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            const isSel = o.value === current;
            return (
              <React.Fragment key={`${o.value}-${i}`}>
                {header && <div style={{ padding: '8px 10px 3px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)' }}>{header}</div>}
                <div
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled}
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(o)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', borderRadius: '8px',
                    fontSize: '0.8rem', cursor: o.disabled ? 'not-allowed' : 'pointer', opacity: o.disabled ? 0.45 : 1,
                    background: i === active ? 'var(--adm-accent-bg, rgba(20,169,215,0.14))' : 'transparent',
                    color: 'var(--adm-text-title)', fontWeight: isSel ? 800 : 500,
                  }}
                >
                  <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
                  {isSel && <Check size={14} color="var(--adm-accent)" style={{ flexShrink: 0 }} />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </PopoverPanel>
    </>
  );
};
