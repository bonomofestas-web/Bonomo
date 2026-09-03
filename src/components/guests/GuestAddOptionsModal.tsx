import React from 'react';
import { X, UserPlus, Share2, ArrowRight } from 'lucide-react';

interface GuestAddOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectContacts?: () => void;
  onSelectShareLink: () => void;
}

export const GuestAddOptionsModal: React.FC<GuestAddOptionsModalProps> = ({
  isOpen,
  onClose,
  onSelectManual,
  onSelectShareLink,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #18141C 0%, #0E0A12 100%)',
        border: '1.5px solid rgba(212, 175, 55, 0.45)',
        borderRadius: '24px',
        maxWidth: '440px',
        width: '100%',
        padding: '26px 24px',
        position: 'relative',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85), 0 0 24px rgba(212, 175, 55, 0.15)',
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
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1.5px solid rgba(212, 175, 55, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            boxShadow: '0 0 16px rgba(212, 175, 55, 0.25)',
          }}>
            <UserPlus size={24} color="#D4AF37" />
          </div>

          <h3 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 6px 0',
          }}>
            Adicionar Convidado
          </h3>
          <p style={{
            fontSize: '0.84rem',
            color: '#B5AFA4',
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
          }}>
            Escolha como deseja cadastrar ou convidar:
          </p>
        </div>

        {/* 3 Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Option 1: Preencher Manualmente */}
          <div
            onClick={() => {
              onClose();
              onSelectManual();
            }}
            style={{
              background: 'linear-gradient(135deg, #1A1620 0%, #120E18 100%)',
              border: '1.5px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
            className="add-guest-option-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <UserPlus size={20} color="#D4AF37" />
              </div>

              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFF', fontFamily: 'Poppins, sans-serif' }}>
                  Preencher Manualmente
                </div>
                <div style={{ fontSize: '0.74rem', color: '#B5AFA4', marginTop: '2px', fontFamily: "'Montserrat', sans-serif" }}>
                  Cadastre os dados do convidado diretamente no app
                </div>
              </div>
            </div>

            <ArrowRight size={16} color="#D4AF37" />
          </div>

          {/* Option 2: Enviar Link Oficial de Convite */}
          <div
            onClick={() => {
              onClose();
              onSelectShareLink();
            }}
            style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(20, 14, 28, 0.95) 100%)',
              border: '1.5px solid #D4AF37',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.2)',
            }}
            className="add-guest-option-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Share2 size={20} color="#000" />
              </div>

              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFD700', fontFamily: 'Poppins, sans-serif' }}>
                  Enviar Link Oficial de Convite
                </div>
                <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', marginTop: '2px', fontFamily: "'Montserrat', sans-serif" }}>
                  Compartilhe no WhatsApp ou redes para auto-confirmação
                </div>
              </div>
            </div>

            <ArrowRight size={16} color="#FFD700" />
          </div>
        </div>

        <style>{`
          .add-guest-option-card:hover {
            transform: translateY(-2px);
            border-color: #D4AF37 !important;
            box-shadow: 0 8px 20px rgba(0,0,0,0.8), 0 0 16px rgba(212, 175, 55, 0.2) !important;
          }
        `}</style>
      </div>
    </div>
  );
};
