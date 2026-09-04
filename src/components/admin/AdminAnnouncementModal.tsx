import React from 'react';
import { Sparkles, CheckCircle2, Megaphone, Bell, ShieldAlert } from 'lucide-react';
import type { SystemAnnouncement } from '../../types/admin';

interface AdminAnnouncementModalProps {
  announcement: SystemAnnouncement;
  onDismiss: () => void;
}

export const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube-nocookie.com/embed/${match[2]}?rel=0&modestbranding=1` : null;
};

export const AdminAnnouncementModal: React.FC<AdminAnnouncementModalProps> = ({
  announcement,
  onDismiss,
}) => {
  const getTypeBadge = () => {
    switch (announcement.type) {
      case 'feature':
        return {
          icon: <Sparkles size={14} color="#14A9D7" />,
          label: 'Nova Funcionalidade',
          bg: 'rgba(20, 169, 215, 0.15)',
          color: '#14A9D7',
          border: '1px solid rgba(20, 169, 215, 0.4)',
        };
      case 'update':
        return {
          icon: <Megaphone size={14} color="#10B981" />,
          label: 'Atualização do Sistema',
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.4)',
        };
      case 'maintenance':
        return {
          icon: <ShieldAlert size={14} color="#F59E0B" />,
          label: 'Aviso Importante',
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#F59E0B',
          border: '1px solid rgba(245, 158, 11, 0.4)',
        };
      default:
        return {
          icon: <Bell size={14} color="#D4AF37" />,
          label: 'Comunicado Geral',
          bg: 'rgba(212, 175, 55, 0.15)',
          color: '#D4AF37',
          border: '1px solid rgba(212, 175, 55, 0.4)',
        };
    }
  };

  const badge = getTypeBadge();
  const ytEmbedUrl = announcement.mediaType === 'video' && announcement.mediaUrl 
    ? getYouTubeEmbedUrl(announcement.mediaUrl) 
    : null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 999999,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: '#0B111A',
        border: '1.5px solid rgba(20, 169, 215, 0.4)',
        borderRadius: '24px',
        maxWidth: '560px',
        width: '100%',
        padding: '32px 28px',
        color: '#FFFFFF',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(20, 169, 215, 0.2)',
        position: 'relative',
        boxSizing: 'border-box',
        textAlign: 'center',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Type Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: badge.bg,
          border: badge.border,
          color: badge.color,
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.72rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: '14px',
        }}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.4rem',
          fontWeight: 900,
          color: '#FFFFFF',
          margin: '0 0 16px 0',
          letterSpacing: '-0.3px',
          lineHeight: 1.3,
        }}>
          {announcement.title}
        </h2>

        {/* Media Player / Image Attachment (Audio 2) */}
        {announcement.mediaType === 'video' && announcement.mediaUrl && (
          <div style={{ marginBottom: '18px' }}>
            {ytEmbedUrl ? (
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                height: 0,
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1.5px solid rgba(20, 169, 215, 0.35)',
                background: '#000',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}>
                <iframe
                  src={ytEmbedUrl}
                  title={announcement.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div style={{
                width: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1.5px solid rgba(20, 169, 215, 0.35)',
                background: '#000',
              }}>
                <video
                  controls
                  src={announcement.mediaUrl}
                  style={{ width: '100%', maxHeight: '280px', display: 'block' }}
                />
              </div>
            )}
          </div>
        )}

        {announcement.mediaType === 'image' && announcement.mediaUrl && (
          <div style={{
            marginBottom: '18px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1.5px solid rgba(20, 169, 215, 0.35)',
            maxHeight: '280px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <img
              src={announcement.mediaUrl}
              alt={announcement.title}
              style={{ width: '100%', height: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Content Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '18px 20px',
          fontSize: '0.88rem',
          color: '#D3E0EA',
          lineHeight: 1.6,
          textAlign: 'left',
          whiteSpace: 'pre-wrap',
          maxHeight: '220px',
          overflowY: 'auto',
          marginBottom: '24px',
        }}>
          {announcement.content}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
            color: '#080C14',
            border: 'none',
            borderRadius: '14px',
            padding: '13px',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 6px 20px rgba(20, 169, 215, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          <CheckCircle2 size={18} />
          <span>Entendido! Continuar para o Sistema</span>
        </button>

        <div style={{ fontSize: '0.7rem', color: '#8096A8', marginTop: '10px' }}>
          Este comunicado ficará salvo no seu menu de notificações para consulta posterior.
        </div>
      </div>
    </div>
  );
};
