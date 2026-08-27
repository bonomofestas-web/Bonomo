import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, MapPin, 
  Edit3, Trash2, Video, ArrowLeft,
  Users, Save, Target, Sparkles, Play, X, Eye, Phone, Mail, ChevronRight, CheckCircle2, Film, Loader2
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { VideoUploadField } from './VideoUploadField';
import { AdminConfirmModal } from './AdminConfirmModal';
import { resolveMediaUrl } from '../../utils/mediaStorage';
import type { Venue } from '../../types/admin';

const StoriesVenueVideoModal: React.FC<{
  venue: Venue;
  onClose: () => void;
}> = ({ venue, onClose }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (venue.welcomeVideoUrl) {
      setIsLoading(true);
      resolveMediaUrl(venue.welcomeVideoUrl)
        .then((src) => {
          if (isMounted) {
            setResolvedSrc(src);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setResolvedSrc(venue.welcomeVideoUrl || '');
            setIsLoading(false);
          }
        });
    } else {
      setResolvedSrc('');
      setIsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [venue.welcomeVideoUrl]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '420px',
          height: '85vh',
          maxHeight: '740px',
          background: '#000000',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1.5px solid rgba(212,175,55,0.4)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(212,175,55,0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Top Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={16} color="var(--adm-accent)" />
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFF' }}>
              {venue.name}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            zIndex: 5,
          }}>
            <Loader2 size={36} className="animate-spin" color="var(--adm-accent)" />
          </div>
        )}

        {/* Vertical 9:16 Video Player */}
        {resolvedSrc ? (
          <video
            src={resolvedSrc}
            controls
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          !isLoading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#FFF',
              fontSize: '0.86rem',
            }}>
              Vídeo não disponível
            </div>
          )
        )}
      </div>
    </div>
  );
};

interface AdminVenuesViewProps {
  onNavigateToFunnel?: (funnelId: string) => void;
}

export const AdminVenuesView: React.FC<AdminVenuesViewProps> = ({ onNavigateToFunnel }) => {
  const { venues, debutantes, funnels, leads, collaborators, currentUser, addVenue, updateVenue, deleteVenue } = useAdminState();
  
  // View states: 'list' | 'detail' | 'form'
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'form'>('list');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);
  const [isPlayingVideoModal, setIsPlayingVideoModal] = useState(false);

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
    setTagline('Onde momentos exclusivos se transformam em memórias inesquecíveis');
    setDescription('Espaço requintado e sofisticado preparado especialmente para noites inesquecíveis.');
    setAddress('Av. das Américas, 1500 - Barra da Tijuca, Rio de Janeiro - RJ');
    setLogoUrl('');
    setBallroomImageUrl('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80');
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
                Slogan / Frase de Impacto
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
                folder="venues"
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
                folder="venues"
              />
            </div>
          </div>

          {/* Welcome Video */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
              Vídeo de Apresentação / Boas-Vindas da Unidade (Cloudflare R2)
            </label>
            <VideoUploadField
              value={welcomeVideoUrl}
              onChange={setWelcomeVideoUrl}
              label="Vídeo da Casa de Festas"
              customKey={selectedVenueId ? `video_apresentacao_${selectedVenueId}.mp4` : undefined}
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
  // MODE 2: VENUE DETAILS & TEAM VIEW (CENTRALIZED BANNER + 2-COLUMN VIEW)
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode === 'detail' && selectedVenue) {
    const venueDebutantes = debutantes.filter(d => d.venueId === selectedVenue.id);
    const venueCollaborators = collaborators.filter(c => c.venueId === selectedVenue.id || (c.venueIds || []).includes(selectedVenue.id));
    const venueFunnels = funnels.filter(f => f.venueId === selectedVenue.id);
    const venueLeads = leads.filter(l => l.venueId === selectedVenue.id);

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
        {/* Top Header Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
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
            <span>Todas as Casas de Festa</span>
          </button>

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

        {/* ── TOP CENTRALIZED PANORAMA BANNER ───────────────────────────────── */}
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          position: 'relative',
        }}>
          <div style={{
            height: '280px',
            position: 'relative',
            backgroundImage: `url(${selectedVenue.ballroomImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
          }}>
            {/* Dark Vignette Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, rgba(15,16,24,0.65) 0%, rgba(15,16,24,0.94) 100%)',
            }} />

            {/* Centralized Typography & Logo Container */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              maxWidth: '800px',
            }}>
              {selectedVenue.logoUrl && (
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '18px',
                  background: 'rgba(0,0,0,0.75)',
                  backdropFilter: 'blur(12px)',
                  border: '1.5px solid rgba(212,175,55,0.4)',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}>
                  <img
                    src={selectedVenue.logoUrl}
                    alt={selectedVenue.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}

              <h1 style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.5px',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}>
                {selectedVenue.name}
              </h1>

              <div style={{
                fontSize: '0.92rem',
                color: 'var(--adm-accent)',
                fontWeight: 700,
                fontStyle: 'italic',
                maxWidth: '650px',
                lineHeight: 1.4,
              }}>
                "{selectedVenue.tagline}"
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: '#E2E8F0',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                padding: '5px 14px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.15)',
                marginTop: '4px',
              }}>
                <MapPin size={13} color="var(--adm-accent)" />
                <span>{selectedVenue.address}</span>
              </div>
            </div>
          </div>

          {/* Bottom venue description strip */}
          {selectedVenue.description && (
            <div style={{
              padding: '16px 28px',
              background: 'var(--adm-bg-elevated)',
              borderTop: '1px solid var(--adm-border)',
              fontSize: '0.84rem',
              color: 'var(--adm-text-muted)',
              lineHeight: 1.5,
              textAlign: 'center',
            }}>
              {selectedVenue.description}
            </div>
          )}
        </div>

        {/* ── 2-COLUMN SPLIT: LEFT (EQUIPE) | RIGHT (INFORMAÇÕES, MÉTRICAS, VÍDEO & FUNIS) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px', alignItems: 'start' }}>
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* COLUMN 1 (LEFT): EQUIPE VINCULADA À CASA                          */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
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
              <span style={{ background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', border: '1px solid var(--adm-border)' }}>
                {venueCollaborators.length} {venueCollaborators.length === 1 ? 'membro' : 'membros'}
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
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--adm-accent)' }}
                      />
                    ) : (
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {collab.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {collab.name}
                        </span>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: '6px',
                          background: collab.role === 'master' ? 'rgba(212,175,55,0.2)' : 'rgba(59,130,246,0.15)',
                          color: collab.role === 'master' ? 'var(--adm-accent)' : '#60A5FA',
                        }}>
                          {collab.role}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Mail size={11} /> {collab.email}
                        </span>
                        {collab.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Phone size={11} /> {collab.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* COLUMN 2 (RIGHT): INFORMAÇÕES, MÉTRICAS, VÍDEO & FUNIS            */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. Basic Stats Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Aniversariantes
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                  {venueDebutantes.length}
                </div>
              </div>

              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Funis Ativos
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-accent)' }}>
                  {venueFunnels.length}
                </div>
              </div>

              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Total de Leads
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38BDF8' }}>
                  {venueLeads.length}
                </div>
              </div>

              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Status Unidade
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <CheckCircle2 size={13} color="#10B981" /> Operando
                </div>
              </div>
            </div>

            {/* 2. Welcome Video File Card (Popup Modal Player on Click) */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={18} color="var(--adm-accent)" />
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Vídeo Oficial da Unidade
                  </h3>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                  Formato Vertical Stories (9:16)
                </span>
              </div>

              {selectedVenue.welcomeVideoUrl ? (
                <div style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(212,175,55,0.15)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Play size={18} color="var(--adm-accent)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedVenue.welcomeVideoName || 'Vídeo de Apresentação e Boas-Vindas'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-green)', fontWeight: 700 }}>
                        ● Pronto para reprodução
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPlayingVideoModal(true)}
                    className="adm-btn-primary"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <Eye size={13} />
                    <span>Assistir Vídeo</span>
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px dashed var(--adm-border)',
                  borderRadius: '14px',
                  padding: '18px',
                  textAlign: 'center',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}>
                  <span>Nenhum vídeo anexado a esta casa de festas.</span>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedVenue)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-accent)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Anexar agora
                  </button>
                </div>
              )}
            </div>

            {/* 3. Funnels Relationship List (Clickable to open in CRM) */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} color="var(--adm-accent)" />
                  <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Funis Comerciais da Unidade
                  </h3>
                </div>
                <span style={{ background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', border: '1px solid var(--adm-border)' }}>
                  {venueFunnels.length} {venueFunnels.length === 1 ? 'funil' : 'funis'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {venueFunnels.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 14px', color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>
                    Nenhum funil comercial criado exclusivamente para esta casa.
                  </div>
                ) : (
                  venueFunnels.map(funnel => {
                    const funnelLeadsCount = leads.filter(l => l.venueId === selectedVenue.id).length;
                    return (
                      <div
                        key={funnel.id}
                        onClick={() => {
                          if (onNavigateToFunnel) {
                            onNavigateToFunnel(funnel.id);
                          }
                        }}
                        style={{
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '14px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          cursor: onNavigateToFunnel ? 'pointer' : 'default',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (onNavigateToFunnel) {
                            e.currentTarget.style.borderColor = 'var(--adm-accent)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (onNavigateToFunnel) {
                            e.currentTarget.style.borderColor = 'var(--adm-border)';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: funnel.isPrimary ? 'rgba(212,175,55,0.2)' : 'rgba(59,130,246,0.15)',
                            border: `1px solid ${funnel.isPrimary ? 'var(--adm-accent)' : 'rgba(59,130,246,0.3)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {funnel.isPrimary ? <Sparkles size={16} color="var(--adm-accent)" /> : <Target size={16} color="#60A5FA" />}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                {funnel.name}
                              </span>
                              {funnel.isPrimary && (
                                <span style={{ fontSize: '0.62rem', background: 'rgba(212,175,55,0.2)', color: 'var(--adm-accent)', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  Principal
                                </span>
                              )}
                              {funnel.isPinned && (
                                <span style={{ fontSize: '0.62rem', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  Fixado
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                              {funnel.category} • {funnelLeadsCount} {funnelLeadsCount === 1 ? 'lead' : 'leads'} • {funnel.stagesCount || 4} etapas
                            </div>
                          </div>
                        </div>

                        {onNavigateToFunnel && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-accent)', flexShrink: 0 }}>
                            <span>Abrir no CRM</span>
                            <ChevronRight size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>

        {/* ── POPUP MODAL FOR 9:16 VERTICAL STORIES VIDEO PLAYER ─────────────── */}
        {isPlayingVideoModal && selectedVenue.welcomeVideoUrl && (
          <StoriesVenueVideoModal
            venue={selectedVenue}
            onClose={() => setIsPlayingVideoModal(false)}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 3: VENUES GRID LIST (CLEAN LUXURY MINIMALIST VIEW)
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 900,
            color: 'var(--adm-text-title)',
            margin: '0 0 4px 0',
            letterSpacing: '-0.5px',
          }}>
            Casas de Festas
          </h1>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--adm-text-muted)' }}>
            Gerencie as unidades e salões exclusivos do grupo Bonomo Festas.
          </p>
        </div>

        {currentUser?.role === 'master' && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="adm-btn-primary"
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={16} />
            <span>Cadastrar Nova Casa</span>
          </button>
        )}
      </div>

      {/* Grid of Venues (Clean & Minimalist: Photo, Name, Slogan & Address only) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '20px',
      }}>
        {venues.map(venue => {
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
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--adm-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--adm-border)';
              }}
            >
              {/* Ballroom Image Cover */}
              <div style={{
                height: '180px',
                position: 'relative',
                backgroundImage: `url(${venue.ballroomImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(15,16,24,0.92) 100%)',
                }} />

                {/* Badge Top Left */}
                <div style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  background: 'rgba(0,0,0,0.75)',
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

                {/* Logo Overlay Bottom Left */}
                {venue.logoUrl && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '16px',
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img
                      src={venue.logoUrl}
                      alt={venue.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>

              {/* Clean Minimalist Body: Name, Slogan & Address */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    color: 'var(--adm-text-title)',
                    margin: '0 0 4px 0',
                    letterSpacing: '-0.3px',
                  }}>
                    {venue.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-accent)', fontWeight: 700 }}>
                    "{venue.tagline}"
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
                  <MapPin size={14} color="var(--adm-accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{venue.address}</span>
                </div>

                <div style={{
                  fontSize: '0.74rem',
                  color: 'var(--adm-accent)',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '4px',
                  marginTop: 'auto',
                  paddingTop: '8px',
                }}>
                  <span>Acessar Detalhes</span>
                  <ChevronRight size={14} />
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
