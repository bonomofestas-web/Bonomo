import React, { useState } from 'react';
import { Crown, Lock, User, Phone, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';

interface AdminFirstAccessModalProps {
  onComplete: () => void;
}

export const AdminFirstAccessModal: React.FC<AdminFirstAccessModalProps> = ({ onComplete }) => {
  const { currentUser, updateCurrentUserProfile } = useAdminState();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError('Por favor, informe seu nome completo.');
        return;
      }
      if (!phone.trim()) {
        setError('Por favor, informe seu número de WhatsApp.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!newPassword || newPassword.length < 6) {
        setError('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('As senhas digitadas não coincidem.');
        return;
      }
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      updateCurrentUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl || undefined,
        isFirstAccess: false,
      });
      setStep(3);
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 4, 8, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 9999,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #141118 0%, #0A080E 100%)',
        border: '1.5px solid rgba(212, 175, 55, 0.45)',
        borderRadius: '24px',
        maxWidth: '500px',
        width: '100%',
        padding: '32px 28px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
        color: '#FFFFFF',
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            boxShadow: '0 6px 20px rgba(212, 175, 55, 0.4)',
          }}>
            <Crown size={28} color="#000" />
          </div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 4px 0',
          }}>
            Bem-vindo(a) à Bonomo Festas
          </h2>

          <p style={{
            fontSize: '0.8rem',
            color: '#D4AF37',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '1px',
            margin: 0,
          }}>
            Configuração do Primeiro Acesso
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#F87171',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            marginBottom: '18px',
          }}>
            {error}
          </div>
        )}

        {/* STEP 1: Confirmação de Dados Pessoais */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '0.82rem', color: '#9E988D', lineHeight: '1.5' }}>
              Para garantir a segurança da equipe e o direcionamento correto dos leads, confirme seus dados abaixo:
            </div>

            {/* Avatar Upload */}
            <ImageUploadField
              label="Sua Foto de Perfil"
              value={avatarUrl}
              onChange={setAvatarUrl}
              aspectRatio="1:1"
              previewHeight="70px"
              placeholder="Clique para adicionar sua foto de perfil"
            />

            {/* Nome */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Nome Completo
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  style={{
                    width: '100%',
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Número do WhatsApp Pessoal
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(21) 99999-9999"
                  style={{
                    width: '100%',
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              style={{
                background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '30px',
                padding: '12px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: "'Cinzel', serif",
                marginTop: '10px',
              }}
            >
              <span>Avançar para Criar Senha</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: Definição de Nova Senha Pessoal */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '0.78rem',
              color: '#E8C98D',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <ShieldCheck size={20} color="#D4AF37" />
              <span>Por motivos de segurança, você deve substituir a senha temporária por uma nova senha pessoal definitiva.</span>
            </div>

            {/* Nova Senha */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Nova Senha Pessoal
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="password"
                  required
                  placeholder="No mínimo 6 dígitos"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Confirmar Nova Senha */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Confirmar Nova Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFF',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '30px',
                  padding: '12px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleNextStep}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '12px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: "'Cinzel', serif",
                }}
              >
                <span>{isSubmitting ? 'Salvando...' : 'Salvar & Acessar'}</span>
                <CheckCircle2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Conclusão */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.2)',
              border: '2px solid #22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}>
              <CheckCircle2 size={32} color="#22C55E" />
            </div>

            <h3 style={{ fontSize: '1.2rem', color: '#FFF', margin: '0 0 8px 0', fontFamily: "'Playfair Display', serif" }}>
              Conta Configurada com Sucesso!
            </h3>

            <p style={{ fontSize: '0.82rem', color: '#9E988D', marginBottom: '24px', lineHeight: '1.5' }}>
              Sua senha pessoal foi salva. A partir de agora, use seu e-mail e a nova senha para acessar o painel.
            </p>

            <button
              type="button"
              onClick={onComplete}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '30px',
                padding: '12px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: "'Cinzel', serif",
              }}
            >
              <Sparkles size={16} />
              <span>Entrar no Painel de Gestão</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
