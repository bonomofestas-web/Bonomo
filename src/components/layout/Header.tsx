import React, { useState, useMemo } from 'react';
import { Bell, UserPlus, Crown, Calendar, Sparkles } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DebutanteNotificationsModal } from '../notifications/DebutanteNotificationsModal';
import { DebutanteProfileModal } from '../profile/DebutanteProfileModal';

export const Header: React.FC = () => {
  const { 
    debutante, 
    currentTheme, 
    activeTab, 
    setActiveTab, 
    setIsReferralModalOpen, 
    referrals, 
    benefits, 
    vipRewards,
    unreadNotificationsCount,
    markNotificationsAsRead,
  } = useAppState();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const journeyStatus = debutante.journeyCycle.journeyStatus;
  const isJourneyActive = journeyStatus === 'active';

  const hasReferrals = referrals && referrals.length > 0;
  const hasConqueredBenefits = (benefits && benefits.some(b => b.status === 'claimed' || b.status === 'unlocked')) || 
                               (vipRewards && vipRewards.some(r => r.status === 'completed' || r.status === 'claimed'));

  const handleNewReferral = () => {
    setActiveTab('referrals');
    setIsReferralModalOpen(true);
  };

  const isJourneyEnabled = debutante.hasJourneyEnabled !== false;

  const formattedPartyDate = useMemo(() => {
    if (!debutante.partyDate) return null;
    try {
      const parts = debutante.partyDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        return dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch {
      return debutante.partyDate;
    }
    return debutante.partyDate;
  }, [debutante.partyDate]);

  // Condition for floating button:
  // Only show if journey is active AND module is enabled
  const showFab = isJourneyEnabled && isJourneyActive && (
    activeTab === 'journey' || 
    (activeTab === 'referrals' && hasReferrals) || 
    (activeTab === 'benefits' && hasConqueredBenefits)
  );

  return (
    <>
      {/* ── HERO ATMOSPHERE — viewport-fixed layer behind header ── */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '75vh',
          pointerEvents: 'none',
          zIndex: -1,
          overflow: 'hidden',
        }}
      >
        {/* 1. Gala Debutante Photo Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('/hero_bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'right 20%',
          opacity: 0.38,
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 75% 25%, black 0%, black 40%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 90% 80% at 75% 25%, black 0%, black 40%, transparent 80%)',
        }} />

        {/* 2. Dark ambient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(13,8,22,0.1) 0%, rgba(13,8,22,0.7) 60%, rgba(9,8,20,1) 100%)',
        }} />

        {/* 3. Gold & Ambient glow */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '10%',
          width: '500px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 60%)',
        }} />
      </div>

      {/* ── TOP HEADER CONTENT ── */}
      <div style={{ position: 'relative', zIndex: 10, marginBottom: '14px' }}>

        {/* ── MOBILE ONLY HEADER BAR — with safe-area spacing ── */}
        <div className="mobile-only-header-bar" style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'max(52px, env(safe-area-inset-top, 52px)) 0 10px 0',
          marginBottom: '10px',
        }}>
          {/* Center: Dynamic Venue Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <img 
              src={currentTheme.logoUrl || '/logo_riio_lounge.png'} 
              alt={currentTheme.name || 'Casa de Festas'} 
              style={{ 
                height: '84px', 
                maxWidth: '180px',
                width: 'auto', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.6))'
              }} 
            />
          </div>

          {/* Right: Bell notification with dynamic counter */}
          <div 
            onClick={() => {
              setIsNotificationsOpen(true);
              markNotificationsAsRead();
            }}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Bell size={18} color="#FFF" />
            {unreadNotificationsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                background: '#FF3B70',
                boxShadow: '0 0 10px rgba(255, 59, 112, 0.8)',
                color: '#FFF',
                fontSize: '0.62rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                fontFamily: 'Poppins, sans-serif',
              }}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </div>
        </div>

        {/* Notifications Modal */}
        <DebutanteNotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />

        {/* Profile / Avatar Edit Modal */}
        <DebutanteProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />

        {/* ── CARD DE IDENTIFICAÇÃO DA ANIVERSARIANTE ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(32, 20, 48, 0.9) 0%, rgba(18, 12, 28, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '20px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(212, 175, 55, 0.08)',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          {/* Foto da pessoa com aro dourado e coroa - Clicável para alterar foto */}
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            title="Clique para alterar sua foto de perfil"
            style={{ 
              position: 'relative', 
              flexShrink: 0, 
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <img
              src={debutante.avatarUrl || '/avatar_debutante_1.png'}
              alt={debutante.name}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #E8C98D',
                boxShadow: '0 0 14px rgba(232, 201, 141, 0.4)',
                display: 'block',
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)',
              border: '1.5px solid #1A0E00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            }}>
              <Crown size={10} color="#1A0E00" strokeWidth={2.5} />
            </div>
          </div>

          {/* Nome e Mensagem (ou Data nas outras telas) */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              color: '#E8C98D',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '1px',
              fontFamily: 'Poppins, sans-serif',
            }}>
              Aniversariante VIP
            </div>
            <h2 style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 3px 0',
              fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {debutante.name}
            </h2>

            {/* Texto dinâmico: Na tela da Jornada mostra a mensagem da jornada; nas outras telas mostra a data do evento */}
            {activeTab === 'journey' && isJourneyEnabled ? (
              <div style={{
                fontSize: '0.72rem',
                color: 'rgba(209, 192, 222, 0.85)',
                fontFamily: 'Poppins, sans-serif',
                lineHeight: 1.35,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                <Sparkles size={12} color="#FFD700" style={{ flexShrink: 0 }} />
                <span>Sua jornada até o grande dia! Indique amigas e conquiste benefícios para sua festa.</span>
              </div>
            ) : (
              <div style={{
                fontSize: '0.72rem',
                color: 'rgba(209, 192, 222, 0.75)',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                <Calendar size={12} color="#D4AF37" style={{ flexShrink: 0 }} />
                <span>Data do Evento: {formattedPartyDate || '15 de Outubro de 2027'}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE FAB — fixed Nova Indicação pill above bottom nav ── */}
        {showFab && (
          <button
            className="mobile-fab-indicar"
            onClick={handleNewReferral}
            aria-label="Nova Indicação"
          >
            <UserPlus size={17} color="#1A0E00" strokeWidth={2.5} />
            <span>Nova Indicação</span>
          </button>
        )}

        {/* ── DESKTOP TOP BAR (Nova Indicação Button + Bell) ── */}
        <div className="desktop-only-top-actions" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '14px',
          marginBottom: '16px'
        }}>
          {/* Yellow / Gold "Nova Indicação" — only shown when journey is active and on relevant tabs */}
          {showFab && (
            <button
              onClick={handleNewReferral}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 50%, #FB8500 100%)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                padding: '10px 22px',
                borderRadius: '26px',
                color: '#1A0E00',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(255, 183, 3, 0.4), 0 0 10px rgba(255, 215, 0, 0.25)',
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                letterSpacing: '0.2px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 183, 3, 0.55), 0 0 16px rgba(255, 215, 0, 0.45)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(255, 183, 3, 0.4), 0 0 10px rgba(255, 215, 0, 0.25)';
              }}
            >
              <UserPlus size={17} color="#1A0E00" strokeWidth={2.5} />
              <span>Nova Indicação</span>
            </button>
          )}

          {/* Bell Notification */}
          <div 
            onClick={() => {
              setIsNotificationsOpen(true);
              markNotificationsAsRead();
            }}
            style={{
              position: 'relative',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <Bell size={18} color="#FFF" />
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#FF3B70',
              color: '#FFF',
              fontSize: '0.55rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0 0 8px rgba(255,59,112,0.8)',
            }}>3</span>
          </div>
        </div>

      </div>

      <style>{`
        .mobile-only-header-bar,
        .mobile-fab-indicar {
          display: none;
        }
        .desktop-only-top-actions {
          display: flex;
        }

        @media (max-width: 960px) {
          .mobile-fab-indicar {
            display: flex !important;
            align-items: center;
            gap: 8px;
            position: fixed;
            bottom: calc(72px + env(safe-area-inset-bottom, 0px) + 22px);
            left: 50%;
            transform: translateX(-50%);
            z-index: 999;
            background: linear-gradient(135deg, #FFD700 0%, #FFB703 55%, #FB8500 100%);
            border: 1.5px solid rgba(255, 255, 255, 0.4);
            border-radius: 28px;
            padding: 12px 24px;
            color: #1A0E00;
            font-family: 'Poppins', sans-serif;
            font-weight: 800;
            font-size: 0.88rem;
            letter-spacing: 0.2px;
            cursor: pointer;
            box-shadow: 0 6px 22px rgba(255, 183, 3, 0.55), 0 0 18px rgba(255, 215, 0, 0.35);
            white-space: nowrap;
            animation: fabPulseGold 3s ease-in-out infinite;
          }
        }

        @keyframes fabPulseGold {
          0%, 100% { box-shadow: 0 6px 22px rgba(255, 183, 3, 0.55), 0 0 18px rgba(255, 215, 0, 0.35); }
          50%       { box-shadow: 0 8px 28px rgba(255, 183, 3, 0.75), 0 0 28px rgba(255, 215, 0, 0.55); }
        }

        @media (max-width: 768px) {
          .mobile-only-header-bar {
            display: flex !important;
          }
          .desktop-only-top-actions {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
