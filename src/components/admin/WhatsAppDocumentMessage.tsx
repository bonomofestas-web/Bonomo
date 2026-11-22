import React from 'react';
import { Download, CheckCheck, Check, FileText } from 'lucide-react';

interface WhatsAppDocumentMessageProps {
  url?: string;
  filename?: string;
  fileSizeText?: string;
  pageCount?: number;
  thumbnailUrl?: string;
  isIncoming?: boolean;
  formattedTime?: string;
  isDarkMode?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export const WhatsAppDocumentMessage: React.FC<WhatsAppDocumentMessageProps> = ({
  url,
  filename,
  fileSizeText,
  pageCount,
  thumbnailUrl,
  isIncoming = false,
  formattedTime,
  isDarkMode = false,
  status = 'read',
}) => {
  const cleanName = filename?.replace(/^📄 Documento:\s*/i, '').trim() || 
                    (url ? url.split('/').pop()?.split('?')[0] : '') || 
                    'Documento';
                    
  const ext = (cleanName.includes('.') ? cleanName.split('.').pop()?.toUpperCase() : 'DOC') || 'DOC';
  const isPdf = ext === 'PDF' || cleanName.toLowerCase().endsWith('.pdf');
  const displayExt = ext.length > 4 ? ext.slice(0, 4) : ext;
  const displaySize = isPdf
    ? `${pageCount ? `${pageCount} páginas • ` : ''}PDF • ${fileSizeText || '350 KB'}`
    : (fileSizeText || `${displayExt} • Arquivo`);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '260px', maxWidth: '340px' }}>
      {/* Card principal do Arquivo / PDF */}
      <div
        onClick={handleDownload}
        title={`Baixar ${cleanName}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: isPdf ? '0 1px 3px rgba(0,0,0,0.25)' : 'none',
          transition: 'transform 0.15s ease, opacity 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.94';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        {/* Banner de Preview para PDFs (estilo WhatsApp) */}
        {isPdf && (
          <div style={{
            width: '100%',
            height: '130px',
            position: 'relative',
            background: isDarkMode ? '#111b21' : '#f0f2f5',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}>
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Prévia do PDF"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
              />
            ) : url ? (
              <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <iframe
                  src={`${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                  title="Prévia do PDF"
                  style={{
                    width: '100%',
                    height: '240px',
                    border: 'none',
                    pointerEvents: 'none',
                    transform: 'translateY(-10px)',
                  }}
                />
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDarkMode ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' : '#e2e8f0',
              }}>
                <FileText size={32} color={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
              </div>
            )}
          </div>
        )}

        {/* Corpo do Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '10px 12px',
          background: isPdf
            ? (isDarkMode ? '#0b4334' : (isIncoming ? '#ffffff' : '#d9fdd3'))
            : (isDarkMode ? 'rgba(0, 0, 0, 0.22)' : (isIncoming ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.05)')),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', overflow: 'hidden', flex: 1 }}>
            {/* Ícone PDF vermelho ou genérico */}
            {isPdf ? (
              <div style={{
                position: 'relative',
                width: '32px',
                height: '38px',
                background: '#ea4335',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '7px',
                  height: '7px',
                  background: isDarkMode ? '#0b4334' : '#ffffff',
                  borderBottomLeftRadius: '2px',
                }} />
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  letterSpacing: '0.5px',
                }}>
                  PDF
                </span>
              </div>
            ) : (
              <div style={{
                position: 'relative',
                width: '36px',
                height: '44px',
                background: '#64748b',
                borderRadius: '3px 8px 3px 3px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: '4px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '9px',
                  height: '9px',
                  background: isDarkMode ? '#202c33' : '#d9fdd3',
                  borderBottomLeftRadius: '2px',
                }} />
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}>
                  {displayExt}
                </span>
              </div>
            )}

            {/* Nome do arquivo e formato */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <span style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                color: isDarkMode ? '#e9edef' : '#111b21',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.25,
              }}>
                {cleanName}
              </span>
              <span style={{
                fontSize: '0.70rem',
                color: isDarkMode ? '#aebac1' : '#667781',
                marginTop: '3px',
                fontWeight: 500,
              }}>
                {displaySize}
              </span>
            </div>
          </div>

          {!isPdf && (
            <div
              title="Baixar arquivo"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDarkMode ? '#8696a0' : '#667781',
                flexShrink: 0,
              }}
            >
              <Download size={20} />
            </div>
          )}
        </div>
      </div>

      {/* Rodapé: Horário e Status */}
      {formattedTime && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '4px',
          fontSize: '0.62rem',
          color: isDarkMode ? '#8696a0' : '#667781',
          paddingRight: '2px',
          marginTop: '1px',
        }}>
          <span>{formattedTime}</span>
          {!isIncoming && (
            status === 'read' ? (
              <CheckCheck size={12} color="#53bdeb" />
            ) : status === 'delivered' ? (
              <CheckCheck size={12} color="#8696a0" />
            ) : (
              <Check size={12} color="#8696a0" />
            )
          )}
        </div>
      )}
    </div>
  );
};
