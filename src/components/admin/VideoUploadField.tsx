import React, { useRef, useState, useEffect } from 'react';
import { Video, Play, Pause, Film, Check, AlertCircle, Loader2 } from 'lucide-react';
import { saveMediaFile, resolveMediaUrl } from '../../utils/mediaStorage';
import { cloudflareR2Service, isCloudflareR2Configured, type R2UploadProgress } from '../../lib/cloudflareR2';

interface VideoUploadFieldProps {
  label: string;
  value?: string;
  fileName?: string;
  onChange: (videoUrl: string, fileName?: string) => void;
  helperText?: string;
}

export const VideoUploadField: React.FC<VideoUploadFieldProps> = ({
  label,
  value,
  fileName,
  onChange,
  helperText = 'Formato vertical 9:16 (Stories) ou padrão. Arquivo local ou link direto (.mp4, .webm)',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<R2UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [resolvedSrc, setResolvedSrc] = useState('');
  const [justUploaded, setJustUploaded] = useState(false);

  // Prevent accidental page close while uploading large video
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = 'O upload do vídeo ainda está em andamento. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading]);

  // Resolve IDB or standard URL
  useEffect(() => {
    let isMounted = true;
    if (value) {
      resolveMediaUrl(value).then((src) => {
        if (isMounted) setResolvedSrc(src);
      });
    } else {
      setResolvedSrc('');
    }
    return () => {
      isMounted = false;
    };
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setUploadError('Por favor, selecione um arquivo de vídeo válido (.mp4, .webm, .mov).');
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setJustUploaded(false);
    setUploadProgress({
      percentage: 0,
      loadedBytes: 0,
      totalBytes: file.size,
      formattedProgress: `0 MB / ${(file.size / (1024 * 1024)).toFixed(1)} MB (0%)`,
    });

    // Create local object URL for instant preview while uploading
    const localPreviewUrl = URL.createObjectURL(file);
    setResolvedSrc(localPreviewUrl);

    try {
      if (isCloudflareR2Configured) {
        const r2Url = await cloudflareR2Service.uploadFile(
          file,
          'videos',
          (progress) => {
            setUploadProgress(progress);
          }
        );

        if (r2Url && r2Url.startsWith('http')) {
          onChange(r2Url, file.name);
          setResolvedSrc(r2Url);
          setJustUploaded(true);
          setTimeout(() => setJustUploaded(false), 3000);
          return;
        }
      }

      // Local fallback in IndexedDB
      const mediaKey = await saveMediaFile(file, 'video');
      onChange(mediaKey, file.name);
      setJustUploaded(true);
      setTimeout(() => setJustUploaded(false), 3000);
    } catch (err: any) {
      console.error('[VideoUpload] Error processing video:', err);
      setUploadError(err.message || 'Erro ao processar o vídeo.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleApplyUrl = () => {
    if (urlDraft.trim()) {
      onChange(urlDraft.trim(), 'Vídeo via Link');
      setShowUrlInput(false);
      setUrlDraft('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsPlaying(false);
    setResolvedSrc('');
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch((err) => console.warn('Autoplay error:', err));
      setIsPlaying(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Film size={14} color="var(--adm-accent)" />
          <span>{label}</span>
        </label>

        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={isUploading}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--adm-accent)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            padding: 0,
            opacity: isUploading ? 0.5 : 1,
          }}
        >
          {showUrlInput ? 'Ocultar URL manual' : 'Inserir por Link/URL'}
        </button>
      </div>

      {showUrlInput && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
          <input
            type="url"
            placeholder="https://.../video.mp4"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            disabled={isUploading}
            style={{
              flex: 1,
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--adm-text-title)',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            disabled={isUploading}
            style={{
              background: 'var(--adm-accent)',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: isUploading ? 'not-allowed' : 'pointer',
            }}
          >
            Aplicar
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        disabled={isUploading}
        style={{ display: 'none' }}
      />

      {/* ── REAL-TIME PROGRESS BAR DURING UPLOAD ──────────────────────────────── */}
      {isUploading && (
        <div style={{
          background: '#14111B',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={18} className="animate-spin" color="#D4AF37" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                Enviando vídeo para o Cloudflare R2...
              </span>
            </div>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#D4AF37' }}>
              {uploadProgress ? `${uploadProgress.percentage}%` : 'Iniciando...'}
            </span>
          </div>

          {/* Progress Track */}
          <div style={{
            width: '100%',
            height: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${uploadProgress?.percentage || 5}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #AA7C11 0%, #D4AF37 50%, #F3E5AB 100%)',
              borderRadius: '10px',
              transition: 'width 0.2s ease-out',
              boxShadow: '0 0 12px rgba(212, 175, 55, 0.6)',
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: '#9E988D' }}>
              {uploadProgress?.formattedProgress || 'Preparando buffer...'}
            </span>
            <span style={{ color: '#E8C98D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} color="#E8C98D" />
              Por favor, não saia nem feche esta janela
            </span>
          </div>
        </div>
      )}

      {/* ── VIDEO LOADED PREVIEW CARD ────────────────────────────────────────── */}
      {!isUploading && value && resolvedSrc ? (
        <div style={{
          position: 'relative',
          background: 'var(--adm-bg-input)',
          border: '1px solid var(--adm-border)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          gap: '12px',
          padding: '10px 12px',
          alignItems: 'center',
        }}>
          {/* Vertical Video Preview Thumbnail */}
          <div style={{
            width: '64px',
            height: '96px',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#000',
            position: 'relative',
            flexShrink: 0,
            cursor: 'pointer',
            border: '1px solid var(--adm-border)',
          }} onClick={togglePlay}>
            <video
              ref={videoRef}
              src={resolvedSrc}
              playsInline
              loop
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onEnded={() => setIsPlaying(false)}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isPlaying ? 'transparent' : 'rgba(0,0,0,0.45)',
            }}>
              {isPlaying ? <Pause size={18} color="#FFF" /> : <Play size={18} color="#FFF" />}
            </div>
          </div>

          {/* Video Metadata & Actions */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fileName || (value.startsWith('http') ? value : 'Vídeo Configurado')}
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--adm-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={13} />
              <span>{justUploaded ? 'Upload 100% concluído no Cloudflare R2!' : 'Vídeo salvo e pronto para reprodução'}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'var(--adm-bg-elevated)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Substituir Vídeo
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--adm-red)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        !isUploading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '1.5px dashed var(--adm-border)',
              borderRadius: '12px',
              padding: '16px 14px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--adm-bg-input)',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--adm-accent-bg)',
              border: '1px solid var(--adm-border-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Video size={18} color="var(--adm-accent)" />
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Fazer Upload do Vídeo
              </span>
              <p style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                {helperText}
              </p>
            </div>
          </div>
        )
      )}

      {uploadError && (
        <span style={{ fontSize: '0.72rem', color: 'var(--adm-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={13} />
          {uploadError}
        </span>
      )}
    </div>
  );
};
