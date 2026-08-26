import React, { useEffect } from 'react';
import { Sparkles, Calendar, ArrowRight, X } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const CycleRenewalSuccessModal: React.FC = () => {
  const { cycleRenewalSuccess, closeCycleRenewalSuccessModal, debutante } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cycleRenewalSuccess) {
        closeCycleRenewalSuccessModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleRenewalSuccess, closeCycleRenewalSuccessModal]);

  if (!cycleRenewalSuccess) return null;

  return (
    <div
      className="cycle-renewal-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 3, 8, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
        animation: 'fadeInOverlay 0.3s ease-out forwards',
      }}
      onClick={closeCycleRenewalSuccessModal}
    >
      <div
        className="cycle-renewal-modal-sheet"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(180deg, rgba(38, 18, 38, 0.98) 0%, rgba(18, 10, 24, 0.99) 100%)',
          borderTop: '2px solid #FF5C9A',
          borderLeft: '1px solid rgba(255, 92, 154, 0.35)',
          borderRight: '1px solid rgba(255, 92, 154, 0.35)',
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          padding: '32px 28px 40px 28px',
          position: 'relative',
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 92, 154, 0.3)',
          animation: 'slideUpSheet 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeCycleRenewalSuccessModal}
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
          background: 'linear-gradient(135deg, rgba(255, 92, 154, 0.25) 0%, rgba(255, 20, 147, 0.35) 100%)',
          border: '1px solid #FF5C9A',
          borderRadius: '50px',
          padding: '6px 18px',
          marginBottom: '16px',
          boxShadow: '0 0 16px rgba(255, 92, 154, 0.4)',
        }}>
          <Sparkles size={16} color="#FF5C9A" />
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 900,
            color: '#FFB0C8',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: 'Poppins, sans-serif',
          }}>
            Jornada Desbloqueada!
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
          marginBottom: '22px',
        }}>
          Você completou as 3 indicações e ganhou <strong style={{ color: '#FFD700' }}>mais 7 dias</strong> para continuar sua jornada de benefícios!
        </p>

        {/* Visual Badge Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '18px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          marginBottom: '26px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255, 215, 0, 0.15)',
            border: '1px solid #FFD700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Calendar size={22} color="#FFD700" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', fontFamily: 'Poppins, sans-serif' }}>
              +7 Dias de Acesso Liberados
            </div>
            <div style={{ fontSize: '0.76rem', color: '#E8C98D', fontFamily: 'Poppins, sans-serif' }}>
              Novo ciclo iniciado • Continue conquistando benefícios!
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={closeCycleRenewalSuccessModal}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #FF5C9A 0%, #FF1493 100%)',
            color: '#FFF',
            border: 'none',
            borderRadius: '50px',
            padding: '14px 28px',
            fontSize: '0.92rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 6px 24px rgba(255, 92, 154, 0.5)',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'transform 0.2s ease',
          }}
        >
          <span>Continuar Jornada</span>
          <ArrowRight size={16} />
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
