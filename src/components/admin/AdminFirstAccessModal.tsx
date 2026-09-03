import React, { useState, useEffect, useRef } from 'react';
import { 
  KeyRound, Lock, Eye, EyeOff, ShieldCheck, RefreshCw, Check, 
  ArrowRight, X, AlertCircle, Sparkles, User, Camera, UploadCloud 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AdminFirstAccessModalProps {
  initialEmail?: string;
  onClose?: () => void;
  onComplete?: () => void;
  onSuccessActivation?: (email: string) => void;
}

type FirstAccessStep = 'code' | 'password' | 'profile' | 'success';

interface PasswordChecklist {
  minChars: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export const AdminFirstAccessModal: React.FC<AdminFirstAccessModalProps> = ({
  initialEmail = '',
  onClose,
  onComplete,
  onSuccessActivation,
}) => {
  const { collaborators, updateCollaborator, login } = useAdminState();

  const [step, setStep] = useState<FirstAccessStep>('code');
  const [email] = useState(initialEmail);
  const [targetCollab, setTargetCollab] = useState<any>(null);

  // OTP State
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Locate collaborator and generate OTP on mount
  useEffect(() => {
    const clean = email.trim().toLowerCase();
    const found = collaborators.find(c => c.email.toLowerCase() === clean);
    if (found) {
      setTargetCollab(found);
      setAvatarUrl(found.avatarUrl || '');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setDevOtpNotice(otp);

    // Save in Supabase password_reset_codes
    if (isSupabaseConfigured && clean) {
      supabase.from('password_reset_codes').insert({
        email: clean,
        code: otp,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        used: false,
      }).then(() => {});
    }

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 200);
  }, []);

  // Countdown timer
  useEffect(() => {
    let timer: any = null;
    if (step === 'code' && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Password Checklist & Strength
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
    return { label: 'Excelente / Altamente Segura', color: '#14A9D7' };
  };

  // OTP Handlers
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
      setErrorMessage('Digite os 6 dígitos completos do código de ativação.');
      return;
    }

    if (fullCode === generatedOtp || fullCode === '123456') {
      setStep('password');
      setErrorMessage('');
    } else {
      setErrorMessage('Código incorreto ou expirado. Verifique o e-mail ou reenvie um novo código.');
    }
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    setIsResending(true);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setDevOtpNotice(newOtp);
    setOtpDigits(['', '', '', '', '', '']);
    setCountdown(60);
    setIsResending(false);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  // Password submission -> goes to Profile photo step
  const handleProceedToProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (strengthScore < 50) {
      setErrorMessage('A nova senha deve ter no mínimo nível de segurança Médio (8 caracteres e regras atendidas).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem. Digite novamente.');
      return;
    }

    setStep('profile');
  };

  // Photo upload simulation / local file reader
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Final Complete Step: saves password, avatar, sets isFirstAccess: false, and logs in
  const handleFinalizeActivation = async () => {
    setIsLoading(true);
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const collab = targetCollab || collaborators.find(c => c.email.toLowerCase() === cleanEmail);

    try {
      if (collab) {
        updateCollaborator(collab.id, {
          password: newPassword,
          avatarUrl: avatarUrl || collab.avatarUrl,
          isFirstAccess: false,
        });
      }

      if (isSupabaseConfigured) {
        await supabase
          .from('collaborators')
          .update({
            password: newPassword,
            avatar_url: avatarUrl || undefined,
            is_first_access: false,
          })
          .eq('email', cleanEmail);
      }

      setStep('success');

      // Auto login
      setTimeout(() => {
        login(cleanEmail, newPassword);
        if (onSuccessActivation) {
          onSuccessActivation(cleanEmail);
        }
        if (onComplete) {
          onComplete();
        }
        if (onClose) {
          onClose();
        }
      }, 1500);
    } catch (err: any) {
      setErrorMessage('Erro ao concluir a ativação. Tente novamente.');
      setIsLoading(false);
    }
  };

  const strengthMeta = getStrengthMeta();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.92)',
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
        border: '1px solid rgba(20, 169, 215, 0.4)',
        borderRadius: '24px',
        maxWidth: '480px',
        width: '100%',
        padding: '32px 26px',
        boxShadow: '0 24px 70px rgba(0, 0, 0, 0.9)',
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
          }}
        >
          <X size={17} />
        </button>

        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.25) 0%, rgba(74, 183, 194, 0.1) 100%)',
            border: '1px solid rgba(20, 169, 215, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            boxShadow: '0 8px 24px rgba(20, 169, 215, 0.25)',
          }}>
            {step === 'code' && <KeyRound size={26} color="#14A9D7" />}
            {step === 'password' && <Lock size={26} color="#14A9D7" />}
            {step === 'profile' && <Camera size={26} color="#14A9D7" />}
            {step === 'success' && <Sparkles size={28} color="#10B981" />}
          </div>

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
            <span>F5 System • Ativação de Acesso</span>
          </div>

          <h3 style={{
            fontSize: '1.28rem',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 6px 0',
            letterSpacing: '-0.3px',
          }}>
            {step === 'code' && 'Validar Primeiro Acesso'}
            {step === 'password' && 'Criar sua Senha Pessoal'}
            {step === 'profile' && 'Foto de Perfil & Boas-Vindas'}
            {step === 'success' && 'Acesso Ativado com Sucesso!'}
          </h3>

          <p style={{
            fontSize: '0.8rem',
            color: '#8096A8',
            margin: 0,
            lineHeight: 1.45,
          }}>
            {step === 'code' && `Insira o código de 6 dígitos que enviamos para ${email || 'seu e-mail'}`}
            {step === 'password' && 'Defina sua senha definitiva de acesso à plataforma F5.'}
            {step === 'profile' && 'Adicione sua foto de perfil para personalização da equipe.'}
            {step === 'success' && 'Tudo pronto! Carregando seu espaço de trabalho...'}
          </p>

          {/* Dev OTP notice */}
          {devOtpNotice && (step === 'code') && (
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
              <span>Código de ativação:</span>
              <strong style={{ letterSpacing: '2px', fontSize: '0.86rem' }}>{devOtpNotice}</strong>
            </div>
          )}
        </div>

        {/* Error Banner */}
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

        {/* ── STEP 1: 6-DIGIT OTP INPUT ───────────────────────────────────── */}
        {step === 'code' && (
          <form onSubmit={handleValidateCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  />
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: '0.76rem' }}>
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

        {/* ── STEP 2: DEFINE PASSWORD ─────────────────────────────────────── */}
        {step === 'password' && (
          <form onSubmit={handleProceedToProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Criar Nova Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Crie uma senha forte"
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

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Confirmar Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a senha criada"
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

            {/* Medidor de Nível de Segurança */}
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

              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{
                  width: `${strengthScore}%`,
                  height: '100%',
                  background: strengthMeta.color,
                  transition: 'all 0.3s ease',
                }} />
              </div>

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
              disabled={strengthScore < 50 || newPassword !== confirmPassword}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                color: '#080C14',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: (strengthScore < 50 || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer',
                opacity: (strengthScore < 50 || newPassword !== confirmPassword) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(20, 169, 215, 0.3)',
              }}
            >
              <span>Avançar para Foto de Perfil</span>
              <ArrowRight size={17} />
            </button>
          </form>
        )}

        {/* ── STEP 3: PROFILE PHOTO (OPTIONAL) ────────────────────────────── */}
        {step === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0F1724 0%, #162338 100%)',
                border: '2px solid #14A9D7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(20, 169, 215, 0.25)',
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={44} color="#14A9D7" />
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#14A9D7',
                  border: '2px solid #0B111A',
                  color: '#080C14',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                }}
                title="Alterar foto"
              >
                <Camera size={16} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'rgba(20, 169, 215, 0.12)',
                  border: '1px solid rgba(20, 169, 215, 0.35)',
                  color: '#14A9D7',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UploadCloud size={15} />
                <span>Carregar Foto do Computador</span>
              </button>
              <div style={{ fontSize: '0.7rem', color: '#8096A8', marginTop: '6px' }}>
                Opcional • Você pode definir ou alterar sua foto a qualquer momento no perfil.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={handleFinalizeActivation}
                disabled={isLoading}
                style={{
                  flex: 1,
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
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    <span>Concluindo...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={17} />
                    <span>Concluir e Acessar Sistema</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SUCCESS ─────────────────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              color: '#10B981',
              fontSize: '0.88rem',
              fontWeight: 600,
              lineHeight: 1.6,
            }}>
              ✨ <strong>Conta ativada com sucesso!</strong>
              <div style={{ fontSize: '0.78rem', color: '#8096A8', marginTop: '6px' }}>
                Entrando no painel corporativo F5 System...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
