import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, UserPlus, Phone, Mail, User, GitBranch, 
  Tag, Calendar, Users, DollarSign, AlertCircle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput } from '../../utils/phoneFormatter';
import type { CrmStage, LeadSource, LeadEventType, LeadTemperature } from '../../types/admin';

interface AdminNewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFunnelId?: string | null;
  defaultVenueId?: string | null;
  onLeadCreated?: (leadId: string) => void;
}

export const AdminNewLeadModal: React.FC<AdminNewLeadModalProps> = ({
  isOpen,
  onClose,
  defaultFunnelId,
  defaultVenueId,
  onLeadCreated,
}) => {
  const { 
    venues, 
    funnels, 
    collaborators, 
    sources, 
    activeVenueId, 
    createLead 
  } = useAdminState();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [venueId, setVenueId] = useState<string>('');
  const [funnelId, setFunnelId] = useState<string>('');
  const [stage, setStage] = useState<CrmStage>('new_lead');
  const [source, setSource] = useState<LeadSource>('whatsapp');
  const [sourceId, setSourceId] = useState<string>('');
  const [subSource, setSubSource] = useState('');
  const [sdrId, setSdrId] = useState<string>('');
  const [closerId, setCloserId] = useState<string>('');
  const [eventType, setEventType] = useState<LeadEventType>('15 Anos');
  const [eventDate, setEventDate] = useState('');
  const [estimatedGuests, setEstimatedGuests] = useState<string>('');
  const [estimatedBudget, setEstimatedBudget] = useState<string>('');
  const [temperature, setTemperature] = useState<LeadTemperature>('warm');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar dados quando o modal abre
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setIsSubmitting(false);
    setName('');
    setPhone('');
    setEmail('');
    setSubSource('');
    setEventType('15 Anos');
    setEventDate('');
    setEstimatedGuests('');
    setEstimatedBudget('');
    setTemperature('warm');
    setNotes('');

    // Determinar casa inicial
    const initialVenueId = defaultVenueId || activeVenueId || (venues[0]?.id ?? '');
    setVenueId(initialVenueId);

    // Determinar funis da casa
    const availableFunnels = funnels.filter(f => !initialVenueId || f.venueId === initialVenueId);
    const targetFunnel = (defaultFunnelId && availableFunnels.some(f => f.id === defaultFunnelId))
      ? defaultFunnelId
      : (availableFunnels[0]?.id ?? 'comercial');
    setFunnelId(targetFunnel);

    // Determinar estágio inicial baseado no funil
    const currentFunnelObj = funnels.find(f => f.id === targetFunnel);
    if (currentFunnelObj && currentFunnelObj.stages && currentFunnelObj.stages.length > 0) {
      setStage(currentFunnelObj.stages[0].id as CrmStage);
    } else {
      setStage('new_lead');
    }

    setSource('whatsapp');
    setSourceId('');
    setSdrId('');
    setCloserId('');
  }, [isOpen, defaultVenueId, defaultFunnelId, activeVenueId, venues, funnels]);

  // Atualizar funis quando a casa de festas muda
  const filteredFunnels = useMemo(() => {
    if (!venueId) return funnels;
    return funnels.filter(f => f.venueId === venueId);
  }, [funnels, venueId]);

  // Quando a casa muda, atualiza o funil selecionado se necessário
  const handleVenueChange = (newVenueId: string) => {
    setVenueId(newVenueId);
    const validFunnels = funnels.filter(f => f.venueId === newVenueId);
    if (validFunnels.length > 0 && !validFunnels.some(f => f.id === funnelId)) {
      setFunnelId(validFunnels[0].id);
      if (validFunnels[0].stages && validFunnels[0].stages.length > 0) {
        setStage(validFunnels[0].stages[0].id as CrmStage);
      }
    }
  };

  // Quando o funil muda, atualiza o estágio inicial padrão
  const handleFunnelChange = (newFunnelId: string) => {
    setFunnelId(newFunnelId);
    const targetFunnelObj = funnels.find(f => f.id === newFunnelId);
    if (targetFunnelObj && targetFunnelObj.stages && targetFunnelObj.stages.length > 0) {
      setStage(targetFunnelObj.stages[0].id as CrmStage);
    }
  };

  // Obter estágios do funil selecionado
  const availableStages = useMemo(() => {
    const currentFunnelObj = funnels.find(f => f.id === funnelId);
    if (currentFunnelObj && currentFunnelObj.stages && currentFunnelObj.stages.length > 0) {
      return currentFunnelObj.stages;
    }
    return [
      { id: 'new_lead', name: 'Novo Lead', color: '#3B82F6' },
      { id: 'contacted', name: 'Em Contato', color: '#8B5CF6' },
      { id: 'visit_scheduled', name: 'Visita Agendada', color: '#F59E0B' },
      { id: 'proposal_sent', name: 'Proposta Enviada', color: '#10B981' },
      { id: 'contract_signed', name: 'Fechamento', color: '#059669' },
    ];
  }, [funnelId, funnels]);

  // Origens da casa selecionada
  const venueSources = useMemo(() => {
    if (!venueId) return sources.filter(s => s.status === 'active');
    return sources.filter(s => s.venueId === venueId && s.status === 'active');
  }, [sources, venueId]);

  // Colaboradores SDR e Closer
  const sdrCollaborators = useMemo(() => {
    return collaborators.filter(c => c.role === 'sdr' || c.role === 'admin' || c.role === 'master');
  }, [collaborators]);

  const closerCollaborators = useMemo(() => {
    return collaborators.filter(c => c.role === 'closer' || c.role === 'admin' || c.role === 'master');
  }, [collaborators]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Por favor, informe o nome completo do lead.');
      return;
    }

    const digitsPhone = phone.replace(/\D/g, '');
    if (!digitsPhone || digitsPhone.length < 10) {
      setErrorMsg('Por favor, informe um número de WhatsApp/telefone válido com DDD (mínimo 10 dígitos).');
      return;
    }

    if (!venueId) {
      setErrorMsg('Por favor, selecione a unidade / casa de festas.');
      return;
    }

    if (!funnelId) {
      setErrorMsg('Por favor, selecione o funil comercial de destino.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSourceObj = venueSources.find(s => s.id === sourceId);
      const selectedSdr = sdrCollaborators.find(c => c.id === sdrId);
      const selectedCloser = closerCollaborators.find(c => c.id === closerId);

      const parsedGuests = estimatedGuests ? parseInt(estimatedGuests, 10) : undefined;
      const parsedBudget = estimatedBudget ? parseFloat(estimatedBudget.replace(/\./g, '').replace(',', '.')) : undefined;

      const newId = await createLead({
        name: cleanName,
        phone: phone.trim(),
        email: email.trim() || undefined,
        venueId,
        funnelId,
        stage,
        source,
        sourceId: sourceId || undefined,
        sourceName: selectedSourceObj?.name,
        subSource: subSource.trim() || undefined,
        sdrId: sdrId || undefined,
        sdrName: selectedSdr?.name,
        closerId: closerId || undefined,
        closerName: selectedCloser?.name,
        eventType,
        eventDate: eventDate || undefined,
        estimatedGuests: isNaN(parsedGuests as number) ? undefined : parsedGuests,
        estimatedBudget: isNaN(parsedBudget as number) ? undefined : parsedBudget,
        temperature,
        notes: notes.trim() || undefined,
      });

      if (onLeadCreated) {
        onLeadCreated(newId);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao criar lead:', err);
      setErrorMsg(err?.message || 'Falha ao salvar o novo lead. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div 
        style={{
          background: 'var(--adm-bg-card, #1e1e2d)',
          borderRadius: '16px',
          border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, rgba(99, 102, 241, 0.08), transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--adm-accent, #6366f1), #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
            }}>
              <UserPlus size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--adm-text-title, #fff)' }}>
                Novo Lead Comercial
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted, #94a3b8)', margin: '2px 0 0 0' }}>
                Cadastre manualmente um novo contato diretamente no Funil CRM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seção 1: Dados de Contato */}
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-accent, #6366f1)', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} />
              <span>Identificação do Lead</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Nome Completo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Carolina Silva"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  WhatsApp / Telefone <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #94a3b8)' }} />
                  <input
                    type="text"
                    required
                    placeholder="(21) 99999-9999"
                    value={phone}
                    onChange={e => setPhone(maskPhoneInput(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                      background: 'var(--adm-bg-input, #13141f)',
                      color: 'var(--adm-text-title, #fff)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  E-mail <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94a3b8)' }}>(Opcional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #94a3b8)' }} />
                  <input
                    type="email"
                    placeholder="email@exemplo.com.br"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                      background: 'var(--adm-bg-input, #13141f)',
                      color: 'var(--adm-text-title, #fff)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Localização no Funil CRM */}
          <div style={{ borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-accent, #6366f1)', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitBranch size={14} />
              <span>Destino Comercial no CRM</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Unidade / Casa <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={venueId}
                  onChange={e => handleVenueChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Funil Comercial <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={funnelId}
                  onChange={e => handleFunnelChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  {filteredFunnels.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Estágio Inicial <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={stage}
                  onChange={e => setStage(e.target.value as CrmStage)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  {availableStages.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção 3: Equipe Responsável & Origem */}
          <div style={{ borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-accent, #6366f1)', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={14} />
              <span>Origem e Atribuição de Equipe</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Origem do Lead
                </label>
                <select
                  value={source}
                  onChange={e => setSource(e.target.value as LeadSource)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="whatsapp">WhatsApp Direto</option>
                  <option value="instagram">Instagram Direct / Ads</option>
                  <option value="trafego_pago">Tráfego Pago / Anúncios</option>
                  <option value="indicacao">Indicação de Debutante / Cliente</option>
                  <option value="parceria">Parceria / Cerimonialista</option>
                  <option value="evento_externo">Evento Presencial / Feira</option>
                  <option value="outro">Outro / Cadastro Manual</option>
                </select>
              </div>

              {venueSources.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                    Canal Específico da Casa
                  </label>
                  <select
                    value={sourceId}
                    onChange={e => setSourceId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                      background: 'var(--adm-bg-input, #13141f)',
                      color: 'var(--adm-text-title, #fff)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    <option value="">Nenhum canal específico</option>
                    {venueSources.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Sub-origem / Campanha
                </label>
                <input
                  type="text"
                  placeholder="Ex: Campanha Debutantes 2026"
                  value={subSource}
                  onChange={e => setSubSource(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  SDR (Qualificador)
                </label>
                <select
                  value={sdrId}
                  onChange={e => setSdrId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Sem SDR atribuído</option>
                  {sdrCollaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Closer (Negociador)
                </label>
                <select
                  value={closerId}
                  onChange={e => setCloserId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Sem Closer atribuído</option>
                  {closerCollaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role.toUpperCase()})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção 4: Dados do Evento e Negociação */}
          <div style={{ borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-accent, #6366f1)', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              <span>Dados do Evento e Negociação</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Tipo de Evento
                </label>
                <select
                  value={eventType}
                  onChange={e => setEventType(e.target.value as LeadEventType)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="15 Anos">15 Anos (Debutante)</option>
                  <option value="Casamento">Casamento</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Infantil">Infantil</option>
                  <option value="Bodas">Bodas</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Data Desejada do Evento
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Convidados Estimados
                </label>
                <div style={{ position: 'relative' }}>
                  <Users size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #94a3b8)' }} />
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 150"
                    value={estimatedGuests}
                    onChange={e => setEstimatedGuests(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                      background: 'var(--adm-bg-input, #13141f)',
                      color: 'var(--adm-text-title, #fff)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Orçamento Estimado (R$)
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #94a3b8)' }} />
                  <input
                    type="text"
                    placeholder="Ex: 25000"
                    value={estimatedBudget}
                    onChange={e => setEstimatedBudget(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                      background: 'var(--adm-bg-input, #13141f)',
                      color: 'var(--adm-text-title, #fff)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
                  Temperatura Inicial
                </label>
                <select
                  value={temperature}
                  onChange={e => setTemperature(e.target.value as LeadTemperature)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    background: 'var(--adm-bg-input, #13141f)',
                    color: 'var(--adm-text-title, #fff)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="hot">🔥 Quente (Alta Probabilidade)</option>
                  <option value="warm">🟡 Morno (Interessado / Em análise)</option>
                  <option value="cold">🔵 Frio (Pesquisando a longo prazo)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção 5: Observações */}
          <div style={{ borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-title, #fff)', marginBottom: '6px' }}>
              Anotações / Observações Iniciais
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Anfitriã busca salão com jardim externo para festa em outono de 2026..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                background: 'var(--adm-bg-input, #13141f)',
                color: 'var(--adm-text-title, #fff)',
                fontSize: '0.88rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Footer Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                background: 'transparent',
                color: 'var(--adm-text-muted, #94a3b8)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--adm-accent, #6366f1), #4f46e5)',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <>Salvando Lead...</>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Cadastrar Lead</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
