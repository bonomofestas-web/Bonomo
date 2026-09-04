import React, { useState } from 'react';
import { 
  Radio, Plus, Eye, CheckCircle2, 
  Calendar, ShieldAlert, Sparkles, Megaphone, X, Clock,
  Film, Image as ImageIcon, FileText, Check, AlertCircle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { getYouTubeEmbedUrl } from './AdminAnnouncementModal';
import type { SystemAnnouncement, AdminRole } from '../../types/admin';

const AVAILABLE_ROLES: { id: AdminRole; label: string; description: string }[] = [
  { id: 'master', label: 'Master (Diretoria & Franqueados)', description: 'Acesso executivo geral e obrigatório' },
  { id: 'admin', label: 'Gerente da Unidade', description: 'Gestão operacional de espaços' },
  { id: 'sdr', label: 'SDR (Pré-Vendas)', description: 'Qualificação inicial e triagem de leads' },
  { id: 'closer', label: 'Closer (Vendas & Fechamentos)', description: 'Apresentações e contratos' },
  { id: 'crm', label: 'Operador de CRM', description: 'Atendimento e rotinas de pipeline' },
];

export const AdminDevAnnouncementsView: React.FC = () => {
  const { announcements, createAnnouncement } = useAdminState();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAnnouncementForReceipts, setSelectedAnnouncementForReceipts] = useState<SystemAnnouncement | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<SystemAnnouncement['type']>('feature');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [targetRoles, setTargetRoles] = useState<AdminRole[]>(['master']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio 2 Mandatory Role Rule:
  // Whenever any subordinate role is checked, Master MUST ALWAYS be checked!
  const handleToggleRole = (role: AdminRole) => {
    setTargetRoles(prev => {
      const exists = prev.includes(role);
      if (exists) {
        if (role === 'master') {
          const hasSubordinates = prev.some(r => r !== 'master');
          if (hasSubordinates) {
            alert('A hierarquia Master recebe obrigatoriamente todos os comunicados direcionados à equipe.');
            return prev;
          }
        }
        const updated = prev.filter(r => r !== role);
        return updated.length === 0 ? ['master'] : updated;
      } else {
        const updated = [...prev, role];
        if (!updated.includes('master')) {
          updated.push('master');
        }
        return updated;
      }
    });
  };

  const handleSelectAllRoles = () => {
    setTargetRoles(['master', 'admin', 'sdr', 'closer', 'crm']);
  };

  const handleSelectOnlyMasters = () => {
    setTargetRoles(['master']);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type,
        mediaType,
        mediaUrl: mediaUrl.trim() || undefined,
        targetRoles: targetRoles.length > 0 ? targetRoles : ['master'],
        targetAudience: targetRoles.length >= 5 ? 'all' : targetRoles.length === 1 && targetRoles[0] === 'master' ? 'masters' : 'custom',
      });
      setTitle('');
      setContent('');
      setType('feature');
      setMediaType('none');
      setMediaUrl('');
      setTargetRoles(['master']);
      setIsCreateModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (annType: SystemAnnouncement['type']) => {
    switch (annType) {
      case 'feature':
        return {
          icon: <Sparkles size={13} color="#14A9D7" />,
          label: 'Nova Funcionalidade',
          bg: 'rgba(20, 169, 215, 0.15)',
          color: '#14A9D7',
          border: '1px solid rgba(20, 169, 215, 0.35)',
        };
      case 'update':
        return {
          icon: <Megaphone size={13} color="#10B981" />,
          label: 'Atualização',
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.35)',
        };
      case 'maintenance':
        return {
          icon: <ShieldAlert size={13} color="#F59E0B" />,
          label: 'Aviso Importante',
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#F59E0B',
          border: '1px solid rgba(245, 158, 11, 0.35)',
        };
      default:
        return {
          icon: <Radio size={13} color="#D4AF37" />,
          label: 'Geral',
          bg: 'rgba(212, 175, 55, 0.15)',
          color: '#D4AF37',
          border: '1px solid rgba(212, 175, 55, 0.35)',
        };
    }
  };

  const ytPreviewUrl = mediaType === 'video' && mediaUrl ? getYouTubeEmbedUrl(mediaUrl) : null;

  return (
    <div style={{
      padding: '24px 32px',
      color: 'var(--adm-text-title)',
      maxWidth: '1240px',
      margin: '0 auto',
      boxSizing: 'border-box',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '0.7rem',
            color: '#14A9D7',
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            <Radio size={13} />
            <span>Transmissão Global de Comunicados</span>
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            margin: '0 0 6px 0',
            color: 'var(--adm-text-title)',
            letterSpacing: '-0.3px',
          }}>
            Broadcast
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Envie comunicados instantâneos com vídeos incorporados do YouTube, imagens no Cloudflare R2 e segmentação estrita por hierarquias de acesso.
          </p>
        </div>

        {/* Action Button: Novo Comunicado */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
            color: '#080C14',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 6px 20px rgba(20, 169, 215, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          <Plus size={17} />
          <span>Criar Novo Broadcast</span>
        </button>
      </div>

      {/* ── LIST OF ANNOUNCEMENTS ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        padding: '24px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--adm-text-title)' }}>
            Histórico de Transmissões ({announcements.length})
          </h2>
        </div>

        {announcements.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--adm-text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Megaphone size={40} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
              Nenhum broadcast transmitido ainda
            </div>
            <div style={{ fontSize: '0.8rem', maxWidth: '400px' }}>
              Clique em "Criar Novo Broadcast" para enviar vídeos tutoriais, novidades em primeira mão e atualizações aos seus franqueados e equipes.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {announcements.map(ann => {
              const badge = getTypeBadge(ann.type);
              const readCount = ann.readReceipts ? ann.readReceipts.length : 0;
              const rolesList = ann.targetRoles || (ann.targetAudience === 'masters' ? ['master'] : ['master', 'admin', 'sdr', 'closer', 'crm']);

              return (
                <div
                  key={ann.id}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '16px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: badge.bg,
                        border: badge.border,
                        color: badge.color,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      {/* Media Tag */}
                      {ann.mediaType === 'video' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#EF4444',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}>
                          <Film size={11} />
                          <span>Vídeo Incorporado</span>
                        </span>
                      )}

                      {ann.mediaType === 'image' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(168, 85, 247, 0.15)',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          color: '#A855F7',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}>
                          <ImageIcon size={11} />
                          <span>Imagem Anexa</span>
                        </span>
                      )}

                      <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{new Date(ann.createdAt).toLocaleDateString('pt-BR')} às {new Date(ann.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0' }}>
                      {ann.title}
                    </h3>

                    <p style={{
                      fontSize: '0.8rem',
                      color: 'var(--adm-text-muted)',
                      lineHeight: 1.4,
                      margin: '0 0 8px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {ann.content}
                    </p>

                    {/* Roles Target Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--adm-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginRight: '4px' }}>
                        Cargos:
                      </span>
                      {rolesList.map(r => (
                        <span
                          key={r}
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: r === 'master' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(20, 169, 215, 0.15)',
                            color: r === 'master' ? '#D4AF37' : '#14A9D7',
                            border: `1px solid ${r === 'master' ? 'rgba(212, 175, 55, 0.35)' : 'rgba(20, 169, 215, 0.35)'}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Read Receipts Stats & Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '0.76rem',
                      color: 'var(--adm-text-title)',
                    }}>
                      <Eye size={14} color="#14A9D7" />
                      <span><strong>{readCount}</strong> visualizações</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedAnnouncementForReceipts(ann)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '10px',
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--adm-accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--adm-border)'}
                    >
                      <span>Auditar Leituras</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: CRIAR NOVO BROADCAST ──────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1.5px solid rgba(20, 169, 215, 0.35)',
            borderRadius: '24px',
            maxWidth: '580px',
            width: '100%',
            padding: '28px',
            color: 'var(--adm-text-title)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'var(--adm-bg-input)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: 'var(--adm-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(20, 169, 215, 0.15)',
                border: '1px solid #14A9D7',
                color: '#14A9D7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}>
                <Radio size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--adm-text-title)' }}>
                Novo Broadcast Global
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                Dispare vídeos, novidades e comunicados com player integrado direto no app da equipe.
              </p>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Título */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Título do Broadcast *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 🎬 Veja como usar o novo CRM e Funil!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Categoria */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Categoria do Comunicado
                </label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.84rem',
                    outline: 'none',
                  }}
                >
                  <option value="feature">✨ Nova Funcionalidade</option>
                  <option value="update">🚀 Atualização do Sistema</option>
                  <option value="maintenance">⚠️ Aviso Importante / Manutenção</option>
                  <option value="general">📢 Comunicado Geral</option>
                </select>
              </div>

              {/* Mídia Anexa: Texto / Imagem / Vídeo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Mídia Incorporada
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setMediaType('none'); setMediaUrl(''); }}
                    style={{
                      padding: '9px',
                      borderRadius: '10px',
                      background: mediaType === 'none' ? 'rgba(20, 169, 215, 0.2)' : 'var(--adm-bg-input)',
                      border: `1px solid ${mediaType === 'none' ? '#14A9D7' : 'var(--adm-border)'}`,
                      color: mediaType === 'none' ? '#14A9D7' : 'var(--adm-text-muted)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <FileText size={14} />
                    <span>Apenas Texto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    style={{
                      padding: '9px',
                      borderRadius: '10px',
                      background: mediaType === 'video' ? 'rgba(239, 68, 68, 0.18)' : 'var(--adm-bg-input)',
                      border: `1px solid ${mediaType === 'video' ? '#EF4444' : 'var(--adm-border)'}`,
                      color: mediaType === 'video' ? '#EF4444' : 'var(--adm-text-muted)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Film size={14} />
                    <span>Vídeo (Player)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaType('image')}
                    style={{
                      padding: '9px',
                      borderRadius: '10px',
                      background: mediaType === 'image' ? 'rgba(168, 85, 247, 0.18)' : 'var(--adm-bg-input)',
                      border: `1px solid ${mediaType === 'image' ? '#A855F7' : 'var(--adm-border)'}`,
                      color: mediaType === 'image' ? '#A855F7' : 'var(--adm-text-muted)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <ImageIcon size={14} />
                    <span>Imagem</span>
                  </button>
                </div>

                {/* Input de Vídeo */}
                {mediaType === 'video' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="url"
                      required={mediaType === 'video'}
                      placeholder="Cole o link do YouTube ou link direto .mp4 (ex: https://youtube.com/watch?v=...)"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.82rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* Preview do Player de Vídeo */}
                    {ytPreviewUrl && (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        paddingBottom: '56.25%',
                        height: 0,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        background: '#000',
                      }}>
                        <iframe
                          src={ytPreviewUrl}
                          title="Preview do Vídeo"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Upload de Imagem no Cloudflare R2 */}
                {mediaType === 'image' && (
                  <ImageUploadField
                    label="Imagem do Broadcast (Cloudflare R2)"
                    value={mediaUrl}
                    onChange={(url) => setMediaUrl(url)}
                    folder="broadcasts"
                    aspectRatio="16:9"
                    previewHeight="120px"
                    placeholder="Selecione ou arraste a imagem do comunicado"
                  />
                )}
              </div>

              {/* Roles de Destino (Audio 2: Regra de Hierarquia Mandatória) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Cargos com Acesso ao Comunicado *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleSelectOnlyMasters}
                      style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Apenas Master
                    </button>
                    <span style={{ color: 'var(--adm-border)' }}>|</span>
                    <button
                      type="button"
                      onClick={handleSelectAllRoles}
                      style={{ background: 'transparent', border: 'none', color: '#14A9D7', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Toda a Equipe
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {AVAILABLE_ROLES.map(role => {
                    const isChecked = targetRoles.includes(role.id);
                    const isMasterLocked = role.id === 'master' && targetRoles.some(r => r !== 'master');

                    return (
                      <div
                        key={role.id}
                        onClick={() => handleToggleRole(role.id)}
                        title={isMasterLocked ? 'O Master é obrigatório sempre que um cargo abaixo dele estiver selecionado' : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: isChecked ? 'rgba(20, 169, 215, 0.1)' : 'var(--adm-bg-input)',
                          border: `1px solid ${isChecked ? 'rgba(20, 169, 215, 0.35)' : 'var(--adm-border)'}`,
                          borderRadius: '10px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                            {role.label}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                            {role.description}
                          </div>
                        </div>

                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '5px',
                          background: isChecked ? '#14A9D7' : 'transparent',
                          border: `1.5px solid ${isChecked ? '#14A9D7' : 'rgba(255,255,255,0.3)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#080C14',
                        }}>
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '8px' }}>
                  <AlertCircle size={12} color="#14A9D7" />
                  <span>Se qualquer cargo subordinado for marcado, o cargo <strong>Master</strong> é incluído automaticamente por regra de hierarquia.</span>
                </div>
              </div>

              {/* Mensagem / Conteúdo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Mensagem Explicativa *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escreva a mensagem ou instruções que acompanharão este comunicado..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                  color: '#080C14',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Transmitindo...' : 'Transmitir Broadcast'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AUDITORIA DE VISUALIZAÇÕES ─────────────────────────────────── */}
      {selectedAnnouncementForReceipts && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            maxWidth: '560px',
            width: '100%',
            padding: '28px',
            color: 'var(--adm-text-title)',
            position: 'relative',
          }}>
            <button
              type="button"
              onClick={() => setSelectedAnnouncementForReceipts(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'var(--adm-bg-input)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: 'var(--adm-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 800, textTransform: 'uppercase' }}>
                Relatório de Leituras
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 2px 0', color: 'var(--adm-text-title)' }}>
                {selectedAnnouncementForReceipts.title}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                {selectedAnnouncementForReceipts.readReceipts ? selectedAnnouncementForReceipts.readReceipts.length : 0} pessoas visualizaram e confirmaram a leitura.
              </p>
            </div>

            {(!selectedAnnouncementForReceipts.readReceipts || selectedAnnouncementForReceipts.readReceipts.length === 0) ? (
              <div style={{
                padding: '36px',
                textAlign: 'center',
                color: 'var(--adm-text-muted)',
                fontSize: '0.84rem',
                background: 'var(--adm-bg-input)',
                borderRadius: '14px',
              }}>
                Nenhum colaborador visualizou este broadcast até o momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {selectedAnnouncementForReceipts.readReceipts.map((receipt, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        {receipt.userName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                        {receipt.userEmail} • <span style={{ textTransform: 'uppercase', color: '#14A9D7' }}>{receipt.userRole}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{new Date(receipt.readAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
