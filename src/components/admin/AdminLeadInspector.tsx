import React, { useState } from 'react';
import { 
  ChevronDown, Trash2, Check,
  ChevronLeft, ChevronRight, Plus,
  Shield, User, PartyPopper, DollarSign, Users,
  CheckCircle2, Clock, X, MessageCircle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { 
  Lead, 
  CrmStage, 
  LeadContactRole,
  LeadContact,
  LeadEventType,
  LeadTemperature
} from '../../types/admin';

interface AdminLeadInspectorProps {
  lead: Lead;
  onWhatsApp?: (lead: Lead) => void;
  onStageChange: (stage: CrmStage) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

const STAGE_CONFIGS: Record<CrmStage, { label: string; color: string; bg: string; border: string }> = {
  new_lead:          { label: 'Novo Lead',                    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: '#60A5FA' },
  in_analysis:       { label: 'Em Análise / Contato',         color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  border: '#FBBF24' },
  meeting_scheduled: { label: 'Reunião / Degustação',         color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: '#A78BFA' },
  contract_signed:   { label: 'Contrato Fechado (Venda VIP)', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: '#10B981' },
  lost:              { label: 'Perdido / Recusado',           color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: '#EF4444' },
};

const STAGE_LIST: CrmStage[] = ['new_lead', 'in_analysis', 'meeting_scheduled', 'contract_signed', 'lost'];

const CONTACT_ROLE_LABELS: Record<LeadContactRole, string> = {
  debutante: 'Debutante',
  mother: 'Mãe',
  father: 'Pai',
  decision_maker: 'Responsável / Decisor',
  other: 'Outro',
};

const EVENT_TYPE_OPTIONS: LeadEventType[] = ['15 Anos', 'Casamento', 'Infantil', 'Formatura', 'Corporativo', 'Outro'];

export const AdminLeadInspector: React.FC<AdminLeadInspectorProps> = ({
  lead,
  onStageChange,
  onToggleCollapse,
  isCollapsed,
}) => {
  const { 
    currentUser, 
    collaborators, 
    venues,
    updateLeadData, 
    validateLead, 
    invalidateLead,
    assignLeadSdr,
    assignLeadCloser,
    removeLeadSdr,
    removeLeadCloser
  } = useAdminState();

  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState<LeadContactRole>('mother');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const leadVenue = venues.find(v => v.id === lead.venueId);
  const sdrCollab = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : undefined;

  const isManagerOrMaster = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const sdrList = collaborators.filter(c => c.active && (c.role === 'sdr' || c.role === 'admin' || c.role === 'master'));
  const closerList = collaborators.filter(c => c.active && (c.role === 'closer' || c.role === 'admin' || c.role === 'master'));

  const handleUpdate = (updates: Partial<Lead>) => {
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
      
      {/* ── 1. CABEÇALHO DARK & DOURADO LUXO ──────────────────────────────────── */}
      <div style={{
        padding: '16px 18px 12px',
        borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
        background: 'linear-gradient(180deg, #0B090E 0%, #131018 100%)',
        color: '#FFFFFF',
        flexShrink: 0,
      }}>
        {/* Title row + Collapse Button (< / >) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(212,175,55,0.5)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
              title="Clique para editar o nome"
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
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  color: '#D4AF37',
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

        {/* Venue & Debutante info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.74rem',
            color: '#A0988A',
            fontWeight: 600,
          }}>
            🏢 {leadVenue?.name || 'Bonomo Festas'} • <strong style={{ color: '#D4AF37' }}>👑 Indicada por: {lead.debutanteName}</strong>
          </span>
        </div>

        {/* Pipeline Stage Dropdown with Colored Indicator */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <div
            onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 12px',
              background: currentStageConfig.bg,
              border: `1px solid ${currentStageConfig.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: currentStageConfig.color,
            }}
          >
            <span>Funil: {currentStageConfig.label}</span>
            <ChevronDown size={14} />
          </div>

          {/* Multi-Stage Color Progress Bar */}
          <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
            {STAGE_LIST.map((stg, idx) => {
              const cfg = STAGE_CONFIGS[stg];
              const isFilled = idx <= currentStageIndex && lead.stage !== 'lost';
              return (
                <div
                  key={stg}
                  onClick={() => onStageChange(stg)}
                  title={cfg.label}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: lead.stage === 'lost' && stg === 'lost' ? '#EF4444' : isFilled ? cfg.color : 'rgba(255,255,255,0.15)',
                    cursor: 'pointer',
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

        {/* Bloco de Destaque: Validação de Indicação no Topo da Ficha */}
        {Boolean(lead.debutanteName || lead.debutanteId) && (
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

        {/* Tab: Principal */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <span
            style={{
              borderBottom: '2px solid #D4AF37',
              paddingBottom: '4px',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 800,
            }}
          >
            Ficha Cadastral do Lead
          </span>
        </div>
      </div>

      {/* ── 2. SEÇÕES TEMÁTICAS COM DIVISORES CLAROS ────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ── SEÇÃO 1: 🛡️ RESPONSÁVEIS ── */}
        <div style={sectionHeaderStyle}>
          <Shield size={13} color="var(--adm-accent)" />
          <span>1. Responsáveis Comerciais</span>
        </div>

        {/* SDR */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>SDR</span>
          <div style={rowValueStyle}>
            {isManagerOrMaster || !lead.sdrId ? (
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

        {/* WhatsApp com Link Direto Limpo */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>WhatsApp</span>
          <div style={rowValueStyle}>
            <input
              type="text"
              value={lead.phone}
              onChange={(e) => handleUpdate({ phone: e.target.value })}
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
              <option value="hot">🔥 Quente (Alta intenção)</option>
              <option value="warm">🟡 Morno (Pesquisando datas)</option>
              <option value="cold">🔵 Frio (Contato inicial)</option>
            </select>
          </div>
        </div>

        {/* Qualificação / Validação (+1 Ponto) */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Qualificação</span>
          <div style={rowValueStyle}>
            {lead.isValidated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#10B981',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <CheckCircle2 size={13} />
                  <span>Validada (+1 pt debutante)</span>
                </span>
                <button
                  type="button"
                  onClick={() => invalidateLead(lead.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.7rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Revogar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.74rem',
                  color: '#F59E0B',
                  background: 'rgba(245, 158, 11, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <Clock size={12} />
                  <span>Aguardando Validação</span>
                </span>
                <button
                  type="button"
                  onClick={() => validateLead(lead.id)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10B981',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Validar Agora
                </button>
              </div>
            )}
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
              fontWeight: 800,
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
                <strong style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)' }}>{contact.name}</strong>
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  color: 'var(--adm-accent)',
                  background: 'rgba(212, 175, 55, 0.12)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}>
                  {CONTACT_ROLE_LABELS[contact.role] || contact.role}
                </span>
                {contact.isPrimaryDecisionMaker && (
                  <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#10B981' }}>★ Decisor</span>
                )}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>{contact.phone}</span>
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

        {/* Modal / Formulário inline de Adição de Contato */}
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
                onChange={(e) => setNewContactPhone(e.target.value)}
                style={{ ...inlineInputStyle, background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <select
                value={newContactRole}
                onChange={(e) => setNewContactRole(e.target.value as LeadContactRole)}
                style={{ ...inlineSelectStyle, width: '160px' }}
              >
                <option value="mother">Mãe</option>
                <option value="father">Pai</option>
                <option value="decision_maker">Responsável / Decisor</option>
                <option value="debutante">Debutante</option>
                <option value="other">Outro</option>
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
                    color: '#FFF',
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

      </div>
    </div>
  );
};
