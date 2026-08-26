import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, AlignLeft } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { VideoUploadField } from './VideoUploadField';
import type { Venue } from '../../types/admin';

interface AdminVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueToEdit?: Venue | null;
}

export const AdminVenueModal: React.FC<AdminVenueModalProps> = ({
  isOpen,
  onClose,
  venueToEdit,
}) => {
  const { addVenue, updateVenue } = useAdminState();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [ballroomImageUrl, setBallroomImageUrl] = useState('');
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366F1');
  const [accentColor, setAccentColor] = useState('#06B6D4');

  useEffect(() => {
    if (venueToEdit) {
      setName(venueToEdit.name);
      setTagline(venueToEdit.tagline);
      setDescription(venueToEdit.description || '');
      setAddress(venueToEdit.address);
      setLogoUrl(venueToEdit.logoUrl || '');
      setBallroomImageUrl(venueToEdit.ballroomImageUrl);
      setWelcomeVideoUrl(venueToEdit.welcomeVideoUrl || '');
      setPrimaryColor(venueToEdit.primaryColor || '#6366F1');
      setAccentColor(venueToEdit.accentColor || '#06B6D4');
    } else {
      setName('');
      setTagline('Onde momentos exclusivos se transformam em memórias inesquecíveis');
      setDescription('Espaço requintado e sofisticado preparado especialmente para noites inesquecíveis.');
      setAddress('Av. das Américas, 1500 - Barra da Tijuca, Rio de Janeiro - RJ');
      setLogoUrl('');
      setBallroomImageUrl('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80');
      setWelcomeVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      setPrimaryColor('#6366F1');
      setAccentColor('#06B6D4');
    }
  }, [venueToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const fallbackBallroom = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80';

    if (venueToEdit) {
      updateVenue(venueToEdit.id, {
        name: name.trim(),
        tagline: tagline.trim() || 'Onde momentos exclusivos se transformam em memórias inesquecíveis',
        description: description.trim() || 'Espaço requintado preparado especialmente para noites inesquecíveis.',
        address: address.trim() || 'Rio de Janeiro - RJ',
        logoUrl: logoUrl.trim() || undefined,
        ballroomImageUrl: ballroomImageUrl.trim() || fallbackBallroom,
        welcomeVideoUrl: welcomeVideoUrl.trim() || undefined,
        primaryColor,
        accentColor,
      });
    } else {
      addVenue({
        name: name.trim(),
        tagline: tagline.trim() || 'Onde momentos exclusivos se transformam em memórias inesquecíveis',
        description: description.trim() || 'Espaço requintado preparado especialmente para noites inesquecíveis.',
        address: address.trim() || 'Rio de Janeiro - RJ',
        logoUrl: logoUrl.trim() || undefined,
        ballroomImageUrl: ballroomImageUrl.trim() || fallbackBallroom,
        welcomeVideoUrl: welcomeVideoUrl.trim() || undefined,
        experienceText: 'Mais de 10 anos realizando sonhos.',
        yearsInBusiness: 10,
        eventsCompleted: 500,
        guestsDelighted: 80000,
        googleMapsEmbedUrl: `https://maps.google.com/?q=${encodeURIComponent(name)}`,
        googleMapsLink: `https://maps.google.com/?q=${encodeURIComponent(name)}`,
        wazeLink: `https://waze.com/ul?q=${encodeURIComponent(name)}`,
        defaultDressCode: 'Traje Passeio Completo / Gala',
        primaryColor,
        secondaryColor: '#E8B4B8',
        accentColor,
        glowColor: 'rgba(99, 102, 241, 0.4)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      });
    }

    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--adm-text-title)',
    fontSize: '0.84rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--adm-text-title)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--adm-bg-elevated)',
            border: '1px solid var(--adm-border)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--adm-accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <Building2 size={20} />
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {venueToEdit ? 'Editar Casa de Festa' : 'Nova Casa de Festa'}
          </h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '22px' }}>
          Configure dados, fotos, logomarca, descrição do convite e vídeo vertical da unidade.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Nome */}
          <div>
            <label style={labelStyle}>
              Nome da Casa de Festa *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Espaço Rio Lounge"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Slogan */}
          <div>
            <label style={labelStyle}>
              Slogan / Tagline
            </label>
            <input
              type="text"
              placeholder="Ex: Onde momentos exclusivos se transformam em memórias inesquecíveis"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Descrição Detalhada para Convites */}
          <div>
            <label style={labelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlignLeft size={13} color="var(--adm-accent)" />
                <span>Descrição Completa da Casa (Tela de Convite)</span>
              </div>
            </label>
            <textarea
              rows={3}
              placeholder="Descreva a estrutura do salão, pista de dança, climatização e atrativos que aparecem no convite..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '75px',
              }}
            />
          </div>

          {/* Endereço */}
          <div>
            <label style={labelStyle}>
              Endereço Completo
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="Av. das Américas, 1500 - Barra da Tijuca, RJ"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: '38px',
                }}
              />
            </div>
          </div>

          {/* Logotipo da Casa */}
          <ImageUploadField
            label="Logotipo da Casa de Festas (Opcional)"
            value={logoUrl}
            onChange={(val) => setLogoUrl(val)}
            aspectRatio="1:1"
            placeholder="Subir logo da casa de festas (PNG transparente ou JPG)"
          />

          {/* Imagem Panorâmica do Salão */}
          <ImageUploadField
            label="Foto Principal do Salão / Espaço"
            value={ballroomImageUrl}
            onChange={(val) => setBallroomImageUrl(val)}
            aspectRatio="16:9"
            placeholder="Subir foto panorâmica do salão de festas"
          />

          {/* Vídeo Vertical de Boas-Vindas */}
          <VideoUploadField
            label="Vídeo Vertical de Boas-Vindas da Casa (Stories 9:16)"
            value={welcomeVideoUrl}
            onChange={(val) => setWelcomeVideoUrl(val)}
            helperText="Formato vertical 9:16. Este vídeo será reproduzido no primeiro acesso das debutantes desta casa."
          />

          {/* Cores do Tema da Unidade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Cor Primária
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ width: '38px', height: '36px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{primaryColor}</span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Cor de Destaque
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ width: '38px', height: '36px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{accentColor}</span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.84rem',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.86rem',
              }}
            >
              {venueToEdit ? 'Salvar Alterações' : 'Cadastrar Casa de Festa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
