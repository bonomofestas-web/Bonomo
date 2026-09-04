import React, { useState } from 'react';
import { X, Crown, Camera, Check } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { ImageUploadField } from '../admin/ImageUploadField';

interface DebutanteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebutanteProfileModal: React.FC<DebutanteProfileModalProps> = ({ isOpen, onClose }) => {
  const { debutante, updateDebutanteAvatar } = useAppState();
  const [avatarUrl, setAvatarUrl] = useState<string>(debutante.avatarUrl || '/avatar_debutante_1.png');
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setAvatarUrl(debutante.avatarUrl || '/avatar_debutante_1.png');
      setSavedSuccess(false);
    }
  }, [isOpen, debutante.avatarUrl]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarUrl.trim()) return;

    updateDebutanteAvatar(avatarUrl.trim());
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
      zIndex: 100000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: '#0E0E0E',
        border: '1.5px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '24px',
        maxWidth: '460px',
        width: '100%',
        padding: '28px 24px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
      }}>
        {/* Close Button */}
        <button
          type="button"
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
            transition: 'all 0.15s ease',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            position: 'relative',
            width: '76px',
            height: '76px',
            margin: '0 auto 12px auto',
          }}>
            <img
              src={avatarUrl}
              alt={debutante.name}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid #D4AF37',
                boxShadow: '0 0 18px rgba(212, 175, 55, 0.35)',
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)',
              border: '2px solid #0E0E0E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Crown size={12} color="#1A0E00" strokeWidth={2.5} />
            </div>
          </div>

          <h3 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#FFF',
            margin: '0 0 4px 0',
          }}>
            Foto de Perfil
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#B5AFA4', margin: 0 }}>
            {debutante.name} • Envie sua melhor foto para brilhar em todo o aplicativo!
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <ImageUploadField
            label="Enviar Nova Foto (Cloudflare R2)"
            value={avatarUrl}
            onChange={(newUrl) => setAvatarUrl(newUrl)}
            aspectRatio="1:1"
            previewHeight="120px"
            folder="avatars"
            placeholder="Selecione uma imagem do seu dispositivo"
            helperText="Formato quadrado recomendado. A foto será salva instantaneamente na nuvem."
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={savedSuccess}
              style={{
                flex: 2,
                padding: '11px',
                borderRadius: '12px',
                background: savedSuccess 
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                border: 'none',
                color: savedSuccess ? '#FFF' : '#000',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              {savedSuccess ? (
                <>
                  <Check size={16} />
                  <span>Foto Atualizada!</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>Salvar Foto de Perfil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
