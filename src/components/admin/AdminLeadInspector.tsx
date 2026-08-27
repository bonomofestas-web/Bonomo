import React, { useState } from 'react';
import { 
  User, Calendar, Users, DollarSign, Sparkles, 
  Check, Plus, Trash2, Flame, Zap, CheckCircle2, Send,
  ChevronDown, ChevronUp
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
  new_lead: { label: 'Novo Lead', color: '#60A5FA', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' },
  in_analysis: { label: 'Em Análise', color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  meeting_scheduled: { label: 'Reunião / Degustação', color: '#A78BFA', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)' },
  contract_signed: { label: 'Contrato Fechado (Venda VIP)', color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)' },
  lost: { label: 'Perdido / Recusado', color: '#F87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' },
};

const STAGE_LIST: CrmStage[] = ['new_lead', 'in_analysis', 'meeting_scheduled', 'contract_signed', 'lost'];

const CONTACT_ROLE_LABELS: Record<LeadContactRole, string> = {
  debutante: 'Debutante / Aniversariante',
  mother: 'Mãe',
  father: 'Pai',
  decision_maker: 'Responsável / Decisor',
  other: 'Outro Contato',
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

  // Accordion expansion states
  const [expandCustomer, setExpandCustomer] = useState(true);
  const [expandEvent, setExpandEvent] = useState(true);
  const [expandCommercial, setExpandCommercial] = useState(true);

  // New Sub-Contact Form
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState<LeadContactRole>('mother');

  // New Funnel Tag input
  const [newTagInput, setNewTagInput] = useState('');

  const leadVenue = venues.find(v => v.id === lead.venueId);
  const sdrCollab = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : undefined;
  const closerCollab = lead.closerId ? collaborators.find(c => c.id === lead.closerId) : undefined;

  const isManagerOrMaster = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const sdrList = collaborators.filter(c => c.active && (c.role === 'sdr' || c.role === 'admin' || c.role === 'master'));
  const closerList = collaborators.filter(c => c.active && (c.role === 'closer' || c.role === 'admin' || c.role === 'master'));

  // ── INLINE FIELD UPDATE ──────────────────────────────────────────────────
  const handleUpdate = (updates: Partial<Lead>) => {
    updateLeadData(lead.id, updates);
  };

  // ── ADD SUB-CONTACT ─────────────────────────────────────────────────────
  const handleAddSubContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const contact: LeadContact = {
      id: `cnt_${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      email: newContactEmail.trim() || undefined,
      role: newContactRole,
      isPrimaryDecisionMaker: false,
    };

    const updatedContacts = [...(lead.contacts || []), contact];
    handleUpdate({ contacts: updatedContacts });

    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactRole('mother');
    setIsAddingContact(false);
  };

  // ── SET PRIMARY DECISION MAKER ──────────────────────────────────────────
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
      email: contact.email || lead.email,
    });
  };

  // ── REMOVE SUB-CONTACT ──────────────────────────────────────────────────
  const handleRemoveSubContact = (contactId: string) => {
    const updatedContacts = (lead.contacts || []).filter(c => c.id !== contactId);
    handleUpdate({ contacts: updatedContacts });
  };

  // ── ADD TAG ─────────────────────────────────────────────────────────────
  const handleAddTag = (tagText: string) => {
    const clean = tagText.trim();
    if (!clean) return;
    const currentTags = lead.tags || [];
    if (currentTags.includes(clean)) return;
    handleUpdate({ tags: [...currentTags, clean] });
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = lead.tags || [];
    handleUpdate({ tags: currentTags.filter(t => t !== tagToRemove) });
  };

  // ── STYLES ──────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '8px',
    padding: '7px 10px',
    color: 'var(--adm-text-title)',
    fontSize: '0.8rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--adm-bg-card)',
    border: '1px solid var(--adm-border)',
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 800,
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── FIXED TOP HEADER ───────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '1px solid var(--adm-border)',
        background: 'var(--adm-bg-card)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'var(--adm-accent-bg)',
            border: '1px solid rgba(212,175,55,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <User size={22} color="#D4AF37" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={lead.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
                style={{
                  ...inputStyle,
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  padding: '2px 6px',
                  background: 'transparent',
                  borderColor: 'transparent',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--adm-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                title="Clique para editar o nome"
              />
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingLeft: '6px' }}>
              <span>{lead.phone}</span>
              {lead.email && <span>· {lead.email}</span>}
              <span>· {lead.age} anos</span>
            </div>

            {/* Locked Info: Debutante and Venue */}
            <div style={{ fontSize: '0.68rem', color: '#D4AF37', marginTop: '4px', paddingLeft: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} />
              <span>Indicada por: <strong>{lead.debutanteName}</strong> (Protegido)</span>
              {leadVenue && <span style={{ color: 'var(--adm-text-muted)' }}> · {leadVenue.name}</span>}
            </div>
          </div>
        </div>

        {/* Action Button: WhatsApp */}
        <button
          onClick={() => onWhatsApp(lead)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            border: 'none',
            borderRadius: '10px',
            padding: '9px',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <Send size={14} />
          <span>Abrir no WhatsApp ({lead.phone})</span>
        </button>
      </div>

      {/* ── SCROLLABLE BODY ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* ── QUALIFICAÇÃO DA INDICAÇÃO (+1 PONTO) ─────────────────────────── */}
        <div style={{
          ...cardStyle,
          background: lead.isValidated ? 'rgba(52, 211, 153, 0.08)' : 'var(--adm-bg-card)',
          borderColor: lead.isValidated ? 'rgba(52, 211, 153, 0.35)' : 'var(--adm-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: lead.isValidated ? '#34D399' : 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Qualificação da Indicação
              </span>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color={lead.isValidated ? '#34D399' : 'var(--adm-text-muted)'} />
                <span>{lead.isValidated ? 'Indicação Validada (+1 Ponto)' : 'Aguardando Validação'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => lead.isValidated ? invalidateLead(lead.id) : validateLead(lead.id)}
              style={{
                background: lead.isValidated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.18)',
                color: lead.isValidated ? '#EF4444' : '#34D399',
                border: `1px solid ${lead.isValidated ? 'rgba(239, 68, 68, 0.35)' : 'rgba(52, 211, 153, 0.4)'}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {lead.isValidated ? 'Revogar Validação' : 'Validar Lead'}
            </button>
          </div>
        </div>

        {/* ── RESPONSABILIDADE COMPACTA: SDR & CLOSER ───────────────────────── */}
        <div style={cardStyle}>
          <span style={labelStyle}>
            <Users size={13} />
            <span>Responsáveis pelo Atendimento</span>
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* SDR */}
            <div style={{ background: 'var(--adm-bg-input)', padding: '10px', borderRadius: '10px', border: '1px solid var(--adm-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase' }}>
                  SDR (Captação)
                </span>
                {!lead.sdrId && (
                  <span style={{ fontSize: '0.58rem', background: 'rgba(245,158,11,0.15)', color: '#FBBF24', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                    Sem SDR
                  </span>
                )}
              </div>

              {sdrCollab ? (
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                  {sdrCollab.name}
                </div>
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                  Nenhum SDR atribuído
                </div>
              )}

              {/* SDR Selector (Manager/Master or Unassigned) */}
              {isManagerOrMaster || !lead.sdrId ? (
                <select
                  value={lead.sdrId || ''}
                  onChange={(e) => {
                    if (e.target.value) assignLeadSdr(lead.id, e.target.value);
                    else removeLeadSdr(lead.id);
                  }}
                  style={{ ...inputStyle, fontSize: '0.72rem', padding: '4px 6px' }}
                >
                  <option value="">Atribuir SDR...</option>
                  {sdrList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                  Apenas gerente pode alterar
                </div>
              )}
            </div>

            {/* CLOSER */}
            <div style={{ background: 'var(--adm-bg-input)', padding: '10px', borderRadius: '10px', border: '1px solid var(--adm-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase' }}>
                  Closer (Fechamento)
                </span>
                {!lead.closerId && (
                  <span style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)' }}>
                    Reunião+
                  </span>
                )}
              </div>

              {closerCollab ? (
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                  {closerCollab.name}
                </div>
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                  Nenhum closer atribuído
                </div>
              )}

              {/* Closer Selector */}
              {isManagerOrMaster || lead.stage === 'meeting_scheduled' || lead.stage === 'contract_signed' ? (
                <select
                  value={lead.closerId || ''}
                  onChange={(e) => {
                    if (e.target.value) assignLeadCloser(lead.id, e.target.value);
                    else removeLeadCloser(lead.id);
                  }}
                  style={{ ...inputStyle, fontSize: '0.72rem', padding: '4px 6px' }}
                >
                  <option value="">Atribuir Closer...</option>
                  {closerList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                  Disponível na Reunião
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ETAPA DO FUNIL COMERCIAL ──────────────────────────────────────── */}
        <div style={cardStyle}>
          <span style={labelStyle}>
            <Zap size={13} />
            <span>Etapa do Funil Comercial</span>
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {STAGE_LIST.map(stg => {
              const cfg = STAGE_CONFIGS[stg];
              const isCurrent = lead.stage === stg;
              return (
                <button
                  key={stg}
                  onClick={() => onStageChange(stg)}
                  style={{
                    background: isCurrent ? cfg.bg : 'transparent',
                    border: isCurrent ? `1.5px solid ${cfg.border}` : '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    color: isCurrent ? cfg.color : 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    fontWeight: isCurrent ? 800 : 500,
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span>{cfg.label}</span>
                  {isCurrent && <Check size={13} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 👤 SEÇÃO 1: DADOS DO CLIENTE & CONTATOS VINCULADOS ────────────── */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle} onClick={() => setExpandCustomer(!expandCustomer)}>
            <span style={labelStyle}>
              <User size={13} />
              <span>👤 Dados do Cliente & Contatos</span>
            </span>
            {expandCustomer ? <ChevronUp size={14} color="var(--adm-text-muted)" /> : <ChevronDown size={14} color="var(--adm-text-muted)" />}
          </div>

          {expandCustomer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    WhatsApp Principal
                  </label>
                  <input
                    type="text"
                    value={lead.phone}
                    onChange={(e) => handleUpdate({ phone: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="email@cliente.com"
                    value={lead.email || ''}
                    onChange={(e) => handleUpdate({ email: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    Bairro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Recreio, Barra..."
                    value={lead.neighborhood || ''}
                    onChange={(e) => handleUpdate({ neighborhood: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número, complemento..."
                    value={lead.address || ''}
                    onChange={(e) => handleUpdate({ address: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Sub-Contatos & Decisor */}
              <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Contatos Vinculados (Decisor vs Debutante)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingContact(!isAddingContact)}
                    style={{
                      background: 'rgba(212,175,55,0.15)',
                      border: '1px solid var(--adm-accent)',
                      color: 'var(--adm-accent)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={11} />
                    <span>+ Adicionar Contato</span>
                  </button>
                </div>

                {/* Form to add sub-contact */}
                {isAddingContact && (
                  <form onSubmit={handleAddSubContact} style={{ background: 'var(--adm-bg-input)', padding: '10px', borderRadius: '10px', border: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Nome do contato (Ex: Regina Benedita)"
                        required
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        style={inputStyle}
                      />
                      <select
                        value={newContactRole}
                        onChange={(e) => setNewContactRole(e.target.value as any)}
                        style={inputStyle}
                      >
                        <option value="mother">Mãe</option>
                        <option value="father">Pai</option>
                        <option value="decision_maker">Responsável / Decisor</option>
                        <option value="debutante">Debutante</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="WhatsApp / Telefone"
                        required
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        style={inputStyle}
                      />
                      <input
                        type="email"
                        placeholder="E-mail (opcional)"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setIsAddingContact(false)} className="adm-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
                        Cancelar
                      </button>
                      <button type="submit" className="adm-btn-primary" style={{ padding: '4px 12px', fontSize: '0.7rem' }}>
                        Salvar Contato
                      </button>
                    </div>
                  </form>
                )}

                {/* List of sub-contacts */}
                {(lead.contacts || []).length === 0 ? (
                  <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                    Nenhum contato secundário cadastrado (ex: Mãe ou Pai).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(lead.contacts || []).map((cnt) => (
                      <div key={cnt.id} style={{
                        background: cnt.isPrimaryDecisionMaker ? 'rgba(212,175,55,0.1)' : 'var(--adm-bg-input)',
                        border: `1px solid ${cnt.isPrimaryDecisionMaker ? 'rgba(212,175,55,0.4)' : 'var(--adm-border)'}`,
                        borderRadius: '8px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              {cnt.name}
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#D4AF37', background: 'rgba(212,175,55,0.15)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              {CONTACT_ROLE_LABELS[cnt.role]}
                            </span>
                            {cnt.isPrimaryDecisionMaker && (
                              <span style={{ fontSize: '0.6rem', color: '#22C55E', fontWeight: 800 }}>
                                👑 Decisor Principal
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                            {cnt.phone} {cnt.email ? `· ${cnt.email}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!cnt.isPrimaryDecisionMaker && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryDecisor(cnt)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--adm-border)',
                                color: 'var(--adm-text-muted)',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Tornar Decisor
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubContact(cnt.id)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 🎉 SEÇÃO 2: DADOS DO EVENTO ──────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle} onClick={() => setExpandEvent(!expandEvent)}>
            <span style={labelStyle}>
              <Calendar size={13} />
              <span>🎉 Dados do Evento</span>
            </span>
            {expandEvent ? <ChevronUp size={14} color="var(--adm-text-muted)" /> : <ChevronDown size={14} color="var(--adm-text-muted)" />}
          </div>

          {expandEvent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    Tipo de Evento *
                  </label>
                  <select
                    value={lead.eventType || '15 Anos'}
                    onChange={(e) => handleUpdate({ eventType: e.target.value as any })}
                    style={inputStyle}
                  >
                    <option value="15 Anos">15 Anos (Padrão Indicação)</option>
                    <option value="Casamento">Casamento</option>
                    <option value="Infantil">Infantil</option>
                    <option value="Formatura">Formatura</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    Data Prevista do Evento
                  </label>
                  <input
                    type="date"
                    value={lead.eventDate || lead.partyDate || ''}
                    onChange={(e) => handleUpdate({ eventDate: e.target.value, partyDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    Aniversário da Debutante
                  </label>
                  <input
                    type="date"
                    value={lead.debutanteBirthDate || ''}
                    onChange={(e) => handleUpdate({ debutanteBirthDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    Qtd. Estimada de Convidados
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    placeholder="Ex: 150 ou 200"
                    value={lead.estimatedGuests || ''}
                    onChange={(e) => handleUpdate({ estimatedGuests: Number(e.target.value) || undefined })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Data Desejada / Período (caso indefinido)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Segundo semestre de 2027, Férias de Julho..."
                  value={lead.desiredPeriod || ''}
                  onChange={(e) => handleUpdate({ desiredPeriod: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 💰 SEÇÃO 3: DADOS COMERCIAIS & QUALIFICAÇÃO ───────────────────── */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle} onClick={() => setExpandCommercial(!expandCommercial)}>
            <span style={labelStyle}>
              <DollarSign size={13} />
              <span>💰 Dados Comerciais & Qualificação</span>
            </span>
            {expandCommercial ? <ChevronUp size={14} color="var(--adm-text-muted)" /> : <ChevronDown size={14} color="var(--adm-text-muted)" />}
          </div>

          {expandCommercial && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Temperatura do Lead */}
              <div>
                <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Temperatura do Lead
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ temperature: 'hot' })}
                    style={{
                      background: lead.temperature === 'hot' ? 'rgba(239, 68, 68, 0.2)' : 'var(--adm-bg-input)',
                      border: `1.5px solid ${lead.temperature === 'hot' ? '#EF4444' : 'var(--adm-border)'}`,
                      color: lead.temperature === 'hot' ? '#EF4444' : 'var(--adm-text-muted)',
                      borderRadius: '8px',
                      padding: '6px 4px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Flame size={13} color="#EF4444" />
                    <span>🔥 Quente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdate({ temperature: 'warm' })}
                    style={{
                      background: lead.temperature === 'warm' ? 'rgba(245, 158, 11, 0.2)' : 'var(--adm-bg-input)',
                      border: `1.5px solid ${lead.temperature === 'warm' ? '#F59E0B' : 'var(--adm-border)'}`,
                      color: lead.temperature === 'warm' ? '#F59E0B' : 'var(--adm-text-muted)',
                      borderRadius: '8px',
                      padding: '6px 4px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🟡 Morno</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdate({ temperature: 'cold' })}
                    style={{
                      background: lead.temperature === 'cold' ? 'rgba(59, 130, 246, 0.2)' : 'var(--adm-bg-input)',
                      border: `1.5px solid ${lead.temperature === 'cold' ? '#3B82F6' : 'var(--adm-border)'}`,
                      color: lead.temperature === 'cold' ? '#3B82F6' : 'var(--adm-text-muted)',
                      borderRadius: '8px',
                      padding: '6px 4px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🔵 Frio</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Interesse (Espaço / Pacote / Serviço)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Espaço Realizar + Buffet Completo + Pista Paris"
                  value={lead.interestService || ''}
                  onChange={(e) => handleUpdate({ interestService: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    Orçamento / Investimento (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="Ex: 45000"
                    value={lead.estimatedBudget || ''}
                    onChange={(e) => handleUpdate({ estimatedBudget: Number(e.target.value) || undefined })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                    Forma de Pagamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Entrada + 24x sem juros"
                    value={lead.paymentMethod || ''}
                    onChange={(e) => handleUpdate({ paymentMethod: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Tags do Funil */}
              <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '8px' }}>
                <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Tags do Funil Comercial
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                  {(lead.tags || []).map((t) => (
                    <span key={t} style={{
                      background: 'rgba(212,175,55,0.15)',
                      border: '1px solid var(--adm-accent)',
                      color: 'var(--adm-accent)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', cursor: 'pointer', padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Tag */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Ex: Santo Agostinho, VIP, Orçamento Alto..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTagInput);
                      }
                    }}
                    style={{ ...inputStyle, fontSize: '0.74rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(newTagInput)}
                    style={{
                      background: 'var(--adm-accent-bg)',
                      border: '1px solid var(--adm-accent)',
                      color: 'var(--adm-accent)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    + Tag
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
