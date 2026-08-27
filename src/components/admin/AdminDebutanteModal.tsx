import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Phone, Mail, Sparkles, Building2, Users, Trash2, Loader2 } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { DebutanteAccount } from '../../types/admin';

import { createMonogramAvatar } from '../../utils/avatarUtils';

interface AdminDebutanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  debutanteToEdit?: DebutanteAccount | null;
}

export const AdminDebutanteModal: React.FC<AdminDebutanteModalProps> = ({
  isOpen,
  onClose,
  debutanteToEdit,
}) => {
  const { venues, templates, addDebutanteAccount, updateDebutanteAccount, deleteDebutanteAccount } = useAdminState();

  const [venueId, setVenueId] = useState(venues[0]?.id || 'rio_lounge');
  const [name, setName] = useState('');
  const [partyDate, setPartyDate] = useState('2027-04-18');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [baseGuestLimit, setBaseGuestLimit] = useState(250);
  const [hasJourneyEnabled, setHasJourneyEnabled] = useState(true);
  const [journeyTemplateChoice, setJourneyTemplateChoice] = useState<string>('pending');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (debutanteToEdit) {
      setVenueId(debutanteToEdit.venueId);
      setName(debutanteToEdit.name);
      setPartyDate(debutanteToEdit.partyDate);
      setPhone(debutanteToEdit.phone);
      setEmail(debutanteToEdit.email || '');
      setAvatarUrl(debutanteToEdit.avatarUrl);
      setBaseGuestLimit(debutanteToEdit.baseGuestLimit);
      setHasJourneyEnabled(debutanteToEdit.hasJourneyEnabled);
      setJourneyTemplateChoice(debutanteToEdit.isJourneyPending ? 'pending' : (debutanteToEdit.journeyTemplateId || (templates[0]?.id || 'pending')));
    } else {
      setVenueId(venues[0]?.id || 'rio_lounge');
      setName('');
      setPartyDate('2027-04-18');
      setPhone('');
      setEmail('');
      setAvatarUrl('');
      setBaseGuestLimit(250);
      setHasJourneyEnabled(true);
      setJourneyTemplateChoice(templates.length > 0 ? templates[0].id : 'pending');
    }
  }, [debutanteToEdit, isOpen, venues, templates]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalAvatar = avatarUrl.trim() || createMonogramAvatar(name.trim());
    const isPending = hasJourneyEnabled && (journeyTemplateChoice === 'pending' || !journeyTemplateChoice);
    const selectedTemplate = (!isPending && hasJourneyEnabled) ? templates.find(t => t.id === journeyTemplateChoice) : null;

    if (debutanteToEdit) {
      updateDebutanteAccount(debutanteToEdit.id, {
        venueId,
        name: name.trim(),
        partyDate,
        phone: phone.trim(),
        email: email.trim() || undefined,
        avatarUrl: finalAvatar,
        baseGuestLimit: Number(baseGuestLimit),
        hasJourneyEnabled,
        isJourneyPending: isPending,
        journeyTemplateId: selectedTemplate?.id,
        ...(selectedTemplate ? {
          milestones: selectedTemplate.milestones || [],
          vipRewards: selectedTemplate.vipRewards || [],
        } : (isPending ? { milestones: [], vipRewards: [] } : {})),
      });
    } else {
      addDebutanteAccount({
        venueId,
        name: name.trim(),
        partyDate,
        phone: phone.trim(),
        email: email.trim() || undefined,
        avatarUrl: finalAvatar,
        baseGuestLimit: Number(baseGuestLimit),
        hasJourneyEnabled,
        journeyTemplateId: isPending ? 'pending' : selectedTemplate?.id,
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
        maxWidth: '560px',
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
            {debutanteToEdit ? 'Editar Aniversariante' : 'Nova Aniversariante'}
          </h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '20px' }}>
          Cadastre os dados, selecione os módulos e gere o link exclusivo da debutante.
        </p>

        {venues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <Building2 size={48} color="var(--adm-accent)" style={{ opacity: 0.6, marginBottom: '14px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Nenhuma Casa de Festa Cadastrada
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', maxWidth: '380px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
              Para cadastrar uma aniversariante, é obrigatório vincular a uma Casa de Festas. Por favor, cadastre uma unidade primeiro no menu <strong>Casas de Festa</strong>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-primary"
              style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 800, margin: '0 auto' }}
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Casa de Festas */}
            <div>
              <label style={labelStyle}>
                Casa de Festa Vinculada *
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                  }}
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id} style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nome Completo */}
            <div>
              <label style={labelStyle}>
                Nome da Debutante / Aniversariante *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Eduarda Meireles"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                  }}
                />
              </div>
            </div>

            {/* Data da Festa & Limite de Convidados */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>
                  Data da Festa *
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="date"
                    required
                    value={partyDate}
                    onChange={(e) => setPartyDate(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: '38px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Capacidade Base
                </label>
                <div style={{ position: 'relative' }}>
                  <Users size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={baseGuestLimit}
                    onChange={(e) => setBaseGuestLimit(Number(e.target.value))}
                    style={{
                      ...inputStyle,
                      paddingLeft: '38px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Telefone & E-mail */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>
                  WhatsApp / Telefone *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="tel"
                    required
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

              <div>
                <label style={labelStyle}>
                  E-mail (Opcional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="email"
                    placeholder="contato@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: '38px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Foto de Perfil com Upload de Arquivo */}
            <ImageUploadField
              label="Foto de Perfil da Debutante"
              value={avatarUrl}
              onChange={(val) => setAvatarUrl(val)}
              onUploadingChange={setIsPhotoUploading}
              aspectRatio="1:1"
              previewHeight="80px"
              placeholder="Subir foto de rosto da aniversariante"
            />

            {/* ── MÓDULOS: ATIVAR JORNADA (CHAVE SWITCH) ── */}
            <div style={{
              background: hasJourneyEnabled 
                ? 'var(--adm-accent-bg)' 
                : 'var(--adm-bg-input)',
              border: `1px solid ${hasJourneyEnabled ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color={hasJourneyEnabled ? 'var(--adm-accent)' : 'var(--adm-text-muted)'} />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Ativar Módulo de Jornada & Benefícios?
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                    {hasJourneyEnabled 
                      ? 'Liberar Jornada, Indicações, Benefícios e botão "Indicar Amiga"'
                      : 'Modo Convidados & Agenda (Apenas lista de convidados e cronograma)'}
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setHasJourneyEnabled(!hasJourneyEnabled)}
                style={{
                  background: hasJourneyEnabled ? 'var(--adm-accent)' : 'var(--adm-bg-elevated)',
                  border: `1px solid ${hasJourneyEnabled ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                  borderRadius: '20px',
                  padding: '6px 14px',
                  color: hasJourneyEnabled ? '#FFF' : 'var(--adm-text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minWidth: '70px',
                }}
              >
                {hasJourneyEnabled ? 'ATIVADO' : 'DESATIVADO'}
              </button>
            </div>

            {/* ── VINCULAR JORNADA / DEIXAR PENDENTE ── */}
            {hasJourneyEnabled && (
              <div style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'fadeIn 0.15s ease-out',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ ...labelStyle, margin: 0, fontWeight: 800 }}>
                    Vinculação da Jornada do Usuário *
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                    Escolha um modelo ou deixe pendente
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Opção 1: Pendente */}
                  <div
                    onClick={() => setJourneyTemplateChoice('pending')}
                    style={{
                      background: journeyTemplateChoice === 'pending' ? 'rgba(234, 179, 8, 0.12)' : 'var(--adm-bg-card)',
                      border: `1.5px solid ${journeyTemplateChoice === 'pending' ? '#EAB308' : 'var(--adm-border)'}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="journeyChoice"
                      checked={journeyTemplateChoice === 'pending'}
                      onChange={() => setJourneyTemplateChoice('pending')}
                      style={{ accentColor: '#EAB308', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: journeyTemplateChoice === 'pending' ? '#EAB308' : 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⏳ Deixar Pendente de Vinculação</span>
                        <span style={{ fontSize: '0.62rem', background: 'rgba(234, 179, 8, 0.2)', color: '#EAB308', padding: '1px 6px', borderRadius: '6px' }}>SEM VÍDEO</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                        A debutante acessará apenas Convidados e Agenda. O vídeo de abertura NÃO será exibido até que a jornada seja vinculada.
                      </div>
                    </div>
                  </div>

                  {/* Opções de Templates Existentes */}
                  {templates.map(tmpl => {
                    const isSelected = journeyTemplateChoice === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setJourneyTemplateChoice(tmpl.id)}
                        style={{
                          background: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                          border: `1.5px solid ${isSelected ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                          borderRadius: '12px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="journeyChoice"
                          checked={isSelected}
                          onChange={() => setJourneyTemplateChoice(tmpl.id)}
                          style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                            ✨ Vincular Modelo: {tmpl.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                            {tmpl.milestones?.length || 0} Metas/Benefícios configurados • {tmpl.vipRewards?.length || 0} Presentes VIP
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '10px' }}>
              {debutanteToEdit && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={15} />
                  <span>Excluir</span>
                </button>
              )}

              <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="adm-btn-secondary"
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isPhotoUploading}
                  className="adm-btn-primary"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    opacity: isPhotoUploading ? 0.7 : 1,
                    cursor: isPhotoUploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isPhotoUploading ? (
                    <>
                      <Loader2 size={16} className="adm-spin" />
                      <span>Enviando foto para a nuvem...</span>
                    </>
                  ) : (
                    debutanteToEdit ? 'Salvar Alterações' : 'Cadastrar & Gerar Link'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {debutanteToEdit && (
        <AdminConfirmModal
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={() => {
            deleteDebutanteAccount(debutanteToEdit.id);
            setIsConfirmDeleteOpen(false);
            onClose();
          }}
          title="Excluir Conta da Debutante"
          itemName={debutanteToEdit.name}
          message={`Tem certeza que deseja excluir "${debutanteToEdit.name}"? Os leads gerados por ela continuarão preservados no CRM.`}
        />
      )}
    </div>
  );
};
