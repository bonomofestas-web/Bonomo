import React, { useState } from 'react';
import { Check, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Modal, eyebrow } from './goals/GoalUi';
import { JOB_ROLE_OPTIONS, JOB_SECTORS, type CustomJobRole, type JobRoleAliases, type JobSector } from '../../utils/jobRoles';

interface Props {
  customRoles: CustomJobRole[];
  /** Nomes de exibicao (id do cargo -> nome mostrado). */
  aliases: JobRoleAliases;
  onSetAlias: (roleId: string, name: string) => Promise<boolean>;
  /** Quantas pessoas usam cada cargo (id -> total). */
  usage: Record<string, number>;
  canEdit: boolean;
  onCreate: (sector: JobSector, name: string) => Promise<boolean>;
  onDelete: (role: CustomJobRole) => Promise<void>;
  onClose: () => void;
}

const EXAMPLES: Record<JobSector, string> = {
  comercial: 'Consultor de vendas',
  pos_venda: 'Anfitriã',
  gerencia: 'Coordenador',
  marketing: 'Gestor de tráfego',
  financeiro: 'Analista financeiro',
};

/** Configuração de cargos: cargos fixos de cada setor e os personalizados ("Outro"), que podem ser criados e excluídos. */
export const AdminJobRolesModal: React.FC<Props> = ({ customRoles, aliases, onSetAlias, usage, canEdit, onCreate, onDelete, onClose }) => {
  const [names, setNames] = useState<Partial<Record<JobSector, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState('');

  const startAlias = (id: string) => { setEditingId(id); setAliasDraft(aliases[id] || ''); };
  const saveAlias = async (id: string) => {
    setBusy(id);
    const ok = await onSetAlias(id, aliasDraft);
    setBusy(null);
    if (ok) setEditingId(null);
  };

  /** Edicao do nome de exibicao no proprio chip. */
  const renderAliasEditor = (id: string) => (
    <form onSubmit={e => { e.preventDefault(); void saveAlias(id); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <input autoFocus className="adm-input" maxLength={60} value={aliasDraft} onChange={e => setAliasDraft(e.target.value)} placeholder="Nome de exibição (vazio = padrão)"
        style={{ height: '28px', borderRadius: '8px', padding: '0 8px', fontSize: '0.74rem', width: 210 }} />
      <button type="submit" disabled={busy === id} aria-label="Salvar nome" style={{ background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer', display: 'inline-flex' }}><Check size={14} /></button>
      <button type="button" aria-label="Cancelar" onClick={() => setEditingId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', display: 'inline-flex' }}><X size={14} /></button>
    </form>
  );

  const add = async (sector: JobSector) => {
    const name = (names[sector] || '').trim();
    if (!name) return;
    setBusy(sector);
    const ok = await onCreate(sector, name);
    setBusy(null);
    if (ok) setNames(prev => ({ ...prev, [sector]: '' }));
  };

  return (
    <Modal
      title="Configuração de cargos"
      onClose={onClose}
      width={680}
      footer={<button type="button" onClick={onClose} className="adm-btn-primary" style={{ padding: '9px 22px', borderRadius: '10px', fontWeight: 800, marginLeft: 'auto' }}>Concluir</button>}
    >
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--adm-text-muted)', lineHeight: 1.5 }}>
        O acesso define o que a pessoa vê; o cargo define o que ela é. Além dos cargos padrão de cada setor, você pode digitar cargos próprios.
        Use o lápis para mudar o nome mostrado de um cargo (ex.: SDR aparecer como "Especialista"): o cargo continua o mesmo para o sistema.
        Ao excluir um cargo personalizado, ele sai de quem o tinha.
      </p>

      {JOB_SECTORS.map(sector => {
        const mine = customRoles.filter(r => r.sector === sector.id);
        return (
          <div key={sector.id} style={{ border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', background: 'var(--adm-bg-input)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ ...eyebrow, color: sector.color, fontSize: '0.72rem' }}>{sector.label}</span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {JOB_ROLE_OPTIONS[sector.id].map(r => (
                <span key={r.id} title={r.description} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 800,
                  border: '1px solid var(--adm-border)', background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)',
                }}>
                  {editingId === r.id ? renderAliasEditor(r.id) : (
                    <>
                      {aliases[r.id] || r.label}
                      {aliases[r.id] && <span style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }}>padrão: {r.label}</span>}
                      <Lock size={10} color="var(--adm-text-muted)" aria-label="Cargo padrão" />
                      {canEdit && <button type="button" aria-label={`Renomear exibição de ${r.label}`} onClick={() => startAlias(r.id)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', display: 'inline-flex', padding: '2px' }}><Pencil size={12} /></button>}
                    </>
                  )}
                </span>
              ))}
              {mine.map(r => (
                <span key={r.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 8px 6px 12px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 800,
                  border: `1px solid ${sector.color}66`, background: `${sector.color}14`, color: sector.color,
                }}>
                  {editingId === r.id ? renderAliasEditor(r.id) : (
                    <>
                      {aliases[r.id] || r.name}
                      {aliases[r.id] && <span style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }}>padrão: {r.name}</span>}
                      <span style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }}>{usage[r.id] || 0} {(usage[r.id] || 0) === 1 ? 'pessoa' : 'pessoas'}</span>
                      {canEdit && <button type="button" aria-label={`Renomear exibição de ${r.name}`} onClick={() => startAlias(r.id)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', display: 'inline-flex', padding: '2px' }}><Pencil size={12} /></button>}
                    </>
                  )}
                  {canEdit && editingId !== r.id && (
                    <button type="button" aria-label={`Excluir cargo ${r.name}`} onClick={() => onDelete(r)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'inline-flex', padding: '2px' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              ))}
              {JOB_ROLE_OPTIONS[sector.id].length === 0 && mine.length === 0 && (
                <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>Nenhum cargo ainda. Digite abaixo para criar.</span>
              )}
            </div>

            {canEdit && (
              <form onSubmit={e => { e.preventDefault(); void add(sector.id); }} style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="adm-input" placeholder={`Novo cargo em ${sector.label} (ex.: ${EXAMPLES[sector.id]})`} maxLength={60}
                  value={names[sector.id] || ''} onChange={e => setNames(prev => ({ ...prev, [sector.id]: e.target.value }))}
                  style={{ flex: 1, height: '38px', borderRadius: '10px', padding: '0 12px', fontSize: '0.8rem' }}
                />
                <button type="submit" disabled={busy === sector.id || !(names[sector.id] || '').trim()} className="adm-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '38px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem', opacity: (names[sector.id] || '').trim() ? 1 : 0.5 }}>
                  <Plus size={13} /> Adicionar
                </button>
              </form>
            )}
          </div>
        );
      })}
    </Modal>
  );
};
