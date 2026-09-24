import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, Check, ChevronLeft, Heart, 
  Users, Sparkles, ExternalLink, 
  FileText, Copy, Plus, Trash2, Tag,
  Shield, MessageSquare,
  Gift, Clock, Award, Star
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput, formatPhone } from '../../utils/phoneFormatter';
import { renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import type { Lead, ClientStage, LeadContact } from '../../types/admin';

interface AdminClientDrawerInspectorProps {
  lead: Lead;
  onStageChange: (stage: ClientStage) => void;
  onToggleCollapse?: () => void;
  onOpenDebutanteApp?: (slug: string) => void;
  onOpenFullInspector?: (clientId: string) => void;
  readOnly?: boolean;
}

const POST_SALE_STAGES: { id: ClientStage; label: string; color: string; bg: string; border: string; icon: string }[] = [
  { 
    id: 'onboarding', 
    label: 'ONBOARDING & BOAS-VINDAS', 
    color: '#3B82F6', 
    bg: 'rgba(59, 130, 246, 0.12)', 
    border: 'rgba(59, 130, 246, 0.4)',
    icon: 'inbox' 
  },
  { 
    id: 'planning', 
    label: 'PLANEJAMENTO & CRONOGRAMA', 
    color: '#F59E0B', 
    bg: 'rgba(245, 158, 11, 0.12)', 
    border: 'rgba(245, 158, 11, 0.4)',
    icon: 'calendar' 
  },
  { 
    id: 'suppliers', 
    label: 'DEFINIÇÃO DE FORNECEDORES', 
    color: '#8B5CF6', 
    bg: 'rgba(139, 92, 246, 0.12)', 
    border: 'rgba(139, 92, 246, 0.4)',
    icon: 'building' 
  },
  { 
    id: 'final_alignment', 
    label: 'ALINHAMENTO FINAL (RETA FINAL)', 
    color: '#6366F1', 
    bg: 'rgba(99, 102, 241, 0.12)', 
    border: 'rgba(99, 102, 241, 0.4)',
    icon: 'check-circle' 
  },
  { 
    id: 'party_day', 
    label: 'SEMANA DA FESTA / EVENTO', 
    color: '#EAB308', 
    bg: 'rgba(234, 179, 8, 0.12)', 
    border: 'rgba(234, 179, 8, 0.4)',
    icon: 'sparkles' 
  },
  { 
    id: 'completed', 
    label: 'FESTA REALIZADA', 
    color: '#10B981', 
    bg: 'rgba(16, 185, 129, 0.12)', 
    border: 'rgba(16, 185, 129, 0.4)',
    icon: 'party-popper' 
  },
];

export const AdminClientDrawerInspector: React.FC<AdminClientDrawerInspectorProps> = ({
  lead,
  onStageChange,
  onToggleCollapse,
  onOpenDebutanteApp,
  readOnly = false,
}) => {
  const { 
    clients, 
    collaborators, 
    venues, 
    debutantes,
    leads,
    updateClient, 
    linkClientDebutante,
    addDebutanteAccount
  } = useAdminState();

  const [activeTab, setActiveTab] = useState<'ficha' | 'debutante' | 'comercial'>('ficha');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isSuccessManagerDropdownOpen, setIsSuccessManagerDropdownOpen] = useState(false);

  // Subcontatos Form
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState<'mother' | 'father' | 'guardian' | 'self' | 'other'>('mother');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactCpf, setNewContactCpf] = useState('');
  const [newContactIsDecisor, setNewContactIsDecisor] = useState(false);

  // Localizar o cliente real no estado
  const client = useMemo(() => {
    return clients.find(c => c.id === lead.id || c.commercialLeadId === lead.id) || null;
  }, [clients, lead.id]);

  // Lead Comercial Original
  const commercialLead = useMemo(() => {
    if (client?.commercialLeadId) {
      return leads.find(l => l.id === client.commercialLeadId) || null;
    }
    return leads.find(l => l.id === lead.id || (l.phone && client?.payerPhone && l.phone === client.payerPhone)) || null;
  }, [leads, client, lead]);

  const currentStage = (client?.stage || lead.stage || 'onboarding') as ClientStage;
  const currentStageConfig = POST_SALE_STAGES.find(s => s.id === currentStage) || POST_SALE_STAGES[0];
  const currentStageIndex = POST_SALE_STAGES.findIndex(s => s.id === currentStage);

  const linkedDebutante = useMemo(() => {
    if (client?.debutanteId) return debutantes.find(d => d.id === client.debutanteId);
    if (lead.debutanteId) return debutantes.find(d => d.id === lead.debutanteId);
    if (client?.debutanteSlug) return debutantes.find(d => d.slug === client.debutanteSlug);
    return null;
  }, [debutantes, client, lead]);

  const debutanteSlug = client?.debutanteSlug || lead.debutanteSlug || linkedDebutante?.slug || (client?.name || lead.name || 'festa').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const partyDateStr = client?.partyDate || client?.eventDate || lead.partyDate || lead.eventDate || '';
  
  // Contagem regressiva de dias para a festa
  const countdownDays = useMemo(() => {
    if (!partyDateStr) return null;
    const pTime = new Date(partyDateStr + 'T12:00:00').getTime();
    const now = Date.now();
    const diff = Math.ceil((pTime - now) / (1000 * 60 * 60 * 24));
    return diff;
  }, [partyDateStr]);

  // Gestor de Sucesso responsável
  const successManagerCollab = useMemo(() => {
    const sId = client?.assignedSuccessManagerId || client?.assignedToId || lead.sdrId;
    if (sId) return collaborators.find(c => c.id === sId);
    const sName = client?.assignedSuccessManagerName || client?.assignedTo || lead.assignedTo;
    if (sName) return collaborators.find(c => c.name === sName);
    return undefined;
  }, [collaborators, client, lead]);

  // Valores financeiros
  const baseValue = client?.baseContractValue ?? (client?.dealValue || lead.dealValue || 0);
  const downPayment = client?.contractDownPayment ?? client?.signalValue ?? 0;
  const installmentsCount = client?.contractInstallmentsCount || 10;
  const installmentsRemaining = client?.contractInstallmentsRemaining ?? Math.max(0, baseValue - downPayment);
  const parcelValue = installmentsCount > 0 ? (installmentsRemaining / installmentsCount) : 0;
  const hasCreditCard = client?.hasCreditCard ?? (lead as any)?.hasCreditCard ?? false;

  const upsellSales = client?.upsellSales || [];
  const totalUpsellValue = upsellSales.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
  const totalClientValue = baseValue + totalUpsellValue;

  const handleCopyCode = () => {
    const code = client?.code || lead.code || '';
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyDebutanteLink = () => {
    if (!debutanteSlug) return;
    const url = `${window.location.origin}/app/${debutanteSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDirectWhatsApp = (phone?: string, text?: string) => {
    const raw = phone || client?.payerPhone || lead.phone || '';
    const clean = raw.replace(/\D/g, '');
    if (!clean) return;
    const fullNum = clean.startsWith('55') ? clean : `55${clean}`;
    const url = text 
      ? `https://wa.me/${fullNum}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${fullNum}`;
    window.open(url, '_blank');
  };

  const handleAddSubContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !newContactName.trim() || !newContactPhone.trim()) return;

    const newContact: LeadContact = {
      id: `cnt_${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      role: newContactRole,
      email: newContactEmail.trim() || undefined,
      cpf: newContactCpf.trim() || undefined,
      isPrimaryDecisionMaker: newContactIsDecisor,
    };

    const updatedContacts = [...(client.contacts || []), newContact];
    updateClient(client.id, { contacts: updatedContacts });

    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactCpf('');
    setNewContactIsDecisor(false);
    setIsAddingContact(false);
  };

  const handleRemoveSubContact = (contactId: string) => {
    if (!client) return;
    const updated = (client.contacts || []).filter(c => c.id !== contactId);
    updateClient(client.id, { contacts: updated });
  };

  const handleCreateDebutanteAccount = () => {
    if (!client) return;
    const newAcc = addDebutanteAccount({
      name: client.birthdayPersonName || client.name,
      venueId: client.venueId,
      partyDate: client.eventDate || client.partyDate || new Date().toISOString().split('T')[0],
      phone: client.birthdayPersonPhone || client.payerPhone || '',
      email: client.payerEmail || '',
      hasJourneyEnabled: true,
      baseGuestLimit: client.guestCount || 150,
    });
    if (newAcc?.id) {
      linkClientDebutante(client.id, newAcc.id);
    }
  };

  // Estilos Padronizados F5 System
  const cardStyle: React.CSSProperties = {
    background: 'var(--adm-bg-card)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  };

  const cardRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.76rem',
    minHeight: '26px',
    gap: '8px',
  };

  const cardLabelStyle: React.CSSProperties = {
    width: '108px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.74rem',
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
    padding: '2px 4px',
    color: 'var(--adm-text-title)',
    fontSize: '0.80rem',
    fontWeight: 600,
    outline: 'none',
    transition: 'all 0.15s ease',
  };

  const sectionTitleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.70rem',
    fontWeight: 800,
    color: 'var(--adm-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '4px',
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--adm-bg-card)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: 'hidden',
    }}>
      {/* ── TOP HEADER (Status Ativo + Nome Editável + Código CLI + Collapse) ── */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid var(--adm-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--adm-bg-input)',
      }}>
        {/* Top Bar: Status Tag & Botão Fechar/Recolher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '6px',
            background: currentStage === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.12)',
            color: currentStage === 'completed' ? '#10B981' : '#06B6D4',
            border: `1px solid ${currentStage === 'completed' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(6, 182, 212, 0.3)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <Shield size={10} /> {currentStage === 'completed' ? 'Festa Realizada' : 'Cliente Ativo'}
          </span>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Recolher Ficha"
              style={{
                background: 'transparent',
                border: '1px solid var(--adm-border)',
                borderRadius: '6px',
                color: 'var(--adm-text-muted)',
                cursor: 'pointer',
                padding: '3px 6px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.70rem',
              }}
            >
              <ChevronLeft size={13} />
            </button>
          )}
        </div>

        {/* Nome do Cliente / Debutante (Editável Inline) */}
        <div>
          <input
            type="text"
            disabled={readOnly}
            value={client?.birthdayPersonName || client?.name || lead.name}
            onChange={(e) => {
              const newName = e.target.value;
              if (client) {
                updateClient(client.id, { birthdayPersonName: newName, name: newName });
              }
            }}
            placeholder="Nome da debutante..."
            title="Clique para editar o nome da debutante"
            style={{
              ...seamlessInputStyle,
              fontSize: '1.08rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              padding: '1px 2px',
            }}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent, #06B6D4)'; }}
            onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
          />

          {/* Código do Cliente logo abaixo do nome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#06B6D4',
              fontSize: '0.70rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}>
              <Tag size={11} color="#06B6D4" />
              <span>{client?.code || lead.code || 'CLI-000'}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copiar código do cliente"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedCode ? '#10B981' : '#06B6D4',
                  cursor: 'pointer',
                  padding: '1px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {copiedCode ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── ETAPA DO FUNIL DE PÓS-VENDA (DROPDOWN + PROGRESS BAR) ── */}
        <div style={{ position: 'relative', marginTop: '2px' }}>
          <div
            onClick={() => !readOnly && setIsStageDropdownOpen(!isStageDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: currentStageConfig.bg,
              border: `1px solid ${currentStageConfig.border}`,
              borderLeft: `3.5px solid ${currentStageConfig.color}`,
              borderRadius: '8px',
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: currentStageConfig.color,
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              {renderFunnelOrStageIcon(currentStageConfig.icon, 13, currentStageConfig.color)}
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentStageConfig.label}
              </span>
            </div>
            {!readOnly && (
              <ChevronDown 
                size={13} 
                style={{ 
                  transform: isStageDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.15s ease',
                  flexShrink: 0,
                  opacity: 0.8,
                }} 
              />
            )}
          </div>

          {/* Barra de Progresso Colorida dos 6 Estágios */}
          <div style={{ display: 'flex', gap: '3px', marginTop: '5px' }}>
            {POST_SALE_STAGES.map((stg, idx) => {
              const isFilled = idx <= currentStageIndex;
              return (
                <div
                  key={stg.id}
                  onClick={() => {
                    if (readOnly || !client) return;
                    updateClient(client.id, { stage: stg.id });
                    onStageChange(stg.id);
                  }}
                  title={stg.label}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: isFilled ? stg.color : 'var(--adm-border)',
                    cursor: readOnly ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Menu Dropdown de Seleção de Etapa */}
          {isStageDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 5px)',
              left: 0,
              right: 0,
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              zIndex: 70,
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              {POST_SALE_STAGES.map(stg => {
                const isSelected = currentStage === stg.id;
                return (
                  <div
                    key={stg.id}
                    onClick={() => {
                      if (client) {
                        updateClient(client.id, { stage: stg.id });
                      }
                      onStageChange(stg.id);
                      setIsStageDropdownOpen(false);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? stg.color : 'var(--adm-text-title)',
                      background: isSelected ? stg.bg : 'transparent',
                      transition: 'all 0.1s ease',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-hover)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {renderFunnelOrStageIcon(stg.icon, 12, stg.color)}
                      <span>{stg.label}</span>
                    </div>
                    {isSelected && <Check size={13} color={stg.color} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SUB-ABAS DA FICHA DO CLIENTE ── */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '2px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('ficha')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ficha' ? '2px solid var(--adm-accent, #06B6D4)' : '2px solid transparent',
              padding: '5px 8px',
              color: activeTab === 'ficha' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: activeTab === 'ficha' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileText size={12} />
            <span>Ficha</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('debutante')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'debutante' ? '2px solid var(--adm-accent, #06B6D4)' : '2px solid transparent',
              padding: '5px 8px',
              color: activeTab === 'debutante' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: activeTab === 'debutante' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={12} color="#EC4899" />
            <span>App da Debutante</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comercial')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'comercial' ? '2px solid var(--adm-accent, #06B6D4)' : '2px solid transparent',
              padding: '5px 8px',
              color: activeTab === 'comercial' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: activeTab === 'comercial' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Shield size={12} color="#06B6D4" />
            <span>Histórico Comercial</span>
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO DAS ABAS ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 1: 📋 FICHA COMPLETA DO CLIENTE                                 */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ficha' && (
          <>
            {/* ── SEÇÃO: ANIVERSARIANTE & EVENTO ── */}
            <div style={sectionTitleStyle}>
              <Heart size={12} color="#EC4899" />
              <span>Aniversariante & Evento</span>
            </div>

            <div style={cardStyle}>
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Aniversariante</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={client?.birthdayPersonName || client?.name || lead.name}
                    onChange={(e) => client && updateClient(client.id, { birthdayPersonName: e.target.value, name: e.target.value })}
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Fone Debutante</span>
                <div style={cardValueStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={maskPhoneInput(client?.birthdayPersonPhone || '')}
                      placeholder="(00) 00000-0000"
                      onChange={(e) => client && updateClient(client.id, { birthdayPersonPhone: e.target.value })}
                      style={seamlessInputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                    {client?.birthdayPersonPhone && (
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsApp(client.birthdayPersonPhone)}
                        title="Zap da Aniversariante"
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: '4px',
                          color: '#10B981',
                          padding: '2px 5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        <MessageSquare size={9} />
                        <span>Zap</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Idade</span>
                <div style={cardValueStyle}>
                  <input
                    type="number"
                    disabled={readOnly}
                    value={client?.birthdayPersonAge || lead.age || 15}
                    onChange={(e) => client && updateClient(client.id, { birthdayPersonAge: Number(e.target.value) || 15 })}
                    style={{ ...seamlessInputStyle, width: '45px' }}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Anos</span>
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Data da Festa</span>
                <div style={cardValueStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                    <input
                      type="date"
                      disabled={readOnly}
                      value={partyDateStr ? partyDateStr.split('T')[0] : ''}
                      onChange={(e) => client && updateClient(client.id, { eventDate: e.target.value, partyDate: e.target.value })}
                      style={{ ...seamlessInputStyle, fontWeight: 700, color: '#F59E0B' }}
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                    {countdownDays !== null && (
                      <span style={{
                        fontSize: '0.60rem',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: countdownDays <= 30 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: countdownDays <= 30 ? '#EF4444' : '#F59E0B',
                        border: `1px solid ${countdownDays <= 30 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {countdownDays < 0 ? 'Concluída' : `${countdownDays} dias`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Ano Previsto</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={client?.eventYear || (partyDateStr ? new Date(partyDateStr).getFullYear() : '')}
                    onChange={(e) => client && updateClient(client.id, { eventYear: e.target.value })}
                    placeholder="Ex: 2026"
                    style={{ ...seamlessInputStyle, width: '70px' }}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Convidados</span>
                <div style={cardValueStyle}>
                  <input
                    type="number"
                    disabled={readOnly}
                    value={client?.guestCount || (lead as any)?.guestCount || 150}
                    onChange={(e) => client && updateClient(client.id, { guestCount: Number(e.target.value) || 150 })}
                    style={{ ...seamlessInputStyle, width: '60px' }}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Pessoas</span>
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Unidade</span>
                <div style={cardValueStyle}>
                  <select
                    disabled={readOnly}
                    value={client?.venueId || lead.venueId || ''}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const targetVenue = venues.find(v => v.id === vId);
                      if (client) {
                        updateClient(client.id, { venueId: vId, venueName: targetVenue?.name });
                      }
                    }}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '5px',
                      padding: '3px 6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: 'var(--adm-text-title)',
                      width: '100%',
                      outline: 'none',
                    }}
                  >
                    <option value="">Selecione a Unidade...</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── SEÇÃO: GESTÃO DO PÓS-VENDA & VALORES ── */}
            <div style={sectionTitleStyle}>
              <Shield size={12} color="#06B6D4" />
              <span>Gestão de Sucesso & Valores</span>
            </div>

            <div style={cardStyle}>
              {/* Gestor de Sucesso Responsável */}
              <div style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>Gestor Sucesso</span>
                <div style={cardValueStyle}>
                  <div
                    onClick={() => !readOnly && setIsSuccessManagerDropdownOpen(!isSuccessManagerDropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      cursor: !readOnly ? 'pointer' : 'default',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      background: isSuccessManagerDropdownOpen ? 'var(--adm-bg-hover)' : 'transparent',
                    }}
                  >
                    {successManagerCollab ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid rgba(6, 182, 212, 0.35)',
                          color: '#06B6D4',
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}>
                          {successManagerCollab.avatarUrl ? (
                            <img src={successManagerCollab.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            successManagerCollab.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {successManagerCollab.name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                        Atribuir Gestor...
                      </span>
                    )}
                    {!readOnly && <ChevronDown size={11} color="var(--adm-text-muted)" />}
                  </div>

                  {/* Dropdown de Gestor de Sucesso */}
                  {isSuccessManagerDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '110px',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      zIndex: 80,
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}>
                      <div
                        onClick={() => {
                          if (client) {
                            updateClient(client.id, { assignedSuccessManagerId: undefined, assignedSuccessManagerName: undefined, assignedTo: undefined });
                          }
                          setIsSuccessManagerDropdownOpen(false);
                        }}
                        style={{
                          padding: '6px 8px',
                          cursor: 'pointer',
                          color: '#EF4444',
                          borderBottom: '1px solid var(--adm-border)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        Nenhum (Desatribuir)
                      </div>
                      {collaborators.map(collab => (
                        <div
                          key={collab.id}
                          onClick={() => {
                            if (client) {
                              updateClient(client.id, {
                                assignedSuccessManagerId: collab.id,
                                assignedSuccessManagerName: collab.name,
                                assignedTo: collab.name,
                              });
                            }
                            setIsSuccessManagerDropdownOpen(false);
                          }}
                          style={{
                            padding: '6px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.72rem',
                            fontWeight: collab.id === successManagerCollab?.id ? 800 : 500,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'rgba(6, 182, 212, 0.15)',
                            fontSize: '0.60rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#06B6D4',
                          }}>
                            {collab.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{collab.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Valor Base do Contrato */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Valor Base</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={baseValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseValue) : 'R$ 0,00'}
                    onChange={(e) => {
                      if (!client) return;
                      const num = parseFloat(e.target.value.replace(/[^0-9]/g, '')) / 100;
                      if (!isNaN(num)) {
                        updateClient(client.id, { baseContractValue: num, dealValue: num + totalUpsellValue });
                      }
                    }}
                    style={{ ...seamlessInputStyle, fontWeight: 700, color: '#10B981' }}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Valor de Entrada / Sinal */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Entrada / Sinal</span>
                <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={downPayment ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(downPayment) : 'R$ 0,00'}
                    onChange={(e) => {
                      if (!client) return;
                      const num = parseFloat(e.target.value.replace(/[^0-9]/g, '')) / 100;
                      if (!isNaN(num)) {
                        updateClient(client.id, { 
                          contractDownPayment: num, 
                          signalValue: num,
                          signalPaid: num > 0,
                          contractInstallmentsRemaining: Math.max(0, baseValue - num)
                        });
                      }
                    }}
                    style={{ ...seamlessInputStyle, fontWeight: 700, color: '#10B981' }}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                  {downPayment > 0 && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#10B981', padding: '1px 4px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)' }}>
                      Pago
                    </span>
                  )}
                </div>
              </div>

              {/* Restante Parcelado */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Restante Parc.</span>
                <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#F59E0B', fontWeight: 700 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentsRemaining)}
                  </span>
                  <select
                    disabled={readOnly}
                    value={installmentsCount}
                    onChange={(e) => client && updateClient(client.id, { contractInstallmentsCount: Number(e.target.value) || 10 })}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '4px',
                      padding: '1px 4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--adm-text-title)',
                      outline: 'none',
                    }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,12,14,15,18,20,24].map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                  {installmentsCount > 1 && installmentsRemaining > 0 && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap' }}>
                      ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelValue)}/mês)
                    </span>
                  )}
                </div>
              </div>

              {/* Possui Cartão de Crédito? */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Cartão Crédito?</span>
                <div style={{ ...cardValueStyle, display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => client && updateClient(client.id, { hasCreditCard: true })}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '5px',
                      border: `1px solid ${hasCreditCard ? '#10B981' : 'var(--adm-border)'}`,
                      background: hasCreditCard ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-input)',
                      color: hasCreditCard ? '#10B981' : 'var(--adm-text-muted)',
                      fontSize: '0.68rem',
                      fontWeight: hasCreditCard ? 800 : 500,
                      cursor: readOnly ? 'default' : 'pointer',
                    }}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => client && updateClient(client.id, { hasCreditCard: false })}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '5px',
                      border: `1px solid ${!hasCreditCard ? '#64748B' : 'var(--adm-border)'}`,
                      background: !hasCreditCard ? 'rgba(100, 116, 139, 0.15)' : 'var(--adm-bg-input)',
                      color: !hasCreditCard ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                      fontSize: '0.68rem',
                      fontWeight: !hasCreditCard ? 800 : 500,
                      cursor: readOnly ? 'default' : 'pointer',
                    }}
                  >
                    Não
                  </button>
                </div>
              </div>

              {/* Upsell Acumulado */}
              {totalUpsellValue > 0 && (
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Vendas Upsell</span>
                  <div style={cardValueStyle}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#8B5CF6' }}>
                      + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalUpsellValue)}
                    </span>
                  </div>
                </div>
              )}

              {/* Valor Total do Cliente */}
              <div style={{ ...cardRowStyle, borderTop: '1px dashed var(--adm-border)', paddingTop: '4px' }}>
                <span style={{ ...cardLabelStyle, fontWeight: 800, color: 'var(--adm-text-title)' }}>Total Cliente</span>
                <div style={cardValueStyle}>
                  <strong style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--adm-accent, #06B6D4)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalClientValue)}
                  </strong>
                </div>
              </div>
            </div>

            {/* ── SEÇÃO: DADOS DO PAGANTE / CONTRATANTE & DECISORES ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={sectionTitleStyle}>
                <Users size={12} color="var(--adm-accent)" />
                <span>Contratante / Pagante</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setIsAddingContact(!isAddingContact)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '5px',
                    border: '1px solid var(--adm-border)',
                    background: 'var(--adm-bg-input)',
                    color: 'var(--adm-accent, #06B6D4)',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <Plus size={10} />
                  <span>+ Outro Contato</span>
                </button>
              )}
            </div>

            <div style={cardStyle}>
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Nome Pagante</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={client?.payerName || (lead as any).payerName || ''}
                    placeholder="Nome do contratante..."
                    onChange={(e) => client && updateClient(client.id, { payerName: e.target.value })}
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>WhatsApp / Fone</span>
                <div style={cardValueStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={maskPhoneInput(client?.payerPhone || lead.phone || '')}
                      placeholder="(00) 00000-0000"
                      onChange={(e) => client && updateClient(client.id, { payerPhone: e.target.value })}
                      style={seamlessInputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                    {(client?.payerPhone || lead.phone) && (
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsApp(client?.payerPhone || lead.phone)}
                        title="Conversar no WhatsApp"
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: '4px',
                          color: '#10B981',
                          padding: '2px 5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        <MessageSquare size={9} />
                        <span>Zap</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>E-mail</span>
                <div style={cardValueStyle}>
                  <input
                    type="email"
                    disabled={readOnly}
                    value={client?.payerEmail || lead.email || ''}
                    placeholder="email@exemplo.com"
                    onChange={(e) => client && updateClient(client.id, { payerEmail: e.target.value })}
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>CPF</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={client?.payerCpf || ''}
                    placeholder="000.000.000-00"
                    onChange={(e) => client && updateClient(client.id, { payerCpf: e.target.value })}
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>
            </div>

            {/* Form Inline Adicionar Contato */}
            {isAddingContact && !readOnly && (
              <form onSubmit={handleAddSubContact} style={{ ...cardStyle, background: 'var(--adm-bg-input)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Novo Contato da Família</span>
                
                <input
                  type="text"
                  required
                  placeholder="Nome (ex: Pai Roberto)..."
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '5px',
                    padding: '4px 6px',
                    fontSize: '0.74rem',
                    color: 'var(--adm-text-title)',
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <select
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value as any)}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      fontSize: '0.72rem',
                      color: 'var(--adm-text-title)',
                    }}
                  >
                    <option value="mother">Mãe</option>
                    <option value="father">Pai</option>
                    <option value="guardian">Responsável Legal</option>
                    <option value="other">Tio / Outro</option>
                  </select>

                  <input
                    type="text"
                    required
                    placeholder="WhatsApp..."
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      fontSize: '0.74rem',
                      color: 'var(--adm-text-title)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--adm-text-title)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newContactIsDecisor}
                      onChange={(e) => setNewContactIsDecisor(e.target.checked)}
                      style={{ accentColor: '#10B981' }}
                    />
                    <span>⭐ É Decisor Financeiro (Fala sobre Upsells)</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingContact(false)}
                    style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--adm-border)', background: 'transparent', fontSize: '0.68rem', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: 'var(--adm-accent, #06B6D4)', color: '#FFF', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Salvar Contato
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Contatos Adicionais */}
            {((client?.contacts || lead.contacts || [])).filter(c => c.name !== client?.payerName).map((cnt, idx) => (
              <div
                key={cnt.id || idx}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                      {cnt.name}
                    </span>
                    <span style={{
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: cnt.isPrimaryDecisionMaker ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.12)',
                      color: cnt.isPrimaryDecisionMaker ? '#10B981' : '#06B6D4',
                    }}>
                      {cnt.isPrimaryDecisionMaker ? '⭐ Decisor' : (cnt.role === 'mother' ? 'Mãe' : cnt.role === 'father' ? 'Pai' : 'Contato')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                    {formatPhone(cnt.phone)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {cnt.phone && (
                    <button
                      type="button"
                      onClick={() => handleDirectWhatsApp(cnt.phone)}
                      title="Zap"
                      style={{
                        padding: '2px 5px',
                        borderRadius: '4px',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10B981',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <MessageSquare size={9} />
                      <span>Zap</span>
                    </button>
                  )}
                  {!readOnly && cnt.id && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSubContact(cnt.id)}
                      title="Excluir Contato"
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 2: ✨ APP DA DEBUTANTE (CENTRAL DE ACOMPANHAMENTO & JORNADA)      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'debutante' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Header do App da Debutante */}
            <div style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.10) 0%, rgba(212, 175, 55, 0.12) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#EC4899" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      App da Debutante
                    </h4>
                    <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                      /app/{debutanteSlug}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handleCopyDebutanteLink}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: copiedLink ? '#10B981' : '#D4AF37',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedLink ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedLink ? 'Copiado' : 'Copiar Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenDebutanteApp) {
                        onOpenDebutanteApp(debutanteSlug);
                      } else {
                        window.open(`/app/${debutanteSlug}`, '_blank');
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #EC4899 0%, #D4AF37 100%)',
                      color: '#FFF',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(236, 72, 153, 0.25)',
                    }}
                  >
                    <ExternalLink size={11} />
                    <span>Abrir App</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Se Não Houver Debutante Vinculada */}
            {!linkedDebutante && !client?.debutanteId ? (
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1.5px dashed var(--adm-border)',
                borderRadius: '12px',
                padding: '24px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Sparkles size={28} color="#EC4899" style={{ opacity: 0.5 }} />
                <h5 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Acesso ao App não vinculado
                </h5>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--adm-text-muted)', maxWidth: '280px' }}>
                  Crie uma conta para a debutante poder montar a lista de convidados e participar da Jornada de Presentes.
                </p>
                <button
                  type="button"
                  onClick={handleCreateDebutanteAccount}
                  style={{
                    marginTop: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #EC4899 0%, #D4AF37 100%)',
                    color: '#FFF',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ✨ Ativar App da Debutante Agora
                </button>
              </div>
            ) : (
              /* Métricas do App em Tempo Real */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {/* Card Convidados */}
                  <div style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#3B82F6', fontSize: '0.68rem', fontWeight: 700 }}>
                      <Users size={12} />
                      <span>Lista de Convidados</span>
                    </div>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                      {linkedDebutante?.guests?.length || 0}
                    </strong>
                    <span style={{ fontSize: '0.62rem', color: '#10B981', fontWeight: 700 }}>
                      {linkedDebutante?.guests?.filter(g => g.status === 'confirmed').length || 0} confirmados
                    </span>
                  </div>

                  {/* Card Indicações */}
                  <div style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8B5CF6', fontSize: '0.68rem', fontWeight: 700 }}>
                      <Sparkles size={12} />
                      <span>Amigas Indicadas</span>
                    </div>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                      {linkedDebutante?.validReferrals || linkedDebutante?.referrals?.length || 0}
                    </strong>
                    <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>
                      Jornada de Presentes
                    </span>
                  </div>
                </div>

                {/* Card Destaque: Indicações Vendidas */}
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.10)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10B981',
                    }}>
                      <Gift size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10B981' }}>
                        Indicações Fechadas / Vendas:
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        {linkedDebutante?.convertedReferralSales || linkedDebutante?.referrals?.filter(r => (r.status as string) === 'won' || (r.status as string) === 'contract_signed').length || 0} amigas fecharam contrato
                      </span>
                    </div>
                  </div>

                  {(linkedDebutante?.phone || client?.birthdayPersonPhone || client?.payerPhone) && (
                    <button
                      type="button"
                      onClick={() => handleDirectWhatsApp(
                        linkedDebutante?.phone || client?.birthdayPersonPhone || client?.payerPhone,
                        `Oi ${client?.birthdayPersonName || 'linda'}! 🎉 Passando para te dar uma notícia maravilhosa do seu App F5: uma das suas amigas indicadas fechou festa com a gente e você desbloqueou um novo benefício exclusivo!`
                      )}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#10B981',
                        color: '#FFF',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <MessageSquare size={10} />
                      <span>Avisar no Zap</span>
                    </button>
                  )}
                </div>

                {/* Prêmios e Bônus Desbloqueados */}
                <div style={{ ...cardStyle, marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#D4AF37' }}>
                    <Award size={13} color="#D4AF37" />
                    <span>Prêmios & Bônus Desbloqueados</span>
                  </div>

                  {linkedDebutante?.vipRewards && linkedDebutante.vipRewards.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {linkedDebutante.vipRewards.map((rew, rIdx) => (
                        <div key={rIdx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(212, 175, 55, 0.10)',
                          fontSize: '0.72rem',
                          color: 'var(--adm-text-title)',
                          fontWeight: 700,
                        }}>
                          <Star size={11} color="#D4AF37" fill="#D4AF37" />
                          <span>{rew.name || (rew as any).title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                      Jornada ativa. Conforme as amigas indicadas avançarem no comercial, os prêmios serão listados aqui.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 3: 🛡️ HISTÓRICO COMERCIAL (CARD KANBAN CRM + TIMELINE PRÉ-VENDA) */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'comercial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Card Idêntico ao Kanban do CRM Comercial */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1.5px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.08)',
            }}>
              {/* Header do Card */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {(commercialLead?.name || client?.name || 'L').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--adm-text-title)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {commercialLead?.name || client?.name}
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.66rem', color: '#6366F1', fontWeight: 700 }}>
                        {commercialLead?.code || client?.commercialLeadCode || 'LEAD-ORIGINAL'}
                      </span>
                      <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                        • {commercialLead?.venueName || client?.venueName}
                      </span>
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                }}>
                  GANHO NO CRM
                </span>
              </div>

              {/* Valor & Pacote */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
              }}>
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', display: 'block' }}>Valor Contratado:</span>
                  <strong style={{ fontSize: '0.90rem', fontWeight: 900, color: '#10B981' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseValue)}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', display: 'block' }}>Pacote:</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    {client?.packageSold || commercialLead?.packageSold || 'Pacote Completo'}
                  </span>
                </div>
              </div>

              {/* Closer e SDR Responsáveis */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                <span>Fechador (Closer): <strong style={{ color: 'var(--adm-text-title)' }}>{client?.commercialHistory?.closedBy || commercialLead?.closerName || commercialLead?.assignedTo || 'Comercial'}</strong></span>
                <span>Data: <strong style={{ color: 'var(--adm-text-title)' }}>{client?.contractDate ? new Date(client.contractDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fechado'}</strong></span>
              </div>
            </div>

            {/* Relatório do Closer (Passagem de Bastão) */}
            {(client?.commercialHistory?.closerReport || (commercialLead as any)?.closerReport) && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#6366F1' }}>
                  <FileText size={12} />
                  <span>Relatório do Closer (Passagem de Bastão)</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                  {client?.commercialHistory?.closerReport || (commercialLead as any)?.closerReport}
                </div>
              </div>
            )}

            {/* Timeline Comercial Pré-Venda */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                <Clock size={12} color="#6366F1" />
                <span>Histórico de Atividades do Pré-Venda</span>
              </div>

              {commercialLead?.activities && commercialLead.activities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {commercialLead.activities.map((act) => (
                    <div key={act.id} style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      fontSize: '0.72rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <strong style={{ color: 'var(--adm-accent, #6366F1)', fontSize: '0.70rem' }}>
                          {act.title || act.type}
                        </strong>
                        <span style={{ fontSize: '0.60rem', color: 'var(--adm-text-muted)' }}>
                          {new Date(act.timestamp).toLocaleDateString('pt-BR')} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {act.text && (
                        <div style={{ color: 'var(--adm-text-body)', lineHeight: 1.35 }}>
                          {act.text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                  Todas as notas e acordos fechados foram consolidados e integrados ao histórico do Pós-Venda.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
