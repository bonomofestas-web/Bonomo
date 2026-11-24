import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, ExternalLink, FileSignature } from 'lucide-react';
import { useAdminState } from '../../../context/AdminStateContext';
import { proposalService } from '../../../services/proposalService';
import { ContractFormModal } from './ContractFormModal';
import type { Proposal } from '../../../types/admin';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d?: string | null) => { if (!d) return ''; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; };
const STATUS: Record<Proposal['status'], { label: string; color: string }> = {
  active: { label: 'Ativa', color: '#0284C7' },
  converted: { label: 'Virou contrato', color: '#059669' },
  lost: { label: 'Perdida', color: '#DC2626' },
};

interface Props {
  lead: { id: string; name?: string; phone?: string; venueId?: string | null; contactId?: string | null };
  onOpenContract?: (contractId: string) => void;
}

/**
 * Propostas do lead (ativo documental do comercial, ligado ao lead e, por ele, ao contato). Ao evoluir, a proposta vira contrato
 * e deixa de ficar ativa. Proposta nao conta como contrato fechado.
 */
export const LeadProposalsSection: React.FC<Props> = ({ lead, onOpenContract }) => {
  const { scopedMasterId, currentUser } = useAdminState();
  const [items, setItems] = useState<Proposal[]>([]);
  const [form, setForm] = useState<{ kind: 'new' | 'convert'; proposal?: Proposal } | null>(null);
  const canEdit = (currentUser?.role || '').toLowerCase() !== 'financeiro';

  const load = useCallback(async () => {
    if (!scopedMasterId || !lead.id) return;
    setItems(await proposalService.list({ masterId: scopedMasterId, leadId: lead.id }));
  }, [scopedMasterId, lead.id]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          <FileText size={13} color="var(--adm-accent)" /> <span>Propostas</span>
        </div>
        {canEdit && (
          <button type="button" onClick={() => setForm({ kind: 'new' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={12} /> Nova proposta
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>Nenhuma proposta neste lead. A proposta gerada na degustação fica aqui e, se fechar, vira contrato.</div>
      ) : items.map(p => (
        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 11px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{p.title}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: '#fff', background: STATUS[p.status].color }}>{STATUS[p.status].label}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
            {p.proposalCode} · {money(p.totalAmount)} · gerada em {fmtDate(p.proposalDate || p.createdAt)}{p.eventDate ? ` · festa ${fmtDate(p.eventDate)}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {p.fileUrl && <a href={p.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}><ExternalLink size={12} /> Arquivo</a>}
            {p.status === 'active' && canEdit && (
              <button type="button" onClick={() => setForm({ kind: 'convert', proposal: p })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, border: 'none', background: 'none', fontSize: '0.72rem', fontWeight: 800, color: '#0284C7', cursor: 'pointer' }}>
                <FileSignature size={12} /> Virar contrato
              </button>
            )}
            {p.status === 'converted' && p.convertedContractId && onOpenContract && (
              <button type="button" onClick={() => onOpenContract(p.convertedContractId!)} style={{ padding: 0, border: 'none', background: 'none', fontSize: '0.72rem', fontWeight: 800, color: '#059669', cursor: 'pointer' }}>Abrir contrato</button>
            )}
            {p.status === 'lost' && p.lostReason && <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>Motivo: {p.lostReason}</span>}
          </div>
        </div>
      ))}

      {form && (
        <ContractFormModal
          mode="create"
          masterId={scopedMasterId || ''}
          proposalMode={form.kind === 'new'}
          proposal={form.proposal}
          leadRef={{ leadId: lead.id, contactId: lead.contactId, name: lead.name, phone: lead.phone, venueId: lead.venueId }}
          onClose={() => setForm(null)}
          onSavedProposal={() => { setForm(null); void load(); }}
          onSaved={(created) => { setForm(null); void load(); onOpenContract?.(created.id); }}
        />
      )}
    </div>
  );
};
