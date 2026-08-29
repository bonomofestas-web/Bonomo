import React, { useState, useEffect, useRef } from 'react';
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
import { InactiveDebutanteView } from './components/common/InactiveDebutanteView';
import { debutanteService } from './services/debutanteService';
import { venueService } from './services/venueService';
import type { Venue } from './types/admin';
import { Wifi, Battery, Signal, ChevronLeft, Bell, Crown } from 'lucide-react';

// localStorage key to remember slugs that completed onboarding (cross-session fallback)
const LS_SEEN_VIDEO_KEY = 'bonomo_seen_video_slugs_v1';
const getSeenVideoSlugs = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem(LS_SEEN_VIDEO_KEY) || '{}'); } catch { return {}; }
};
const markSlugSeenInStorage = (slug: string) => {
  try {
    const current = getSeenVideoSlugs();
    current[slug] = true;
    localStorage.setItem(LS_SEEN_VIDEO_KEY, JSON.stringify(current));
  } catch {}
};

const MainContentSwitcher: React.FC = () => {
  const { activeTab, debutante } = useAppState();
  const isJourneyDisabled = debutante.hasJourneyEnabled === false;

  if (isJourneyDisabled && (activeTab === 'journey' || activeTab === 'referrals' || activeTab === 'benefits')) {
    return <GuestList />;
  }

  switch (activeTab) {
    case 'journey':      return <VerticalJourney />;
    case 'referrals':   return <ReferralList />;
    case 'guests':      return <GuestList />;
    case 'appointments':return <AppointmentTimeline />;
    case 'benefits':    return <BenefitsHub />;
    default:            return isJourneyDisabled ? <GuestList /> : <VerticalJourney />;
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

import { generateBlackGoldPwaIcon } from './utils/avatarUtils';


const RootAppRouter: React.FC = () => {
  const { debutantes, venues, getDebutanteBySlug, getVenueById, markWelcomeVideoSeen } = useAdminState();

  // ── ALL useState HOOKS MUST BE DECLARED FIRST — before any conditional return ──
  const [routeInfo, setRouteInfo] = useState(parseRouteFromLocation);
  const [asyncDeb, setAsyncDeb] = useState<any>(null);
  const [isLoadingSlug, setIsLoadingSlug] = useState<boolean>(false);
  const [asyncVenue, setAsyncVenue] = useState<Venue | null>(null);
  const [sessionUnlockedSlugs, setSessionUnlockedSlugs] = useState<Record<string, boolean>>(
    () => getSeenVideoSlugs() // initialize from localStorage so it persists across page refreshes
  );
  const hasFetchedRef = useRef<string>('');

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

  // Resolve current active debutante account with smart slug matching
  const cleanSlug = currentDebutanteSlug ? decodeURIComponent(currentDebutanteSlug).trim().toLowerCase() : '';
  const baseSlug = cleanSlug.replace(/-[a-z0-9]{4}$/, '');

  const inMemoryDeb = cleanSlug 
    ? (getDebutanteBySlug(cleanSlug) ||
       debutantes.find(d => 
         d.slug.toLowerCase() === cleanSlug || 
         d.id === cleanSlug ||
         (baseSlug && d.slug.toLowerCase().startsWith(baseSlug))
       ))
    : undefined;

  // Fetch from Supabase if not in memory (anonymous / incognito access)
  useEffect(() => {
    if (viewMode !== 'debutante' || !cleanSlug) return;
    if (hasFetchedRef.current === cleanSlug) return; // avoid duplicate fetches
    hasFetchedRef.current = cleanSlug;
    setIsLoadingSlug(true);
    debutanteService.getBySlug(cleanSlug).then(async result => {
      if (result) {
        setAsyncDeb(result);
        // Buscar o venue junto — ele contém o welcomeVideoUrl do vídeo de boas-vindas
        if (result.venueId) {
          const venueFromDb = await venueService.getById(result.venueId);
          if (venueFromDb) setAsyncVenue(venueFromDb);
        }
      }
      setIsLoadingSlug(false);
    }).catch(() => {
      setIsLoadingSlug(false);
    });
  }, [viewMode, cleanSlug]);

  const activeDeb = inMemoryDeb || asyncDeb || debutantes[0];
  // activeVenue: tenta memória admin → venue buscado do Supabase → primeiro venue disponível
  // asyncVenue garante que o welcomeVideoUrl chegue corretamente no modo anônimo
  const activeVenue = (activeDeb ? getVenueById(activeDeb.venueId) : undefined)
    ?? asyncVenue
    ?? venues[0];

  // Dynamic Favicon, Apple Touch Icon (Home Screen) and Document Title
  useEffect(() => {
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

    let appleTitleMeta: HTMLMetaElement | null = document.querySelector("meta[name='apple-mobile-web-app-title']");
    if (!appleTitleMeta) {
      appleTitleMeta = document.createElement('meta');
      appleTitleMeta.name = 'apple-mobile-web-app-title';
      document.head.appendChild(appleTitleMeta);
    }

    let manifestLink: HTMLLinkElement | null = document.querySelector("link[rel='manifest']");

    const venueIcon = activeVenue?.logoUrl || '/logo_riio_lounge.png';

    if (viewMode === 'admin') {
      document.title = 'Bonomo Festas • Painel de Gestão & CRM';
      link.href = '/favicon.png';
      link.type = 'image/png';
      appleLink.href = '/favicon.png';
      appleTitleMeta.content = 'Bonomo Festas';
    } else {
      const debTitle = activeDeb ? `${activeDeb.name} • 15 Anos` : 'Minha Festa de 15 Anos';
      const venueName = activeVenue?.name || 'Bonomo Festas';
      document.title = `${debTitle} | ${venueName}`;
      link.href = venueIcon;
      appleTitleMeta.content = venueName;

      generateBlackGoldPwaIcon(venueIcon, venueName).then((blackGoldPwaIconUrl) => {
        if (appleLink) {
          appleLink.href = blackGoldPwaIconUrl;
        }
        try {
          const dynamicManifest = {
            name: venueName,
            short_name: venueName,
            description: `Aplicativo oficial no ${venueName}`,
            start_url: window.location.href,
            display: 'standalone',
            background_color: '#000000',
            theme_color: '#000000',
            icons: [
              { src: blackGoldPwaIconUrl, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
              { src: blackGoldPwaIconUrl, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
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

  const handleStartJourney = () => {
    if (!activeDeb) return;
    const slug = activeDeb.slug;

    // 1. Unlock in current session (immediate UI feedback)
    setSessionUnlockedSlugs(prev => ({ ...prev, [slug]: true }));

    // 2. Persist in localStorage (survives page refresh, works offline/anon)
    markSlugSeenInStorage(slug);

    // 3. Update local state for asyncDeb (if loaded from Supabase)
    setAsyncDeb((prev: any) => prev ? { ...prev, hasSeenWelcomeVideo: true } : prev);

    // 4. Update in-memory admin state
    markWelcomeVideoSeen(slug);

    // 5. Persist to Supabase database (fire-and-forget, no await)
    if (activeDeb.id && !activeDeb.id.startsWith('deb_')) {
      debutanteService.upsert({ id: activeDeb.id, hasSeenWelcomeVideo: true }).catch(
        (err) => console.warn('Aviso: não foi possível persistir hasSeenWelcomeVideo no banco:', err)
      );
    }
  };

  // ── Conditional rendering — AFTER all hooks ──

  if (viewMode === 'admin') {
    return <AdminPortal onOpenDebutanteApp={handleOpenDebutanteApp} />;
  }

  // Show loading spinner while fetching debutante from DB
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

  // If debutante was requested by slug/URL but does not exist in DB or memory -> Inactive / Invalid link
  if (viewMode === 'debutante' && cleanSlug && !inMemoryDeb && !asyncDeb && !isLoadingSlug) {
    return <InactiveDebutanteView venue={activeVenue} reason="not_found" />;
  }

  // If debutante is inactive or expired
  if (viewMode === 'debutante' && activeDeb && activeDeb.status === 'inactive') {
    return <InactiveDebutanteView venue={activeVenue} reason={activeDeb.partyDaysLeft === 0 ? 'expired' : 'inactive'} />;
  }

  // Check if first-access video/PWA onboarding is required
  // Priority: DB flag > localStorage > session
  const isUnlockedInCurrentSession = Boolean(activeDeb?.slug && sessionUnlockedSlugs[activeDeb.slug]);
  const shouldShowOnboarding = activeDeb && !activeDeb.hasSeenWelcomeVideo && !isUnlockedInCurrentSession;

  if (shouldShowOnboarding) {
    return (
      <WelcomeVideoIntroView
        debutante={activeDeb}
        venue={activeVenue}
        onStartJourney={handleStartJourney}
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
