import React from 'react';
import { Download, CheckCheck, Check } from 'lucide-react';

interface WhatsAppDocumentMessageProps {
  url?: string;
  filename?: string;
  fileSizeText?: string;
  isIncoming?: boolean;
  formattedTime?: string;
  isDarkMode?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export const WhatsAppDocumentMessage: React.FC<WhatsAppDocumentMessageProps> = ({
  url,
  filename,
  fileSizeText,
  isIncoming = false,
  formattedTime,
  isDarkMode = false,
  status = 'read',
}) => {
  const cleanName = filename?.replace(/^📄 Documento:\s*/i, '').trim() || 
                    (url ? url.split('/').pop()?.split('?')[0] : '') || 
                    'Documento';
                    
  const ext = (cleanName.includes('.') ? cleanName.split('.').pop()?.toUpperCase() : 'DOC') || 'DOC';
  const displayExt = ext.length > 4 ? ext.slice(0, 4) : ext;
  const displaySize = fileSizeText || `${displayExt} • Arquivo`;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '240px', maxWidth: '340px' }}>
      {/* Card principal do Arquivo */}
      <div
        onClick={handleDownload}
        title={`Baixar ${cleanName}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '9px 12px',
          background: isDarkMode ? 'rgba(0, 0, 0, 0.22)' : (isIncoming ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.05)'),
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isDarkMode ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isDarkMode ? 'rgba(0, 0, 0, 0.22)' : (isIncoming ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.05)');
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', overflow: 'hidden', flex: 1 }}>
          {/* Ícone clássico de Documento com canto chanfrado e extensão */}
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
            {/* Dobra superior direita */}
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

          {/* Nome do arquivo e formato */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{
              fontSize: '0.86rem',
              fontWeight: 600,
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
              color: isDarkMode ? '#8696a0' : '#667781',
              marginTop: '3px',
              fontWeight: 500,
            }}>
              {displaySize}
            </span>
          </div>
        </div>

        {/* Botão de Download */}
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
            transition: 'color 0.15s ease',
          }}
        >
          <Download size={22} />
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
