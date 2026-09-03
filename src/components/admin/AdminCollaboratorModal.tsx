import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building2 } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import type { Collaborator, AdminRole } from '../../types/admin';

interface AdminCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorToEdit?: Collaborator | null;
}

export const AdminCollaboratorModal: React.FC<AdminCollaboratorModalProps> = ({
  isOpen,
  onClose,
  collaboratorToEdit,
}) => {
  const { venues, addCollaborator, updateCollaborator } = useAdminState();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<AdminRole>('crm');
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (collaboratorToEdit) {
      setName(collaboratorToEdit.name);
      setEmail(collaboratorToEdit.email);
      setPhone(collaboratorToEdit.phone || '');
      setPassword(collaboratorToEdit.password || '••••••••');
      setRole(collaboratorToEdit.role);
      const vIds = collaboratorToEdit.venueIds || (collaboratorToEdit.venueId && collaboratorToEdit.venueId !== 'all' ? [collaboratorToEdit.venueId] : venues.map(v => v.id));
      setSelectedVenueIds(vIds);
      setAvatarUrl(collaboratorToEdit.avatarUrl || '');
      setActive(collaboratorToEdit.active);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setPassword('123456');
      setRole('crm');
      setSelectedVenueIds(venues.map(v => v.id));
      setAvatarUrl('');
      setActive(true);
    }
  }, [collaboratorToEdit, isOpen, venues]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const primaryVenueId = selectedVenueIds.length === 1 ? selectedVenueIds[0] : 'all';

    if (collaboratorToEdit) {
      updateCollaborator(collaboratorToEdit.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        venueId: role === 'master' ? 'all' : primaryVenueId,
        venueIds: role === 'master' ? venues.map(v => v.id) : selectedVenueIds,
        avatarUrl: avatarUrl.trim() || undefined,
        active,
        password: password !== '••••••••' ? password : collaboratorToEdit.password,
      });
    } else {
      addCollaborator({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        venueId: role === 'master' ? 'all' : primaryVenueId,
        venueIds: role === 'master' ? venues.map(v => v.id) : selectedVenueIds,
        avatarUrl: avatarUrl.trim() || undefined,
        active,
        isFirstAccess: true,
      });
    }

    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--adm-text-title)',
    fontSize: '0.84rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--adm-text-title)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div className="admin-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div className="admin-modal-content" style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--adm-bg-elevated)',
            border: '1px solid var(--adm-border)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--adm-accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <User size={20} />
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {collaboratorToEdit ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '20px' }}>
          Defina o perfil de acesso e a unidade vinculada para o funcionário.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Nome */}
          <div>
            <label style={labelStyle}>
              Nome Completo *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                required
                placeholder="Ex: Renata Albuquerque"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: '38px',
                }}
              />
            </div>
          </div>

          {/* Email & Telefone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                E-mail Profissional *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  required
                  placeholder="usuario@bonomofestas.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                WhatsApp
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="tel"
                  placeholder="(21) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Informação de Primeiro Acesso por E-mail */}
          {!collaboratorToEdit ? (
            <div style={{
              background: 'rgba(20, 169, 215, 0.08)',
              border: '1px solid rgba(20, 169, 215, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-body)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--adm-accent, #14A9D7)' }}>Ativação por Código de E-mail:</strong> O colaborador receberá um código de segurança de 6 dígitos no seu primeiro acesso para definir sua própria senha pessoal e foto de perfil.
              </div>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>
                Alterar Senha do Colaborador (Opcional)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Deixe em branco para manter a atual"
                  value={password === '••••••••' ? '' : password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Cargo / Nível de Acesso */}
          <div>
            <label style={labelStyle}>
              Nível de Acesso / Perfil *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {[
                { id: 'master', label: 'Master', desc: 'Acesso total à rede' },
                { id: 'admin', label: 'Gerente', desc: 'Gestão da casa' },
                { id: 'sdr', label: 'SDR', desc: 'Pré-venda & Qualificação' },
                { id: 'closer', label: 'Closer', desc: 'Vendas & Fechamento' },
                { id: 'crm', label: 'CRM Geral', desc: 'Operação de Leads' },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setRole(opt.id as AdminRole)}
                  style={{
                    background: role === opt.id ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                    border: role === opt.id ? '1.5px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                    borderRadius: '12px',
                    padding: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: role === opt.id ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                    {opt.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unidades / Casas de Festa Atribuídas (Multi-Seleção com Logo e Endereço) */}
          {role !== 'master' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Casas de Festas Atribuídas
                </label>
                {venues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedVenueIds.length === venues.length) {
                        setSelectedVenueIds([]);
                      } else {
                        setSelectedVenueIds(venues.map(v => v.id));
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-accent)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {selectedVenueIds.length === venues.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                )}
              </div>

              {venues.length === 0 ? (
                <div style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px dashed var(--adm-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: 'var(--adm-text-muted)',
                }}>
                  Nenhuma casa de festas cadastrada ainda.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '8px',
                }}>
                  {venues.map(v => {
                    const isSelected = selectedVenueIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setSelectedVenueIds(prev => 
                            prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: isSelected ? 'var(--adm-accent-bg)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--adm-accent)' : 'transparent'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{
                            accentColor: 'var(--adm-accent)',
                            width: '15px',
                            height: '15px',
                            cursor: 'pointer',
                          }}
                        />

                        {/* Venue Logo or Icon */}
                        {v.logoUrl ? (
                          <img
                            src={v.logoUrl}
                            alt={v.name}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              objectFit: 'contain',
                              background: '#000',
                              border: '1px solid var(--adm-border)',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(212, 175, 55, 0.15)',
                            color: 'var(--adm-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Building2 size={14} />
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.address || v.tagline || 'Sem endereço informado'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Foto de Perfil */}
          <ImageUploadField
            label="Foto de Perfil do Colaborador"
            value={avatarUrl}
            onChange={(val) => setAvatarUrl(val)}
            folder="avatars"
            aspectRatio="1:1"
            previewHeight="80px"
            placeholder="Subir foto de rosto"
          />

          {/* Status Ativo / Inativo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--adm-bg-input)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--adm-border)' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Conta Ativa</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Permite login e operações no sistema</div>
            </div>

            <button
              type="button"
              onClick={() => setActive(!active)}
              style={{
                background: active ? 'var(--adm-green)' : 'var(--adm-bg-elevated)',
                color: active ? '#000' : 'var(--adm-text-muted)',
                border: 'none',
                borderRadius: '20px',
                padding: '4px 14px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {active ? 'ATIVO' : 'INATIVO'}
            </button>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.84rem',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.86rem',
              }}
            >
              {collaboratorToEdit ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
