import React, { useState } from 'react';
import { 
  Send, ChevronDown, 
  Trash2, MoreHorizontal, Check
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
}

const STAGE_CONFIGS: Record<CrmStage, { label: string; color: string; bg: string; border: string }> = {
  new_lead:          { label: 'Novo Lead',                    color: '#60A5FA', bg: 'rgba(96,165,250,0.15)',  border: '#60A5FA' },
  in_analysis:       { label: 'Em Análise / Contato',         color: '#FBBF24', bg: 'rgba(251,191,36,0.15)',  border: '#FBBF24' },
  meeting_scheduled: { label: 'Reunião / Degustação',         color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: '#A78BFA' },
  contract_signed:   { label: 'Contrato Fechado (Venda VIP)', color: '#34D399', bg: 'rgba(52,211,153,0.15)',  border: '#34D399' },
  lost:              { label: 'Perdido / Recusado',           color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   border: '#EF4444' },
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

  const [activeTab, setActiveTab] = useState<'principal' | 'estatisticas' | 'midia'>('principal');
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

  // ── ROW STYLES (Kommo CRM pure row key-value) ──────────────────────────────
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    minHeight: '38px',
    fontSize: '0.81rem',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const rowLabelStyle: React.CSSProperties = {
    width: '135px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.76rem',
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
    borderRadius: '4px',
    padding: '3px 6px',
    color: 'var(--adm-text-title)',
    fontSize: '0.81rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'all 0.15s ease',
  };

  const inlineSelectStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '4px',
    padding: '3px 6px',
    color: 'var(--adm-text-title)',
    fontSize: '0.81rem',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#121018',
      color: 'var(--adm-text-title)',
      overflow: 'hidden',
    }}>
      {/* ── 1. KOMMO HEADER: LEAD TITLE & STATUS BAR ───────────────────────── */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--adm-border)',
        background: '#16131F',
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={lead.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              style={{
                ...inlineInputStyle,
                fontSize: '1.08rem',
                fontWeight: 900,
                padding: '2px 4px',
                color: '#FFF',
              }}
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
              title="Clique para editar o nome"
            />
          </div>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '4px' }}>
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Lead ID badge + City/Venue */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--adm-text-muted)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}>
            #{lead.id.slice(-8).toUpperCase()} {leadVenue?.name || 'Bonomo Festas'}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700 }}>
            Indicada por: {lead.debutanteName}
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
                    background: lead.stage === 'lost' && stg === 'lost' ? '#EF4444' : isFilled ? cfg.color : 'rgba(255,255,255,0.12)',
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
              background: '#1A1624',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              overflow: 'hidden',
              zIndex: 50,
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
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
                      color: isSelected ? cfg.color : '#D1C8BA',
                      background: isSelected ? cfg.bg : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
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

        {/* Sub-tabs: Principal | Estatísticas | Mídia */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          {(['principal', 'estatisticas', 'midia'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                padding: '4px 2px 8px 2px',
                color: activeTab === tab ? '#FFF' : 'var(--adm-text-muted)',
                fontSize: '0.78rem',
                fontWeight: activeTab === tab ? 800 : 500,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {tab === 'principal' ? 'Principal' : tab === 'estatisticas' ? 'Estatísticas' : 'Mídia'}
            </button>
          ))}
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
              <span style={{ fontSize: '0.81rem', color: '#FFF' }}>
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
              <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                Disponível na Reunião
              </span>
            )}
          </div>
        </div>

        {/* Venda / Orçamento Estimado */}
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Venda / Orçamento</span>
          <div style={rowValueStyle}>
            <span style={{ color: '#22C55E', fontWeight: 800, marginRight: '4px' }}>R$</span>
            <input
              type="number"
              min="0"
              step="500"
              placeholder="0"
              value={lead.estimatedBudget || lead.dealValue || ''}
              onChange={(e) => handleUpdate({ estimatedBudget: Number(e.target.value) || undefined })}
              style={{ ...inlineInputStyle, color: '#22C55E', fontWeight: 800 }}
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              style={{ ...inlineInputStyle, width: '150px' }}
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; }}
            />
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; }}
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
            <span style={{ fontSize: '0.78rem', color: lead.isValidated ? '#34D399' : 'var(--adm-text-muted)', fontWeight: 700 }}>
              {lead.isValidated ? '✅ Validada (+1 pt)' : '⏳ Aguardando'}
            </span>
            <button
              type="button"
              onClick={() => lead.isValidated ? invalidateLead(lead.id) : validateLead(lead.id)}
              style={{
                background: lead.isValidated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.18)',
                color: lead.isValidated ? '#EF4444' : '#34D399',
                border: `1px solid ${lead.isValidated ? 'rgba(239, 68, 68, 0.35)' : 'rgba(52, 211, 153, 0.4)'}`,
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
                    background: 'rgba(37, 99, 235, 0.2)',
                    border: '1px solid rgba(37, 99, 235, 0.5)',
                    color: '#60A5FA',
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
                    style={{ background: 'transparent', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: 0 }}
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
                  style={{ ...inlineInputStyle, background: 'rgba(255,255,255,0.06)', width: '110px' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  style={{ background: '#2563EB', border: 'none', color: '#FFF', borderRadius: '4px', padding: '2px 6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
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
                  background: cnt.isPrimaryDecisionMaker ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${cnt.isPrimaryDecisionMaker ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}`,
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
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#D1C8BA', borderRadius: '4px', padding: '1px 4px', fontSize: '0.6rem', cursor: 'pointer' }}
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
                  style={{ ...inlineInputStyle, background: 'rgba(255,255,255,0.06)' }}
                />
                <input
                  type="text"
                  placeholder="Telefone / WhatsApp"
                  required
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  style={{ ...inlineInputStyle, background: 'rgba(255,255,255,0.06)' }}
                />
                <select
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value as any)}
                  style={{ ...inlineSelectStyle, background: 'rgba(255,255,255,0.06)' }}
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
                  <button type="submit" style={{ background: '#2563EB', border: 'none', color: '#FFF', borderRadius: '4px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
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
    </div>
  );
};
