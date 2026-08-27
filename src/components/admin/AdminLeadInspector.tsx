import React, { useState } from 'react';
import { 
  Send, ChevronDown, 
  Trash2, MoreHorizontal, Check,
  ChevronLeft
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { 
  Lead, 
  CrmStage, 
  LeadContactRole,
  LeadContact
} from '../../types/admin';

interface AdminLeadInspectorProps {
  lead: Lead;
  onWhatsApp: (lead: Lead) => void;
  onStageChange: (stage: CrmStage) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

const STAGE_CONFIGS: Record<CrmStage, { label: string; color: string; bg: string; border: string }> = {
  new_lead:          { label: 'Novo Lead',                    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  border: '#3B82F6' },
  in_analysis:       { label: 'Em Análise / Contato',         color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: '#F59E0B' },
  meeting_scheduled: { label: 'Reunião / Degustação',         color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: '#8B5CF6' },
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

export const AdminLeadInspector: React.FC<AdminLeadInspectorProps> = ({
  lead,
  onWhatsApp,
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
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const leadVenue = venues.find(v => v.id === lead.venueId);
  const sdrCollab = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : undefined;

  const isManagerOrMaster = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const sdrList = collaborators.filter(c => c.active && (c.role === 'sdr' || c.role === 'admin' || c.role === 'master'));
  const closerList = collaborators.filter(c => c.active && (c.role === 'closer' || c.role === 'admin' || c.role === 'master'));

  const handleUpdate = (updates: Partial<Lead>) => {
    updateLeadData(lead.id, updates);
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

  // ── ROW STYLES (Light & Dark theme adaptive) ───────────────────────────────
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '7px 16px',
    borderBottom: '1px solid var(--adm-border)',
    minHeight: '36px',
    fontSize: '0.8rem',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const rowLabelStyle: React.CSSProperties = {
    width: '130px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.74rem',
    fontWeight: 500,
  };

  const rowValueStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    color: 'var(--adm-text-title)',
    fontWeight: 600,
  };

  const inlineInputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    padding: '3px 6px',
    color: 'var(--adm-text-title)',
    fontSize: '0.8rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'all 0.15s ease',
  };

  const inlineSelectStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    padding: '3px 6px',
    color: 'var(--adm-text-title)',
    fontSize: '0.8rem',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--adm-bg-card)',
      color: 'var(--adm-text-title)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* ── 1. KOMMO HEADER (Distinct subtle background tone) ──────────────── */}
      <div style={{
        padding: '12px 16px 8px',
        borderBottom: '1px solid var(--adm-border)',
        background: 'var(--adm-bg-sidebar)',
        flexShrink: 0,
      }}>
        {/* Title row + Collapse Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={lead.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              style={{
                ...inlineInputStyle,
                fontSize: '1.05rem',
                fontWeight: 900,
                padding: '2px 4px',
                color: 'var(--adm-text-title)',
              }}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
              title="Clique para editar o nome"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Expandir ficha do lead" : "Recolher ficha do lead"}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '6px',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '4px' }}>
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Venue & Debutante info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.72rem',
            color: 'var(--adm-text-muted)',
            fontWeight: 600,
          }}>
            {leadVenue?.name || 'Bonomo Festas'} • <strong style={{ color: 'var(--adm-accent)' }}>Indicada por: {lead.debutanteName}</strong>
          </span>
        </div>

        {/* Pipeline Stage Dropdown with Colored Indicator */}
        <div style={{ position: 'relative', marginBottom: '6px' }}>
          <div
            onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: currentStageConfig.bg,
              border: `1px solid ${currentStageConfig.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 800,
              color: currentStageConfig.color,
            }}
          >
            <span>Funil: {currentStageConfig.label}</span>
            <ChevronDown size={14} />
          </div>

          {/* Multi-Stage Color Progress Bar */}
          <div style={{ display: 'flex', gap: '3px', marginTop: '5px' }}>
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
                    background: lead.stage === 'lost' && stg === 'lost' ? '#EF4444' : isFilled ? cfg.color : 'rgba(128,128,128,0.2)',
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
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              overflow: 'hidden',
              zIndex: 50,
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
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
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      fontWeight: isSelected ? 800 : 500,
                      color: isSelected ? cfg.color : 'var(--adm-text-title)',
                      background: isSelected ? cfg.bg : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? cfg.bg : 'transparent'}
                  >
                    <span>{cfg.label}</span>
                    {isSelected && <Check size={13} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tab: Principal Only */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid var(--adm-accent)',
              padding: '4px 2px 6px 2px',
              color: 'var(--adm-text-title)',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'default',
            }}
          >
            Principal
          </button>
        </div>
      </div>

      {/* ── 2. KOMMO ROW-BASED TABLE (LINHA POR LINHA) ───────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* SDR / Usuário Responsável */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Usuário responsável</span>
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
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)' }}>
                {sdrCollab?.name || 'Nenhum SDR atribuído'}
              </span>
            )}
          </div>
        </div>

        {/* Closer Responsável */}
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
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                Disponível na Reunião
              </span>
            )}
          </div>
        </div>

        {/* Venda / Orçamento Estimado */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Venda / Orçamento</span>
          <div style={rowValueStyle}>
            <span style={{ color: '#10B981', fontWeight: 800, marginRight: '4px' }}>R$</span>
            <input
              type="number"
              min="0"
              step="500"
              placeholder="0"
              value={lead.estimatedBudget || lead.dealValue || ''}
              onChange={(e) => handleUpdate({ estimatedBudget: Number(e.target.value) || undefined })}
              style={{ ...inlineInputStyle, color: '#10B981', fontWeight: 800 }}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* WhatsApp Principal */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>WhatsApp</span>
          <div style={{ ...rowValueStyle, justifyContent: 'space-between' }}>
            <input
              type="text"
              value={lead.phone}
              onChange={(e) => handleUpdate({ phone: e.target.value })}
              style={{ ...inlineInputStyle, width: '140px' }}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(true)}
                title="Ver perfil do WhatsApp"
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Perfil
              </button>
              <button
                type="button"
                onClick={() => onWhatsApp(lead)}
                style={{
                  background: '#25D366',
                  border: 'none',
                  color: '#FFF',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Send size={11} />
                <span>Abrir</span>
              </button>
            </div>
          </div>
        </div>

        {/* E-mail */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>E-mail</span>
          <div style={rowValueStyle}>
            <input
              type="email"
              placeholder="Inserir e-mail..."
              value={lead.email || ''}
              onChange={(e) => handleUpdate({ email: e.target.value })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Bairro */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Bairro</span>
          <div style={rowValueStyle}>
            <input
              type="text"
              placeholder="Ex: Recreio, Barra..."
              value={lead.neighborhood || ''}
              onChange={(e) => handleUpdate({ neighborhood: e.target.value })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Endereço */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Endereço</span>
          <div style={rowValueStyle}>
            <input
              type="text"
              placeholder="Rua, número, compl..."
              value={lead.address || ''}
              onChange={(e) => handleUpdate({ address: e.target.value })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Tipo de evento */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Tipo de evento</span>
          <div style={rowValueStyle}>
            <select
              value={lead.eventType || '15 Anos'}
              onChange={(e) => handleUpdate({ eventType: e.target.value as any })}
              style={inlineSelectStyle}
            >
              <option value="15 Anos">15 Anos</option>
              <option value="Casamento">Casamento</option>
              <option value="Infantil">Infantil</option>
              <option value="Formatura">Formatura</option>
              <option value="Corporativo">Corporativo</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>

        {/* Data do evento */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Data do evento</span>
          <div style={rowValueStyle}>
            <input
              type="date"
              value={lead.eventDate || lead.partyDate || ''}
              onChange={(e) => handleUpdate({ eventDate: e.target.value, partyDate: e.target.value })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Aniversário da debutante */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Aniversário deb.</span>
          <div style={rowValueStyle}>
            <input
              type="date"
              value={lead.debutanteBirthDate || ''}
              onChange={(e) => handleUpdate({ debutanteBirthDate: e.target.value })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Quantidade estimada de convidados */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Qtd. convidados</span>
          <div style={rowValueStyle}>
            <input
              type="number"
              min="10"
              placeholder="Ex: 200"
              value={lead.estimatedGuests || ''}
              onChange={(e) => handleUpdate({ estimatedGuests: Number(e.target.value) || undefined })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Período desejado */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Período desejado</span>
          <div style={rowValueStyle}>
            <input
              type="text"
              placeholder="Ex: Segundo semestre 2027..."
              value={lead.desiredPeriod || ''}
              onChange={(e) => handleUpdate({ desiredPeriod: e.target.value })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Interesse / Serviço */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Interesse</span>
          <div style={rowValueStyle}>
            <input
              type="text"
              placeholder="Espaço, Buffet, DJ..."
              value={lead.interestService || ''}
              onChange={(e) => handleUpdate({ interestService: e.target.value })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Pagamento</span>
          <div style={rowValueStyle}>
            <input
              type="text"
              placeholder="Ex: Entrada + 24x sem juros"
              value={lead.paymentMethod || ''}
              onChange={(e) => handleUpdate({ paymentMethod: e.target.value })}
              style={inlineInputStyle}
              onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
          </div>
        </div>

        {/* Temperatura do Lead */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Temperatura</span>
          <div style={rowValueStyle}>
            <select
              value={lead.temperature || 'warm'}
              onChange={(e) => handleUpdate({ temperature: e.target.value as any })}
              style={inlineSelectStyle}
            >
              <option value="hot">🔥 Quente</option>
              <option value="warm">🟡 Morno</option>
              <option value="cold">🔵 Frio</option>
            </select>
          </div>
        </div>

        {/* Qualificação da Indicação (+1 ponto) */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Qualificação</span>
          <div style={{ ...rowValueStyle, justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: lead.isValidated ? '#10B981' : 'var(--adm-text-muted)', fontWeight: 700 }}>
              {lead.isValidated ? '✅ Validada (+1 pt)' : '⏳ Aguardando'}
            </span>
            <button
              type="button"
              onClick={() => lead.isValidated ? invalidateLead(lead.id) : validateLead(lead.id)}
              style={{
                background: lead.isValidated ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.15)',
                color: lead.isValidated ? '#EF4444' : '#10B981',
                border: `1px solid ${lead.isValidated ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {lead.isValidated ? 'Revogar' : 'Validar'}
            </button>
          </div>
        </div>

        {/* Tags do Funil */}
        <div style={{ ...rowStyle, alignItems: 'flex-start', paddingTop: '10px' }}>
          <span style={rowLabelStyle}>Tags</span>
          <div style={{ ...rowValueStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(lead.tags || []).map(t => (
                <span
                  key={t}
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#3B82F6',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    style={{ background: 'transparent', border: 'none', color: '#3B82F6', cursor: 'pointer', padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {isAddingTag ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="Nova tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                  style={{ ...inlineInputStyle, background: 'var(--adm-bg-input)', width: '110px' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  style={{ background: '#3B82F6', border: 'none', color: '#FFF', borderRadius: '4px', padding: '2px 6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Ok
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', fontSize: '0.72rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                + Adicionar tag
              </button>
            )}
          </div>
        </div>

        {/* Contatos Vinculados (Mãe, Pai, Decisor) */}
        <div style={{ ...rowStyle, alignItems: 'flex-start', paddingTop: '10px' }}>
          <span style={rowLabelStyle}>Contatos vinc.</span>
          <div style={{ ...rowValueStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '6px', width: '100%' }}>
            {(lead.contacts || []).map(cnt => (
              <div
                key={cnt.id}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: cnt.isPrimaryDecisionMaker ? 'rgba(212,175,55,0.08)' : 'var(--adm-bg-input)',
                  border: `1px solid ${cnt.isPrimaryDecisionMaker ? 'rgba(212,175,55,0.3)' : 'var(--adm-border)'}`,
                  borderRadius: '4px',
                  padding: '4px 6px',
                  fontSize: '0.72rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 800 }}>{cnt.name}</span> ({CONTACT_ROLE_LABELS[cnt.role]})
                  <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{cnt.phone}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {!cnt.isPrimaryDecisionMaker && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryDecisor(cnt)}
                      style={{ background: 'transparent', border: '1px solid var(--adm-border)', color: 'var(--adm-text-title)', borderRadius: '4px', padding: '1px 4px', fontSize: '0.6rem', cursor: 'pointer' }}
                    >
                      Tornar Decisor
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubContact(cnt.id)}
                    style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '1px' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}

            {isAddingContact ? (
              <form onSubmit={handleAddSubContact} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <input
                  type="text"
                  placeholder="Nome (Ex: Mãe - Regina)"
                  required
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  style={{ ...inlineInputStyle, background: 'var(--adm-bg-input)' }}
                />
                <input
                  type="text"
                  placeholder="Telefone / WhatsApp"
                  required
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  style={{ ...inlineInputStyle, background: 'var(--adm-bg-input)' }}
                />
                <select
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value as any)}
                  style={{ ...inlineSelectStyle, background: 'var(--adm-bg-input)' }}
                >
                  <option value="mother">Mãe</option>
                  <option value="father">Pai</option>
                  <option value="decision_maker">Responsável / Decisor</option>
                  <option value="debutante">Debutante</option>
                  <option value="other">Outro</option>
                </select>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <button type="button" onClick={() => setIsAddingContact(false)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', fontSize: '0.68rem', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" style={{ background: '#3B82F6', border: 'none', color: '#FFF', borderRadius: '4px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                    Salvar
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingContact(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', fontSize: '0.72rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                + Adicionar contato
              </button>
            )}
          </div>
        </div>

      </div>

      {/* WhatsApp Profile Modal */}
      {isWhatsAppModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '340px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(37, 211, 102, 0.15)',
                border: '2px solid #25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#25D366',
              }}>
                {lead.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#25D366',
                border: '2px solid var(--adm-bg-card)',
              }} />
            </div>

            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: '0 0 2px' }}>
                {lead.name}
              </h4>
              <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)' }}>
                {lead.phone}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', marginTop: '4px', fontWeight: 700 }}>
                Indicada por {lead.debutanteName}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                style={{
                  flex: 1,
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsWhatsAppModalOpen(false);
                  onWhatsApp(lead);
                }}
                style={{
                  flex: 1,
                  background: '#25D366',
                  border: 'none',
                  color: '#FFF',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Send size={12} />
                <span>Conversar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
