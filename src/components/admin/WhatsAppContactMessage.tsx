import React from 'react';
import { User, MessageSquare, UserPlus, BookmarkCheck, BookmarkPlus, CheckCheck, Check } from 'lucide-react';
import { formatPhone, normalizeWhatsAppNumber } from '../../utils/phoneFormatter';

interface WhatsAppContactMessageProps {
  contactName: string;
  contactPhone: string;
  isIncoming?: boolean;
  formattedTime?: string;
  isDarkMode?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  onCreateLead?: () => void;
  onSaveContact?: () => void;
  isSaved?: boolean;
  isLeadCreated?: boolean;
}

export const WhatsAppContactMessage: React.FC<WhatsAppContactMessageProps> = ({
  contactName,
  contactPhone,
  isIncoming = false,
  formattedTime,
  isDarkMode = false,
  status = 'read',
  onCreateLead,
  onSaveContact,
  isSaved = false,
  isLeadCreated = false,
}) => {
  const cleanPhone = contactPhone.replace(/\D/g, '');
  const formattedPhone = formatPhone(contactPhone) || contactPhone;
  const initials = contactName
    ? contactName.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'CT';

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanPhone) return;
    const fullNumber = normalizeWhatsAppNumber(cleanPhone);
    window.open(`https://wa.me/${fullNumber}`, '_blank');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '240px',
      maxWidth: '320px',
    }}>
      {/* Card Principal do Contato */}
      <div style={{
        borderRadius: '10px',
        overflow: 'hidden',
        background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : (isIncoming ? '#ffffff' : '#e7fce3'),
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {/* Cabeçalho do Contato com Avatar e Nome */}
        <div style={{
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: isDarkMode ? '#1e293b' : '#e2e8f0',
            color: 'var(--adm-accent, #6366F1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.90rem',
            flexShrink: 0,
            border: '1px solid var(--adm-border)',
          }}>
            {initials ? initials : <User size={20} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <span style={{
              fontSize: '0.86rem',
              fontWeight: 800,
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {contactName || 'Contato'}
            </span>
            <span style={{
              fontSize: '0.74rem',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              marginTop: '2px',
              fontWeight: 600,
            }}>
              {formattedPhone}
            </span>
          </div>
        </div>

        {/* Barra de Ações Integradas */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
          background: isDarkMode ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.02)',
        }}>
          <button
            type="button"
            onClick={handleOpenChat}
            style={{
              flex: 1,
              padding: '9px 8px',
              background: 'transparent',
              border: 'none',
              borderRight: isIncoming ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}` : 'none',
              color: 'var(--adm-accent, #6366F1)',
              fontSize: '0.74rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <MessageSquare size={13} />
            <span>Conversar</span>
          </button>

          {isIncoming && onCreateLead && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCreateLead(); }}
              disabled={isLeadCreated}
              title={isLeadCreated ? "Lead já criado neste funil" : "Criar novo Lead a partir deste contato"}
              style={{
                flex: 1,
                padding: '9px 8px',
                background: 'transparent',
                border: 'none',
                borderRight: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
                color: isLeadCreated ? '#10B981' : (isDarkMode ? '#38BDF8' : '#0284C7'),
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: isLeadCreated ? 'default' : 'pointer',
                opacity: isLeadCreated ? 0.7 : 1,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { if (!isLeadCreated) e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <UserPlus size={13} />
              <span>{isLeadCreated ? 'Lead Criado' : 'Criar Lead'}</span>
            </button>
          )}

          {isIncoming && onSaveContact && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSaveContact(); }}
              disabled={isSaved}
              title={isSaved ? "Contato salvo na base" : "Salvar contato na Central de Contatos"}
              style={{
                padding: '9px 12px',
                background: 'transparent',
                border: 'none',
                color: isSaved ? '#10B981' : (isDarkMode ? '#94A3B8' : '#64748B'),
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: isSaved ? 'default' : 'pointer',
                opacity: isSaved ? 0.8 : 1,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { if (!isSaved) e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {isSaved ? <BookmarkCheck size={13} color="#10B981" /> : <BookmarkPlus size={13} />}
              <span>{isSaved ? 'Salvo' : 'Salvar'}</span>
            </button>
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
          paddingRight: '2px',
        }}>
          <span style={{
            fontSize: '0.62rem',
            color: isDarkMode ? '#8696a0' : '#667781',
            fontWeight: 500,
          }}>
            {formattedTime}
          </span>
          {!isIncoming && (
            status === 'read' ? (
              <CheckCheck size={13} color="#53bdeb" />
            ) : status === 'delivered' ? (
              <CheckCheck size={13} color={isDarkMode ? '#8696a0' : '#667781'} />
            ) : (
              <Check size={13} color={isDarkMode ? '#8696a0' : '#667781'} />
            )
          )}
        </div>
      )}
    </div>
  );
};
