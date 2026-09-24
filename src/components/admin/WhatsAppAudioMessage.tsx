import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Download, MoreVertical, CheckCheck, Check } from 'lucide-react';
import { whatsappMediaService } from '../../services/whatsappMediaService';

interface WhatsAppAudioMessageProps {
  src?: string;
  durationText?: string;
  isIncoming?: boolean;
  authorName?: string;
  avatarUrl?: string;
  formattedTime?: string;
  isDarkMode?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  onSyncR2Url?: (newUrl: string) => void;
}

const parseDurationText = (text?: string): number => {
  if (!text) return 0;
  const clean = text.replace(/[^\d:]/g, '').trim();
  if (!clean) return 0;
  const parts = clean.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  return 0;
};

// Alturas padrão simulando a onda sonora realista do WhatsApp
const WAVEFORM_BARS = [
  6, 8, 12, 16, 8, 14, 20, 24, 18, 12, 
  16, 22, 26, 20, 14, 18, 24, 28, 22, 16, 
  20, 26, 22, 16, 12, 18, 22, 14, 10, 8, 6
];

// Cache global em memória para ondas e duração decodificadas de áudio (Elimina reprocessamento e flickering)
const AUDIO_PEAKS_CACHE = new Map<string, { peaks: number[]; duration?: number }>();

const cleanAudioSrc = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.includes('mmg.whatsapp.net')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.URL || parsed.url || parsed.fileURL || parsed.mediaUrl || parsed.directPath || trimmed;
    } catch {
      const match = trimmed.match(/"URL"\s*:\s*"([^"]+)"/i) || trimmed.match(/https:\/\/mmg\.whatsapp\.net[^\s"'}]+/i);
      if (match) return match[1] || match[0];
    }
  }
  return trimmed;
};

export const WhatsAppAudioMessage: React.FC<WhatsAppAudioMessageProps> = ({
  src,
  durationText,
  isIncoming = false,
  authorName,
  avatarUrl,
  formattedTime,
  isDarkMode = false,
  status = 'read',
  onSyncR2Url,
}) => {
  const normalizedSrc = cleanAudioSrc(src);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => {
    if (normalizedSrc && AUDIO_PEAKS_CACHE.has(normalizedSrc) && AUDIO_PEAKS_CACHE.get(normalizedSrc)?.duration) {
      return AUDIO_PEAKS_CACHE.get(normalizedSrc)!.duration!;
    }
    return parseDurationText(durationText);
  });
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [activeSrc, setActiveSrc] = useState<string | undefined>(normalizedSrc);
  const [showMenu, setShowMenu] = useState(false);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    setActiveSrc(cleanAudioSrc(src));
  }, [src]);

  const [realPeaks, setRealPeaks] = useState<number[]>(() => {
    if (normalizedSrc && AUDIO_PEAKS_CACHE.has(normalizedSrc)) {
      return AUDIO_PEAKS_CACHE.get(normalizedSrc)!.peaks;
    }
    return WAVEFORM_BARS;
  });

  useEffect(() => {
    const textSecs = parseDurationText(durationText);
    if (textSecs > 0) {
      setDuration(prev => (prev > 0 ? Math.max(prev, textSecs) : textSecs));
    }

    if (!activeSrc) return;

    // Se já estiver no cache em memória, aplica instantaneamente sem fazer fetch
    if (AUDIO_PEAKS_CACHE.has(activeSrc)) {
      const cached = AUDIO_PEAKS_CACHE.get(activeSrc)!;
      setRealPeaks(cached.peaks);
      if (cached.duration && isFinite(cached.duration) && cached.duration > 0) {
        setDuration(cached.duration);
      }
      return;
    }

    let isCancelled = false;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        fetch(activeSrc)
          .then(res => res.arrayBuffer())
          .then(buf => {
            const ctx = new AudioCtx();
            return ctx.decodeAudioData(buf).then(decoded => {
              if (isCancelled) {
                ctx.close().catch(() => {});
                return;
              }
              const validDuration = (decoded.duration && isFinite(decoded.duration) && decoded.duration > 0) ? decoded.duration : undefined;
              if (validDuration) {
                setDuration(validDuration);
              }

              // Extrair os picos de amplitude reais do áudio em 34 barras
              try {
                const rawData = decoded.getChannelData(0);
                const totalBars = 34;
                const samplesPerBar = Math.floor(rawData.length / totalBars);
                if (samplesPerBar > 0) {
                  const calculatedPeaks: number[] = [];
                  let maxVal = 0;
                  const rawAverages: number[] = [];

                  for (let i = 0; i < totalBars; i++) {
                    let sum = 0;
                    const start = i * samplesPerBar;
                    const end = Math.min(start + samplesPerBar, rawData.length);
                    for (let j = start; j < end; j += 4) { // step de 4 para performance
                      sum += Math.abs(rawData[j]);
                    }
                    const count = Math.ceil((end - start) / 4);
                    const avg = sum / (count || 1);
                    rawAverages.push(avg);
                    if (avg > maxVal) maxVal = avg;
                  }

                  const factor = maxVal > 0.05 ? 24 / maxVal : 60;
                  for (let i = 0; i < totalBars; i++) {
                    const h = Math.max(4, Math.min(28, Math.round(rawAverages[i] * factor + 4)));
                    calculatedPeaks.push(h);
                  }

                  if (!isCancelled && calculatedPeaks.length === totalBars) {
                    setRealPeaks(calculatedPeaks);
                    AUDIO_PEAKS_CACHE.set(activeSrc, {
                      peaks: calculatedPeaks,
                      duration: validDuration,
                    });
                  }
                }
              } catch {}

              ctx.close().catch(() => {});
            });
          })
          .catch(() => {});
      }
    } catch {}

    return () => {
      isCancelled = true;
    };
  }, [activeSrc, durationText]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime > duration) {
        setDuration(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio.currentTime > 0) {
        setDuration(d => Math.max(d, audio.currentTime));
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeSrc, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !activeSrc) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        if (!hasSyncedRef.current && activeSrc && !activeSrc.includes('r2.cloudflarestorage.com') && !activeSrc.startsWith('blob:') && !activeSrc.startsWith('data:')) {
          hasSyncedRef.current = true;
          whatsappMediaService.syncMediaUrlToR2(activeSrc, 'audio')
            .then(r2Url => {
              if (r2Url && r2Url !== activeSrc) {
                setActiveSrc(r2Url);
                onSyncR2Url?.(r2Url);
              }
            })
            .catch(() => {});
        }
      }).catch(() => setIsPlaying(false));
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * (effectiveDuration || 1);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const cycleSpeed = () => {
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleDownloadAudio = async () => {
    if (!activeSrc) return;
    try {
      const res = await fetch(activeSrc);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio_whatsapp_${Date.now()}.ogg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(activeSrc, '_blank');
    }
    setShowMenu(false);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const textSecs = parseDurationText(durationText);
  const effectiveDuration = duration > 0 ? duration : textSecs > 0 ? textSecs : 1;
  const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;

  // Cores fiéis e de alto contraste do WhatsApp para áudio e waveform
  const scrubberColor = isIncoming ? '#25D366' : '#53bdeb';
  const playBtnColor = isDarkMode ? '#e9edef' : '#111b21';
  // Barras reproduzidas: cinza escuro / destaque nítido
  const playedBarColor = isDarkMode ? '#e2e8f0' : '#334155';
  // Barras não reproduzidas: cinza médio com contraste perfeito contra fundo branco ou verde claro
  const unplayedBarColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8';
  const timeTextColor = isDarkMode ? '#8696a0' : '#667781';

  // Componente de Avatar com badge de Microfone
  const AvatarWithMicBadge = () => (
    <div style={{ position: 'relative', width: '42px', height: '42px', flexShrink: 0 }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={authorName || 'Avatar'}
          style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: isIncoming ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 168, 132, 0.2)',
          color: isIncoming ? '#3B82F6' : '#00a884',
          fontWeight: 800,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {(authorName || (isIncoming ? 'L' : 'U')).charAt(0).toUpperCase()}
        </div>
      )}

      {/* Badge de Microfone verde sobreposto */}
      <div style={{
        position: 'absolute',
        bottom: '-2px',
        [isIncoming ? 'left' : 'right']: '-2px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: isDarkMode ? '#202c33' : '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1.5px solid ${isDarkMode ? '#202c33' : '#FFFFFF'}`,
      }}>
        <Mic size={11} color="#25D366" />
      </div>
    </div>
  );

  return (
    <div 
      title={authorName ? `Áudio de ${authorName}` : 'Mensagem de áudio'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '2px 0',
        minWidth: '270px',
        maxWidth: '350px',
        position: 'relative',
      }}
    >
      {activeSrc && <audio ref={audioRef} src={activeSrc} preload="metadata" />}

      {/* Se for Outgoing (Atendente / Direita): Avatar fica à ESQUERDA (conforme Print 3) */}
      {!isIncoming && <AvatarWithMicBadge />}

      {/* Botão de Play / Pause Clean (sem círculo pesado) */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!activeSrc}
        title={isPlaying ? "Pausar" : "Tocar"}
        style={{
          width: '34px',
          height: '34px',
          background: 'transparent',
          border: 'none',
          color: playBtnColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: activeSrc ? 'pointer' : 'not-allowed',
          flexShrink: 0,
          padding: 0,
          transition: 'transform 0.1s ease',
        }}
        onMouseEnter={(e) => { if (activeSrc) e.currentTarget.style.transform = 'scale(1.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {isPlaying ? (
          <Pause size={22} color={playBtnColor} fill={playBtnColor} />
        ) : (
          <Play size={22} color={playBtnColor} fill={playBtnColor} style={{ marginLeft: '2px' }} />
        )}
      </button>

      {/* Waveform Realista do WhatsApp + Linha de Tempo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'center', minWidth: '180px' }}>
        {/* Waveform Interativa com Barras Nítidas e Scrubber */}
        <div
          onClick={handleWaveformClick}
          style={{
            position: 'relative',
            width: '100%',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5px',
            cursor: activeSrc ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          {realPeaks.map((h, idx) => {
            const barPercent = (idx / realPeaks.length) * 100;
            const isPlayed = progressPercent >= barPercent;
            return (
              <div
                key={idx}
                style={{
                  width: '3px',
                  minWidth: '2.5px',
                  height: `${h}px`,
                  backgroundColor: isPlayed ? playedBarColor : unplayedBarColor,
                  borderRadius: '3px',
                  transition: 'background-color 0.1s ease',
                  flexShrink: 0,
                }}
              />
            );
          })}

          {/* Bolinha do Cursor / Thumb do WhatsApp */}
          <div style={{
            position: 'absolute',
            left: `${progressPercent}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '13px',
            height: '13px',
            borderRadius: '50%',
            backgroundColor: scrubberColor,
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            zIndex: 2,
            transition: isPlaying ? 'left 0.1s linear' : 'left 0.2s ease',
          }} />
        </div>

        {/* Rodapé: Tempo decorrido na esquerda, Horário + Checkmark na direita */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: timeTextColor }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'sans-serif', fontWeight: 600 }}>
              {isPlaying ? formatTime(currentTime) : (durationText || (effectiveDuration > 0 ? formatTime(effectiveDuration) : '0:00'))}
            </span>

            {/* Seletor de Velocidade 1x/1.5x/2x */}
            {activeSrc && (
              <button
                type="button"
                onClick={cycleSpeed}
                title="Velocidade"
                style={{
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                  border: 'none',
                  borderRadius: '8px',
                  color: isDarkMode ? '#e9edef' : '#111b21',
                  fontSize: '0.60rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  cursor: 'pointer',
                  lineHeight: 1.1,
                }}
              >
                {playbackRate}x
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
            {formattedTime && <span>{formattedTime}</span>}
            {!isIncoming && (
              status === 'read' ? (
                <CheckCheck size={13} color="#53bdeb" />
              ) : status === 'delivered' ? (
                <CheckCheck size={13} color="#8696a0" />
              ) : (
                <Check size={13} color="#8696a0" />
              )
            )}

            {/* Menu 3 Pontinhos para Download */}
            {activeSrc && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                title="Opções"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: timeTextColor,
                  padding: '0 2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <MoreVertical size={11} />
              </button>
            )}

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 4px)',
                  right: 0,
                  background: isDarkMode ? '#233138' : '#FFFFFF',
                  borderRadius: '8px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                  padding: '4px',
                  zIndex: 9999,
                  minWidth: '110px',
                }}
              >
                <button
                  type="button"
                  onClick={handleDownloadAudio}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: isDarkMode ? '#e9edef' : '#111b21',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Download size={12} color="#00a884" />
                  <span>Baixar Áudio</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Se for Incoming (Lead / Esquerda): Avatar fica à DIREITA (conforme Print 2) */}
      {isIncoming && <AvatarWithMicBadge />}
    </div>
  );
};
