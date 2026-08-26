import React, { useState } from 'react';
import { Sparkles, Share2, Check, ArrowDownCircle, Heart, Star } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const JourneyHero: React.FC = () => {
  const { debutante, setActiveTab } = useAppState();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(`https://villadiamond.com.br/indicacao?debutante=${encodeURIComponent(debutante.name)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="glass-card journey-hero-card" style={{
      marginBottom: '32px',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(232, 180, 184, 0.3)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Decorative ambient background glows */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, var(--glow-strong) 0%, transparent 70%)',
        pointerEvents: 'none',
        opacity: 0.6
      }} />

      <div className="journey-hero-grid">
        {/* Left Side: Greeting & Headline */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="badge badge-unlocked" style={{ fontSize: '0.75rem', padding: '5px 14px' }}>
              <Star size={14} fill="#FBBF24" /> JORNADA EXCLUSIVA DE 15 ANOS
            </span>
          </div>

          <h1 style={{ 
            fontSize: 'clamp(1.5rem, 4vw, 2.3rem)', 
            fontWeight: 800, 
            lineHeight: 1.2, 
            marginBottom: '12px',
            letterSpacing: '-0.8px'
          }}>
            <span className="gradient-text">{debutante.name}</span>, sua jornada para o grande dia começou! ✨
          </h1>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '600px', lineHeight: 1.55 }}>
            Indique amigas, acompanhe a validação da equipe comercial e desbloqueie benefícios incríveis para personalizar a sua festa de 15 anos.
          </p>

          <div className="journey-hero-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('referrals')} className="btn-primary journey-btn">
              <Sparkles size={16} />
              Fazer Nova Indicação
            </button>

            <button onClick={handleShare} className="btn-secondary journey-btn">
              {copied ? <Check size={16} color="#34D399" /> : <Share2 size={16} />}
              {copied ? 'Link Copiado!' : 'Compartilhar meu Link'}
            </button>
          </div>
        </div>

        {/* Right Side: Key Metrics Visual Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Status da Jornada
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem' }}>
              <Heart size={14} fill="var(--accent)" />
              15 Anos VIP
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Stat 1 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '14px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
                {debutante.validReferrals}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Indicações Válidas
              </div>
            </div>

            {/* Stat 2 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '14px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)' }}>
                {debutante.journeyProgressPercentage}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                da Jornada
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{
              height: '8px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '6px'
            }}>
              <div style={{
                height: '100%',
                width: `${debutante.journeyProgressPercentage}%`,
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                boxShadow: '0 0 12px var(--glow-strong)',
                transition: 'width 0.6s ease-out'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>Início</span>
              <span>Conquista Final (20)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down Prompt */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '8px', 
        marginTop: '24px',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        fontWeight: 600
      }}>
        <ArrowDownCircle size={16} className="animate-float" color="var(--primary)" />
        <span>Role para baixo para explorar seus objetivos</span>
      </div>

      <style>{`
        .journey-hero-card {
          padding: 32px 36px;
        }

        .journey-hero-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 28px;
          align-items: center;
        }

        @media (max-width: 900px) {
          .journey-hero-card {
            padding: 20px 18px !important;
          }

          .journey-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }

          .journey-hero-buttons {
            flex-direction: column !important;
          }

          .journey-btn {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
};
