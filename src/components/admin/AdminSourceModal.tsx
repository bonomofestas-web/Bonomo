import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Compass, PhoneCall, Link2, FileText, Gift,
  AlertCircle, Plus, Trash2
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Source, SourceType, FormField, FormFieldType } from '../../types/sources';

interface AdminSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceToEdit?: Source | null;
}

const DEFAULT_FORM_FIELDS: FormField[] = [
  { id: 'name', label: 'Nome Completo', type: 'text', required: true, placeholder: 'Ex: Maria Silva' },
  { id: 'phone', label: 'WhatsApp', type: 'phone', required: true, placeholder: '(21) 99999-9999' },
  { id: 'eventDate', label: 'Data Prevista do Evento', type: 'date', required: false },
  { id: 'guestsCount', label: 'Estimativa de Convidados', type: 'number', required: false, placeholder: 'Ex: 150' },
  { id: 'notes', label: 'Observações / Como nos conheceu?', type: 'textarea', required: false, placeholder: 'Conte-nos um pouco sobre a sua festa...' },
];

export const AdminSourceModal: React.FC<AdminSourceModalProps> = ({
  isOpen,
  onClose,
  sourceToEdit,
}) => {
  const { venues, funnels, activeVenueId, addSource, updateSource } = useAdminState();

  const [name, setName] = useState('');
  const [venueId, setVenueId] = useState('');
  const [type, setType] = useState<SourceType>('tracking_link');
  const [funnelId, setFunnelId] = useState('');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Tracking Link Specifics
  const [targetPhone, setTargetPhone] = useState('');
  const [message, setMessage] = useState('');

  // Form Specifics
  const [formTitle, setFormTitle] = useState('Solicite seu Orçamento');
  const [formDescription, setFormDescription] = useState('Preencha os dados abaixo e nossa equipe entrará em contato rapidamente.');
  const [formFields, setFormFields] = useState<FormField[]>(DEFAULT_FORM_FIELDS);
  const [successMessage, setSuccessMessage] = useState('Obrigado! Recebemos sua solicitação e entraremos em contato via WhatsApp.');
  const [buttonText, setButtonText] = useState('Enviar Solicitação');

  // Error State
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or populate form
  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name || '');
      setVenueId(sourceToEdit.venueId || (venues[0]?.id || ''));
      setType(sourceToEdit.type || 'tracking_link');
      setFunnelId(sourceToEdit.funnelId || '');
      setWhatsappInstanceId(sourceToEdit.whatsappInstanceId || '');
      setSlug(sourceToEdit.slug || '');
      setStatus(sourceToEdit.status || 'active');

      const config = sourceToEdit.configuration || {};
      setTargetPhone(config.targetPhone || '');
      setMessage(config.message || '');
      setFormTitle(config.title || 'Solicite seu Orçamento');
      setFormDescription(config.description || '');
      setFormFields(config.fields && config.fields.length > 0 ? config.fields : DEFAULT_FORM_FIELDS);
      setSuccessMessage(config.successMessage || 'Obrigado! Entraremos em contato.');
      setButtonText(config.buttonText || 'Enviar Solicitação');
    } else {
      const defaultVenue = (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') 
        ? activeVenueId 
        : (venues[0]?.id || '');
      
      const availableFunnels = funnels.filter(f => !defaultVenue || f.venueId === defaultVenue || f.venueId === 'all');

      setName('');
      setVenueId(defaultVenue);
      setType('tracking_link');
      setFunnelId(availableFunnels[0]?.id || 'comercial');
      setWhatsappInstanceId('');
      setSlug('');
      setStatus('active');
      setTargetPhone('');
      setMessage('Olá! Gostaria de mais informações sobre festas e eventos.');
      setFormTitle('Solicite seu Orçamento');
      setFormDescription('Preencha os dados abaixo e nossa equipe entrará em contato rapidamente.');
      setFormFields(DEFAULT_FORM_FIELDS);
      setSuccessMessage('Obrigado! Recebemos sua solicitação e entraremos em contato via WhatsApp.');
      setButtonText('Enviar Solicitação');
    }
    setErrorMsg('');
  }, [sourceToEdit, isOpen, activeVenueId, venues, funnels]);

  // Filter funnels by the selected venue
  const scopedFunnels = useMemo(() => {
    if (!venueId) return funnels;
    return funnels.filter(f => f.venueId === venueId || f.venueId === 'all');
  }, [funnels, venueId]);

  // Auto-generate slug when typing name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!sourceToEdit && !slug) {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `custom_${Date.now()}`,
      label: 'Novo Campo',
      type: 'text',
      required: false,
      placeholder: 'Digite a resposta...',
    };
    setFormFields([...formFields, newField]);
  };

  const handleRemoveField = (fieldId: string) => {
    setFormFields(formFields.filter(f => f.id !== fieldId));
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields(formFields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Por favor, informe o nome da origem.');
      return;
    }
    if (!venueId) {
      setErrorMsg('Selecione uma Casa de Festa obrigatória.');
      return;
    }
    if (!funnelId) {
      setErrorMsg('Selecione o Funil de Destino obrigatório para onde os leads serão enviados.');
      return;
    }

    if (type === 'tracking_link' && !targetPhone.trim()) {
      setErrorMsg('Informe o número de WhatsApp de destino para o link rastreável.');
      return;
    }

    if ((type === 'tracking_link' || type === 'form') && !slug.trim()) {
      setErrorMsg('Informe um slug único para a URL pública.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      const configuration = {
        ...(type === 'tracking_link' ? { targetPhone, message } : {}),
        ...(type === 'form' ? { title: formTitle, description: formDescription, fields: formFields, successMessage, buttonText } : {}),
        ...(type === 'whatsapp_api' ? { instanceName: whatsappInstanceId } : {}),
        ...(type === 'referral' ? { systemManaged: true } : {}),
      };

      if (sourceToEdit) {
        await updateSource(sourceToEdit.id, {
          name: name.trim(),
          venueId,
          type,
          funnelId,
          whatsappInstanceId: whatsappInstanceId || undefined,
          status,
          slug: (type === 'tracking_link' || type === 'form') ? formattedSlug : undefined,
          configuration,
        });
      } else {
        await addSource({
          name: name.trim(),
          venueId,
          type,
          funnelId,
          whatsappInstanceId: whatsappInstanceId || undefined,
          status,
          slug: (type === 'tracking_link' || type === 'form') ? formattedSlug : undefined,
          configuration,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocorreu um erro ao salvar a origem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="adm-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div className="adm-modal-content" style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Compass size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                {sourceToEdit ? 'Editar Origem' : 'Nova Origem de Leads'}
              </h2>
              <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                Configure a porta de entrada e o funil de destino dos leads
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Tipo de Origem (Selector) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Tipo de Origem
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {[
                { id: 'tracking_link', label: 'Link Rastreável', icon: <Link2 size={16} />, desc: 'Redireciona para WhatsApp' },
                { id: 'form', label: 'Formulário', icon: <FileText size={16} />, desc: 'Página ou Embed externa' },
                { id: 'whatsapp_api', label: 'WhatsApp API', icon: <PhoneCall size={16} />, desc: 'Instância / Conexão futura' },
                { id: 'referral', label: 'Indicação no App', icon: <Gift size={16} />, desc: 'Indicações de Debutantes' },
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => setType(t.id as SourceType)}
                  style={{
                    padding: '12px',
                    borderRadius: '14px',
                    border: type === t.id ? '2px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                    background: type === t.id ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: type === t.id ? 'var(--adm-accent)' : 'var(--adm-text-title)', fontWeight: 800, fontSize: '0.82rem' }}>
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Casa de Festa e Funil de Destino (Obrigatórios) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Casa de Festa (Unidade) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={venueId}
                onChange={(e) => {
                  setVenueId(e.target.value);
                  const newVenueFunnels = funnels.filter(f => f.venueId === e.target.value || f.venueId === 'all');
                  if (newVenueFunnels.length > 0 && !newVenueFunnels.some(f => f.id === funnelId)) {
                    setFunnelId(newVenueFunnels[0].id);
                  }
                }}
                className="adm-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
                required
              >
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Funil de Destino do Lead <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={funnelId}
                onChange={(e) => setFunnelId(e.target.value)}
                className="adm-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem', borderColor: 'var(--adm-accent)' }}
                required
              >
                {scopedFunnels.map(f => (
                  <option key={f.id} value={f.id}>🎯 {f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Nome da Origem e Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Nome da Origem <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Instagram — Campanha 15 Anos"
                className="adm-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Status da Origem
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="adm-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
              >
                <option value="active">🟢 Ativa (Recebendo)</option>
                <option value="inactive">⚪ Inativa (Pausada)</option>
              </select>
            </div>
          </div>

          {/* 4. Configuração Específica: Link Rastreável */}
          {type === 'tracking_link' && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Link2 size={16} color="var(--adm-accent)" />
                <span>Configuração do Link Rastreável</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                    WhatsApp de Destino (Com DDD) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="Ex: 5521999999999"
                    className="adm-input"
                    style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                    Slug / Link Único (/r/:slug) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="insta-15anos"
                    className="adm-input"
                    style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                  Mensagem Pré-configurada do WhatsApp
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Olá! Vim pelo Instagram e gostaria de solicitar um orçamento..."
                  rows={2}
                  className="adm-input"
                  style={{ width: '100%', borderRadius: '8px', fontSize: '0.8rem', padding: '8px 12px' }}
                />
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', background: 'var(--adm-accent-bg)', padding: '8px 12px', borderRadius: '8px' }}>
                🔗 URL pública gerada: <strong>{typeof window !== 'undefined' ? window.location.origin : ''}/r/{slug || 'seu-slug'}</strong>
              </div>
            </div>
          )}

          {/* 5. Configuração Específica: Formulário */}
          {type === 'form' && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="var(--adm-accent)" />
                <span>Configuração do Formulário Público</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                    Título do Formulário
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Solicite seu Orçamento"
                    className="adm-input"
                    style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                    Slug / Link do Form (/f/:slug) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="orcamento-site"
                    className="adm-input"
                    style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                  Descrição / Subtítulo
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Preencha os campos abaixo..."
                  className="adm-input"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                />
              </div>

              {/* Campos do Formulário */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Campos do Formulário ({formFields.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddField}
                    style={{
                      background: 'var(--adm-accent)',
                      color: '#000',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Adicionar Campo</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {formFields.map((field) => (
                    <div
                      key={field.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        background: 'var(--adm-bg-card)',
                        borderRadius: '8px',
                        border: '1px solid var(--adm-border)',
                      }}
                    >
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        placeholder="Rótulo do campo"
                        className="adm-input"
                        style={{ flex: 2, height: '32px', fontSize: '0.74rem', borderRadius: '6px' }}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FormFieldType })}
                        className="adm-input"
                        style={{ flex: 1, height: '32px', fontSize: '0.74rem', borderRadius: '6px' }}
                      >
                        <option value="text">Texto</option>
                        <option value="phone">WhatsApp</option>
                        <option value="email">E-mail</option>
                        <option value="date">Data</option>
                        <option value="number">Número</option>
                        <option value="textarea">Área de Texto</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                        />
                        Obrigatório
                      </label>
                      {formFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(field.id)}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', background: 'var(--adm-accent-bg)', padding: '8px 12px', borderRadius: '8px' }}>
                📝 URL pública do Formulário: <strong>{typeof window !== 'undefined' ? window.location.origin : ''}/f/{slug || 'seu-form'}</strong>
              </div>
            </div>
          )}

          {/* 6. Configuração Específica: WhatsApp API */}
          {type === 'whatsapp_api' && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PhoneCall size={16} color="var(--adm-accent)" />
                <span>Instância do WhatsApp API (Desacoplado)</span>
              </div>

              <div style={{ padding: '14px', background: 'rgba(212, 175, 55, 0.08)', borderRadius: '10px', border: '1px dashed var(--adm-accent)', color: 'var(--adm-text-title)', fontSize: '0.78rem', lineHeight: '1.4' }}>
                ℹ️ <strong>Integração de WhatsApp API:</strong> A estrutura do módulo de Origens já está 100% pronta. Quando a API for conectada futuramente, você poderá vincular a instância diretamente a esta origem.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                  Identificador / Número de Atendimento
                </label>
                <input
                  type="text"
                  value={whatsappInstanceId}
                  onChange={(e) => setWhatsappInstanceId(e.target.value)}
                  placeholder="Ex: WhatsApp 01 - Comercial"
                  className="adm-input"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          )}

          {/* 7. Configuração Específica: Indicação */}
          {type === 'referral' && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gift size={16} color="var(--adm-accent)" />
                <span>Origem Nativa de Indicações das Debutantes</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', lineHeight: '1.4' }}>
                Todos os novos leads gerados pelas aniversariantes desta casa entrarão automaticamente no <strong>Funil de Destino</strong> selecionado acima.
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--adm-border)',
          }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="adm-btn-primary"
              style={{ padding: '10px 22px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800 }}
            >
              {isSubmitting ? 'Salvando...' : sourceToEdit ? 'Salvar Alterações' : 'Criar Origem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
