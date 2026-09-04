import React, { useState, useRef } from 'react';
import { 
  User, Phone, Camera, UploadCloud, 
  ArrowRight, ShieldCheck, Sparkles, Building2, AlertCircle,
  Loader2, Check
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { cloudflareR2Service } from '../../lib/cloudflareR2';

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
  const primaryVenue = assignedVenues[0] || venues[0] || null;

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

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Fast client-side image compression and conversion to WebP
  const compressImage = (file: File): Promise<{ base64: string; blob: Blob }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) return resolve({ base64: '', blob: file });

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800; // Profile photos max 800px

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve({ base64: result, blob: file });

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const webpBase64 = canvas.toDataURL('image/webp', 0.85);
                resolve({ base64: webpBase64, blob });
              } else {
                resolve({ base64: result, blob: file });
              }
            },
            'image/webp',
            0.85
          );
        };
        img.onerror = () => resolve({ base64: result, blob: file });
        img.src = result;
      };
      reader.onerror = () => resolve({ base64: '', blob: file });
      reader.readAsDataURL(file);
    });
  };

  // Photo upload handler directly to Cloudflare R2
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setUploadSuccess(false);
    setErrorMessage('');

    try {
      // 1. Instant compression to lightweight WebP
      const { base64, blob } = await compressImage(file);
      if (base64) setAvatarUrl(base64);

      // 2. Direct upload to Cloudflare R2
      const webpFile = new File([blob], `${file.name.split('.')[0]}.webp`, {
        type: 'image/webp',
      });
      const r2Url = await cloudflareR2Service.uploadFile(webpFile, 'avatars');

      if (r2Url && r2Url.startsWith('http')) {
        setAvatarUrl(r2Url);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        throw new Error('Servidor não retornou uma URL válida do R2.');
      }
    } catch (err: any) {
      console.error('[AdminFirstAccessProfileView] Falha no upload R2:', err);
      setErrorMessage(err?.message || 'Falha ao enviar foto para o Cloudflare R2. Tente novamente.');
      setAvatarUrl('');
    } finally {
      setIsUploadingPhoto(false);
    }
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

    if (avatarUrl.startsWith('data:') || isUploadingPhoto) {
      setErrorMessage('Aguarde a conclusão do envio da foto para o Cloudflare R2.');
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

  // Role display label
  const getRoleBadgeLabel = (r?: string) => {
    switch (r) {
      case 'pos_venda': return 'Pós-Venda & Fidelização';
      case 'sdr': return 'SDR • Pré-Vendas';
      case 'closer': return 'Closer • Fechamento';
      case 'admin': return 'Gerência de Unidade';
      case 'crm': return 'Gestão Comercial / CRM';
      case 'master': return 'Diretoria Executiva';
      default: return 'Equipe Comercial';
    }
  };

  const venueName = primaryVenue ? primaryVenue.name : 'Bonomo Festas';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 15%, #0F192E 0%, #060911 75%, #03050A 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px 20px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      zIndex: 9999,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      color: '#FFFFFF',
    }}>
      {/* Ambient Lighting Orbs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20, 169, 215, 0.12) 0%, transparent 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '20%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.09) 0%, transparent 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
      }} />

      {/* Main Glass Card */}
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: 'rgba(11, 17, 28, 0.88)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(20, 169, 215, 0.3)',
        borderRadius: '28px',
        padding: '38px 36px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(20, 169, 215, 0.12)',
        position: 'relative',
        boxSizing: 'border-box',
        zIndex: 10,
        margin: 'auto',
      }}>
        {/* Top Header with Venue Logo & Personalized Welcome */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          {/* Logo or Monogram Badge */}
          {primaryVenue?.logoUrl ? (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                padding: '8px 20px',
                borderRadius: '16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
                <img
                  src={primaryVenue.logoUrl}
                  alt={venueName}
                  style={{
                    height: '48px',
                    maxWidth: '180px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.2) 0%, rgba(212, 175, 55, 0.15) 100%)',
                border: '1px solid rgba(20, 169, 215, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#14A9D7',
                boxShadow: '0 8px 20px rgba(20, 169, 215, 0.2)',
              }}>
                <Building2 size={26} />
              </div>
            </div>
          )}

          {/* Role Pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(20, 169, 215, 0.1)', border: '1px solid rgba(20, 169, 215, 0.3)', borderRadius: '20px', padding: '4px 14px', marginBottom: '10px' }}>
            <Sparkles size={13} color="#14A9D7" />
            <span style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {getRoleBadgeLabel(currentUser?.role)}
            </span>
          </div>

          {/* Personalized Title */}
          <h1 style={{
            fontSize: '1.55rem',
            fontWeight: 800,
            margin: '6px 0 8px 0',
            color: '#FFFFFF',
            letterSpacing: '-0.4px',
            lineHeight: 1.25,
          }}>
            Seja bem-vindo(a){name ? `, ${name}` : ''}!
          </h1>

          <p style={{
            fontSize: '0.86rem',
            color: '#94A3B8',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Você agora faz parte da equipe do <strong style={{ color: '#E2E8F0' }}>{venueName}</strong> no <strong style={{ color: '#14A9D7' }}>F5 System</strong>.<br />
            Complete seu perfil abaixo para liberar o acesso ao sistema.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '14px',
            padding: '12px 16px',
            color: '#FCA5A5',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Mandatory Photo Upload Box */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: avatarUrl ? '1.5px solid rgba(20, 169, 215, 0.45)' : '1.5px dashed rgba(255, 255, 255, 0.18)',
            borderRadius: '20px',
            padding: '24px 20px',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '108px',
                height: '108px',
                borderRadius: '50%',
                background: '#0B111A',
                border: avatarUrl ? '3px solid #14A9D7' : '2px dashed rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: avatarUrl ? '0 12px 30px rgba(20, 169, 215, 0.35)' : '0 8px 20px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease',
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748B' }}>
                    <User size={46} />
                  </div>
                )}
              </div>

              {/* Floating Camera Icon */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #14A9D7 0%, #0284C7 100%)',
                  border: '2px solid #0B111A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(20, 169, 215, 0.4)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                title="Tirar ou selecionar foto"
              >
                <Camera size={18} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: avatarUrl ? 'rgba(20, 169, 215, 0.15)' : 'rgba(20, 169, 215, 0.2)',
                  border: '1px solid rgba(20, 169, 215, 0.45)',
                  color: '#14A9D7',
                  borderRadius: '12px',
                  padding: '9px 20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isUploadingPhoto ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Otimizando e enviando...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>{avatarUrl ? 'Alterar Foto de Perfil' : 'Selecionar Foto de Perfil *'}</span>
                  </>
                )}
              </button>

              <div style={{
                fontSize: '0.74rem',
                color: uploadSuccess || (avatarUrl && !avatarUrl.startsWith('data:')) ? '#10B981' : isUploadingPhoto ? '#14A9D7' : '#F59E0B',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                {isUploadingPhoto ? (
                  <span>Otimizando & enviando para o Cloudflare R2...</span>
                ) : uploadSuccess || (avatarUrl && !avatarUrl.startsWith('data:')) ? (
                  <>
                    <Check size={14} />
                    <span>Foto carregada com sucesso!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} color="#F59E0B" />
                    <span>Adição de foto obrigatória para identificação</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full Name */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.72rem',
                color: '#94A3B8',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '7px',
              }}>
                Seu Nome Completo *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={17} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type="text"
                  required
                  placeholder="Confirme seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#070D18',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '14px',
                    padding: '13px 14px 13px 44px',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#14A9D7';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20, 169, 215, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* WhatsApp Phone */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.72rem',
                color: '#94A3B8',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '7px',
              }}>
                WhatsApp / Telefone de Contato *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={17} color="#14A9D7" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type="tel"
                  required
                  placeholder="(21) 99999-9999"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#070D18',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    borderRadius: '14px',
                    padding: '13px 14px 13px 44px',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#14A9D7';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20, 169, 215, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '5px' }}>
                Utilizado para identificação e comunicação rápida da equipe no CRM.
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            style={{
              width: '100%',
              background: isFormValid 
                ? 'linear-gradient(135deg, #14A9D7 0%, #0284C7 100%)' 
                : 'rgba(255, 255, 255, 0.05)',
              color: isFormValid ? '#FFFFFF' : '#475569',
              border: 'none',
              borderRadius: '14px',
              padding: '15px 20px',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: isFormValid && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '10px',
              boxShadow: isFormValid ? '0 10px 28px rgba(20, 169, 215, 0.38)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Salvando perfil e liberando sistema...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                <span>Concluir Meu Perfil & Acessar Sistema</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
