import React, { useEffect } from 'react';
import { Users, Sparkles, X, ArrowRight } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const GuestCapacityModal: React.FC = () => {
  const { conquestCapacityReward, closeConquestCapacityModal, debutante } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && conquestCapacityReward) {
        closeConquestCapacityModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conquestCapacityReward, closeConquestCapacityModal]);

  if (!conquestCapacityReward) return null;

  return (
    <div
      className="capacity-modal-overlay"
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
      onClick={closeConquestCapacityModal}
    >
      <div
        className="capacity-modal-sheet"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(180deg, rgba(20, 36, 28, 0.98) 0%, rgba(10, 20, 16, 0.99) 100%)',
          borderTop: '2px solid #34D399',
          borderLeft: '1px solid rgba(52, 211, 153, 0.35)',
          borderRight: '1px solid rgba(52, 211, 153, 0.35)',
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          padding: '32px 28px 40px 28px',
          position: 'relative',
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.8), 0 0 40px rgba(52, 211, 153, 0.3)',
          animation: 'slideUpSheet 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeConquestCapacityModal}
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
          background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.2) 0%, rgba(16, 185, 129, 0.3) 100%)',
          border: '1px solid #34D399',
          borderRadius: '50px',
          padding: '6px 18px',
          marginBottom: '16px',
          boxShadow: '0 0 16px rgba(52, 211, 153, 0.4)',
        }}>
          <Sparkles size={16} color="#34D399" />
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 900,
            color: '#34D399',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: 'Poppins, sans-serif',
          }}>
            Capacidade Expandida!
          </span>
        </div>

        {/* Heading */}
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
          Você conquistou o benefício de <strong style={{ color: '#34D399' }}>+{conquestCapacityReward.bonus} convidados</strong> para sua festa!
        </p>

        {/* Visual Metric Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          borderRadius: '18px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '26px',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid #34D399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Users size={24} color="#34D399" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: 700 }}>
              Novo Limite da Lista de Convidados
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFF', fontFamily: 'Poppins, sans-serif' }}>
              {conquestCapacityReward.newLimit} convidados <span style={{ fontSize: '0.82rem', color: '#34D399', fontWeight: 700 }}>({conquestCapacityReward.previousLimit} + {conquestCapacityReward.bonus})</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={closeConquestCapacityModal}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
            color: '#042F1E',
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
            boxShadow: '0 6px 24px rgba(52, 211, 153, 0.5)',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'transform 0.2s ease',
          }}
        >
          <span>Acessar Lista de Convidados</span>
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
