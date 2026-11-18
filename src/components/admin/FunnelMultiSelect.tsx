import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface FunnelOption {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  options: FunnelOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Ids sempre marcados e que nao podem ser desmarcados (ex.: funil de origem). */
  lockedIds?: string[];
  lockedLabel?: string;
  placeholder?: string;
  /** Mostra o campo de busca quando houver mais opcoes que isto. */
  searchThreshold?: number;
}

/** Multiselect com busca: etiquetas removiveis, marcar todos/limpar e fecha ao clicar fora. */
export const FunnelMultiSelect: React.FC<Props> = ({
  options, value, onChange, lockedIds = [], lockedLabel = 'Origem', placeholder = 'Selecionar funis', searchThreshold = 6,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const selectable = useMemo(() => options.filter(o => !lockedIds.includes(o.id)), [options, lockedIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.name.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const selectedOptions = options.filter(o => value.includes(o.id));
  const toggle = (id: string) => {
    if (lockedIds.includes(id)) return;
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  };
  const selectedCount = value.filter(v => !lockedIds.includes(v)).length;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="adm-input"
        style={{
          width: '100%', minHeight: '44px', borderRadius: '10px', padding: '0 14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', textAlign: 'left',
        }}
      >
        <span style={{ color: selectedCount > 0 ? 'var(--adm-text-title)' : 'var(--adm-text-muted)', fontWeight: selectedCount > 0 ? 700 : 500 }}>
          {selectedCount > 0 ? `${selectedCount} ${selectedCount === 1 ? 'funil selecionado' : 'funis selecionados'}` : placeholder}
        </span>
        <ChevronDown size={16} color="var(--adm-text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 50, left: 0, right: 0, top: 'calc(100% + 6px)', maxHeight: '320px', display: 'flex', flexDirection: 'column',
          background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', boxShadow: '0 12px 28px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}>
          {options.length > searchThreshold && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--adm-border)', position: 'relative' }}>
              <Search size={14} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar funil..."
                className="adm-input"
                style={{ width: '100%', height: '34px', paddingLeft: '32px', borderRadius: '8px', fontSize: '0.8rem', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
            <button type="button" onClick={() => onChange([...new Set([...value, ...selectable.map(o => o.id)])])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-accent)', fontWeight: 700 }}>
              Marcar todos
            </button>
            <button type="button" onClick={() => onChange(value.filter(v => lockedIds.includes(v)))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
              Limpar
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '0 6px 8px 6px' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Nenhum funil encontrado.</div>
            )}
            {filtered.map(o => {
              const locked = lockedIds.includes(o.id);
              const checked = locked || value.includes(o.id);
              return (
                <div
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: locked ? 'default' : 'pointer',
                    background: checked ? 'rgba(16, 185, 129, 0.10)' : 'transparent', opacity: locked ? 0.85 : 1,
                  }}
                >
                  <span style={{
                    width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: checked ? '1.5px solid #10B981' : '1.5px solid var(--adm-border)', background: checked ? '#10B981' : 'transparent',
                  }}>
                    {checked && <Check size={12} color="#fff" />}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</span>
                  {locked && <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>{lockedLabel}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
          {selectedOptions.map(o => {
            const locked = lockedIds.includes(o.id);
            return (
              <span key={o.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.35)',
              }}>
                {o.name}{locked ? ` (${lockedLabel.toLowerCase()})` : ''}
                {!locked && (
                  <button type="button" onClick={() => toggle(o.id)} aria-label={`Remover ${o.name}`} style={{ display: 'inline-flex', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}>
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
