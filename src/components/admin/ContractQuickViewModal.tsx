import React from 'react';
import { X, FileText, Calendar, Building2, Users, ShieldCheck, ExternalLink } from 'lucide-react';
import type { Contract } from '../../types/admin';

interface Props {
  contract: Contract | null;
  onClose: () => void;
}

const money = (v?: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
const fmtDate = (d?: string) => {
  if (!d) return 'Data a definir';
  const [y, m, day] = d.split('T')[0].split('-');
  return y && m && day ? `${day}/${m}/${y}` : d;
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--adm-border)', fontSize: '0.78rem' }}>
    <span style={{ color: 'var(--adm-text-muted)' }}>{label}</span>
    <strong style={{ color: 'var(--adm-text-title)', textAlign: 'right' }}>{value}</strong>
  </div>
);

/** Visualizacao rapida do CONTRATO DO SISTEMA (dados e snapshot), nao o PDF. */
export const ContractQuickViewModal: React.FC<Props> = ({ contract, onClose }) => {
  if (!contract) return null;
  const snap = contract.clientSnapshot || ({} as Contract['clientSnapshot']);
  const files = [
    ...(contract.contractFileUrl ? [{ name: 'Contrato assinado', url: contract.contractFileUrl }] : []),
    ...(contract.paymentFileUrl ? [{ name: 'Comprovante de sinal', url: contract.paymentFileUrl }] : []),
    ...((contract.attachments || []).map(a => ({ name: a.name, url: a.url }))),
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--adm-text-title)' }}>
              <FileText size={16} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{contract.contractTitle || contract.title || contract.eventTitle}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>{contract.contractCode} · Aprovado e imutável</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={18} /></button>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><Calendar size={13} color="#06B6D4" /> Evento</div>
          <Row label="Data" value={fmtDate(contract.eventDate)} />
          <Row label="Convidados" value={contract.guestCount || 0} />
          <Row label="Pacote" value={contract.packageName || '—'} />
          <Row label="Unidade" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={12} />{contract.venueName || '—'}</span>} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><Users size={13} color="#8B5CF6" /> Contratante</div>
          <Row label="Nome" value={(snap as any).payerName || snap.name || contract.contact?.name || '—'} />
          <Row label="Telefone" value={snap.phone || contract.contact?.primaryPhone || '—'} />
          {snap.email && <Row label="E-mail" value={snap.email} />}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><ShieldCheck size={13} color="#10B981" /> Valores e responsáveis</div>
          <Row label="Total" value={money(contract.totalAmount)} />
          <Row label="Entrada" value={money(contract.entryAmount)} />
          <Row label="Saldo" value={money(contract.balanceAmount)} />
          <Row label="SDR" value={contract.sdrName || '—'} />
          <Row label="Closer" value={contract.closerName || '—'} />
          <Row label="Aprovado por" value={contract.approvedByName || '—'} />
        </div>

        {files.length > 0 && (
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}>Arquivos</div>
            {files.map((f, i) => (
              <a key={`${f.url}-${i}`} href={f.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.76rem', color: '#0284C7', textDecoration: 'none' }}>
                <span>{f.name}</span><ExternalLink size={12} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
