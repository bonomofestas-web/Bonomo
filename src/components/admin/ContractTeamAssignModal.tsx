import React, { useMemo, useState } from 'react';
import { X, Search, Check, UserX, Users, Handshake, Target } from 'lucide-react';
import { toast } from 'sonner';
import { contractService } from '../../services/contractService';
import { formatAccessRoleLabel } from '../../utils/accessPermissions';
import { SafeAvatar } from './SafeAvatar';
import type { Collaborator } from '../../types/admin';

type Role = 'sdr' | 'closer';
type Choice = { id: string | null; name: string } | undefined; // undefined = nao alterar; id null = deixar sem responsavel

interface Props {
  contractIds: string[];
  masterId: string;
  collaborators: Collaborator[];
  author: { id?: string; name?: string; role?: string };
  /** Nomes dos contratos para conferencia (id -> titulo) */
  titles?: Record<string, string>;
  onClose: () => void;
  onDone: () => void;
}

const ROLE_META: Record<Role, { label: string; hint: string; color: string; Icon: React.ElementType }> = {
  sdr: { label: 'SDR / Vendedor', hint: 'Quem atendeu e qualificou o cliente', color: '#0284C7', Icon: Handshake },
  closer: { label: 'Closer', hint: 'Quem fechou a venda', color: '#7C3AED', Icon: Target },
};

/** Cartao de escolha de UMA pessoa para um papel: busca + lista com foto. */
const PersonCard: React.FC<{ role: Role; candidates: Collaborator[]; value: Choice; onChange: (v: Choice) => void }> = ({ role, candidates, value, onChange }) => {
  const meta = ROLE_META[role];
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return candidates.filter(c => !n || c.name.toLowerCase().includes(n)).slice(0, 30);
  }, [q, candidates]);
  const active = Boolean(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 12, border: `1.5px solid ${active ? meta.color : 'var(--adm-border)'}`, background: active ? `${meta.color}0D` : 'var(--adm-bg-surface, #F8FAFC)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--adm-border)' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: `${meta.color}1F`, color: meta.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <meta.Icon size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{meta.label}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{meta.hint}</div>
        </div>
      </div>

      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '14px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
            {value.id ? <Check size={15} color={meta.color} /> : <UserX size={15} color="#E11D48" />}
            {value.id ? value.name : 'Deixar sem responsável'}
          </span>
          <button type="button" onClick={() => onChange(undefined)} style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Trocar</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', padding: '10px 12px 6px' }}>
            <Search size={14} style={{ position: 'absolute', left: 22, top: 20, color: 'var(--adm-text-muted)' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar pelo nome"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-card, #fff)', color: 'var(--adm-text-title)', fontSize: '0.78rem', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 8px', maxHeight: 220, overflowY: 'auto' }}>
            {list.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange({ id: c.id, name: c.name })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '7px 8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, color: 'var(--adm-text-title)' }}
                onMouseEnter={e => (e.currentTarget.style.background = `${meta.color}14`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <SafeAvatar src={c.avatarUrl} name={c.name} size={28} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  <span style={{ display: 'block', fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{formatAccessRoleLabel(c.role)}</span>
                </span>
              </button>
            ))}
            {list.length === 0 && <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', padding: 10, textAlign: 'center' }}>Ninguém encontrado.</span>}
          </div>
          <button
            type="button"
            onClick={() => onChange({ id: null, name: '' })}
            style={{ margin: '4px 12px 12px', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#E11D48', padding: 0 }}
          >
            <UserX size={12} /> Deixar sem responsável
          </button>
        </>
      )}
    </div>
  );
};

/** Define SDR e/ou Closer de um ou muitos contratos de uma vez. So altera o papel que foi escolhido. */
export const ContractTeamAssignModal: React.FC<Props> = ({ contractIds, masterId, collaborators, author, titles, onClose, onDone }) => {
  const [sdr, setSdr] = useState<Choice>(undefined);
  const [closer, setCloser] = useState<Choice>(undefined);
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    const active = collaborators.filter(c => c.active !== false);
    const commercial = active.filter(c => (c.sectors || []).includes('comercial') || (c.jobRoles || []).some(j => j.startsWith('comercial:')));
    return (commercial.length ? commercial : active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [collaborators]);

  const nothing = !sdr && !closer;
  const preview = contractIds.slice(0, 3).map(id => titles?.[id]).filter(Boolean) as string[];

  const apply = async () => {
    if (nothing) { toast.error('Escolha o SDR e/ou o Closer.'); return; }
    setSaving(true);
    const res = await contractService.updateSalesTeam({ masterId, contractIds, sdr, closer, author });
    setSaving(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível salvar.'); return; }
    toast.success(`Responsáveis atualizados em ${res.updated} contrato(s).`);
    onDone();
  };

  const describe = (c: Choice) => (c ? (c.id ? c.name : 'sem responsável') : 'não altera');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 16, boxShadow: '0 24px 60px rgba(2,6,23,0.35)', overflow: 'hidden' }}>
        {/* Cabecalho */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--adm-border)' }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(2,132,199,0.12)', color: '#0284C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={19} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Quem fez a venda</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>
              <strong style={{ color: 'var(--adm-text-title)' }}>{contractIds.length}</strong> {contractIds.length === 1 ? 'contrato selecionado' : 'contratos selecionados'}
              {preview.length > 0 && contractIds.length <= 3 && <> · {preview.join(' · ')}</>}
              . Só o que você escolher abaixo será alterado.
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Corpo: dois cartoes lado a lado */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, alignItems: 'start' }}>
          <PersonCard role="sdr" candidates={candidates} value={sdr} onChange={setSdr} />
          <PersonCard role="closer" candidates={candidates} value={closer} onChange={setCloser} />
        </div>

        {/* Rodape */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 20px', borderTop: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
            SDR: <strong style={{ color: 'var(--adm-text-title)' }}>{describe(sdr)}</strong> · Closer: <strong style={{ color: 'var(--adm-text-title)' }}>{describe(closer)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Cancelar</button>
            <button type="button" disabled={saving || nothing} onClick={apply} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#0284C7', color: '#fff', cursor: nothing ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 800, opacity: saving || nothing ? 0.5 : 1 }}>
              {saving ? 'Salvando...' : `Aplicar em ${contractIds.length}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
