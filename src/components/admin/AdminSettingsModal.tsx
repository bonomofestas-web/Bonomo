import React, { useState, useEffect } from 'react';
import { X, User, Moon, Sun, Save } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import type { ThemeMode } from '../../types/admin';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, updateCurrentUserProfile, theme, setTheme } = useAdminState();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('dark');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '(21) 98888-7766');
      setAvatarUrl(currentUser.avatarUrl || '');
      setSelectedTheme(theme || 'dark');
      setSuccessMessage('');
    }
  }, [isOpen, currentUser, theme]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      updateCurrentUserProfile({
        name: name.trim(),
        email: email.trim(),
        avatarUrl: avatarUrl.trim() || '',
        phone: phone.trim() || '',
      });
      setTheme(selectedTheme);
      setSuccessMessage('Configurações e perfil atualizados com sucesso!');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 500);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--adm-text-title)',
    fontSize: '0.84rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--adm-text-title)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '540px',
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--adm-accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <User size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                Configurações do Usuário
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Perfil de acesso: <strong style={{ color: 'var(--adm-accent)', textTransform: 'uppercase' }}>{currentUser?.role || 'Master'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--adm-bg-elevated)',
              border: '1px solid var(--adm-border)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Nome */}
          <div>
            <label style={labelStyle}>
              Nome de Exibição
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Email & Telefone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Avatar Upload */}
          <ImageUploadField
            label="Foto de Perfil do Gestor"
            value={avatarUrl}
            onChange={(val) => setAvatarUrl(val)}
            folder="avatars"
            aspectRatio="1:1"
            previewHeight="75px"
            placeholder="Subir nova foto de perfil"
          />

          {/* Tema Visual da Interface */}
          <div>
            <label style={labelStyle}>
              Tema Visual da Gerência
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTheme('dark');
                  setTheme('dark');
                }}
                style={{
                  background: '#0D0B12',
                  border: selectedTheme === 'dark' ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedTheme === 'dark' ? '0 0 12px rgba(212, 175, 55, 0.3)' : 'none',
                }}
              >
                <Moon size={18} color="#D4AF37" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF' }}>Modo Escuro</div>
                  <div style={{ fontSize: '0.68rem', color: '#9E988D' }}>Preto ônix e dourado</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedTheme('light');
                  setTheme('light');
                }}
                style={{
                  background: '#FFFFFF',
                  border: selectedTheme === 'light' ? '2px solid #D4AF37' : '1px solid rgba(0, 0, 0, 0.16)',
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedTheme === 'light' ? '0 0 12px rgba(212, 175, 55, 0.3)' : 'none',
                }}
              >
                <Sun size={18} color="#F59E0B" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Modo Claro</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Interface clara e limpa</div>
                </div>
              </button>
            </div>
          </div>

          {/* Feedback */}
          {successMessage && (
            <div style={{
              background: 'var(--adm-green-bg)',
              border: '1px solid var(--adm-green)',
              color: 'var(--adm-green)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              textAlign: 'center',
            }}>
              {successMessage}
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.84rem',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.86rem',
              }}
            >
              <Save size={16} />
              <span>Salvar Preferências</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
