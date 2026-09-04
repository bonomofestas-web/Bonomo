import React, { useState, useRef } from 'react';
import { Trash2, Tag, CheckCircle2, Clock, Send, Sparkles, ChevronRight } from 'lucide-react';
import type { Guest } from '../../types';
import { useAppState } from '../../context/AppStateContext';

interface SwipeableGuestCardProps {
  guest: Guest;
  onClick: () => void;
  onDelete: (guestId: string) => void;
  onSendWhatsApp: (guest: Guest, e: React.MouseEvent) => void;
  onReferral: (guest: Guest, e: React.MouseEvent) => void;
}

export const SwipeableGuestCard: React.FC<SwipeableGuestCardProps> = ({
  guest,
  onClick,
  onDelete,
  onSendWhatsApp,
  onReferral,
}) => {
  const { debutante, referrals } = useAppState();
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const isConfirmed = guest.status === 'confirmed';
  const isPending = guest.status === 'pending';
  const isDeclined = guest.status === 'declined';

  // Regra de Indicação: Meninas de 10 a 15 anos + Jornada Ativada no Painel
  const isJourneyEnabled = debutante.hasJourneyEnabled !== false;
  const isEligibleAgeAndGender = (guest.gender === 'female' || !guest.gender) && guest.age >= 10 && guest.age <= 15;
  
  const cleanPhone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
  const isAlreadyReferred = Boolean(
    guest.isReferred || 
    (cleanPhone && referrals.some(r => r.phone.replace(/\D/g, '') === cleanPhone))
  );

  const showReferralButton = isJourneyEnabled && isEligibleAgeAndGender && !isAlreadyReferred;
  const showAlreadyReferredBadge = isJourneyEnabled && isEligibleAgeAndGender && isAlreadyReferred;

  const triggerDelete = () => {
    setIsDeleting(true);
    setOffsetX(-400);
    setTimeout(() => {
      onDelete(guest.id);
    }, 280);
  };

  // Touch Handlers (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    if (diff < 0) {
      // Swiping left (allow up to -200px)
      setOffsetX(Math.max(diff, -180));
    } else {
      // Swiping right (slight resistance)
      setOffsetX(Math.min(diff * 0.2, 20));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offsetX < -110) {
      triggerDelete();
    } else {
      setOffsetX(0);
    }
  };

  // Mouse Handlers (Desktop Testing / Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if not clicking buttons directly
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    currentXRef.current = e.clientX;
    const diff = currentXRef.current - startXRef.current;
    if (diff < 0) {
      setOffsetX(Math.max(diff, -180));
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offsetX < -110) {
      triggerDelete();
    } else {
      setOffsetX(0);
    }
  };

  const isWillDelete = offsetX < -100;

  return (
    <div 
      style={{ 
        position: 'relative', 
        borderRadius: '18px', 
        overflow: 'hidden',
        transition: isDeleting ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        maxHeight: isDeleting ? '0px' : '220px',
        opacity: isDeleting ? 0 : 1,
        marginBottom: isDeleting ? '0px' : '0px',
        transform: isDeleting ? 'scaleY(0)' : 'none',
      }}
    >
      {/* Background Red Delete Action (Revealed on swipe left) */}
      <div 
        onClick={triggerDelete}
        style={{
          position: 'absolute',
          inset: 0,
          background: isWillDelete 
            ? 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' 
            : 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '24px',
          cursor: 'pointer',
          borderRadius: '18px',
          gap: '8px',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: '0.82rem',
          fontFamily: "'Cinzel', serif",
          boxShadow: isWillDelete ? 'inset 0 0 20px rgba(0,0,0,0.5)' : 'none',
          transition: 'background 0.2s ease',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transform: isWillDelete ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.15s ease',
        }}>
          <Trash2 size={22} color="#FFF" />
          <span>{isWillDelete ? 'Solte para Remover' : 'Remover'}</span>
        </div>
      </div>

      {/* Foreground Guest Card (Draggable) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => {
          if (Math.abs(offsetX) < 10) {
            onClick();
          }
        }}
        className="guest-item-card"
        style={{
          background: 'linear-gradient(135deg, #141414 0%, #0E0E0E 100%)',
          border: '1px solid rgba(212, 175, 55, 0.22)',
          borderRadius: '18px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderLeft: isConfirmed ? '4px solid #10B981' : isPending ? '4px solid #D4AF37' : '4px solid #EF4444',
          opacity: isDeclined ? 0.75 : 1,
          cursor: 'pointer',
          position: 'relative',
          zIndex: 2,
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          userSelect: 'none',
          touchAction: 'pan-y',
        }}
      >
        {/* Top Row: Name + Group Badge + Status Badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                margin: 0,
                textDecoration: isDeclined ? 'line-through' : 'none',
                color: '#FFF',
                fontFamily: "'Playfair Display', Georgia, serif",
                letterSpacing: '0.2px',
              }}>
                {guest.name}
              </h3>

              <span className="badge" style={{
                background: 'rgba(212, 175, 55, 0.15)',
                color: '#E8C98D',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '3px 8px',
              }}>
                <Tag size={10} /> {guest.group}
              </span>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#B5AFA4', marginTop: '4px', fontFamily: "'Montserrat', sans-serif" }}>
              {guest.phone} • {guest.age} anos • {guest.gender === 'female' ? 'Feminino ♀' : guest.gender === 'male' ? 'Masculino ♂' : 'Outro'}
            </div>
          </div>

          {/* Status indicator on top right */}
          <div>
            {isConfirmed && (
              <span style={{
                fontSize: '0.72rem',
                color: '#34D399',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                whiteSpace: 'nowrap',
              }}>
                <CheckCircle2 size={12} /> Confirmado
              </span>
            )}
            {isPending && (
              <span style={{
                fontSize: '0.72rem',
                color: '#E8C98D',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(212, 175, 55, 0.12)',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                whiteSpace: 'nowrap',
              }}>
                <Clock size={12} /> Aguardando
              </span>
            )}
            {isDeclined && (
              <span style={{
                fontSize: '0.72rem',
                color: '#EF4444',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(239, 68, 68, 0.12)',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                whiteSpace: 'nowrap',
              }}>
                ✕ Recusado
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row: Actions Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '10px',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isPending && (
              <button
                onClick={(e) => onSendWhatsApp(guest, e)}
                style={{
                  background: 'rgba(37, 211, 102, 0.15)',
                  border: '1px solid rgba(37, 211, 102, 0.4)',
                  color: '#25D366',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Enviar convite individual no WhatsApp deste convidado"
              >
                <Send size={12} />
                <span>WhatsApp</span>
              </button>
            )}

            {/* ✨ Botão "Indicar Amiga" para meninas de 12 a 14 anos */}
            {showReferralButton && (
              <button
                onClick={(e) => onReferral(guest, e)}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 92, 154, 0.2) 0%, rgba(212, 175, 55, 0.2) 100%)',
                  border: '1px solid #FF5C9A',
                  color: '#FFD700',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 10px rgba(255, 92, 154, 0.25)',
                }}
                title="Indicar esta amiga para ganhar pontos e benefícios na jornada!"
              >
                <Sparkles size={12} color="#FF5C9A" />
                <span>Indicar Amiga (15 Anos)</span>
              </button>
            )}

            {/* 👑 Badge "Amiga Indicada" quando já foi indicada (sem botão para evitar duplicidade) */}
            {showAlreadyReferredBadge && (
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10B981',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Esta amiga já foi indicada pela debutante para a Casa de Festas"
              >
                <CheckCircle2 size={12} color="#10B981" />
                <span>Amiga Indicada ✨</span>
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#D4AF37',
            fontSize: '0.76rem',
            fontWeight: 700,
            fontFamily: "'Cinzel', serif",
            marginLeft: 'auto',
          }}>
            <span>Ver Detalhes</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
