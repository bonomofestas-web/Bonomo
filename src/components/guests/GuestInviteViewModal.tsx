import React, { useState } from 'react';
import { X, Check, Calendar, MapPin, Copy, Users, XCircle, Heart } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const GuestInviteViewModal: React.FC = () => {
  const { selectedInviteGuest: guest, setSelectedInviteGuest, debutante, updateGuestStatus, confirmGuestRsvp } = useAppState();
  const [copiedLink, setCopiedLink] = useState(false);
  const [message, setMessage] = useState('');
  const [feedbackState, setFeedbackState] = useState<'confirmed' | 'declined' | null>(null);

  if (!guest) return null;

  const handleConfirm = () => {
    confirmGuestRsvp(guest.id, message.trim() || undefined);
    setFeedbackState('confirmed');
  };

  const handleDecline = () => {
    updateGuestStatus(guest.id, 'declined');
    setFeedbackState('declined');
  };

  const handleClose = () => {
    setSelectedInviteGuest(null);
    setFeedbackState(null);
    setMessage('');
  };

  const inviteUrl = `${window.location.origin}${window.location.pathname}?guestId=${guest.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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
        maxWidth: '540px',
        width: '100%',
        padding: '32px 26px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* Close Button */}
        <button
          onClick={handleClose}
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

        {feedbackState ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: feedbackState === 'confirmed' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: feedbackState === 'confirmed' ? '0 0 24px rgba(16, 185, 129, 0.6)' : '0 0 24px rgba(239, 68, 68, 0.6)'
            }}>
              {feedbackState === 'confirmed' ? <Check size={32} color="#FFF" /> : <XCircle size={32} color="#FFF" />}
            </div>

            <h3 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#FFF',
              marginBottom: '8px',
            }}>
              {feedbackState === 'confirmed' ? 'Presença Confirmada com Sucesso!' : 'Convite Recusado'}
            </h3>

            <p style={{ fontSize: '0.86rem', color: '#CFC8BA', lineHeight: 1.5, marginBottom: '24px' }}>
              {feedbackState === 'confirmed' 
                ? `O status de ${guest.name} foi atualizado para Confirmado na sua lista de convidados.` 
                : `O status de ${guest.name} foi atualizado para Recusado.`}
            </p>

            <button
              onClick={handleClose}
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                color: '#000',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '50px',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                letterSpacing: '0.5px'
              }}
            >
              Concluir
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderBottom: '1px solid rgba(212, 175, 55, 0.4)',
                paddingBottom: '4px',
                marginBottom: '10px'
              }}>
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#D4AF37',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                }}>
                  CONVITE INDIVIDUAL DE GALA
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#FFF',
                margin: '0 0 4px 0',
              }}>
                Festa de 15 Anos de {debutante.name}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#C4BDB0', margin: 0 }}>
                Convidado(a) especial de honra
              </p>
            </div>

            {/* Guest Details Card */}
            <div style={{
              background: '#141414',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '18px'
            }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: '#D4AF37', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Convidado(a):
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF' }}>
                {guest.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#9E988D', marginTop: '2px' }}>
                Grupo: <strong style={{ color: '#FFF' }}>{guest.group}</strong> • {guest.phone}
              </div>

              {guest.plusOnes > 0 && (
                <div style={{
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.76rem',
                  color: '#E8C98D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Users size={14} color="#D4AF37" />
                  <span>
                    +{guest.plusOnes} Acompanhante(s): <strong>{guest.companionNames?.join(', ') || 'Nomes a confirmar'}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Event Info Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                background: '#141414',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Calendar size={16} color="#D4AF37" />
                <div>
                  <div style={{ fontSize: '0.64rem', color: '#9E988D', fontWeight: 600, textTransform: 'uppercase' }}>Data</div>
                  <div style={{ fontSize: '0.8rem', color: '#FFF', fontWeight: 700 }}>18/04/2027</div>
                </div>
              </div>

              <div style={{
                background: '#141414',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <MapPin size={16} color="#D4AF37" />
                <div>
                  <div style={{ fontSize: '0.64rem', color: '#9E988D', fontWeight: 600, textTransform: 'uppercase' }}>Local</div>
                  <div style={{ fontSize: '0.8rem', color: '#FFF', fontWeight: 700 }}>Espaço Rio Lounge</div>
                </div>
              </div>
            </div>

            {/* Copy personalized invite link */}
            <div style={{
              background: '#141414',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#B5AFA4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🔗 {inviteUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  background: copiedLink ? '#10B981' : 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: copiedLink ? '#FFF' : '#D4AF37',
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0
                }}
              >
                {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            {/* Sweet message input */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', marginBottom: '6px', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
                <Heart size={13} color="#D4AF37" fill="#D4AF37" />
                <span>Mensagem de Carinho para {debutante.name}:</span>
              </label>
              <textarea
                rows={3}
                placeholder={guest.sweetMessage || "Escreva uma mensagem especial para a aniversariante..."}
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  background: '#141414',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#FFF',
                  fontSize: '0.84rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: "'Montserrat', sans-serif"
                }}
              />
            </div>

            {/* Action Buttons: Confirm vs Decline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '12px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: '0.5px'
                }}
              >
                <Check size={16} />
                <span>Confirmar Presença</span>
              </button>

              <button
                type="button"
                onClick={handleDecline}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '50px',
                  padding: '12px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <X size={15} />
                <span>Recusar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
