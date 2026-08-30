import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, AlertCircle, Loader2,
  Send, Sparkles
} from 'lucide-react';
import { sourceService } from '../../services/sourceService';
import { leadService } from '../../services/leadService';
import { generateUuid } from '../../utils/uuid';
import type { Source } from '../../types/sources';

interface PublicFormLandingViewProps {
  slug: string;
}

export const PublicFormLandingView: React.FC<PublicFormLandingViewProps> = ({ slug }) => {
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    const loadFormSource = async () => {
      if (!slug) {
        setError('Link de formulário inválido.');
        setLoading(false);
        return;
      }

      try {
        const foundSource = await sourceService.getBySlug(slug);

        if (isCancelled) return;

        if (!foundSource) {
          setError('Este formulário não foi encontrado ou está desativado.');
          setLoading(false);
          return;
        }

        if (foundSource.status !== 'active') {
          setError('Este formulário está temporariamente encerrado.');
          setLoading(false);
          return;
        }

        setSource(foundSource);

        // 1. Registra o evento de visualização do formulário (form_view)
        sourceService.recordEvent(foundSource.id, foundSource.venueId, 'form_view', undefined, {
          slug,
        });

      } catch (err: any) {
        if (!isCancelled) {
          setError('Ocorreu um erro ao carregar o formulário.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadFormSource();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source) return;

    const fields = source.configuration?.fields || [];
    const errors: Record<string, string> = {};

    // Validate required fields
    fields.forEach(f => {
      const val = formData[f.id]?.trim();
      if (f.required && !val) {
        errors[f.id] = `O campo "${f.label}" é obrigatório.`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const leadId = generateUuid();
      const leadName = formData['name'] || formData['nome'] || 'Novo Contato do Formulário';
      const leadPhone = formData['phone'] || formData['whatsapp'] || formData['telefone'] || '';
      const leadEmail = formData['email'] || undefined;

      // 1. Criar o Lead associado à Origem, Casa de Festa e Funil de Destino
      await leadService.upsert({
        id: leadId,
        name: leadName,
        phone: leadPhone,
        email: leadEmail,
        venueId: source.venueId,
        funnelId: source.funnelId,
        sourceId: source.id,
        source: 'outro',
        stage: 'new_lead',
        notes: JSON.stringify(formData, null, 2),
      });

      // 2. Registrar os eventos de submissão e criação de lead
      await sourceService.recordEvent(source.id, source.venueId, 'form_submit', leadId, {
        submittedData: formData,
        slug,
      });

      await sourceService.recordEvent(source.id, source.venueId, 'lead_created', leadId, {
        leadName,
        leadPhone,
        funnelId: source.funnelId,
      });

      setIsSubmitted(true);
    } catch (err: any) {
      alert('Erro ao enviar formulário. Por favor tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const config = source?.configuration || {};
  const fields = config.fields && config.fields.length > 0 ? config.fields : [
    { id: 'name', label: 'Nome Completo', type: 'text' as const, required: true, placeholder: 'Seu nome completo' },
    { id: 'phone', label: 'WhatsApp', type: 'phone' as const, required: true, placeholder: '(21) 99999-9999' },
    { id: 'eventDate', label: 'Data Prevista do Evento', type: 'date' as const, required: false },
    { id: 'guestsCount', label: 'Estimativa de Convidados', type: 'number' as const, required: false, placeholder: 'Ex: 150' },
    { id: 'notes', label: 'Observações / Como nos conheceu?', type: 'textarea' as const, required: false, placeholder: 'Conte-nos sobre a sua festa...' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 20%, #1A1622 0%, #090814 100%)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '24px 16px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'rgba(26, 22, 34, 0.9)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '24px',
        padding: '36px 28px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Loader2 size={36} color="#D4AF37" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '0.86rem', color: '#9E988D', marginTop: '12px' }}>
              Carregando formulário...
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={24} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
              Formulário Indisponível
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#9E988D' }}>
              {error}
            </div>
          </div>
        ) : isSubmitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)',
              border: '1.5px solid #10B981',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.3)',
            }}>
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FFF', margin: 0 }}>
                Solicitação Enviada!
              </h2>
              <div style={{ fontSize: '0.86rem', color: '#D4AF37', fontWeight: 600, marginTop: '8px', lineHeight: '1.5' }}>
                {config.successMessage || 'Obrigado! Recebemos seus dados com sucesso e nossa equipe entrará em contato.'}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header Title */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#D4AF37',
                fontSize: '0.72rem',
                fontWeight: 800,
                marginBottom: '10px',
              }}>
                <Sparkles size={13} />
                <span>Bonomo Festas</span>
              </div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FFF', margin: 0, letterSpacing: '-0.3px' }}>
                {config.title || 'Solicite seu Orçamento'}
              </h1>
              {config.description && (
                <div style={{ fontSize: '0.8rem', color: '#9E988D', marginTop: '6px', lineHeight: '1.4' }}>
                  {config.description}
                </div>
              )}
            </div>

            {/* Dynamic Form Fields */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {fields.map(f => (
                <div key={f.id}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}>
                    {f.label} {f.required && <span style={{ color: '#EF4444' }}>*</span>}
                  </label>

                  {f.type === 'textarea' ? (
                    <textarea
                      value={formData[f.id] || ''}
                      onChange={(e) => handleInputChange(f.id, e.target.value)}
                      placeholder={f.placeholder}
                      rows={3}
                      style={{
                        width: '100%',
                        background: 'rgba(15, 12, 22, 0.7)',
                        border: validationErrors[f.id] ? '1px solid #EF4444' : '1px solid rgba(212, 175, 55, 0.25)',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '0.84rem',
                        padding: '10px 14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <input
                      type={f.type === 'phone' ? 'tel' : f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                      value={formData[f.id] || ''}
                      onChange={(e) => handleInputChange(f.id, e.target.value)}
                      placeholder={f.placeholder}
                      style={{
                        width: '100%',
                        height: '44px',
                        background: 'rgba(15, 12, 22, 0.7)',
                        border: validationErrors[f.id] ? '1px solid #EF4444' : '1px solid rgba(212, 175, 55, 0.25)',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '0.84rem',
                        padding: '0 14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                  )}

                  {validationErrors[f.id] && (
                    <div style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: '4px' }}>
                      {validationErrors[f.id]}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B89628 100%)',
                  color: '#090814',
                  border: 'none',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(212, 175, 55, 0.35)',
                  marginTop: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Enviando dados...</span>
                  </>
                ) : (
                  <>
                    <span>{config.buttonText || 'Enviar Solicitação'}</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
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
