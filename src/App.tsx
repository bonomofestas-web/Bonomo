import React, { useState, useEffect } from 'react';
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
import { debutanteService } from './services/debutanteService';
import type { DebutanteAccount } from './types/admin';
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

const parseRouteFromLocation = (): { mode: 'debutante' | 'admin'; slug?: string } => {
  if (typeof window === 'undefined') return { mode: 'admin', slug: 'maria-eduarda-2027' };

  const urlParams = new URLSearchParams(window.location.search);
  const paramSlug = urlParams.get('debutante') || urlParams.get('d') || urlParams.get('slug');
  if (paramSlug) {
    return { mode: 'debutante', slug: decodeURIComponent(paramSlug).trim() };
  }

  const hash = window.location.hash;
  if (hash.includes('debutante=')) {
    const match = hash.match(/debutante=([^&]+)/);
    if (match && match[1]) {
      return { mode: 'debutante', slug: decodeURIComponent(match[1]).trim() };
    }
  }

  if (urlParams.has('admin') || urlParams.has('portal') || urlParams.has('login')) {
    return { mode: 'admin', slug: '' };
  }

  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (path && !path.startsWith('admin') && !path.startsWith('api') && !path.startsWith('assets') && !path.includes('.')) {
    return { mode: 'debutante', slug: decodeURIComponent(path).trim() };
  }

  return { mode: 'admin', slug: 'maria-eduarda-2027' };
};

import { createMonogramAvatar, generateBlackGoldPwaIcon } from './utils/avatarUtils';

const generateDynamicDebutanteFromSlug = (slug: string, venueId?: string): DebutanteAccount => {
  const clean = decodeURIComponent(slug).trim().toLowerCase();
  const withoutRandom = clean.replace(/-\d{4}(-[a-z0-9]+)?$/, '');
  const parts = withoutRandom.split('-').filter(Boolean);
  const formattedName = parts.length > 0 
    ? parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') 
    : 'Debutante';
  
  const yearMatch = clean.match(/-(20\d{2})/);
  const partyYear = yearMatch ? yearMatch[1] : '2027';

  return {
    id: `deb_${clean.replace(/[^a-z0-9]/g, '_')}`,
    venueId: venueId || 'all',
    name: formattedName,
    slug: clean,
    partyDate: `${partyYear}-11-15`,
    partyDaysLeft: 240,
    avatarUrl: createMonogramAvatar(formattedName),
    phone: '(21) 99999-9999',
    hasJourneyEnabled: true,
    isJourneyPending: false,
    hasSeenWelcomeVideo: false,
    baseGuestLimit: 250,
    extraGuestsUnlocked: 0,
    currentGuestLimit: 250,
    validReferrals: 0,
    totalTargetReferrals: 30,
    journeyProgressPercentage: 0,
    convertedReferralSales: 0,
    journeyCycle: {
      journeyStartDate: new Date().toISOString(),
      journeyMaximumEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      currentCycleStartDate: new Date().toISOString(),
      currentCycleEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      cycleRenewalTarget: 3,
      cycleRenewalProgress: 0,
      journeyStatus: 'active',
    },
    milestones: [],
    vipRewards: [],
    guests: [],
    referrals: [],
    appointments: [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };
};

const RootAppRouter: React.FC = () => {
  const { debutantes, venues, getDebutanteBySlug, getVenueById, markWelcomeVideoSeen } = useAdminState();

  const [routeInfo, setRouteInfo] = useState(parseRouteFromLocation);
  const [asyncDeb, setAsyncDeb] = useState<any>(null);

  // Listen to popstate and hashchange for smooth in-browser navigation
  useEffect(() => {
    const handleLocationChange = () => {
      setRouteInfo(parseRouteFromLocation());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const viewMode = routeInfo.mode;
  const currentDebutanteSlug = routeInfo.slug;

  // Resolve current active debutante account
  const inMemoryDeb = 
    (currentDebutanteSlug ? getDebutanteBySlug(currentDebutanteSlug) : undefined) ||
    debutantes.find(d => currentDebutanteSlug && (d.slug.toLowerCase() === currentDebutanteSlug.toLowerCase() || d.id === currentDebutanteSlug));

  const [isLoadingSlug, setIsLoadingSlug] = useState<boolean>(() => {
    return Boolean(viewMode === 'debutante' && currentDebutanteSlug && !inMemoryDeb);
  });

  // If not found in memory (e.g. fresh incognito visit), fetch directly from Supabase
  useEffect(() => {
    if (viewMode === 'debutante' && currentDebutanteSlug && !inMemoryDeb) {
      setIsLoadingSlug(true);
      debutanteService.getBySlug(currentDebutanteSlug).then(result => {
        if (result) setAsyncDeb(result);
        setIsLoadingSlug(false);
      }).catch(() => {
        setIsLoadingSlug(false);
      });
    }
  }, [viewMode, currentDebutanteSlug, inMemoryDeb]);

  const dynamicFallbackDeb = (viewMode === 'debutante' && currentDebutanteSlug) 
    ? generateDynamicDebutanteFromSlug(currentDebutanteSlug, venues[0]?.id)
    : undefined;

  const activeDeb = inMemoryDeb || asyncDeb || dynamicFallbackDeb || debutantes[0];
  const activeVenue = activeDeb ? getVenueById(activeDeb.venueId) : venues[0];

  // Dynamic Favicon, Apple Touch Icon (Home Screen) and Document Title
  React.useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }

    let manifestLink: HTMLLinkElement | null = document.querySelector("link[rel='manifest']");

    const venueIcon = activeVenue?.logoUrl || '/logo_riio_lounge.png';

    if (viewMode === 'admin') {
      document.title = 'Bonomo Festas • Painel de Gestão & CRM';
      link.href = '/favicon.png';
      link.type = 'image/png';
      appleLink.href = '/favicon.png';
    } else {
      const debTitle = activeDeb ? `${activeDeb.name} • 15 Anos` : 'Minha Festa de 15 Anos';
      const venueName = activeVenue ? activeVenue.name : 'Bonomo Festas';
      document.title = `${debTitle} | ${venueName}`;
      link.href = venueIcon;

      // Generate solid black background with centered golden logo for home screen
      generateBlackGoldPwaIcon(venueIcon).then((blackGoldPwaIconUrl) => {
        if (appleLink) {
          appleLink.href = blackGoldPwaIconUrl;
        }

        try {
          const dynamicManifest = {
            name: `${activeDeb?.name || '15 Anos'} • ${venueName}`,
            short_name: `${activeDeb?.name || '15 Anos'}`,
            description: `Aplicativo oficial de 15 Anos no ${venueName}`,
            start_url: window.location.href,
            display: 'standalone',
            background_color: '#000000',
            theme_color: '#000000',
            icons: [
              {
                src: blackGoldPwaIconUrl,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: blackGoldPwaIconUrl,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          };
          const blob = new Blob([JSON.stringify(dynamicManifest)], { type: 'application/json' });
          const manifestURL = URL.createObjectURL(blob);
          if (!manifestLink) {
            manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            document.head.appendChild(manifestLink);
          }
          manifestLink.href = manifestURL;
        } catch (err) {
          console.warn('Falha ao gerar manifest dinâmico:', err);
        }
      });
    }
  }, [viewMode, activeDeb, activeVenue]);

  const handleOpenDebutanteApp = (slug?: string) => {
    const targetSlug = slug || activeDeb?.slug || 'maria-eduarda-2027';
    setRouteInfo({ mode: 'debutante', slug: targetSlug });
    window.history.pushState({}, '', `/?debutante=${encodeURIComponent(targetSlug)}`);
  };

  if (viewMode === 'admin') {
    return <AdminPortal onOpenDebutanteApp={handleOpenDebutanteApp} />;
  }

  // If a specific debutante was requested and is still loading from database, show luxury loader
  if (viewMode === 'debutante' && currentDebutanteSlug && !inMemoryDeb && !asyncDeb && isLoadingSlug) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: '#040307',
        color: '#D4AF37',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <Crown size={36} color="#D4AF37" />
        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#FFF' }}>
          Carregando a experiência VIP de 15 Anos...
        </div>
        <div style={{ fontSize: '0.78rem', color: '#A0988A' }}>
          Bonomo Festas
        </div>
      </div>
    );
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
    <AppStateProvider initialAccount={activeDeb} initialVenue={activeVenue} key={activeDeb?.id || 'default'}>
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
