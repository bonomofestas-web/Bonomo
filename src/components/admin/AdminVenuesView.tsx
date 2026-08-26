import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, MapPin, 
  Edit3, Trash2, Video, ArrowLeft,
  Users, Save
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { VideoUploadField } from './VideoUploadField';
import { AdminConfirmModal } from './AdminConfirmModal';
import { resolveMediaUrl } from '../../utils/mediaStorage';
import type { Venue } from '../../types/admin';

const VenueVideoPlayer: React.FC<{ url?: string }> = ({ url }) => {
  const [resolvedSrc, setResolvedSrc] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (url) {
      resolveMediaUrl(url).then((src) => {
        if (isMounted) setResolvedSrc(src);
      });
    } else {
      setResolvedSrc('');
    }
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!resolvedSrc) return null;

  return (
    <div style={{
      background: 'var(--adm-bg-card)',
      border: '1px solid var(--adm-border)',
      borderRadius: '20px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Video size={16} color="var(--adm-accent)" />
        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
          Vídeo de Apresentação da Unidade
        </span>
      </div>

      <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#000', maxHeight: '280px' }}>
        <video
          src={resolvedSrc}
          controls
          playsInline
          style={{ width: '100%', maxHeight: '280px', display: 'block' }}
        />
      </div>
    </div>
  );
};

export const AdminVenuesView: React.FC = () => {
  const { venues, debutantes, collaborators, currentUser, addVenue, updateVenue, deleteVenue } = useAdminState();
  
  // View states: 'list' | 'detail' | 'form'
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'form'>('list');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [ballroomImageUrl, setBallroomImageUrl] = useState('');
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366F1');
  const [accentColor, setAccentColor] = useState('#06B6D4');

  const selectedVenue = venues.find(v => v.id === selectedVenueId) || null;

  const handleOpenCreate = () => {
    setName('');
    setTagline('');
    setDescription('');
    setAddress('');
    setLogoUrl('');
    setBallroomImageUrl('');
    setWelcomeVideoUrl('');
    setPrimaryColor('#6366F1');
    setAccentColor('#06B6D4');
    setIsEditingExisting(false);
    setViewMode('form');
  };

  const handleOpenEdit = (v: Venue) => {
    setSelectedVenueId(v.id);
    setName(v.name);
    setTagline(v.tagline);
    setDescription(v.description);
    setAddress(v.address);
    setLogoUrl(v.logoUrl || '');
    setBallroomImageUrl(v.ballroomImageUrl || '');
    setWelcomeVideoUrl(v.welcomeVideoUrl || '');
    setPrimaryColor(v.primaryColor || '#6366F1');
    setAccentColor(v.accentColor || '#06B6D4');
    setIsEditingExisting(true);
    setViewMode('form');
  };

  const handleSelectVenueDetail = (v: Venue) => {
    setSelectedVenueId(v.id);
    setViewMode('detail');
  };

  const handleDelete = (v: Venue) => {
    setVenueToDelete(v);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const fallbackBallroom = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80';

    if (isEditingExisting && selectedVenueId) {
      updateVenue(selectedVenueId, {
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
      setViewMode('detail');
    } else {
      const newId = addVenue({
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
      setSelectedVenueId(newId);
      setViewMode('detail');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1: FORM (CREATE OR EDIT EMBEDDED VIEW)
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode === 'form') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px 32px 60px 32px',
        maxWidth: '1000px',
        margin: '0 auto',
        animation: 'fadeIn 0.2s ease-out',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Top Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setViewMode(selectedVenue ? 'detail' : 'list')}
            style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-title)',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
            {isEditingExisting ? `Editar ${name || 'Unidade'}` : 'Cadastrar Nova Casa de Festa'}
          </h2>
        </div>

        {/* Embedded Form Card */}
        <form onSubmit={handleSaveForm} style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
              Nome da Unidade / Casa de Festas *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Espaço Rio Lounge Barra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '11px 14px',
                color: 'var(--adm-text-title)',
                fontSize: '0.86rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Frase de Destaque (Slogan / Tagline)
              </label>
              <input
                type="text"
                placeholder="Ex: Onde momentos exclusivos se transformam em memórias"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Endereço Completo
              </label>
              <input
                type="text"
                placeholder="Ex: Av. das Américas, 1500 - Barra da Tijuca, RJ"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Media: Logo & Ballroom Photo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Logotipo da Casa de Festa
              </label>
              <ImageUploadField
                value={logoUrl}
                onChange={setLogoUrl}
                label="Logotipo da Casa (Fundo Transparente)"
                aspectRatio="1:1"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Foto Principal do Salão de Festas *
              </label>
              <ImageUploadField
                value={ballroomImageUrl}
                onChange={setBallroomImageUrl}
                label="Foto Panorâmica do Salão"
                aspectRatio="16:9"
              />
            </div>
          </div>

          {/* Welcome Video */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
              Vídeo de Apresentação / Boas-Vindas da Unidade (MP4 / WebM)
            </label>
            <VideoUploadField
              value={welcomeVideoUrl}
              onChange={setWelcomeVideoUrl}
              label="Vídeo da Casa de Festas"
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
              Descrição e Diferenciais Exclusivos
            </label>
            <textarea
              rows={3}
              placeholder="Descreva a infraestrutura, pista de dança, climatização, camarim VIP..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '11px 14px',
                color: 'var(--adm-text-title)',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--adm-border)' }}>
            <button
              type="button"
              onClick={() => setViewMode(selectedVenue ? 'detail' : 'list')}
              style={{
                background: 'transparent',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-muted)',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Save size={16} />
              <span>{isEditingExisting ? 'Salvar Alterações da Casa' : 'Concluir Cadastro da Casa'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: VENUE DETAILS & TEAM VIEW (EMBEDDED 2-COLUMN VIEW)
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode === 'detail' && selectedVenue) {
    const venueDebutantes = debutantes.filter(d => d.venueId === selectedVenue.id);
    const venueCollaborators = collaborators.filter(c => c.venueId === selectedVenue.id || (c.venueIds || []).includes(selectedVenue.id));

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px 32px 60px 32px',
        maxWidth: '1440px',
        margin: '0 auto',
        animation: 'fadeIn 0.25s ease-out',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={16} />
              <span>Todas as Casas</span>
            </button>

            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: '0 0 2px 0' }}>
                {selectedVenue.name}
              </h1>
              <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                {selectedVenue.address}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleOpenEdit(selectedVenue)}
              className="adm-btn-primary"
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Edit3 size={14} />
              <span>Editar Unidade</span>
            </button>

            {currentUser?.role === 'master' && (
              <button
                type="button"
                onClick={() => handleDelete(selectedVenue)}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>Excluir</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-COLUMN SPLIT: LEFT (VENUE INFO & VIDEO) | RIGHT (TEAM MEMBERS) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: VENUE INFO & VISUALS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Ballroom Visual Card */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            }}>
              <div style={{
                height: '240px',
                position: 'relative',
                backgroundImage: `url(${selectedVenue.ballroomImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(15,16,24,0.9) 100%)',
                }} />

                {/* Logo & Name Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}>
                  {selectedVenue.logoUrl && (
                    <img
                      src={selectedVenue.logoUrl}
                      alt={selectedVenue.name}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        objectFit: 'contain',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '6px',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                  )}
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFF', margin: '0 0 2px 0' }}>
                      {selectedVenue.name}
                    </h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--adm-accent)', fontWeight: 700 }}>
                      "{selectedVenue.tagline}"
                    </div>
                  </div>
                </div>
              </div>

              {/* Venue Summary & Stats */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--adm-text-title)', lineHeight: 1.6 }}>
                  {selectedVenue.description}
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '14px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                      Aniversariantes
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                      {venueDebutantes.length}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                      Equipe Ativa
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-accent)' }}>
                      {venueCollaborators.length}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                      Status
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                      ● Operando
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Player Card */}
            <VenueVideoPlayer url={selectedVenue.welcomeVideoUrl} />

          </div>

          {/* RIGHT COLUMN: TEAM MEMBERS (COLABORADORES DA CASA) */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--adm-accent)" />
                <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                  Equipe Vinculada à Casa
                </h3>
              </div>
              <span style={{ background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                {venueCollaborators.length} membros
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {venueCollaborators.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>
                  Nenhum colaborador atribuído exclusivamente a esta casa de festas.
                </div>
              ) : (
                venueCollaborators.map(collab => (
                  <div
                    key={collab.id}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {collab.avatarUrl ? (
                      <img
                        src={collab.avatarUrl}
                        alt={collab.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--adm-accent)' }}
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {collab.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {collab.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                        {collab.email}
                      </div>
                    </div>

                    <span style={{
                      background: collab.role === 'admin' ? 'rgba(59, 130, 246, 0.15)' : collab.role === 'sdr' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                      color: collab.role === 'admin' ? '#3B82F6' : collab.role === 'sdr' ? '#8B5CF6' : '#F97316',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}>
                      {collab.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 3: VENUES GRID (LIST OF CARDS)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      maxWidth: '1440px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            letterSpacing: '-0.4px',
            margin: '0 0 4px 0',
          }}>
            Casas de Festa & Unidades
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Gerencie as unidades da rede Bonomo Festas, fotos do salão, equipe e vídeos de apresentação.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="adm-btn-primary"
          style={{
            padding: '8px 18px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={16} />
          <span>Cadastrar Nova Casa</span>
        </button>
      </div>

      {/* Venues Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
      }}>
        {venues.map(venue => {
          const debutantesCount = debutantes.filter(d => d.venueId === venue.id).length;
          const activeJourneyCount = debutantes.filter(d => d.venueId === venue.id && d.hasJourneyEnabled).length;
          const teamCount = collaborators.filter(c => c.venueId === venue.id || (c.venueIds || []).includes(venue.id)).length;

          return (
            <div
              key={venue.id}
              onClick={() => handleSelectVenueDetail(venue)}
              className="saas-card"
              style={{
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'var(--adm-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--adm-border)';
              }}
            >
              {/* Ballroom Image Cover */}
              <div style={{
                height: '160px',
                position: 'relative',
                backgroundImage: `url(${venue.ballroomImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,16,24,0.9) 100%)',
                }} />

                {/* Badge Top Left */}
                <div style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-accent)',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  <Building2 size={12} />
                  <span>Unidade Ativa</span>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div>
                  <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--adm-text-title)',
                    margin: '0 0 4px 0',
                    letterSpacing: '-0.3px',
                  }}>
                    {venue.name}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                    "{venue.tagline}"
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                  <MapPin size={14} color="var(--adm-accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{venue.address}</span>
                </div>

                {/* Stats Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '10px',
                  marginTop: 'auto',
                }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Debutantes
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      {debutantesCount}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Jornadas
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-green)' }}>
                      {activeJourneyCount}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Equipe
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-accent)' }}>
                      {teamCount}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', fontWeight: 700, textAlign: 'right', marginTop: '4px' }}>
                  Ver detalhes e equipe →
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AdminConfirmModal
        isOpen={!!venueToDelete}
        onClose={() => setVenueToDelete(null)}
        onConfirm={() => {
          if (venueToDelete) {
            deleteVenue(venueToDelete.id);
            if (selectedVenueId === venueToDelete.id) {
              setSelectedVenueId(null);
              setViewMode('list');
            }
            setVenueToDelete(null);
          }
        }}
        title="Remover Casa de Festa"
        itemName={venueToDelete?.name}
        message={venueToDelete ? `Tem certeza que deseja remover a casa de festa "${venueToDelete.name}"? Esta ação não poderá ser desfeita.` : undefined}
      />
    </div>
  );
};
