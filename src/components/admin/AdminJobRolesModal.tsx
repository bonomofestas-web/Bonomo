import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Modal, eyebrow } from './goals/GoalUi';
import {
  JOB_ROLE_OPTIONS,
  DEFAULT_JOB_SECTORS,
  orderedSectorRoleIds,
  type CustomJobRole,
  type JobRoleAliases,
  type JobRoleOrder,
  type JobSector,
  type JobSectorConfig,
} from '../../utils/jobRoles';

interface Props {
  customRoles: CustomJobRole[];
  /** Nomes de exibição (id do cargo -> nome mostrado). */
  aliases: JobRoleAliases;
  /** Ordem hierárquica salva (menor = primeiro). */
  order: JobRoleOrder;
  /** Salva a nova ordem dos cargos de um setor. */
  onReorder: (sector: JobSector, orderedIds: string[]) => Promise<void>;
  onSetAlias: (roleId: string, name: string) => Promise<boolean>;
  /** Quantas pessoas usam cada cargo (id -> total). */
  usage: Record<string, number>;
  canEdit: boolean;
  onCreate: (sector: JobSector, name: string) => Promise<boolean>;
  onDelete: (role: CustomJobRole) => Promise<void>;
  onClose: () => void;
  /** Setores configurados (dinâmicos / salvos em banco) */
  sectors?: JobSectorConfig[];
  /** Salva nova ordem global de setores no banco */
  onReorderSectors?: (orderedSectorIds: string[]) => Promise<void>;
  /** Cria um novo setor no banco */
  onCreateSector?: (name: string, color?: string) => Promise<boolean>;
  /** Exclui um setor personalizado */
  onDeleteSector?: (sectorId: string) => Promise<boolean>;
}

const EXAMPLES: Record<string, string> = {
  diretoria: 'Conselheiro',
  comercial: 'Consultor de vendas',
  pos_venda: 'Anfitriã',
  marketing_tecnologia: 'Gestor de tráfego',
  marketing: 'Gestor de tráfego',
  financeiro: 'Analista financeiro',
};

const COLOR_PRESETS = ['#14A9D7', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B', '#3B82F6', '#D4AF37', '#6366F1'];
const PROTECTED_SECTORS = ['diretoria', 'comercial', 'pos_venda', 'financeiro', 'marketing_tecnologia', 'marketing'];

/** Configuração de cargos: cargos fixos de cada setor e os personalizados ("Outro"), que podem ser criados e excluídos. */
export const AdminJobRolesModal: React.FC<Props> = ({
  customRoles,
  aliases,
  order,
  onReorder,
  onSetAlias,
  usage,
  canEdit,
  onCreate,
  onDelete,
  onClose,
  sectors,
  onReorderSectors,
  onCreateSector,
  onDeleteSector,
}) => {
  const [currentSectors, setCurrentSectors] = useState<JobSectorConfig[]>(sectors && sectors.length > 0 ? sectors : DEFAULT_JOB_SECTORS);
  useEffect(() => {
    if (sectors && sectors.length > 0) {
      setCurrentSectors(sectors);
    }
  }, [sectors]);

  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState('');

  // Formulário de novo setor
  const [isCreatingSector, setIsCreatingSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorColor, setNewSectorColor] = useState('#14A9D7');
  const [savingSector, setSavingSector] = useState(false);

  const startAlias = (id: string) => { setEditingId(id); setAliasDraft(aliases[id] || ''); };
  const saveAlias = async (id: string) => {
    setBusy(id);
    const ok = await onSetAlias(id, aliasDraft);
    setBusy(null);
    if (ok) setEditingId(null);
  };

  /** Edição do nome de exibição no próprio chip. */
  const renderAliasEditor = (id: string) => (
    <form onSubmit={e => { e.preventDefault(); void saveAlias(id); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <input autoFocus className="adm-input" maxLength={60} value={aliasDraft} onChange={e => setAliasDraft(e.target.value)} placeholder="Nome de exibição (vazio = padrão)"
        style={{ height: '28px', borderRadius: '8px', padding: '0 8px', fontSize: '0.74rem', width: 210 }} />
      <button type="submit" disabled={busy === id} aria-label="Salvar nome" style={{ background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer', display: 'inline-flex' }}><Check size={14} /></button>
      <button type="button" aria-label="Cancelar" onClick={() => setEditingId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', display: 'inline-flex' }}><X size={14} /></button>
    </form>
  );

  const addRole = async (sectorId: string) => {
    const name = (names[sectorId] || '').trim();
    if (!name) return;
    setBusy(sectorId);
    const ok = await onCreate(sectorId, name);
    setBusy(null);
    if (ok) setNames(prev => ({ ...prev, [sectorId]: '' }));
  };

  const moveSector = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= currentSectors.length) return;
    const next = [...currentSectors];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setCurrentSectors(next);
    if (onReorderSectors) {
      await onReorderSectors(next.map(s => s.id));
    }
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSectorName.trim();
    if (!cleanName || !onCreateSector) return;
    setSavingSector(true);
    const ok = await onCreateSector(cleanName, newSectorColor);
    setSavingSector(false);
    if (ok) {
      setNewSectorName('');
      setIsCreatingSector(false);
    }
  };

  const handleDeleteSector = async (sector: JobSectorConfig) => {
    if (!onDeleteSector) return;
    if (!window.confirm(`Deseja realmente excluir o setor "${sector.label}"?`)) return;
    await onDeleteSector(sector.id);
  };

  return (
    <Modal
      title="Configuração de Cargos e Setores"
      onClose={onClose}
      width={720}
      footer={<button type="button" onClick={onClose} className="adm-btn-primary" style={{ padding: '9px 22px', borderRadius: '10px', fontWeight: 800, marginLeft: 'auto' }}>Concluir</button>}
    >
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--adm-text-muted)', lineHeight: 1.5 }}>
        O acesso define o que a pessoa vê; o cargo define o que ela é.
        Use as setas verticais para organizar a ordem dos <strong>setores</strong> (salvo em banco).
        Use as setas horizontais dentro de cada setor para ordenar os <strong>cargos</strong>.
        Você pode criar novos setores dinamicamente e adicionar cargos personalizados em cada um deles.
      </p>

      {/* Lista de Setores Ordenáveis */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
        {currentSectors.map((sector, sectorIdx) => {
          const mine = customRoles.filter(r => r.sector === sector.id);
          const isProtected = PROTECTED_SECTORS.includes(sector.id);

          return (
            <div
              key={sector.id}
              style={{
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '14px',
                background: 'var(--adm-bg-input)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Cabeçalho do Setor com Ordenação */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: sector.color,
                      boxShadow: `0 0 8px ${sector.color}66`,
                    }}
                  />
                  <span style={{ ...eyebrow, color: sector.color, fontSize: '0.76rem', letterSpacing: '0.5px' }}>
                    {sector.label}
                  </span>
                </div>

                {canEdit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      aria-label={`Mover ${sector.label} para cima`}
                      title="Mover setor para cima"
                      disabled={sectorIdx === 0}
                      onClick={() => void moveSector(sectorIdx, -1)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '6px',
                        color: 'var(--adm-text-muted)',
                        cursor: sectorIdx === 0 ? 'default' : 'pointer',
                        opacity: sectorIdx === 0 ? 0.3 : 1,
                        padding: '3px 6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover ${sector.label} para baixo`}
                      title="Mover setor para baixo"
                      disabled={sectorIdx === currentSectors.length - 1}
                      onClick={() => void moveSector(sectorIdx, 1)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '6px',
                        color: 'var(--adm-text-muted)',
                        cursor: sectorIdx === currentSectors.length - 1 ? 'default' : 'pointer',
                        opacity: sectorIdx === currentSectors.length - 1 ? 0.3 : 1,
                        padding: '3px 6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                    {!isProtected && onDeleteSector && (
                      <button
                        type="button"
                        aria-label={`Excluir setor ${sector.label}`}
                        title="Excluir setor personalizado"
                        onClick={() => void handleDeleteSector(sector)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '3px 6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '4px',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de Cargos Dentro do Setor */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(() => {
                  const ids = orderedSectorRoleIds(sector.id, customRoles, order);
                  const moveRole = (id: string, dir: -1 | 1) => {
                    const i = ids.indexOf(id);
                    const j = i + dir;
                    if (i < 0 || j < 0 || j >= ids.length) return;
                    const next = [...ids];
                    [next[i], next[j]] = [next[j], next[i]];
                    void onReorder(sector.id, next);
                  };
                  const arrow = (disabled: boolean, label: string, onClick: () => void, icon: React.ReactNode) => (
                    <button
                      type="button"
                      aria-label={label}
                      title={label}
                      disabled={disabled}
                      onClick={onClick}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-text-muted)',
                        cursor: disabled ? 'default' : 'pointer',
                        opacity: disabled ? 0.3 : 1,
                        display: 'inline-flex',
                        padding: '2px',
                      }}
                    >
                      {icon}
                    </button>
                  );

                  return ids.map((id, idx) => {
                    const fixed = (JOB_ROLE_OPTIONS[sector.id] || []).find(o => o.id === id);
                    const custom = mine.find(r => r.id === id);
                    const base = fixed ? fixed.label : (custom?.name || id);

                    return (
                      <span
                        key={id}
                        title={fixed?.description}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: '999px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          border: fixed ? '1px solid var(--adm-border)' : `1px solid ${sector.color}66`,
                          background: fixed ? 'var(--adm-bg-card)' : `${sector.color}14`,
                          color: fixed ? 'var(--adm-text-title)' : sector.color,
                        }}
                      >
                        {canEdit && arrow(idx === 0, `Subir ${base} na hierarquia`, () => moveRole(id, -1), <ChevronLeft size={14} />)}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }}>{idx + 1}º</span>
                          {editingId === id ? renderAliasEditor(id) : (
                            <>
                              {aliases[id] || base}
                              {aliases[id] && <span style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }}>padrão: {base}</span>}
                              {fixed && <Lock size={10} color="var(--adm-text-muted)" aria-label="Cargo padrão" />}
                              <span style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }}>{usage[id] || 0} {(usage[id] || 0) === 1 ? 'pessoa' : 'pessoas'}</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  aria-label={`Renomear exibição de ${base}`}
                                  onClick={() => startAlias(id)}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', display: 'inline-flex', padding: '2px' }}
                                >
                                  <Pencil size={12} />
                                </button>
                              )}
                            </>
                          )}
                          {custom && canEdit && editingId !== id && (
                            <button
                              type="button"
                              aria-label={`Excluir cargo ${custom.name}`}
                              onClick={() => onDelete(custom)}
                              style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'inline-flex', padding: '2px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </span>
                        {canEdit && arrow(idx === ids.length - 1, `Descer ${base} na hierarquia`, () => moveRole(id, 1), <ChevronRight size={14} />)}
                      </span>
                    );
                  });
                })()}

                {((JOB_ROLE_OPTIONS[sector.id] || []).length === 0 && mine.length === 0) && (
                  <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                    Nenhum cargo ainda. Digite abaixo para criar.
                  </span>
                )}
              </div>

              {/* Campo para Adicionar Novo Cargo no Setor */}
              {canEdit && (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    void addRole(sector.id);
                  }}
                  style={{ display: 'flex', gap: '8px', marginTop: '2px' }}
                >
                  <input
                    className="adm-input"
                    placeholder={`Novo cargo em ${sector.label} (ex.: ${EXAMPLES[sector.id] || 'Coordenador'})`}
                    maxLength={60}
                    value={names[sector.id] || ''}
                    onChange={e => setNames(prev => ({ ...prev, [sector.id]: e.target.value }))}
                    style={{ flex: 1, height: '38px', borderRadius: '10px', padding: '0 12px', fontSize: '0.8rem' }}
                  />
                  <button
                    type="submit"
                    disabled={busy === sector.id || !(names[sector.id] || '').trim()}
                    className="adm-btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 14px',
                      height: '38px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      opacity: (names[sector.id] || '').trim() ? 1 : 0.5,
                    }}
                  >
                    <Plus size={13} /> Adicionar
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão e Formulário para Criar Novo Setor */}
      {canEdit && onCreateSector && (
        <div style={{ marginTop: '14px', borderTop: '1px dashed var(--adm-border)', paddingTop: '14px' }}>
          {!isCreatingSector ? (
            <button
              type="button"
              onClick={() => setIsCreatingSector(true)}
              className="adm-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: 'var(--adm-accent, #14A9D7)',
                border: '1px dashed var(--adm-accent, #14A9D7)',
                width: '100%',
                justifyContent: 'center',
                background: 'rgba(20, 169, 215, 0.05)',
              }}
            >
              <Plus size={16} />
              <span>Novo Setor</span>
            </button>
          ) : (
            <form
              onSubmit={handleCreateSector}
              style={{
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '14px',
                background: 'var(--adm-bg-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Criar Novo Setor
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingSector(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <input
                autoFocus
                className="adm-input"
                maxLength={50}
                value={newSectorName}
                onChange={e => setNewSectorName(e.target.value)}
                placeholder="Nome do setor (ex.: Recepção, Operações, Buffet, TI)"
                style={{ height: '38px', borderRadius: '10px', padding: '0 12px', fontSize: '0.82rem' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>Cor do setor:</span>
                {COLOR_PRESETS.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setNewSectorColor(hex)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: hex,
                      border: newSectorColor === hex ? '2px solid #FFFFFF' : '2px solid transparent',
                      cursor: 'pointer',
                      transform: newSectorColor === hex ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreatingSector(false)}
                  className="adm-btn-secondary"
                  style={{ height: '36px', padding: '0 14px', borderRadius: '10px', fontWeight: 700, fontSize: '0.78rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSector || !newSectorName.trim()}
                  className="adm-btn-primary"
                  style={{ height: '36px', padding: '0 18px', borderRadius: '10px', fontWeight: 800, fontSize: '0.78rem' }}
                >
                  {savingSector ? 'Criando...' : 'Salvar Setor'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
};
