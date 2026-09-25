import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, UserPlus, Phone, User, DollarSign, Building2, 
  MessageSquare, Sparkles, ArrowRight, Loader2, Zap, Sliders 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { LeadSource, CrmStage } from '../../types/admin';

interface AdminNewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFunnelId?: string;
  defaultVenueId?: string;
  currentFunnelName?: string | null;
  initialMode?: 'quick' | 'full';
  onLeadCreated?: (leadId: string) => void;
}

export const AdminNewLeadModal: React.FC<AdminNewLeadModalProps> = ({
  isOpen,
  onClose,
  defaultFunnelId,
  defaultVenueId,
  currentFunnelName,
  initialMode = 'quick',
  onLeadCreated,
}) => {
  const { 
    venues, 
    funnels, 
    sources, 
    activeVenueId, 
    currentUser,
    createLead 
  } = useAdminState();

  const [mode, setMode] = useState<'quick' | 'full'>('quick');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [venueId, setVenueId] = useState<string>('');
  const [source, setSource] = useState<LeadSource>('cadastro_interno');
  const [sourceId, setSourceId] = useState<string>('');
  const [estimatedBudget, setEstimatedBudget] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Localiza o funil atual em que o usuário está
  const targetFunnel = useMemo(() => {
    if (defaultFunnelId) {
      const found = funnels.find(f => f.id === defaultFunnelId);
      if (found) return found;
    }
    // Fallback: funil primário ou primeiro disponível
    return funnels.find(f => f.isPrimary) || funnels[0] || null;
  }, [funnels, defaultFunnelId]);

  // Nome de exibição do funil
  const displayFunnelName = currentFunnelName || targetFunnel?.name || 'Funil Comercial';

  // A casa de festas é livre para ser escolhida pelo usuário
  const isVenueFixedByFunnel = false;

  // Inicializar formulário ao abrir
  useEffect(() => {
    if (!isOpen) return;

    setMode(initialMode || 'quick');
    setErrorMsg(null);
    setIsSubmitting(false);
    setName('');
    setPhone('');
    setEstimatedBudget('');
    setNotes('');

    // Determinar a casa de festas padrão
    const initialVenue = defaultVenueId && defaultVenueId !== 'all'
      ? defaultVenueId
      : (activeVenueId && activeVenueId !== 'all' ? activeVenueId : (venues[0]?.id || ''));
    setVenueId(initialVenue);

    setSource('cadastro_interno');
    setSourceId('');
  }, [isOpen, defaultVenueId, activeVenueId, venues, targetFunnel, initialMode]);

  // Lista de origens filtradas pela casa ou gerais, OBRIGATORIAMENTE excluindo canais automáticos/sistema
  const availableSources = useMemo(() => {
    return sources.filter(s => {
      if (s.status !== 'active') return false;
      if (s.venueId && s.venueId !== 'all' && s.venueId !== venueId) return false;
      const lowerName = s.name.toLowerCase();
      // Bloquear canais internos de indicação direta no seletor
      if (lowerName.includes('espaço f5') || lowerName.includes('f5 system') || lowerName.includes('indicação app')) {
        return false;
      }
      return true;
    });
  }, [sources, venueId]);

  // Formatação de moeda amigável
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setEstimatedBudget('');
      return;
    }
    const num = parseInt(rawDigits, 10) / 100;
    setEstimatedBudget(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  // Máscara simples de Telefone Brasileiro
  const maskPhoneInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanPhoneDigits = phone.replace(/\D/g, '');

    if (!cleanName) {
      setErrorMsg('Por favor, informe o nome do lead.');
      return;
    }

    if (cleanPhoneDigits.length < 10) {
      setErrorMsg('Informe um número de telefone/WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }

    const finalVenueId = venueId || (venues[0]?.id || '');
    if (!finalVenueId) {
      setErrorMsg('Selecione uma casa de festas para vincular este lead.');
      return;
    }

    const finalFunnelId = targetFunnel?.id || defaultFunnelId || 'f1111111-1111-1111-1111-111111111111';

    setIsSubmitting(true);

    try {
      // Determina a primeira etapa válida do funil
      let initialStage = 'new_lead';
      if (targetFunnel && targetFunnel.stages && targetFunnel.stages.length > 0) {
        if (targetFunnel.isEntryStageActive) {
          const entryStage = targetFunnel.stages.find(s => s.id === 'new_lead' || s.name.toLowerCase().includes('entrada'));
          initialStage = entryStage ? entryStage.id : targetFunnel.stages[0].id;
        } else {
          const activeStages = targetFunnel.stages.filter(s => s.id !== 'new_lead' && !s.name.toLowerCase().includes('entrada') && !s.isWon && !s.isLoss);
          initialStage = activeStages[0]?.id || targetFunnel.stages[0].id;
        }
      }

      // Origem legível
      const selectedSourceObj = sources.find(s => s.id === sourceId);
      const parsedBudget = (mode === 'full' && estimatedBudget)
        ? parseFloat(estimatedBudget.replace(/\./g, '').replace(',', '.')) 
        : undefined;

      const newId = await createLead({
        name: cleanName,
        phone: phone.trim(),
        venueId: finalVenueId,
        funnelId: finalFunnelId,
        stage: initialStage as CrmStage,
        source: mode === 'full' ? (source || 'cadastro_interno') : 'cadastro_interno',
        sourceId: mode === 'full' ? (sourceId || undefined) : undefined,
        sourceName: mode === 'full' ? (selectedSourceObj?.name || (source === 'cadastro_interno' ? 'Cadastro Manual' : undefined)) : 'Cadastro Rápido',
        estimatedBudget: isNaN(parsedBudget as number) ? undefined : parsedBudget,
        notes: mode === 'full' ? (notes.trim() || undefined) : undefined,
        createdBy: currentUser?.id,
        createdByName: currentUser?.name || 'Cadastro Manual',
        createdByAvatar: currentUser?.avatarUrl,
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

  if (!isOpen) return null;

  const fixedVenueName = venues.find(v => v.id === targetFunnel?.venueId)?.name;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
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
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--adm-bg-card, #FFFFFF)',
          border: '1px solid var(--adm-border, #E2E8F0)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--adm-border, #E2E8F0)',
            background: 'var(--adm-bg-surface, #F8FAFC)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: mode === 'quick' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(20, 169, 215, 0.12)',
                color: mode === 'quick' ? '#10B981' : 'var(--adm-accent, #14A9D7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mode === 'quick' ? <Zap size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', margin: 0 }}>
                {mode === 'quick' ? 'Cadastro Rápido de Lead' : 'Cadastro Personalizado de Lead'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #64748B)' }}>
                  Inserindo no:
                </span>
                <span 
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#0284C7',
                    background: 'rgba(2, 132, 199, 0.08)',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
                  }}
                >
                  {displayFunnelName}{isVenueFixedByFunnel ? ` • ${fixedVenueName}` : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #64748B)',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--adm-text-title, #0F172A)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted, #64748B)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── SELETOR DE MODO: RÁPIDO VS PERSONALIZADO ── */}
        <div style={{ padding: '12px 20px 0 20px', background: 'var(--adm-bg-card, #FFFFFF)' }}>
          <div style={{
            display: 'flex',
            background: 'var(--adm-bg-input, #F1F5F9)',
            padding: '3px',
            borderRadius: '8px',
            gap: '4px',
          }}>
            <button
              type="button"
              onClick={() => setMode('quick')}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'quick' ? 'var(--adm-bg-card, #FFFFFF)' : 'transparent',
                color: mode === 'quick' ? '#10B981' : 'var(--adm-text-muted, #64748B)',
                boxShadow: mode === 'quick' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={14} />
              <span>⚡ Cadastro Rápido</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('full')}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'full' ? 'var(--adm-bg-card, #FFFFFF)' : 'transparent',
                color: mode === 'full' ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-text-muted, #64748B)',
                boxShadow: mode === 'full' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Sliders size={14} />
              <span>📋 Cadastro Personalizado</span>
            </button>
          </div>
        </div>

        {/* ── FORM BODY ── */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--adm-bg-card, #FFFFFF)' }}>
          {errorMsg && (
            <div 
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                color: '#DC2626',
                fontSize: '0.78rem',
                lineHeight: 1.4,
                fontWeight: 600,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Nome Completo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', marginBottom: '5px' }}>
              Nome do Lead <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #64748B)' }}>
                <User size={15} />
              </div>
              <input
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Mariana Souza"
                style={{
                  width: '100%',
                  height: '38px',
                  paddingLeft: '34px',
                  paddingRight: '12px',
                  backgroundColor: 'var(--adm-bg-input, #F8FAFC)',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  borderRadius: '8px',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Casa de Festas Vinculada */}
          {!isVenueFixedByFunnel && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', marginBottom: '5px' }}>
                Casa de Festa Vinculada <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #64748B)' }}>
                  <Building2 size={14} />
                </div>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    paddingLeft: '30px',
                    paddingRight: '10px',
                    backgroundColor: 'var(--adm-bg-input, #F8FAFC)',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    borderRadius: '8px',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.8rem',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* WhatsApp / Telefone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', marginBottom: '5px' }}>
              WhatsApp do Lead <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #64748B)' }}>
                <Phone size={15} />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
                placeholder="(21) 99999-9999"
                style={{
                  width: '100%',
                  height: '38px',
                  paddingLeft: '34px',
                  paddingRight: '12px',
                  backgroundColor: 'var(--adm-bg-input, #F8FAFC)',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  borderRadius: '8px',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* CAMPOS ADICIONAIS DO CADASTRO PERSONALIZADO */}
          {mode === 'full' && (
            <>
              {/* Origem */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', marginBottom: '5px' }}>
                  Canal de Origem
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #64748B)' }}>
                    <MessageSquare size={14} />
                  </div>
                  <select
                    value={sourceId ? `custom_${sourceId}` : source}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('custom_')) {
                        setSourceId(val.replace('custom_', ''));
                        setSource('outro');
                      } else {
                        setSourceId('');
                        setSource(val as LeadSource);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '38px',
                      paddingLeft: '30px',
                      paddingRight: '10px',
                      backgroundColor: 'var(--adm-bg-input, #F8FAFC)',
                      border: '1px solid var(--adm-border, #CBD5E1)',
                      borderRadius: '8px',
                      color: 'var(--adm-text-title, #0F172A)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="cadastro_interno">Cadastro Manual</option>
                    <option value="whatsapp">WhatsApp Comercial</option>
                    <option value="instagram">Instagram</option>
                    <option value="indicacao">Indicação</option>
                    <option value="trafego_pago">Tráfego Pago (Ads)</option>
                    <option value="google">Google</option>
                    <option value="site">Site Oficial</option>
                    {availableSources.map(s => (
                      <option key={s.id} value={`custom_${s.id}`}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor Estimado / Orçamento Inicial */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', marginBottom: '5px' }}>
                  Valor Estimado / Orçamento Inicial <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted, #64748B)', fontWeight: 500 }}>(opcional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #64748B)' }}>
                    <DollarSign size={15} />
                  </div>
                  <input
                    type="text"
                    value={estimatedBudget ? `R$ ${estimatedBudget}` : ''}
                    onChange={handleBudgetChange}
                    placeholder="R$ 0,00"
                    style={{
                      width: '100%',
                      height: '38px',
                      paddingLeft: '34px',
                      paddingRight: '12px',
                      backgroundColor: 'var(--adm-bg-input, #F8FAFC)',
                      border: '1px solid var(--adm-border, #CBD5E1)',
                      borderRadius: '8px',
                      color: 'var(--adm-text-title, #0F172A)',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Anotação Rápida */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', marginBottom: '5px' }}>
                  Anotação Rápida <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted, #64748B)', fontWeight: 500 }}>(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Algum recado inicial do cliente (ex: procura data para nov/2026)..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--adm-bg-input, #F8FAFC)',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    borderRadius: '8px',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.8rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          {/* Informativo de Automação */}
          <div 
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(20, 169, 215, 0.06)',
              border: '1px dashed rgba(20, 169, 215, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--adm-accent, #14A9D7)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #64748B)', lineHeight: 1.3 }}>
              Ao salvar, a <strong>Caixa de Atendimento WhatsApp</strong> deste lead será aberta imediatamente.
            </span>
          </div>

          {/* ── FOOTER ACTIONS ── */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '6px',
              paddingTop: '14px',
              borderTop: '1px solid var(--adm-border, #E2E8F0)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: 'transparent',
                border: '1px solid var(--adm-border, #CBD5E1)',
                color: 'var(--adm-text-muted, #64748B)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.78rem',
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
                background: mode === 'quick' ? '#10B981' : 'var(--adm-accent, #14A9D7)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: mode === 'quick' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : '0 2px 8px rgba(20, 169, 215, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'quick' ? '⚡ Criar Lead Rápido' : 'Criar Lead Completo'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
