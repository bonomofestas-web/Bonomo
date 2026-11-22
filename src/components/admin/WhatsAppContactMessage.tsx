import React, { useState } from 'react';
import { User, BookmarkCheck, BookmarkPlus, ArrowRightCircle, CheckCheck, Check, CheckCircle2 } from 'lucide-react';
import { formatPhone } from '../../utils/phoneFormatter';

export interface ContactMessageInfo {
  name: string;
  phone: string;
  isContact: boolean;
}

/**
 * Utilitário universal para detectar e extrair com precisão os dados de um cartão de contato (vCard),
 * cobrindo metadata do WhatsApp/UAZAPI, strings multilinhas ("Nome\nPhone (Celular): 55..."),
 * marcadores "Contato: Nome (Telefone)" e blocos brutos BEGIN:VCARD.
 */
export function parseContactMessageInfo(act: {
  text?: string | null;
  mediaType?: string | null;
  metadata?: any;
}): ContactMessageInfo {
  const meta = (act?.metadata as any) || {};
  let name = meta.contactName || meta.displayName || meta.fullName || '';
  let phone = meta.contactPhone || meta.phoneNumber || meta.phone || '';

  const rawText = (act?.text || '').trim();

  // 1. Se já veio completo no metadata
  if (name && phone) {
    return { name, phone: String(phone).replace(/\D/g, ''), isContact: true };
  }

  // 2. Se tem vCard string no metadata ou no texto
  const vcardStr = meta.vcard || (rawText.includes('BEGIN:VCARD') ? rawText : '');
  if (vcardStr) {
    const fnMatch = vcardStr.match(/FN:(.+)/i);
    const waidMatch = vcardStr.match(/waid=(\d+)/i);
    const telMatch = vcardStr.match(/TEL[^:]*:(.+)/i);
    if (!name && fnMatch?.[1]) name = fnMatch[1].trim();
    if (!phone && waidMatch?.[1]) phone = waidMatch[1].trim();
    else if (!phone && telMatch?.[1]) phone = telMatch[1].replace(/\D/g, '');
    if (name || phone) {
      return { name: name || 'Contato', phone: String(phone).replace(/\D/g, ''), isContact: true };
    }
  }

  // 3. Padrão UAZAPI / Baileys: "Nome\nPhone (Celular): 5521995448840" ou "Nome\nTelefone: 5521..."
  const phoneLabelRegex = /(?:^|\n)(?:Phone|Telefone|Tel|Celular)(?:\s*\([^)]*\))?\s*:\s*(\+?\d[\d\s-]*\d|\d+)/i;
  const phoneMatch = rawText.match(phoneLabelRegex);
  if (phoneMatch) {
    const matchedPhone = phoneMatch[1].replace(/\D/g, '');
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const candidateName = lines.find(l => !phoneLabelRegex.test(l) && !l.toLowerCase().startsWith('phone') && !l.toLowerCase().startsWith('telefone') && !l.toLowerCase().startsWith('tel:')) || 'Contato';
    return {
      name: name || candidateName,
      phone: phone ? String(phone).replace(/\D/g, '') : matchedPhone,
      isContact: true,
    };
  }

  // 4. Padrão "👤 Contato: Nome (Telefone)" ou "Contato: Nome (Telefone)"
  const contatoPrefixRegex = /^(?:👤\s*)?Contato:\s*(.+)$/i;
  const contatoMatch = rawText.match(contatoPrefixRegex);
  if (contatoMatch) {
    const clean = contatoMatch[1].trim();
    const parenPhoneMatch = clean.match(/\(([^)]+)\)$/);
    if (parenPhoneMatch) {
      const p = parenPhoneMatch[1].replace(/\D/g, '');
      const n = clean.replace(/\s*\([^)]*\)$/, '').trim();
      return { name: name || n || 'Contato', phone: phone ? String(phone).replace(/\D/g, '') : p, isContact: true };
    }
    return { name: name || clean || 'Contato', phone: phone ? String(phone).replace(/\D/g, '') : '', isContact: true };
  }

  // 5. Se expressamente marcado como vcard no mediaType ou metadata
  if (act?.mediaType === 'vcard' || meta.isContactCard || meta.is_contact_card) {
    return { name: name || 'Contato', phone: phone ? String(phone).replace(/\D/g, '') : '', isContact: true };
  }

  return { name: '', phone: '', isContact: false };
}

interface WhatsAppContactMessageProps {
  contactName: string;
  contactPhone: string;
  avatarUrl?: string;
  isIncoming?: boolean;
  formattedTime?: string;
  isDarkMode?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  isPostSale?: boolean;
  onSaveContact?: () => void;
  onPullToFunnel?: () => void;
  isSaved?: boolean;
  isLeadInFunnel?: boolean;
}

export const WhatsAppContactMessage: React.FC<WhatsAppContactMessageProps> = ({
  contactName,
  contactPhone,
  avatarUrl,
  isIncoming = false,
  formattedTime,
  isDarkMode = false,
  status = 'read',
  isPostSale = false,
  onSaveContact,
  onPullToFunnel,
  isSaved = false,
  isLeadInFunnel = false,
}) => {
  const [localSaved, setLocalSaved] = useState(isSaved);
  const [localPulled, setLocalPulled] = useState(isLeadInFunnel);

  const formattedPhone = formatPhone(contactPhone) || contactPhone;
  const initials = contactName
    ? contactName.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'CT';

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalSaved(true);
    onSaveContact?.();
  };

  const handlePull = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalPulled(true);
    onPullToFunnel?.();
  };

  // Cores nativas do WhatsApp Web
  const cardBg = isDarkMode
    ? (isIncoming ? '#202c33' : '#005c4b')
    : (isIncoming ? '#ffffff' : '#d9fdd3');

  const borderLine = isDarkMode
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.08)';

  const primaryText = isDarkMode ? '#e9edef' : '#111b21';
  const mutedText = isDarkMode ? '#8696a0' : '#667781';
  const actionColor = isDarkMode ? '#00a884' : '#008069';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isIncoming ? '12px 12px 12px 3px' : '12px 12px 3px 12px',
        overflow: 'hidden',
        background: cardBg,
        border: `1px solid ${borderLine}`,
        boxShadow: isDarkMode ? '0 1px 2px rgba(0, 0, 0, 0.35)' : '0 1px 1px rgba(0, 0, 0, 0.10)',
        minWidth: '270px',
        maxWidth: '330px',
        userSelect: 'none',
      }}
    >
      {/* Topo do Cartão: Avatar + Nome + Telefone + Horário */}
      <div
        style={{
          padding: '12px 14px 10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={contactName}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: `1px solid ${borderLine}`,
              }}
            />
          ) : (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: isDarkMode ? '#374248' : '#dfe5e7',
                color: isDarkMode ? '#cfd6d9' : '#54656f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.90rem',
                flexShrink: 0,
              }}
            >
              {initials || <User size={20} />}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <span
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: primaryText,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {contactName || 'Contato'}
            </span>
            {formattedPhone && (
              <span
                style={{
                  fontSize: '0.74rem',
                  color: mutedText,
                  marginTop: '2px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {formattedPhone}
              </span>
            )}
          </div>
        </div>

        {/* Hora e Status do Envio */}
        {formattedTime && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'flex-end',
              gap: '3px',
              paddingBottom: '2px',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '0.64rem', color: mutedText, fontWeight: 500 }}>
              {formattedTime}
            </span>
            {!isIncoming && (
              status === 'read' ? (
                <CheckCheck size={13} color="#53bdeb" />
              ) : status === 'delivered' ? (
                <CheckCheck size={13} color={mutedText} />
              ) : (
                <Check size={13} color={mutedText} />
              )
            )}
          </div>
        )}
      </div>

      {/* Linha Divisória */}
      <div style={{ height: '1px', background: borderLine, width: '100%' }} />

      {/* Barra de Ações: Salvar contato | Puxar no funil */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: '42px',
          background: isDarkMode ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Botão 1: Salvar contato */}
        <button
          type="button"
          onClick={handleSave}
          title={localSaved ? 'Contato salvo na base' : 'Salvar contato na Central de Contatos'}
          style={{
            flex: 1,
            height: '100%',
            background: 'transparent',
            border: 'none',
            borderRight: `1px solid ${borderLine}`,
            color: localSaved ? '#10B981' : actionColor,
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            padding: '0 8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {localSaved ? <BookmarkCheck size={14} color="#10B981" /> : <BookmarkPlus size={14} />}
          <span>{localSaved ? 'Contato Salvo' : 'Salvar contato'}</span>
        </button>

        {/* Botão 2: Puxar no funil */}
        <button
          type="button"
          onClick={handlePull}
          title={localPulled ? (isPostSale ? 'Cliente já vinculado ao Pós-Venda' : 'Lead já vinculado ao funil') : (isPostSale ? 'Cadastrar Cliente no Pós-Venda a partir deste número' : 'Criar novo Lead no funil ativo a partir deste número')}
          style={{
            flex: 1,
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: localPulled ? '#10B981' : actionColor,
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            padding: '0 8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {localPulled ? <CheckCircle2 size={14} color="#10B981" /> : <ArrowRightCircle size={14} />}
          <span>{localPulled ? (isPostSale ? 'Cliente no funil' : 'Puxado no funil') : (isPostSale ? 'Puxar Cliente' : 'Puxar no funil')}</span>
        </button>
      </div>
    </div>
  );
};
