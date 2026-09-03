import React, { useState, useRef } from 'react';
import { 
  User, Phone, Camera, UploadCloud, 
  ArrowRight, ShieldCheck, Sparkles, Building2, AlertCircle 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const AdminFirstAccessProfileView: React.FC = () => {
  const { currentUser, venues, updateCollaborator, updateCurrentUserProfile } = useAdminState();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.avatarUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Identify assigned venues
  const assignedVenues = venues.filter(v => 
    currentUser?.venueIds?.includes(v.id) || currentUser?.venueIds?.includes('all') || v.id === currentUser?.id
  );
  const isSingleVenue = assignedVenues.length === 1;
  const primaryVenue = assignedVenues[0] || null;

  // Phone mask helper
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  // Photo upload handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Form validation: Nome, Foto and WhatsApp are MANDATORY
  const cleanPhoneDigits = phone.replace(/\D/g, '');
  const isFormValid = name.trim().length >= 3 && cleanPhoneDigits.length >= 10 && Boolean(avatarUrl);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Por favor, confirme o seu nome completo.');
      return;
    }

    if (cleanPhoneDigits.length < 10) {
      setErrorMessage('Por favor, informe um número válido de WhatsApp / telefone.');
      return;
    }

    if (!avatarUrl) {
      setErrorMessage('É obrigatório adicionar uma foto de perfil para identificação da equipe.');
      return;
    }

    if (!currentUser) return;

    setIsLoading(true);

    try {
      // 1. Update collaborator in state and Supabase
      updateCollaborator(currentUser.id, {
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl,
        isFirstAccess: false,
      });

      // 2. Update current active user profile
      updateCurrentUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl,
        isFirstAccess: false,
      });

      // 3. Persist in Supabase collaborators table
      if (isSupabaseConfigured) {
        await supabase
          .from('collaborators')
          .update({
            name: name.trim(),
            phone: phone.trim(),
            avatar_url: avatarUrl,
            is_first_access: false,
          })
          .eq('id', currentUser.id);
      }
    } catch (err: any) {
      setErrorMessage('Erro ao salvar o perfil. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      background: 'radial-gradient(circle at 50% 0%, #0D1626 0%, #080C14 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      boxSizing: 'border-box',
      fontFamily: "'Poppins', sans-serif",
      color: '#FFFFFF',
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: '#0B111A',
        border: '1px solid rgba(20, 169, 215, 0.35)',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 24px 70px rgba(0, 0, 0, 0.9), 0 0 30px rgba(20, 169, 215, 0.1)',
        position: 'relative',
        boxSizing: 'border-box',
      }}>
        {/* Top Venue Logo or F5 Sytem Banner */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {isSingleVenue && primaryVenue ? (
            <div style={{ marginBottom: '16px' }}>
              {primaryVenue.logoUrl ? (
                <img
                  src={primaryVenue.logoUrl}
                  alt={primaryVenue.name}
                  style={{
                    height: '56px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
                    marginBottom: '8px',
                  }}
                />
              ) : (
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(20, 169, 215, 0.15)',
                  border: '1px solid rgba(20, 169, 215, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#14A9D7',
                  marginBottom: '8px',
                }}>
                  <Building2 size={26} />
                </div>
              )}
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0', color: '#FFFFFF' }}>
                Seja bem-vindo(a) ao {primaryVenue.name}!
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#8096A8', margin: 0 }}>
                Este é o seu primeiro acesso ao <strong>F5 System</strong>. Complete seu perfil abaixo para liberar o sistema.
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(20, 169, 215, 0.15)',
                border: '1px solid rgba(20, 169, 215, 0.4)',
                borderRadius: '20px',
                padding: '6px 14px',
                marginBottom: '10px',
              }}>
                <Sparkles size={16} color="#14A9D7" />
                <span style={{ fontSize: '0.74rem', color: '#14A9D7', fontWeight: 700, letterSpacing: '0.5px' }}>
                  F5 SYSTEM • ATIVAÇÃO DE CONTA
                </span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0', color: '#FFFFFF' }}>
                Seja bem-vindo(a) ao Sistema de Gestão!
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#8096A8', margin: 0 }}>
                Complete os seus dados de identificação abaixo para ter acesso total ao painel.
              </p>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#F87171',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Mandatory Photo Upload */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: avatarUrl ? '1.5px solid rgba(20, 169, 215, 0.4)' : '1.5px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '20px',
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: '#0F1724',
                border: avatarUrl ? '2px solid #14A9D7' : '2px dashed rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: avatarUrl ? '0 8px 24px rgba(20, 169, 215, 0.3)' : 'none',
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={42} color="#647E8C" />
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
                }}
                title="Adicionar foto"
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
                  border: '1px solid rgba(20, 169, 215, 0.4)',
                  color: '#14A9D7',
                  borderRadius: '10px',
                  padding: '7px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UploadCloud size={15} />
                <span>{avatarUrl ? 'Substituir Foto' : 'Selecionar Foto de Perfil *'}</span>
              </button>
              <div style={{ fontSize: '0.72rem', color: avatarUrl ? '#10B981' : '#F59E0B', marginTop: '6px', fontWeight: 600 }}>
                {avatarUrl ? '✓ Foto de perfil carregada com sucesso' : '⚠️ Adição de foto obrigatória'}
              </div>
            </div>
          </div>

          {/* 2. Mandatory Full Name Confirmation */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.74rem',
              color: '#14A9D7',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}>
              Seu Nome Completo *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type="text"
                required
                placeholder="Confirme ou digite seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0F1724',
                  border: '1px solid rgba(20, 169, 215, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 42px',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* 3. Mandatory WhatsApp / Contact */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.74rem',
              color: '#14A9D7',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}>
              WhatsApp / Telefone de Contato *
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type="tel"
                required
                placeholder="(21) 99999-9999"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0F1724',
                  border: '1px solid rgba(20, 169, 215, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 42px',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ fontSize: '0.7rem', color: '#8096A8', marginTop: '4px' }}>
              Utilizado para notificações e comunicação direta da equipe no CRM.
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            style={{
              width: '100%',
              background: isFormValid ? 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)' : '#1A2333',
              color: isFormValid ? '#080C14' : '#647E8C',
              border: 'none',
              borderRadius: '14px',
              padding: '14px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: isFormValid && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              boxShadow: isFormValid ? '0 8px 24px rgba(20, 169, 215, 0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading ? (
              <span>Salvando e liberando sistema...</span>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Concluir Meu Perfil & Acessar Sistema</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
