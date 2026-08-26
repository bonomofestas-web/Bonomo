import React from 'react';
import { Lock, UserPlus, ArrowRight, Gift, Crown } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const CyclePausedOverlay: React.FC = () => {
  const { debutante, setActiveTab, setJourneySubTab, setIsReferralModalOpen } = useAppState();
  const { journeyCycle } = debutante;

  const isClosed = journeyCycle.journeyStatus === 'closed';
  const currentProgress = journeyCycle.cycleRenewalProgress;
  const remaining = Math.max(0, 3 - currentProgress);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '12px 0 24px 0',
      animation: 'fadeIn 0.3s ease-out',
      width: '100%',
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: isClosed
          ? 'linear-gradient(135deg, rgba(38, 24, 18, 0.98) 0%, rgba(20, 12, 16, 0.99) 100%)'
          : 'linear-gradient(135deg, rgba(32, 18, 42, 0.96) 0%, rgba(18, 10, 24, 0.98) 100%)',
        border: isClosed ? '2px solid #FFD700' : '1.5px solid rgba(255, 215, 0, 0.4)',
        borderRadius: '24px',
        padding: '34px 24px',
        textAlign: 'center',
        boxShadow: isClosed
          ? '0 16px 48px rgba(0, 0, 0, 0.85), 0 0 32px rgba(255, 215, 0, 0.3)'
          : '0 16px 48px rgba(0, 0, 0, 0.8), 0 0 32px rgba(255, 215, 0, 0.2)',
        position: 'relative',
      }}>
        {/* Top Icon Badge */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: isClosed
            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.35) 0%, rgba(221, 168, 75, 0.25) 100%)'
            : 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 183, 3, 0.3) 100%)',
          border: isClosed ? '2px solid #FFD700' : '1.5px solid #FFD700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: isClosed ? '0 0 24px rgba(255, 215, 0, 0.55)' : '0 0 20px rgba(255, 215, 0, 0.4)',
        }}>
          {isClosed ? <Gift size={28} color="#FFD700" /> : <Lock size={26} color="#FFD700" />}
        </div>

        {/* Heading */}
        <h2 style={{
          fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
          fontWeight: 800,
          color: '#FFF',
          fontFamily: 'Poppins, sans-serif',
          lineHeight: 1.2,
          marginBottom: '8px',
        }}>
          {isClosed ? 'Sua jornada foi encerrada' : 'Sua jornada está pausada.'}
        </h2>

        <p style={{
          fontSize: '0.86rem',
          color: 'rgba(232, 201, 141, 0.9)',
          fontFamily: 'Poppins, sans-serif',
          lineHeight: 1.5,
          marginBottom: isClosed ? '28px' : '20px',
        }}>
          {isClosed
            ? 'O prazo máximo de 6 meses da jornada de benefícios foi atingido. Você ainda pode acompanhar todos os seus presentes VIP e benefícios conquistados!'
            : <>O prazo deste ciclo encerrou. Você ainda pode acompanhar os benefícios que já conquistou na aba <strong style={{ color: '#FFD700' }}>Benefícios</strong>.</>}
        </p>

        {isClosed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setJourneySubTab('vip_rewards')}
              style={{
                background: 'linear-gradient(135deg, #DDA84B 0%, #FFD700 100%)',
                color: '#1A0E24',
                border: 'none',
                borderRadius: '50px',
                padding: '14px 28px',
                fontSize: '0.92rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: '0 6px 24px rgba(255, 215, 0, 0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'transform 0.2s ease',
              }}
            >
              <Crown size={18} color="#1A0E24" />
              <span>Acompanhar Presentes VIP</span>
              <ArrowRight size={16} color="#1A0E24" />
            </button>

            <button
              onClick={() => setActiveTab('benefits')}
              style={{
                background: 'rgba(255, 215, 0, 0.1)',
                color: '#FFD700',
                border: '1px solid rgba(255, 215, 0, 0.35)',
                borderRadius: '50px',
                padding: '11px 24px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'Poppins, sans-serif',
                transition: 'all 0.2s ease',
              }}
            >
              <Gift size={16} color="#FFD700" />
              <span>Ver Benefícios Conquistados</span>
            </button>
          </div>
        ) : (
          <>
            {/* Renewal Box (Section 13) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 215, 0, 0.25)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#FFD700',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontFamily: 'Poppins, sans-serif',
                marginBottom: '4px',
              }}>
                Quer continuar de onde parou?
              </div>

              <div style={{
                fontSize: '0.82rem',
                color: '#FFF',
                fontFamily: 'Poppins, sans-serif',
                marginBottom: '14px',
              }}>
                Indique <strong>3 amigas</strong> para desbloquear mais <strong>7 dias de jornada</strong>.
              </div>

              {/* 3 Step Indicators: ○ ○ ○ */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '10px',
              }}>
                {[1, 2, 3].map((step) => {
                  const isFilled = currentProgress >= step;
                  return (
                    <div
                      key={step}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isFilled
                          ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                          : 'rgba(255, 255, 255, 0.08)',
                        border: isFilled
                          ? '1.5px solid #FFF'
                          : '1.5px dashed rgba(255, 255, 255, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isFilled ? '#1A0E00' : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        boxShadow: isFilled ? '0 0 12px rgba(255, 215, 0, 0.7)' : 'none',
                        transition: 'all 0.3s ease',
                      }}>
                        {isFilled ? '✓' : step}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                fontSize: '0.74rem',
                color: remaining === 0 ? '#34D399' : '#FFD700',
                fontWeight: 700,
                fontFamily: 'Poppins, sans-serif',
              }}>
                {currentProgress === 0 && 'Faltam 3 indicações para desbloquear (+7 dias)'}
                {currentProgress === 1 && 'Você já indicou 1 de 3 • Faltam 2 indicações!'}
                {currentProgress === 2 && 'Está quase lá! 2 de 3 • Falta apenas 1 indicação!'}
                {currentProgress >= 3 && '✨ Jornada desbloqueada! +7 dias'}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setActiveTab('referrals');
                  setIsReferralModalOpen(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 50%, #FB8500 100%)',
                  color: '#1A0E00',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  borderRadius: '50px',
                  padding: '14px 28px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 6px 24px rgba(255, 183, 3, 0.45), 0 0 12px rgba(255, 215, 0, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(255, 183, 3, 0.6), 0 0 16px rgba(255, 215, 0, 0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 183, 3, 0.45), 0 0 12px rgba(255, 215, 0, 0.3)';
                }}
              >
                <UserPlus size={18} color="#1A0E00" strokeWidth={2.5} />
                <span>Indicar Amigas</span>
                <ArrowRight size={16} color="#1A0E00" strokeWidth={2.5} />
              </button>

              <button
                onClick={() => setActiveTab('benefits')}
                style={{
                  background: 'transparent',
                  color: 'rgba(232, 201, 141, 0.8)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '50px',
                  padding: '10px 20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                <Gift size={14} color="#FFD700" />
                <span>Ver Benefícios Já Conquistados</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
