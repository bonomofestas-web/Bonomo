import React, { useState } from 'react';
import { Crown, Lock, Mail, ArrowRight, Sparkles, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
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
      // Dev Master account bypass
      if ((cleanEmail === 'dev@bonomoapp.com' || cleanEmail === 'dev@bonomofestas.com') && (password === '123456' || password === '••••••••')) {
        login(cleanEmail, '123456');
        if (onSuccessLogin) onSuccessLogin();
        return;
      }

      if (isSupabaseConfigured) {
        // Attempt live Supabase Auth login
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (authError) {
          const localSuccess = login(cleanEmail, password);
          if (!localSuccess) {
            throw new Error(authError.message || 'Credenciais inválidas ou acesso inativo.');
          }
        } else if (data.user) {
          login(cleanEmail, password);
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

  const handleQuickDemoLogin = () => {
    login('dev@bonomoapp.com', '123456');
    if (onSuccessLogin) onSuccessLogin();
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#08060B',
      color: '#FFFFFF',
      display: 'flex',
      fontFamily: "'Montserrat', sans-serif",
      overflowX: 'hidden',
      position: 'relative',
    }}>
      {/* ── DESKTOP & MOBILE SPLIT CONTAINER ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
      }}>
        {/* LEFT COLUMN: AUTH FORM (Full width on mobile, 45% on desktop) */}
        <div style={{
          flex: '1 1 500px',
          maxWidth: '560px',
          background: 'linear-gradient(180deg, #100D15 0%, #08060A 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 36px',
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(212, 175, 55, 0.15)',
          zIndex: 2,
          position: 'relative',
        }}>
          {/* Top Brand Area */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(212, 175, 55, 0.35)',
              }}>
                <Crown size={26} color="#000" />
              </div>

              <div>
                <h1 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#FFF',
                  margin: 0,
                  letterSpacing: '0.5px',
                }}>
                  Bonomo Festas
                </h1>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.68rem',
                  color: '#D4AF37',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}>
                  Painel de Gestão & CRM
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.85rem',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: '0 0 6px 0',
              }}>
                Acesso ao Sistema
              </h2>
              <p style={{
                fontSize: '0.84rem',
                color: '#9E988D',
                margin: 0,
                lineHeight: '1.5',
              }}>
                Informe suas credenciais corporativas para gerenciar casas, leads e debutantes.
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#F87171',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '0.82rem',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* E-mail Input */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  color: '#D4AF37',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '8px',
                  fontFamily: "'Cinzel', serif",
                }}>
                  E-mail Corporativo
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@bonomofestas.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#141118',
                      border: '1.5px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '12px',
                      padding: '13px 14px 13px 44px',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#D4AF37';
                      e.currentTarget.style.boxShadow = '0 0 12px rgba(212, 175, 55, 0.25)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Senha Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{
                    fontSize: '0.72rem',
                    color: '#D4AF37',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontFamily: "'Cinzel', serif",
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
                  <Lock size={17} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#141118',
                      border: '1.5px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '12px',
                      padding: '13px 14px 13px 44px',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#D4AF37';
                      e.currentTarget.style.boxShadow = '0 0 12px rgba(212, 175, 55, 0.25)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '35px',
                  padding: '14px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: "'Cinzel', serif",
                  boxShadow: '0 8px 24px rgba(212, 175, 55, 0.35)',
                  marginTop: '10px',
                  opacity: loading ? 0.7 : 1,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <span>{loading ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}</span>
                <ArrowRight size={17} />
              </button>
            </form>

            {/* Fast 1-Click Demo Login */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                style={{
                  width: '100%',
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  color: '#E8C98D',
                  borderRadius: '30px',
                  padding: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} color="#D4AF37" />
                <span>Acesso Rápido Dev Master (1 Clique)</span>
              </button>

              {onBackToApp && (
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={onBackToApp}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#9E988D',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ArrowLeft size={12} />
                    <span>Voltar para a Visão da Debutante</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Security Notice & Version */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: '#6B665E',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            marginTop: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#D4AF37" />
              <span>Ambiente Protegido & Criptografado</span>
            </div>

            <div>{APP_VERSION}</div>
          </div>
        </div>

        {/* RIGHT COLUMN: LUXURY IMMERSIVE VISUAL (Hidden on small mobile, visible on tablet/desktop) */}
        <div style={{
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
            backgroundImage: `url('https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&auto=format&fit=crop&q=85')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 25%',
            filter: 'brightness(0.72) contrast(1.15)',
          }} />

          {/* Ambient Dark Gradient Overlays */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(8,6,11,0.4) 0%, rgba(8,6,11,0.2) 40%, rgba(8,6,11,0.92) 100%)',
          }} />

          {/* Golden Ambient Radial Spotlight */}
          <div style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
          }} />

          {/* Text Overlay Content */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '520px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.72rem',
              color: '#F3E5AB',
              fontWeight: 700,
              fontFamily: "'Cinzel', serif",
              letterSpacing: '1.5px',
              marginBottom: '16px',
            }}>
              <Crown size={13} color="#D4AF37" />
              <span>ALTA GASTRONOMIA & EVENTOS DE GALA</span>
            </div>

            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: '1.25',
              margin: '0 0 12px 0',
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            }}>
              Transformando sonhos de 15 anos em momentos inesquecíveis.
            </h2>

            <p style={{
              fontSize: '0.95rem',
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
    </div>
  );
};
