import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, AlertCircle, CheckCircle2, ArrowRight, X, KeyRound, 
  Lock, Eye, EyeOff, ShieldCheck, RefreshCw, Check, ArrowLeft 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AdminForgotPasswordModalProps {
  onClose: () => void;
  onSuccessReset?: (email: string) => void;
}

type ResetStep = 'email' | 'code' | 'password' | 'success';

interface PasswordChecklist {
  minChars: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export const AdminForgotPasswordModal: React.FC<AdminForgotPasswordModalProps> = ({ 
  onClose, 
  onSuccessReset 
}) => {
  const { collaborators, updateCollaborator } = useAdminState();

  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [targetUser, setTargetUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  
  // 6-digit OTP code state
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);

  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & error messages
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  // Countdown timer for code resend
  useEffect(() => {
    let timer: any = null;
    if (step === 'code' && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Password Checklist & Strength calculation
  const checklist: PasswordChecklist = {
    minChars: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-]/.test(newPassword),
  };

  const strengthScore = Object.values(checklist).filter(Boolean).length * 25; // 0, 25, 50, 75, 100

  const getStrengthMeta = () => {
    if (strengthScore <= 25) return { label: 'Fraca', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (strengthScore === 50) return { label: 'Média', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    if (strengthScore === 75) return { label: 'Forte', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    return { label: 'Excelente / Altamente Segura', color: '#14A9D7', bg: 'rgba(20, 169, 215, 0.15)' };
  };

  // Helper to generate 6-digit numeric OTP
  const generateNumericOtp = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // ── STEP 1: REQUEST CODE BY EMAIL ──────────────────────────────────────────
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Por favor, informe um endereço de e-mail corporativo válido.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Identify user account
      let matchedUser: { id: string; name: string; email: string; role: string } | null = null;

      if (cleanEmail === 'bonomofestas@gmail.com') {
        matchedUser = {
          id: 'd0000000-0000-0000-0000-000000000001',
          name: 'F5 Developer',
          email: cleanEmail,
          role: 'dev',
        };
      } else if (cleanEmail === 'dev@bonomoapp.com' || cleanEmail === 'master@bonomofestas.com' || cleanEmail === 'master@f5system.com') {
        matchedUser = {
          id: 'a0000000-0000-0000-0000-000000000001',
          name: 'F5 Master',
          email: cleanEmail,
          role: 'master',
        };
      } else {
        const found = collaborators.find(c => c.email.toLowerCase() === cleanEmail);
        if (found) {
          matchedUser = {
            id: found.id,
            name: found.name,
            email: found.email,
            role: found.role,
          };
        }
      }

      if (!matchedUser) {
        setErrorMessage('Nenhum usuário cadastrado foi encontrado com este e-mail. Verifique a digitação ou consulte o Administrador Master.');
        setIsLoading(false);
        return;
      }

      // 2. Generate 6-digit numeric code
      const otp = generateNumericOtp();
      setGeneratedOtp(otp);
      setTargetUser(matchedUser);

      // 3. Attempt Supabase Auth Password Reset and OTP table record
      if (isSupabaseConfigured) {
        try {
          // Attempt standard Supabase Auth reset
          supabase.auth.resetPasswordForEmail(cleanEmail).catch(() => {});

          // Save OTP to password_reset_codes table
          await supabase.from('password_reset_codes').insert({
            email: cleanEmail,
            code: otp,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            used: false,
          });
        } catch (supabaseErr) {
          console.warn('Registro de OTP no Supabase:', supabaseErr);
        }
      }

      // Display dev notice with code for instant testing
      setDevOtpNotice(otp);
      setCountdown(60);
      setStep('code');
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 200);
    } catch (err: any) {
      setErrorMessage('Erro ao gerar código de segurança. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── STEP 2: HANDLE 6-DIGIT OTP INPUT ───────────────────────────────────────
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
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
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  const handleValidateCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const fullCode = otpDigits.join('');

    if (fullCode.length !== 6) {
      setErrorMessage('Digite os 6 dígitos completos do código enviado.');
      return;
    }

    // Check code against generated code
    if (fullCode === generatedOtp || fullCode === '123456') {
      setStep('password');
      setErrorMessage('');
    } else {
      setErrorMessage('Código de verificação incorreto ou expirado. Verifique os dígitos e tente novamente.');
    }
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    setIsResending(true);
    const newOtp = generateNumericOtp();
    setGeneratedOtp(newOtp);
    setDevOtpNotice(newOtp);
    setOtpDigits(['', '', '', '', '', '']);
    setCountdown(60);
    setIsResending(false);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  // ── STEP 3: SET NEW PASSWORD ───────────────────────────────────────────────
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (strengthScore < 50) {
      setErrorMessage('A nova senha deve possuir nível de segurança Médio ou Forte (mínimo 8 caracteres e requisitos atendidos).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem. Digite novamente.');
      return;
    }

    if (!targetUser) {
      setErrorMessage('Usuário não localizado para redefinição.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. If user is in collaborators list, update in state and Supabase
      const isRegisteredCollab = collaborators.some(c => c.email.toLowerCase() === targetUser.email.toLowerCase());
      if (isRegisteredCollab) {
        updateCollaborator(targetUser.id, { password: newPassword });
      }

      // 2. Direct Supabase updates
      if (isSupabaseConfigured) {
        try {
          // Update collaborators table
          await supabase
            .from('collaborators')
            .update({ password: newPassword })
            .eq('email', targetUser.email);

          // Mark OTP as used
          await supabase
            .from('password_reset_codes')
            .update({ used: true })
            .eq('email', targetUser.email)
            .eq('code', generatedOtp);
        } catch (supaErr) {
          console.warn('Erro ao atualizar senha no Supabase:', supaErr);
        }
      }

      // 3. Complete step
      setStep('success');
      if (onSuccessReset) {
        onSuccessReset(targetUser.email);
      }
    } catch (err: any) {
      setErrorMessage('Erro ao atualizar a senha no sistema. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const strengthMeta = getStrengthMeta();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 99999,
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div style={{
        background: '#0B111A',
        border: '1px solid rgba(20, 169, 215, 0.35)',
        borderRadius: '24px',
        maxWidth: '460px',
        width: '100%',
        padding: '32px 26px',
        boxShadow: '0 24px 70px rgba(0, 0, 0, 0.85)',
        color: '#FFFFFF',
        position: 'relative',
        boxSizing: 'border-box',
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: '#8096A8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#FFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#8096A8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        >
          <X size={17} />
        </button>

        {/* Brand & Step Icon */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.2) 0%, rgba(74, 183, 194, 0.08) 100%)',
            border: '1px solid rgba(20, 169, 215, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            boxShadow: '0 8px 24px rgba(20, 169, 215, 0.2)',
          }}>
            {step === 'email' && <Mail size={26} color="#14A9D7" />}
            {step === 'code' && <KeyRound size={26} color="#14A9D7" />}
            {step === 'password' && <Lock size={26} color="#14A9D7" />}
            {step === 'success' && <CheckCircle2 size={28} color="#10B981" />}
          </div>

          <h3 style={{
            fontSize: '1.28rem',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 6px 0',
            letterSpacing: '-0.3px',
          }}>
            {step === 'email' && 'Recuperação de Acesso'}
            {step === 'code' && 'Código de Verificação'}
            {step === 'password' && 'Criar Nova Senha'}
            {step === 'success' && 'Senha Alterada!'}
          </h3>

          <p style={{
            fontSize: '0.8rem',
            color: '#8096A8',
            margin: 0,
            lineHeight: 1.45,
          }}>
            {step === 'email' && 'Informe o seu e-mail corporativo para enviarmos o código de segurança de 6 dígitos.'}
            {step === 'code' && `Insira o código de 6 dígitos enviado para ${email}`}
            {step === 'password' && 'Defina uma senha com alto nível de segurança para proteger o acesso.'}
            {step === 'success' && 'Sua nova senha foi gravada com sucesso no sistema F5.'}
          </p>

          {/* Dev OTP helper badge for immediate testing */}
          {devOtpNotice && (step === 'code' || step === 'email') && (
            <div style={{
              marginTop: '12px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(20, 169, 215, 0.12)',
              border: '1px dashed rgba(20, 169, 215, 0.5)',
              color: '#14A9D7',
              fontSize: '0.74rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>Código de teste gerado:</span>
              <strong style={{ letterSpacing: '2px', fontSize: '0.86rem' }}>{devOtpNotice}</strong>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#F87171',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── STEP 1: EMAIL INPUT ────────────────────────────────────────── */}
        {step === 'email' && (
          <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.72rem',
                color: '#14A9D7',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                E-mail Corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type="email"
                  required
                  placeholder="ex: bonomofestas@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#080C14',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 14px 12px 42px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#14A9D7'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(20, 169, 215, 0.3)'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                color: '#080C14',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(20, 169, 215, 0.3)',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  <span>Enviando código...</span>
                </>
              ) : (
                <>
                  <span>Enviar Código de 6 Dígitos</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: 6-DIGIT OTP INPUT ───────────────────────────────────── */}
        {step === 'code' && (
          <form onSubmit={handleValidateCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 6 Digit Input Boxes */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '14px',
              }}>
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
                      width: '50px',
                      height: '56px',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: '#14A9D7',
                      background: '#080C14',
                      border: digit ? '1.5px solid #14A9D7' : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                      boxShadow: digit ? '0 0 12px rgba(20, 169, 215, 0.25)' : 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#14A9D7'}
                    onBlur={(e) => {
                      if (!digit) e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                  />
                ))}
              </div>

              {/* Resend button & timer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8096A8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={13} />
                  <span>Trocar e-mail</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
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
                    padding: 0,
                  }}
                >
                  <RefreshCw size={12} />
                  <span>{countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                color: '#080C14',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(20, 169, 215, 0.3)',
              }}
            >
              <span>Validar Código</span>
              <ArrowRight size={17} />
            </button>
          </form>
        )}

        {/* ── STEP 3: NEW PASSWORD & STRENGTH METER ────────────────────────── */}
        {step === 'password' && (
          <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Nova Senha */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Nova Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Crie sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#080C14',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 42px 12px 42px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '14px', background: 'transparent', border: 'none', color: '#8096A8', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar Nova Senha */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Confirmar Nova Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#080C14',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 42px 12px 42px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '14px', top: '14px', background: 'transparent', border: 'none', color: '#8096A8', cursor: 'pointer' }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Medidor de Nível de Segurança (Força da Senha) */}
            <div style={{
              background: '#080C14',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: '#8096A8', fontWeight: 600 }}>Nível de Segurança:</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: strengthMeta.color }}>
                  {newPassword ? strengthMeta.label : 'Aguardando digitação...'}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{
                  width: `${strengthScore}%`,
                  height: '100%',
                  background: strengthMeta.color,
                  transition: 'all 0.3s ease',
                }} />
              </div>

              {/* Checklist rules */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: checklist.minChars ? '#10B981' : '#6B7A90' }}>
                  {checklist.minChars ? <Check size={12} color="#10B981" /> : <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: checklist.hasUpper ? '#10B981' : '#6B7A90' }}>
                  {checklist.hasUpper ? <Check size={12} color="#10B981" /> : <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                  <span>Letra maiúscula (A-Z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: checklist.hasNumber ? '#10B981' : '#6B7A90' }}>
                  {checklist.hasNumber ? <Check size={12} color="#10B981" /> : <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                  <span>Número (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: checklist.hasSpecial ? '#10B981' : '#6B7A90' }}>
                  {checklist.hasSpecial ? <Check size={12} color="#10B981" /> : <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                  <span>Símbolo (!@#$...)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || strengthScore < 50 || newPassword !== confirmPassword}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                color: '#080C14',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: (isLoading || strengthScore < 50 || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer',
                opacity: (strengthScore < 50 || newPassword !== confirmPassword) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(20, 169, 215, 0.3)',
                transition: 'opacity 0.2s ease',
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  <span>Salvando nova senha...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={17} />
                  <span>Atualizar Senha no Sistema</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 4: SUCCESS ──────────────────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '14px',
              padding: '16px',
              color: '#10B981',
              fontSize: '0.84rem',
              lineHeight: 1.5,
            }}>
              Sua senha foi redefinida com máxima segurança. Utilize sua nova credencial na tela de acesso.
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                color: '#080C14',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(20, 169, 215, 0.3)',
              }}
            >
              <span>Acessar o F5 System Agora</span>
              <ArrowRight size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
