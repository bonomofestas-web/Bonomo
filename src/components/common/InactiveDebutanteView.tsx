import React from 'react';
import { Calendar, MessageCircle } from 'lucide-react';
import type { Venue } from '../../types/admin';

interface InactiveDebutanteViewProps {
  venue?: Venue | null;
  reason?: 'inactive' | 'expired' | 'not_found';
}

export const InactiveDebutanteView: React.FC<InactiveDebutanteViewProps> = ({
  venue,
  reason = 'inactive',
}) => {
  const venueName = venue?.name || 'Bonomo Festas';
  const logoUrl = venue?.logoUrl || '/logo_riio_lounge.png';

  const title = reason === 'expired' 
    ? 'Evento Realizado & Jornada Encerrada' 
    : 'Acesso Indisponível';

  const description = reason === 'expired'
    ? 'Este evento já foi realizado com sucesso! O aplicativo e os links de indicação foram encerrados automaticamente conforme o ciclo contratual da casa.'
    : 'O acesso a este aplicativo está temporariamente inativo ou o link informado não foi encontrado.';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1A1028 0%, #08060D 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: '#FFFFFF',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(24, 18, 36, 0.85)',
        border: '1.5px solid rgba(212, 175, 55, 0.35)',
        borderRadius: '28px',
        padding: '40px 28px',
        textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 55, 0.12)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}>
        {/* Venue Logo */}
        <div style={{ marginBottom: '4px' }}>
          <img
            src={logoUrl}
            alt={venueName}
            style={{
              height: '70px',
              maxWidth: '180px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 16px rgba(212, 175, 55, 0.45))',
            }}
          />
        </div>

        {/* Icon Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(212, 175, 55, 0.12)',
          border: '1.5px solid rgba(212, 175, 55, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#D4AF37',
          boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
        }}>
          <Calendar size={28} />
        </div>

        {/* Text */}
        <div>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0 0 8px 0',
            letterSpacing: '-0.3px',
          }}>
            {title}
          </h2>
          <p style={{
            fontSize: '0.86rem',
            color: 'rgba(255, 255, 255, 0.65)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {description}
          </p>
        </div>

        {/* Venue Info Card */}
        <div style={{
          width: '100%',
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '14px 18px',
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          textAlign: 'center',
        }}>
          <strong style={{ color: '#D4AF37', fontSize: '0.84rem' }}>{venueName}</strong>
          <span>Caso precise de suporte ou esclarecimentos, entre em contato com nossa equipe.</span>
        </div>

        {/* WhatsApp Support Button */}
        {(() => {
          const rawPhone = venue?.whatsappNumber || venue?.phone || '5521999999999';
          const cleanPhone = rawPhone.replace(/\D/g, '');
          const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          const message = encodeURIComponent(`Olá, equipe do ${venueName}! Gostaria de informações sobre o acesso ao aplicativo da debutante.`);
          return (
            <a
              href={`https://wa.me/${formattedPhone}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 20px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <MessageCircle size={18} />
              <span>Falar com o Suporte da Casa</span>
            </a>
          );
        })()}
      </div>
    </div>
  );
};
