import React, { useState } from 'react';
import { X, Copy, Check, KeyRound } from 'lucide-react';
import type { Collaborator } from '../../types/admin';
import { generateCollabInviteLink } from '../../utils/collabInvite';

// WhatsApp Official Brand SVG Icon
const WhatsAppBrandIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#25D366' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.678.15-.2.301-.778.978-.954 1.179-.176.2-.351.226-.652.075-1.781-.892-2.946-1.597-4.108-3.593-.306-.527.306-.489.876-1.629.096-.192.048-.36-.024-.51-.072-.15-.678-1.636-.93-2.242-.244-.588-.493-.509-.678-.518-.176-.008-.377-.01-.578-.01s-.527.075-.803.376c-.276.301-1.055 1.03-1.055 2.511s1.08 2.913 1.231 3.114c.151.2 2.126 3.246 5.15 4.553.719.311 1.28.497 1.718.636.723.23 1.381.198 1.901.12.58-.087 1.78-.728 2.032-1.431.252-.703.252-1.305.176-1.431-.076-.126-.276-.201-.577-.351z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.92.545 3.715 1.488 5.237L2.05 21.95l4.857-1.39A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.634 0-3.175-.483-4.472-1.314l-.321-.205-2.887.826.837-2.822-.218-.337A8.17 8.17 0 0 1 3.8 12c0-4.522 3.678-8.2 8.2-8.2 4.522 0 8.2 3.678 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z"/>
  </svg>
);

interface AdminCollabInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborator: Collaborator | null;
  isNewUser?: boolean;
}

export const AdminCollabInviteModal: React.FC<AdminCollabInviteModalProps> = ({
  isOpen,
  onClose,
  collaborator,
  isNewUser = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !collaborator) return null;

  const inviteLink = generateCollabInviteLink(collaborator);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const rawPhone = (collaborator.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : (rawPhone.length >= 10 ? `55${rawPhone}` : '');

    const message = `Olá, ${collaborator.name}! Seu acesso ao F5 System foi liberado.\n\nAcesse pelo link abaixo para confirmar seu acesso e definir sua primeira senha:\n${inviteLink}\n\nSeja bem-vindo(a) à equipe!`;

    const encodedMsg = encodeURIComponent(message);
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    window.open(waUrl, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'var(--adm-bg-card, #0F172A)',
        border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--adm-text-muted, #94A3B8)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(20, 169, 215, 0.15)',
            border: '1px solid rgba(20, 169, 215, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#14A9D7',
            flexShrink: 0,
          }}>
            <KeyRound size={22} />
          </div>

          <div>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#14A9D7',
              letterSpacing: '0.5px',
            }}>
              {isNewUser ? 'Colaborador Cadastrado!' : 'Link de Primeiro Acesso'}
            </span>
            <h2 style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--adm-text-title, #FFFFFF)',
              margin: '2px 0 4px 0',
            }}>
              Link de Entrada Direta
            </h2>
            <p style={{
              fontSize: '0.78rem',
              color: 'var(--adm-text-muted, #94A3B8)',
              margin: 0,
              lineHeight: 1.4,
            }}>
              Envie este link para <strong>{collaborator.name}</strong>. Ao acessar, o colaborador preencherá o e-mail, definirá a primeira senha e entrará logado automaticamente.
            </p>
          </div>
        </div>

        {/* Collaborator Badge Preview */}
        <div style={{
          background: 'var(--adm-bg-input, rgba(255, 255, 255, 0.04))',
          border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
              {collaborator.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
              {collaborator.email}
            </div>
          </div>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(212, 175, 55, 0.12)',
            color: '#D4AF37',
            border: '1px solid rgba(212, 175, 55, 0.25)',
          }}>
            {collaborator.role}
          </span>
        </div>

        {/* Link Box with Copy Button */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--adm-text-muted, #94A3B8)',
            marginBottom: '6px',
          }}>
            Link Oficial de Primeiro Acesso:
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--adm-bg-input, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.15))',
            borderRadius: '10px',
            padding: '6px 8px 6px 12px',
          }}>
            <input
              type="text"
              readOnly
              value={inviteLink}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-text-title, #FFFFFF)',
                fontSize: '0.76rem',
                width: '100%',
                outline: 'none',
                fontFamily: 'monospace',
              }}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: copied ? '#10B981' : 'var(--adm-accent, #14A9D7)',
                color: '#FFFFFF',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Actions: Send WhatsApp & Finish */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(37, 211, 102, 0.35)',
              background: 'rgba(37, 211, 102, 0.12)',
              color: '#25D366',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <WhatsAppBrandIcon size={16} />
            <span>Enviar no WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.15))',
              background: 'var(--adm-bg-input, rgba(255, 255, 255, 0.05))',
              color: 'var(--adm-text-title, #FFFFFF)',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
