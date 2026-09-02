import React, { useState } from 'react';
import { 
  User, Phone, Lock, Moon, Sun, Bell, 
  CheckCircle2, ShieldCheck, Camera, 
  ArrowLeft, ChevronRight, Save, Sparkles, MessageCircle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { APP_VERSION } from '../../types/admin';

interface AdminUserSettingsViewProps {
  onBack?: () => void;
}

export const AdminUserSettingsView: React.FC<AdminUserSettingsViewProps> = ({ onBack }) => {
  const { currentUser, updateCurrentUserProfile, theme, setTheme } = useAdminState();

  const [activeSection, setActiveSection] = useState<'overview' | 'profile' | 'security'>('overview');
  
  // Profile form state
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'O nome não pode ficar vazio.' });
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setFeedback({ type: 'error', message: 'A nova senha deve conter pelo menos 6 dígitos.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFeedback({ type: 'error', message: 'As senhas digitadas não coincidem.' });
        return;
      }
    }

    setIsSaving(true);
    try {
      updateCurrentUserProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });

      setFeedback({ type: 'success', message: 'Dados e preferências atualizados com sucesso!' });
      setTimeout(() => {
        if (activeSection !== 'overview') setActiveSection('overview');
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao salvar alterações.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(!notificationsEnabled);
      } else {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setNotificationsEnabled(true);
            new Notification('Bonomo Festas', {
              body: 'Notificações ativadas com sucesso no seu dispositivo!',
              icon: '/logo_bonomo_gold.png',
            });
          } else {
            setNotificationsEnabled(false);
          }
        });
      }
    } else {
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '28px 32px 60px',
      boxSizing: 'border-box',
      fontFamily: "'Poppins', sans-serif",
      color: 'var(--adm-text-title)',
    }}>
      {/* Top Breadcrumb */}
      {onBack && (
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#D4AF37',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
            }}
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Painel</span>
          </button>
        </div>
      )}

      {/* Profile Header Block (Centered Avatar & Info) */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '24px',
        padding: '32px 20px 24px 20px',
        textAlign: 'center',
        boxShadow: 'var(--adm-shadow)',
        marginBottom: '20px',
        position: 'relative',
      }}>
        {/* Avatar with Edit Badge */}
        <div style={{ position: 'relative', width: '92px', height: '92px', margin: '0 auto 14px auto' }}>
          <img
            src={currentUser?.avatarUrl || avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt={currentUser?.name || 'Avatar'}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #D4AF37',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          />
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            title="Alterar foto de perfil"
            style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: '#D4AF37',
              border: '2px solid #000',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <Camera size={15} />
          </button>
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 2px 0', color: 'var(--adm-text-title)' }}>
          {currentUser?.name || 'Administrador'}
        </h2>
        <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', marginBottom: '14px' }}>
          {currentUser?.email}
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(212, 175, 55, 0.12)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '20px',
          padding: '4px 14px',
          fontSize: '0.74rem',
          color: '#D4AF37',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          <ShieldCheck size={14} />
          <span>Perfil {currentUser?.role?.toUpperCase() || 'MASTER'}</span>
        </div>
      </div>

      {feedback && (
        <div style={{
          background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedback.type === 'success' ? '#22C55E' : '#EF4444'}`,
          color: feedback.type === 'success' ? '#4ADE80' : '#F87171',
          borderRadius: '14px',
          padding: '12px 16px',
          fontSize: '0.84rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <Lock size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* OVERVIEW SECTIONS (CARDS AS IN REFERENCE IMAGE) */}
      {activeSection === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 1: Informações Cadastrais */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            padding: '18px 20px',
            boxShadow: 'var(--adm-shadow)',
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
              Dados do Colaborador
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div 
                onClick={() => setActiveSection('profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--adm-bg-input)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <User size={18} color="#D4AF37" />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Editar Nome & Foto</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{currentUser?.name}</div>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--adm-text-muted)" />
              </div>

              <div 
                onClick={() => setActiveSection('profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--adm-bg-input)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Phone size={18} color="#D4AF37" />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>WhatsApp Pessoal</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{currentUser?.phone || 'Não informado'}</div>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--adm-text-muted)" />
              </div>

              <div 
                onClick={() => setActiveSection('security')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--adm-bg-input)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Lock size={18} color="#D4AF37" />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Alterar Senha de Acesso</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Mantenha sua conta corporativa protegida</div>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--adm-text-muted)" />
              </div>
            </div>
          </div>

          {/* Card 2: Preferências & Sistema (Tema e Notificações) */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            padding: '18px 20px',
            boxShadow: 'var(--adm-shadow)',
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
              Preferências do Aplicativo
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Theme Switch */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'var(--adm-bg-input)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {theme === 'dark' ? <Moon size={18} color="#D4AF37" /> : <Sun size={18} color="#D4AF37" />}
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Tema Visual</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                      {theme === 'dark' ? 'Modo Escuro (Preto Ônix)' : 'Modo Claro'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  style={{
                    background: theme === 'dark' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.06)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{theme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}</span>
                </button>
              </div>

              {/* Push Notifications Switch */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'var(--adm-bg-input)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Bell size={18} color="#D4AF37" />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Notificações Push</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Alertas de novas indicações e tarefas</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  style={{
                    background: notificationsEnabled ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                    border: `1px solid ${notificationsEnabled ? '#22C55E' : '#EF4444'}`,
                    color: notificationsEnabled ? '#22C55E' : '#EF4444',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {notificationsEnabled ? 'Ativadas' : 'Desativadas'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Suporte & Sobre */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            padding: '18px 20px',
            boxShadow: 'var(--adm-shadow)',
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
              Suporte & Ecossistema
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href="https://wa.me/5521999999999?text=Olá,%20preciso%20de%20suporte%20no%20app%20Bonomo%20Festas"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--adm-bg-input)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MessageCircle size={18} color="#22C55E" />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Falar com Suporte Técnico</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Atendimento direto via WhatsApp</div>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--adm-text-muted)" />
              </a>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'var(--adm-bg-input)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Sparkles size={18} color="#D4AF37" />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Versão do Sistema</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Bonomo Festas Enterprise</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#D4AF37' }}>{APP_VERSION}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE EDIT SUBSECTION */}
      {activeSection === 'profile' && (
        <form onSubmit={handleSaveProfile} style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--adm-text-title)' }}>
              Editar Dados Pessoais
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('overview')}
              style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>

          <ImageUploadField
            label="Foto de Perfil / Avatar"
            value={avatarUrl}
            onChange={setAvatarUrl}
            aspectRatio="1:1"
            previewHeight="70px"
            placeholder="Clique para enviar sua foto"
          />

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: 'var(--adm-text-title)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
              WhatsApp Pessoal *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(21) 99999-9999"
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: 'var(--adm-text-title)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            style={{
              background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
              color: '#000',
              border: 'none',
              borderRadius: '30px',
              padding: '14px',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
            }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </form>
      )}

      {/* SECURITY / PASSWORD SUBSECTION */}
      {activeSection === 'security' && (
        <form onSubmit={handleSaveProfile} style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--adm-text-title)' }}>
              Alterar Senha
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('overview')}
              style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
              Nova Senha *
            </label>
            <input
              type="password"
              required
              placeholder="No mínimo 6 dígitos"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: 'var(--adm-text-title)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
              Confirmar Nova Senha *
            </label>
            <input
              type="password"
              required
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: 'var(--adm-text-title)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            style={{
              background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
              color: '#000',
              border: 'none',
              borderRadius: '30px',
              padding: '14px',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
            }}
          >
            <Lock size={16} />
            <span>{isSaving ? 'Atualizando Senha...' : 'Atualizar Senha'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
