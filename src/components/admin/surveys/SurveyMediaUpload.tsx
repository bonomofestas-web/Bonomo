import React, { useRef, useState } from 'react';
import { Film, Image as ImageIcon, Link2, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { cloudflareR2Service } from '../../../lib/cloudflareR2';

interface Props {
  label: string;
  value?: string;
  kind: 'image' | 'video' | 'any';
  folder: string;
  placeholder?: string;
  hint?: string;
  onChange: (url: string) => void;
}

const isVideoUrl = (url: string): boolean => {
  const u = url.toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(u) || u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com');
};

/**
 * Campo de mídia para Pesquisas com upload direto para o Cloudflare R2 (zero Base64 no banco)
 * e opção de colar URL externa (ex.: YouTube, Vimeo ou link direto).
 */
export const SurveyMediaUpload: React.FC<Props> = ({ label, value, kind, folder, placeholder, hint, onChange }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const accept = kind === 'image' ? 'image/*' : kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*,video/mp4,video/webm,video/quicktime';
  const maxMb = kind === 'image' ? 12 : 80;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.warning(`Arquivo muito grande. O limite é ${maxMb} MB.`);
      return;
    }
    setUploading(true);
    setProgress(5);
    try {
      const publicUrl = await cloudflareR2Service.uploadFile(file, folder, p => setProgress(p.percentage));
      onChange(publicUrl);
      toast.success('Mídia enviada para o R2 com sucesso.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar arquivo para o R2.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const hasValue = Boolean(value && value.trim());
  const isVid = hasValue && (kind === 'video' || isVideoUrl(value!));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => setShowUrlInput(v => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: '#0284C7', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
        >
          <Link2 size={11} /> {showUrlInput ? 'Ocultar link' : 'Colar link'}
        </button>
      </div>

      <input ref={fileRef} type="file" accept={accept} onChange={handleFile} style={{ display: 'none' }} />

      {hasValue ? (
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #f8fafc)' }}>
          {isVid ? (
            value!.includes('youtube.com') || value!.includes('youtu.be') || value!.includes('vimeo.com') ? (
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>
                <Film size={16} color="#0284C7" />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
              </div>
            ) : (
              <video src={value} controls style={{ width: '100%', maxHeight: 170, display: 'block', background: '#000' }} />
            )
          ) : (
            <img src={value} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ display: 'flex', gap: 6, padding: '6px 8px', borderTop: '1px solid var(--adm-border)', background: 'var(--adm-bg-card, #fff)', justifyContent: 'flex-end' }}>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <UploadCloud size={12} /> Trocar no R2
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(220,38,38,0.3)', background: 'transparent', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <Trash2 size={12} /> Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 12px',
            borderRadius: 10, border: '1.5px dashed var(--adm-border, #CBD5E1)', background: 'var(--adm-bg-input, transparent)',
            color: 'var(--adm-text-muted)', fontSize: '0.78rem', fontWeight: 700, cursor: uploading ? 'wait' : 'pointer',
          }}
        >
          {uploading ? (
            <><Loader2 size={15} className="animate-spin" color="#0284C7" /> Enviando para o R2... {progress}%</>
          ) : (
            <>
              {kind === 'video' ? <Film size={15} color="#0284C7" /> : <ImageIcon size={15} color="#0284C7" />}
              <span>{kind === 'video' ? 'Enviar vídeo para o R2 (MP4/WebM)' : kind === 'image' ? 'Enviar imagem para o R2' : 'Enviar imagem ou vídeo para o R2'}</span>
            </>
          )}
        </button>
      )}

      {showUrlInput && (
        <input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || (kind === 'video' ? 'https://... (R2, YouTube ou Vimeo)' : 'https://... (URL da imagem)')}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8,
            border: '1px solid var(--adm-border, #CBD5E1)', background: 'var(--adm-bg-input, #fff)',
            color: 'var(--adm-text-title)', fontSize: '0.78rem', fontFamily: 'inherit',
          }}
        />
      )}
      {hint && <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>{hint}</span>}
    </div>
  );
};
