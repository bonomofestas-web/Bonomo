import React from 'react';
import { Sparkles, UserPlus, Users, Calendar, Gift, Settings } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import type { TabType } from '../../types';

export const NavigationBar: React.FC = () => {
  const { activeTab, setActiveTab, debutante, currentTheme } = useAppState();

  const isJourneyEnabled = debutante.hasJourneyEnabled !== false;

  const allNavItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'journey',      label: 'Jornada',      icon: <Sparkles size={16} /> },
    { id: 'referrals',   label: 'Indicações',   icon: <UserPlus size={16} /> },
    { id: 'guests',      label: 'Convidados',   icon: <Users size={16} /> },
    { id: 'appointments',label: 'Compromissos', icon: <Calendar size={16} /> },
    { id: 'benefits',    label: 'Benefícios',   icon: <Gift size={16} /> },
  ];

  const navItems = isJourneyEnabled 
    ? allNavItems 
    : allNavItems.filter(item => item.id === 'guests' || item.id === 'appointments');

  // If currently on a disabled tab, fallback to guests
  React.useEffect(() => {
    if (!isJourneyEnabled && (activeTab === 'journey' || activeTab === 'referrals' || activeTab === 'benefits')) {
      setActiveTab('guests');
    }
  }, [isJourneyEnabled, activeTab, setActiveTab]);

  return (
    <>
      {/* ─── DESKTOP SIDEBAR (Venue Fixed Sidebar) ─────────────────────────── */}
      <aside className="desktop-sidebar">

        {/* ── 1. Brand identity: Venue Logo (only if present) ── */}
        {currentTheme?.logoUrl && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '20px',
          }}>
            <img 
              src={currentTheme.logoUrl} 
              alt={currentTheme.name || 'Casa de Festa'} 
              style={{ 
                maxWidth: '120px', 
                maxHeight: '60px', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.45))'
              }} 
            />
          </div>
        )}

        {/* ── 2. Debutante identity ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <img
              src={debutante.avatarUrl}
              alt={debutante.name}
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #E8C98D',
                boxShadow: '0 0 16px rgba(232,201,141,0.25)',
                display: 'block',
              }}
            />
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF', lineHeight: 1.2, fontFamily: 'Poppins, sans-serif' }}>
            {debutante.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(209,192,222,0.55)', fontWeight: 500, marginTop: '2px', fontFamily: 'Poppins, sans-serif' }}>
            Meus 15 anos
          </div>
        </div>

        {/* ── 3. Navigation ── */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(255,59,112,0.2) 0%, rgba(255,59,112,0.06) 100%)'
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : 'rgba(209,192,222,0.7)',
                  border: isActive
                    ? '1px solid rgba(255,59,112,0.4)'
                    : '1px solid transparent',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  width: '100%',
                  boxShadow: isActive ? '0 4px 16px rgba(255,59,112,0.15)' : 'none',
                }}
              >
                <span style={{
                  color: isActive ? '#FF3B70' : 'rgba(209,192,222,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── 4. Settings ── */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(209,192,222,0.5)',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
            borderRadius: '10px',
            transition: 'all 0.2s ease',
            width: '100%',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FFF')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(209,192,222,0.5)')}
        >
          <Settings size={16} />
          Configurações
        </button>
      </aside>

      {/* ─── MOBILE BOTTOM BAR (Villa Diamond Style) ───────────────────────── */}
      <nav
        className="mobile-bottom-bar"
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'rgba(14, 9, 24, 0.98)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '8px 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px',
          display: 'none',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.8)',
        }}
      >
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? '#FF3B70' : 'rgba(209,192,222,0.65)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                fontSize: '0.62rem',
                fontWeight: isActive ? 800 : 500,
                cursor: 'pointer',
                padding: '4px 2px',
                fontFamily: 'Poppins, sans-serif',
                transition: 'all 0.2s ease',
                flex: 1,
                minWidth: '0',
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: isActive ? 'rgba(255,59,112,0.14)' : 'transparent',
                border: isActive ? '1.5px solid #FF3B70' : '1.5px solid transparent',
                color: isActive ? '#FF3B70' : 'rgba(209,192,222,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? '0 0 14px rgba(255,59,112,0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                {item.icon}
              </div>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
                textAlign: 'center',
                letterSpacing: '0.2px'
              }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
