import React, { useEffect } from 'react';
import { Sparkles, Trophy, CheckCircle2, X } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { TransparentRewardVisual } from '../common/TransparentRewardVisual';

export const ConquestModal: React.FC = () => {
  const { conquestMilestone, closeConquestModal, debutante } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConquestModal();
    };
    if (conquestMilestone) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conquestMilestone, closeConquestModal]);

  if (!conquestMilestone) return null;

  return (
    <div
      className="conquest-overlay"
      onClick={closeConquestModal}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 8, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '0',
        animation: 'fadeInOverlay 0.3s ease-out forwards',
      }}
    >
      {/* Bottom Sheet Modal Card that slides UP from the bottom */}
      <div
        className="conquest-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'linear-gradient(180deg, #1C1226 0%, #0F0818 100%)',
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          border: '1.5px solid rgba(255, 215, 0, 0.45)',
          borderBottom: 'none',
          boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.25)',
          padding: '32px 28px 40px 28px',
          position: 'relative',
          textAlign: 'center',
          animation: 'slideUpSheet 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Decorative Drag Handle */}
        <div style={{
          width: '48px',
          height: '4px',
          borderRadius: '2px',
          background: 'rgba(255, 255, 255, 0.2)',
          margin: '0 auto 20px auto',
        }} />

        {/* Close Button */}
        <button
          onClick={closeConquestModal}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D1C0DE',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <X size={18} />
        </button>

        {/* Top Floating Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            background: 'rgba(255, 215, 0, 0.18)',
            color: '#FFD700',
            border: '1px solid rgba(255, 215, 0, 0.5)',
            boxShadow: '0 0 16px rgba(255, 215, 0, 0.3)',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <Trophy size={14} color="#FFD700" />
            NOVA CONQUISTA DESBLOQUEADA
          </span>
        </div>

        {/* Personalized Congratulation Title */}
        <h2 style={{
          fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
          fontWeight: 800,
          color: '#FFFFFF',
          lineHeight: 1.2,
          marginBottom: '6px',
          fontFamily: 'Poppins, sans-serif',
        }}>
          Parabéns, {debutante.name}! ✨
        </h2>

        <p style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#FFD700',
          marginBottom: '20px',
          fontFamily: 'Poppins, sans-serif',
        }}>
          Você conquistou {conquestMilestone.rewardTitle}!
        </p>

        {/* 3D Reward Asset Presentation */}
        <div style={{
          width: '200px',
          height: '150px',
          margin: '0 auto 20px auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Ambient Glow behind asset */}
          <div style={{
            position: 'absolute',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 92, 154, 0.2) 60%, transparent 80%)',
            filter: 'blur(10px)',
            pointerEvents: 'none',
          }} />

          <TransparentRewardVisual
            src={conquestMilestone.rewardImageUrl}
            alt={conquestMilestone.rewardTitle}
            status="completed"
            style={{
              maxWidth: '180px',
              maxHeight: '140px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 12px 28px rgba(255, 215, 0, 0.65)) brightness(1.08)',
              animation: 'floatSimple 3.5s ease-in-out infinite',
              position: 'relative',
              zIndex: 2,
            }}
          />
        </div>

        {/* Success Confirmation Box */}
        <div style={{
          background: 'rgba(255, 215, 0, 0.08)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '18px',
          padding: '16px 20px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#FFD700',
            fontWeight: 700,
            fontSize: '0.9rem',
            marginBottom: '4px',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <CheckCircle2 size={18} color="#FFD700" />
            Benefício Confirmado Automaticamente
          </div>
          <p style={{
            fontSize: '0.82rem',
            color: '#D1C0DE',
            lineHeight: 1.5,
            fontFamily: 'Poppins, sans-serif',
          }}>
            Suas {conquestMilestone.requiredReferrals} indicações foram validadas com sucesso pela equipe comercial. Esse benefício já faz parte do seu contrato para o grande dia!
          </p>
        </div>

        {/* Primary Action Button to Continue */}
        <button
          onClick={closeConquestModal}
          className="btn-gold"
          style={{
            width: '100%',
            padding: '14px 28px',
            fontSize: '1rem',
            fontWeight: 800,
            justifyContent: 'center',
            borderRadius: '50px',
            boxShadow: '0 8px 30px rgba(255, 215, 0, 0.5)',
          }}
        >
          <Sparkles size={18} />
          Continuar na Jornada
        </button>
      </div>

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUpSheet {
          from {
            transform: translateY(100%);
            opacity: 0.5;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
