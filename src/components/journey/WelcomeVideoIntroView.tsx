import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Crown, ArrowRight, Volume2, VolumeX, Play, 
  Smartphone, PlusSquare, MoreVertical, Download
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaStorage';
import { createMonogramAvatar } from '../../utils/avatarUtils';
import type { DebutanteAccount, Venue } from '../../types/admin';

interface WelcomeVideoIntroViewProps {
  debutante: DebutanteAccount;
  venue?: Venue;
  onStartJourney: () => void;
}

export const WelcomeVideoIntroView: React.FC<WelcomeVideoIntroViewProps> = ({
  debutante,
  venue,
  onStartJourney,
}) => {
  // Step: 'pwa_guide' | 'video'
  const [step, setStep] = useState<'pwa_guide' | 'video'>('pwa_guide');
  const [deviceTab, setDeviceTab] = useState<'ios' | 'android'>('ios');

  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [avatarSrc, setAvatarSrc] = useState<string>(debutante.avatarUrl || '');
  const [videoError, setVideoError] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const venueName = venue?.name || 'Espaço Rio Lounge';

  // Asynchronously resolve video and avatar with smart fallback cascade
  useEffect(() => {
    let isMounted = true;

    async function resolveBestVideo() {
      // 1. If debutante has a direct public web URL (e.g. Cloudflare R2 / S3), use it
      if (debutante.welcomeVideoUrl && debutante.welcomeVideoUrl.startsWith('http')) {
        if (isMounted) {
          setResolvedSrc(debutante.welcomeVideoUrl);
          setVideoError(false);
        }
        return;
      }

      // 2. If debutante has a local IndexedDB media key (creator device), try to load blob
      if (debutante.welcomeVideoUrl && debutante.welcomeVideoUrl.startsWith('idb://')) {
        const idbSrc = await resolveMediaUrl(debutante.welcomeVideoUrl);
        if (idbSrc && isMounted) {
          setResolvedSrc(idbSrc);
          setVideoError(false);
          return;
        }
      }

      // 3. Fallback to Venue's public web URL (Cloudflare R2)
      if (venue?.welcomeVideoUrl && venue.welcomeVideoUrl.startsWith('http')) {
        if (isMounted) {
          setResolvedSrc(venue.welcomeVideoUrl);
          setVideoError(false);
        }
        return;
      }

      // 4. Fallback to Venue's IndexedDB media key
      if (venue?.welcomeVideoUrl && venue.welcomeVideoUrl.startsWith('idb://')) {
        const venueIdbSrc = await resolveMediaUrl(venue.welcomeVideoUrl);
        if (venueIdbSrc && isMounted) {
          setResolvedSrc(venueIdbSrc);
          setVideoError(false);
          return;
        }
      }

      // 5. Default fallback sample video
      if (isMounted) {
        setResolvedSrc('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
        setVideoError(false);
      }
    }

    resolveBestVideo();

    if (debutante.avatarUrl) {
      resolveMediaUrl(debutante.avatarUrl).then((src) => {
        if (isMounted) {
          setAvatarSrc(src || debutante.avatarUrl || createMonogramAvatar(debutante.name));
        }
      });
    } else {
      setAvatarSrc(createMonogramAvatar(debutante.name));
    }

    return () => {
      isMounted = false;
    };
  }, [debutante.welcomeVideoUrl, venue?.welcomeVideoUrl, debutante.avatarUrl, debutante.name]);


  // When moving to video step, start video playback
  useEffect(() => {
    if (step !== 'video' || !resolvedSrc || !videoRef.current) return;

    const video = videoRef.current;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // If browser blocked sound autoplay, fall back to muted
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {
            setIsPlaying(false);
          });
        });
    }
  }, [step, resolvedSrc]);

  const handleProceedToVideo = () => {
    // If the debutante explicitly has journey disabled, skip video step completely!
    if (debutante.hasJourneyEnabled === false) {
      onStartJourney();
      return;
    }

    setStep('video');
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        setIsMuted(false);
        const p = videoRef.current.play();
        if (p !== undefined) {
          p.then(() => setIsPlaying(true)).catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          });
        }
      }
    }, 50);
  };

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleVideoEnded = () => {
    setIsVideoEnded(true);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#040307',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      color: '#FFFFFF',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Top Venue Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, rgba(4,3,7,0.95) 0%, rgba(4,3,7,0) 100%)',
        zIndex: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crown size={18} color="#D4AF37" />
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: '#E8C98D',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            {venueName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.7rem',
            color: '#D4AF37',
            background: 'rgba(212, 175, 55, 0.12)',
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            fontWeight: 700,
          }}>
            {step === 'pwa_guide' ? 'Instalação do App' : 'Boas-Vindas 15 Anos'}
          </span>
        </div>
      </div>

      {/* ── STEP 1: PWA / FIXAR NA TELA INICIAL ORIENTATION ── */}
      {step === 'pwa_guide' && (
        <div style={{
          width: '100%',
          maxWidth: '430px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeIn 0.25s ease-out',
          boxSizing: 'border-box',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}>
          {/* Avatar & Welcome */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <img
              src={avatarSrc || createMonogramAvatar(debutante.name)}
              alt={debutante.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = createMonogramAvatar(debutante.name);
              }}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #D4AF37',
                boxShadow: '0 0 24px rgba(212, 175, 55, 0.4)',
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              background: '#D4AF37',
              color: '#000',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={12} />
            </div>
          </div>

          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            color: '#FFFFFF',
            textAlign: 'center',
            margin: '0 0 6px 0',
            letterSpacing: '-0.3px',
          }}>
            Bem-vinda, {debutante.name}!
          </h2>

          <p style={{
            fontSize: '0.8rem',
            color: '#D1C8BA',
            textAlign: 'center',
            margin: '0 0 20px 0',
            lineHeight: 1.4,
          }}>
            Para ter a melhor experiência e acessar seu aplicativo como um app nativo em tela cheia, fixe-o na tela inicial do seu celular:
          </p>

          {/* OS Switch Tabs */}
          <div style={{
            display: 'flex',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '4px',
            marginBottom: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <button
              type="button"
              onClick={() => setDeviceTab('ios')}
              style={{
                flex: 1,
                background: deviceTab === 'ios' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                border: deviceTab === 'ios' ? '1px solid #D4AF37' : 'none',
                color: deviceTab === 'ios' ? '#D4AF37' : '#A0988A',
                borderRadius: '10px',
                padding: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Smartphone size={14} />
              <span>iPhone (Safari)</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceTab('android')}
              style={{
                flex: 1,
                background: deviceTab === 'android' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                border: deviceTab === 'android' ? '1px solid #D4AF37' : 'none',
                color: deviceTab === 'android' ? '#D4AF37' : '#A0988A',
                borderRadius: '10px',
                padding: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Smartphone size={14} />
              <span>Android (Chrome)</span>
            </button>
          </div>

          {/* Guide Steps */}
          <div style={{
            width: '100%',
            background: 'rgba(18, 14, 24, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '18px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxSizing: 'border-box',
          }}>
            {deviceTab === 'ios' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.78rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#FFF' }}>
                    Toque no botão <strong style={{ color: '#D4AF37' }}>Compartilhar</strong> (
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}>
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    ) na barra inferior do Safari.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.78rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#FFF' }}>
                    Role a lista e selecione <strong style={{ color: '#D4AF37' }}>"Adicionar à Tela de Início"</strong> (<PlusSquare size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.78rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#FFF' }}>
                    Toque em <strong style={{ color: '#D4AF37' }}>Adicionar</strong> no canto superior direito.
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.78rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#FFF' }}>
                    Toque nos <strong style={{ color: '#D4AF37' }}>3 pontinhos</strong> (<MoreVertical size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />) no canto superior do Chrome.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.78rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#FFF' }}>
                    Selecione <strong style={{ color: '#D4AF37' }}>"Adicionar à tela inicial"</strong> ou <strong style={{ color: '#D4AF37' }}>"Instalar app"</strong> (<Download size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.78rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#FFF' }}>
                    Confirme em <strong style={{ color: '#D4AF37' }}>Instalar</strong>.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action to proceed to video */}
          <button
            type="button"
            onClick={handleProceedToVideo}
            style={{
              width: '100%',
              marginTop: '20px',
              background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
              color: '#000',
              border: 'none',
              borderRadius: '16px',
              padding: '14px 20px',
              fontSize: '0.88rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(212, 175, 55, 0.45)',
            }}
          >
            <span>Continuar</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── STEP 2: VERTICAL STORIES VIDEO ── */}
      {step === 'video' && (
        <div 
          className="vertical-stories-video-container"
          onClick={handleTogglePlay}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '420px',
            height: '100vh',
            maxHeight: '840px',
            aspectRatio: '9/16',
            background: '#000',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '2px solid rgba(212, 175, 55, 0.35)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.95), 0 0 30px rgba(212, 175, 55, 0.2)',
            margin: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {resolvedSrc ? (
            <video
              ref={videoRef}
              src={resolvedSrc}
              autoPlay
              playsInline
              preload="auto"
              muted={isMuted}
              onEnded={handleVideoEnded}
              onError={(e) => {
                console.warn('Vídeo falhou ao carregar URL atual:', resolvedSrc, e);
                if (venue?.welcomeVideoUrl && venue.welcomeVideoUrl.startsWith('http') && resolvedSrc !== venue.welcomeVideoUrl) {
                  setResolvedSrc(venue.welcomeVideoUrl);
                } else if (resolvedSrc !== 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4') {
                  setResolvedSrc('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
                } else {
                  setVideoError(true);
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setVideoError(false);
              }}
              onPause={() => setIsPlaying(false)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.84rem' }}>
              Carregando vídeo de apresentação...
            </div>
          )}

          {/* Video Load Fallback UI */}
          {videoError && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(4,3,7,0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                zIndex: 35,
              }}
            >
              <Crown size={36} color="#D4AF37" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
                Bem-vinda, {debutante.name}!
              </div>
              <p style={{ fontSize: '0.82rem', color: '#D1C8BA', marginBottom: '20px', maxWidth: '280px' }}>
                O vídeo de apresentação está temporariamente indisponível. Você já pode iniciar sua jornada VIP!
              </p>
              <button
                type="button"
                onClick={onStartJourney}
                style={{
                  background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '14px 28px',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(212, 175, 55, 0.5)',
                }}
              >
                INICIAR MINHA JORNADA ➔
              </button>
            </div>
          )}



          {/* Floating Sound Orientation Badge (Mandated by Audio 1) */}
          {!isVideoEnded && (
            <div
              onClick={handleToggleSound}
              style={{
                position: 'absolute',
                top: '70px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(212, 175, 55, 0.5)',
                color: '#F3E5AB',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 30,
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                cursor: 'pointer',
              }}
            >
              {isMuted ? <VolumeX size={14} color="#EF4444" /> : <Volume2 size={14} color="#D4AF37" />}
              <span>{isMuted ? 'Toque para Ativar Som' : '🔊 Aumente o som do seu celular'}</span>
            </div>
          )}

          {/* Play/Pause indicator on tap */}
          {!isPlaying && !isVideoEnded && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 25,
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
              }}>
                <Play size={28} style={{ marginLeft: '4px' }} />
              </div>
            </div>
          )}

          {/* Center "Concluído / Acessar Jornada" button — ONLY appears when video ends */}
          {isVideoEnded && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(14,10,18,0.92) 0%, rgba(4,3,7,0.98) 100%)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                zIndex: 40,
                animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Sparkle badge */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 0 30px rgba(212, 175, 55, 0.6)',
              }}>
                <Sparkles size={32} color="#000" />
              </div>

              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#D4AF37',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>
                Apresentação Concluída
              </span>

              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: '#FFF',
                margin: '0 0 8px 0',
                lineHeight: 1.2,
              }}>
                Bem-vinda, {debutante.name}!
              </h2>

              <p style={{
                fontSize: '0.82rem',
                color: '#D1C8BA',
                lineHeight: 1.5,
                marginBottom: '28px',
                maxWidth: '320px',
              }}>
                Sua jornada exclusiva de 15 Anos no <strong style={{ color: '#E8C98D' }}>{venueName}</strong> está pronta para você começar!
              </p>

              {/* Main Concluir Button in the center of the screen */}
              <button
                type="button"
                onClick={onStartJourney}
                style={{
                  width: '100%',
                  maxWidth: '280px',
                  background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '16px 24px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  letterSpacing: '0.8px',
                  boxShadow: '0 8px 30px rgba(212, 175, 55, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span>INICIAR MINHA JORNADA</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 500px) {
          .vertical-stories-video-container {
            max-width: 100% !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0px !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
