import React, { useState } from 'react';
import { X, FileText, Calendar, Building2, Users, ShieldCheck, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import type { Contract } from '../../types/admin';
import { getContractDocuments } from '../../utils/contractDocuments';
import { EVENT_KIND_LABEL, normalizeEventKind } from '../../utils/contractTitle';
import { useAdminState } from '../../context/AdminStateContext';
import { canViewContractDocument } from '../../utils/accessPermissions';
import { paymentTextLines } from '../../utils/paymentPlan';
import { PaymentTextList } from './contracts/PaymentTextList';
import { SafeAvatar } from './SafeAvatar';

interface Props {
  contract: Contract | null;
  onClose: () => void;
  /** Dados do evento na agenda (horario) quando aberto pela Agenda de Eventos */
  eventStart?: string;
  eventEnd?: string;
  /** Botao 'Acessar contrato' (so passe quando o usuario tem permissao) */
  onAccessContract?: () => void;
  /** Botao 'Editar evento' (so quem administra a agenda) */
  onEditEvent?: () => void;
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
export const ContractQuickViewModal: React.FC<Props> = ({ contract, onClose, eventStart, eventEnd, onAccessContract, onEditEvent }) => {
  const { currentUser, collaborators } = useAdminState();
  const [showPayment, setShowPayment] = useState(false);
  if (!contract) return null;
  const canSeeDocs = canViewContractDocument(currentUser);
  const snap = contract.clientSnapshot || ({} as Contract['clientSnapshot']);
  // O documento assinado so abre para financeiro, pos-venda e gerencia (comercial, SDR e closer nao)
  const files = canSeeDocs ? getContractDocuments(contract) : [];
  const paymentLines = paymentTextLines(contract.paymentSummary);
  const person = (id?: string | null, name?: string | null) => {
    const found = (id ? collaborators.find(x => x.id === id) : undefined) || (name ? collaborators.find(x => x.name === name) : undefined);
    return { name: found?.name || name || '', avatar: found?.avatarUrl || undefined };
  };
  const team: Array<[string, { name: string; avatar?: string }]> = [['SDR', person(contract.sdrId, contract.sdrName)], ['Closer', person(contract.closerId, contract.closerName)]];

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
          {eventStart && <Row label="Horário" value={eventEnd ? eventStart + ' às ' + eventEnd : 'a partir das ' + eventStart} />}
          {(contract.eventType || '') !== '' && <Row label="Tipo" value={EVENT_KIND_LABEL[normalizeEventKind(contract.eventType)]} />}
          {(snap as any).birthdayPersonName && <Row label="Homenageado" value={(snap as any).birthdayPersonName} />}
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
          <Row label="Valor total" value={<span style={{ fontSize: '0.95rem' }}>{money(contract.totalAmount)}</span>} />
          <button type="button" onClick={() => setShowPayment(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800, color: '#0284C7', textAlign: 'left' }}>
            {showPayment ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {showPayment ? 'Ocultar plano de pagamento' : 'Ver plano de pagamento'}
          </button>
          {showPayment && (
            <div style={{ padding: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row label="Sinal" value={money(contract.signalAmount)} />
              <Row label="Entrada" value={money(contract.entryAmount)} />
              <Row label="Saldo restante" value={money(contract.balanceAmount)} />
              {paymentLines.length > 0 && (
                <div style={{ paddingTop: 6 }}>
                  <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)', marginBottom: 4 }}>Como o cliente vai pagar</div>
                  <PaymentTextList lines={paymentLines} fontSize="0.76rem" />
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 6 }}>
            {team.map(([role, pe]) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--adm-border)' }}>
                {pe.name ? <SafeAvatar src={pe.avatar} name={pe.name} size={38} /> : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--adm-border)' }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}>{role}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: pe.name ? 'var(--adm-text-title)' : 'var(--adm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pe.name || 'Não atribuído'}</div>
                </div>
              </div>
            ))}
          </div>
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
        {(onAccessContract || onEditEvent) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            {onEditEvent && (
              <button type="button" onClick={onEditEvent} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Editar evento</button>
            )}
            {onAccessContract && (
              <button type="button" onClick={onAccessContract} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#0284C7', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800 }}>Acessar contrato</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
