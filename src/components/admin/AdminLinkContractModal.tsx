import React, { useEffect, useRef, useState } from 'react';
import { X, Search, FileText, Loader2, Building2, Calendar, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { contractService } from '../../services/contractService';
import { formatPhone } from '../../utils/phoneFormatter';
import type { Contract } from '../../types/admin';

interface Props {
  isOpen: boolean;
  clientId: string;
  masterId: string;
  /** Unidade do funil: o pop-up so mostra contratos dessa unidade */
  venueId?: string;
  venueName?: string;
  /** Celulares e CPF do cliente: os contratos deles aparecem logo ao abrir */
  phones?: Array<string | null | undefined>;
  cpf?: string | null;
  onClose: () => void;
  /** Recebe os campos do contrato copiados para o card (para atualizar a tela na hora). */
  onLinked: (patch: Record<string, any>) => void;
}

const fmtDate = (d?: string) => {
  if (!d) return 'Data a definir';
  const [y, m, day] = d.split('T')[0].split('-');
  return y && m && day ? `${day}/${m}/${y}` : d;
};

/**
 * Vincula um contrato aprovado do sistema (ainda sem cliente) ao card de cliente aberto.
 * Ao abrir, busca os contratos do celular ou CPF do cliente (ou avisa que nao ha nenhum). A busca livre procura por
 * contratante, contrato, aniversariante, CPF, celular e data do evento, sempre na unidade do funil.
 */
export const AdminLinkContractModal: React.FC<Props> = ({ isOpen, clientId, masterId, venueId, venueName, phones, cpf, onClose, onLinked }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Contract[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);
  const phonesKey = (phones || []).map(p => String(p || '').replace(/\D/g, '')).join('|');

  useEffect(() => { if (isOpen) { setTerm(''); setResults([]); setPicked(null); } }, [isOpen]);

  // Sem texto: contratos do celular/CPF do cliente. Com texto: busca livre no banco (escopado por Master e unidade)
  useEffect(() => {
    if (!isOpen || picked) return;
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const rows = await contractService.searchLinkableContracts(masterId, term.trim(), venueId, { phones, cpf });
      if (mine === seq.current) { setResults(rows); setSearching(false); }
    }, term.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [term, isOpen, picked, masterId, venueId, phonesKey, cpf]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const confirm = async () => {
    if (!picked) return;
    setSaving(true);
    const res = await contractService.linkContractToClient({ contractId: picked.id, clientId, masterId });
    setSaving(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível vincular o contrato.'); return; }
    toast.success('Contrato vinculado ao cliente.');
    onLinked(res.patch || {});
    onClose();
  };

  const titleOf = (c: Contract) => c.contractTitle || c.title || c.eventTitle || c.contractCode;
  const searchingText = term.trim().length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--adm-text-title)' }}><FileText size={16} /> Vincular contrato</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={18} /></button>
        </div>

        {!picked ? (
          <>
            {venueName && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(2,132,199,0.12)', color: '#0369A1' }}>
                <Building2 size={12} /> Contratos da unidade {venueName}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--adm-text-muted)' }} />
              <input className="adm-input" autoFocus value={term} onChange={e => setTerm(e.target.value)}
                placeholder="Contratante, contrato, aniversariante, CPF, celular ou data do evento"
                style={{ width: '100%', height: 38, paddingLeft: 30, boxSizing: 'border-box', fontSize: '0.8rem' }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
              Data do evento: dd/mm/aaaa. Cada casa tem no máximo um evento por noite, então a data identifica o contrato.
            </div>

            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}>
              {searchingText ? 'Resultado da busca' : 'Contratos deste celular ou CPF'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 70, maxHeight: 320, overflowY: 'auto' }}>
              {searching && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}><Loader2 size={14} className="animate-spin" /> Buscando...</div>}
              {!searching && results.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', padding: '10px 0' }}>
                  {searchingText ? 'Nenhum contrato encontrado nesta unidade para essa busca.' : 'Nenhum contrato encontrado para este celular ou CPF. Use a busca acima para procurar por outro dado.'}
                </div>
              )}
              {results.map(c => {
                const snap = (c.clientSnapshot || {}) as any;
                return (
                  <button key={c.id} type="button" onClick={() => setPicked(c)}
                    style={{ textAlign: 'left', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titleOf(c)}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: 3 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Calendar size={11} /> {fmtDate(c.eventDate)}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><User size={11} /> {snap.payerName || snap.name || 'Contratante'}{snap.birthdayPersonName ? ` · ${snap.birthdayPersonName}` : ''}</span>
                      {snap.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Phone size={11} /> {formatPhone(snap.phone) || snap.phone}</span>}
                      <span>{c.contractCode}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--adm-text-title)' }}>{titleOf(picked)}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>
                {fmtDate(picked.eventDate)} · {picked.guestCount || 0} convidados · {picked.venueName || 'Unidade'}
              </div>
              <button type="button" onClick={() => setPicked(null)} style={{ marginTop: 6, fontSize: '0.7rem', color: '#0284C7', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Trocar contrato</button>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', lineHeight: 1.45 }}>
              Ao confirmar, o nome do contrato passa a ser o título da ficha, e tipo do evento, data, convidados, pacote e valor são preenchidos a partir dele.
              Os arquivos do contrato aparecem em Documentos Contratuais.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', color: 'var(--adm-text-title)' }}>Cancelar</button>
              <button type="button" disabled={saving} onClick={confirm} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#0284C7', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Vinculando...' : 'Confirmar vínculo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
