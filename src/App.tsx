import React, { useState } from 'react';
import { AdminStateProvider, useAdminState } from './context/AdminStateContext';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { Header } from './components/layout/Header';
import { NavigationBar } from './components/layout/NavigationBar';
import { VerticalJourney } from './components/journey/VerticalJourney';
import { ReferralList } from './components/referrals/ReferralList';
import { GuestList } from './components/guests/GuestList';
import { AppointmentTimeline } from './components/appointments/AppointmentTimeline';
import { BenefitsHub } from './components/benefits/BenefitsHub';
import { ConquestModal } from './components/journey/ConquestModal';
import { VipConquestModal } from './components/journey/VipConquestModal';
import { CycleRenewalSuccessModal } from './components/journey/CycleRenewalSuccessModal';
import { GuestCapacityModal } from './components/guests/GuestCapacityModal';
import { ReferralFormModal } from './components/referrals/ReferralFormModal';
import { GuestPublicLandingPage } from './components/guests/GuestPublicLandingPage';
import { AdminPortal } from './components/admin/AdminPortal';
import { WelcomeVideoIntroView } from './components/journey/WelcomeVideoIntroView';
import { Wifi, Battery, Signal, ChevronLeft, Bell, Crown } from 'lucide-react';

const MainContentSwitcher: React.FC = () => {
  const { activeTab } = useAppState();
  switch (activeTab) {
    case 'journey':      return <VerticalJourney />;
    case 'referrals':   return <ReferralList />;
    case 'guests':      return <GuestList />;
    case 'appointments':return <AppointmentTimeline />;
    case 'benefits':    return <BenefitsHub />;
    default:            return <VerticalJourney />;
  }
};

export const AppContent: React.FC = () => {
  const { isMobileFrame, currentTheme, isReferralModalOpen, setIsReferralModalOpen } = useAppState();

  const [urlParams, setUrlParams] = useState(() => new URLSearchParams(window.location.search));
  const isPublicInviteFromUrl = urlParams.has('convite') || urlParams.has('invite') || urlParams.has('guestId');
  const urlGuestId = urlParams.get('guestId') || undefined;

  if (isPublicInviteFromUrl) {
    return (
      <GuestPublicLandingPage 
        guestId={urlGuestId} 
        onClose={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setUrlParams(new URLSearchParams());
        }} 
      />
    );
  }

  if (isMobileFrame) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 30% 0%, rgba(101,30,130,0.18) 0%, #090814 55%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
          {/* Mobile Device Frame */}
          <div className="mobile-frame-container">
            {/* iOS status bar */}
            <div style={{
              padding: '12px 24px 6px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#FFF',
              background: '#090814',
              fontFamily: 'Poppins, sans-serif',
            }}>
              <span>9:41</span>
              <div style={{
                width: '88px',
                height: '22px',
                background: '#000',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.07)',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Signal size={11} />
                <Wifi size={11} />
                <Battery size={13} />
              </div>
            </div>

            {/* Mobile header bar */}
            <div style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#090814',
              borderBottom: '1px solid rgba(74,54,84,0.3)',
            }}>
              <ChevronLeft size={20} color="#9F91AB" style={{ cursor: 'pointer' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Crown size={16} color="#E8C98D" />
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    color: '#E8C98D',
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    {currentTheme.name}
                  </span>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <Bell size={18} color="#D1C0DE" />
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#FF3B70',
                  fontSize: '0.54rem',
                  color: '#FFF',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Poppins, sans-serif',
                }}>3</span>
              </div>
            </div>

            {/* App body */}
            <div style={{
              height: '720px',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, #0D0A16 0%, #090814 100%)',
              padding: '16px 16px 96px 16px',
              position: 'relative',
            }}>
              <Header />
              <MainContentSwitcher />
            </div>

            {/* Mobile bottom nav */}
            <NavigationBar />
          </div>

          {/* Global Celebration & Feedback Modals */}
          <ConquestModal />
          <VipConquestModal />
          <CycleRenewalSuccessModal />
          <GuestCapacityModal />
          <ReferralFormModal
            isOpen={isReferralModalOpen}
            onClose={() => setIsReferralModalOpen(false)}
          />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="app-container" style={{ flex: 1 }}>
        {/* 1. Left sidebar */}
        <NavigationBar />

        {/* 2. Main content */}
        <main className="main-content">
          {/* Hero + section title */}
          <Header />

          {/* Active tab content */}
          <MainContentSwitcher />
        </main>

        {/* Global Celebration & Feedback Modals */}
        <ConquestModal />
        <VipConquestModal />
        <CycleRenewalSuccessModal />
        <GuestCapacityModal />
        <ReferralFormModal
          isOpen={isReferralModalOpen}
          onClose={() => setIsReferralModalOpen(false)}
        />
      </div>
    </div>
  );
};

const RootAppRouter: React.FC = () => {
  const { debutantes, venues, getDebutanteBySlug, getVenueById, markWelcomeVideoSeen } = useAdminState();

  const [urlParams] = useState(() => new URLSearchParams(window.location.search));
  const [viewMode, setViewMode] = useState<'admin' | 'debutante'>(() => {
    // Default to admin system unless explicitly provided with ?debutante=slug
    if (urlParams.has('debutante')) return 'debutante';
    return 'admin';
  });

  const [currentDebutanteSlug, setCurrentDebutanteSlug] = useState<string>(() => {
    return urlParams.get('debutante') || 'maria-eduarda-2027';
  });

  // Resolve current active debutante account
  const activeDeb = getDebutanteBySlug(currentDebutanteSlug) || debutantes[0];
  const activeVenue = activeDeb ? getVenueById(activeDeb.venueId) : venues[0];

  // Dynamic Favicon and Document Title
  React.useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    if (viewMode === 'admin') {
      document.title = 'Bonomo Festas • Painel de Gestão & CRM';
      link.href = '/favicon.png';
      link.type = 'image/png';
    } else {
      const debTitle = activeDeb ? `${activeDeb.name} • 15 Anos` : 'Minha Festa de 15 Anos';
      const venueName = activeVenue ? activeVenue.name : 'Bonomo Festas';
      document.title = `${debTitle} | ${venueName}`;
      link.href = activeVenue?.logoUrl || '/favicon.png';
    }
  }, [viewMode, activeDeb, activeVenue]);

  const handleOpenDebutanteApp = (slug?: string) => {
    if (slug) {
      setCurrentDebutanteSlug(slug);
    }
    setViewMode('debutante');
  };

  if (viewMode === 'admin') {
    return <AdminPortal onOpenDebutanteApp={handleOpenDebutanteApp} />;
  }

  // Check if first-access video onboarding is required (suppressed if journey is pending linkage)
  if (activeDeb && activeDeb.hasJourneyEnabled && !activeDeb.isJourneyPending && !activeDeb.hasSeenWelcomeVideo) {
    return (
      <WelcomeVideoIntroView
        debutante={activeDeb}
        venue={activeVenue}
        onStartJourney={() => markWelcomeVideoSeen(activeDeb.slug)}
      />
    );
  }

  return (
    <AppStateProvider initialAccount={activeDeb} key={activeDeb?.id || 'default'}>
      <AppContent />
    </AppStateProvider>
  );
};

export default function App() {
  return (
    <AdminStateProvider>
      <RootAppRouter />
    </AdminStateProvider>
  );
}
