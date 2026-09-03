import React, { useState } from 'react';
import { 
  X, CheckCircle2, Clock, Share2, 
  Check, Trash2, Edit3, Heart, Send
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import type { Guest } from '../../types';

interface GuestDetailModalProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (guest: Guest) => void;
}

export const GuestDetailModal: React.FC<GuestDetailModalProps> = ({ 
  guest, 
  isOpen, 
  onClose,
  onEdit
}) => {
  const { 
    debutante, 
    currentTheme,
    confirmGuestByDebutante, 
    deleteGuest 
  } = useAppState();

  const [copiedLink, setCopiedLink] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen || !guest) return null;

  const isConfirmed = guest.status === 'confirmed';
  const isPending = guest.status === 'pending';
  const isDeclined = guest.status === 'declined';

  // Build the individual exclusive link
  const debSlug = debutante.slug || encodeURIComponent(debutante.name.toLowerCase().replace(/\s+/g, '-'));
  const individualInviteUrl = `${window.location.origin}/?convite=${debSlug}&guestId=${guest.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(individualInviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendWhatsAppInvite = () => {
    const venueName = currentTheme?.name || 'Casa de Festas';
    const text = `Olá, ${guest.name}! A ${debutante.name} preparou um convite exclusivo para você para os 15 Anos dela no ${venueName}! 👑✨\n\nConfira seu convite personalizado e confirme sua presença no link:\n${individualInviteUrl}`;
    const cleanPhone = guest.phone.replace(/\D/g, '');
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleManualConfirm = () => {
    confirmGuestByDebutante(guest.id);
  };

  const handleDelete = () => {
    deleteGuest(guest.id);
    setShowConfirmDelete(false);
    onClose();
  };

  const formatOrigin = (origin?: string) => {
    switch (origin) {
      case 'general_link':
        return 'Link de Convite Geral';
      case 'individual_link':
        return 'Convite Individual Exclusivo';
      case 'manual':
        return 'Cadastro Manual pela Debutante';
      default:
        return guest.isSelfRegistered ? 'Link de Convite Geral' : 'Cadastro Manual';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#0D0D0D',
        border: '1.5px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '24px',
        maxWidth: '560px',
        width: '100%',
        padding: '30px 24px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {/* Header with Guest Name & Status Badge */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#D4AF37',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}>
              Detalhes do Convidado
            </span>

            {isConfirmed && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34D399',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <CheckCircle2 size={12} /> Confirmado
              </span>
            )}

            {isPending && (
              <span style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#FBBF24',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={12} /> Aguardando Confirmação
              </span>
            )}

            {isDeclined && (
              <span style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                Recusado
              </span>
            )}
          </div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '1.6rem',
            fontWeight: 700,
            color: '#FFF',
            margin: '0 0 4px 0',
          }}>
            {guest.name}
          </h2>

          <div style={{ fontSize: '0.84rem', color: '#B5AFA4' }}>
            Grupo: <strong style={{ color: '#E8C98D' }}>{guest.group}</strong> • {guest.age} anos
          </div>
        </div>

        {/* Content Card with Information Rows */}
        <div style={{
          background: '#141414',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '16px',
          padding: '18px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {/* Telefone */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#9E988D', fontWeight: 600 }}>Telefone / WhatsApp</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.86rem', color: '#FFF', fontWeight: 700 }}>{guest.phone}</span>
              {guest.phone && (
                <button
                  onClick={handleSendWhatsAppInvite}
                  style={{
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                    color: '#25D366',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Send size={11} /> WhatsApp
                </button>
              )}
            </div>
          </div>

          {/* Gênero & Idade */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: '#9E988D', fontWeight: 600 }}>Gênero & Idade</span>
            <span style={{ fontSize: '0.84rem', color: '#FFF', fontWeight: 700 }}>
              {guest.gender === 'female' ? 'Feminino ♀' : guest.gender === 'male' ? 'Masculino ♂' : 'Outro'} • {guest.age} anos
            </span>
          </div>

          {/* Grupo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: '#9E988D', fontWeight: 600 }}>Grupo</span>
            <span style={{ fontSize: '0.84rem', color: '#E8C98D', fontWeight: 700 }}>
              {guest.group}
            </span>
          </div>

          {/* Origem do Convite */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: '#9E988D', fontWeight: 600 }}>Origem do Convite</span>
            <span style={{ fontSize: '0.82rem', color: '#FFF', fontWeight: 600 }}>
              {formatOrigin(guest.origin)}
            </span>
          </div>

          {/* Data da Confirmação & Fonte */}
          {guest.confirmedAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#9E988D', fontWeight: 600 }}>Data da Confirmação</span>
              <span style={{ fontSize: '0.82rem', color: '#34D399', fontWeight: 700 }}>
                {guest.confirmedAt.split('-').reverse().join('/')} 
                {guest.confirmationSource === 'debutante' ? ' (pela Debutante)' : ' (pelo Convidado)'}
              </span>
            </div>
          )}

          {/* Estado do Link Individual */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: '#9E988D', fontWeight: 600 }}>Estado do Link Individual</span>
            <span style={{ 
              fontSize: '0.78rem', 
              fontWeight: 700, 
              color: isConfirmed ? '#9E988D' : '#34D399',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isConfirmed ? (
                <>🔒 Expirado (Presença Garantida)</>
              ) : (
                <>🟢 Ativo e Aguardando Confirmação</>
              )}
            </span>
          </div>

          {/* Mensagem de Carinho */}
          {guest.sweetMessage && (
            <div style={{ 
              borderTop: '1px solid rgba(255,255,255,0.06)', 
              paddingTop: '10px',
              background: 'rgba(255, 92, 154, 0.08)',
              border: '1px solid rgba(255, 92, 154, 0.3)',
              borderRadius: '12px',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#FFB0C8', fontWeight: 700, marginBottom: '4px' }}>
                <Heart size={12} fill="#FF5C9A" color="#FF5C9A" />
                <span>Mensagem de Carinho:</span>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#FFE2EC', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
                "{guest.sweetMessage}"
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* If Pending: Show Generate Exclusive Link + Confirm Button */}
          {isPending && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={handleCopyLink}
                style={{
                  background: copiedLink ? '#10B981' : 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
                <span>{copiedLink ? 'Link Copiado!' : 'Link Individual'}</span>
              </button>

              <button
                onClick={handleManualConfirm}
                style={{
                  background: 'rgba(52, 211, 153, 0.15)',
                  border: '1.5px solid #34D399',
                  color: '#34D399',
                  borderRadius: '30px',
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                <CheckCircle2 size={16} />
                <span>Confirmar Presença</span>
              </button>
            </div>
          )}

          {/* Secondary Actions: Edit + Delete */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', gap: '10px' }}>
            <button
              onClick={() => {
                onClose();
                onEdit(guest);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFF',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Edit3 size={14} />
              <span>Editar Convidado</span>
            </button>

            {showConfirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.74rem', color: '#EF4444' }}>Excluir?</span>
                <button
                  onClick={handleDelete}
                  style={{
                    background: '#EF4444',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Sim
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmDelete(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9E988D',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9E988D')}
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
