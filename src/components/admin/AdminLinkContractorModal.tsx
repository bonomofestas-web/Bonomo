import React, { useEffect, useRef, useState } from 'react';
import { X, Search, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../context/AdminStateContext';
import { contractService } from '../../services/contractService';
import { formatPhone } from '../../utils/phoneFormatter';
import { Select } from '../ui';
import type { Contract } from '../../types/admin';

interface Props {
  /** Lead solto (sem contrato) que sera vinculado */
  leadId: string | null;
  onClose: () => void;
}

const KINSHIPS = ['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Madrinha', 'Outro'];

/** Vincula um lead solto ao contratante de um contrato: o numero vira dependente/participante do card. */
export const AdminLinkContractorModal: React.FC<Props> = ({ leadId, onClose }) => {
  const { leads, mergeLeads, scopedMasterId } = useAdminState() as any;
  const lead = leadId ? (leads || []).find((l: any) => l.id === leadId) : null;

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Contract[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Contract | null>(null);
  const [kinship, setKinship] = useState('Mãe');
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  useEffect(() => { setTerm(''); setResults([]); setPicked(null); setKinship('Mãe'); }, [leadId]);

  // Busca NO BANCO (contrato/titulo, nome ou telefone), escopada por Master
  useEffect(() => {
    if (!leadId || picked || term.trim().length < 2) { setResults([]); return; }
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const rows = await contractService.getContracts({ masterId: scopedMasterId, approvalStatus: 'approved', search: term.trim(), limit: 8 });
      if (mine === seq.current) { setResults(rows); setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [term, leadId, picked, scopedMasterId]);

  if (!leadId || !lead) return null;

  const confirm = async () => {
    if (!picked) return;
    setSaving(true);
    const res = await contractService.linkLooseLeadToContract({
      masterId: scopedMasterId,
      looseLead: { id: lead.id, name: lead.name, phone: lead.phone },
      contractId: picked.id,
      kinship,
    });
    if (!res.success) { setSaving(false); toast.error(res.message || 'Não foi possível vincular.'); return; }
    // Mensagens do lead solto vao para a conversa do card; o lead solto sai do funil (mesclado)
    if (res.conversationLeadId) await mergeLeads(res.conversationLeadId, lead.id);
    setSaving(false);
    toast.success(`${lead.name} vinculado a ${picked.contractTitle || picked.title || picked.contractCode}`);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--adm-text-title)' }}><Link2 size={16} /> Vincular a um contratante</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={18} /></button>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>
          <strong style={{ color: 'var(--adm-text-title)' }}>{lead.name}</strong> · {formatPhone(lead.phone)}
        </div>

        {!picked ? (
          <>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--adm-text-muted)' }} />
              <input className="adm-input" autoFocus value={term} onChange={e => setTerm(e.target.value)} placeholder="Buscar por contrato, nome ou telefone do contratante"
                style={{ width: '100%', height: 38, paddingLeft: 30, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
              {searching && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}><Loader2 size={14} className="animate-spin" /> Buscando...</div>}
              {!searching && term.trim().length >= 2 && results.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Nenhum contrato encontrado.</div>}
              {results.map(c => (
                <button key={c.id} type="button" onClick={() => setPicked(c)}
                  style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.contractTitle || c.title || c.contractCode}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>{c.contractCode}{c.contact?.name ? ` · ${c.contact.name}` : ''}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--adm-text-title)' }}>{picked.contractTitle || picked.title || picked.contractCode}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>{picked.contractCode}{picked.contact?.name ? ` · Contratante: ${picked.contact.name}` : ''}</div>
              <button type="button" onClick={() => setPicked(null)} style={{ marginTop: 4, fontSize: '0.7rem', color: '#0284C7', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Trocar contrato</button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>Parentesco com o contratante</label>
              <Select value={kinship} onChange={e => setKinship(e.target.value)} className="adm-input" style={{ width: '100%', height: 38 }}>
                {KINSHIPS.map(k => <option key={k} value={k}>{k}</option>)}
              </Select>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', lineHeight: 1.45 }}>
              Ao confirmar: {lead.name} vira dependente de {picked.contact?.name || 'o contratante'} na Central de Contatos, o número entra como participante do card, as mensagens vão para a conversa do contrato e o card solto sai do funil.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={onClose} className="adm-btn-secondary" style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
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
