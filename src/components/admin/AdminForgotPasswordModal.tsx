import React, { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2, ArrowRight, X, ShieldAlert, KeyRound } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';

interface AdminForgotPasswordModalProps {
  onClose: () => void;
}

export const AdminForgotPasswordModal: React.FC<AdminForgotPasswordModalProps> = ({ onClose }) => {
  const { collaborators } = useAdminState();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'inactive' | 'not_found'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleCheckAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) return;

    // Check dev master account
    if (cleanEmail === 'dev@bonomoapp.com' || cleanEmail === 'dev@bonomofestas.com') {
      setStatus('success');
      setFeedbackMessage('Conta Master de Desenvolvimento ativa. Use a senha padrão (123456) para acesso.');
      return;
    }

    const collab = collaborators.find(c => c.email.toLowerCase() === cleanEmail);

    if (!collab) {
      setStatus('not_found');
      setFeedbackMessage('Conta inexistente no sistema. Verifique o e-mail digitado ou solicite o cadastro de acesso junto ao Administrador Master.');
      return;
    }

    if (!collab.active) {
      setStatus('inactive');
      setFeedbackMessage('Seu acesso está inativo no momento. Por motivos de segurança, entre em contato diretamente com a diretoria da Bonomo Festas para reativação da sua conta.');
      return;
    }

    setStatus('success');
    setFeedbackMessage(`Conta ativa localizada! Um link de redefinição de senha foi preparado para ${collab.name}. Você também pode solicitar uma senha temporária ao Administrador.`);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 4, 8, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 9999,
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div style={{
        background: '#120F17',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '24px',
        maxWidth: '440px',
        width: '100%',
        padding: '28px 24px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.9)',
        color: '#FFFFFF',
        position: 'relative',
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'transparent',
            border: 'none',
            color: '#9E988D',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
          }}>
            <KeyRound size={24} color="#D4AF37" />
          </div>

          <h3 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 4px 0',
          }}>
            Recuperação de Acesso
          </h3>

          <p style={{
            fontSize: '0.78rem',
            color: '#9E988D',
            margin: 0,
          }}>
            Informe seu e-mail cadastrado para verificar seu status de acesso
          </p>
        </div>

        {status === 'idle' && (
          <form onSubmit={handleCheckAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                E-mail Corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '12px' }} />
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
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '30px',
                padding: '12px',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: "'Cinzel', serif",
                marginTop: '4px',
              }}
            >
              <span>Verificar Acesso</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {status === 'inactive' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              color: '#F87171',
              fontSize: '0.84rem',
              lineHeight: '1.5',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}>
              <ShieldAlert size={28} color="#EF4444" />
              <span>{feedbackMessage}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '30px',
                padding: '10px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Voltar para o Login
            </button>
          </div>
        )}

        {status === 'not_found' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              background: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              color: '#FACC15',
              fontSize: '0.84rem',
              lineHeight: '1.5',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={28} color="#FACC15" />
              <span>{feedbackMessage}</span>
            </div>

            <button
              type="button"
              onClick={() => setStatus('idle')}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '30px',
                padding: '10px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Tentar outro e-mail
            </button>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              color: '#4ADE80',
              fontSize: '0.84rem',
              lineHeight: '1.5',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}>
              <CheckCircle2 size={28} color="#22C55E" />
              <span>{feedbackMessage}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '30px',
                padding: '12px',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: "'Cinzel', serif",
              }}
            >
              Voltar e Fazer Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
