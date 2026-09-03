import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, Clock, Share2, 
  Check, Trash2, Edit3, Heart, Send, Sparkles, User, Tag, Phone
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import type { Guest } from '../../types';

interface GuestDetailViewProps {
  guest: Guest;
  onBack: () => void;
  onEdit: (guest: Guest) => void;
}

export const GuestDetailView: React.FC<GuestDetailViewProps> = ({ 
  guest, 
  onBack,
  onEdit
}) => {
  const { 
    debutante, 
    currentTheme,
    confirmGuestByDebutante, 
    deleteGuest,
    addReferral 
  } = useAppState();

  const [copiedLink, setCopiedLink] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isConfirmed = guest.status === 'confirmed';
  const isPending = guest.status === 'pending';
  const isDeclined = guest.status === 'declined';

  // Build the individual exclusive link
  const debSlug = debutante.slug || encodeURIComponent(debutante.name.toLowerCase().replace(/\s+/g, '-'));
  const individualInviteUrl = `${window.location.origin}/?convite=${debSlug}&guestId=${guest.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(individualInviteUrl);
    setCopiedLink(true);
    setToastMessage('Link exclusivo copiado!');
    setTimeout(() => {
      setCopiedLink(false);
      setToastMessage(null);
    }, 2500);
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
    setToastMessage('✓ Presença confirmada com sucesso!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDelete = () => {
    deleteGuest(guest.id);
    onBack();
  };

  const handleIndicateFriend = () => {
    addReferral({
      name: guest.name,
      phone: guest.phone,
      age: guest.age,
      group: (guest.group === 'VIPs' ? 'Amigos' : guest.group) as any,
      notes: `Convidada indicada como amiga debutante`,
    });
    setToastMessage(`✨ ${guest.name} foi adicionada às indicações (+1 Ponto)!`);
    setTimeout(() => setToastMessage(null), 3500);
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

  // Regra de Indicação: Meninas de 12 a 15 anos + Jornada Ativada
  const isJourneyEnabled = debutante.hasJourneyEnabled !== false;
  const isEligibleForReferral = isJourneyEnabled && (guest.gender === 'female' || !guest.gender) && guest.age >= 12 && guest.age <= 15;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070707',
      color: '#FFFFFF',
      paddingBottom: '100px',
      position: 'relative',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* ── Fixed Top Navigation Header ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 10, 10, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}>
        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '24px',
            padding: '8px 14px',
            color: '#E8C98D',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Cinzel', serif",
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeft size={16} color="#D4AF37" />
          <span>Voltar para Convidados</span>
        </button>

        {/* Quick Edit Action */}
        <button
          onClick={() => onEdit(guest)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '7px 12px',
            color: '#FFF',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Edit3 size={13} color="#E8C98D" />
          <span>Editar</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '76px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 110,
          background: 'linear-gradient(135deg, #18141C 0%, #0E0A12 100%)',
          border: '1.5px solid #D4AF37',
          color: '#FFF',
          padding: '10px 18px',
          borderRadius: '30px',
          fontSize: '0.84rem',
          fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(212, 175, 55, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          whiteSpace: 'nowrap',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Main Scrollable Page Content ── */}
      <div style={{ padding: '20px 16px', maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Hero Guest Identity Card */}
        <div style={{
          background: 'linear-gradient(135deg, #16131A 0%, #0E0C12 100%)',
          border: '1.5px solid rgba(212, 175, 55, 0.4)',
          borderRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.7), 0 0 20px rgba(212, 175, 55, 0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none'
          }} />

          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
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
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <CheckCircle2 size={13} /> Confirmado
              </span>
            )}

            {isPending && (
              <span style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#FBBF24',
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Clock size={13} /> Aguardando Confirmação
              </span>
            )}

            {isDeclined && (
              <span style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '20px'
              }}>
                ✕ Recusado
              </span>
            )}
          </div>

          {/* Guest Name */}
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#FFF',
            margin: '0 0 10px 0',
            lineHeight: 1.2,
          }}>
            {guest.name}
          </h1>

          {/* Badges Pill Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              color: '#E8C98D',
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Tag size={12} /> {guest.group}
            </span>

            <span style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#E0DACD',
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 600,
            }}>
              {guest.gender === 'female' ? 'Feminino ♀' : guest.gender === 'male' ? 'Masculino ♂' : 'Outro'} • {guest.age} anos
            </span>

            {isEligibleForReferral && (
              <button
                onClick={handleIndicateFriend}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 92, 154, 0.25) 0%, rgba(212, 175, 55, 0.25) 100%)',
                  border: '1px solid #FF5C9A',
                  color: '#FFD700',
                  borderRadius: '14px',
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={12} color="#FF5C9A" />
                <span>Indicar Amiga</span>
              </button>
            )}
          </div>
        </div>

        {/* Contact & Registration Data Card */}
        <div style={{
          background: '#121212',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: '0.74rem', color: '#D4AF37', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Cinzel', serif" }}>
            Informações do Cadastro
          </div>

          {/* Telefone */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: '#9E988D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="#D4AF37" /> WhatsApp / Telefone
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 700 }}>{guest.phone || 'Não informado'}</span>
              {guest.phone && (
                <button
                  onClick={handleSendWhatsAppInvite}
                  style={{
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.4)',
                    color: '#25D366',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Send size={12} /> WhatsApp
                </button>
              )}
            </div>
          </div>

          {/* Gênero & Idade */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: '#9E988D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="#D4AF37" /> Gênero & Idade
            </span>
            <span style={{ fontSize: '0.86rem', color: '#FFF', fontWeight: 700 }}>
              {guest.gender === 'female' ? 'Feminino ♀' : guest.gender === 'male' ? 'Masculino ♂' : 'Outro'} • {guest.age} anos
            </span>
          </div>

          {/* Grupo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: '#9E988D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={14} color="#D4AF37" /> Grupo de Convivência
            </span>
            <span style={{ fontSize: '0.86rem', color: '#E8C98D', fontWeight: 700 }}>
              {guest.group}
            </span>
          </div>

          {/* Origem */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: '#9E988D', fontWeight: 600 }}>Origem do Convite</span>
            <span style={{ fontSize: '0.84rem', color: '#FFF', fontWeight: 600 }}>
              {formatOrigin(guest.origin)}
            </span>
          </div>

          {/* Data Confirmação */}
          {guest.confirmedAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <span style={{ fontSize: '0.82rem', color: '#9E988D', fontWeight: 600 }}>Data da Confirmação</span>
              <span style={{ fontSize: '0.86rem', color: '#34D399', fontWeight: 800 }}>
                {guest.confirmedAt.split('-').reverse().join('/')} 
                {guest.confirmationSource === 'debutante' ? ' (pela Debutante)' : ' (pelo Convidado)'}
              </span>
            </div>
          )}

          {/* Estado do Link */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: '#9E988D', fontWeight: 600 }}>Estado do Convite</span>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              color: isConfirmed ? '#9E988D' : '#34D399',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isConfirmed ? (
                <>🔒 Presença Garantida</>
              ) : (
                <>🟢 Aguardando Resposta</>
              )}
            </span>
          </div>
        </div>

        {/* Mensagem de Carinho Card (se preenchida) */}
        {guest.sweetMessage && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 92, 154, 0.12) 0%, rgba(212, 175, 55, 0.08) 100%)',
            border: '1.5px solid rgba(255, 92, 154, 0.35)',
            borderRadius: '20px',
            padding: '18px 20px',
            boxShadow: '0 4px 20px rgba(255, 92, 154, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#FFB0C8', fontWeight: 800, marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
              <Heart size={14} fill="#FF5C9A" color="#FF5C9A" />
              <span>Mensagem de Carinho da Debutante:</span>
            </div>
            <p style={{ fontSize: '0.92rem', color: '#FFE2EC', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
              "{guest.sweetMessage}"
            </p>
          </div>
        )}

        {/* Action Panel */}
        <div style={{
          background: '#121212',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '4px'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#D4AF37', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Cinzel', serif" }}>
            Ações do Convite
          </div>

          {/* If Pending: Show Generate Exclusive Link + Confirm Button */}
          {isPending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleCopyLink}
                style={{
                  width: '100%',
                  background: copiedLink ? '#10B981' : 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '14px 18px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                {copiedLink ? <Check size={18} /> : <Share2 size={18} />}
                <span>{copiedLink ? 'Link Copiado com Sucesso!' : 'Copiar Link Individual do Convidado'}</span>
              </button>

              <button
                onClick={handleManualConfirm}
                style={{
                  width: '100%',
                  background: 'rgba(52, 211, 153, 0.15)',
                  border: '1.5px solid #34D399',
                  color: '#34D399',
                  borderRadius: '30px',
                  padding: '12px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                <CheckCircle2 size={16} />
                <span>Confirmar Presença Manualmente</span>
              </button>
            </div>
          )}

          {/* Edit Button */}
          <button
            onClick={() => onEdit(guest)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFF',
              borderRadius: '30px',
              padding: '12px 18px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Edit3 size={15} color="#E8C98D" />
            <span>Editar Dados do Convidado</span>
          </button>

          {/* Delete Button */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px', marginTop: '4px' }}>
            {showConfirmDelete ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.84rem', color: '#FCA5A5', fontWeight: 700 }}>
                  Tem certeza que deseja excluir {guest.name} da lista?
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={handleDelete}
                    style={{
                      background: '#EF4444',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Sim, Excluir
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmDelete(true)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  borderRadius: '30px',
                  padding: '10px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 size={15} />
                <span>Excluir Convidado da Lista</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
