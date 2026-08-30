import React, { useEffect, useState } from 'react';
import { Compass, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { sourceService } from '../../services/sourceService';

interface PublicTrackingRedirectViewProps {
  slug: string;
}

export const PublicTrackingRedirectView: React.FC<PublicTrackingRedirectViewProps> = ({ slug }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;

    const processTrackingLink = async () => {
      if (!slug) {
        setError('Link de redirecionamento inválido.');
        setLoading(false);
        return;
      }

      try {
        const foundSource = await sourceService.getBySlug(slug);

        if (isCancelled) return;

        if (!foundSource) {
          setError('Este link não foi encontrado ou foi desativado.');
          setLoading(false);
          return;
        }

        if (foundSource.status !== 'active') {
          setError('Este link está temporariamente indisponível.');
          setLoading(false);
          return;
        }

        const config = foundSource.configuration || {};
        let phone = (config.targetPhone || '').replace(/\D/g, '');
        if (phone.length === 10 || phone.length === 11) {
          phone = `55${phone}`;
        }
        const text = encodeURIComponent(config.message || 'Olá! Gostaria de mais informações.');
        const targetWhatsappUrl = `https://wa.me/${phone}?text=${text}`;

        setRedirectUrl(targetWhatsappUrl);

        // 1. Registra o evento de clique no backend Supabase
        await sourceService.recordEvent(foundSource.id, foundSource.venueId, 'link_click', undefined, {
          slug,
          targetPhone: phone,
        });

        // 2. Redireciona automaticamente para o WhatsApp
        if (typeof window !== 'undefined' && targetWhatsappUrl) {
          setTimeout(() => {
            window.location.replace(targetWhatsappUrl);
          }, 350);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError('Ocorreu um erro ao processar o redirecionamento.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    processTrackingLink();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, #1A1622 0%, #090814 100%)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'rgba(26, 22, 34, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        borderRadius: '24px',
        padding: '36px 32px',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
      }}>
        
        {/* Logo / Brand Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
          border: '1.5px solid #D4AF37',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#D4AF37',
          boxShadow: '0 0 20px rgba(212, 175, 55, 0.25)',
        }}>
          <Compass size={28} />
        </div>

        {loading ? (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
              Redirecionando para o WhatsApp...
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#9E988D', lineHeight: '1.4' }}>
              Aguarde um instante enquanto conectamos você com nossa equipe de atendimento.
            </div>
            <Loader2 size={32} color="#D4AF37" className="animate-spin" style={{ animation: 'spin 1s linear infinite', marginTop: '10px' }} />
          </>
        ) : error ? (
          <>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertCircle size={22} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
              Link Indisponível
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#9E988D', lineHeight: '1.4' }}>
              {error}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
              Pronto para conversar!
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#9E988D', lineHeight: '1.4' }}>
              Caso o redirecionamento automático não aconteça, clique no botão abaixo para abrir o WhatsApp:
            </div>
            {redirectUrl && (
              <a
                href={redirectUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFF',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                  marginTop: '8px',
                }}
              >
                <span>Abrir WhatsApp</span>
                <ExternalLink size={16} />
              </a>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
