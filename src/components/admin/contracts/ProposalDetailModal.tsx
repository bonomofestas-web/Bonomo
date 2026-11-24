import React, { useState } from 'react';
import { X, FileText, ExternalLink, Pencil, FileSignature, Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../../context/AdminStateContext';
import { proposalService } from '../../../services/proposalService';
import type { Proposal } from '../../../types/admin';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d?: string | null) => { if (!d) return 'sem data'; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; };
const EVENT_LABEL: Record<string, string> = { '15_anos': '15 Anos', casamento: 'Casamento', aniversario: 'Aniversário', bodas: 'Bodas', corporativo: 'Corporativo', outro: 'Outro' };

interface Props {
  proposal: Proposal;
  masterId: string;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (p: Proposal) => void;
  onConvert: (p: Proposal) => void;
  onChanged: () => void;
}

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.8rem', padding: '6px 0', borderBottom: '1px solid var(--adm-border)' }}>
    <span style={{ color: 'var(--adm-text-muted)', fontWeight: 700 }}>{label}</span>
    <span style={{ color: 'var(--adm-text-title)', fontWeight: 600, textAlign: 'right' }}>{value || '-'}</span>
  </div>
);

/** Detalhe da proposta: dados, arquivo e as tres saidas (editar, virar contrato, perder). Proposta nao e venda fechada. */
export const ProposalDetailModal: React.FC<Props> = ({ proposal, masterId, canEdit, onClose, onEdit, onConvert, onChanged }) => {
  const { venues } = useAdminState();
  const [lostMode, setLostMode] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const snap = proposal.clientSnapshot || {};
  const venue = venues.find(v => v.id === proposal.venueId)?.name;

  const markLost = async () => {
    setBusy(true);
    try {
      await proposalService.markLost(proposal.id, masterId, reason.trim() || undefined);
      toast.success('Proposta marcada como perdida.');
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível atualizar a proposta.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--adm-border)' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(100,116,139,0.14)', color: '#64748B', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{proposal.title}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{proposal.proposalCode} · proposta gerada em {fmtDate(proposal.proposalDate || proposal.createdAt)}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: '1px solid var(--adm-border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--adm-text-muted)', display: 'inline-flex' }}><X size={16} /></button>
        </header>

        <div style={{ padding: '14px 18px', overflowY: 'auto' }}>
          <Row label="Unidade" value={venue} />
          <Row label="Contratante" value={snap.payerName || snap.name} />
          <Row label="Telefone" value={snap.phone} />
          <Row label="Tipo de evento" value={EVENT_LABEL[proposal.eventType] || proposal.eventType} />
          <Row label="Data da festa" value={fmtDate(proposal.eventDate)} />
          <Row label="Convidados" value={proposal.guestCount || undefined} />
          <Row label="Pacote" value={proposal.packageName} />
          <Row label="Valor da proposta" value={<strong>{money(proposal.totalAmount)}</strong>} />
          {proposal.paymentSummary && <Row label="Pagamento" value={<span style={{ whiteSpace: 'pre-line' }}>{proposal.paymentSummary}</span>} />}
          {proposal.notes && <Row label="Observações" value={<span style={{ whiteSpace: 'pre-line' }}>{proposal.notes}</span>} />}
          {proposal.fileUrl && (
            <a href={proposal.fileUrl} target="_blank" rel="noreferrer" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}>
              <ExternalLink size={14} /> Abrir o arquivo da proposta
            </a>
          )}
          <p style={{ margin: '14px 0 0', fontSize: '0.72rem', color: 'var(--adm-text-muted)', lineHeight: 1.45 }}>
            Proposta não conta como contrato fechado. Ao virar contrato ela é encerrada e o contrato nasce na etapa inicial do fechamento.
          </p>
          {lostMode && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Motivo (opcional)</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Ex.: fechou em outra casa, desistiu da festa..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontFamily: 'inherit', fontSize: '0.84rem' }} />
            </div>
          )}
        </div>

        {canEdit && (
          <footer style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--adm-border)' }}>
            {lostMode ? (
              <>
                <button type="button" disabled={busy} onClick={() => setLostMode(false)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontWeight: 700, cursor: 'pointer' }}>Voltar</button>
                <button type="button" disabled={busy} onClick={markLost} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Confirmar perda
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setLostMode(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: '#DC2626', fontWeight: 700, cursor: 'pointer' }}><Ban size={14} /> Perdida</button>
                <button type="button" onClick={() => onEdit(proposal)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontWeight: 700, cursor: 'pointer' }}><Pencil size={14} /> Editar</button>
                <button type="button" onClick={() => onConvert(proposal)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0284C7', color: '#fff', fontWeight: 800, cursor: 'pointer' }}><FileSignature size={14} /> Virar contrato</button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};
