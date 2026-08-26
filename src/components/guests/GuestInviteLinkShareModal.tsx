import React, { useState } from 'react';
import { X, Copy, Check, Share2, ExternalLink, Heart } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface GuestInviteLinkShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPublicLandingPage: () => void;
}

export const GuestInviteLinkShareModal: React.FC<GuestInviteLinkShareModalProps> = ({
  isOpen,
  onClose,
  onOpenPublicLandingPage
}) => {
  const { debutante } = useAppState();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const publicLink = `${window.location.origin}${window.location.pathname}?convite=${encodeURIComponent(debutante.name.toLowerCase().replace(/\s+/g, '-'))}`;
  const whatsappMessage = `Olá! Você é nosso(a) convidado(a) especial para a celebração de 15 Anos da ${debutante.name} no Espaço Rio Lounge! 👑✨\n\nPor gentileza, confirme sua presença e deixe sua mensagem de carinho no link:\n${publicLink}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#0D0D0D',
        border: '1.5px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '24px',
        maxWidth: '540px',
        width: '100%',
        padding: '32px 26px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 30px rgba(212, 175, 55, 0.1)',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.4)',
            paddingBottom: '6px',
            marginBottom: '12px'
          }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#D4AF37',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}>
              Link de Convite Oficial • Espaço Rio Lounge
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
            fontWeight: 700,
            color: '#FFF',
            margin: '0 0 8px 0',
          }}>
            Convite para Noite de Gala ✨
          </h2>

          <p style={{
            fontSize: '0.84rem',
            color: '#C7C1B3',
            margin: 0,
            lineHeight: 1.5,
            fontFamily: "'Montserrat', sans-serif",
          }}>
            Envie este link aos seus convidados para que eles confirmem presença e deixem uma mensagem de carinho para você.
          </p>
        </div>

        {/* Link Box */}
        <div style={{
          background: '#141414',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '14px',
          padding: '12px 14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div style={{
            fontSize: '0.8rem',
            color: '#E8C98D',
            fontWeight: 600,
            fontFamily: 'monospace, "SF Mono", Consolas, monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {publicLink}
          </div>

          <button
            onClick={handleCopy}
            style={{
              background: copied ? '#10B981' : 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
              color: copied ? '#FFF' : '#000',
              border: 'none',
              borderRadius: '20px',
              padding: '7px 16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
          <button
            onClick={handleShareWhatsApp}
            style={{
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '50px',
              padding: '13px 22px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "'Montserrat', sans-serif",
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
            }}
          >
            <Share2 size={16} />
            <span>Compartilhar no WhatsApp</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenPublicLandingPage();
            }}
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
              color: '#000000',
              border: 'none',
              borderRadius: '50px',
              padding: '13px 22px',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '1px',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.25)',
            }}
          >
            <ExternalLink size={16} />
            <span>Visualizar Página de Gala do Convidado</span>
          </button>
        </div>

        {/* Informative Note */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '12px 14px',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          fontSize: '0.75rem',
          color: '#BDB7A9',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}>
          <Heart size={14} color="#D4AF37" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            Os convidados que confirmarem pelo link entram na sua lista automaticamente como <strong>Confirmados</strong> e as mensagens de carinho ficam disponíveis na aba <strong>Convidados</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
