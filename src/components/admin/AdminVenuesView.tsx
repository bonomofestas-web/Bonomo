import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Building2, Plus, MapPin, 
  Trash2, Video, ArrowLeft,
  Users, Target, Play, X, Eye, Phone, Mail, ChevronRight, Film, Loader2,
  Navigation, Image as ImageIcon, Camera, Pencil, Upload, Check, Power
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminVenueModal } from './AdminVenueModal';
import { AdminDeleteVenueModal } from './AdminDeleteVenueModal';
import { resolveMediaUrl } from '../../utils/mediaStorage';
import { formatPhone } from '../../utils/phoneFormatter';
import { cloudflareR2Service } from '../../lib/cloudflareR2';
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
              Vídeo de Indicação • {venue.name}
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
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-text-muted)',
              padding: '20px',
              textAlign: 'center',
            }}>
              <Video size={48} color="var(--adm-text-muted)" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem', color: '#FFF', margin: 0 }}>Nenhum vídeo disponível no momento.</p>
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
  const { 
    venues, 
    collaborators, 
    leads, 
    funnels,
    sources,
    debutantes, 
    currentUser,
    deleteVenue,
    updateVenue,
  } = useAdminState();

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);
  const [isPlayingVideoModal, setIsPlayingVideoModal] = useState(false);

  // Modal apenas para CRIAÇÃO de nova casa
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [venueToEditModal, setVenueToEditModal] = useState<Venue | null>(null);

  // ── Edição Dinâmica & Uploads Nativos R2 ──────────────────────────────────
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | number>('');

  // Dropdown de ações de mídia: 'banner' | 'logo' | 'ballroom' | 'video' | null
  const [openMediaMenu, setOpenMediaMenu] = useState<'banner' | 'logo' | 'ballroom' | 'video' | null>(null);

  // Status de upload
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadSuccessField, setUploadSuccessField] = useState<string | null>(null);

  // Refs para inputs de arquivo ocultos
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const ballroomFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const selectedVenue = venues.find(v => v.id === selectedVenueId) || null;

  // Upload direto para Cloudflare R2 com atualização instantânea e feedback visual
  const handleFileUpload = useCallback(async (
    field: 'bannerImageUrl' | 'logoUrl' | 'ballroomImageUrl' | 'welcomeVideoUrl',
    file: File
  ) => {
    if (!selectedVenue) return;
    setOpenMediaMenu(null);
    setUploadingField(field);
    try {
      const isVideo = field === 'welcomeVideoUrl';
      const folder = isVideo ? 'videos' : 'venues';
      const customKey = isVideo ? `video_indicacao_${selectedVenue.id}.mp4` : undefined;
      const url = await cloudflareR2Service.uploadFile(file, folder, undefined, customKey);

      const updates: Partial<Venue> = { [field]: url };
      if (isVideo && file.name) {
        updates.welcomeVideoName = file.name;
      }
      await updateVenue(selectedVenue.id, updates);
      setUploadSuccessField(field);
      setTimeout(() => setUploadSuccessField(null), 2500);
    } catch (err) {
      console.error('Erro ao fazer upload de mídia:', field, err);
      alert('Não foi possível enviar o arquivo. Verifique sua conexão e tente novamente.');
    } finally {
      setUploadingField(null);
    }
  }, [selectedVenue, updateVenue]);

  // Salva um campo individualmente e sai do modo edição daquele campo
  const handleQuickSave = useCallback(async (field: string, value: string | number) => {
    if (!selectedVenue) return;
    const trimmed = typeof value === 'string' ? value.trim() : value;
    if (trimmed === '' && field === 'name') return; // nome não pode ficar vazio
    try {
      await updateVenue(selectedVenue.id, { [field]: trimmed || undefined });
    } catch (err) {
      console.error('Erro ao salvar campo:', field, err);
    } finally {
      setEditingField(null);
    }
  }, [selectedVenue, updateVenue]);

  const startEditing = useCallback((field: string, currentValue: string | number) => {
    setEditingField(field);
    setEditingValue(currentValue ?? '');
    setOpenMediaMenu(null);
  }, []);

  const commitEdit = useCallback(() => {
    if (editingField) handleQuickSave(editingField, editingValue);
  }, [editingField, editingValue, handleQuickSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      setEditingField(null);
    }
  }, [commitEdit]);

  const handleOpenCreate = () => {
    setVenueToEditModal(null);
    setIsVenueModalOpen(true);
  };

  const handleSelectVenueDetail = (v: Venue) => {
    setSelectedVenueId(v.id);
    setViewMode('detail');
    setEditingField(null);
    setOpenMediaMenu(null);
  };

  const handleDelete = (v: Venue) => {
    setVenueToDelete(v);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // MODE 1: VENUE DETAILS — LANDING PAGE VIEW (com Edição Dinâmica Facebook)
  // ───────────────────────────────────────────────────────────────────────────
  if (viewMode === 'detail' && selectedVenue) {
    const venueDebutantes = debutantes.filter(d => d.venueId === selectedVenue.id);
    const venueCollaborators = collaborators.filter(c =>
      c.venueId === selectedVenue.id ||
      c.venueId === 'all' ||
      (c.venueIds || []).includes(selectedVenue.id)
    );
    const venueSources = sources.filter(s => s.venueId === selectedVenue.id || s.venueId === 'all');
    const venueLeads = leads.filter(l => l.venueId === selectedVenue.id);

    const bannerCoverUrl = selectedVenue.bannerImageUrl || selectedVenue.ballroomImageUrl
      || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80';
    const invitePhotoUrl = selectedVenue.ballroomImageUrl || selectedVenue.bannerImageUrl
      || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80';

    const mapsDirectLink = `https://maps.google.com/?q=${encodeURIComponent(`${selectedVenue.name} ${selectedVenue.address || ''}`)}`.trim();
    const mapEmbedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(selectedVenue.address || selectedVenue.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    // Estilo de input transparente que mantém a altura e aparência do texto original
    const ghostInput = (extra?: React.CSSProperties): React.CSSProperties => ({
      background: 'transparent',
      border: 'none',
      borderBottom: '1.5px solid var(--adm-accent)',
      outline: 'none',
      color: 'inherit',
      fontSize: 'inherit',
      fontWeight: 'inherit',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 'inherit',
      padding: '4px 6px',
      width: '100%',
      boxSizing: 'border-box' as const,
      ...extra,
    });

    // Botão de lápis inline — aparece ao lado de texto editável
    const PencilBtn = ({ field, value, size = 11 }: { field: string; value: string | number; size?: number }) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          startEditing(field, value);
        }}
        title="Editar"
        style={{
          background: 'rgba(212,175,55,0.12)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '6px',
          padding: '3px 6px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          color: 'var(--adm-accent)',
          marginLeft: '6px',
          flexShrink: 0,
          verticalAlign: 'middle',
          opacity: 0.75,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; }}
      >
        <Pencil size={size} />
      </button>
    );

    return (
      <div 
        onClick={() => setOpenMediaMenu(null)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          padding: '24px 20px 80px 20px',
          boxSizing: 'border-box',
          animation: 'fadeIn 0.25s ease-out',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Hidden File Inputs for Native Direct Uploads */}
        <input
          type="file"
          ref={bannerFileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileUpload('bannerImageUrl', e.target.files[0]);
            e.target.value = '';
          }}
        />
        <input
          type="file"
          ref={logoFileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileUpload('logoUrl', e.target.files[0]);
            e.target.value = '';
          }}
        />
        <input
          type="file"
          ref={ballroomFileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileUpload('ballroomImageUrl', e.target.files[0]);
            e.target.value = '';
          }}
        />
        <input
          type="file"
          ref={videoFileInputRef}
          accept="video/mp4,video/quicktime,video/webm"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileUpload('welcomeVideoUrl', e.target.files[0]);
            e.target.value = '';
          }}
        />

        {/* Container Centralizado Mais Estreito (Estilo Landing Page Premium) */}
        <div style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          {/* Top Header Navigation Bar (Limpo: apenas retorno) */}
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
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowLeft size={16} />
              <span>Todas as Casas de Festa</span>
            </button>
          </div>

          {/* ── 1. BANNER PANORÂMICO COM EDIÇÃO DINÂMICA DIRETA ─────────────────────────── */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            position: 'relative',
            filter: selectedVenue.active === false ? 'grayscale(100%)' : 'none',
            transition: 'filter 0.3s ease',
          }}>
            {/* Banner Background */}
            <div style={{
              height: '300px',
              position: 'relative',
              backgroundImage: `url(${bannerCoverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '28px 20px',
            }}>
              {/* Vignette */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(15,16,24,0.5) 0%, rgba(15,16,24,0.92) 100%)',
              }} />

              {/* Botão de Power / Status da Unidade (Top-Left) */}
              <div 
                style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 12 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    const nextActive = selectedVenue.active === false ? true : false;
                    updateVenue(selectedVenue.id, { active: nextActive });
                  }}
                  title={selectedVenue.active === false ? 'Unidade Desativada • Clique para ativar' : 'Unidade Ativa • Clique para desativar'}
                  style={{
                    background: selectedVenue.active !== false ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: `1.5px solid ${selectedVenue.active !== false ? '#10B981' : 'rgba(255, 255, 255, 0.25)'}`,
                    color: selectedVenue.active !== false ? '#10B981' : '#94A3B8',
                    borderRadius: '12px',
                    padding: '7px 14px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: selectedVenue.active !== false ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Power size={14} />
                  <span>{selectedVenue.active !== false ? 'Unidade Ativa' : 'Unidade Desativada'}</span>
                </button>
              </div>

              {/* Botão Flutuante de Alterar Foto de Capa / Banner (Top-Right) */}
              <div 
                style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 12 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setOpenMediaMenu(openMediaMenu === 'banner' ? null : 'banner')}
                  disabled={uploadingField === 'bannerImageUrl'}
                  style={{
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(212,175,55,0.4)',
                    color: uploadSuccessField === 'bannerImageUrl' ? '#10B981' : 'var(--adm-accent)',
                    borderRadius: '12px',
                    padding: '7px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {uploadingField === 'bannerImageUrl' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : uploadSuccessField === 'bannerImageUrl' ? (
                    <>
                      <Check size={13} color="#10B981" />
                      <span>Capa Atualizada</span>
                    </>
                  ) : (
                    <>
                      <Camera size={14} />
                      <span>Editar Capa</span>
                    </>
                  )}
                </button>

                {/* Dropdown de Ações da Capa */}
                {openMediaMenu === 'banner' && (
                  <div style={{
                    position: 'absolute',
                    top: '40px',
                    right: 0,
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '14px',
                    padding: '6px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                    zIndex: 40,
                    minWidth: '170px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    animation: 'fadeIn 0.15s ease-out',
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMediaMenu(null);
                        bannerFileInputRef.current?.click();
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-text-title)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Upload size={14} color="var(--adm-accent)" />
                      <span>{selectedVenue.bannerImageUrl ? 'Substituir Foto' : 'Inserir Foto'}</span>
                    </button>
                    {selectedVenue.bannerImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMediaMenu(null);
                          handleQuickSave('bannerImageUrl', '');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textAlign: 'left',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={14} />
                        <span>Remover Foto</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Conteúdo Central do Banner */}
              <div style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                maxWidth: '820px',
                width: '100%',
              }}>
                {/* Logotipo PNG sobreposto diretamente sobre o banner com botão de edição */}
                <div 
                  style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {uploadingField === 'logoUrl' ? (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Loader2 size={32} color="var(--adm-accent)" className="animate-spin" />
                    </div>
                  ) : selectedVenue.logoUrl ? (
                    <img
                      src={selectedVenue.logoUrl}
                      alt={selectedVenue.name}
                      style={{
                        maxHeight: '90px',
                        maxWidth: '240px',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.9))',
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      background: 'rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(8px)',
                      border: '1px dashed rgba(212,175,55,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--adm-accent)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}>
                      <Building2 size={24} />
                      <span>Sem Logotipo</span>
                    </div>
                  )}

                  {/* Botão Discreto de Câmera na Logo */}
                  <button
                    type="button"
                    onClick={() => setOpenMediaMenu(openMediaMenu === 'logo' ? null : 'logo')}
                    title="Opções do Logotipo"
                    disabled={uploadingField === 'logoUrl'}
                    style={{
                      position: 'absolute',
                      bottom: '-6px',
                      right: '-10px',
                      background: uploadSuccessField === 'logoUrl' ? '#10B981' : 'rgba(0,0,0,0.75)',
                      color: uploadSuccessField === 'logoUrl' ? '#FFFFFF' : 'var(--adm-accent)',
                      border: '1.5px solid rgba(212,175,55,0.6)',
                      backdropFilter: 'blur(6px)',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
                      transition: 'all 0.15s ease',
                      zIndex: 10,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {uploadSuccessField === 'logoUrl' ? (
                      <Check size={13} color="#FFFFFF" />
                    ) : (
                      <Camera size={13} />
                    )}
                  </button>

                  {/* Dropdown de Ações do Logotipo */}
                  {openMediaMenu === 'logo' && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '8px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '14px',
                      padding: '6px',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                      zIndex: 40,
                      minWidth: '170px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      animation: 'fadeIn 0.15s ease-out',
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMediaMenu(null);
                          logoFileInputRef.current?.click();
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-text-title)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textAlign: 'left',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Upload size={14} color="var(--adm-accent)" />
                        <span>{selectedVenue.logoUrl ? 'Substituir Logo' : 'Inserir Logo'}</span>
                      </button>
                      {selectedVenue.logoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMediaMenu(null);
                            handleQuickSave('logoUrl', '');
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Trash2 size={14} />
                          <span>Remover Logo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Nome da Casa (Editável no Banner) */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editingField === 'name' ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      style={ghostInput({
                        fontSize: 'clamp(1.8rem, 3.5vw, 2.3rem)',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        textAlign: 'center',
                        letterSpacing: '-0.5px',
                        maxWidth: '650px',
                        minHeight: '44px',
                        lineHeight: 1.2,
                      })}
                      placeholder="Nome da Casa de Festas"
                    />
                  ) : (
                    <h1 style={{
                      fontSize: 'clamp(1.8rem, 3.5vw, 2.3rem)',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      margin: 0,
                      letterSpacing: '-0.5px',
                      textShadow: '0 3px 12px rgba(0,0,0,0.85)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1.2,
                    }}>
                      <span>{selectedVenue.name}</span>
                      <PencilBtn field="name" value={selectedVenue.name} size={14} />
                    </h1>
                  )}
                </div>

                {/* Tagline / Slogan (Editável no Banner) */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editingField === 'tagline' ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      style={ghostInput({
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        fontStyle: 'italic',
                        color: 'var(--adm-accent)',
                        textAlign: 'center',
                        maxWidth: '600px',
                        minHeight: '30px',
                        lineHeight: 1.4,
                      })}
                      placeholder="Frase de apresentação ou slogan..."
                    />
                  ) : (
                    <div style={{
                      fontSize: '0.96rem',
                      color: 'var(--adm-accent)',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      maxWidth: '680px',
                      lineHeight: 1.4,
                      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span>{selectedVenue.tagline ? `"${selectedVenue.tagline}"` : 'Adicionar slogan da unidade'}</span>
                      <PencilBtn field="tagline" value={selectedVenue.tagline || ''} size={12} />
                    </div>
                  )}
                </div>

                {/* Endereço no Banner (Apenas Exibição — Edição fica na seção Localização abaixo) */}
                {selectedVenue.address && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: '#E2E8F0',
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.18)',
                    marginTop: '2px',
                  }}>
                    <MapPin size={13} color="var(--adm-accent)" />
                    <span>{selectedVenue.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. FILEIRA 1 DE MÉTRICAS (4 cards fixos abaixo do banner) ───────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
          }}>
            {/* Aniversariantes */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                Aniversariantes
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                {venueDebutantes.length}
              </span>
            </div>

            {/* Funis Ativos */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                Origens Ativas
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-accent)' }}>
                {venueSources.length}
              </span>
            </div>

            {/* Total Leads */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                Total de Leads
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38BDF8' }}>
                {venueLeads.length}
              </span>
            </div>

            {/* Status da Unidade */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                Status da Unidade
              </span>
              <div style={{ 
                fontSize: '0.88rem', 
                fontWeight: 800, 
                color: selectedVenue.active !== false ? '#10B981' : '#94A3B8', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginTop: '4px' 
              }}>
                <Power size={15} color={selectedVenue.active !== false ? '#10B981' : '#94A3B8'} />
                <span>{selectedVenue.active !== false ? 'Operando' : 'Desativada (Pausada)'}</span>
              </div>
            </div>
          </div>

          {/* ── 3. APRESENTAÇÃO EDITORIAL DA CASA (com edição inline da descrição e foto) ────────── */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            padding: '32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            alignItems: 'start',
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
            filter: selectedVenue.active === false ? 'grayscale(100%)' : 'none',
            transition: 'filter 0.3s ease',
          }}>
            {/* Coluna Esquerda: Foto dos Convites (com dropdown nativo) */}
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1.5px solid rgba(212,175,55,0.35)',
              boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
              position: 'relative',
              minHeight: '240px',
            }}>
              <img
                src={invitePhotoUrl}
                alt={selectedVenue.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  minHeight: '240px',
                }}
              />
              
              {/* Badge da foto */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(212,175,55,0.4)',
                color: 'var(--adm-accent)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                <ImageIcon size={12} />
                <span>Foto Oficial dos Convites (RSVP)</span>
              </div>

              {/* Botão de Trocar Foto dos Convites */}
              <div 
                style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 12 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setOpenMediaMenu(openMediaMenu === 'ballroom' ? null : 'ballroom')}
                  disabled={uploadingField === 'ballroomImageUrl'}
                  style={{
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(212,175,55,0.4)',
                    color: uploadSuccessField === 'ballroomImageUrl' ? '#10B981' : 'var(--adm-accent)',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  {uploadingField === 'ballroomImageUrl' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : uploadSuccessField === 'ballroomImageUrl' ? (
                    <>
                      <Check size={13} color="#10B981" />
                      <span>Foto Atualizada</span>
                    </>
                  ) : (
                    <>
                      <Camera size={13} />
                      <span>Trocar Foto</span>
                    </>
                  )}
                </button>

                {/* Dropdown de Ações da Foto dos Convites */}
                {openMediaMenu === 'ballroom' && (
                  <div style={{
                    position: 'absolute',
                    top: '36px',
                    right: 0,
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '14px',
                    padding: '6px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                    zIndex: 40,
                    minWidth: '170px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    animation: 'fadeIn 0.15s ease-out',
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMediaMenu(null);
                        ballroomFileInputRef.current?.click();
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-text-title)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Upload size={14} color="var(--adm-accent)" />
                      <span>{selectedVenue.ballroomImageUrl ? 'Substituir Foto' : 'Inserir Foto'}</span>
                    </button>
                    {selectedVenue.ballroomImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMediaMenu(null);
                          handleQuickSave('ballroomImageUrl', '');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textAlign: 'left',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={14} />
                        <span>Remover Foto</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita: Texto Editorial */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: 'var(--adm-accent-bg)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-accent)',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '4px 12px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  Apresentação da Casa
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                  Unidade Oficial F5 System
                </span>
              </div>

              {/* Nome da Casa (Exibição consistente sem lápis duplicado) */}
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.3px',
                lineHeight: 1.25,
              }}>
                {selectedVenue.name}
              </h2>

              {/* Tagline / Slogan da Casa (Exibição consistente sem lápis duplicado) */}
              {selectedVenue.tagline && (
                <div style={{ fontSize: '0.9rem', color: 'var(--adm-accent)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.4 }}>
                  "{selectedVenue.tagline}"
                </div>
              )}

              {/* Descrição Oficial (Editável aqui) */}
              {editingField === 'description' ? (
                <div>
                  <textarea
                    autoFocus
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={commitEdit}
                    rows={4}
                    style={ghostInput({
                      fontSize: '0.88rem',
                      resize: 'vertical',
                      lineHeight: 1.6,
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-accent)',
                      borderRadius: '10px',
                      padding: '10px',
                      minHeight: '100px',
                    })}
                    placeholder="Conte a história e diferenciais da casa..."
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
                    Clique fora para salvar automaticamente
                  </div>
                </div>
              ) : (
                <p style={{
                  fontSize: '0.88rem',
                  color: 'var(--adm-text-muted)',
                  lineHeight: 1.6,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                }}>
                  <span style={{ flex: 1 }}>
                    {selectedVenue.description || 'Espaço requintado e sofisticado preparado especialmente para celebrações inesquecíveis, alta gastronomia e conforto incomparável.'}
                  </span>
                  <PencilBtn field="description" value={selectedVenue.description || ''} size={11} />
                </p>
              )}

              {/* Experiência / História (Editável aqui) */}
              {editingField === 'experienceText' ? (
                <div>
                  <textarea
                    autoFocus
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={commitEdit}
                    rows={2}
                    style={ghostInput({
                      fontSize: '0.84rem',
                      fontStyle: 'italic',
                      resize: 'vertical',
                      lineHeight: 1.5,
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-accent)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      minHeight: '60px',
                    })}
                    placeholder="Ex: Mais de 15 anos realizando sonhos inesquecíveis..."
                  />
                </div>
              ) : (
                <div style={{
                  borderLeft: '2px solid var(--adm-accent)',
                  paddingLeft: '14px',
                  fontSize: '0.82rem',
                  color: 'var(--adm-text-title)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ flex: 1 }}>
                    {selectedVenue.experienceText ? `"${selectedVenue.experienceText}"` : 'Adicionar texto de tradição e experiência'}
                  </span>
                  <PencilBtn field="experienceText" value={selectedVenue.experienceText || ''} size={11} />
                </div>
              )}
            </div>
          </div>

          {/* ── 4. FILEIRA 2 DE MÉTRICAS: Tradição / Eventos / Convidados (editáveis inline) ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {/* Tradição */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Tradição</span>
              {editingField === 'yearsInBusiness' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    autoFocus
                    value={editingValue}
                    onChange={e => setEditingValue(Number(e.target.value))}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    style={ghostInput({ width: '70px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 900, minHeight: '32px' })}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>anos</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-accent)' }}>
                    +{selectedVenue.yearsInBusiness || 15} Anos
                  </span>
                  <PencilBtn field="yearsInBusiness" value={selectedVenue.yearsInBusiness || 15} />
                </div>
              )}
            </div>

            {/* Eventos */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Eventos Realizados</span>
              {editingField === 'eventsCompleted' ? (
                <input
                  type="number"
                  autoFocus
                  value={editingValue}
                  onChange={e => setEditingValue(Number(e.target.value))}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  style={ghostInput({ fontSize: '1.2rem', fontWeight: 900, width: '100%', minHeight: '32px' })}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                    +{selectedVenue.eventsCompleted?.toLocaleString('pt-BR') || '1.200'}
                  </span>
                  <PencilBtn field="eventsCompleted" value={selectedVenue.eventsCompleted || 1200} />
                </div>
              )}
            </div>

            {/* Convidados */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Convidados Encantados</span>
              {editingField === 'guestsDelighted' ? (
                <input
                  type="number"
                  autoFocus
                  value={editingValue}
                  onChange={e => setEditingValue(Number(e.target.value))}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  style={ghostInput({ fontSize: '1.2rem', fontWeight: 900, width: '100%', minHeight: '32px' })}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10B981' }}>
                    +{selectedVenue.guestsDelighted?.toLocaleString('pt-BR') || '80.000'}
                  </span>
                  <PencilBtn field="guestsDelighted" value={selectedVenue.guestsDelighted || 80000} />
                </div>
              )}
            </div>
          </div>

          {/* ── 5. SEÇÃO DE EQUIPE VINCULADA À CASA (SEM SOMBRAS CORTADAS) ────────── */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          }}>
            {/* Header da Seção */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--adm-accent-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-accent)',
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Equipe Vinculada à Casa
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                    Colaboradores autorizados com acesso aos leads e eventos desta unidade
                  </p>
                </div>
              </div>

              <span style={{
                background: 'var(--adm-accent-bg)',
                color: 'var(--adm-accent)',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '14px',
                border: '1px solid var(--adm-border)',
              }}>
                {venueCollaborators.length} {venueCollaborators.length === 1 ? 'membro' : 'membros'}
              </span>
            </div>

            {/* Lista/Carrossel de Cards dos Colaboradores (Sem sombras cortando) */}
            {venueCollaborators.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '36px 14px',
                background: 'var(--adm-bg-input)',
                borderRadius: '16px',
                border: '1px dashed var(--adm-border)',
                color: 'var(--adm-text-muted)',
                fontSize: '0.84rem',
              }}>
                Nenhum colaborador atribuído a esta casa de festas.
              </div>
            ) : (
              <div style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollSnapType: 'x mandatory',
                justifyContent: 'flex-start',
              }}>
                {venueCollaborators.map(collab => (
                  <div
                    key={collab.id}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '18px',
                      padding: '20px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      minWidth: '220px',
                      maxWidth: '240px',
                      flexShrink: 0,
                      scrollSnapAlign: 'start',
                      boxShadow: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Foto / Avatar no Topo */}
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      {collab.avatarUrl ? (
                        <img
                          src={collab.avatarUrl}
                          alt={collab.name}
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--adm-accent)',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'var(--adm-accent-bg)',
                          color: 'var(--adm-accent)',
                          fontWeight: 900,
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid var(--adm-accent)',
                        }}>
                          {collab.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Nome do Colaborador */}
                    <div style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: 'var(--adm-text-title)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                    }}>
                      {collab.name}
                    </div>

                    {/* Badge de Cargo */}
                    <span style={{
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      background: collab.role === 'master' ? 'rgba(212,175,55,0.2)' : 'rgba(59,130,246,0.15)',
                      color: collab.role === 'master' ? 'var(--adm-accent)' : '#60A5FA',
                      marginTop: '6px',
                      marginBottom: '12px',
                    }}>
                      {collab.role}
                    </span>

                    {/* Contatos */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      fontSize: '0.72rem',
                      color: 'var(--adm-text-muted)',
                      width: '100%',
                      borderTop: '1px solid var(--adm-border)',
                      paddingTop: '10px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }} title={collab.email}>
                        <Mail size={12} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{collab.email}</span>
                      </div>

                      {collab.phone && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                        }}>
                          <Phone size={12} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                          <span>{formatPhone(collab.phone)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 6. VÍDEO OFICIAL DE INDICAÇÃO DA UNIDADE (9:16 STORIES) ────────── */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--adm-accent-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-accent)',
                }}>
                  <Video size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Vídeo de Indicação da Unidade
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                    Material oficial vertical (9:16) utilizado para apresentação e indicação da casa
                  </p>
                </div>
              </div>

              <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                Stories (9:16)
              </span>
            </div>

            {selectedVenue.welcomeVideoUrl ? (
              <div style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(212,175,55,0.15)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {uploadingField === 'welcomeVideoUrl' ? (
                      <Loader2 size={20} color="var(--adm-accent)" className="animate-spin" />
                    ) : (
                      <Play size={20} color="var(--adm-accent)" />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {uploadingField === 'welcomeVideoUrl' 
                        ? 'Enviando novo vídeo...' 
                        : (selectedVenue.welcomeVideoName || 'Vídeo de Indicação Oficial da Casa')}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: uploadSuccessField === 'welcomeVideoUrl' ? '#10B981' : 'var(--adm-green)', fontWeight: 700, marginTop: '2px' }}>
                      {uploadSuccessField === 'welcomeVideoUrl' ? '● Vídeo atualizado com sucesso' : '● Pronto para reprodução e compartilhamento'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsPlayingVideoModal(true)}
                    className="adm-btn-primary"
                    style={{
                      padding: '9px 18px',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Eye size={15} />
                    <span>Assistir Vídeo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    disabled={uploadingField === 'welcomeVideoUrl'}
                    style={{
                      background: 'rgba(212,175,55,0.12)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: 'var(--adm-accent)',
                      borderRadius: '12px',
                      padding: '9px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={14} />
                    <span>Substituir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickSave('welcomeVideoUrl', '')}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                      borderRadius: '12px',
                      padding: '9px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Remover Vídeo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'var(--adm-bg-input)',
                border: '1px dashed var(--adm-border)',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)' }}>
                  Nenhum vídeo de indicação vertical (9:16) anexado a esta casa de festas.
                </div>
                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  disabled={uploadingField === 'welcomeVideoUrl'}
                  className="adm-btn-primary"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {uploadingField === 'welcomeVideoUrl' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Enviando Vídeo...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Anexar Vídeo de Indicação (9:16)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── 7. CANAIS DE ORIGEM & ROTEAMENTO PARA OS FUNIS DA CONTA ────────── */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--adm-accent-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-accent)',
                }}>
                  <Target size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Canais de Origem & Roteamento de Leads
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                    Origens de captação vinculadas a esta casa e seus respectivos funis de conversão
                  </p>
                </div>
              </div>

              <span style={{
                background: 'var(--adm-accent-bg)',
                color: 'var(--adm-accent)',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '14px',
                border: '1px solid var(--adm-border)',
              }}>
                {venueSources.length} {venueSources.length === 1 ? 'origem' : 'origens'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {venueSources.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '24px 14px',
                  background: 'var(--adm-bg-input)',
                  borderRadius: '16px',
                  border: '1px dashed var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.84rem',
                }}>
                  Nenhuma origem de captação vinculada a esta casa. Configure em <strong>Origens de Leads</strong>.
                </div>
              ) : (
                venueSources.map(source => {
                  const destFunnel = funnels.find(f => f.id === source.funnelId);
                  const sourceLeadsCount = leads.filter(l => l.venueId === selectedVenue.id && l.sourceId === source.id).length;

                  return (
                    <div
                      key={source.id}
                      onClick={() => {
                        if (source.funnelId && onNavigateToFunnel) {
                          onNavigateToFunnel(source.funnelId);
                        }
                      }}
                      style={{
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '16px',
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        cursor: (source.funnelId && onNavigateToFunnel) ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (source.funnelId && onNavigateToFunnel) {
                          e.currentTarget.style.borderColor = 'var(--adm-accent)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (source.funnelId && onNavigateToFunnel) {
                          e.currentTarget.style.borderColor = 'var(--adm-border)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: 'rgba(212, 175, 55, 0.12)',
                          color: 'var(--adm-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Target size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              {source.name}
                            </span>
                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              background: 'var(--adm-accent-bg)',
                              color: 'var(--adm-accent)',
                              border: '1px solid var(--adm-accent)',
                              borderRadius: '6px',
                              padding: '1px 6px',
                            }}>
                              {source.type?.toUpperCase() || 'CANAL'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '3px' }}>
                            Direciona para: <strong style={{ color: 'var(--adm-text-title)' }}>{destFunnel?.name || 'Funil Comercial da Conta'}</strong> • {sourceLeadsCount} leads captados
                          </div>
                        </div>
                      </div>

                      {source.funnelId && onNavigateToFunnel && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--adm-accent)',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}>
                          <span>Abrir Funil</span>
                          <ChevronRight size={15} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── 8. RODAPÉ: LOCALIZAÇÃO, MAPA & CANAIS COMERCIAIS ──────── */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          }}>
            {/* Header de Localização (Editável aqui) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--adm-accent-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-accent)',
                }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Localização
                  </h3>
                  {editingField === 'address' ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      placeholder="Endereço completo da unidade..."
                      style={ghostInput({
                        fontSize: '0.78rem',
                        marginTop: '4px',
                        width: '380px',
                        maxWidth: '100%',
                        minHeight: '28px',
                      })}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                      <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                        {selectedVenue.address || 'Endereço não informado'}
                      </p>
                      <PencilBtn field="address" value={selectedVenue.address || ''} size={11} />
                    </div>
                  )}
                </div>
              </div>

              {/* Botão Google Maps (auto-gerado) */}
              <a
                href={mapsDirectLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  padding: '9px 16px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Navigation size={14} color="var(--adm-accent)" />
                <span>Abrir no Google Maps</span>
              </a>
            </div>

            {/* Mapa Interativo Embed (Google Maps) */}
            <div style={{
              width: '100%',
              height: '280px',
              borderRadius: '18px',
              overflow: 'hidden',
              border: '1px solid var(--adm-border)',
              background: '#1A1C24',
            }}>
              <iframe
                title={`Mapa ${selectedVenue.name}`}
                src={mapEmbedSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Canais Comerciais / Contatos Inline Editáveis */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              borderTop: '1px solid var(--adm-border)',
              paddingTop: '20px',
            }}>
              {/* WhatsApp */}
              <div style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Phone size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '4px' }}>
                    WhatsApp Comercial
                  </div>
                  {editingField === 'whatsappNumber' ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      placeholder="(XX) XXXXX-XXXX"
                      style={ghostInput({ fontSize: '0.88rem', fontWeight: 800, minHeight: '28px' })}
                    />
                  ) : (
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center' }}>
                      <span>{selectedVenue.whatsappNumber || selectedVenue.phone || 'Não informado'}</span>
                      <PencilBtn field="whatsappNumber" value={selectedVenue.whatsappNumber || selectedVenue.phone || ''} size={11} />
                    </div>
                  )}
                </div>
              </div>

              {/* E-mail */}
              <div style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60A5FA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Mail size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '4px' }}>
                    E-mail Oficial
                  </div>
                  {editingField === 'email' ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      placeholder="contato@casa.com.br"
                      type="email"
                      style={ghostInput({ fontSize: '0.88rem', fontWeight: 800, minHeight: '28px' })}
                    />
                  ) : (
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {selectedVenue.email || 'Não informado'}
                      </span>
                      <PencilBtn field="email" value={selectedVenue.email || ''} size={11} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 9. LINK DISCRETO DE EXCLUSÃO (NO FINAL DA PÁGINA) ──────── */}
          {(currentUser?.role === 'master' || currentUser?.role === 'dev') && (
            <div style={{ textAlign: 'center', padding: '16px 0 8px 0' }}>
              <button
                type="button"
                onClick={() => handleDelete(selectedVenue)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  opacity: 0.65,
                  transition: 'all 0.15s ease',
                  padding: '4px 8px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = '#EF4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.65';
                  e.currentTarget.style.color = 'var(--adm-text-muted)';
                }}
              >
                Excluir esta casa de festas
              </button>
            </div>
          )}
        </div>

        {/* ── POPUP MODAL FOR 9:16 VERTICAL STORIES VIDEO PLAYER ─────────────── */}
        {isPlayingVideoModal && selectedVenue.welcomeVideoUrl && (
          <StoriesVenueVideoModal
            venue={selectedVenue}
            onClose={() => setIsPlayingVideoModal(false)}
          />
        )}

        {/* ── MODAL PREMIUM DE CRIAÇÃO (PADRÃO ADMINNEWLEADMODAL) ────── */}
        <AdminVenueModal
          isOpen={isVenueModalOpen}
          onClose={() => setIsVenueModalOpen(false)}
          venueToEdit={venueToEditModal}
        />

        {/* Modal Seguro de Exclusão */}
        <AdminDeleteVenueModal
          isOpen={!!venueToDelete}
          onClose={() => setVenueToDelete(null)}
          venue={venueToDelete}
          debutantes={debutantes}
          totalLeadsCount={leads.filter(l => l.venueId === venueToDelete?.id || l.venueName === venueToDelete?.name).length}
          onConfirmDelete={async (id) => {
            const res = await deleteVenue(id);
            if (res.success) {
              if (selectedVenueId === id) {
                setSelectedVenueId(null);
                setViewMode('list');
              }
              setVenueToDelete(null);
            }
            return res;
          }}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: VENUES GRID LIST (CLEAN LUXURY MINIMALIST VIEW — SEM LIXEIRAS NOS CARDS)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
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
            Gerencie as unidades e salões exclusivos da rede F5 System.
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

      {/* Grid of Venues or Empty State */}
      {venues.length === 0 ? (
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px dashed var(--adm-border)',
          borderRadius: '16px',
          padding: '56px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
            background: 'var(--adm-accent-bg)',
            color: 'var(--adm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Building2 size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 8px 0' }}>
              Registre sua Primeira Casa de Festas
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--adm-text-muted)', margin: 0, maxWidth: '460px', lineHeight: 1.5 }}>
              Para começar a utilizar o CRM, distribuir leads e gerenciar sua equipe, adicione a primeira unidade no sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="adm-btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(20, 169, 215, 0.35)',
            }}
          >
            <Plus size={18} />
            <span>Registrar Minha Primeira Casa de Festas</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '20px',
        }}>
          {venues.map(venue => {
            const coverImage = venue.bannerImageUrl || venue.ballroomImageUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80';
            const isVenueActive = venue.active !== false;

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
                  opacity: isVenueActive ? 1 : 0.7,
                  filter: isVenueActive ? 'none' : 'grayscale(100%)',
                  transition: 'all 0.25s ease',
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
                {/* Image Cover com Logo Centralizada e Botão Power */}
                <div style={{
                  height: '190px',
                  position: 'relative',
                  backgroundImage: `url(${coverImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(15,16,24,0.9) 100%)',
                  }} />

                  {/* Badge Top Left */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: isVenueActive ? 'rgba(0,0,0,0.75)' : 'rgba(239, 68, 68, 0.2)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${isVenueActive ? 'var(--adm-border)' : 'rgba(239, 68, 68, 0.4)'}`,
                    color: isVenueActive ? 'var(--adm-accent)' : '#EF4444',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    zIndex: 2,
                  }}>
                    <Building2 size={12} />
                    <span>{isVenueActive ? 'Unidade Ativa' : 'Unidade Desativada'}</span>
                  </div>

                  {/* Botão Power Top Right */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateVenue(venue.id, { active: !isVenueActive });
                    }}
                    title={isVenueActive ? 'Unidade Ativa • Clique para desativar' : 'Unidade Desativada • Clique para ativar'}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: isVenueActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 0, 0, 0.8)',
                      backdropFilter: 'blur(8px)',
                      border: `1.5px solid ${isVenueActive ? '#10B981' : 'rgba(255, 255, 255, 0.25)'}`,
                      color: isVenueActive ? '#10B981' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 4,
                      boxShadow: isVenueActive ? '0 0 12px rgba(16, 185, 129, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Power size={16} />
                  </button>

                  {/* Logo PNG Centralizada sobre o Banner */}
                  {venue.logoUrl ? (
                    <img
                      src={venue.logoUrl}
                      alt={venue.name}
                      style={{
                        maxHeight: '68px',
                        maxWidth: '180px',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.95))',
                        zIndex: 2,
                      }}
                    />
                  ) : (
                    <div style={{
                      zIndex: 2,
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      textShadow: '0 2px 12px rgba(0,0,0,0.9)',
                      letterSpacing: '-0.3px',
                      textAlign: 'center',
                    }}>
                      {venue.name}
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
                    {venue.tagline && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--adm-accent)', fontWeight: 700 }}>
                        "{venue.tagline}"
                      </div>
                    )}
                  </div>

                  {venue.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
                      <MapPin size={14} color="var(--adm-accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{venue.address}</span>
                    </div>
                  )}

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
      )}

      {/* Modal Seguro de Exclusão de Casa de Festa */}
      <AdminDeleteVenueModal
        isOpen={!!venueToDelete}
        onClose={() => setVenueToDelete(null)}
        venue={venueToDelete}
        debutantes={debutantes}
        totalLeadsCount={leads.filter(l => l.venueId === venueToDelete?.id || l.venueName === venueToDelete?.name).length}
        onConfirmDelete={async (id) => {
          const res = await deleteVenue(id);
          if (res.success) {
            if (selectedVenueId === id) {
              setSelectedVenueId(null);
              setViewMode('list');
            }
            setVenueToDelete(null);
          }
          return res;
        }}
      />

      {/* Modal Premium de Criação (Padrão AdminNewLeadModal) */}
      <AdminVenueModal
        isOpen={isVenueModalOpen}
        onClose={() => setIsVenueModalOpen(false)}
        venueToEdit={venueToEditModal}
      />
    </div>
  );
};
