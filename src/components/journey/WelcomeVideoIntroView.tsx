import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Crown, ArrowRight, Volume2, VolumeX, Play } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaStorage';
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
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const rawVideoUrl = debutante.welcomeVideoUrl || venue?.welcomeVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  const venueName = venue?.name || 'Espaço Rio Lounge';

  // Asynchronously resolve IndexedDB or Web URL
  useEffect(() => {
    let isMounted = true;
    resolveMediaUrl(rawVideoUrl).then((src) => {
      if (isMounted) {
        setResolvedSrc(src || rawVideoUrl);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [rawVideoUrl]);

  // Automatic playback (start muted for universal browser compatibility)
  useEffect(() => {
    if (!resolvedSrc || !videoRef.current) return;

    const video = videoRef.current;
    video.muted = true;
    setIsMuted(true);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('[WelcomeVideo] Autoplay note:', err);
          setIsPlaying(false);
        });
    }
  }, [resolvedSrc]);

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
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
        zIndex: 20,
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

        <span style={{
          fontSize: '0.7rem',
          color: '#D4AF37',
          background: 'rgba(212, 175, 55, 0.12)',
          padding: '4px 10px',
          borderRadius: '12px',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          fontWeight: 700,
        }}>
          Boas-Vindas 15 Anos
        </span>
      </div>

      {/* Video Box (9:16 vertical on mobile & desktop) */}
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
        }}
      >
        {resolvedSrc ? (
          <video
            ref={videoRef}
            src={resolvedSrc}
            autoPlay
            playsInline
            muted={isMuted}
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.84rem' }}>
            Carregando vídeo de apresentação...
          </div>
        )}

        {/* Floating Sound Toggle Badge */}
        {!isVideoEnded && (
          <button
            type="button"
            onClick={handleToggleSound}
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '20px',
              background: isMuted ? 'rgba(212, 175, 55, 0.9)' : 'rgba(0, 0, 0, 0.65)',
              color: isMuted ? '#000' : '#FFF',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '24px',
              padding: '8px 14px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 30,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} color="#D4AF37" />}
            <span>{isMuted ? 'Ativar Som' : 'Som Ativo'}</span>
          </button>
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
              <span>CONCLUIR & AVANÇAR</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

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
