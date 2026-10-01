import React, { useState, useEffect } from 'react';
import { 
  KeyRound, Mail, Lock, Eye, EyeOff, CheckCircle2, 
  ArrowRight, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { decodeCollabInviteToken } from '../../utils/collabInvite';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AdminCollabInviteViewProps {
  token?: string;
  onSuccessLogin?: () => void;
}

export const AdminCollabInviteView: React.FC<AdminCollabInviteViewProps> = ({ token, onSuccessLogin }) => {
  const { collaborators, updateCollaborator, login } = useAdminState();

  const [tokenData, setTokenData] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [step, setStep] = useState<'verify_email' | 'set_password' | 'success'>('verify_email');
  
  // Inputs
  const [inputEmail, setInputEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      const decoded = decodeCollabInviteToken(token);
      if (decoded) {
        setTokenData(decoded);
      } else {
        setErrorMsg('Link de convite inválido ou expirado. Solicite um novo link à gerência.');
      }
    } else {
      setErrorMsg('Token de convite não encontrado na URL. Verifique o link recebido com a gerência.');
    }
  }, [token]);

  // Busca o colaborador nos dados do sistema (ou usa os dados do token)
  const targetCollab = collaborators.find(c => 
    c.id === tokenData?.id || 
    c.email.toLowerCase().trim() === tokenData?.email.toLowerCase().trim()
  );

  const displayName = targetCollab?.name || tokenData?.name || 'Colaborador';
  const registeredEmail = (targetCollab?.email || tokenData?.email || '').toLowerCase().trim();

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanInput = inputEmail.toLowerCase().trim();
    if (!cleanInput) {
      setErrorMsg('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    if (cleanInput !== registeredEmail) {
      setErrorMsg('O e-mail digitado não coincide com o convite deste colaborador. Verifique a digitação ou contate a gerência.');
      return;
    }

    // E-mail confere! Avança para criação da senha
    setStep('set_password');
  };

  const handleSetPasswordAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
      return;
    }

    setIsLoading(true);

    try {
      const collabId = targetCollab?.id || tokenData?.id;
      if (!collabId) {
        throw new Error('Identificador do colaborador não encontrado.');
      }

      // 1. Atualiza a senha e marca que concluiu o primeiro acesso
      updateCollaborator(collabId, {
        password: password.trim(),
        isFirstAccess: false,
        active: true,
      });

      // 2. Se o Supabase Auth estiver ativo, tenta sincronizar/cadastrar a senha
      if (isSupabaseConfigured) {
        try {
          // Tenta signup caso o usuário ainda não exista no auth do Supabase
          const { error: signUpErr } = await supabase.auth.signUp({
            email: registeredEmail,
            password: password.trim(),
            options: {
              data: {
                name: displayName,
                role: targetCollab?.role || 'sdr',
              }
            }
          });
          if (signUpErr) {
            // Se já existe, tenta updatePassword
            await supabase.auth.updateUser({ password: password.trim() });
          }
        } catch (authErr) {
          console.warn('[CollabInvite] Aviso no Supabase Auth (ignorado, login local garantido):', authErr);
        }
      }

      // 3. Efetua o login automático no F5 System
      login(registeredEmail, password.trim());

      setStep('success');

      // Limpa os parâmetros de convite da URL para uma navegação limpa
      if (typeof window !== 'undefined') {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('collab_invite');
        window.history.replaceState({}, '', cleanUrl.pathname);
      }

      if (onSuccessLogin) {
        setTimeout(() => {
          onSuccessLogin();
        }, 1200);
      }
    } catch (err: any) {
      console.error('[CollabInvite] Erro ao ativar conta:', err);
      setErrorMsg(err.message || 'Ocorreu um erro ao ativar sua conta. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 20%, rgba(20, 169, 215, 0.08) 0%, #0A0D14 60%, #05070A 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '36px 32px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(20, 169, 215, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.2), rgba(212, 175, 55, 0.15))',
            border: '1px solid rgba(20, 169, 215, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#14A9D7',
            boxShadow: '0 8px 20px rgba(20, 169, 215, 0.25)',
          }}>
            {step === 'success' ? <CheckCircle2 size={28} color="#10B981" /> : <KeyRound size={26} />}
          </div>

          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(20, 169, 215, 0.12)',
              border: '1px solid rgba(20, 169, 215, 0.3)',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#14A9D7',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              <ShieldCheck size={11} />
              <span>Link de Entrada Oficial • F5 System</span>
            </div>
            
            <h1 style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.3px',
              margin: '0 0 6px 0',
            }}>
              {step === 'verify_email' && 'Ativação de Conta'}
              {step === 'set_password' && 'Defina sua Senha'}
              {step === 'success' && 'Acesso Liberado!'}
            </h1>
            
            <p style={{
              fontSize: '0.82rem',
              color: 'rgba(255, 255, 255, 0.65)',
              margin: 0,
              lineHeight: 1.45,
            }}>
              {step === 'verify_email' && (
                <>Olá, <strong>{displayName}</strong>! Para confirmar sua identidade e liberar seu acesso, preencha seu e-mail cadastrado.</>
              )}
              {step === 'set_password' && (
                <>Identidade confirmada! Crie uma senha para acessar o F5 System a qualquer momento.</>
              )}
              {step === 'success' && (
                <>Sua senha foi cadastrada com sucesso. Entrando no sistema...</>
              )}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            color: '#F87171',
            fontSize: '0.78rem',
            lineHeight: 1.4,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PASSO 1: CONFIRMAR E-MAIL */}
        {step === 'verify_email' && (
          <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '6px',
              }}>
                Seu E-mail Cadastrado:
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="rgba(255, 255, 255, 0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder="exemplo@bonomofestas.com.br"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '12px 14px 12px 42px',
                    color: '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#14A9D7'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.45)', display: 'block', marginTop: '5px' }}>
                Insira o mesmo e-mail informado à gerência na criação do seu acesso.
              </span>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #14A9D7, #0284C7)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 20px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(20, 169, 215, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Confirmar Acesso</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* PASSO 2: CRIAR SENHA E LOGAR */}
        {step === 'set_password' && (
          <form onSubmit={handleSetPasswordAndLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '6px',
              }}>
                Nova Senha de Acesso:
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="rgba(255, 255, 255, 0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '12px 42px 12px 42px',
                    color: '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '6px',
              }}>
                Confirmar Senha:
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="rgba(255, 255, 255, 0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a senha criada"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '12px 14px 12px 42px',
                    color: '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: isLoading ? '#64748B' : 'linear-gradient(135deg, #10B981, #059669)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '13px 20px',
                fontSize: '0.90rem',
                fontWeight: 800,
                cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isLoading ? 'Ativando acesso...' : 'Ativar e Entrar no Sistema'}</span>
            </button>
          </form>
        )}

        {/* PASSO 3: SUCESSO */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
              animation: 'bounceIn 0.3s ease',
            }}>
              <CheckCircle2 size={32} />
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
              Conta ativada com sucesso!
            </span>
            <span style={{ fontSize: '0.80rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Redirecionando diretamente para a sua área de trabalho...
            </span>
          </div>
        )}

        {/* Footer info */}
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
          <span style={{ fontSize: '0.70rem', color: 'rgba(255, 255, 255, 0.35)' }}>
            F5 System • Plataforma de Gestão Multi-Unidades
          </span>
        </div>
      </div>
    </div>
  );
};
