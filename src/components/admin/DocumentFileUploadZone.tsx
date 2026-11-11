import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import { cloudflareR2Service } from '../../lib/cloudflareR2';

interface DocumentFileUploadZoneProps {
  fileUrl: string;
  fileSize?: string;
  fileName?: string;
  onUploaded: (result: {
    url: string;
    fileName: string;
    fileSize: string;
    sizeBytes: number;
  }) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  onClear?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const DocumentFileUploadZone: React.FC<DocumentFileUploadZoneProps> = ({
  fileUrl,
  fileSize,
  fileName,
  onUploaded,
  onUploadingChange,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedName, setUploadedName] = useState(fileName || '');

  const setUploading = (val: boolean) => {
    setIsUploading(val);
    onUploadingChange?.(val);
  };

  const fallbackUploadViaApi = async (file: File): Promise<string> => {
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(new Error('Falha ao ler arquivo selecionado.'));
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        folder: 'client_documents',
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || `Falha no envio (HTTP ${res.status})`);
    }
    const data = await res.json();
    if (!data?.url) throw new Error('Servidor não retornou URL válida.');
    return data.url;
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('O arquivo excede o limite máximo de 50 MB.');
      return;
    }

    setErrorMsg('');
    setUploading(true);
    setProgressPct(5);
    setUploadedName(file.name);

    try {
      let finalUrl = '';
      try {
        finalUrl = await cloudflareR2Service.uploadFile(file, 'client_documents', (p) => {
          setProgressPct(p.percentage);
        });
      } catch {
        setProgressPct(60);
        finalUrl = await fallbackUploadViaApi(file);
      }

      setProgressPct(100);
      onUploaded({
        url: finalUrl,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        sizeBytes: file.size,
      });
    } catch (err: any) {
      console.error('Erro ao subir documento para R2:', err);
      setErrorMsg(err?.message || 'Erro ao enviar o documento. Tente novamente.');
      setUploadedName('');
    } finally {
      setUploading(false);
    }
  };

  const hasFile = Boolean(fileUrl && fileUrl.trim() && fileUrl !== '#');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      {!hasFile ? (
        <div
          onClick={() => !isUploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (isUploading) return;
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          style={{
            border: `2px dashed ${isDragging ? 'var(--adm-accent, #F59E0B)' : 'var(--adm-border, #334155)'}`,
            borderRadius: '12px',
            padding: '20px 16px',
            background: isDragging ? 'rgba(245, 158, 11, 0.08)' : 'var(--adm-bg-input)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isUploading ? 'wait' : 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          {isUploading ? (
            <>
              <Loader2 size={24} color="var(--adm-accent, #F59E0B)" className="animate-spin" />
              <div style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Enviando "{uploadedName}" ({progressPct}%)
              </div>
              <div style={{ width: '100%', maxWidth: '240px', height: '6px', background: 'rgba(148,163,184,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--adm-accent, #F59E0B)', transition: 'width 0.2s ease' }} />
              </div>
            </>
          ) : (
            <>
              <UploadCloud size={26} color="var(--adm-accent, #F59E0B)" />
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Clique ou arraste o arquivo aqui para fazer upload
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
                PDF, Imagens (JPG/PNG/WEBP), Word ou Excel (até 50 MB)
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{
          border: '1px solid rgba(16, 185, 129, 0.35)',
          background: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '10px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <FileText size={18} color="#10B981" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} color="#10B981" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {uploadedName || 'Arquivo enviado com sucesso'}
                </span>
              </div>
              {fileSize && (
                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                  Tamanho: {fileSize}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.70rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Substituir
            </button>
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  setUploadedName('');
                  onClear();
                }}
                title="Remover arquivo"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#EF4444',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#EF4444', fontWeight: 600 }}>
          <AlertCircle size={13} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

