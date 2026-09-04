import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft, 
  KeyRound, RefreshCw, Eye, EyeOff, Check, Sparkles 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminForgotPasswordModal } from './AdminForgotPasswordModal';
import { APP_VERSION } from '../../types/admin';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AdminLoginViewProps {
  onSuccessLogin?: () => void;
}

type AuthMode = 'login' | 'first_access_email' | 'first_access_code';

interface PasswordChecklist {
  minChars: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onSuccessLogin,
}) => {
  const { login, collaborators, updateCollaborator } = useAdminState();

  // Auth Mode: login | first_access_email | first_access_code
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Standard Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Mobile 2-step navigation state ('welcome' | 'form')
  const [mobileStep, setMobileStep] = useState<'welcome' | 'form'>('welcome');

  // First Access Flow State
  const [activationEmail, setActivationEmail] = useState('');
  const [matchedCollab, setMatchedCollab] = useState<any>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isTokenFromUrl, setIsTokenFromUrl] = useState<boolean>(false);
  const [isDirectRecoverySession, setIsDirectRecoverySession] = useState<boolean>(false);
  const [isResetMode, setIsResetMode] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password Setup State in First Access
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: any = null;
    if (authMode === 'first_access_code' && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [authMode, countdown]);

  // Detecção de link direto de ativação e recuperação Supabase Auth
  useEffect(() => {
    // 1. Escuta evento PASSWORD_RECOVERY do Supabase Auth
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsDirectRecoverySession(true);
        setAuthMode('first_access_code');
        if (session?.user?.email) {
          const clean = session.user.email.toLowerCase().trim();
          setActivationEmail(clean);
          const found = collaborators.find(c => c.email.toLowerCase() === clean);
          if (found) {
            setMatchedCollab(found);
            setIsResetMode(!found.isFirstAccess);
          }
        }
      }
    });

    // 2. Checagem de parâmetros de URL e Hash (Supabase Auth Implicit / PKCE)
    try {
      const hash = window.location.hash;
      const search = window.location.search;
      const urlParams = new URLSearchParams(search);
      const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('type=invite') || search.includes('type=invite');

      if (isRecovery) {
        setIsDirectRecoverySession(true);
        setAuthMode('first_access_code');
        supabase.auth.getUser().then(({ data: userData }) => {
          if (userData?.user?.email) {
            const clean = userData.user.email.toLowerCase().trim();
            setActivationEmail(clean);
            const found = collaborators.find(c => c.email.toLowerCase() === clean);
            if (found) {
              setMatchedCollab(found);
              setIsResetMode(!found.isFirstAccess);
            }
          }
        });
      }

      const activateEmail = urlParams.get('activate');
      const token = urlParams.get('token');
      const mode = urlParams.get('mode');

      if (activateEmail) {
        const clean = decodeURIComponent(activateEmail).trim().toLowerCase();
        setActivationEmail(clean);
        setAuthMode('first_access_code');
        setIsResetMode(mode === 'reset');

        if (token && token.trim().length >= 6) {
          const cleanToken = token.trim().slice(0, 8);
          const digits = Array(8).fill('');
          cleanToken.split('').forEach((d, idx) => { if (idx < 8) digits[idx] = d; });
          setOtpDigits(digits);
          setGeneratedOtp(cleanToken);
          setIsTokenFromUrl(true);
        } else {
          setOtpDigits(['', '', '', '', '', '', '', '']);
          setIsTokenFromUrl(false);
        }

        const found = collaborators.find(c => c.email.toLowerCase() === clean);
        if (found) setMatchedCollab(found);
      }
    } catch {}

    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, [collaborators]);

  // Password strength checklist
  const checklist: PasswordChecklist = {
    minChars: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-]/.test(newPassword),
  };

  const strengthScore = Object.values(checklist).filter(Boolean).length * 25;

  const getStrengthMeta = () => {
    if (strengthScore <= 25) return { label: 'Fraca', color: '#EF4444' };
    if (strengthScore === 50) return { label: 'Média', color: '#F59E0B' };
    if (strengthScore === 75) return { label: 'Forte', color: '#10B981' };
    return { label: 'Excelente / Segura', color: '#14A9D7' };
  };

  // 1. Standard Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
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
      const success = await login(cleanEmail, cleanPassword);

      if (!success) {
        throw new Error('E-mail ou senha incorretos.');
      }

      if (onSuccessLogin) {
        onSuccessLogin();
      } else {
        window.location.href = window.location.origin + '/?admin=true';
      }
    } catch (err: any) {
      setError(err?.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  // 2. First Access Step 1: Request OTP by Email
  const handleRequestAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = activationEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Informe o seu e-mail de acesso.');
      return;
    }

    setLoading(true);

    try {
      // Find collaborator in system
      const found = collaborators.find(c => c.email.toLowerCase() === cleanEmail);

      if (!found) {
        setError('Seu e-mail não foi identificado na base. Converse com o seu administrador para fornecer um novo acesso ou criar suas credenciais de acesso.');
        setLoading(false);
        return;
      }

      setMatchedCollab(found);

      // Generate OTP
      const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
      setGeneratedOtp(otp);
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '', '', '']);

      // Record in Supabase password_reset_codes
      if (isSupabaseConfigured) {
        await supabase.from('password_reset_codes').insert({
          email: cleanEmail,
          code: otp,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          used: false,
        });

        // Dispara envio de e-mail pelo Supabase Auth
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          fetch('/api/invite-collaborator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              name: found.name,
              role: found.role,
              invitedByName: 'Administração Bonomo Festas',
              redirectTo: `${origin}/?admin=true&type=recovery`,
            })
          }).catch(err => console.warn('Erro ao chamar /api/invite-collaborator:', err));

          const { error: mailErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: `${window.location.origin}/?admin=true&activate=${encodeURIComponent(cleanEmail)}`
          });
          if (mailErr) {
            console.warn('[Supabase Auth resetPasswordForEmail]', mailErr.message);
          }
        } catch (supabaseMailErr) {
          console.warn('[Supabase Auth] resetPasswordForEmail erro ou limite de quota:', supabaseMailErr);
        }
      }

      // Transition to code & password setup
      setAuthMode('first_access_code');
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err) {
      setError('Erro ao validar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Digits Handlers
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < otpDigits.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (!pasted) return;

    const updated = Array(8).fill('');
    for (let i = 0; i < Math.min(pasted.length, 8); i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);
    const nextIdx = Math.min(pasted.length, 7);
    inputRefs.current[nextIdx]?.focus();
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    const cleanEmail = activationEmail.trim().toLowerCase();
    const newOtp = Math.floor(10000000 + Math.random() * 90000000).toString();
    setGeneratedOtp(newOtp);
    setOtpDigits(['', '', '', '', '', '', '', '']);
    setCountdown(60);

    if (isSupabaseConfigured && cleanEmail) {
      await supabase.from('password_reset_codes').insert({
        email: cleanEmail,
        code: newOtp,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        used: false,
      });

      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/?admin=true&activate=${encodeURIComponent(cleanEmail)}`
        }).catch(() => {});
      } catch {}
    }

    setIsResending(false);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  // 3. First Access Step 2: Iniciar Acesso (Validate OTP, Save Password & Enter App)
  const handleInitiateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isLinkVerified = isDirectRecoverySession || isTokenFromUrl;

    if (!isLinkVerified) {
      const fullCode = otpDigits.join('');
      if (fullCode.length !== 6 && fullCode.length !== 8) {
        setError('Por favor, preencha o código completo de verificação recebido no seu e-mail (6 ou 8 dígitos).');
        return;
      }

      let isCodeValid = fullCode === generatedOtp;

      if (!isCodeValid && isSupabaseConfigured) {
        const cleanEmail = activationEmail.trim().toLowerCase();
        try {
          const { data: dbCodes } = await supabase
            .from('password_reset_codes')
            .select('id')
            .eq('email', cleanEmail)
            .eq('code', fullCode)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .limit(1);

          if (dbCodes && dbCodes.length > 0) {
            isCodeValid = true;
            await supabase.from('password_reset_codes').update({ used: true }).eq('id', dbCodes[0].id);
          } else {
            // Tenta validar token nativo do Supabase Auth
            const { data: verifyData } = await supabase.auth.verifyOtp({
              email: cleanEmail,
              token: fullCode,
              type: 'recovery',
            });
            if (verifyData?.session) {
              isCodeValid = true;
            }
          }
        } catch {}
      }

      if (!isCodeValid) {
        setError('Código de acesso incorreto ou expirado. Verifique os 6 dígitos recebidos no seu e-mail corporativo ou solicite um novo reenvio.');
        return;
      }
    }

    if (strengthScore < 50) {
      setError('A nova senha deve ter no mínimo nível de segurança Médio (mínimo 8 caracteres e requisitos atendidos).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem. Verifique e tente novamente.');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = activationEmail.trim().toLowerCase();
      const target = matchedCollab || collaborators.find(c => c.email.toLowerCase() === cleanEmail);

      const nowIso = new Date().toISOString();

      // 1. Se estiver sob sessão de recuperação do Supabase Auth, atualiza a senha na nuvem
      if (isDirectRecoverySession && isSupabaseConfigured) {
        try {
          const { error: authUpdateErr } = await supabase.auth.updateUser({ password: newPassword });
          if (authUpdateErr) {
            console.warn('[Supabase Auth updateUser]:', authUpdateErr.message);
          }
        } catch (authErr) {
          console.warn('[Supabase Auth updateUser erro]:', authErr);
        }
      }

      // 2. Atualiza colaborador no banco de dados e localmente
      const shouldKeepFirstAccess = target ? target.isFirstAccess : !isResetMode;

      if (target) {
        updateCollaborator(target.id, {
          password: newPassword,
          isFirstAccess: shouldKeepFirstAccess,
          activatedAt: nowIso,
        });
      }

      if (isSupabaseConfigured) {
        await supabase
          .from('collaborators')
          .update({
            password: newPassword,
            is_first_access: shouldKeepFirstAccess,
            activated_at: nowIso,
          })
          .eq('email', cleanEmail);
      }

      // Limpa os fragmentos de hash da URL
      try {
        window.history.replaceState(null, '', window.location.pathname + '?admin=true');
      } catch {}

      // 3. Log in with new credentials!
      const loginSuccess = await login(cleanEmail, newPassword);

      if (!loginSuccess) {
        throw new Error('Falha ao autenticar com as novas credenciais. Tente novamente.');
      }

      if (onSuccessLogin) {
        onSuccessLogin();
      } else {
        window.location.href = window.location.origin + '/?admin=true';
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao iniciar acesso. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const strengthMeta = getStrengthMeta();

  // ── FORM RENDERER (SHARED BETWEEN DESKTOP AND MOBILE) ───────────────────────
  const renderAuthForm = () => {
    if (authMode === 'login') {
      return (
        <div>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0' }}>
              Acesso ao Sistema
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#8096A8', margin: 0, lineHeight: '1.5' }}>
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

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
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
                    fontFamily: "'Poppins', sans-serif",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                color: '#080C14',
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
                boxShadow: '0 4px 18px rgba(20, 169, 215, 0.4)',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <span>{loading ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}</span>
              <ArrowRight size={16} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setActivationEmail(email);
                  setAuthMode('first_access_email');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#14A9D7',
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(20, 169, 215, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Sparkles size={13} />
                <span>Primeiro acesso? Ative sua conta aqui</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (authMode === 'first_access_email') {
      return (
        <div>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(20, 169, 215, 0.12)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.68rem',
              color: '#14A9D7',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '10px',
            }}>
              <Sparkles size={13} />
              <span>F5 System • Primeiro Acesso</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0' }}>
              Ativação de Conta
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8096A8', margin: 0, lineHeight: '1.5' }}>
              Informe o seu e-mail corporativo para receber o código de segurança.
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#F87171',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.78rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.45,
            }}>
              <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRequestAccessCode} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Informe o seu e-mail de acesso *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                <input
                  type="email"
                  required
                  placeholder="seu.email@empresa.com"
                  value={activationEmail}
                  onChange={(e) => setActivationEmail(e.target.value)}
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
                color: '#080C14',
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
                boxShadow: '0 4px 18px rgba(20, 169, 215, 0.4)',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <span>{loading ? 'VERIFICANDO BASE...' : 'Solicitar código de acesso'}</span>
              <ArrowRight size={16} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthMode('login');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8096A8',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 8px',
                }}
              >
                <ArrowLeft size={13} />
                <span>Já tem uma senha? Voltar ao Login</span>
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (authMode === 'first_access_code') {
      return (
        <div>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(20, 169, 215, 0.12)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.68rem',
              color: '#14A9D7',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '8px',
            }}>
              <KeyRound size={13} />
              <span>Código Enviado</span>
            </div>

            <h2 style={{ fontSize: '1.38rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0' }}>
              {isResetMode ? 'Redefinir Senha de Acesso' : 'Ativar Conta & Criar Senha'}
            </h2>

            {(isDirectRecoverySession || isTokenFromUrl) ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#10B981',
                fontSize: '0.8rem',
                marginTop: '10px',
                lineHeight: 1.45,
                textAlign: 'left',
              }}>
                <strong style={{ display: 'block', marginBottom: '3px', fontSize: '0.86rem' }}>✅ Link de convite autenticado!</strong>
                <span>
                  Olá{matchedCollab?.name ? `, ${matchedCollab.name}` : ''}! Crie sua senha de acesso abaixo para ativar sua conta no F5 System (<strong>{activationEmail}</strong>).
                </span>
              </div>
            ) : (
              <div style={{
                fontSize: '0.78rem',
                color: '#8096A8',
                lineHeight: 1.4,
                background: 'rgba(255,255,255,0.03)',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginTop: '8px',
              }}>
                <div>Enviamos o código de segurança para:</div>
                <strong style={{ color: '#14A9D7', display: 'block', margin: '3px 0' }}>{activationEmail}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAuthMode('first_access_email');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8096A8',
                    fontSize: '0.7rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Alterar e-mail informado
                </button>
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#F87171',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.78rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4,
            }}>
              <AlertCircle size={15} color="#F87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleInitiateAccess} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* OTP boxes (6 ou 8 dígitos, apenas se não veio pré-validado por link) */}
            {!isDirectRecoverySession && !isTokenFromUrl && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', textAlign: 'center' }}>
                  Digite o Código de Verificação (6 ou 8 Dígitos) *
                </label>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      style={{
                        width: '36px',
                        height: '44px',
                        textAlign: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: '#14A9D7',
                        background: '#080C14',
                        border: digit ? '1.5px solid #14A9D7' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.72rem' }}>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || isResending}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: countdown > 0 ? '#4E5B6E' : '#14A9D7',
                      fontWeight: countdown > 0 ? 500 : 700,
                      cursor: countdown > 0 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={11} />
                    <span>{countdown > 0 ? `Reenviar código em ${countdown}s` : 'Reenviar código agora'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Password Creation */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Cadastrar Nova Senha *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#14A9D7" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Crie sua senha pessoal"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0F1724',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 38px 10px 38px',
                    color: '#FFF',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: '12px', top: '12px', background: 'transparent', border: 'none', color: '#8096A8', cursor: 'pointer' }}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Confirmar Senha *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#14A9D7" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0F1724',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 38px 10px 38px',
                    color: '#FFF',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '12px', top: '12px', background: 'transparent', border: 'none', color: '#8096A8', cursor: 'pointer' }}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Strength Meter */}
            <div style={{
              background: '#080C14',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.68rem', color: '#8096A8', fontWeight: 600 }}>Nível da Senha:</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: strengthMeta.color }}>
                  {newPassword ? strengthMeta.label : 'Aguardando digitação...'}
                </span>
              </div>

              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{
                  width: `${strengthScore}%`,
                  height: '100%',
                  background: strengthMeta.color,
                  transition: 'all 0.3s ease',
                }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.64rem', color: checklist.minChars ? '#10B981' : '#6B7A90' }}>
                  {checklist.minChars ? <Check size={11} color="#10B981" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.64rem', color: checklist.hasUpper ? '#10B981' : '#6B7A90' }}>
                  {checklist.hasUpper ? <Check size={11} color="#10B981" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                  <span>Letra maiúscula</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.64rem', color: checklist.hasNumber ? '#10B981' : '#6B7A90' }}>
                  {checklist.hasNumber ? <Check size={11} color="#10B981" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                  <span>Número (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.64rem', color: checklist.hasSpecial ? '#10B981' : '#6B7A90' }}>
                  {checklist.hasSpecial ? <Check size={11} color="#10B981" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                  <span>Símbolo (!@#$...)</span>
                </div>
              </div>
            </div>

            {/* Initiate Access Button */}
            <button
              type="submit"
              disabled={loading || (!isDirectRecoverySession && !isTokenFromUrl && (otpDigits.join('').length !== 6 && otpDigits.join('').length !== 8)) || strengthScore < 50 || newPassword !== confirmPassword}
              style={{
                background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                color: '#080C14',
                border: 'none',
                borderRadius: '30px',
                padding: '13px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: (loading || (!isDirectRecoverySession && !isTokenFromUrl && (otpDigits.join('').length !== 6 && otpDigits.join('').length !== 8)) || strengthScore < 50 || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer',
                opacity: ((!isDirectRecoverySession && !isTokenFromUrl && (otpDigits.join('').length !== 6 && otpDigits.join('').length !== 8)) || strengthScore < 50 || newPassword !== confirmPassword) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                boxShadow: '0 4px 18px rgba(20, 169, 215, 0.4)',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <span>
                {loading ? 'SALVANDO SENHA...' : (isDirectRecoverySession || isTokenFromUrl) ? 'Salvar Senha e Entrar' : 'Iniciar acesso'}
              </span>
              <ArrowRight size={16} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthMode('login');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8096A8',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                }}
              >
                <ArrowLeft size={12} />
                <span>Voltar ao Login</span>
              </button>
            </div>
          </form>
        </div>
      );
    }

    return null;
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
      <div style={{
        display: 'flex',
        width: '100vw',
        minHeight: '100vh',
      }}>
        {/* ========================================================================= */}
        {/* MOBILE ONLY VIEW                                                          */}
        {/* ========================================================================= */}
        <div className="login-mobile-only" style={{
          display: 'none',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100vh',
          background: '#080C14',
        }}>
          {mobileStep === 'welcome' ? (
            <div style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '32px 24px',
              boxSizing: 'border-box',
              minHeight: '100vh',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url('/debutante_staircase.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                filter: 'brightness(0.72)',
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(8,12,20,0.2) 0%, rgba(8,12,20,0.6) 50%, rgba(8,12,20,0.98) 100%)',
              }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ marginBottom: '20px' }}>
                  <img
                    src="/f5_logo.png"
                    alt="F5 System"
                    style={{ maxHeight: '42px', width: 'auto', objectFit: 'contain' }}
                  />
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(20, 169, 215, 0.2)',
                  border: '1px solid rgba(20, 169, 215, 0.45)',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '0.68rem',
                  color: '#4AB7C2',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  marginBottom: '12px',
                }}>
                  <span>GESTÃO DE EVENTOS DE ALTO PADRÃO</span>
                </div>

                <h1 style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  lineHeight: '1.25',
                  margin: '0 0 12px 0',
                  textShadow: '0 4px 16px rgba(0,0,0,0.8)',
                }}>
                  Transformando sonhos em experiências extraordinárias.
                </h1>

                <p style={{
                  fontSize: '0.85rem',
                  color: '#D3E0EA',
                  lineHeight: '1.55',
                  margin: '0 0 24px 0',
                }}>
                  Controle completo de unidades, qualificação de leads e atendimento inteligente.
                </p>

                <button
                  type="button"
                  onClick={() => setMobileStep('form')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                    color: '#080C14',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '15px',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 22px rgba(20, 169, 215, 0.5)',
                  }}
                >
                  <span>ACESSAR SISTEMA</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              boxSizing: 'border-box',
              minHeight: '100vh',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setMobileStep('welcome')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={16} />
                </button>

                <img
                  src="/f5_logo.png"
                  alt="F5 System"
                  style={{ maxHeight: '34px', width: 'auto', objectFit: 'contain' }}
                />

                <div style={{ width: '36px' }} />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {renderAuthForm()}
              </div>

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
          overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: '380px' }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
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

            {/* Inline Dynamic Form */}
            {renderAuthForm()}

            {/* Footer Notice */}
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

        {/* RIGHT COLUMN: LUXURY DEBUTANTE PHOTO */}
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
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('/debutante_staircase.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            filter: 'brightness(0.78) contrast(1.1)',
          }} />

          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(8,12,20,0.3) 0%, rgba(8,12,20,0.15) 40%, rgba(8,12,20,0.95) 100%)',
          }} />

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
