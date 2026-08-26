import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (base64OrUrl: string) => void;
  placeholder?: string;
  helperText?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  previewHeight?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  aspectRatio = '16:9',
  previewHeight = '120px',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) return resolve('');

        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDimension = aspectRatio === '1:1' ? 400 : 1280;
            let { width, height } = img;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/webp', 0.85);
              resolve(compressed);
            } else {
              resolve(result);
            }
          } catch {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (.jpg, .png, .webp).');
      return;
    }

    const compressedBase64 = await compressImage(file);
    if (compressedBase64) {
      onChange(compressedBase64);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (urlDraft.trim()) {
      onChange(urlDraft.trim());
      setShowUrlInput(false);
      setUrlDraft('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: 'var(--adm-text-title)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {label}
        </label>
        
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--adm-accent)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {showUrlInput ? 'Ocultar URL manual' : 'Inserir por Link/URL'}
        </button>
      </div>

      {showUrlInput && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
          <input
            type="url"
            placeholder="https://..."
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
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
            style={{
              background: 'var(--adm-accent)',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Aplicar
          </button>
        </div>
      )}

      {value ? (
        <div style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-input)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '10px 12px',
        }}>
          <img
            src={value}
            alt="Preview"
            style={{
              width: aspectRatio === '1:1' ? (previewHeight || '64px') : '90px',
              height: previewHeight || '64px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '4px' }}>
              Imagem carregada com sucesso
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Upload size={12} /> Trocar Arquivo
              </button>

              <button
                type="button"
                onClick={() => onChange('')}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--adm-red)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <X size={12} /> Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${isDragging ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
            transition: 'all 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ImageIcon size={22} color="var(--adm-text-muted)" />
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>
            {placeholder || 'Clique para selecionar ou arraste uma foto'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
            JPG, PNG ou WebP • Proporção {aspectRatio} recomendada
          </div>
        </div>
      )}

      {helperText && (
        <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
          {helperText}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};
