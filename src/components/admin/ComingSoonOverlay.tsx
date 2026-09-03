import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';

interface ComingSoonOverlayProps {
  featureTitle?: string;
  onBack?: () => void;
  isInline?: boolean;
}

export const ComingSoonOverlay: React.FC<ComingSoonOverlayProps> = ({
  featureTitle = 'Recurso em Desenvolvimento',
  onBack,
  isInline = false,
}) => {
  const content = (
    <div style={{
      maxWidth: '480px',
      width: '100%',
      background: 'var(--adm-bg-card)',
      border: '1.5px solid var(--adm-border)',
      borderRadius: '24px',
      padding: '40px 32px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(20, 169, 215, 0.15), 0 0 30px rgba(0,0,0,0.1)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient gradient aura */}
      <div style={{
        position: 'absolute',
        top: '-80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '240px',
        height: '240px',
        background: 'radial-gradient(circle, rgba(20, 169, 215, 0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Modern Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(20, 169, 215, 0.12)',
        border: '1px solid rgba(20, 169, 215, 0.4)',
        padding: '5px 14px',
        borderRadius: '20px',
        fontSize: '0.74rem',
        fontWeight: 800,
        color: 'var(--adm-accent, #14A9D7)',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        <Sparkles size={13} />
        <span>Em Breve no F5 System</span>
      </div>

      {/* Feature Title */}
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 900,
        color: 'var(--adm-text-title)',
        margin: '0 0 12px 0',
        fontFamily: "'Poppins', sans-serif",
      }}>
        {featureTitle}
      </h2>

      {/* Official requirement message */}
      <p style={{
        fontSize: '0.94rem',
        color: 'var(--adm-text-muted)',
        lineHeight: 1.6,
        margin: '0 0 28px 0',
        fontFamily: "'Poppins', sans-serif",
      }}>
        Este recurso está em desenvolvimento e em breve estará disponível.
      </p>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="adm-btn-secondary"
          style={{
            padding: '10px 22px',
            fontSize: '0.84rem',
          }}
        >
          <ArrowLeft size={15} />
          <span>Voltar ao Início</span>
        </button>
      )}
    </div>
  );

  if (isInline) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        width: '100%',
        minHeight: '340px',
      }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 120px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      {content}
    </div>
  );
};
