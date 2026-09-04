import React, { useState } from 'react';
import { X, Image as ImageIcon, MessageSquare, Check, Sparkles } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { ImageUploadField } from '../admin/ImageUploadField';

interface GuestInviteConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestInviteConfigModal: React.FC<GuestInviteConfigModalProps> = ({ isOpen, onClose }) => {
  const { debutante, updateInviteSettings } = useAppState();

  const defaultMsg = `É com muita alegria que convidamos você para celebrar esse momento tão especial na vida de ${debutante.name}. Esperamos você para tornar essa noite ainda mais inesquecível!`;

  const [useCustomPhoto, setUseCustomPhoto] = useState<boolean>(
    debutante.useCustomInvitePhoto || false
  );
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>(
    debutante.customInvitePhotoUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80'
  );
  const [receptionMessage, setReceptionMessage] = useState<string>(
    (debutante.receptionMessage && !debutante.receptionMessage.includes('Maria Eduarda')) 
      ? debutante.receptionMessage 
      : defaultMsg
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setUseCustomPhoto(debutante.useCustomInvitePhoto || false);
      setCustomPhotoUrl(debutante.customInvitePhotoUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80');
      setReceptionMessage(
        debutante.receptionMessage && !debutante.receptionMessage.includes('Maria Eduarda')
          ? debutante.receptionMessage
          : defaultMsg
      );
    }
  }, [isOpen, debutante.id, debutante.name, debutante.receptionMessage, debutante.customInvitePhotoUrl, debutante.useCustomInvitePhoto]);

  if (!isOpen) return null;

  const currentPhotoPreview = useCustomPhoto ? customPhotoUrl : debutante.avatarUrl;
  const maxChars = 300;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateInviteSettings({
      useCustomInvitePhoto: useCustomPhoto,
      customInvitePhotoUrl: customPhotoUrl.trim(),
      receptionMessage: receptionMessage.trim().slice(0, maxChars),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
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
        background: '#0E0E0E',
        border: '1.5px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '24px',
        maxWidth: '520px',
        width: '100%',
        padding: '30px 24px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 30px rgba(212, 175, 55, 0.12)',
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
            paddingBottom: '4px',
            marginBottom: '10px'
          }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#D4AF37',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}>
              Personalização do Convite
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#FFF',
            margin: '0 0 6px 0',
          }}>
            Configurar Meu Convite
          </h2>

          <p style={{
            fontSize: '0.82rem',
            color: '#B5AFA4',
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            lineHeight: 1.4,
          }}>
            Escolha a foto de destaque e a mensagem de boas-vindas para os seus convidados.
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* 1. Foto do Convite */}
          <div style={{
            background: '#141414',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '16px',
            padding: '16px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#D4AF37',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
              fontFamily: "'Cinzel', serif",
            }}>
              <ImageIcon size={15} />
              <span>1. Foto do Convite</span>
            </label>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1.5px solid #D4AF37',
                flexShrink: 0,
              }}>
                <img
                  src={currentPhotoPreview}
                  alt="Pré-visualização"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#FFF' }}>
                  <input
                    type="radio"
                    name="photoOption"
                    checked={!useCustomPhoto}
                    onChange={() => setUseCustomPhoto(false)}
                    style={{ accentColor: '#D4AF37' }}
                  />
                  <span>Usar foto do meu perfil</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#FFF' }}>
                  <input
                    type="radio"
                    name="photoOption"
                    checked={useCustomPhoto}
                    onChange={() => setUseCustomPhoto(true)}
                    style={{ accentColor: '#D4AF37' }}
                  />
                  <span>Escolher outra foto exclusiva</span>
                </label>
              </div>
            </div>

            {useCustomPhoto && (
              <div style={{ marginTop: '12px' }}>
                <ImageUploadField
                  label="Foto Exclusiva do Convite (Cloudflare R2)"
                  value={customPhotoUrl}
                  onChange={(url) => setCustomPhotoUrl(url)}
                  folder="invites"
                  aspectRatio="16:9"
                  previewHeight="130px"
                  placeholder="Selecione uma foto exclusiva para o convite"
                  helperText="Envie a foto oficial para exibir no convite dos seus convidados."
                />
              </div>
            )}
          </div>

          {/* 2. Mensagem de Recepção */}
          <div style={{
            background: '#141414',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '16px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#D4AF37',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontFamily: "'Cinzel', serif",
              }}>
                <MessageSquare size={15} />
                <span>2. Mensagem para os Convidados</span>
              </label>

              <span style={{
                fontSize: '0.72rem',
                color: receptionMessage.length >= maxChars ? '#EF4444' : '#B5AFA4',
                fontWeight: 600,
              }}>
                {receptionMessage.length}/{maxChars} caracteres
              </span>
            </div>

            <textarea
              rows={4}
              maxLength={maxChars}
              placeholder="Escreva uma mensagem especial convidando seus amigos e familiares..."
              value={receptionMessage}
              onChange={(e) => setReceptionMessage(e.target.value.slice(0, maxChars))}
              style={{
                width: '100%',
                background: '#0D0D0D',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: '#FFF',
                fontSize: '0.84rem',
                outline: 'none',
                fontFamily: "'Montserrat', sans-serif",
                resize: 'none',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Salvar Botão */}
          <button
            type="submit"
            style={{
              background: savedSuccess ? '#10B981' : 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
              color: savedSuccess ? '#FFF' : '#000',
              border: 'none',
              borderRadius: '50px',
              padding: '14px 24px',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '1px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {savedSuccess ? <Check size={18} /> : <Sparkles size={16} />}
            <span>{savedSuccess ? 'Configurações Salvas!' : 'Salvar Personalização'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
