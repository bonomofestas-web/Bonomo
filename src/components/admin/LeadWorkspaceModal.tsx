import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';

export interface WorkspaceItem {
  /** Identificador do item (tarefa, proposta...) */
  key: string;
  leadId: string;
  funnelId?: string;
  title: string;
  subtitle?: string;
  /** Item ja resolvido (esconde o botao de concluir) */
  done?: boolean;
}

interface Props {
  items: WorkspaceItem[];
  startIndex?: number;
  onClose: () => void;
  /** "Concluir e ir para a proxima": o chamador marca o item como feito; o painel avanca sozinho */
  onComplete?: (item: WorkspaceItem) => void;
  completeLabel?: string;
  /** Faixa extra logo abaixo do titulo (ex.: dados da proposta) */
  headerExtra?: (item: WorkspaceItem) => React.ReactNode;
}

const iconBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8,
  border: '1px solid var(--adm-border)', background: 'transparent', color: disabled ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
});

/**
 * Painel grande sobre a tela atual: titulo do item no topo, ficha do lead de um lado e o WhatsApp completo do outro (sem a lista
 * de conversas). Seta para pular para o proximo item, que ja abre o lead dele. Serve para resolver follow-ups sem sair da tela
 * inicial e para conversar com o lead de uma proposta.
 */
export const LeadWorkspaceModal: React.FC<Props> = ({ items, startIndex = 0, onClose, onComplete, completeLabel = 'Concluir e ir para a próxima', headerExtra }) => {
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0)));
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const item = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;
  const isDone = item.done || doneKeys.has(item.key);

  const complete = () => {
    onComplete?.(item);
    setDoneKeys(prev => new Set(prev).add(item.key));
    if (hasNext) setIndex(index + 1); else onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: '3vh 3vw', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
            {item.subtitle && <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</div>}
          </div>
          {items.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" onClick={() => hasPrev && setIndex(index - 1)} disabled={!hasPrev} aria-label="Item anterior" title="Anterior" style={iconBtn(!hasPrev)}><ChevronLeft size={17} /></button>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)', minWidth: 44, textAlign: 'center' }}>{index + 1} de {items.length}</span>
              <button type="button" onClick={() => hasNext && setIndex(index + 1)} disabled={!hasNext} aria-label="Próximo item" title="Próximo" style={iconBtn(!hasNext)}><ChevronRight size={17} /></button>
            </div>
          )}
          {onComplete && !isDone && (
            <button type="button" onClick={complete} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <Check size={14} /> {hasNext ? completeLabel : 'Concluir'}
            </button>
          )}
          {isDone && <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669' }}>Concluída</span>}
          <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar (Esc)" style={iconBtn(false)}><X size={16} /></button>
        </header>
        {headerExtra && <div style={{ flexShrink: 0, borderBottom: '1px solid var(--adm-border)' }}>{headerExtra(item)}</div>}
        <div style={{ flex: 1, minHeight: 0 }}>
          {/* key = lead: ao pular para o proximo item o painel reabre ja no lead dele */}
          <AdminWhatsAppWorkspaceView key={item.leadId} initialLeadId={item.leadId} activeFunnelId={item.funnelId} isEmbeddedInFunnel hideConversationList />
        </div>
      </div>
    </div>
  );
};
