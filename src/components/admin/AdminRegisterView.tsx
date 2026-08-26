import React, { useState } from 'react';
import { Crown, Lock, Mail, User, Phone, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { AdminRole } from '../../types/admin';

interface AdminRegisterViewProps {
  onSuccessRegister?: () => void;
  onSwitchToLogin: () => void;
  onBackToApp?: () => void;
}

export const AdminRegisterView: React.FC<AdminRegisterViewProps> = ({
  onSuccessRegister,
  onSwitchToLogin,
  onBackToApp,
}) => {
  const { venues, addCollaborator } = useAdminState();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('sdr');
  const [venueId, setVenueId] = useState<string>(venues[0]?.id || 'all');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        // Real Supabase Auth SignUp
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
              role,
              venue_id: venueId,
              phone: phone.trim(),
            },
          },
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (data.user) {
          // Insert profile record into public.collaborators
          await supabase.from('collaborators').upsert({
            id: data.user.id,
            email: email.trim(),
            name: name.trim(),
            role,
            venue_id: venueId === 'all' ? null : venueId,
            venue_ids: venueId === 'all' ? [] : [venueId],
            phone: phone.trim(),
            active: true,
          });
        }
      }

      // Also register in the admin context
      addCollaborator({
        name: name.trim(),
        email: email.trim(),
        role,
        venueId: venueId || 'all',
        venueIds: venueId && venueId !== 'all' ? [venueId] : [],
        phone: phone.trim(),
        active: true,
      });

      setSuccessMessage('Conta cadastrada com sucesso! Você já pode acessar o painel.');
      setTimeout(() => {
        if (onSuccessRegister) onSuccessRegister();
        else onSwitchToLogin();
      }, 1500);

    } catch (err: any) {
      setError(err?.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
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
      padding: '32px 16px',
      fontFamily: "'Montserrat', sans-serif",
      position: 'relative',
    }}>
      {/* Background Ambience Glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '550px',
        height: '550px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none',
      }} />

      {/* Top Brand Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px', zIndex: 2 }}>
        <div style={{
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px auto',
          boxShadow: '0 8px 30px rgba(212, 175, 55, 0.4)',
        }}>
          <Crown size={28} color="#000" />
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.6rem',
          fontWeight: 800,
          color: '#FFF',
          margin: '0 0 4px 0',
          letterSpacing: '0.5px',
        }}>
          Bonomo Festas
        </h1>

        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.72rem',
          color: '#D4AF37',
          fontWeight: 800,
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          Cadastro de Novo Colaborador / Gestor
        </div>
      </div>

      {/* Register Card */}
      <div style={{
        background: 'linear-gradient(135deg, #141118 0%, #0D0A12 100%)',
        border: '1.5px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '24px',
        maxWidth: '480px',
        width: '100%',
        padding: '30px 26px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 24px rgba(212, 175, 55, 0.12)',
        zIndex: 2,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <ShieldCheck size={18} color="#D4AF37" />
          <h2 style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            color: '#FFF',
            margin: 0,
            fontFamily: "'Cinzel', serif",
          }}>
            Criar Conta Administrativa
          </h2>
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
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34D399',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Nome Completo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'Cinzel', serif" }}>
              Nome Completo *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="text"
                required
                placeholder="Ex: Beatriz Albuquerque"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  background: '#120F16',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '11px 14px 11px 40px',
                  color: '#FFF',
                  fontSize: '0.86rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* E-mail e Telefone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'Cinzel', serif" }}>
                E-mail *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="email"
                  required
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '12px',
                    padding: '11px 12px 11px 36px',
                    color: '#FFF',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'Cinzel', serif" }}>
                WhatsApp
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="tel"
                  placeholder="(21) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '12px',
                    padding: '11px 12px 11px 36px',
                    color: '#FFF',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Cargo / Role & Casa de Festa */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'Cinzel', serif" }}>
                Função / Cargo *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                style={{
                  width: '100%',
                  background: '#120F16',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '11px 10px',
                  color: '#FFF',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="sdr">SDR (Pré-Vendas)</option>
                <option value="closer">Closer (Vendas / Fechamento)</option>
                <option value="crm">Gestor de CRM</option>
                <option value="admin">Gerente de Unidade</option>
                <option value="master">Master / Administrador</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'Cinzel', serif" }}>
                Unidade Principal *
              </label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                style={{
                  width: '100%',
                  background: '#120F16',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '11px 10px',
                  color: '#FFF',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="all">Todas as Unidades</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Senha e Confirmação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'Cinzel', serif" }}>
                Senha de Acesso *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 dígitos"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '12px',
                    padding: '11px 12px 11px 36px',
                    color: '#FFF',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'Cinzel', serif" }}>
                Confirmar Senha *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#D4AF37" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="password"
                  required
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '12px',
                    padding: '11px 12px 11px 36px',
                    color: '#FFF',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
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
              padding: '13px',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "'Cinzel', serif",
              boxShadow: '0 6px 20px rgba(212, 175, 55, 0.35)',
              marginTop: '6px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <span>{loading ? 'CADASTRANDO...' : 'CADASTRAR CONTA'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Bottom Switch to Login */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '16px',
          marginTop: '18px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.78rem', color: '#9E988D' }}>
            Já possui acesso cadastrado?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#D4AF37',
                fontWeight: 800,
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.78rem',
              }}
            >
              Fazer Login
            </button>
          </div>

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
