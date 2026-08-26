import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Sparkles, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminForgotPasswordModal } from './AdminForgotPasswordModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
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
  const [email, setEmail] = useState('dev@bonomoapp.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Mobile 2-step navigation state ('welcome' | 'form')
  const [mobileStep, setMobileStep] = useState<'welcome' | 'form'>('welcome');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Por favor, informe o e-mail corporativo.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        let authUser: any = null;
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (!authError && data?.user) {
          authUser = data.user;
        }

        // Fetch latest collaborator profile from DB
        const { data: dbCollab } = await supabase
          .from('collaborators')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        const success = login(cleanEmail, password, {
          id: authUser?.id || dbCollab?.id,
          name: dbCollab?.name || authUser?.user_metadata?.name,
          avatarUrl: dbCollab?.avatar_url || authUser?.user_metadata?.avatar_url,
          role: dbCollab?.role || authUser?.user_metadata?.role,
        });

        if (!success && authError) {
          throw new Error(authError.message || 'Credenciais inválidas ou acesso inativo.');
        }
      } else {
        const success = login(cleanEmail, password);
        if (!success) {
          throw new Error('E-mail ou senha incorretos.');
        }
      }

      if (onSuccessLogin) onSuccessLogin();
    } catch (err: any) {
      setError(err?.message || 'Erro ao efetuar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signInWithPassword({
          email: 'dev@bonomoapp.com',
          password: 'password123',
        }).catch(() => {});

        const { data: dbCollab } = await supabase
          .from('collaborators')
          .select('*')
          .ilike('email', 'dev@bonomoapp.com')
          .maybeSingle();

        login('dev@bonomoapp.com', '123456', {
          id: dbCollab?.id || 'a0000000-0000-0000-0000-000000000001',
          name: dbCollab?.name || 'Dev Master',
          avatarUrl: dbCollab?.avatar_url,
          role: 'master',
        });
      } else {
        login('dev@bonomoapp.com', '123456');
      }
      if (onSuccessLogin) onSuccessLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#08060B',
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
        {/* MOBILE VIEW (2-STEP FLOW AS IN REFERENCE)                                 */}
        {/* ========================================================================= */}
        <div className="login-mobile-only" style={{
          display: 'none',
          width: '100%',
          minHeight: '100vh',
          background: '#0A080E',
          flexDirection: 'column',
          position: 'relative',
        }}>
          {mobileStep === 'welcome' ? (
            /* MOBILE STEP 1: WELCOME SCREEN */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
              position: 'relative',
              justifyContent: 'space-between',
            }}>
              {/* Background Debutante Image */}
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
                  background: 'linear-gradient(180deg, rgba(10,8,14,0.4) 0%, rgba(10,8,14,0.2) 40%, rgba(10,8,14,0.95) 100%)',
                }} />

                {/* Top Logo */}
                <div style={{ padding: '24px', position: 'relative', zIndex: 2 }}>
                  <img
                    src="/logo_horizontal.png"
                    alt="Bonomo Festas"
                    style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
                  />
                </div>

                {/* Catchy Title */}
                <div style={{ position: 'absolute', bottom: '40px', left: '24px', right: '24px', zIndex: 2 }}>
                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: '1.25',
                    margin: 0,
                  }}>
                    Transformando sonhos em experiências inesquecíveis.
                  </h2>
                </div>
              </div>

              {/* Bottom Card */}
              <div style={{
                marginTop: 'auto',
                background: '#120F17',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderBottom: 'none',
                padding: '32px 24px',
                zIndex: 3,
                boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
              }}>
                <p style={{ fontSize: '0.84rem', color: '#9E988D', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                  Acesse o painel de gestão corporativa e CRM da Bonomo Festas.
                </p>

                <button
                  type="button"
                  onClick={() => setMobileStep('form')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                    color: '#000',
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
                  }}
                >
                  <span>Entrar / Sign In</span>
                  <ArrowRight size={17} />
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#D4AF37',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Acesso Rápido Dev Master (1 Clique)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MOBILE STEP 2: LOGIN FORM (CENTERED WITH HORIZONTAL LOGO) */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
              padding: '24px 20px',
              boxSizing: 'border-box',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}>
              {/* Top Navigation Bar with Back Button and Horizontal Logo */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
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
                  src="/logo_horizontal.png"
                  alt="Bonomo Festas"
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
              <div style={{ width: '100%', maxWidth: '380px', marginTop: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#FFF', margin: '0 0 6px 0' }}>
                    Welcome Back!
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#9E988D', margin: 0 }}>
                    Continue sua jornada no painel de gestão.
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
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      E-mail Corporativo
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@bonomofestas.com.br"
                        style={{
                          width: '100%',
                          background: '#120F16',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '12px',
                          padding: '12px 14px 12px 38px',
                          color: '#FFF',
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Senha
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#9E988D',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          background: '#120F16',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '12px',
                          padding: '12px 14px 12px 38px',
                          color: '#FFF',
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                      color: '#000',
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
                      marginTop: '6px',
                    }}
                  >
                    <span>{loading ? 'Entrando...' : 'Entrar no Painel'}</span>
                    <ArrowRight size={16} />
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    style={{
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      color: '#E8C98D',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Acesso Rápido Dev Master (1 Clique)
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#6B665E', paddingTop: '16px' }}>
                Bonomo Festas • Versão {APP_VERSION}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP SPLIT VIEW (CENTERED FORM ON LEFT, PHOTO ON RIGHT)                */}
        {/* ========================================================================= */}
        <div className="login-desktop-form-pane" style={{
          flex: '1 1 480px',
          maxWidth: '540px',
          background: '#0B090E',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 40px',
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(212, 175, 55, 0.15)',
          zIndex: 2,
          position: 'relative',
        }}>
          {/* Centered Inner Container */}
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {/* Top Horizontal Logo */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <img
                src="/logo_horizontal.png"
                alt="Bonomo Festas"
                style={{
                  width: '100%',
                  maxWidth: '220px',
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
                fontWeight: 700,
                color: '#FFFFFF',
                margin: '0 0 6px 0',
              }}>
                Acesso ao Sistema
              </h2>
              <p style={{
                fontSize: '0.82rem',
                color: '#9E988D',
                margin: 0,
                lineHeight: '1.5',
              }}>
                Informe suas credenciais para gerenciar o ecossistema de eventos.
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
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  color: '#D4AF37',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}>
                  E-mail Corporativo
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@bonomofestas.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#120F16',
                      border: '1px solid rgba(212, 175, 55, 0.28)',
                      borderRadius: '10px',
                      padding: '12px 14px 12px 42px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.28)'; }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{
                    fontSize: '0.72rem',
                    color: '#D4AF37',
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
                      color: '#9E988D',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Esqueceu sua senha?
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#120F16',
                      border: '1px solid rgba(212, 175, 55, 0.28)',
                      borderRadius: '10px',
                      padding: '12px 14px 12px 42px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.28)'; }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000',
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
                  transition: 'opacity 0.2s ease',
                }}
              >
                <span>{loading ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Fast 1-Click Demo Login */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                style={{
                  width: '100%',
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  color: '#E8C98D',
                  borderRadius: '30px',
                  padding: '9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={13} color="#D4AF37" />
                <span>Acesso Rápido Dev Master (1 Clique)</span>
              </button>

              {onBackToApp && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={onBackToApp}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#9E988D',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ArrowLeft size={11} />
                    <span>Voltar para a Visão da Debutante</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer Security Notice & Version */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: '#6B665E',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              marginTop: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} color="#D4AF37" />
                <span>Ambiente Seguro</span>
              </div>
              <div>Versão {APP_VERSION}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LUXURY DEBUTANTE STAIRCASE PHOTO */}
        <div className="login-desktop-visual-pane" style={{
          flex: '1 1 500px',
          position: 'relative',
          background: '#0A080E',
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
            filter: 'brightness(0.82) contrast(1.1)',
          }} />

          {/* Ambient Dark Gradient Overlays */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(8,6,11,0.3) 0%, rgba(8,6,11,0.15) 40%, rgba(8,6,11,0.92) 100%)',
          }} />

          {/* Text Overlay Content */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '540px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '0.7rem',
              color: '#F3E5AB',
              fontWeight: 700,
              letterSpacing: '1px',
              marginBottom: '14px',
            }}>
              <span>ALTA GASTRONOMIA & EVENTOS DE GALA</span>
            </div>

            <h2 style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: '1.25',
              margin: '0 0 10px 0',
              textShadow: '0 3px 18px rgba(0,0,0,0.8)',
            }}>
              Transformando sonhos de 15 anos em momentos inesquecíveis.
            </h2>

            <p style={{
              fontSize: '0.9rem',
              color: '#D1CBBF',
              lineHeight: '1.6',
              margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}>
              Gestão integrada de espaços, captação automatizada de indicações e experiência exclusiva para debutantes e famílias.
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
