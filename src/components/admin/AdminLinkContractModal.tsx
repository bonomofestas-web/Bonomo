import React, { useEffect, useRef, useState } from 'react';
import { X, Search, FileText, Loader2, Building2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { contractService } from '../../services/contractService';
import type { Contract } from '../../types/admin';

interface Props {
  isOpen: boolean;
  clientId: string;
  masterId: string;
  venueId?: string;
  onClose: () => void;
  /** Recebe os campos do contrato copiados para o card (para atualizar a tela na hora). */
  onLinked: (patch: Record<string, any>) => void;
}

const fmtDate = (d?: string) => {
  if (!d) return 'Data a definir';
  const [y, m, day] = d.split('T')[0].split('-');
  return y && m && day ? `${day}/${m}/${y}` : d;
};

/** Vincula um contrato aprovado do sistema (ainda sem cliente) ao card de cliente aberto. */
export const AdminLinkContractModal: React.FC<Props> = ({ isOpen, clientId, masterId, venueId, onClose, onLinked }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Contract[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  useEffect(() => { if (isOpen) { setTerm(''); setResults([]); setPicked(null); } }, [isOpen]);

  // Lista os mais recentes ao abrir e filtra no banco ao digitar (escopado por Master)
  useEffect(() => {
    if (!isOpen || picked) return;
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const rows = await contractService.searchLinkableContracts(masterId, term.trim(), venueId);
      if (mine === seq.current) { setResults(rows); setSearching(false); }
    }, term.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [term, isOpen, picked, masterId, venueId]);

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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--adm-text-title)' }}><FileText size={16} /> Vincular contrato</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={18} /></button>
        </div>

        {!picked ? (
          <>
            <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
              Contratos aprovados que ainda não têm cliente. Busque pelo nome do contrato, do contratante, telefone ou código.
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--adm-text-muted)' }} />
              <input className="adm-input" autoFocus value={term} onChange={e => setTerm(e.target.value)} placeholder="Buscar contrato"
                style={{ width: '100%', height: 38, paddingLeft: 30, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 70, maxHeight: 320, overflowY: 'auto' }}>
              {searching && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}><Loader2 size={14} className="animate-spin" /> Buscando...</div>}
              {!searching && results.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Nenhum contrato disponível para vincular.</div>}
              {results.map(c => (
                <button key={c.id} type="button" onClick={() => setPicked(c)}
                  style={{ textAlign: 'left', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titleOf(c)}</div>
                  <div style={{ display: 'flex', gap: 10, fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Calendar size={11} /> {fmtDate(c.eventDate)}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Building2 size={11} /> {c.venueName || 'Unidade'}</span>
                  </div>
                </button>
              ))}
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
