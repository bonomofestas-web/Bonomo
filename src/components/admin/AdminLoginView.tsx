import React, { useState } from 'react';
import { Crown, Lock, Mail, ArrowRight, Sparkles, ShieldCheck, AlertCircle, UserPlus, ArrowLeft } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminRegisterView } from './AdminRegisterView';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AdminLoginViewProps {
  onSuccessLogin?: () => void;
  onBackToApp?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onSuccessLogin,
  onBackToApp,
}) => {
  const { login } = useAdminState();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@bonomofestas.com.br');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authMode === 'register') {
    return (
      <AdminRegisterView
        onSuccessRegister={() => {
          if (onSuccessLogin) onSuccessLogin();
        }}
        onSwitchToLogin={() => setAuthMode('login')}
        onBackToApp={onBackToApp}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Por favor, informe o e-mail de acesso.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        // Attempt live Supabase Auth login
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password === '••••••••' ? 'admin123' : password,
        });

        if (authError) {
          // If auth error on Supabase, check local mock fallback
          const localSuccess = login(email, password);
          if (!localSuccess) {
            throw new Error(authError.message || 'Credenciais inválidas.');
          }
        } else if (data.user) {
          // Sync with local context
          login(email.trim(), password);
        }
      } else {
        // Local Context Login
        const success = login(email, password);
        if (!success) {
          throw new Error('Credenciais incorretas.');
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
    login('admin@bonomofestas.com.br', 'admin123');
    if (onSuccessLogin) onSuccessLogin();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.12) 0%, #08060B 60%)',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Montserrat', sans-serif",
      position: 'relative',
    }}>
      {/* Background Ambience Glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none',
      }} />

      {/* Top Brand Logo */}
      <div style={{
        textAlign: 'center',
        marginBottom: '28px',
        zIndex: 2,
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 8px 30px rgba(212, 175, 55, 0.4)',
        }}>
          <Crown size={32} color="#000" />
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.8rem',
          fontWeight: 800,
          color: '#FFF',
          margin: '0 0 6px 0',
          letterSpacing: '0.5px',
        }}>
          Bonomo Festas
        </h1>

        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.76rem',
          color: '#D4AF37',
          fontWeight: 800,
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          Painel de Gestão & Gerência
        </div>
      </div>

      {/* Login Card */}
      <div style={{
        background: 'linear-gradient(135deg, #141118 0%, #0D0A12 100%)',
        border: '1.5px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '24px',
        maxWidth: '440px',
        width: '100%',
        padding: '32px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 24px rgba(212, 175, 55, 0.12)',
        zIndex: 2,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#D4AF37" />
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#FFF',
              margin: 0,
              fontFamily: "'Cinzel', serif",
            }}>
              Acesso ao Sistema
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setAuthMode('register')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#D4AF37',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <UserPlus size={13} />
            <span>Criar Conta</span>
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#F87171',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
              E-mail Administrativo
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type="email"
                required
                placeholder="seu.email@bonomofestas.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  background: '#120F16',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 42px',
                  color: '#FFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
              Senha de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: '#120F16',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 42px',
                  color: '#FFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
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
              borderRadius: '40px',
              padding: '14px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "'Cinzel', serif",
              boxShadow: '0 6px 20px rgba(212, 175, 55, 0.35)',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <span>{loading ? 'ACESSANDO...' : 'ENTRAR NO PAINEL'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Register Account Action */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#D4AF37',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Não tem uma conta? Cadastre-se aqui
          </button>
        </div>

        {/* Demo Fast Access */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '18px',
          marginTop: '20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.74rem', color: '#9E988D', marginBottom: '10px' }}>
            Ambiente de Demonstração
          </div>

          <button
            type="button"
            onClick={handleQuickDemoLogin}
            style={{
              width: '100%',
              background: 'rgba(212, 175, 55, 0.12)',
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
            <span>Entrar com 1 Clique (Acesso Master Demo)</span>
          </button>

          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9E988D',
                fontSize: '0.74rem',
                cursor: 'pointer',
                marginTop: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ArrowLeft size={12} />
              <span>Voltar para a Visão da Debutante</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
