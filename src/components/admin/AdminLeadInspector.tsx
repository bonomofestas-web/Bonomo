import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, Trash2, Check,
  ChevronLeft, ChevronRight, Plus,
  Shield, User, PartyPopper, DollarSign, Users,
  CheckCircle2, Clock, X, MessageCircle, Sparkles,
  Globe, ExternalLink, Award, FileText, Copy, Tag,
  Building2, Crown, PhoneCall, Eye
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput, formatPhone } from '../../utils/phoneFormatter';
import { ICP_SITUATION_CONFIG } from '../../types/admin';
import { ComingSoonOverlay } from './ComingSoonOverlay';
import type { 
  Lead, 
  CrmStage, 
  LeadContactRole,
  LeadContact,
  LeadEventType,
  LeadTemperature,
  LeadMqlLevel
} from '../../types/admin';

interface AdminLeadInspectorProps {
  lead: Lead;
  onWhatsApp?: (lead: Lead) => void;
  onStageChange: (stage: CrmStage) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  readOnly?: boolean;
}

const STAGE_CONFIGS: Record<CrmStage, { label: string; color: string; bg: string; border: string }> = {
  new_lead:          { label: 'Novo Lead',                    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: '#60A5FA' },
  in_analysis:       { label: 'Em Análise / Contato',         color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  border: '#FBBF24' },
  meeting_scheduled: { label: 'Reunião / Degustação',         color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: '#A78BFA' },
  contract_signed:   { label: 'Contrato Fechado (Venda VIP)', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: '#10B981' },
  lost:              { label: 'Perdido / Recusado',           color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: '#EF4444' },
};

const STAGE_LIST: CrmStage[] = ['new_lead', 'in_analysis', 'meeting_scheduled', 'contract_signed', 'lost'];

const CONTACT_ROLE_LABELS: Record<string, string> = {
  aniversariante: 'Aniversariante',
  debutante: 'Debutante',
  mae: 'Mãe',
  pai: 'Pai',
  mother: 'Mãe',
  father: 'Pai',
  tio: 'Tio(a)',
  noivo: 'Noivo(a)',
  responsavel: 'Responsável',
  decision_maker: 'Responsável / Decisor',
  outro: 'Outro',
  other: 'Outro',
};

const EVENT_TYPE_OPTIONS: LeadEventType[] = ['15 Anos', 'Casamento', 'Infantil', 'Formatura', 'Corporativo', 'Outro'];

export const AdminLeadInspector: React.FC<AdminLeadInspectorProps> = ({
  lead,
  onStageChange,
  onToggleCollapse,
  isCollapsed,
  readOnly = false,
}) => {
  const { 
    currentUser, 
    collaborators, 
    venues,
    funnels,
    sources,
    mqlQuestions,
    updateLeadData, 
    validateLead, 
    invalidateLead,
    assignLeadSdr,
    assignLeadCloser,
    removeLeadSdr,
    removeLeadCloser,
    saveLeadMqlAnswers,
    getFeatureStatus,
  } = useAdminState();

  const isIcpDisabled = getFeatureStatus('icp') === 'disabled' && currentUser?.role !== 'dev';
  const isIcpComingSoon = getFeatureStatus('icp') === 'coming_soon' && currentUser?.role !== 'dev';
  const isSourcesDisabled = getFeatureStatus('sources') === 'disabled' && currentUser?.role !== 'dev';
  const isSourcesComingSoon = getFeatureStatus('sources') === 'coming_soon' && currentUser?.role !== 'dev';

  const [activeTab, setActiveTab] = useState<'principal' | 'origem' | 'mql'>('principal');
  const [copiedCode, setCopiedCode] = useState(false);

  // Fallback if current tab gets disabled
  React.useEffect(() => {
    if (isIcpDisabled && activeTab === 'mql') setActiveTab('principal');
    if (isSourcesDisabled && activeTab === 'origem') setActiveTab('principal');
  }, [isIcpDisabled, isSourcesDisabled, activeTab]);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState<LeadContactRole>('mother');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const leadVenue = venues.find(v => v.id === lead.venueId);
  const leadFunnel = lead.funnelId ? funnels.find(f => f.id === lead.funnelId) : undefined;
  const leadSource = lead.sourceId ? sources.find(s => s.id === lead.sourceId) : undefined;
  const sdrCollab = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : undefined;

  const isManagerOrMaster = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const sdrList = collaborators.filter(c => c.active && (c.role === 'sdr' || c.role === 'admin' || c.role === 'master'));
  const closerList = collaborators.filter(c => c.active && (c.role === 'closer' || c.role === 'admin' || c.role === 'master'));

  const isReferralLead = lead.source === 'indicacao' || Boolean(lead.debutanteName || lead.debutanteId);

  // MQL Questions for this venue
  const venueMqlQuestions = useMemo(() => {
    return mqlQuestions.filter(q => q.venueId === lead.venueId || q.venueId === 'all');
  }, [mqlQuestions, lead.venueId]);

  // Current MQL state
  const [mqlAnswers, setMqlAnswers] = useState<Record<string, string>>(lead.mqlAnswers || {});

  // Calculate MQL dynamically
  const mqlResult = useMemo(() => {
    if (venueMqlQuestions.length === 0) {
      return { score: lead.mqlScore || 0, level: lead.mqlLevel || 'cold' };
    }
    let totalMax = 0;
    let earned = 0;

    venueMqlQuestions.forEach(q => {
      const maxPts = q.options.length > 0 ? Math.max(...q.options.map(o => o.points)) : 100;
      totalMax += maxPts;
      const selectedId = mqlAnswers[q.id];
      if (selectedId) {
        const opt = q.options.find(o => o.id === selectedId);
        if (opt) earned += opt.points;
      }
    });

    const score = totalMax > 0 ? Math.round((earned / totalMax) * 100) : 0;
    let level: LeadMqlLevel = 'cold';
    if (score >= 80) level = 'top';
    else if (score >= 50) level = 'qualified';

    return { score, level };
  }, [venueMqlQuestions, mqlAnswers, lead.mqlScore, lead.mqlLevel]);

  const handleSelectMqlOption = (questionId: string, optionId: string) => {
    const updated = { ...mqlAnswers, [questionId]: optionId };
    setMqlAnswers(updated);

    // Compute updated score
    let totalMax = 0;
    let earned = 0;
    venueMqlQuestions.forEach(q => {
      const maxPts = q.options.length > 0 ? Math.max(...q.options.map(o => o.points)) : 100;
      totalMax += maxPts;
      const optId = updated[q.id];
      if (optId) {
        const opt = q.options.find(o => o.id === optId);
        if (opt) earned += opt.points;
      }
    });
    const score = totalMax > 0 ? Math.round((earned / totalMax) * 100) : 0;
    let level: LeadMqlLevel = 'cold';
    if (score >= 80) level = 'top';
    else if (score >= 50) level = 'qualified';

    saveLeadMqlAnswers(lead.id, updated, score, level);
  };

  const handleUpdate = (updates: Partial<Lead>) => {
    if (readOnly) return;
    updateLeadData(lead.id, updates);
  };

  const handleOpenDirectWhatsApp = (phone?: string) => {
    const targetPhone = phone || lead.phone;
    if (!targetPhone) return;
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const url = cleanPhone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}`
      : `https://api.whatsapp.com/send?phone=${cleanPhone}`;
    window.open(url, '_blank');
  };

  const handleAddSubContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const contact: LeadContact = {
      id: `cnt_${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      role: newContactRole,
      isPrimaryDecisionMaker: false,
    };

    handleUpdate({ contacts: [...(lead.contacts || []), contact] });
    setNewContactName('');
    setNewContactPhone('');
    setIsAddingContact(false);
  };

  const handleSetPrimaryDecisor = (contact: LeadContact) => {
    const updatedContacts = (lead.contacts || []).map(c => ({
      ...c,
      isPrimaryDecisionMaker: c.id === contact.id,
    }));

    handleUpdate({
      contacts: updatedContacts,
      primaryContactRole: contact.role,
      name: contact.name,
      phone: contact.phone,
    });
  };

  const handleRemoveSubContact = (contactId: string) => {
    handleUpdate({ contacts: (lead.contacts || []).filter(c => c.id !== contactId) });
  };

  const handleAddTag = () => {
    const clean = newTagInput.trim();
    if (!clean) return;
    const currentTags = lead.tags || [];
    if (!currentTags.includes(clean)) {
      handleUpdate({ tags: [...currentTags, clean] });
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleUpdate({ tags: (lead.tags || []).filter(t => t !== tagToRemove) });
  };

  const currentStageConfig = STAGE_CONFIGS[lead.stage] || STAGE_CONFIGS.new_lead;
  const currentStageIndex = STAGE_LIST.indexOf(lead.stage);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px 6px',
    background: 'var(--adm-bg-elevated)',
    borderTop: '1px solid var(--adm-border)',
    borderBottom: '1px solid var(--adm-border)',
    fontSize: '0.72rem',
    fontWeight: 900,
    color: 'var(--adm-text-title)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid var(--adm-border)',
    minHeight: '38px',
    fontSize: '0.8rem',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const rowLabelStyle: React.CSSProperties = {
    width: '135px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.74rem',
    fontWeight: 600,
  };

  const rowValueStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  };

  const inlineInputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    padding: '4px 6px',
    color: 'var(--adm-text-title)',
    fontSize: '0.82rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'all 0.15s ease',
  };

  const inlineSelectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '6px',
    padding: '4px 8px',
    color: 'var(--adm-text-title)',
    fontSize: '0.8rem',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--adm-bg-card)',
      borderRight: '1px solid var(--adm-border)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: 'hidden',
    }}>
      
      {/* ── 1. CABEÇALHO DARK & F5 SYSTEM CIANO ──────────────────────────────────── */}
      <div style={{
        padding: '16px 18px 12px',
        borderBottom: '1px solid rgba(20, 169, 215, 0.25)',
        background: 'linear-gradient(180deg, #0B111A 0%, #0F1724 100%)',
        color: '#FFFFFF',
        flexShrink: 0,
      }}>
        {/* Title row + Collapse Button (< / >) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={lead.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              style={{
                ...inlineInputStyle,
                fontSize: '1.15rem',
                fontWeight: 900,
                padding: '2px 4px',
                color: '#FFFFFF',
              }}
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(20, 169, 215, 0.5)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
              title="Clique para editar o nome do lead"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Expandir ficha do lead" : "Recolher ficha do lead"}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(20, 169, 215, 0.3)',
                  color: '#14A9D7',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Tag Oficial de Código Único do Lead (LEAD-XXXXXX) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            borderRadius: '6px',
            padding: '3px 8px',
          }}>
            <Tag size={12} color="#14A9D7" />
            <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>CÓDIGO:</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#14A9D7', letterSpacing: '0.8px', fontFamily: "'Poppins', monospace" }}>
              {lead.code || 'LEAD-NOVO'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (lead.code) {
                  navigator.clipboard.writeText(lead.code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }
              }}
              title="Copiar código do lead"
              style={{
                background: 'transparent',
                border: 'none',
                color: copiedCode ? '#10B981' : '#14A9D7',
                cursor: 'pointer',
                padding: '1px 2px',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '2px',
              }}
            >
              {copiedCode ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          {copiedCode && (
            <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>
              Copiado!
            </span>
          )}
        </div>

        {/* Venue & Debutante info + Origin Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.74rem',
            color: '#A0988A',
            fontWeight: 600,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Building2 size={13} color="var(--adm-accent)" /> {leadVenue?.name || 'Bonomo Festas'}
            </span>
            <span>•</span>
            <strong style={{ color: '#D4AF37', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <Crown size={12} color="#D4AF37" /> Indicada por: {lead.debutanteName}
            </strong>
          </span>

          {/* Origin Badge */}
          {lead.subSource ? (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <PhoneCall size={11} /> WhatsApp / {lead.subSource}
            </span>
          ) : (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '8px',
              background: (lead.source === 'whatsapp' || lead.sourceName?.toLowerCase().includes('whatsapp')) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(212, 175, 55, 0.2)',
              color: (lead.source === 'whatsapp' || lead.sourceName?.toLowerCase().includes('whatsapp')) ? '#10B981' : '#D4AF37',
              border: `1px solid ${(lead.source === 'whatsapp' || lead.sourceName?.toLowerCase().includes('whatsapp')) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(212, 175, 55, 0.4)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {(lead.source === 'whatsapp' || lead.sourceName?.toLowerCase().includes('whatsapp')) ? (
                <>
                  <PhoneCall size={11} /> WhatsApp
                </>
              ) : (
                <>
                  <Crown size={11} /> {lead.sourceName || lead.source || 'Indicação'}
                </>
              )}
            </span>
          )}
        </div>

        {/* Banner de Modo Somente Leitura para Pós-Venda em Funis Comerciais */}
        {readOnly && (
          <div style={{
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            color: 'var(--adm-text-title)',
          }}>
            <Eye size={16} color="#06B6D4" />
            <div>
              <strong style={{ color: '#06B6D4' }}>Modo Somente Leitura (Pós-Venda):</strong> Visualização do lead e histórico comercial permitida. Ações comerciais diretas são restritas aos vendedores.
            </div>
          </div>
        )}

        {/* Pipeline Stage Dropdown with Colored Indicator */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <div
            onClick={() => !readOnly && setIsStageDropdownOpen(!isStageDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 12px',
              background: currentStageConfig.bg,
              border: `1px solid ${currentStageConfig.border}`,
              borderRadius: '8px',
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: currentStageConfig.color,
            }}
          >
            <span>Funil: {currentStageConfig.label}</span>
            {!readOnly && <ChevronDown size={14} />}
          </div>

          {/* Multi-Stage Color Progress Bar */}
          <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
            {STAGE_LIST.map((stg, idx) => {
              const cfg = STAGE_CONFIGS[stg];
              const isFilled = idx <= currentStageIndex && lead.stage !== 'lost';
              return (
                <div
                  key={stg}
                  onClick={() => { if (!readOnly) onStageChange(stg); }}
                  title={cfg.label}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: lead.stage === 'lost' && stg === 'lost' ? '#EF4444' : isFilled ? cfg.color : 'rgba(255,255,255,0.15)',
                    cursor: readOnly ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Stage Dropdown Menu */}
          {isStageDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: '#1A1822',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '10px',
              overflow: 'hidden',
              zIndex: 50,
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            }}>
              {STAGE_LIST.map(stg => {
                const cfg = STAGE_CONFIGS[stg];
                const isSelected = lead.stage === stg;
                return (
                  <div
                    key={stg}
                    onClick={() => {
                      onStageChange(stg);
                      setIsStageDropdownOpen(false);
                    }}
                    style={{
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 800 : 500,
                      color: isSelected ? cfg.color : '#FFFFFF',
                      background: isSelected ? cfg.bg : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? cfg.bg : 'transparent'}
                  >
                    <span>{cfg.label}</span>
                    {isSelected && <Check size={14} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags de Identificação no Topo (Abaixo da Barra de Progresso) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
          {(lead.tags || []).map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                background: 'rgba(212, 175, 55, 0.15)',
                color: '#D4AF37',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                style={{ background: 'transparent', border: 'none', color: '#D4AF37', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={10} />
              </button>
            </span>
          ))}

          {isAddingTag ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="text"
                autoFocus
                placeholder="Nova tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setIsAddingTag(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  outline: 'none',
                  width: '90px',
                }}
              />
              <button
                type="button"
                onClick={handleAddTag}
                style={{
                  background: '#D4AF37',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingTag(true)}
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#A0988A',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                padding: '2px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Plus size={10} /> Tag
            </button>
          )}
        </div>

        {/* Bloco de Destaque: Validação de Indicação no Topo da Ficha (Apenas para Leads de Indicação) */}
        {isReferralLead && (
          <div style={{ marginTop: '10px' }}>
            {lead.isValidated ? (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10B981' }}>
                    Indicação Validada (+1 Ponto na Jornada)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => invalidateLead(lead.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.7rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  Revogar
                </button>
              </div>
            ) : (
              <div style={{
                padding: '8px 12px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(212, 175, 55, 0.08) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="#F59E0B" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FDE68A' }}>
                    Aguardando Validação
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => validateLead(lead.id)}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={13} />
                  <span>Validar Lead (+1 pt)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3 Top Tabs: Principal | Origem | MQL */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('principal')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'principal' ? '2px solid var(--adm-accent, #14A9D7)' : '2px solid transparent',
              padding: '6px 10px',
              color: activeTab === 'principal' ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted)',
              fontSize: '0.76rem',
              fontWeight: activeTab === 'principal' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={13} color={activeTab === 'principal' ? 'var(--adm-accent, #14A9D7)' : 'currentColor'} />
            <span>Principal</span>
          </button>

          {!isSourcesDisabled && (
            <button
              type="button"
              onClick={() => setActiveTab('origem')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'origem' ? '2px solid var(--adm-accent, #14A9D7)' : '2px solid transparent',
                padding: '6px 10px',
                color: activeTab === 'origem' ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted)',
                fontSize: '0.76rem',
                fontWeight: activeTab === 'origem' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Globe size={13} color={activeTab === 'origem' ? 'var(--adm-accent, #14A9D7)' : 'currentColor'} />
              <span>Origem</span>
              {isSourcesComingSoon && (
                <span style={{ fontSize: '0.58rem', background: 'rgba(20,169,215,0.2)', color: '#14A9D7', padding: '1px 4px', borderRadius: '4px' }}>
                  Em Breve
                </span>
              )}
            </button>
          )}

          {!isIcpDisabled && (
            <button
              type="button"
              onClick={() => setActiveTab('mql')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'mql' ? '2px solid var(--adm-accent, #14A9D7)' : '2px solid transparent',
                padding: '6px 10px',
                color: activeTab === 'mql' ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted)',
                fontSize: '0.76rem',
                fontWeight: activeTab === 'mql' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <IcpTargetUserIcon size={14} color={activeTab === 'mql' ? 'var(--adm-accent, #14A9D7)' : 'currentColor'} />
              <span>ICP</span>
              {isIcpComingSoon ? (
                <span style={{ fontSize: '0.58rem', background: 'rgba(20,169,215,0.2)', color: '#14A9D7', padding: '1px 4px', borderRadius: '4px' }}>
                  Em Breve
                </span>
              ) : (
                <span style={{
                  fontSize: '0.6rem',
                  background: mqlResult.level === 'top' ? 'rgba(16,185,129,0.2)' : mqlResult.level === 'qualified' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                  color: mqlResult.level === 'top' ? '#10B981' : mqlResult.level === 'qualified' ? '#F59E0B' : '#EF4444',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontWeight: 800
                }}>
                  {mqlResult.level === 'top' ? 'ICP A' : mqlResult.level === 'qualified' ? 'ICP B' : 'ICP C'} ({mqlResult.score}%)
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── 2. CONTEÚDO DA ABA SELECIONADA ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 1: 📋 PRINCIPAL                                                  */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'principal' && (
          <>
            {/* ── SEÇÃO 1: 🛡️ RESPONSÁVEIS ── */}
            <div style={sectionHeaderStyle}>
              <Shield size={13} color="var(--adm-accent)" />
              <span>1. Responsáveis Comerciais</span>
            </div>

            {/* SDR */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>SDR</span>
              <div style={rowValueStyle}>
                {(!readOnly && (isManagerOrMaster || !lead.sdrId)) ? (
                  <select
                    value={lead.sdrId || ''}
                    onChange={(e) => {
                      if (e.target.value) assignLeadSdr(lead.id, e.target.value);
                      else removeLeadSdr(lead.id);
                    }}
                    style={inlineSelectStyle}
                  >
                    <option value="">Nenhum SDR atribuído...</option>
                    {sdrList.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.role.toUpperCase()})</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    {sdrCollab?.name || 'Nenhum SDR'}
                  </span>
                )}
              </div>
            </div>

            {/* Closer */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Closer</span>
              <div style={rowValueStyle}>
                {isManagerOrMaster || lead.stage === 'meeting_scheduled' || lead.stage === 'contract_signed' ? (
                  <select
                    value={lead.closerId || ''}
                    onChange={(e) => {
                      if (e.target.value) assignLeadCloser(lead.id, e.target.value);
                      else removeLeadCloser(lead.id);
                    }}
                    style={inlineSelectStyle}
                  >
                    <option value="">Nenhum closer atribuído...</option>
                    {closerList.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Closer)</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                    Disponível na etapa de Reunião
                  </span>
                )}
              </div>
            </div>


            {/* ── SEÇÃO 2: 👤 DADOS DO CLIENTE ── */}
            <div style={sectionHeaderStyle}>
              <User size={13} color="var(--adm-accent)" />
              <span>2. Dados do Cliente</span>
            </div>

            {/* Nome do Cliente */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Nome do Lead</span>
              <div style={rowValueStyle}>
                <input
                  type="text"
                  value={lead.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  style={{ ...inlineInputStyle, fontWeight: 700 }}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* WhatsApp com Link Direto Limpo */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>WhatsApp</span>
              <div style={rowValueStyle}>
                <input
                  type="text"
                  value={lead.phone}
                  onChange={(e) => handleUpdate({ phone: maskPhoneInput(e.target.value) })}
                  style={{ ...inlineInputStyle, fontWeight: 700 }}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
                {lead.phone && (
                  <button
                    type="button"
                    onClick={() => handleOpenDirectWhatsApp(lead.phone)}
                    title="Abrir chat do WhatsApp diretamente"
                    style={{
                      background: '#25D366',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    <MessageCircle size={12} />
                    <span>Conversar</span>
                  </button>
                )}
              </div>
            </div>

            {/* E-mail */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>E-mail</span>
              <div style={rowValueStyle}>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={lead.email || ''}
                  onChange={(e) => handleUpdate({ email: e.target.value })}
                  style={inlineInputStyle}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Bairro */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Bairro</span>
              <div style={rowValueStyle}>
                <input
                  type="text"
                  placeholder="Ex: Recreio, Barra, Tijuca..."
                  value={lead.neighborhood || ''}
                  onChange={(e) => handleUpdate({ neighborhood: e.target.value })}
                  style={inlineInputStyle}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Endereço Completo */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Endereço</span>
              <div style={rowValueStyle}>
                <input
                  type="text"
                  placeholder="Rua, número, complemento..."
                  value={lead.address || ''}
                  onChange={(e) => handleUpdate({ address: e.target.value })}
                  style={inlineInputStyle}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>


            {/* ── SEÇÃO 3: 🎉 DADOS DO EVENTO ── */}
            <div style={sectionHeaderStyle}>
              <PartyPopper size={13} color="var(--adm-accent)" />
              <span>3. Dados do Evento</span>
            </div>

            {/* Tipo de Evento */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Tipo de evento</span>
              <div style={rowValueStyle}>
                <select
                  value={lead.eventType || '15 Anos'}
                  onChange={(e) => handleUpdate({ eventType: e.target.value as LeadEventType })}
                  style={inlineSelectStyle}
                >
                  {EVENT_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data do Evento */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Data do evento</span>
              <div style={rowValueStyle}>
                <input
                  type="date"
                  value={lead.eventDate || lead.partyDate || ''}
                  onChange={(e) => handleUpdate({ eventDate: e.target.value, partyDate: e.target.value })}
                  style={inlineSelectStyle}
                />
              </div>
            </div>

            {/* Aniversário da Debutante */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Aniversário deb.</span>
              <div style={rowValueStyle}>
                <input
                  type="date"
                  value={lead.debutanteBirthDate || ''}
                  onChange={(e) => handleUpdate({ debutanteBirthDate: e.target.value })}
                  style={inlineSelectStyle}
                />
              </div>
            </div>

            {/* Quantidade Estimada de Convidados */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Qtd. convidados</span>
              <div style={rowValueStyle}>
                <input
                  type="number"
                  min="0"
                  placeholder="Ex: 150, 200, 250..."
                  value={lead.estimatedGuests || ''}
                  onChange={(e) => handleUpdate({ estimatedGuests: Number(e.target.value) || undefined })}
                  style={inlineInputStyle}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Período Desejado */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Período desejado</span>
              <div style={rowValueStyle}>
                <input
                  type="text"
                  placeholder="Ex: 2º Semestre 2027, Fins de semana..."
                  value={lead.desiredPeriod || ''}
                  onChange={(e) => handleUpdate({ desiredPeriod: e.target.value })}
                  style={inlineInputStyle}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>


            {/* ── SEÇÃO 4: 💰 DADOS COMERCIAIS ── */}
            <div style={sectionHeaderStyle}>
              <DollarSign size={13} color="var(--adm-accent)" />
              <span>4. Dados Comerciais</span>
            </div>

            {/* Venda / Orçamento Estimado */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Venda / Orçamento</span>
              <div style={rowValueStyle}>
                <span style={{ color: '#10B981', fontWeight: 900, marginRight: '2px' }}>R$</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="0,00"
                  value={lead.estimatedBudget || lead.dealValue || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    handleUpdate({ estimatedBudget: val, dealValue: val });
                  }}
                  style={{ ...inlineInputStyle, color: '#10B981', fontWeight: 900, fontSize: '0.88rem' }}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = '#10B981'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Interesse / Pacote Desejado */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Interesse</span>
              <div style={rowValueStyle}>
                <input
                  type="text"
                  placeholder="Ex: Pacote Diamante com Lounge Open Bar"
                  value={lead.interestService || lead.packageSold || ''}
                  onChange={(e) => handleUpdate({ interestService: e.target.value, packageSold: e.target.value })}
                  style={inlineInputStyle}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Pagamento */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Pagamento</span>
              <div style={rowValueStyle}>
                <input
                  type="text"
                  placeholder="Ex: Entrada 20% + 24x sem juros"
                  value={lead.paymentMethod || ''}
                  onChange={(e) => handleUpdate({ paymentMethod: e.target.value })}
                  style={inlineInputStyle}
                  onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Temperatura */}
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Temperatura</span>
              <div style={rowValueStyle}>
                <select
                  value={lead.temperature || 'warm'}
                  onChange={(e) => handleUpdate({ temperature: e.target.value as LeadTemperature })}
                  style={inlineSelectStyle}
                >
                  <option value="hot">Quente (Alta intenção)</option>
                  <option value="warm">Morno (Pesquisando datas)</option>
                  <option value="cold">Frio (Contato inicial)</option>
                </select>
              </div>
            </div>


            {/* ── SEÇÃO 5: 👥 CONTATOS VINCULADOS ── */}
            <div style={{ ...sectionHeaderStyle, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={13} color="var(--adm-accent)" />
                <span>5. Contatos Vinculados</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingContact(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-accent)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: 0,
                }}
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {/* Lista de Contatos */}
            {(lead.contacts || []).map(contact => (
              <div key={contact.id} style={{
                ...rowStyle,
                justifyContent: 'space-between',
                background: contact.isPrimaryDecisionMaker ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{contact.name}</strong>
                    <span style={{
                      fontSize: '0.64rem',
                      fontWeight: 600,
                      color: 'var(--adm-accent)',
                      background: 'rgba(212, 175, 55, 0.12)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}>
                      {CONTACT_ROLE_LABELS[contact.role] || contact.role}
                    </span>
                    {contact.isPrimaryDecisionMaker && (
                      <span style={{ fontSize: '0.64rem', fontWeight: 600, color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Check size={11} /> Decisor
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>{formatPhone(contact.phone)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenDirectWhatsApp(contact.phone)}
                    title="Conversar no WhatsApp"
                    style={{
                      background: '#25D366',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <MessageCircle size={12} />
                  </button>

                  {!contact.isPrimaryDecisionMaker && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryDecisor(contact)}
                      style={{
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-muted)',
                        borderRadius: '6px',
                        padding: '3px 6px',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                      }}
                    >
                      Tornar Decisor
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveSubContact(contact.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-red)',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* Formulário inline de Adição de Contato */}
            {isAddingContact && (
              <form onSubmit={handleAddSubContact} style={{
                padding: '12px 16px',
                background: 'var(--adm-bg-input)',
                borderBottom: '1px solid var(--adm-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Nome do contato..."
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    style={{ ...inlineInputStyle, background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="WhatsApp / Telefone..."
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(maskPhoneInput(e.target.value))}
                    style={{ ...inlineInputStyle, background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <select
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value as LeadContactRole)}
                    style={{ ...inlineSelectStyle, width: '180px' }}
                  >
                    <option value="aniversariante">Aniversariante</option>
                    <option value="debutante">Debutante</option>
                    <option value="mae">Mãe</option>
                    <option value="pai">Pai</option>
                    <option value="tio">Tio(a)</option>
                    <option value="noivo">Noivo(a)</option>
                    <option value="responsavel">Responsável / Decisor</option>
                    <option value="outro">Outro</option>
                  </select>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingContact(false)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-muted)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        background: 'var(--adm-accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ── SEÇÃO 6: ⚙️ CAMPOS PERSONALIZADOS DO FUNIL ── */}
            {leadFunnel && leadFunnel.customFields && leadFunnel.customFields.length > 0 && (
              <>
                <div style={sectionHeaderStyle}>
                  <Sparkles size={13} color="var(--adm-accent)" />
                  <span>6. Campos Personalizados ({leadFunnel.name})</span>
                </div>

                {leadFunnel.customFields.map(field => {
                  const currentValue = lead.customFieldValues?.[field.id] ?? '';

                  return (
                    <div key={field.id} style={rowStyle}>
                      <span style={rowLabelStyle}>{field.label}</span>
                      <div style={rowValueStyle}>
                        {field.type === 'todo' ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--adm-text-title)' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(currentValue)}
                              onChange={(e) => {
                                const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: e.target.checked };
                                handleUpdate({ customFieldValues: updatedCustom });
                              }}
                            />
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: Boolean(currentValue) ? '#10B981' : 'var(--adm-text-muted)' }}>
                              {Boolean(currentValue) ? (
                                <>
                                  <CheckCircle2 size={13} color="#10B981" /> Concluído
                                </>
                              ) : (
                                <>
                                  <Clock size={13} color="var(--adm-text-muted)" /> Pendente
                                </>
                              )}
                            </span>
                          </label>
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            value={currentValue}
                            onChange={(e) => {
                              const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: e.target.value };
                              handleUpdate({ customFieldValues: updatedCustom });
                            }}
                            style={inlineSelectStyle}
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            placeholder={field.placeholder || '0'}
                            value={currentValue}
                            onChange={(e) => {
                              const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: Number(e.target.value) || 0 };
                              handleUpdate({ customFieldValues: updatedCustom });
                            }}
                            style={inlineInputStyle}
                          />
                        ) : field.type === 'select' ? (
                          <select
                            value={currentValue}
                            onChange={(e) => {
                              const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: e.target.value };
                              handleUpdate({ customFieldValues: updatedCustom });
                            }}
                            style={inlineSelectStyle}
                          >
                            <option value="">Selecione...</option>
                            {(field.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={field.placeholder || 'Preencha...'}
                            value={currentValue}
                            onChange={(e) => {
                              const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: e.target.value };
                              handleUpdate({ customFieldValues: updatedCustom });
                            }}
                            style={inlineInputStyle}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 2: 🌐 ORIGEM & RASTREAMENTO                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'origem' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Card Principal: Tipo de Origem */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Canal de Entrada
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isReferralLead ? 'rgba(212, 175, 55, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: isReferralLead ? '#D4AF37' : '#60A5FA',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {isReferralLead ? (
                    <>
                      <Crown size={12} /> Indicação de Debutante
                    </>
                  ) : leadSource ? (
                    <>
                      <Globe size={12} /> {leadSource.name}
                    </>
                  ) : (
                    lead.source || 'Entrada Direta'
                  )}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                {isReferralLead
                  ? `Lead gerado pelo programa de indicações da anfitriã ${lead.debutanteName}.`
                  : leadSource
                  ? `Lead captado através da origem rastreada "${leadSource.name}".`
                  : 'Lead inserido diretamente pela equipe ou formulário institucional.'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--adm-border)' }}>
                <div>
                  <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', display: 'block' }}>Casa Vinculada:</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>
                    {leadVenue?.name || 'Bonomo Festas'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', display: 'block' }}>Funil de Destino:</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>
                    {leadFunnel?.name || 'Funil Comercial Padrão'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco Específico: Indicação de Debutante */}
            {isReferralLead && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 17, 24, 0.6) 100%)',
                border: '1.5px solid rgba(212, 175, 55, 0.35)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={16} color="#D4AF37" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase' }}>
                    Dados da Anfitriã / Debutante Indicadora
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#FFFFFF' }}>{lead.debutanteName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Anfitriã • ID: {lead.debutanteId || 'N/A'}</div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: lead.isValidated ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: lead.isValidated ? '#10B981' : '#F59E0B',
                    border: `1px solid ${lead.isValidated ? '#10B981' : '#F59E0B'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {lead.isValidated ? (
                      <>
                        <CheckCircle2 size={11} /> Validada (+1 Ponto)
                      </>
                    ) : (
                      <>
                        <Clock size={11} /> Aguardando Validação
                      </>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {lead.isValidated ? (
                    <button
                      type="button"
                      onClick={() => invalidateLead(lead.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#EF4444',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Revogar Ponto de Indicação
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => validateLead(lead.id)}
                      style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Validar Lead (+1 Ponto)</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bloco Específico: Sub-origem & WhatsApp API */}
            {(lead.subSource || lead.source === 'whatsapp' || leadSource?.type === 'whatsapp_api') && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 17, 24, 0.6) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={16} color="#10B981" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                      Identificação de Sub-origem WhatsApp
                    </span>
                  </div>
                  {lead.subSource && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10B981',
                      border: '1px solid #10B981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Tag size={11} /> {lead.subSource}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'var(--adm-bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                    <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', display: 'block' }}>Origem Principal:</span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <PhoneCall size={12} color="#10B981" /> {lead.sourceName || leadSource?.name || 'WhatsApp API'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--adm-bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                    <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', display: 'block' }}>Sub-origem / Canal:</span>
                    <strong style={{ fontSize: '0.82rem', color: lead.subSource ? '#10B981' : 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      {lead.subSource ? (
                        <>
                          <Tag size={12} /> {lead.subSource}
                        </>
                      ) : (
                        'Sem sub-origem (Direto)'
                      )}
                    </strong>
                  </div>
                </div>

                {/* Sub-source editor / selector */}
                {leadSource?.configuration?.subSources && leadSource.configuration.subSources.length > 0 && (
                  <div style={{ background: 'var(--adm-bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                      Alterar Sub-origem do Lead
                    </label>
                    <select
                      value={lead.subSource || ''}
                      onChange={(e) => handleUpdate({ subSource: e.target.value || undefined })}
                      className="adm-input"
                      style={{ width: '100%', height: '32px', fontSize: '0.76rem', borderRadius: '6px' }}
                    >
                      <option value="">Nenhuma sub-origem (WhatsApp Direto)</option>
                      {leadSource.configuration.subSources.map(sub => (
                        <option key={sub.id} value={sub.name}>{sub.name} (Gatilho: "{sub.keyword}")</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Bloco Específico: Formulário */}
            {leadSource?.type === 'form' && (
              <div style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} color="var(--adm-accent)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--adm-text-title)', textTransform: 'uppercase' }}>
                    Dados do Formulário Público
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'var(--adm-bg-card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                    <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', display: 'block' }}>Link Público:</span>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--adm-accent)' }}>/f/{leadSource.slug}</strong>
                  </div>

                  <div style={{ background: 'var(--adm-bg-card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                    <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', display: 'block' }}>Campos do Form:</span>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>
                      {leadSource.configuration?.fields?.length || 5} campos configurados
                    </strong>
                  </div>
                </div>

                {leadSource.slug && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href={`/f/${leadSource.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-accent)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>Abrir Formulário /f/{leadSource.slug}</span>
                    </a>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 3: 🎯 MQL (MARKETING QUALIFIED LEAD)                             */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'mql' && (
          isIcpComingSoon ? (
            <ComingSoonOverlay featureTitle="Qualificação ICP & MQL" isInline={true} />
          ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* ICP Score Gauge Banner (Clean, High-Contrast Card) */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: `1.5px solid ${
                mqlResult.level === 'top' ? '#10B981' : mqlResult.level === 'qualified' ? '#F59E0B' : '#EF4444'
              }`,
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--adm-text-muted)' }}>
                  Nota do Perfil de Cliente Ideal (ICP)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: mqlResult.level === 'top' ? '#10B981' : mqlResult.level === 'qualified' ? '#F59E0B' : '#EF4444',
                    display: 'inline-block',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: mqlResult.level === 'top' ? '#10B981' : mqlResult.level === 'qualified' ? '#F59E0B' : '#EF4444',
                  }}>
                    {mqlResult.level === 'top' ? 'Nota ICP A (Lead Top)' : mqlResult.level === 'qualified' ? 'Nota ICP B (Médio)' : 'Nota ICP C (Baixo / Ruim)'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
                  {mqlResult.level === 'top'
                    ? 'Lead com perfil ideal, alta urgência e alinhamento com a casa.'
                    : mqlResult.level === 'qualified'
                    ? 'Lead com perfil intermediário, em negociação de data ou proposta.'
                    : 'Lead com baixo alinhamento orçamentário ou apenas pesquisando valores.'}
                </div>
              </div>

              {/* Score Badge */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--adm-bg-input)',
                border: `3px solid ${mqlResult.level === 'top' ? '#10B981' : mqlResult.level === 'qualified' ? '#F59E0B' : '#EF4444'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{mqlResult.score}%</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: mqlResult.level === 'top' ? '#10B981' : mqlResult.level === 'qualified' ? '#F59E0B' : '#EF4444' }}>
                  {mqlResult.level === 'top' ? 'ICP A' : mqlResult.level === 'qualified' ? 'ICP B' : 'ICP C'}
                </span>
              </div>
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Critérios de Qualificação ICP
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                  {venueMqlQuestions.length} perguntas cadastradas
                </span>
              </div>

              {venueMqlQuestions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-input)', borderRadius: '12px' }}>
                  Nenhum critério de ICP configurado para esta casa de festas.
                </div>
              ) : (
                venueMqlQuestions.map((q, qIdx) => {
                  const selectedOptId = mqlAnswers[q.id];

                  return (
                    <div
                      key={q.id}
                      style={{
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '14px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'var(--adm-accent-bg)',
                          color: 'var(--adm-accent)',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {qIdx + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            {q.title}
                          </div>
                          {q.description && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                              {q.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        {q.options.map((opt) => {
                          const isOptionSelected = selectedOptId === opt.id;
                          const sit = opt.situation || (opt.points >= 90 ? 'ideal' : opt.points >= 65 ? 'good' : opt.points >= 30 ? 'medium' : 'bad');
                          const conf = ICP_SITUATION_CONFIG[sit];

                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleSelectMqlOption(q.id, opt.id)}
                              style={{
                                padding: '9px 12px',
                                borderRadius: '10px',
                                border: `1.5px solid ${isOptionSelected ? conf.color : 'var(--adm-border)'}`,
                                background: isOptionSelected ? conf.bg : 'var(--adm-bg-card)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                transition: 'all 0.12s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '5px',
                                  background: conf.bg,
                                  color: conf.color,
                                  border: `1px solid ${conf.border}`,
                                  flexShrink: 0,
                                }}>
                                  {conf.icon} {conf.label}
                                </span>
                                <span style={{
                                  fontSize: '0.78rem',
                                  color: isOptionSelected ? 'var(--adm-text-title)' : 'var(--adm-text-body)',
                                  fontWeight: isOptionSelected ? 700 : 500,
                                  lineHeight: 1.3,
                                }}>
                                  {opt.label}
                                </span>
                              </div>

                              <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                border: `2px solid ${isOptionSelected ? conf.color : 'var(--adm-border)'}`,
                                background: isOptionSelected ? conf.color : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {isOptionSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
          )
        )}

      </div>
    </div>
  );
};
