import React, { useState, useEffect } from 'react';
import { 
  X, User, Calendar, Phone, Mail, Building2, 
  Users, Trash2, Loader2, PartyPopper, DollarSign, Crown
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput, formatPhone } from '../../utils/phoneFormatter';
import { ImageUploadField } from './ImageUploadField';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { DebutanteAccount, EventType } from '../../types/admin';
import { createMonogramAvatar } from '../../utils/avatarUtils';

interface AdminDebutanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  debutanteToEdit?: DebutanteAccount | null;
}

const EVENT_TYPES: { id: EventType; label: string; icon: string }[] = [
  { id: 'debutante_15', label: '15 Anos / Debutante', icon: '👑' },
  { id: 'birthday_kids', label: 'Aniversário Infantil', icon: '🎈' },
  { id: 'birthday_adult', label: 'Aniversário Adulto', icon: '🎉' },
  { id: 'baby_shower', label: 'Chá de Bebê / Revelação', icon: '🍼' },
  { id: 'wedding_anniversary', label: 'Bodas / Casamento', icon: '💍' },
  { id: 'graduation', label: 'Formatura', icon: '🎓' },
  { id: 'corporate', label: 'Corporativo', icon: '🏢' },
  { id: 'other', label: 'Outro Evento', icon: '✨' },
];

export const AdminDebutanteModal: React.FC<AdminDebutanteModalProps> = ({
  isOpen,
  onClose,
  debutanteToEdit,
}) => {
  const { 
    venues, 
    templates, 
    clients,
    linkClientDebutante,
    addDebutanteAccount, 
    updateDebutanteAccount, 
    deleteDebutanteAccount, 
    currentUser, 
    activeVenueId 
  } = useAdminState();

  const canManage = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'dev';

  const getEffectiveInitialVenueId = () => {
    if (activeVenueId && activeVenueId !== 'all' && venues.some(v => v.id === activeVenueId)) {
      return activeVenueId;
    }
    return venues[0]?.id || '';
  };

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [venueId, setVenueId] = useState(getEffectiveInitialVenueId);
  const [eventType, setEventType] = useState<EventType>('debutante_15');
  const [name, setName] = useState('');
  const [partyDate, setPartyDate] = useState('2027-04-18');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contractValue, setContractValue] = useState<number | ''>('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [baseGuestLimit, setBaseGuestLimit] = useState(250);
  const [hasJourneyEnabled, setHasJourneyEnabled] = useState(true);
  const [journeyTemplateChoice, setJourneyTemplateChoice] = useState<string>('pending');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (debutanteToEdit) {
      const linked = clients.find(c => c.debutanteId === debutanteToEdit.id);
      setSelectedClientId(linked ? linked.id : '');
      setVenueId(debutanteToEdit.venueId);
      setEventType(debutanteToEdit.eventType || 'debutante_15');
      setName(debutanteToEdit.name);
      setPartyDate(debutanteToEdit.partyDate);
      setPhone(formatPhone(debutanteToEdit.phone));
      setEmail(debutanteToEdit.email || '');
      setContractValue(debutanteToEdit.contractValue || '');
      setAvatarUrl(debutanteToEdit.avatarUrl);
      setBaseGuestLimit(debutanteToEdit.baseGuestLimit || 250);
      setHasJourneyEnabled(debutanteToEdit.hasJourneyEnabled);
      setJourneyTemplateChoice(debutanteToEdit.isJourneyPending ? 'pending' : (debutanteToEdit.journeyTemplateId || (templates[0]?.id || 'pending')));
    } else {
      setSelectedClientId('');
      setVenueId(getEffectiveInitialVenueId());
      setEventType('debutante_15');
      setName('');
      setPartyDate('2027-04-18');
      setPhone('');
      setEmail('');
      setContractValue('');
      setAvatarUrl('');
      setBaseGuestLimit(250);
      setHasJourneyEnabled(true);
      setJourneyTemplateChoice(templates.length > 0 ? templates[0].id : 'pending');
    }
  }, [debutanteToEdit, isOpen, venues, templates, activeVenueId, clients]);

  const handleSelectClient = (cId: string) => {
    setSelectedClientId(cId);
    if (!cId) return;
    const c = clients.find(item => item.id === cId);
    if (c) {
      setName(c.birthdayPersonName || c.name);
      if (c.eventDate) setPartyDate(c.eventDate);
      if (c.payerPhone) setPhone(formatPhone(c.payerPhone));
      if (c.payerEmail) setEmail(c.payerEmail);
      if (c.dealValue) setContractValue(c.dealValue);
      if (c.venueId) setVenueId(c.venueId);
      if (c.guestCount) setBaseGuestLimit(c.guestCount);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalAvatar = avatarUrl.trim() || createMonogramAvatar(name.trim());
    const is15Years = eventType === 'debutante_15';
    const effectiveJourneyEnabled = is15Years && hasJourneyEnabled;
    const isPending = effectiveJourneyEnabled && (journeyTemplateChoice === 'pending' || !journeyTemplateChoice);
    const selectedTemplate = (!isPending && effectiveJourneyEnabled) ? templates.find(t => t.id === journeyTemplateChoice) : null;

    const payload: Partial<DebutanteAccount> = {
      venueId,
      eventType,
      name: name.trim(),
      partyDate,
      phone: phone.trim(),
      email: email.trim() || undefined,
      contractValue: contractValue ? Number(contractValue) : undefined,
      avatarUrl: finalAvatar,
      baseGuestLimit: Number(baseGuestLimit),
      hasJourneyEnabled: effectiveJourneyEnabled,
      isJourneyPending: isPending,
      journeyTemplateId: isPending ? 'pending' : selectedTemplate?.id,
      ...(selectedTemplate && effectiveJourneyEnabled ? {
        milestones: selectedTemplate.milestones || [],
        vipRewards: selectedTemplate.vipRewards || [],
      } : (isPending ? { milestones: [], vipRewards: [] } : {})),
    };

    if (debutanteToEdit) {
      updateDebutanteAccount(debutanteToEdit.id, payload);
      if (selectedClientId) {
        linkClientDebutante(selectedClientId, debutanteToEdit.id);
      }
    } else {
      const created = addDebutanteAccount(payload as any);
      if (selectedClientId && created?.id) {
        linkClientDebutante(selectedClientId, created.id);
      }
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
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div className="admin-modal-content" style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '24px',
        maxWidth: '620px',
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
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'var(--adm-accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <PartyPopper size={20} />
          </div>
          <div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              margin: 0,
              letterSpacing: '-0.3px',
            }}>
              {debutanteToEdit ? 'Editar Aniversariante / Evento' : 'Novo Aniversariante / Evento'}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
              Cadastre as informações da festa e defina os módulos do aniversariante
            </p>
          </div>
        </div>

        {venues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <Building2 size={48} color="var(--adm-accent)" style={{ opacity: 0.6, marginBottom: '14px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Nenhuma Casa de Festa Cadastrada
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', maxWidth: '380px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
              Para cadastrar um evento, é obrigatório vincular a uma Casa de Festas.
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '18px' }}>
            
            {/* Vínculo Opcional com Cliente do Pós-Venda */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--adm-surface, #f9fafb)',
              border: '1px solid var(--adm-border, #e5e7eb)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔗</span> Vincular a Cliente de Pós-Venda (Opcional)
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleSelectClient(e.target.value)}
                style={{
                  ...inputStyle,
                  fontSize: '0.82rem',
                  padding: '8px 10px',
                }}
              >
                <option value="">-- Criar conta avulsa / sem vínculo --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.birthdayPersonName || c.name} ({c.code}) - Festa: {new Date(c.eventDate).toLocaleDateString('pt-BR')} ({c.venueName})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                Selecione um cliente para preencher os dados automaticamente ou deixe em branco para criar conta avulsa.
              </span>
            </div>

            {/* 1. SELETOR DE CATEGORIA DE EVENTO */}
            <div>
              <label style={labelStyle}>
                Tipo de Evento *
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px',
              }}>
                {EVENT_TYPES.map(cat => {
                  const isSelected = eventType === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEventType(cat.id)}
                      style={{
                        background: isSelected ? 'var(--adm-accent)' : 'var(--adm-bg-input)',
                        color: isSelected ? '#000000' : 'var(--adm-text-title)',
                        border: `1.5px solid ${isSelected ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                        borderRadius: '12px',
                        padding: '8px 10px',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
                      <span style={{ textAlign: 'left', lineHeight: 1.2 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

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

            {/* Nome Completo do Aniversariante / Anfitrião */}
            <div>
              <label style={labelStyle}>
                Nome do Aniversariante / Cliente *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  required
                  placeholder={eventType === 'debutante_15' ? 'Ex: Maria Eduarda Meireles' : 'Ex: Lucas Gabriel (5 Anos)'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                  }}
                />
              </div>
            </div>

            {/* Data da Festa & Capacidade de Convidados */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>
                  Data do Evento *
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

            {/* Telefone, E-mail & Valor do Contrato */}
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
                    onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
                    style={{
                      ...inputStyle,
                      paddingLeft: '38px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Valor do Contrato (R$)
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} color="#10B981" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="number"
                    placeholder="Ex: 28500"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      ...inputStyle,
                      paddingLeft: '38px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label style={labelStyle}>
                E-mail de Contato (Opcional)
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

            {/* Foto de Perfil */}
            <ImageUploadField
              label="Foto do Aniversariante"
              value={avatarUrl}
              onChange={(val) => setAvatarUrl(val)}
              onUploadingChange={setIsPhotoUploading}
              aspectRatio="1:1"
              previewHeight="80px"
              placeholder="Subir foto de rosto"
            />

            {/* ── 2. CONDICIONAL: JORNADA VIP (EXIBIDA SOMENTE PARA 15 ANOS) ── */}
            {eventType === 'debutante_15' && (
              <div style={{
                background: hasJourneyEnabled ? 'rgba(212,175,55,0.08)' : 'var(--adm-bg-input)',
                border: `1.5px solid ${hasJourneyEnabled ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Crown size={20} color="var(--adm-accent)" />
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                        Habilitar Jornada VIP (15 Anos)
                      </h4>
                      <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                        Permite indicar amigas, acumular pontos e desbloquear prêmios
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHasJourneyEnabled(!hasJourneyEnabled)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '14px',
                      background: hasJourneyEnabled ? '#10B981' : 'rgba(100, 116, 139, 0.4)',
                      border: `1px solid ${hasJourneyEnabled ? '#059669' : 'rgba(255, 255, 255, 0.15)'}`,
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: hasJourneyEnabled ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      transform: hasJourneyEnabled ? 'translateX(20px)' : 'translateX(1px)',
                      transition: 'transform 0.2s ease',
                    }} />
                  </button>
                </div>

                {hasJourneyEnabled && (
                  <div style={{ borderTop: '1px dashed var(--adm-border)', paddingTop: '10px' }}>
                    <label style={labelStyle}>
                      Modelo de Jornada Aplicado
                    </label>
                    <select
                      value={journeyTemplateChoice}
                      onChange={(e) => setJourneyTemplateChoice(e.target.value)}
                      style={{
                        ...inputStyle,
                        background: 'var(--adm-bg-card)',
                      }}
                    >
                      <option value="pending">⏳ Definir Depois (Jornada Pendente)</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              borderTop: '1px solid var(--adm-border)',
              paddingTop: '16px',
            }}>
              {debutanteToEdit && canManage ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Excluir</span>
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-title)',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPhotoUploading}
                  style={{
                    background: 'var(--adm-accent)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 22px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(212,175,55,0.3)',
                  }}
                >
                  {isPhotoUploading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Salvando Foto...</span>
                    </>
                  ) : (
                    <span>{debutanteToEdit ? 'Salvar Alterações' : 'Criar Evento'}</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AdminConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Excluir Aniversariante"
        message={`Deseja realmente excluir o cadastro de ${name}? Todos os convidados e dados vinculados serão excluídos permanentemente.`}
        confirmText="Sim, Excluir"
        danger={true}
        onConfirm={() => {
          if (debutanteToEdit) {
            deleteDebutanteAccount(debutanteToEdit.id);
            onClose();
          }
        }}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
};
