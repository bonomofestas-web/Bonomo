import React, { useState } from 'react';
import { 
  Building2, 
  Mail, Phone, Edit3, Trash2, 
  UserPlus, Shield 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminCollaboratorModal } from './AdminCollaboratorModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { Collaborator } from '../../types/admin';

export const AdminCollaboratorsView: React.FC = () => {
  const { 
    collaborators, 
    venues, 
    deleteCollaborator, 
    switchUserRoleDemo,
    currentUser 
  } = useAdminState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collaboratorToEdit, setCollaboratorToEdit] = useState<Collaborator | null>(null);
  const [collabToDelete, setCollabToDelete] = useState<Collaborator | null>(null);

  const handleOpenCreate = () => {
    setCollaboratorToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (collab: Collaborator) => {
    setCollaboratorToEdit(collab);
    setIsModalOpen(true);
  };

  const handleDelete = (collab: Collaborator) => {
    setCollabToDelete(collab);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'dev':
        return {
          label: 'Desenvolvedor (Root)',
          bg: 'rgba(20, 169, 215, 0.15)',
          color: '#14A9D7',
          border: '1px solid rgba(20, 169, 215, 0.4)',
        };
      case 'master':
        return {
          label: 'Master (Diretoria)',
          bg: 'var(--adm-gold-bg)',
          color: 'var(--adm-gold)',
          border: '1px solid rgba(20, 169, 215, 0.4)',
        };
      case 'admin':
        return {
          label: 'Gerente da Casa',
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#60A5FA',
          border: '1px solid rgba(59, 130, 246, 0.35)',
        };
      case 'sdr':
      case 'crm':
        return {
          label: 'SDR / Pré-Vendas',
          bg: 'rgba(139, 92, 246, 0.15)',
          color: '#A78BFA',
          border: '1px solid rgba(139, 92, 246, 0.35)',
        };
      case 'closer':
        return {
          label: 'Closer / Vendas',
          bg: 'rgba(249, 115, 22, 0.15)',
          color: '#FB923C',
          border: '1px solid rgba(249, 115, 22, 0.35)',
        };
      default:
        return {
          label: role,
          bg: 'var(--adm-bg-elevated)',
          color: 'var(--adm-text-body)',
          border: '1px solid var(--adm-border)',
        };
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            letterSpacing: '-0.4px',
            margin: '0 0 4px 0',
          }}>
            Controle de Colaboradores & Acessos (Equipe)
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Gerencie SDRs, Closers e Gerentes de cada unidade com controle de visibilidade.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="adm-btn-primary"
          style={{
            padding: '8px 18px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.82rem',
          }}
        >
          <UserPlus size={16} />
          <span>Novo Colaborador</span>
        </button>
      </div>

      {/* Role Test Simulator Bar */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} color="var(--adm-accent)" />
          <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Simular Visão por Perfil:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => switchUserRoleDemo('master')}
            style={{
              background: currentUser?.role === 'master' ? '#D4AF37' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'master' ? '#000' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Master (Diretoria)
          </button>

          <button
            onClick={() => switchUserRoleDemo('admin')}
            style={{
              background: currentUser?.role === 'admin' ? '#3B82F6' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'admin' ? '#FFF' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Gerente de Unidade
          </button>

          <button
            onClick={() => switchUserRoleDemo('sdr')}
            style={{
              background: currentUser?.role === 'sdr' ? '#8B5CF6' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'sdr' ? '#FFF' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            SDR (Pré-Vendas)
          </button>

          <button
            onClick={() => switchUserRoleDemo('closer')}
            style={{
              background: currentUser?.role === 'closer' ? '#F97316' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'closer' ? '#FFF' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Closer (Vendas)
          </button>
        </div>
      </div>

      {/* Collaborators List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '18px',
      }}>
        {collaborators.map(collab => {
          const badge = getRoleBadge(collab.role);
          const venue = venues.find(v => v.id === collab.venueId);
          const venueName = collab.venueId === 'all' ? 'Todas as Unidades (Rede)' : (venue?.name || 'Unidade Especificada');

          return (
            <div
              key={collab.id}
              className="saas-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Profile Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={collab.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={collab.name}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--adm-accent)',
                    }}
                  />
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                      {collab.name}
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '4px',
                      background: badge.bg,
                      color: badge.color,
                      border: badge.border,
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                    }}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: collab.active ? '#10B981' : '#6B7280',
                  boxShadow: collab.active ? '0 0 8px #10B981' : 'none',
                }} title={collab.active ? 'Conta Ativa' : 'Conta Inativa'} />
              </div>

              {/* Details */}
              <div style={{
                background: 'var(--adm-bg-input)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.76rem',
                color: 'var(--adm-text-muted)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={13} color="var(--adm-accent)" />
                  <span style={{ color: 'var(--adm-text-title)' }}>{collab.email}</span>
                </div>

                {collab.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={13} color="var(--adm-accent)" />
                    <span>{collab.phone}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={13} color="var(--adm-accent)" />
                  <span>{venueName}</span>
                </div>
              </div>

              {/* Actions Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--adm-border)',
                paddingTop: '12px',
              }}>
                {collab.role === 'dev' || collab.email === 'bonomofestas@gmail.com' ? (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#14A9D7',
                    background: 'rgba(20, 169, 215, 0.12)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                  }}>
                    🛡️ Conta Dev Protegida
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenEdit(collab)}
                      style={{
                        background: 'var(--adm-bg-elevated)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Edit3 size={13} color="var(--adm-accent)" />
                      <span>Editar</span>
                    </button>

                    {collab.role !== 'master' && (
                      <button
                        onClick={() => handleDelete(collab)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-red)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remover</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AdminCollaboratorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        collaboratorToEdit={collaboratorToEdit}
      />

      <AdminConfirmModal
        isOpen={!!collabToDelete}
        onClose={() => setCollabToDelete(null)}
        onConfirm={() => {
          if (collabToDelete) {
            deleteCollaborator(collabToDelete.id);
            setCollabToDelete(null);
          }
        }}
        title="Remover Colaborador"
        itemName={collabToDelete?.name}
        message={collabToDelete ? `Tem certeza que deseja remover o colaborador "${collabToDelete.name}" da equipe?` : undefined}
      />
    </div>
  );
};
