import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Compass, PhoneCall, FileText, Gift,
  AlertCircle, Plus, Trash2, KeyRound
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Source, SourceType, FormField, FormFieldType, WhatsAppSubSource } from '../../types/sources';

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
  const [type, setType] = useState<SourceType>('form');
  const [funnelId, setFunnelId] = useState('');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // WhatsApp Sub-sources
  const [subSources, setSubSources] = useState<WhatsAppSubSource[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubKeyword, setNewSubKeyword] = useState('');
  const [newSubFunnelId, setNewSubFunnelId] = useState('');

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
      setType((sourceToEdit.type === 'tracking_link' ? 'whatsapp_api' : sourceToEdit.type) || 'form');
      setFunnelId(sourceToEdit.funnelId || '');
      setWhatsappInstanceId(sourceToEdit.whatsappInstanceId || '');
      setSlug(sourceToEdit.slug || '');
      setStatus(sourceToEdit.status || 'active');

      const config = sourceToEdit.configuration || {};
      setSubSources(config.subSources || []);
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
      setType('whatsapp_api');
      setFunnelId(availableFunnels[0]?.id || 'comercial');
      setWhatsappInstanceId('');
      setSlug('');
      setStatus('active');
      setSubSources([]);
      setNewSubName('');
      setNewSubKeyword('');
      setNewSubFunnelId('');
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

  // Auto-generate slug when typing name for forms
  const handleNameChange = (val: string) => {
    setName(val);
    if (!sourceToEdit && !slug && type === 'form') {
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

  const handleAddSubSource = () => {
    if (!newSubName.trim()) {
      setErrorMsg('Informe o nome da sub-origem (ex: Instagram, Google Ads, TikTok).');
      return;
    }
    if (!newSubKeyword.trim()) {
      setErrorMsg('Informe a palavra-chave ou frase de identificação da primeira mensagem.');
      return;
    }

    const sub: WhatsAppSubSource = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newSubName.trim(),
      keyword: newSubKeyword.trim().toLowerCase(),
      funnelId: newSubFunnelId || undefined,
    };

    setSubSources(prev => [...prev, sub]);
    setNewSubName('');
    setNewSubKeyword('');
    setNewSubFunnelId('');
    setErrorMsg('');
  };

  const handleRemoveSubSource = (subId: string) => {
    setSubSources(prev => prev.filter(s => s.id !== subId));
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
      setErrorMsg('Selecione o Funil de Destino padrão para onde os leads serão enviados.');
      return;
    }

    if (type === 'form' && !slug.trim()) {
      setErrorMsg('Informe um slug único para a URL pública do formulário.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      const configuration = {
        ...(type === 'whatsapp_api' ? { instanceName: whatsappInstanceId, subSources } : {}),
        ...(type === 'form' ? { title: formTitle, description: formDescription, fields: formFields, successMessage, buttonText } : {}),
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
          slug: type === 'form' ? formattedSlug : undefined,
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
          slug: type === 'form' ? formattedSlug : undefined,
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
        maxWidth: '720px',
        maxHeight: '92vh',
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
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Compass size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                {sourceToEdit ? 'Editar Origem' : 'Nova Origem de Leads'}
              </h2>
              <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                Configure a porta de entrada comercial e o roteamento por funil
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

          {/* 1. Tipo de Origem (3 Opções Principais) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Tipo de Origem
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { id: 'whatsapp_api', label: 'WhatsApp API', icon: <PhoneCall size={16} />, desc: 'Número, sub-origens & palavras-chave' },
                { id: 'form', label: 'Formulário Público', icon: <FileText size={16} />, desc: 'Landing page ou Embed externa' },
                { id: 'referral', label: 'Indicação no App', icon: <Gift size={16} />, desc: 'Indicações de Debutantes' },
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => setType(t.id as SourceType)}
                  style={{
                    padding: '14px 12px',
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
                  <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', lineHeight: '1.3' }}>
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Casa de Festa e Funil Padrão (Obrigatórios) */}
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
                Funil de Destino Padrão <span style={{ color: '#EF4444' }}>*</span>
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
                placeholder={type === 'whatsapp_api' ? 'Ex: WhatsApp Comercial Principal' : 'Ex: Formulário Site Oficial'}
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

          {/* 4. Configuração Específica: WhatsApp API com Sub-origens Inteligentes */}
          {type === 'whatsapp_api' && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneCall size={16} color="var(--adm-accent)" />
                  <span>Conexão WhatsApp & Sub-origens Inteligentes</span>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  Rastreio Automático
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                  Número ou Identificador da Instância
                </label>
                <input
                  type="text"
                  value={whatsappInstanceId}
                  onChange={(e) => setWhatsappInstanceId(e.target.value)}
                  placeholder="Ex: 5521999999999 ou WhatsApp 01 - Comercial"
                  className="adm-input"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                />
              </div>

              {/* Sub-origens Manager */}
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <KeyRound size={14} color="var(--adm-accent)" />
                      <span>Sub-origens com Palavras-chave & Roteamento por Funil</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                      A primeira mensagem enviada pelo lead é lida automaticamente. Se contiver a palavra-chave, a sub-origem é atribuída e o lead vai para o funil configurado.
                    </div>
                  </div>
                </div>

                {/* Sub-sources List */}
                {subSources.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {subSources.map(sub => {
                      const subFunnel = funnels.find(f => f.id === sub.funnelId);
                      return (
                        <div
                          key={sub.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'var(--adm-bg-input)',
                            borderRadius: '10px',
                            border: '1px solid var(--adm-border)',
                            fontSize: '0.76rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              🏷️ {sub.name}
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              color: '#3B82F6',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              fontFamily: 'monospace'
                            }}>
                              "{sub.keyword}"
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: 'rgba(212, 175, 55, 0.1)',
                              color: 'var(--adm-accent)',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}>
                              🎯 {subFunnel?.name || 'Funil Padrão da Origem'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSubSource(sub.id)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            title="Remover sub-origem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.74rem',
                    background: 'var(--adm-bg-input)',
                    borderRadius: '10px',
                    border: '1px dashed var(--adm-border)',
                  }}>
                    Nenhuma sub-origem cadastrada. Leads recebidos sem palavra-chave serão identificados apenas como <strong>WhatsApp</strong>.
                  </div>
                )}

                {/* Add Sub-source Form */}
                <div style={{
                  padding: '12px',
                  background: 'var(--adm-bg-input)',
                  borderRadius: '10px',
                  border: '1px solid var(--adm-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    + Adicionar Nova Sub-origem
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.5fr auto', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="Ex: Instagram"
                      className="adm-input"
                      style={{ height: '34px', fontSize: '0.74rem', borderRadius: '6px' }}
                    />
                    <input
                      type="text"
                      value={newSubKeyword}
                      onChange={(e) => setNewSubKeyword(e.target.value)}
                      placeholder="Palavra-chave: ex: insta"
                      className="adm-input"
                      style={{ height: '34px', fontSize: '0.74rem', borderRadius: '6px' }}
                    />
                    <select
                      value={newSubFunnelId}
                      onChange={(e) => setNewSubFunnelId(e.target.value)}
                      className="adm-input"
                      style={{ height: '34px', fontSize: '0.74rem', borderRadius: '6px' }}
                    >
                      <option value="">🎯 Funil Padrão ({scopedFunnels.find(f => f.id === funnelId)?.name || 'Padrão'})</option>
                      {scopedFunnels.map(f => (
                        <option key={f.id} value={f.id}>🎯 {f.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddSubSource}
                      className="adm-btn-primary"
                      style={{ height: '34px', padding: '0 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}
                    >
                      <Plus size={14} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
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

          {/* 6. Configuração Específica: Indicação */}
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
