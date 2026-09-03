import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminForgotPasswordModal } from './AdminForgotPasswordModal';
import { APP_VERSION } from '../../types/admin';

interface AdminLoginViewProps {
  onSuccessLogin?: () => void;
  onBackToApp?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onSuccessLogin,
  onBackToApp,
}) => {
  const { login } = useAdminState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Mobile 2-step navigation state ('welcome' | 'form')
  const [mobileStep, setMobileStep] = useState<'welcome' | 'form'>('welcome');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('Por favor, informe seu e-mail corporativo.');
      return;
    }

    if (!cleanPassword) {
      setError('Por favor, informe sua senha de acesso.');
      return;
    }

    setLoading(true);

    try {
      // Authenticate strictly with email and password
      const success = login(cleanEmail, cleanPassword);

      if (!success) {
        throw new Error('E-mail ou senha incorretos.');
      }

      if (onSuccessLogin) onSuccessLogin();
    } catch (err: any) {
      setError(err?.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#080C14',
      color: '#FFFFFF',
      display: 'flex',
      fontFamily: "'Poppins', sans-serif",
      overflowX: 'hidden',
      position: 'relative',
    }}>
      {/* ── DESKTOP & MOBILE SPLIT CONTAINER ─────────────────────────────────── */}
      <div className="login-wrapper" style={{
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
      }}>
        {/* ========================================================================= */}
        {/* MOBILE VIEW (2-STEP FLOW)                                                 */}
        {/* ========================================================================= */}
        <div className="login-mobile-only" style={{
          display: 'none',
          width: '100%',
          minHeight: '100vh',
          background: '#080C14',
          flexDirection: 'column',
          position: 'relative',
        }}>
          {mobileStep === 'welcome' ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
              position: 'relative',
              justifyContent: 'space-between',
            }}>
              {/* Background Gala / Tech */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '65%',
                backgroundImage: `url('/debutante_staircase.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(8,12,20,0.4) 0%, rgba(8,12,20,0.3) 40%, rgba(8,12,20,0.98) 100%)',
                }} />

                {/* Top Logo F5 System */}
                <div style={{ padding: '24px', position: 'relative', zIndex: 2 }}>
                  <img
                    src="/f5_logo.png"
                    alt="F5 System"
                    style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
                  />
                </div>

                {/* Catchy Title */}
                <div style={{ position: 'absolute', bottom: '40px', left: '24px', right: '24px', zIndex: 2 }}>
                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    lineHeight: '1.25',
                    margin: 0,
                    fontFamily: "'Poppins', sans-serif",
                  }}>
                    Inteligência comercial e gestão completa de eventos.
                  </h2>
                </div>
              </div>

              {/* Bottom Card */}
              <div style={{
                marginTop: 'auto',
                background: '#0C131E',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                border: '1.5px solid rgba(20, 169, 215, 0.25)',
                borderBottom: 'none',
                padding: '32px 24px',
                zIndex: 3,
                boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
              }}>
                <p style={{ fontSize: '0.84rem', color: '#8096A8', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                  Acesse a plataforma corporativa e CRM do F5 System.
                </p>

                <button
                  type="button"
                  onClick={() => setMobileStep('form')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '14px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 18px rgba(20, 169, 215, 0.4)',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <span>Entrar no Sistema</span>
                  <ArrowRight size={17} />
                </button>

                {onBackToApp && (
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={onBackToApp}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#8096A8',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      <ArrowLeft size={13} />
                      <span>Voltar para o App da Debutante</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* MOBILE STEP 2: LOGIN FORM */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
              padding: '24px',
              boxSizing: 'border-box',
              justifyContent: 'space-between',
              background: '#080C14',
            }}>
              {/* Header with Back Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                zIndex: 10,
              }}>
                <button
                  type="button"
                  onClick={() => setMobileStep('welcome')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={18} />
                </button>

                <img
                  src="/f5_logo.png"
                  alt="F5 System"
                  style={{
                    height: '32px',
                    width: 'auto',
                    maxWidth: '160px',
                    objectFit: 'contain',
                  }}
                />

                <div style={{ width: '38px' }} />
              </div>

              {/* Centered Form Wrapper */}
              <div style={{ width: '100%', maxWidth: '380px', margin: '40px auto 0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0', fontFamily: "'Poppins', sans-serif" }}>
                    Bem-vindo!
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#8096A8', margin: 0 }}>
                    Acesse sua conta no F5 System.
                  </p>
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#F87171',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.8rem',
                    marginBottom: '16px',
                  }}>
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: '#14A9D7',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                    }}>
                      E-mail Corporativo
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                      <input
                        type="email"
                        required
                        placeholder="seu.email@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0F1724',
                          border: '1px solid rgba(20, 169, 215, 0.3)',
                          borderRadius: '12px',
                          padding: '12px 14px 12px 42px',
                          color: '#FFFFFF',
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{
                        fontSize: '0.72rem',
                        color: '#14A9D7',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Senha de Acesso
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#8096A8',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        Esqueceu?
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0F1724',
                          border: '1px solid rgba(20, 169, 215, 0.3)',
                          borderRadius: '12px',
                          padding: '12px 14px 12px 42px',
                          color: '#FFFFFF',
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '30px',
                      padding: '14px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      opacity: loading ? 0.7 : 1,
                      boxShadow: '0 4px 18px rgba(20, 169, 215, 0.4)',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    <span>{loading ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </div>

              {/* Mobile Footer */}
              <div style={{ textAlign: 'center', paddingBottom: '16px', fontSize: '0.72rem', color: '#647E8C' }}>
                F5 System • Versão {APP_VERSION}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP SPLIT VIEW: FORM LEFT + LUXURY VISUAL RIGHT                       */}
        {/* ========================================================================= */}
        <div className="login-desktop-form-pane" style={{
          width: '460px',
          minWidth: '420px',
          maxWidth: '500px',
          background: '#080C14',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 40px',
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(20, 169, 215, 0.2)',
          zIndex: 2,
          position: 'relative',
        }}>
          {/* Centered Inner Container */}
          <div style={{ width: '100%', maxWidth: '380px' }}>
            {/* Top Horizontal Logo F5 System */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <img
                src="/f5_logo.png"
                alt="F5 System"
                style={{
                  width: '100%',
                  maxWidth: '210px',
                  height: 'auto',
                  maxHeight: '48px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            </div>

            {/* Title & Subtitle */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: '0 0 6px 0',
                fontFamily: "'Poppins', sans-serif",
              }}>
                Acesso ao Sistema
              </h2>
              <p style={{
                fontSize: '0.82rem',
                color: '#8096A8',
                margin: 0,
                lineHeight: '1.5',
              }}>
                Informe suas credenciais para gerenciar o ecossistema F5 System.
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#F87171',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={15} color="#F87171" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  color: '#14A9D7',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}>
                  E-mail Corporativo
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0F1724',
                      border: '1px solid rgba(20, 169, 215, 0.3)',
                      borderRadius: '10px',
                      padding: '12px 14px 12px 42px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#14A9D7'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.3)'; }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{
                    fontSize: '0.72rem',
                    color: '#14A9D7',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Senha de Acesso
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#8096A8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Esqueceu sua senha?
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0F1724',
                      border: '1px solid rgba(20, 169, 215, 0.3)',
                      borderRadius: '10px',
                      padding: '12px 14px 12px 42px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#14A9D7'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.3)'; }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '13px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 18px rgba(20, 169, 215, 0.4)',
                  transition: 'opacity 0.2s ease, transform 0.15s ease',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <span>{loading ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {onBackToApp && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={onBackToApp}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8096A8',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <ArrowLeft size={12} />
                  <span>Voltar para a Visão da Debutante</span>
                </button>
              </div>
            )}

            {/* Footer Security Notice & Version */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: '#647E8C',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              marginTop: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} color="#14A9D7" />
                <span>Ambiente Seguro F5 System</span>
              </div>
              <div>Versão {APP_VERSION}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LUXURY DEBUTANTE STAIRCASE PHOTO */}
        <div className="login-desktop-visual-pane" style={{
          flex: '1 1 500px',
          position: 'relative',
          background: '#080C14',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '48px',
          boxSizing: 'border-box',
        }}>
          {/* Background Image with Dark Vignette & Gradient */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('/debutante_staircase.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            filter: 'brightness(0.78) contrast(1.1)',
          }} />

          {/* Ambient Dark Gradient Overlays */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(8,12,20,0.3) 0%, rgba(8,12,20,0.15) 40%, rgba(8,12,20,0.95) 100%)',
          }} />

          {/* Text Overlay Content */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '540px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(20, 169, 215, 0.18)',
              border: '1px solid rgba(20, 169, 215, 0.45)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.72rem',
              color: '#4AB7C2',
              fontWeight: 800,
              letterSpacing: '1px',
              marginBottom: '16px',
            }}>
              <span>F5 SYSTEM • GESTÃO DE EVENTOS DE ALTO PADRÃO</span>
            </div>

            <h2 style={{
              fontSize: '2.1rem',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: '1.25',
              margin: '0 0 12px 0',
              textShadow: '0 4px 20px rgba(0,0,0,0.9)',
              fontFamily: "'Poppins', sans-serif",
            }}>
              Transformando sonhos em experiências extraordinárias.
            </h2>

            <p style={{
              fontSize: '0.92rem',
              color: '#D3E0EA',
              lineHeight: '1.6',
              margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              fontFamily: "'Poppins', sans-serif",
            }}>
              Controle completo de unidades, qualificação de leads, pipelines dinâmicos e atendimento inteligente.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <AdminForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 860px) {
          .login-desktop-form-pane,
          .login-desktop-visual-pane {
            display: none !important;
          }
          .login-mobile-only {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};
