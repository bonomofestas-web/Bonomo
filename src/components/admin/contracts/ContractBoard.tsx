import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAdminState } from '../../../context/AdminStateContext';
import { buildVenueAccentMap } from '../../../utils/venueColors';
import type { ContractFillStage } from '../../../types/admin';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d?: string | null) => { if (!d) return 'sem data'; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; };

/** Etapas do fechamento, na ordem do quadro. Tela unica para comercial (edita) e financeiro (so abre em "Preenchido"). */
export const FILL_STAGES: Array<{ id: ContractFillStage; label: string; hint: string; color: string }> = [
  { id: 'pendente', label: 'Novo contrato', hint: 'Venda feita, faltam dados e documentos', color: '#3B82F6' },
  { id: 'juntando_documentos', label: 'Preparando documento', hint: 'Montando o contrato e reunindo comprovantes', color: '#F59E0B' },
  { id: 'aguardando_assinatura', label: 'Aguardando assinatura', hint: 'Contrato enviado, cliente vai assinar', color: '#8B5CF6' },
  { id: 'preenchido', label: 'Preenchido', hint: 'Pronto: o financeiro já pode abrir', color: '#10B981' },
];

export interface BoardCard {
  id: string;
  stage: ContractFillStage;
  title: string;
  payer?: string;
  venueId: string;
  total: number;
  eventDate?: string | null;
  signal?: number;
  entry?: number;
  closer?: string;
  /** Recado do financeiro devolvendo o contrato */
  message?: string;
  /** Quantos itens ainda faltam para "Preenchido" */
  missing?: number;
  /** Importado: nao pode ser reprovado */
  imported?: boolean;
  /** Quando false, o card aparece mas nao abre (ex.: financeiro antes de "Preenchido" abre so leitura) */
  tag?: string;
}

interface Props {
  cards: BoardCard[];
  onOpen: (id: string) => void;
  /** Mensagem quando nao ha nenhum card */
  emptyText?: string;
  /** Altura do quadro; cada etapa rola por dentro (a tela nao rola) */
  height?: string;
}

/** Quadro de contratos por etapa de fechamento (kanban sem arrastar: a etapa muda dentro da ficha). */
export const ContractBoard: React.FC<Props> = ({ cards, onOpen, emptyText, height }) => {
  const { venues } = useAdminState();
  const accents = React.useMemo(() => buildVenueAccentMap(venues), [venues]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(250px, 1fr))', gap: 12, alignItems: 'stretch', height: height || 'calc(100vh - 200px)', minHeight: 360, overflowX: 'auto' }}>
      {FILL_STAGES.map(col => {
        const items = cards.filter(c => c.stage === col.id);
        const sum = items.reduce((a, c) => a + c.total, 0);
        return (
          <div key={col.id} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: `${col.color}0f`, border: `1px solid ${col.color}40`, borderTop: `4px solid ${col.color}`, borderRadius: 12 }}>
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${col.color}33`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: col.color }}>{col.label}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '1px 8px', borderRadius: 999, background: col.color, color: '#fff' }}>{items.length}</span>
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>{col.hint}{items.length > 0 ? ` · ${money(sum)}` : ''}</div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(c => {
                const acc = accents.get(c.venueId);
                return (
                  <div key={c.id} onClick={() => onOpen(c.id)}
                    style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 12px', borderRadius: 10, border: `1px solid ${c.message ? '#E11D48' : 'var(--adm-border)'}`, borderTop: `3px solid ${acc?.color || '#94A3B8'}`, background: 'var(--adm-bg-card, #fff)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: acc?.color, textTransform: 'uppercase' }}>{acc?.label}</span>
                      {c.imported && <ShieldAlert size={13} color="#D97706" />}
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)', lineHeight: 1.25 }}>{c.title}</div>
                    {c.payer && <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>{c.payer}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6 }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{money(c.total)}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>festa {fmtDate(c.eventDate)}</div>
                      </div>
                      {((c.signal || 0) > 0 || (c.entry || 0) > 0) && (
                        <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#047857', textAlign: 'right' }}>
                          {(c.signal || 0) > 0 && <div>Sinal {money(c.signal || 0)}</div>}
                          {(c.entry || 0) > 0 && <div>Entrada {money(c.entry || 0)}</div>}
                        </div>
                      )}
                    </div>
                    {c.closer && <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>Closer: <strong style={{ color: '#0284C7' }}>{c.closer}</strong></div>}
                    {c.message && (
                      <div style={{ fontSize: '0.68rem', color: '#E11D48', fontWeight: 700, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} /> {c.message}
                      </div>
                    )}
                    {c.tag && <span style={{ alignSelf: 'flex-start', fontSize: '0.64rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(2,132,199,0.12)', color: '#0369A1' }}>{c.tag}</span>}
                    {col.id !== 'preenchido' && (c.missing || 0) > 0 && <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>Falta preencher: {c.missing} {(c.missing || 0) === 1 ? 'item' : 'itens'}</div>}
                  </div>
                );
              })}
              {items.length === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', textAlign: 'center', padding: 16 }}>{emptyText || 'Nenhum contrato'}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
