import React, { useState } from 'react';
import { 
  ArrowLeft, FileText, Plus, ExternalLink, Check, Copy, Trash2, 
  Clock, Sparkles, Send, CheckCircle2, MessageSquare, Shield, Heart,
  FileCheck, Users, ChevronDown
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { ClientStage, ClientDocument, LeadContact } from '../../types/admin';

interface AdminClientInspectorProps {
  clientId: string | null;
  onClose: () => void;
  onOpenDebutanteApp?: (slug: string) => void;
  onOpenCommercialLead?: (leadId: string) => void;
}

const STAGE_CONFIG: Record<ClientStage, { label: string; color: string; bg: string; border: string }> = {
  onboarding: { 
    label: 'Onboarding & Boas-Vindas', 
    color: '#3B82F6', 
    bg: 'rgba(59, 130, 246, 0.12)', 
    border: '#3B82F6' 
  },
  planning: { 
    label: 'Planejamento & Cronograma', 
    color: '#F59E0B', 
    bg: 'rgba(245, 158, 11, 0.12)', 
    border: '#F59E0B' 
  },
  suppliers: { 
    label: 'Definição de Fornecedores', 
    color: '#8B5CF6', 
    bg: 'rgba(139, 92, 246, 0.12)', 
    border: '#8B5CF6' 
  },
  final_alignment: { 
    label: 'Alinhamento Final (Reta Final)', 
    color: '#6366F1', 
    bg: 'rgba(99, 102, 241, 0.12)', 
    border: '#6366F1' 
  },
  party_day: { 
    label: 'Semana do Evento / Festa', 
    color: '#EAB308', 
    bg: 'rgba(234, 179, 8, 0.12)', 
    border: '#EAB308' 
  },
  completed: { 
    label: 'Festa Realizada (Sucesso)', 
    color: '#10B981', 
    bg: 'rgba(16, 185, 129, 0.12)', 
    border: '#10B981' 
  },
  archived: { 
    label: 'Arquivado', 
    color: '#6B7280', 
    bg: 'rgba(107, 114, 128, 0.12)', 
    border: '#6B7280' 
  }
};

const STAGES_ORDER: ClientStage[] = [
  'onboarding', 
  'planning', 
  'suppliers', 
  'final_alignment', 
  'party_day', 
  'completed'
];

export const AdminClientInspector: React.FC<AdminClientInspectorProps> = ({
  clientId,
  onClose,
  onOpenDebutanteApp,
  onOpenCommercialLead,
}) => {
  const { 
    clients, 
    debutantes, 
    venues,
    updateClient,
    updateClientStage, 
    deleteClient,
    addClientNote,
    addClientDocument,
    linkClientDebutante,
    addDebutanteAccount,
  } = useAdminState();

  const [activeTab, setActiveTab] = useState<'timeline' | 'whatsapp' | 'documents' | 'commercial'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  
  // Document Upload Modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<ClientDocument['type']>('contract');
  const [docFileUrl, setDocFileUrl] = useState('');

  // Subcontact Form state
  const [isAddingSubContact, setIsAddingSubContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState<'father' | 'mother' | 'guardian' | 'self' | 'other'>('mother');
  const [newContactEmail, setNewContactEmail] = useState('');

  // Optional Fields toggles
  const [showPayerEmail, setShowPayerEmail] = useState(false);
  const [showPayerCpf, setShowPayerCpf] = useState(false);
  const [showPayerAddress, setShowPayerAddress] = useState(false);

  if (!clientId) return null;

  const client = clients.find(c => c.id === clientId);
  if (!client) return null;

  const linkedDebutante = client.debutanteId ? debutantes.find(d => d.id === client.debutanteId) : null;
  const stageInfo = STAGE_CONFIG[client.stage] || STAGE_CONFIG.onboarding;

  const handleCopyAppUrl = () => {
    const slug = client.debutanteSlug || linkedDebutante?.slug;
    if (!slug) return;
    const url = `${window.location.origin}/app/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2000);
  };

  const handleDirectWhatsApp = (phone: string, text?: string) => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return;
    const fullNum = clean.startsWith('55') ? clean : `55${clean}`;
    const url = text 
      ? `https://wa.me/${fullNum}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${fullNum}`;
    window.open(url, '_blank');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addClientNote(client.id, newNote.trim());
    setNewNote('');
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    addClientDocument(client.id, {
      title: docTitle.trim(),
      type: docType,
      fileUrl: docFileUrl.trim() || '#',
      fileSize: '1.5 MB',
    });
    setDocTitle('');
    setDocFileUrl('');
    setIsDocModalOpen(false);
  };

  const handleCreateAndLinkDebutante = () => {
    const deb = addDebutanteAccount({
      name: client.birthdayPersonName || client.name,
      venueId: client.venueId || venues[0]?.id || '',
      partyDate: client.eventDate,
      phone: client.payerPhone,
      email: client.payerEmail,
    });
    linkClientDebutante(client.id, deb.id);
  };

  const handleUnlinkDebutante = () => {
    linkClientDebutante(client.id, null);
  };

  const handleAddSubContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const newContact: LeadContact = {
      id: `cnt_${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      role: newContactRole,
      email: newContactEmail.trim() || undefined,
      isPrimaryDecisionMaker: false,
    };

    const updatedContacts = [...(client.contacts || []), newContact];
    updateClient(client.id, { contacts: updatedContacts });

    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setIsAddingSubContact(false);
  };

  const handleRemoveSubContact = (contactId: string) => {
    const updated = (client.contacts || []).filter(c => c.id !== contactId);
    updateClient(client.id, { contacts: updated });
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const sectionTitleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 2px 2px',
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--adm-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--adm-bg-card)',
    border: '1px solid var(--adm-border)',
    borderRadius: '12px',
    padding: '12px 14px',
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  };

  const cardRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.78rem',
    minHeight: '28px',
    gap: '8px',
    paddingTop: '2px',
    paddingBottom: '2px',
  };

  const cardLabelStyle: React.CSSProperties = {
    width: '110px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.76rem',
    fontWeight: 600,
  };

  const cardValueStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
  };

  const seamlessInputStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px dashed transparent',
    borderRadius: '0',
    padding: '3px 4px',
    color: 'var(--adm-text-title)',
    fontSize: '0.82rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'border-color 0.15s ease, background 0.15s ease',
  };

  const cardSelectStyle: React.CSSProperties = {
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '6px',
    padding: '4px 8px',
    color: 'var(--adm-text-title)',
    fontSize: '0.78rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    width: '100%',
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--adm-bg-app)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: 'hidden',
      color: 'var(--adm-text-body)',
    }}>
      {/* ── Top Header Bar (Full Content Area Header) ── */}
      <div style={{
        height: '60px',
        borderBottom: '1px solid var(--adm-border)',
        background: 'var(--adm-bg-card)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 20,
      }}>
        {/* Left: Voltar + Código + Nome da Aniversariante */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              color: 'var(--adm-text-title)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Kanban</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              color: 'var(--adm-accent, #B8860B)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              flexShrink: 0,
            }}>
              {client.code}
            </span>

            <h1 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {client.birthdayPersonName || client.name}
            </h1>

            {client.birthdayPersonAge && (
              <span style={{ fontSize: '12px', color: 'var(--adm-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                ({client.birthdayPersonAge} Anos)
              </span>
            )}
          </div>
        </div>

        {/* Right: Stage Selector + Delete + Debutante Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Stage Dropdown Selector */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: `1px solid ${stageInfo.border}`,
                backgroundColor: stageInfo.bg,
                color: stageInfo.color,
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <span>Etapa: {stageInfo.label}</span>
              <ChevronDown size={14} />
            </button>

            {isStageDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                padding: '4px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                zIndex: 100,
                minWidth: '220px',
              }}>
                {STAGES_ORDER.map(stg => {
                  const cfg = STAGE_CONFIG[stg];
                  const isSelected = client.stage === stg;
                  return (
                    <div
                      key={stg}
                      onClick={() => {
                        updateClientStage(client.id, stg);
                        setIsStageDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.76rem',
                        fontWeight: isSelected ? 800 : 500,
                        color: isSelected ? cfg.color : 'var(--adm-text-title)',
                        backgroundColor: isSelected ? cfg.bg : 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? cfg.bg : 'var(--adm-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? cfg.bg : 'transparent'}
                    >
                      <span>{cfg.label}</span>
                      {isSelected && <Check size={14} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delete Client */}
          <button
            type="button"
            onClick={() => setIsDeleting(true)}
            title="Excluir Cliente"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Main Workspace Body (Split 2 Columns) ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── LEFT COLUMN: Ficha Cadastral (Scrollable, ~420px) ── */}
        <div style={{
          width: '420px',
          borderRight: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-card)',
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flexShrink: 0,
        }}>
          {/* Seção 1: Aniversariante & Evento */}
          <div style={sectionTitleStyle}>
            <Heart size={13} color="var(--adm-accent)" />
            <span>Aniversariante & Evento</span>
          </div>

          <div style={cardStyle}>
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Aniversariante</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.birthdayPersonName || client.name}
                  onChange={(e) => updateClient(client.id, { birthdayPersonName: e.target.value, name: e.target.value })}
                  style={seamlessInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; e.currentTarget.style.background = 'var(--adm-bg-input)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Idade que fará</span>
              <div style={cardValueStyle}>
                <input
                  type="number"
                  value={client.birthdayPersonAge || 15}
                  onChange={(e) => updateClient(client.id, { birthdayPersonAge: Number(e.target.value) || 15 })}
                  style={{ ...seamlessInputStyle, width: '70px' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
                <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>Anos</span>
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Data Nascimento</span>
              <div style={cardValueStyle}>
                <input
                  type="date"
                  value={client.birthdayPersonBirthdate || ''}
                  onChange={(e) => updateClient(client.id, { birthdayPersonBirthdate: e.target.value })}
                  style={seamlessInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Data da Festa</span>
              <div style={cardValueStyle}>
                <input
                  type="date"
                  value={client.eventDate || ''}
                  onChange={(e) => updateClient(client.id, { eventDate: e.target.value })}
                  style={{ ...seamlessInputStyle, fontWeight: 700, color: '#F59E0B' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Horário</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.eventTime || '20:00 às 02:00'}
                  onChange={(e) => updateClient(client.id, { eventTime: e.target.value })}
                  placeholder="Ex: 20:00 às 02:00"
                  style={seamlessInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Casa de Festas</span>
              <div style={cardValueStyle}>
                <select
                  value={client.venueId || ''}
                  onChange={(e) => {
                    const matched = venues.find(v => v.id === e.target.value);
                    updateClient(client.id, { venueId: e.target.value, venueName: matched?.name || client.venueName });
                  }}
                  style={cardSelectStyle}
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Convidados</span>
              <div style={cardValueStyle}>
                <input
                  type="number"
                  value={client.guestCount || 150}
                  onChange={(e) => updateClient(client.id, { guestCount: Number(e.target.value) || 0 })}
                  style={{ ...seamlessInputStyle, width: '90px' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
                <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>Pessoas</span>
              </div>
            </div>
          </div>

          {/* Seção 2: Contratante & Decisores */}
          <div style={{ ...sectionTitleStyle, marginTop: '4px' }}>
            <Users size={13} color="var(--adm-accent)" />
            <span>Contratante & Decisores</span>
          </div>

          <div style={cardStyle}>
            {/* Decisor Principal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--adm-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Decisor Principal</span>
                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: 700 }}>
                  Principal
                </span>
              </div>

              {client.payerPhone && (
                <button
                  type="button"
                  onClick={() => handleDirectWhatsApp(client.payerPhone)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(37, 211, 102, 0.12)',
                    color: '#25D366',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <MessageSquare size={11} fill="#25D366" />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Nome</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.payerName || ''}
                  onChange={(e) => updateClient(client.id, { payerName: e.target.value })}
                  style={seamlessInputStyle}
                  placeholder="Nome do responsável..."
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Parentesco</span>
              <div style={cardValueStyle}>
                <select
                  value={client.payerRelationship || 'mother'}
                  onChange={(e) => updateClient(client.id, { payerRelationship: e.target.value as any })}
                  style={cardSelectStyle}
                >
                  <option value="mother">Mãe</option>
                  <option value="father">Pai</option>
                  <option value="guardian">Responsável Legal</option>
                  <option value="self">A própria Aniversariante</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Telefone / Zap</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.payerPhone || ''}
                  onChange={(e) => updateClient(client.id, { payerPhone: e.target.value })}
                  style={seamlessInputStyle}
                  placeholder="(21) 99999-9999"
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Optional Payer Fields */}
            {(client.payerEmail || showPayerEmail) ? (
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>E-mail</span>
                <div style={cardValueStyle}>
                  <input
                    type="email"
                    value={client.payerEmail || ''}
                    onChange={(e) => updateClient(client.id, { payerEmail: e.target.value })}
                    style={seamlessInputStyle}
                    placeholder="email@exemplo.com"
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>
            ) : null}

            {(client.payerCpf || showPayerCpf) ? (
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>CPF</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    value={client.payerCpf || ''}
                    onChange={(e) => updateClient(client.id, { payerCpf: e.target.value })}
                    style={seamlessInputStyle}
                    placeholder="000.000.000-00"
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>
            ) : null}

            {(client.payerAddress || client.payerNeighborhood || showPayerAddress) ? (
              <>
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Endereço</span>
                  <div style={cardValueStyle}>
                    <input
                      type="text"
                      value={client.payerAddress || ''}
                      onChange={(e) => updateClient(client.id, { payerAddress: e.target.value })}
                      style={seamlessInputStyle}
                      placeholder="Rua, número..."
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                  </div>
                </div>
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Bairro / Cidade</span>
                  <div style={{ ...cardValueStyle, gap: '6px' }}>
                    <input
                      type="text"
                      value={client.payerNeighborhood || ''}
                      onChange={(e) => updateClient(client.id, { payerNeighborhood: e.target.value })}
                      style={seamlessInputStyle}
                      placeholder="Bairro"
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                    <input
                      type="text"
                      value={client.payerCity || ''}
                      onChange={(e) => updateClient(client.id, { payerCity: e.target.value })}
                      style={seamlessInputStyle}
                      placeholder="Cidade"
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {/* Optional Field Adder Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid var(--adm-border)' }}>
              {!client.payerEmail && !showPayerEmail && (
                <button
                  type="button"
                  onClick={() => setShowPayerEmail(true)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--adm-border)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={10} /> E-mail
                </button>
              )}
              {!client.payerCpf && !showPayerCpf && (
                <button
                  type="button"
                  onClick={() => setShowPayerCpf(true)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--adm-border)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={10} /> CPF
                </button>
              )}
              {!client.payerAddress && !showPayerAddress && (
                <button
                  type="button"
                  onClick={() => setShowPayerAddress(true)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--adm-border)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={10} /> Endereço / Bairro
                </button>
              )}
            </div>

            {/* Subcontatos cadastrados */}
            {(client.contacts || []).map(cnt => (
              <div key={cnt.id} style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    {cnt.name} ({cnt.role === 'mother' ? 'Mãe' : cnt.role === 'father' ? 'Pai' : cnt.role || 'Contato'})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cnt.phone && (
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsApp(cnt.phone)}
                        style={{ background: 'transparent', border: 'none', color: '#25D366', cursor: 'pointer', padding: 0 }}
                      >
                        <MessageSquare size={12} fill="#25D366" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveSubContact(cnt.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                  {formatPhone(cnt.phone)} {cnt.email ? `• ${cnt.email}` : ''}
                </div>
              </div>
            ))}

            {/* Adicionar Subcontato */}
            {isAddingSubContact ? (
              <form onSubmit={handleAddSubContact} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '8px', padding: '10px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="Nome do contato..."
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  style={seamlessInputStyle}
                  required
                />
                <input
                  type="text"
                  placeholder="Telefone / WhatsApp..."
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  style={seamlessInputStyle}
                  required
                />
                <select
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value as any)}
                  style={cardSelectStyle}
                >
                  <option value="father">Pai</option>
                  <option value="mother">Mãe</option>
                  <option value="guardian">Responsável</option>
                  <option value="other">Outro</option>
                </select>
                <input
                  type="email"
                  placeholder="E-mail (opcional)..."
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  style={seamlessInputStyle}
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="button" onClick={() => setIsAddingSubContact(false)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" style={{ background: 'var(--adm-accent)', border: 'none', color: '#FFF', borderRadius: '6px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                    Salvar
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingSubContact(true)}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--adm-border)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  color: 'var(--adm-accent)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  marginTop: '4px',
                }}
              >
                <Plus size={12} /> Adicionar Contato / Responsável
              </button>
            )}
          </div>

          {/* Seção 3: Contrato & Negociação (Pós-Venda) */}
          <div style={{ ...sectionTitleStyle, marginTop: '4px' }}>
            <FileCheck size={13} color="var(--adm-accent)" />
            <span>Contrato & Negociação</span>
          </div>

          <div style={cardStyle}>
            {/* Status do Contrato */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Status Contrato</span>
              <div style={cardValueStyle}>
                <select
                  value={client.contractStatus || 'aguardando_sinal'}
                  onChange={(e) => updateClient(client.id, { contractStatus: e.target.value as any })}
                  style={{
                    ...cardSelectStyle,
                    fontWeight: 800,
                    color: client.contractStatus === 'contrato_assinado' ? '#10B981' : client.contractStatus === 'sinal_pago' ? '#3B82F6' : '#F59E0B',
                  }}
                >
                  <option value="aguardando_sinal">⏳ Aguardando Pagamento do Sinal</option>
                  <option value="sinal_pago">💰 Sinal Pago (Aguardando Assinatura)</option>
                  <option value="contrato_enviado">📤 Contrato Enviado ao Cliente</option>
                  <option value="contrato_assinado">✅ Contrato Assinado (Válido)</option>
                </select>
              </div>
            </div>

            {/* Data de Assinatura */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Assinado em</span>
              <div style={cardValueStyle}>
                <input
                  type="date"
                  value={client.contractSignedAt || ''}
                  onChange={(e) => updateClient(client.id, { contractSignedAt: e.target.value })}
                  style={seamlessInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Pagamento do Sinal / Entrada */}
            <div style={{ ...cardRowStyle, borderTop: '1px solid var(--adm-border)', paddingTop: '6px' }}>
              <span style={cardLabelStyle}>Sinal / Entrada</span>
              <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.74rem', color: client.signalPaid ? '#10B981' : 'var(--adm-text-title)', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(client.signalPaid)}
                    onChange={(e) => updateClient(client.id, { signalPaid: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{client.signalPaid ? 'Sinal Pago' : 'Pendente'}</span>
                </label>

                <input
                  type="number"
                  placeholder="Valor R$"
                  value={client.signalValue || ''}
                  onChange={(e) => updateClient(client.id, { signalValue: Number(e.target.value) || 0 })}
                  style={{ ...seamlessInputStyle, width: '90px' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Pacote Vendido */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Pacote</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.packageSold || ''}
                  onChange={(e) => updateClient(client.id, { packageSold: e.target.value })}
                  style={seamlessInputStyle}
                  placeholder="Ex: Pacote Ouro..."
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Valor Total do Contrato */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Valor Total</span>
              <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.82rem' }}>R$</span>
                <input
                  type="number"
                  value={client.dealValue || 0}
                  onChange={(e) => updateClient(client.id, { dealValue: Number(e.target.value) || 0 })}
                  style={{ ...seamlessInputStyle, fontWeight: 800, color: '#10B981' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#10B981'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Condições de Pagamento */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Condições Pgto</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.paymentTerms || ''}
                  onChange={(e) => updateClient(client.id, { paymentTerms: e.target.value })}
                  style={seamlessInputStyle}
                  placeholder="Ex: Entrada + 10x sem juros..."
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: App da Debutante & Convidados */}
          <div style={{ ...sectionTitleStyle, marginTop: '4px' }}>
            <Sparkles size={13} color="var(--adm-accent)" />
            <span>App da Debutante & Convidados</span>
          </div>

          <div style={cardStyle}>
            {client.debutanteId || client.debutanteSlug || linkedDebutante ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10B981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <CheckCircle2 size={12} /> /app/{client.debutanteSlug || linkedDebutante?.slug}
                  </span>

                  <button
                    type="button"
                    onClick={handleUnlinkDebutante}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                    }}
                  >
                    Desvincular
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const slug = client.debutanteSlug || linkedDebutante?.slug;
                      if (slug) {
                        if (onOpenDebutanteApp) {
                          onOpenDebutanteApp(slug);
                        } else {
                          window.open(`/app/${slug}`, '_blank');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--adm-accent, #B8860B)',
                      color: '#FFF',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Acessar App Debutante</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyAppUrl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border)',
                      backgroundColor: 'var(--adm-bg-input)',
                      color: copiedAppUrl ? '#10B981' : 'var(--adm-text-title)',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedAppUrl ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedAppUrl ? 'Copiado' : 'Link'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', padding: '6px 0' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                  Este cliente ainda não possui acesso ao App de Confirmação & Convidados.
                </p>
                <button
                  type="button"
                  onClick={handleCreateAndLinkDebutante}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--adm-accent, #B8860B)',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.25)',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Criar / Vincular Acesso Debutante</span>
                </button>
              </div>
            )}
          </div>

          {/* Seção 5: Histórico Comercial Original */}
          {client.commercialHistory && (
            <>
              <div style={{ ...sectionTitleStyle, marginTop: '4px' }}>
                <Shield size={13} color="var(--adm-accent)" />
                <span>Histórico Comercial do Lead</span>
              </div>
              <div style={cardStyle}>
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Origem</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    {client.commercialHistory.origin || 'Comercial CRM'}
                  </span>
                </div>
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Fechado Por</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>
                    {client.commercialHistory.closedBy || 'Equipe Comercial'}
                  </span>
                </div>
                {client.commercialLeadId && onOpenCommercialLead && (
                  <button
                    type="button"
                    onClick={() => onOpenCommercialLead(client.commercialLeadId!)}
                    style={{
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--adm-border)',
                      background: 'var(--adm-bg-input)',
                      color: 'var(--adm-accent)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Ver Ficha Original do Lead</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT COLUMN: Timeline, WhatsApp, Documentos ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--adm-bg-app)',
        }}>
          {/* Tabs Bar */}
          <div style={{
            height: '46px',
            borderBottom: '1px solid var(--adm-border)',
            background: 'var(--adm-bg-card)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: '8px',
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'timeline' ? 'var(--adm-bg-input)' : 'transparent',
                color: activeTab === 'timeline' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                fontWeight: activeTab === 'timeline' ? 800 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <Clock size={14} />
              <span>Timeline & Histórico</span>
              <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', fontWeight: 700 }}>
                {(client.activities || []).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'whatsapp' ? 'var(--adm-bg-input)' : 'transparent',
                color: activeTab === 'whatsapp' ? '#25D366' : 'var(--adm-text-muted)',
                fontWeight: activeTab === 'whatsapp' ? 800 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={14} />
              <span>WhatsApp & Mensagens</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'documents' ? 'var(--adm-bg-input)' : 'transparent',
                color: activeTab === 'documents' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                fontWeight: activeTab === 'documents' ? 800 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <FileText size={14} />
              <span>Documentos & Anexos</span>
              <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.12)', color: '#B8860B', fontWeight: 700 }}>
                {(client.documents || []).length}
              </span>
            </button>
          </div>

          {/* Tab 1: Timeline & Atividades */}
          {activeTab === 'timeline' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Activity List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(client.activities || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--adm-text-muted)' }}>
                    <Clock size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>Nenhuma atividade registrada ainda neste cliente.</p>
                  </div>
                ) : (
                  [...(client.activities || [])].reverse().map(act => (
                    <div
                      key={act.id}
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-accent)' }}>
                          {act.createdBy || 'Sistema'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                          {new Date(act.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.80rem', color: 'var(--adm-text-title)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                        {act.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Bar */}
              <form onSubmit={handleAddNote} style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-card)',
                display: 'flex',
                gap: '10px',
              }}>
                <input
                  type="text"
                  placeholder="Adicionar nota operacional ou registro de atendimento..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    color: 'var(--adm-text-title)',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--adm-accent, #B8860B)',
                    color: '#FFF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: newNote.trim() ? 'pointer' : 'default',
                    opacity: newNote.trim() ? 1 : 0.5,
                  }}
                >
                  <Send size={14} />
                  <span>Registrar</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: WhatsApp & Comunicação */}
          {activeTab === 'whatsapp' && (
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#25D366',
                  }}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      Comunicação Direta via WhatsApp
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                      Inicie conversas operacionais ou envie mensagens pré-formatadas com 1 clique
                    </p>
                  </div>
                </div>

                {/* Direct Number */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--adm-bg-input)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', display: 'block' }}>Telefone do Decisor:</span>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--adm-text-title)' }}>{formatPhone(client.payerPhone)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDirectWhatsApp(client.payerPhone)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#25D366',
                      color: '#FFF',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <MessageSquare size={13} fill="#FFF" />
                    <span>Abrir Conversa</span>
                  </button>
                </div>

                {/* Quick Message Templates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Modelos Rápidos de Mensagens
                  </span>

                  {[
                    {
                      label: '🎉 Boas-vindas & Onboarding',
                      text: `Olá ${client.payerName}! É um prazer ter você e a ${client.birthdayPersonName} conosco na Bonomo Festas. Estamos iniciando a organização da sua festa para o dia ${new Date(client.eventDate).toLocaleDateString('pt-BR')}.`,
                    },
                    {
                      label: '📋 Envio do Link do App',
                      text: client.debutanteSlug ? `Olá ${client.birthdayPersonName}! Segue o link exclusivo do seu App de Convidados e Confirmação: ${window.location.origin}/app/${client.debutanteSlug}` : 'Acesse o App da Debutante.',
                    },
                    {
                      label: '🍰 Agendamento de Degustação / Visita',
                      text: `Olá ${client.payerName}! Gostaríamos de agendar a degustação do menu e a visita técnica da festa da ${client.birthdayPersonName}. Qual o melhor dia para vocês?`,
                    },
                  ].map((tpl, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleDirectWhatsApp(client.payerPhone, tpl.text)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-bg-input)'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', display: 'block' }}>{tpl.label}</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.70rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.text}</p>
                      </div>
                      <Send size={13} color="#25D366" style={{ marginLeft: '8px', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Documentos & Anexos */}
          {activeTab === 'documents' && (
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Documentos e Contratos Anexados
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                    Armazenamento seguro de contratos, comprovantes e anexos operacionais
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--adm-accent, #B8860B)',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Anexar Documento</span>
                </button>
              </div>

              {(client.documents || []).length === 0 ? (
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px dashed var(--adm-border)',
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--adm-text-muted)',
                }}>
                  <FileText size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.82rem' }}>Nenhum documento anexado ainda.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {(client.documents || []).map(doc => (
                    <div
                      key={doc.id}
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <FileText size={16} color="var(--adm-accent)" />
                        <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>{doc.fileSize || '1 MB'}</span>
                      </div>
                      <strong style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>{doc.title}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        {doc.type === 'contract' ? 'Contrato' : doc.type === 'receipt' ? 'Comprovante' : 'Anexo'} • {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Document Upload Modal ── */}
      {isDocModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <form onSubmit={handleAddDocument} style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              Anexar Documento ao Cliente
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>Título do Documento</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Ex: Contrato Assinado, Comprovante de Entrada..."
                required
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>Tipo de Documento</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                style={cardSelectStyle}
              >
                <option value="contract">Contrato</option>
                <option value="receipt">Comprovante de Pagamento</option>
                <option value="layout">Planta / Layout da Festa</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>Link / URL do Arquivo</label>
              <input
                type="text"
                value={docFileUrl}
                onChange={(e) => setDocFileUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: 'var(--adm-accent, #B8860B)',
                  border: 'none',
                  color: '#FFF',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Salvar Anexo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      <AdminConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={() => {
          deleteClient(client.id);
          setIsDeleting(false);
          onClose();
        }}
        title="Excluir Cliente"
        message={`Deseja realmente remover o cliente "${client.birthdayPersonName || client.name}" (${client.code}) do sistema de Pós-Venda? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir Cliente"
        cancelText="Cancelar"
        danger={true}
      />
    </div>
  );
};
