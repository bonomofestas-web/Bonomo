import React, { useState } from 'react';
import { 
  Users, Crown, Building2, ShieldCheck, ShieldAlert, 
  Plus, Search, AlertTriangle, CheckCircle2, 
  Mail, Calendar, ChevronDown, ChevronUp, UserCheck, UserX, X
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Collaborator } from '../../types/admin';

export const AdminDevUsersManagerView: React.FC = () => {
  const { 
    allCollaborators, 
    allVenues, 
    currentUser, 
    toggleMasterAccountStatus,
    addMasterAccount 
  } = useAdminState();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMasterIds, setExpandedMasterIds] = useState<Record<string, boolean>>({});
  
  // Modal for creating a new Master Account
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMasterName, setNewMasterName] = useState('');
  const [newMasterEmail, setNewMasterEmail] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal for confirming Master Deactivation
  const [deactivatingMaster, setDeactivatingMaster] = useState<Collaborator | null>(null);

  // Filter masters (collaborators with role 'master')
  const allMasters = allCollaborators.filter(c => c.role === 'master');
  
  // Filter search
  const filteredMasters = allMasters.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Global KPIs
  const totalMastersCount = allMasters.length;
  const activeMastersCount = allMasters.filter(m => m.active).length;
  const inactiveMastersCount = allMasters.filter(m => !m.active).length;
  const totalCollabsCount = allCollaborators.filter(c => c.role !== 'dev' && c.role !== 'master').length;
  const totalVenuesCount = allVenues.length;

  const toggleExpand = (masterId: string) => {
    setExpandedMasterIds(prev => ({ ...prev, [masterId]: !prev[masterId] }));
  };

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newMasterName.trim() || !newMasterEmail.trim()) {
      setCreateError('Preencha o nome e o e-mail do novo Master.');
      return;
    }

    const cleanEmail = newMasterEmail.trim().toLowerCase();
    const existing = allCollaborators.find(c => c.email.toLowerCase() === cleanEmail);
    if (existing) {
      setCreateError('Já existe um usuário cadastrado com este e-mail no sistema.');
      return;
    }

    setIsCreating(true);
    try {
      addMasterAccount(newMasterName.trim(), cleanEmail);
      setIsCreateModalOpen(false);
      setNewMasterName('');
      setNewMasterEmail('');
    } catch (err: any) {
      setCreateError('Erro ao criar conta Master. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmToggleMaster = () => {
    if (!deactivatingMaster) return;
    toggleMasterAccountStatus(deactivatingMaster.id, !deactivatingMaster.active);
    setDeactivatingMaster(null);
  };

  if (currentUser?.role !== 'dev') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#8096A8' }}>
        <AlertTriangle size={36} color="#EF4444" style={{ margin: '0 auto 12px auto' }} />
        <h3>Acesso Restrito ao Desenvolvedor</h3>
        <p>Apenas a conta raiz de desenvolvimento possui permissão para gerenciar instâncias Master.</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px 32px',
      color: '#FFFFFF',
      maxWidth: '1300px',
      margin: '0 auto',
      boxSizing: 'border-box',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '0.7rem',
            color: '#14A9D7',
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            <Crown size={13} />
            <span>Módulo de Controle do Desenvolvedor</span>
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            margin: '0 0 6px 0',
            color: '#FFFFFF',
            letterSpacing: '-0.3px',
          }}>
            Gestão de Masters & Usuários
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#8096A8', margin: 0 }}>
            Visão consolidada de todos os clientes Master, métricas globais e árvore de colaboradores conectados.
          </p>
        </div>

        {/* Action Button: Criar Nova Conta Master */}
        <button
          type="button"
          onClick={() => {
            setCreateError('');
            setIsCreateModalOpen(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
            color: '#080C14',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 6px 20px rgba(20, 169, 215, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          <Plus size={17} />
          <span>Criar Nova Conta Master</span>
        </button>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {/* Card 1: Masters */}
        <div style={{
          background: '#0F1724',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            color: '#D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Crown size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#8096A8', fontWeight: 600, textTransform: 'uppercase' }}>
              Contas Master
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
              {totalMastersCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '2px' }}>
              {activeMastersCount} ativas • {inactiveMastersCount} inativas
            </div>
          </div>
        </div>

        {/* Card 2: Colaboradores no Ecossistema */}
        <div style={{
          background: '#0F1724',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(20, 169, 215, 0.15)',
            border: '1px solid rgba(20, 169, 215, 0.4)',
            color: '#14A9D7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#8096A8', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Colaboradores
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
              {totalCollabsCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8096A8', marginTop: '2px' }}>
              Equipes vinculadas aos Masters
            </div>
          </div>
        </div>

        {/* Card 3: Casas de Festas Conectadas */}
        <div style={{
          background: '#0F1724',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            color: '#A855F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#8096A8', fontWeight: 600, textTransform: 'uppercase' }}>
              Casas de Festa
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
              {totalVenuesCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8096A8', marginTop: '2px' }}>
              Unidades operando no app
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & LIST OF MASTERS ─────────────────────────────────────────── */}
      <div style={{
        background: '#0B111A',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '24px',
      }}>
        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          gap: '14px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '380px',
            width: '100%',
          }}>
            <Search size={16} color="#8096A8" style={{ position: 'absolute', left: '14px', top: '12px' }} />
            <input
              type="text"
              placeholder="Buscar Master por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: '#0F1724',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 14px 10px 40px',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ fontSize: '0.76rem', color: '#8096A8' }}>
            Exibindo <strong>{filteredMasters.length}</strong> de {allMasters.length} contas Master
          </div>
        </div>

        {/* Master Accounts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredMasters.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#8096A8', fontSize: '0.84rem' }}>
              Nenhuma conta Master encontrada com o filtro informado.
            </div>
          ) : (
            filteredMasters.map(master => {
              const isExpanded = Boolean(expandedMasterIds[master.id]);
              
              // Collaborators subordinated to this master
              const subordinatedCollabs = allCollaborators.filter(c => 
                c.masterId === master.id || (c.role !== 'dev' && c.role !== 'master' && !c.masterId)
              );

              // Venues owned by this master
              const masterVenues = allVenues.filter(v => v.masterId === master.id || (!v.masterId && master.id.includes('a000')));

              return (
                <div
                  key={master.id}
                  style={{
                    background: '#0F1724',
                    border: `1px solid ${master.active ? 'rgba(255, 255, 255, 0.08)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {/* Master Card Top Row */}
                  <div style={{
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                  }}>
                    {/* Master Profile Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(20, 169, 215, 0.1) 100%)',
                        border: '1.5px solid #D4AF37',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        {master.avatarUrl ? (
                          <img src={master.avatarUrl} alt={master.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Crown size={22} color="#D4AF37" />
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF' }}>
                            {master.name}
                          </span>
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: master.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: master.active ? '#10B981' : '#EF4444',
                            border: `1px solid ${master.active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          }}>
                            {master.active ? 'ATIVO' : 'DESATIVADO / SUSPENSO'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.74rem', color: '#8096A8', marginTop: '3px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} />
                            <span>{master.email}</span>
                          </span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            <span>Desde {master.createdAt || '2026'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      {/* Stats Pills */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '0.76rem',
                      }}>
                        <Building2 size={14} color="#14A9D7" />
                        <span><strong>{masterVenues.length}</strong> Casas</span>
                        <span style={{ color: '#4E5B6E' }}>|</span>
                        <Users size={14} color="#D4AF37" />
                        <span><strong>{subordinatedCollabs.length}</strong> Colaboradores</span>
                      </div>

                      {/* Toggle Active / Deactive Master */}
                      <button
                        type="button"
                        onClick={() => setDeactivatingMaster(master)}
                        style={{
                          background: master.active ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.15)',
                          border: `1px solid ${master.active ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.4)'}`,
                          color: master.active ? '#EF4444' : '#10B981',
                          borderRadius: '10px',
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {master.active ? (
                          <>
                            <UserX size={14} />
                            <span>Desativar Conta</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={14} />
                            <span>Reativar Conta</span>
                          </>
                        )}
                      </button>

                      {/* Expand / Collapse Subordinated Collabs */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(master.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#8096A8',
                          borderRadius: '10px',
                          padding: '7px 12px',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{isExpanded ? 'Recolher' : 'Ver Usuários'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Subordinated Collaborators List */}
                  {isExpanded && (
                    <div style={{ padding: '16px 20px', background: 'rgba(0, 0, 0, 0.2)' }}>
                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#8096A8',
                        letterSpacing: '0.6px',
                        marginBottom: '10px',
                      }}>
                        Equipe Vinculada a este Master ({subordinatedCollabs.length})
                      </div>

                      {subordinatedCollabs.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: '#647E8C', fontStyle: 'italic', padding: '8px 0' }}>
                          Nenhum colaborador adicional cadastrado por esta conta Master.
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: '10px',
                        }}>
                          {subordinatedCollabs.map(collab => (
                            <div
                              key={collab.id}
                              style={{
                                background: '#0B111A',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                              }}
                            >
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'rgba(20, 169, 215, 0.12)',
                                border: '1px solid rgba(20, 169, 215, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: '#14A9D7',
                              }}>
                                {collab.avatarUrl ? (
                                  <img src={collab.avatarUrl} alt={collab.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  collab.name.charAt(0).toUpperCase()
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {collab.name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#8096A8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {collab.email}
                                </div>
                              </div>

                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                background: 'rgba(20, 169, 215, 0.12)',
                                color: '#14A9D7',
                              }}>
                                {collab.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: '0.68rem', color: '#647E8C', marginTop: '12px' }}>
                        ℹ️ Por conformidade e LGPD, a gestão individual de colaboradores e acessos pertence exclusivamente à conta Master proprietária.
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MODAL: CRIAR NOVA CONTA MASTER ───────────────────────────────────── */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 99999,
        }}>
          <div style={{
            background: '#0B111A',
            border: '1px solid rgba(20, 169, 215, 0.4)',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '28px',
            color: '#FFFFFF',
            position: 'relative',
          }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#8096A8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid #D4AF37',
                color: '#D4AF37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}>
                <Crown size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0' }}>
                Nova Conta Master
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#8096A8', margin: 0 }}>
                Crie a conta raiz para uma nova organização ou cliente do software.
              </p>
            </div>

            {createError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#F87171',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                marginBottom: '16px',
              }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMaster} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Nome do Master / Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bonomo Festas ou Nome do Gestor"
                  value={newMasterName}
                  onChange={(e) => setNewMasterName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0F1724',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  E-mail Oficial do Master *
                </label>
                <input
                  type="email"
                  required
                  placeholder="contato@cliente.com"
                  value={newMasterEmail}
                  onChange={(e) => setNewMasterEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0F1724',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{
                background: 'rgba(20, 169, 215, 0.08)',
                border: '1px solid rgba(20, 169, 215, 0.25)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.72rem',
                color: '#8096A8',
                lineHeight: 1.4,
              }}>
                ℹ️ O novo Master passará pelo fluxo de <strong>Primeiro Acesso</strong> ao tentar entrar com este e-mail, definindo sua própria senha oficial e dados da conta.
              </div>

              <button
                type="submit"
                disabled={isCreating}
                style={{
                  background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                  color: '#080C14',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{isCreating ? 'Cadastrando...' : 'Criar Conta Master'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAÇÃO DE DESATIVAÇÃO EM CASCATA ─────────────────────── */}
      {deactivatingMaster && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 99999,
        }}>
          <div style={{
            background: '#0B111A',
            border: `1px solid ${deactivatingMaster.active ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: '20px',
            maxWidth: '460px',
            width: '100%',
            padding: '28px',
            color: '#FFFFFF',
            textAlign: 'center',
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: deactivatingMaster.active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${deactivatingMaster.active ? '#EF4444' : '#10B981'}`,
              color: deactivatingMaster.active ? '#EF4444' : '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}>
              {deactivatingMaster.active ? <ShieldAlert size={26} /> : <ShieldCheck size={26} />}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0' }}>
              {deactivatingMaster.active ? 'Suspender Conta Master?' : 'Reativar Conta Master?'}
            </h3>

            <p style={{ fontSize: '0.84rem', color: '#D3E0EA', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {deactivatingMaster.active ? (
                <>
                  Você está prestes a desativar a conta de <strong>{deactivatingMaster.name}</strong> ({deactivatingMaster.email}).
                  <br /><br />
                  <span style={{ color: '#F87171', fontWeight: 600 }}>
                    ⚠️ ATENÇÃO: Todos os colaboradores subordinados vinculados a este Master também serão imediatamente suspensos e terão o login bloqueado no aplicativo.
                  </span>
                </>
              ) : (
                <>
                  Ao reativar a conta de <strong>{deactivatingMaster.name}</strong>, a organização e seus colaboradores terão o acesso ao F5 System restabelecido.
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeactivatingMaster(null)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmToggleMaster}
                style={{
                  flex: 1,
                  background: deactivatingMaster.active ? '#EF4444' : '#10B981',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {deactivatingMaster.active ? 'Confirmar Suspensão' : 'Confirmar Reativação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
