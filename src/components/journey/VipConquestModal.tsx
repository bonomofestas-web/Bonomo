import React, { useEffect } from 'react';
import { X, Crown } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { TransparentRewardVisual } from '../common/TransparentRewardVisual';

export const VipConquestModal: React.FC = () => {
  const { conquestVipReward, closeConquestVipModal, debutante } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && conquestVipReward) {
        closeConquestVipModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conquestVipReward, closeConquestVipModal]);

  if (!conquestVipReward) return null;

  return (
    <div
      className="vip-conquest-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 3, 8, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end', // Bottom Sheet behavior
        justifyContent: 'center',
        padding: '0',
        animation: 'fadeInOverlay 0.3s ease-out forwards',
      }}
      onClick={closeConquestVipModal}
    >
      <div
        className="vip-conquest-modal-sheet"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(180deg, rgba(38, 26, 12, 0.98) 0%, rgba(18, 12, 6, 0.99) 100%)',
          borderTop: '2px solid #FFD700',
          borderLeft: '1px solid rgba(255, 215, 0, 0.35)',
          borderRight: '1px solid rgba(255, 215, 0, 0.35)',
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          padding: '32px 28px 40px 28px',
          position: 'relative',
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.3)',
          animation: 'slideUpSheet 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeConquestVipModal}
          style={{
            position: 'absolute',
            top: '18px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Top Floating Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(221, 168, 75, 0.35) 100%)',
          border: '1px solid #FFD700',
          borderRadius: '50px',
          padding: '6px 18px',
          marginBottom: '16px',
          boxShadow: '0 0 16px rgba(255, 215, 0, 0.4)',
        }}>
          <Crown size={16} color="#FFD700" />
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 900,
            color: '#FFD700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: 'Poppins, sans-serif',
          }}>
            Novo Presente VIP Conquistado!
          </span>
        </div>

        {/* Main Heading */}
        <h2 style={{
          fontSize: 'clamp(1.6rem, 5vw, 2.1rem)',
          fontWeight: 900,
          color: '#FFF',
          fontFamily: 'Poppins, sans-serif',
          lineHeight: 1.15,
          marginBottom: '8px',
        }}>
          Parabéns, {debutante.name}! ✨
        </h2>

        <p style={{
          fontSize: '0.92rem',
          color: 'rgba(232, 201, 141, 0.9)',
          fontFamily: 'Poppins, sans-serif',
          marginBottom: '20px',
        }}>
          Uma de suas indicações fechou contrato de festa e você desbloqueou este presente de alto luxo!
        </p>

        {/* 3D Reward Display Center */}
        <div style={{
          position: 'relative',
          width: '180px',
          height: '160px',
          margin: '0 auto 16px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Ambient Glow Aura */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(10px)',
          }} />

          <TransparentRewardVisual
            src={conquestVipReward.imageUrl}
            alt={conquestVipReward.name}
            style={{
              maxWidth: '170px',
              maxHeight: '140px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 12px 28px rgba(255, 215, 0, 0.7)) brightness(1.08)',
              animation: 'floatSimple 3s ease-in-out infinite',
              position: 'relative',
              zIndex: 2,
            }}
          />
        </div>

        {/* Reward Name Banner */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '16px',
          padding: '12px 18px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', fontFamily: 'Poppins, sans-serif' }}>
            {conquestVipReward.name}
          </div>
          {conquestVipReward.subtitle && (
            <div style={{ fontSize: '0.8rem', color: '#FFD700', fontWeight: 600, marginTop: '2px', fontFamily: 'Poppins, sans-serif' }}>
              {conquestVipReward.subtitle}
            </div>
          )}
        </div>

        {/* Action Button: Continuar na Jornada */}
        <button
          onClick={closeConquestVipModal}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #DDA84B 0%, #FFD700 100%)',
            color: '#3D2702',
            border: 'none',
            borderRadius: '50px',
            padding: '14px 28px',
            fontSize: '0.92rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(255, 215, 0, 0.5)',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'transform 0.2s ease',
          }}
        >
          Continuar na Jornada ✨
        </button>
      </div>

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
