import React, { useState } from 'react';
import { Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export interface SideItem { id: string; title: string; sub: string; right: string; color?: string }

/** Lista recuada de contratos: ao selecionar, recolhe e a ficha ocupa a area de conteudo. */
export const ContractSideList: React.FC<{ items: SideItem[]; selectedId: string | null; onSelect: (id: string) => void; collapsed: boolean; onToggle: () => void }> = ({ items, selectedId, onSelect, collapsed, onToggle }) => {
  const [q, setQ] = useState('');
  const shown = items.filter(i => !q.trim() || `${i.title} ${i.sub}`.toLowerCase().includes(q.trim().toLowerCase()));
  if (collapsed) {
    return (
      <div style={{ width: 44, flexShrink: 0, borderRight: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10, gap: 8 }}>
        <button type="button" onClick={onToggle} title="Mostrar contratos" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><PanelLeftOpen size={18} /></button>
        <span style={{ writingMode: 'vertical-rl', fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contratos ({items.length})</span>
      </div>
    );
  }
  return (
    <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar contrato" style={{ width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px 0 28px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.78rem', outline: 'none' }} />
        </div>
        <button type="button" onClick={onToggle} title="Recolher lista" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><PanelLeftClose size={18} /></button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {shown.map(i => (
          <div key={i.id} onClick={() => onSelect(i.id)} style={{ padding: '10px 12px', cursor: 'pointer', borderLeft: `4px solid ${i.color || 'transparent'}`, background: i.id === selectedId ? 'rgba(2,132,199,0.10)' : 'transparent', borderBottom: '1px solid var(--adm-border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.sub}</span><strong>{i.right}</strong></div>
          </div>
        ))}
        {shown.length === 0 && <div style={{ padding: 16, fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>Nenhum contrato.</div>}
      </div>
    </div>
  );
};
