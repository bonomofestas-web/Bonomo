import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, X, FileText, Target, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { contactConversionService, type ConversionImpact, type ConversionTarget } from '../../../services/contactConversionService';

interface Props {
  masterId: string;
  contact: { id: string; name: string; primaryPhone?: string; whatsappPhone?: string; email?: string };
  target: ConversionTarget;
  by: { id?: string; name?: string };
  onClose: () => void;
  /** Transicao concluida */
  onDone: (target: ConversionTarget) => void;
}

/**
 * Aviso e confirmacao para transformar um contato em fornecedor ou colaborador.
 * Bloqueia quando ha contrato registrado; senao mostra o que sera perdido (leads comerciais e clientes de pos-venda sem contrato).
 */
export const ConvertContactModal: React.FC<Props> = ({ masterId, contact, target, by, onClose, onDone }) => {
  const [impact, setImpact] = useState<ConversionImpact | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = target === 'supplier' ? 'fornecedor' : 'colaborador';

  useEffect(() => {
    let alive = true;
    void contactConversionService.getImpact(masterId, contact).then(r => { if (alive) setImpact(r); });
    return () => { alive = false; };
  }, [masterId, contact.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocked = Boolean(impact && impact.contracts.length > 0);
  const lossCount = impact ? impact.leads.length + impact.clients.length : 0;
  const canConfirm = Boolean(impact) && !blocked && (lossCount === 0 || ack) && !busy;

  const confirm = async () => {
    setBusy(true);
    const res = await contactConversionService.convert({ masterId, contactId: contact.id, contactPhone: contact.primaryPhone, whatsappPhone: contact.whatsappPhone, target, by });
    setBusy(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível transformar o contato.'); return; }
    toast.success(`Contato transformado em ${label}.${res.lostLeads || res.lostClients ? ` ${(res.lostLeads || 0) + (res.lostClients || 0)} ativo(s) marcado(s) como perdido(s).` : ''}`);
    onDone(target);
  };

  const box = (color: string, bg: string): React.CSSProperties => ({ border: `1px solid ${color}`, background: bg, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(2,6,23,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Transformar em {label}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>{contact.name}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={18} /></button>
        </div>

        {!impact && <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Verificando os ativos deste contato...</div>}

        {blocked && impact && (
          <div style={box('#E11D48', 'rgba(225,29,72,0.07)')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#E11D48', fontSize: '0.84rem' }}><ShieldAlert size={16} /> Não é possível transformar</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>Quem tem contrato registrado não pode virar {label}. Contratos deste contato:</div>
            {impact.contracts.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: 'var(--adm-text-title)' }}><FileText size={13} /> <strong>{c.code}</strong> · {c.title}{c.venueName ? ` · ${c.venueName}` : ''}</div>
            ))}
          </div>
        )}

        {impact && !blocked && (
          <>
            <div style={box('#F59E0B', 'rgba(245,158,11,0.09)')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#B45309', fontSize: '0.84rem' }}><AlertTriangle size={16} /> Atenção</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', lineHeight: 1.45 }}>
                {target === 'supplier'
                  ? 'O contato passa a ser fornecedor (ficha, orçamentos e aba Fornecedores nas Mensagens).'
                  : 'O contato será cadastrado como colaborador: você segue para o cadastro da equipe com os dados dele.'}{' '}
                Os ativos em andamento abaixo serão <strong>marcados como perdidos</strong>.
              </div>
            </div>

            {lossCount === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Nenhum lead ou cliente em andamento será perdido.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {impact.leads.map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: 'var(--adm-text-title)' }}><Target size={13} color="#0284C7" /> Lead comercial <strong>{l.name}</strong>{l.funnelName ? ` · ${l.funnelName}` : ''}{l.stageName ? ` (${l.stageName})` : ''}</div>
                ))}
                {impact.clients.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: 'var(--adm-text-title)' }}><Heart size={13} color="#EC4899" /> Cliente de pós-venda <strong>{c.name}</strong>{c.funnelName ? ` · ${c.funnelName}` : ''} (sem contrato)</div>
                ))}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} style={{ marginTop: 2 }} />
                  Entendo que {lossCount} {lossCount === 1 ? 'ativo será perdido' : 'ativos serão perdidos'} e que isso não é desfeito automaticamente.
                </label>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{blocked ? 'Fechar' : 'Cancelar'}</button>
          {!blocked && (
            <button type="button" disabled={!canConfirm} onClick={confirm}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#D97706', color: '#fff', fontWeight: 800, fontSize: '0.78rem', cursor: canConfirm ? 'pointer' : 'not-allowed', opacity: canConfirm ? 1 : 0.5 }}>
              {busy ? 'Transformando...' : `Confirmar: virar ${label}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
