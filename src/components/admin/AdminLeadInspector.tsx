import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, Trash2, Check,
  ChevronLeft, ChevronRight, Plus,
  Shield, PartyPopper, DollarSign, Users,
  CheckCircle2, Clock, X, Sparkles,
  Globe, ExternalLink, FileText, Copy, Tag,
  Building2, PhoneCall, Eye, MessageSquare,
  CheckSquare
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput, formatPhone } from '../../utils/phoneFormatter';
import { ICP_SITUATION_CONFIG } from '../../types/admin';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { 
  Lead, 
  CrmStage, 
  LeadContactRole,
  LeadContact,
  LeadEventType,
  LeadTemperature,
  LeadMqlLevel,
  AdminTask
} from '../../types/admin';

interface AdminLeadInspectorProps {
  lead: Lead;
  onWhatsApp?: (lead: Lead) => void;
  onStageChange: (stage: CrmStage) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  readOnly?: boolean;
  isPostSale?: boolean;
}

const STAGE_CONFIGS: Record<CrmStage, { label: string; color: string; bg: string; border: string }> = {
  new_lead:          { label: 'Novo Lead',                    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: '#60A5FA' },
  in_analysis:       { label: 'Em Análise / Contato',         color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  border: '#FBBF24' },
  meeting_scheduled: { label: 'Reunião / Degustação',         color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: '#A78BFA' },
  contract_signed:   { label: 'Ganho',                        color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: '#10B981' },
  lost:              { label: 'Perdido',                      color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: '#EF4444' },
};

const STAGE_LIST: CrmStage[] = ['new_lead', 'in_analysis', 'meeting_scheduled', 'contract_signed', 'lost'];

const CONTACT_ROLE_LABELS: Record<string, string> = {
  mae: 'Mãe',
  pai: 'Pai',
  mother: 'Mãe',
  father: 'Pai',
  responsavel: 'Responsável Legal',
  decision_maker: 'Responsável / Decisor',
  noivo: 'Noivo(a)',
  tio: 'Tio(a)',
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
  isPostSale = false,
}) => {
  const { 
    currentUser, 
    collaborators, 
    venues,
    funnels,
    sources,
    leads,
    mqlQuestions,
    updateLeadData, 
    validateLead, 
    invalidateLead,
    assignLeadSdr,
    assignLeadCloser,
    removeLeadSdr,
    removeLeadCloser,
    saveLeadMqlAnswers,
    tasks,
    toggleTaskStatus,
    updateTask,
    deleteTask,
  } = useAdminState();

  const [activeTab, setActiveTab] = useState<'principal' | 'origem' | 'mql' | 'comercial' | 'tasks'>('principal');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [isTempDropdownOpen, setIsTempDropdownOpen] = useState(false);
  const [isPackageDropdownOpen, setIsPackageDropdownOpen] = useState(false);
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  const [isEventTypeDropdownOpen, setIsEventTypeDropdownOpen] = useState(false);
  const [isHoveringRevoke, setIsHoveringRevoke] = useState(false);

  // Subcontacts state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState<LeadContactRole>('mother');

  // Tag state
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Dropdown states for commercial responsibles
  const [isSdrDropdownOpen, setIsSdrDropdownOpen] = useState(false);
  const [isCloserDropdownOpen, setIsCloserDropdownOpen] = useState(false);

  // Task detail modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<AdminTask | null>(null);

  const leadTasks = useMemo(() => {
    return tasks.filter(t => t.leadId === lead.id || t.customProperties?.leadId === lead.id || (t as any).commercialLeadId === lead.id);
  }, [tasks, lead.id]);

  const leadFunnel = useMemo(() => funnels.find(f => f.id === lead.funnelId) || funnels[0], [funnels, lead.funnelId]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    (leadFunnel?.predefinedTags || []).forEach(t => { if (t) set.add(t.trim()); });
    funnels.forEach(f => (f.predefinedTags || []).forEach(t => { if (t) set.add(t.trim()); }));
    (leads || []).forEach(l => (l.tags || []).forEach(t => { if (t) set.add(t.trim()); }));
    if (set.size === 0) {
      ['VIP', 'Prioridade Alta', 'Degustação Pendente', 'Orçamento Enviado', 'Visita Agendada'].forEach(t => set.add(t));
    }
    const currentTags = (lead.tags || []).map(t => t.toLowerCase());
    return Array.from(set).filter(t => !currentTags.includes(t.toLowerCase()) && t.toLowerCase() !== 'indicação');
  }, [leadFunnel, funnels, leads, lead.tags]);

  const availablePackageOptions = useMemo(() => {
    const opts = leadFunnel?.packageOptions || [];
    return [...opts, 'Personalizado...'];
  }, [leadFunnel]);

  const availablePaymentOptions = useMemo(() => {
    const opts = leadFunnel?.paymentOptions || [];
    return [...opts, 'Personalizado...'];
  }, [leadFunnel]);

  const closeAllDropdowns = () => {
    setIsTempDropdownOpen(false);
    setIsPackageDropdownOpen(false);
    setIsPaymentDropdownOpen(false);
    setIsEventTypeDropdownOpen(false);
    setIsStageDropdownOpen(false);
    setIsSdrDropdownOpen(false);
    setIsCloserDropdownOpen(false);
    setIsTagDropdownOpen(false);
    setShowCustomTagInput(false);
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-inspector-dropdown]')) {
        closeAllDropdowns();
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Currency mask helpers
  const formatCurrency = (val: number | string): string => {
    if (!val) return '';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num) || num === 0) return '';
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const maskCurrencyInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10);
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  // Local draft states to prevent typing lag and save on blur
  const [draftName, setDraftName] = useState(lead.name || '');
  const [draftPhone, setDraftPhone] = useState(lead.phone || '');
  const [draftEmail, setDraftEmail] = useState(lead.email || '');
  const [draftNeighborhood, setDraftNeighborhood] = useState(lead.neighborhood || '');
  const [draftAddress, setDraftAddress] = useState(lead.address || '');
  const [draftEstimatedGuests, setDraftEstimatedGuests] = useState<string>(lead.estimatedGuests ? String(lead.estimatedGuests) : '');
  const [draftDesiredPeriod, setDraftDesiredPeriod] = useState(lead.desiredPeriod || '');
  const [draftDealValue, setDraftDealValue] = useState<string>(() => {
    const val = lead.dealValue || lead.estimatedBudget || 0;
    return val > 0 ? formatCurrency(val) : '';
  });
  const [draftPackageSold, setDraftPackageSold] = useState(lead.packageSold || lead.interestService || '');
  const [draftPaymentMethod, setDraftPaymentMethod] = useState(lead.paymentMethod || '');

  React.useEffect(() => {
    setDraftName(lead.name || '');
    setDraftPhone(lead.phone || '');
    setDraftEmail(lead.email || '');
    setDraftNeighborhood(lead.neighborhood || '');
    setDraftAddress(lead.address || '');
    setDraftEstimatedGuests(lead.estimatedGuests ? String(lead.estimatedGuests) : '');
    setDraftDesiredPeriod(lead.desiredPeriod || '');
    const val = lead.dealValue || lead.estimatedBudget || 0;
    setDraftDealValue(val > 0 ? formatCurrency(val) : '');
    setDraftPackageSold(lead.packageSold || lead.interestService || '');
    setDraftPaymentMethod(lead.paymentMethod || '');
  }, [lead.id, lead.name, lead.phone, lead.email, lead.neighborhood, lead.address, lead.estimatedGuests, lead.desiredPeriod, lead.dealValue, lead.estimatedBudget, lead.packageSold, lead.interestService, lead.paymentMethod]);

  const leadVenue = venues.find(v => v.id === lead.venueId);
  const leadSource = lead.sourceId ? sources.find(s => s.id === lead.sourceId) : undefined;
  const sdrCollab = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : undefined;

  const isManagerOrMaster = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const canAccessPostSale = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'dev' || currentUser?.role === 'pos_venda' || (currentUser as any)?.sectors?.includes('pos_venda');
  
  const commercialCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      if (!c.active) return false;
      if (c.role === 'master' || c.role === 'dev') return true;
      if (c.sectors && c.sectors.length > 0) {
        return c.sectors.includes('comercial');
      }
      return ['comercial', 'sdr', 'closer', 'crm'].includes(c.role || '');
    });
  }, [collaborators]);

  const sdrList = commercialCollaborators;
  const closerList = commercialCollaborators;

  const isReferralLead = lead.source === 'indicacao' || Boolean(lead.debutanteName || lead.debutanteId);

  const originTag = useMemo(() => {
    if (isReferralLead) return 'Indicação';
    if (lead.subSource) return `WhatsApp / ${lead.subSource}`;
    if (lead.source === 'whatsapp' || lead.sourceName?.toLowerCase().includes('whatsapp')) return 'WhatsApp';
    return lead.sourceName || lead.source || 'Entrada Direta';
  }, [isReferralLead, lead.subSource, lead.source, lead.sourceName]);

  // MQL Questions for this funnel / venue (supporting funnel-based, venue-based and full fallback)
  const venueMqlQuestions = useMemo(() => {
    // 1. If lead has a funnelId, check for questions directly linked to this funnel
    if (lead.funnelId) {
      const funnelMatched = mqlQuestions.filter(q =>
        (q.funnelIds && q.funnelIds.includes(lead.funnelId!)) ||
        q.funnelId === lead.funnelId
      );
      if (funnelMatched.length > 0) return funnelMatched;
    }

    // 2. Fallback to venue-based matching
    const venueMatched = mqlQuestions.filter(q => 
      (q.venueIds && q.venueIds.length > 0 && q.venueIds.includes(lead.venueId)) ||
      q.venueId === lead.venueId || 
      q.venueId === 'all'
    );
    if (venueMatched.length > 0) return venueMatched;

    // 3. Global fallback to all configured MQL questions
    return mqlQuestions;
  }, [mqlQuestions, lead.funnelId, lead.venueId]);

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

  // Allow full editing of leads without stage lock restriction
  const effectiveReadOnly = Boolean(readOnly);

  const handleUpdate = (updates: Partial<Lead>) => {
    if (effectiveReadOnly) return;
    updateLeadData(lead.id, updates);
  };

  const handleDirectWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return;
    const fullNum = clean.startsWith('55') ? clean : `55${clean}`;
    window.open(`https://wa.me/${fullNum}`, '_blank');
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

  // Designation of Decisor does NOT overwrite the Aniversariante's name or phone!
  const handleSetPrimaryDecisor = (contact: LeadContact) => {
    const updatedContacts = (lead.contacts || []).map(c => ({
      ...c,
      isPrimaryDecisionMaker: c.id === contact.id,
    }));

    handleUpdate({
      contacts: updatedContacts,
      primaryContactRole: contact.role,
    });
  };

  const handleSetLeadAsDecisor = () => {
    const updatedContacts = (lead.contacts || []).map(c => ({
      ...c,
      isPrimaryDecisionMaker: false,
    }));

    handleUpdate({
      contacts: updatedContacts,
      primaryContactRole: 'aniversariante',
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
    setIsTagDropdownOpen(false);
    setShowCustomTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleUpdate({ tags: (lead.tags || []).filter(t => t !== tagToRemove) });
  };

  const renderCustomFieldsForSection = (section: 'commercial' | 'contact' | 'event') => {
    if (!leadFunnel?.customFields || leadFunnel.customFields.length === 0) return null;

    const sectionFields = leadFunnel.customFields.filter(f => {
      if (section === 'commercial') return f.section === 'commercial' || (!f.section && f.section !== 'contact' && f.section !== 'event');
      return f.section === section;
    });

    if (sectionFields.length === 0) return null;

    return sectionFields.map(field => {
      const currentValue = lead.customFieldValues?.[field.id] ?? '';

      return (
        <div key={field.id} style={cardRowStyle}>
          <span style={cardLabelStyle}>{field.label}</span>
          <div style={cardValueStyle}>
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
                      <CheckCircle2 size={13} color="#10B981" /> Sim
                    </>
                  ) : (
                    <>
                      <Clock size={13} color="var(--adm-text-muted)" /> Não
                    </>
                  )}
                </span>
              </label>
            ) : field.type === 'date' ? (
              <input
                type="date"
                value={currentValue}
                onClick={(e) => {
                  try { (e.target as any).showPicker?.(); } catch {}
                }}
                onChange={(e) => {
                  const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: e.target.value };
                  handleUpdate({ customFieldValues: updatedCustom });
                }}
                style={seamlessInputStyle}
                onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
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
                style={seamlessInputStyle}
                onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
              />
            ) : field.type === 'select' ? (
              <select
                value={currentValue}
                onChange={(e) => {
                  const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: e.target.value };
                  handleUpdate({ customFieldValues: updatedCustom });
                }}
                style={cardSelectStyle}
              >
                <option value="">Selecione...</option>
                {(field.options || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'multi_select' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                {(field.options || []).map(opt => {
                  const selectedArr = Array.isArray(currentValue) ? currentValue : (currentValue ? String(currentValue).split(',').map(s => s.trim()) : []);
                  const isSelected = selectedArr.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const nextArr = isSelected ? selectedArr.filter(s => s !== opt) : [...selectedArr, opt];
                        const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: nextArr };
                        handleUpdate({ customFieldValues: updatedCustom });
                      }}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: isSelected ? 800 : 500,
                        background: isSelected ? 'rgba(20, 169, 215, 0.15)' : 'var(--adm-bg-input)',
                        color: isSelected ? '#14A9D7' : 'var(--adm-text-muted)',
                        border: isSelected ? '1px solid rgba(20, 169, 215, 0.4)' : '1px solid var(--adm-border)',
                        cursor: 'pointer',
                      }}
                    >
                      {opt} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                placeholder={field.placeholder || 'Preencha...'}
                value={currentValue}
                onChange={(e) => {
                  const updatedCustom = { ...(lead.customFieldValues || {}), [field.id]: e.target.value };
                  handleUpdate({ customFieldValues: updatedCustom });
                }}
                style={seamlessInputStyle}
                onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
              />
            )}
          </div>
        </div>
      );
    });
  };

  const currentStageConfig = STAGE_CONFIGS[lead.stage] || STAGE_CONFIGS.new_lead;
  const currentStageIndex = STAGE_LIST.indexOf(lead.stage);

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
    gap: '6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  };

  const cardRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '0.78rem',
    minHeight: '28px',
    gap: '8px',
    paddingTop: '3px',
    paddingBottom: '3px',
  };

  const cardLabelStyle: React.CSSProperties = {
    width: '100px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.76rem',
    fontWeight: 600,
    paddingTop: '3px',
  };

  const cardValueStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
    wordBreak: 'break-word',
    whiteSpace: 'normal',
    lineHeight: '1.35',
  };

  const seamlessInputStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid transparent',
    borderRadius: '0',
    padding: '2px 0',
    color: 'var(--adm-text-title)',
    fontSize: '0.82rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'border-color 0.15s ease',
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
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(20, 169, 215, 0.25)',
        background: 'linear-gradient(180deg, #0B111A 0%, #0F1724 100%)',
        color: '#FFFFFF',
        flexShrink: 0,
      }}>
        {/* Title row + Collapse Button (< / >) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={lead.name}
              disabled={effectiveReadOnly}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              style={{
                ...inlineInputStyle,
                fontSize: '1.05rem',
                fontWeight: 900,
                padding: '2px 4px',
                color: '#FFFFFF',
                cursor: effectiveReadOnly ? 'default' : 'text',
              }}
              onFocus={(e) => { if (!effectiveReadOnly) { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(20, 169, 215, 0.5)'; } }}
              onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
              title={effectiveReadOnly ? 'Nome bloqueado para edição' : 'Clique para editar o nome do lead'}
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
                  borderRadius: '6px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Tag Oficial de Código Único (LEAD-XXXXXX ou CLI-XXXXXX) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: isPostSale ? 'rgba(6, 182, 212, 0.15)' : 'rgba(20, 169, 215, 0.12)',
            border: `1px solid ${isPostSale ? 'rgba(6, 182, 212, 0.4)' : 'rgba(20, 169, 215, 0.35)'}`,
            borderRadius: '6px',
            padding: '2px 6px',
          }}>
            <Tag size={11} color={isPostSale ? '#06B6D4' : '#14A9D7'} />
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>
              {isPostSale ? 'CLIENTE:' : 'CÓDIGO:'}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: isPostSale ? '#06B6D4' : '#14A9D7', letterSpacing: '0.8px', fontFamily: "'Poppins', monospace" }}>
              {isPostSale ? (lead.code ? (lead.code.startsWith('LEAD-') ? `CLI-${lead.code.replace('LEAD-', '')}` : lead.code) : 'CLI-NOVO') : (lead.code || 'LEAD-NOVO')}
            </span>
            <button
              type="button"
              onClick={() => {
                const codeToCopy = isPostSale ? (lead.code ? (lead.code.startsWith('LEAD-') ? `CLI-${lead.code.replace('LEAD-', '')}` : lead.code) : 'CLI-NOVO') : (lead.code || 'LEAD-NOVO');
                navigator.clipboard.writeText(codeToCopy);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              title="Copiar código"
              style={{
                background: 'transparent',
                border: 'none',
                color: copiedCode ? '#10B981' : (isPostSale ? '#06B6D4' : '#14A9D7'),
                cursor: 'pointer',
                padding: '1px 2px',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '2px',
              }}
            >
              {copiedCode ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
          {copiedCode && (
            <span style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 700 }}>
              Copiado!
            </span>
          )}
        </div>

        {/* Venue & Event info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.74rem',
            color: '#A0988A',
            fontWeight: 600,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Building2 size={13} color="var(--adm-accent)" /> {leadVenue?.name || 'Bonomo Festas'}
            </span>
            {isPostSale && (lead.eventDate || lead.partyDate) && (
              <>
                <span>•</span>
                <strong style={{ color: '#06B6D4', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <PartyPopper size={12} color="#06B6D4" /> {new Date((lead.eventDate || lead.partyDate) + 'T12:00:00').toLocaleDateString('pt-BR')}
                </strong>
              </>
            )}
          </span>

          {/* Badge de Pós-Venda (apenas se for pós-venda) */}
          {isPostSale && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06B6D4',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <Shield size={11} /> Cliente Ativo
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
              background: '#0F1724',
              border: '1px solid rgba(20, 169, 215, 0.4)',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 60,
              overflow: 'hidden',
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          marginTop: '6px',
          paddingBottom: '2px',
          position: 'relative',
        }}>
          {/* Tag de Origem Fixa (Sempre a 1ª Tag, Não Removível, Sem # e Sem Ícone) */}
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              background: (lead.source === 'indicacao' || Boolean(lead.debutanteName && lead.debutanteName !== 'Indicação Externa' && lead.debutanteName !== 'WhatsApp Direto'))
                ? 'rgba(212, 175, 55, 0.18)' 
                : 'rgba(16, 185, 129, 0.18)',
              color: (lead.source === 'indicacao' || Boolean(lead.debutanteName && lead.debutanteName !== 'Indicação Externa' && lead.debutanteName !== 'WhatsApp Direto'))
                ? '#D4AF37' 
                : '#10B981',
              border: `1px solid ${(lead.source === 'indicacao' || Boolean(lead.debutanteName && lead.debutanteName !== 'Indicação Externa' && lead.debutanteName !== 'WhatsApp Direto')) ? 'rgba(212, 175, 55, 0.45)' : 'rgba(16, 185, 129, 0.45)'}`,
              padding: '2px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
            title="Origem do lead (fixa)"
          >
            {(lead.source === 'indicacao' || Boolean(lead.debutanteName && lead.debutanteName !== 'Indicação Externa' && lead.debutanteName !== 'WhatsApp Direto'))
              ? 'Indicação' 
              : (originTag || 'Origem')}
          </span>

          {(lead.tags || []).filter(t => t.toLowerCase() !== 'indicação' && t.toLowerCase() !== originTag.toLowerCase()).map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                background: 'rgba(20, 169, 215, 0.15)',
                color: '#14A9D7',
                border: '1px solid rgba(20, 169, 215, 0.35)',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              {tag}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  style={{ background: 'transparent', border: 'none', color: '#14A9D7', cursor: 'pointer', padding: 0, display: 'flex' }}
                  title={`Remover tag ${tag}`}
                >
                  <X size={10} />
                </button>
              )}
            </span>
          ))}

          {/* Botão + Tag com Popover Estilizado tipo Dropdown */}
          {!readOnly && (
            <div data-inspector-dropdown style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  const next = !isTagDropdownOpen;
                  closeAllDropdowns();
                  setIsTagDropdownOpen(next);
                  setShowCustomTagInput(false);
                }}
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: isTagDropdownOpen ? 'rgba(20, 169, 215, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  color: isTagDropdownOpen ? '#14A9D7' : '#A0988A',
                  border: `1px dashed ${isTagDropdownOpen ? '#14A9D7' : 'rgba(255, 255, 255, 0.2)'}`,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Plus size={10} /> Tag
              </button>

              {isTagDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '6px',
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '6px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  zIndex: 100,
                  minWidth: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}>
                  {availableTags.map(tag => (
                    <div
                      key={tag}
                      onClick={() => {
                        handleUpdate({ tags: [...(lead.tags || []), tag] });
                        setIsTagDropdownOpen(false);
                      }}
                      style={{
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: 'var(--adm-text-title)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>{tag}</span>
                      <Plus size={11} color="var(--adm-text-muted)" />
                    </div>
                  ))}

                  {/* Opção Personalizada / Digitação */}
                  {!showCustomTagInput ? (
                    <div
                      onClick={() => setShowCustomTagInput(true)}
                      style={{
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--adm-accent)',
                        borderRadius: '6px',
                        borderTop: availableTags.length > 0 ? '1px solid var(--adm-border)' : 'none',
                        marginTop: availableTags.length > 0 ? '2px' : 0,
                        paddingTop: availableTags.length > 0 ? '6px' : '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Plus size={12} />
                      <span>Personalizado...</span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      padding: '4px 0 2px',
                      borderTop: availableTags.length > 0 ? '1px solid var(--adm-border)' : 'none',
                      marginTop: '2px',
                    }}>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nome da tag..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                            setIsTagDropdownOpen(false);
                            setShowCustomTagInput(false);
                          }
                          if (e.key === 'Escape') {
                            setShowCustomTagInput(false);
                          }
                        }}
                        style={{
                          flex: 1,
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          color: 'var(--adm-text-title)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleAddTag();
                          setIsTagDropdownOpen(false);
                          setShowCustomTagInput(false);
                        }}
                        style={{
                          background: 'var(--adm-accent)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Tabs */}
        {isPostSale ? (
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('principal')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'principal' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '5px 10px',
                color: activeTab === 'principal' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.76rem',
                fontWeight: activeTab === 'principal' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={13} color={activeTab === 'principal' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Ficha do Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comercial')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'comercial' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '5px 10px',
                color: activeTab === 'comercial' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.76rem',
                fontWeight: activeTab === 'comercial' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Shield size={13} color={activeTab === 'comercial' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Comercial (Lead)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'tasks' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '5px 10px',
                color: activeTab === 'tasks' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.76rem',
                fontWeight: activeTab === 'tasks' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckSquare size={13} color={activeTab === 'tasks' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Tarefas</span>
              {leadTasks.length > 0 && (
                <span style={{
                  fontSize: '0.62rem',
                  background: 'rgba(20,169,215,0.2)',
                  color: '#14A9D7',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontWeight: 800,
                }}>
                  {leadTasks.length}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('principal')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'principal' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '5px 10px',
                color: activeTab === 'principal' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.76rem',
                fontWeight: activeTab === 'principal' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={13} color={activeTab === 'principal' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Principal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('origem')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'origem' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '5px 10px',
                color: activeTab === 'origem' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.76rem',
                fontWeight: activeTab === 'origem' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Globe size={13} color={activeTab === 'origem' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Origem</span>
            </button>

            {venueMqlQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('mql')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'mql' ? '2px solid #14A9D7' : '2px solid transparent',
                  padding: '5px 10px',
                  color: activeTab === 'mql' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                  fontSize: '0.76rem',
                  fontWeight: activeTab === 'mql' ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <IcpTargetUserIcon size={14} color={activeTab === 'mql' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
                <span>ICP</span>
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
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'tasks' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '5px 10px',
                color: activeTab === 'tasks' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.76rem',
                fontWeight: activeTab === 'tasks' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckSquare size={13} color={activeTab === 'tasks' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Tarefas</span>
              {leadTasks.length > 0 && (
                <span style={{
                  fontSize: '0.62rem',
                  background: 'rgba(20,169,215,0.2)',
                  color: '#14A9D7',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontWeight: 800,
                }}>
                  {leadTasks.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── 2. CONTEÚDO DA ABA SELECIONADA ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 1: 📋 PRINCIPAL                                                  */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'principal' && (
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* ── SEÇÃO 1: 🛡️ DADOS COMERCIAIS & RESPONSÁVEIS ── */}
            <div style={sectionTitleStyle}>
              <DollarSign size={13} color="var(--adm-accent)" />
              <span>Dados Comerciais</span>
            </div>

            <div style={cardStyle}>
              {/* Usuário Responsável / SDR (Custom Dropdown com Foto, Nome Completo e Estilo Unificado) */}
              <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>SDR</span>
                <div style={cardValueStyle}>
                  <div
                    onClick={() => {
                      if (!readOnly && (isManagerOrMaster || !lead.sdrId)) {
                        const next = !isSdrDropdownOpen;
                        closeAllDropdowns();
                        setIsSdrDropdownOpen(next);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      cursor: !readOnly ? 'pointer' : 'default',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      background: isSdrDropdownOpen ? 'var(--adm-bg-hover)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!readOnly) e.currentTarget.style.background = 'var(--adm-bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSdrDropdownOpen ? 'var(--adm-bg-hover)' : 'transparent'; }}
                  >
                    {lead.sdrId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(20, 169, 215, 0.15)',
                          border: '1px solid rgba(20, 169, 215, 0.35)',
                          color: 'var(--adm-accent)',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}>
                          {sdrCollab?.avatarUrl ? (
                            <img src={sdrCollab.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            (sdrCollab?.name || lead.assignedTo || 'S').charAt(0).toUpperCase()
                          )}
                        </div>
                        <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sdrCollab?.name || lead.assignedTo || 'SDR'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                        Atribuir SDR...
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {lead.sdrId && !readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLeadSdr(lead.id);
                          }}
                          title="Desatribuir SDR"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--adm-text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.6,
                            transition: 'opacity 0.15s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                        >
                          <X size={12} />
                        </button>
                      )}
                      {!readOnly && <ChevronDown size={12} color="var(--adm-text-muted)" />}
                    </div>
                  </div>

                  {/* Popover Custom Dropdown SDR */}
                  {isSdrDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '105px',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      zIndex: 60,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}>
                      {/* Opção Desatribuir */}
                      <div
                        onClick={() => {
                          removeLeadSdr(lead.id);
                          setIsSdrDropdownOpen(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#EF4444',
                          borderBottom: '1px solid var(--adm-border)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <X size={13} color="#EF4444" />
                        <span>Desatribuir (Nenhum)</span>
                      </div>

                      {sdrList.map((collab) => {
                        const isSelected = collab.id === lead.sdrId;
                        return (
                          <div
                            key={collab.id}
                            onClick={() => {
                              assignLeadSdr(lead.id, collab.id);
                              setIsSdrDropdownOpen(false);
                            }}
                            style={{
                              padding: '7px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: isSelected ? 'var(--adm-bg-hover)' : 'transparent',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'var(--adm-bg-hover)' : 'transparent'}
                          >
                            <div style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: 'rgba(20, 169, 215, 0.15)',
                              border: '1px solid rgba(20, 169, 215, 0.35)',
                              color: 'var(--adm-accent)',
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}>
                              {collab.avatarUrl ? (
                                <img src={collab.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                collab.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: isSelected ? 800 : 600, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {collab.name}
                              </div>
                            </div>
                            {isSelected && <Check size={12} color="var(--adm-accent)" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Closer / Vendedor (Custom Dropdown com Foto, Nome Completo e Estilo Unificado) */}
              {!isPostSale && (
                <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                  <span style={cardLabelStyle}>Closer</span>
                  <div style={cardValueStyle}>
                    <div
                      onClick={() => {
                        if (!readOnly) {
                          const next = !isCloserDropdownOpen;
                          closeAllDropdowns();
                          setIsCloserDropdownOpen(next);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        cursor: !readOnly ? 'pointer' : 'default',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        background: isCloserDropdownOpen ? 'var(--adm-bg-hover)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!readOnly) e.currentTarget.style.background = 'var(--adm-bg-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isCloserDropdownOpen ? 'var(--adm-bg-hover)' : 'transparent'; }}
                    >
                      {lead.closerId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'rgba(249, 115, 22, 0.15)',
                            border: '1px solid rgba(249, 115, 22, 0.35)',
                            color: '#F97316',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}>
                            {closerList.find(c => c.id === lead.closerId)?.avatarUrl ? (
                              <img src={closerList.find(c => c.id === lead.closerId)!.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (closerList.find(c => c.id === lead.closerId)?.name || lead.closerName || 'C').charAt(0).toUpperCase()
                            )}
                          </div>
                          <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {closerList.find(c => c.id === lead.closerId)?.name || lead.closerName || 'Closer'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                          Atribuir Closer...
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {lead.closerId && !readOnly && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLeadCloser(lead.id);
                            }}
                            title="Desatribuir Closer"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--adm-text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.6,
                              transition: 'opacity 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                          >
                            <X size={12} />
                          </button>
                        )}
                        {!readOnly && <ChevronDown size={12} color="var(--adm-text-muted)" />}
                      </div>
                    </div>

                    {/* Popover Custom Dropdown Closer */}
                    {isCloserDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '105px',
                        right: 0,
                        marginTop: '4px',
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        zIndex: 60,
                        maxHeight: '200px',
                        overflowY: 'auto',
                      }}>
                        {/* Opção Desatribuir */}
                        <div
                          onClick={() => {
                            removeLeadCloser(lead.id);
                            setIsCloserDropdownOpen(false);
                          }}
                          style={{
                            padding: '7px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#EF4444',
                            borderBottom: '1px solid var(--adm-border)',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <X size={13} color="#EF4444" />
                          <span>Desatribuir (Nenhum)</span>
                        </div>

                        {closerList.map((collab) => {
                          const isSelected = collab.id === lead.closerId;
                          return (
                            <div
                              key={collab.id}
                              onClick={() => {
                                assignLeadCloser(lead.id, collab.id);
                                setIsCloserDropdownOpen(false);
                              }}
                              style={{
                                padding: '7px 10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: isSelected ? 'var(--adm-bg-hover)' : 'transparent',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'var(--adm-bg-hover)' : 'transparent'}
                            >
                              <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'rgba(249, 115, 22, 0.15)',
                                border: '1px solid rgba(249, 115, 22, 0.35)',
                                color: '#F97316',
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                overflow: 'hidden',
                              }}>
                                {collab.avatarUrl ? (
                                  <img src={collab.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  collab.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: isSelected ? 800 : 600, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {collab.name}
                                </div>
                              </div>
                              {isSelected && <Check size={12} color="var(--adm-accent)" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Venda / Orçamento (Formatação Monetária com Salvamento onBlur & Sem Quebra de Linha do R$) */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Venda</span>
                <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '4px' }}>
                  <span style={{ color: '#10B981', fontWeight: 900, fontSize: '0.82rem', flexShrink: 0 }}>R$</span>
                  <input
                    type="text"
                    placeholder="1.200"
                    value={draftDealValue}
                    onChange={(e) => {
                      setDraftDealValue(maskCurrencyInput(e.target.value));
                    }}
                    onBlur={() => {
                      const cleaned = draftDealValue.replace(/\./g, '').replace(',', '.');
                      const num = parseFloat(cleaned) || 0;
                      handleUpdate({ dealValue: num, estimatedBudget: num });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    style={{
                      ...seamlessInputStyle,
                      color: '#10B981',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      width: '100%',
                    }}
                    onFocus={(e) => { e.target.style.borderBottomColor = '#10B981'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Pacote (Custom Dropdown com Opções Pré-configuradas do Funil + Digitação) */}
              <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>Pacote</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    placeholder="Selecione ou digite o pacote..."
                    value={draftPackageSold}
                    onChange={(e) => setDraftPackageSold(e.target.value)}
                    onBlur={() => {
                      if (draftPackageSold !== (lead.packageSold || lead.interestService || '')) {
                        handleUpdate({ packageSold: draftPackageSold.trim(), interestService: draftPackageSold.trim() });
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    style={{
                      ...seamlessInputStyle,
                      fontWeight: 600,
                    }}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!readOnly) {
                        const next = !isPackageDropdownOpen;
                        closeAllDropdowns();
                        setIsPackageDropdownOpen(next);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronDown size={12} />
                  </button>

                  {isPackageDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '120px',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      zIndex: 60,
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}>
                      {availablePackageOptions.map((pkg) => (
                        <div
                          key={pkg}
                          onClick={() => {
                            if (pkg !== 'Personalizado...') {
                              setDraftPackageSold(pkg);
                              handleUpdate({ packageSold: pkg, interestService: pkg });
                            }
                            setIsPackageDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: draftPackageSold === pkg ? 800 : 500,
                            color: 'var(--adm-text-title)',
                            background: draftPackageSold === pkg ? 'var(--adm-bg-hover)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = draftPackageSold === pkg ? 'var(--adm-bg-hover)' : 'transparent'}
                        >
                          <span>{pkg}</span>
                          {draftPackageSold === pkg && <Check size={12} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pagamento (Custom Dropdown com Opções Pré-configuradas do Funil + Digitação) */}
              <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>Pagamento</span>
                <div style={cardValueStyle}>
                  <textarea
                    rows={2}
                    placeholder="Selecione ou digite a forma..."
                    value={draftPaymentMethod}
                    onChange={(e) => setDraftPaymentMethod(e.target.value)}
                    onBlur={() => {
                      if (draftPaymentMethod !== (lead.paymentMethod || '')) {
                        handleUpdate({ paymentMethod: draftPaymentMethod.trim() });
                      }
                    }}
                    style={{
                      ...seamlessInputStyle,
                      fontWeight: 600,
                      resize: 'none',
                      height: 'auto',
                      minHeight: '34px',
                      lineHeight: '1.25',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!readOnly) {
                        const next = !isPaymentDropdownOpen;
                        closeAllDropdowns();
                        setIsPaymentDropdownOpen(next);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronDown size={12} />
                  </button>

                  {isPaymentDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '120px',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      zIndex: 60,
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}>
                      {availablePaymentOptions.map((pay) => (
                        <div
                          key={pay}
                          onClick={() => {
                            if (pay !== 'Personalizado...') {
                              setDraftPaymentMethod(pay);
                              handleUpdate({ paymentMethod: pay });
                            }
                            setIsPaymentDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: draftPaymentMethod === pay ? 800 : 500,
                            color: 'var(--adm-text-title)',
                            background: draftPaymentMethod === pay ? 'var(--adm-bg-hover)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = draftPaymentMethod === pay ? 'var(--adm-bg-hover)' : 'transparent'}
                        >
                          <span>{pay}</span>
                          {draftPaymentMethod === pay && <Check size={12} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Temperatura (Custom Dropdown com Bolinhas de Status e Sem Emojis) */}
              {!isPostSale && (
                <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                  <span style={cardLabelStyle}>Temperatura</span>
                  <div style={cardValueStyle}>
                    <div
                      onClick={() => {
                        if (!readOnly) {
                          const next = !isTempDropdownOpen;
                          closeAllDropdowns();
                          setIsTempDropdownOpen(next);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: readOnly ? 'default' : 'pointer',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!readOnly) e.currentTarget.style.background = 'var(--adm-bg-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: (lead.temperature === 'hot') ? '#EF4444' : (lead.temperature === 'cold') ? '#3B82F6' : '#F59E0B',
                      }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        {lead.temperature === 'hot' ? 'Quente' : lead.temperature === 'cold' ? 'Frio' : 'Morno'}
                      </span>
                      {!readOnly && <ChevronDown size={12} color="var(--adm-text-muted)" />}
                    </div>

                    {/* Custom Popover */}
                    {isTempDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '120px',
                        marginTop: '4px',
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        zIndex: 60,
                        minWidth: '130px',
                        overflow: 'hidden',
                      }}>
                        {[
                          { key: 'hot', label: 'Quente', color: '#EF4444' },
                          { key: 'warm', label: 'Morno', color: '#F59E0B' },
                          { key: 'cold', label: 'Frio', color: '#3B82F6' },
                        ].map((t) => (
                          <div
                            key={t.key}
                            onClick={() => {
                              handleUpdate({ temperature: t.key as LeadTemperature });
                              setIsTempDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: lead.temperature === t.key ? 800 : 500,
                              color: 'var(--adm-text-title)',
                              background: lead.temperature === t.key ? 'var(--adm-bg-hover)' : 'transparent',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = lead.temperature === t.key ? 'var(--adm-bg-hover)' : 'transparent'}
                          >
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color }} />
                            <span>{t.label}</span>
                            {lead.temperature === t.key && <Check size={12} style={{ marginLeft: 'auto' }} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Indicação (Botão Sério Único com Largura Fixa e Hover Revogar) */}
              {!isPostSale && isReferralLead && (
                <div style={{ ...cardRowStyle, paddingTop: '8px', borderTop: '1px solid var(--adm-border)' }}>
                  <span style={cardLabelStyle}>Indicação</span>
                  <div style={cardValueStyle}>
                    {lead.isValidated ? (
                      <button
                        type="button"
                        onClick={() => invalidateLead(lead.id)}
                        onMouseEnter={() => setIsHoveringRevoke(true)}
                        onMouseLeave={() => setIsHoveringRevoke(false)}
                        style={{
                          minWidth: '140px',
                          height: '28px',
                          boxSizing: 'border-box',
                          background: isHoveringRevoke ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          border: `1px solid ${isHoveringRevoke ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.35)'}`,
                          color: isHoveringRevoke ? '#EF4444' : '#10B981',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        title={isHoveringRevoke ? "Clique para revogar contato validado" : "Contato validado"}
                      >
                        {isHoveringRevoke ? (
                          <>
                            <X size={12} />
                            <span>Revogar Contato</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Contato Validado</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsValidateModalOpen(true)}
                        style={{
                          minWidth: '140px',
                          height: '28px',
                          boxSizing: 'border-box',
                          background: 'rgba(20, 169, 215, 0.08)',
                          border: '1px solid rgba(20, 169, 215, 0.35)',
                          borderRadius: '6px',
                          padding: '4px 12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--adm-accent)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(20, 169, 215, 0.18)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20, 169, 215, 0.08)'; }}
                      >
                        <Clock size={12} />
                        <span>Validar Contato</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Campos Personalizados: Seção Comercial */}
              {renderCustomFieldsForSection('commercial')}
            </div>

            {/* ── SEÇÃO 2: 👤 ANIVERSARIANTE & CONTATOS VINCULADOS ── */}
            <div style={{ ...sectionTitleStyle, marginTop: '6px' }}>
              <Users size={13} color="var(--adm-accent)" />
              <span>Aniversariante & Contatos Vinculados</span>
            </div>

            {/* Cartão do Aniversariante & Subcontatos */}
            <div style={cardStyle}>
              {/* Header do Contato Aniversariante */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--adm-border)', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #14A9D7 0%, #0D82A6 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(20,169,215,0.3)',
                  }}>
                    {draftName ? (draftName.trim().substring(0, 2).toUpperCase()) : 'AN'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => {
                        if (draftName.trim() && draftName !== lead.name) {
                          handleUpdate({ name: draftName.trim() });
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      placeholder="Nome do aniversariante..."
                      style={{
                        ...seamlessInputStyle,
                        fontWeight: 800,
                        fontSize: '0.90rem',
                        color: 'var(--adm-text-title)',
                      }}
                      onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                    />

                    {/* WhatsApp Tag / Link */}
                    {lead.phone && (
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsApp(lead.phone)}
                        title="Abrir WhatsApp com Aniversariante"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(37, 211, 102, 0.12)',
                          color: '#25D366',
                          border: '1px solid rgba(37, 211, 102, 0.35)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <MessageSquare size={11} fill="#25D366" />
                        <span>WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status / Botão de Decisor do Aniversariante */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {!(lead.contacts || []).some(c => c.isPrimaryDecisionMaker) ? (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#10B981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}>
                      <Check size={11} /> Decisor
                    </span>
                  ) : !readOnly ? (
                    <button
                      type="button"
                      onClick={handleSetLeadAsDecisor}
                      title="Definir o aniversariante como o decisor"
                      style={{
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--adm-accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
                    >
                      Tornar Decisor
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Tel. Comercial */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Tel. comercial</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    value={draftPhone}
                    onChange={(e) => setDraftPhone(maskPhoneInput(e.target.value))}
                    onBlur={() => {
                      if (draftPhone !== lead.phone) {
                        handleUpdate({ phone: draftPhone });
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="+55 (21) 99999-9999"
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Email Comercial */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Email comercial</span>
                <div style={cardValueStyle}>
                  <input
                    type="email"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    onBlur={() => {
                      if (draftEmail !== (lead.email || '')) {
                        handleUpdate({ email: draftEmail.trim() });
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="aniversariante@gmail.com"
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Bairro */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Bairro</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    value={draftNeighborhood}
                    onChange={(e) => setDraftNeighborhood(e.target.value)}
                    onBlur={() => {
                      if (draftNeighborhood !== (lead.neighborhood || '')) {
                        handleUpdate({ neighborhood: draftNeighborhood.trim() });
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="Ex: Recreio, Barra..."
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Endereço */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Endereço</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    value={draftAddress}
                    onChange={(e) => setDraftAddress(e.target.value)}
                    onBlur={() => {
                      if (draftAddress !== (lead.address || '')) {
                        handleUpdate({ address: draftAddress.trim() });
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="Rua, número..."
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Decisor (Checkbox Sim / Não para o Aniversariante) */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Decisor</span>
                <div style={cardValueStyle}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: !readOnly ? 'pointer' : 'default',
                    userSelect: 'none',
                    padding: '2px 0',
                  }}>
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={!(lead.contacts || []).some(c => c.isPrimaryDecisionMaker)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSetLeadAsDecisor();
                        } else if ((lead.contacts || []).length > 0) {
                          handleSetPrimaryDecisor(lead.contacts![0]);
                        }
                      }}
                      style={{
                        cursor: !readOnly ? 'pointer' : 'default',
                        accentColor: '#10B981',
                        width: '14px',
                        height: '14px',
                      }}
                    />
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: !(lead.contacts || []).some(c => c.isPrimaryDecisionMaker) ? '#10B981' : 'var(--adm-text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {!(lead.contacts || []).some(c => c.isPrimaryDecisionMaker) ? (
                        <>
                          <CheckCircle2 size={13} color="#10B981" />
                          <span>Sim (Aniversariante é o Decisor)</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} color="var(--adm-text-muted)" />
                          <span>Não (Subcontato é o Decisor)</span>
                        </>
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {/* Contatos Vinculados Adicionais */}
              {(lead.contacts || []).map(contact => (
                <div key={contact.id} style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${contact.isPrimaryDecisionMaker ? 'rgba(16, 185, 129, 0.4)' : 'var(--adm-border)'}`,
                  background: contact.isPrimaryDecisionMaker ? 'rgba(16, 185, 129, 0.05)' : 'var(--adm-bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginTop: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: contact.isPrimaryDecisionMaker ? 'rgba(16, 185, 129, 0.15)' : 'rgba(20, 169, 215, 0.15)',
                      color: contact.isPrimaryDecisionMaker ? '#10B981' : 'var(--adm-accent)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: `1px solid ${contact.isPrimaryDecisionMaker ? 'rgba(16, 185, 129, 0.35)' : 'rgba(20, 169, 215, 0.3)'}`,
                    }}>
                      {contact.name ? contact.name.substring(0, 2).toUpperCase() : 'CT'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {contact.name}
                        </span>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: 'var(--adm-accent)',
                          background: 'rgba(20, 169, 215, 0.12)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}>
                          {CONTACT_ROLE_LABELS[contact.role] || contact.role}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
                          {formatPhone(contact.phone)}
                        </span>

                        {contact.phone && (
                          <button
                            type="button"
                            onClick={() => handleDirectWhatsApp(contact.phone)}
                            title="Abrir WhatsApp"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#25D366',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <MessageSquare size={11} fill="#25D366" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {contact.isPrimaryDecisionMaker ? (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: '#10B981',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                      }}>
                        <Check size={11} /> Decisor
                      </span>
                    ) : !readOnly ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryDecisor(contact)}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          color: 'var(--adm-text-title)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--adm-accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
                      >
                        Tornar Decisor
                      </button>
                    ) : null}

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubContact(contact.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Excluir contato"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Adicionar Contato Button & Formulario Reformulado */}
              <div style={{ paddingTop: '6px', borderTop: (lead.contacts && lead.contacts.length > 0) ? 'none' : '1px solid var(--adm-border)' }}>
                {!isAddingContact ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingContact(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 0',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--adm-text-title)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '1px dashed var(--adm-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Plus size={13} />
                    </div>
                    <span>Adicionar contato</span>
                  </button>
                ) : (
                  <form onSubmit={handleAddSubContact} style={{
                    padding: '12px 14px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Novo Contato Vinculado
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewContactName('');
                          setNewContactPhone('');
                          setIsAddingContact(false);
                        }}
                        title="Descartar"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-text-muted)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        required
                        placeholder="Nome do responsável..."
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '7px',
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          color: 'var(--adm-text-title)',
                          outline: 'none',
                        }}
                      />
                      <input
                        type="text"
                        required
                        placeholder="WhatsApp (ex: 21 99999-9999)..."
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(maskPhoneInput(e.target.value))}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '7px',
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          color: 'var(--adm-text-title)',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
                      <select
                        value={newContactRole}
                        onChange={(e) => setNewContactRole(e.target.value as LeadContactRole)}
                        style={{
                          flex: 1,
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.76rem',
                          borderRadius: '7px',
                          padding: '6px 10px',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="mother">Mãe</option>
                        <option value="father">Pai</option>
                        <option value="responsavel">Responsável Legal</option>
                        <option value="noivo">Noivo(a)</option>
                        <option value="tio">Tio(a)</option>
                        <option value="outro">Outro</option>
                      </select>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="submit"
                          style={{
                            background: 'var(--adm-accent)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '7px',
                            padding: '6px 14px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Campos Personalizados: Seção Contatos */}
              {renderCustomFieldsForSection('contact')}
            </div>

            {/* ── SEÇÃO 3: 🎉 DADOS DO EVENTO ── */}
            <div style={{ ...sectionTitleStyle, marginTop: '6px' }}>
              <PartyPopper size={13} color="var(--adm-accent)" />
              <span>Dados do Evento</span>
            </div>

            <div style={cardStyle}>
              {/* Tipo de Evento (Custom Popover Dropdown) */}
              <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>Tipo de evento</span>
                <div style={cardValueStyle}>
                  <div
                    onClick={() => {
                      if (!readOnly) {
                        const next = !isEventTypeDropdownOpen;
                        closeAllDropdowns();
                        setIsEventTypeDropdownOpen(next);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      cursor: readOnly ? 'default' : 'pointer',
                      padding: '2px 0',
                    }}
                  >
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: lead.eventType ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                    }}>
                      {lead.eventType || 'Selecione o tipo de evento...'}
                    </span>
                    {!readOnly && <ChevronDown size={12} color="var(--adm-text-muted)" />}
                  </div>

                  {isEventTypeDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '120px',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      zIndex: 60,
                      overflow: 'hidden',
                    }}>
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <div
                          key={opt}
                          onClick={() => {
                            handleUpdate({ eventType: opt });
                            setIsEventTypeDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: lead.eventType === opt ? 800 : 500,
                            color: 'var(--adm-text-title)',
                            background: lead.eventType === opt ? 'var(--adm-bg-hover)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = lead.eventType === opt ? 'var(--adm-bg-hover)' : 'transparent'}
                        >
                          <span>{opt}</span>
                          {lead.eventType === opt && <Check size={12} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Data do Evento (Click anywhere to trigger date picker) */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Data do evento</span>
                <div style={cardValueStyle}>
                  <input
                    type="date"
                    value={lead.eventDate || lead.partyDate || ''}
                    onClick={(e) => {
                      try { (e.target as any).showPicker?.(); } catch {}
                    }}
                    onChange={(e) => handleUpdate({ eventDate: e.target.value, partyDate: e.target.value })}
                    style={{
                      ...seamlessInputStyle,
                      cursor: 'pointer',
                      color: (lead.eventDate || lead.partyDate) ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                    }}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Aniversário da Debutante */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Aniversário deb.</span>
                <div style={cardValueStyle}>
                  <input
                    type="date"
                    value={lead.debutanteBirthDate || ''}
                    onClick={(e) => {
                      try { (e.target as any).showPicker?.(); } catch {}
                    }}
                    onChange={(e) => handleUpdate({ debutanteBirthDate: e.target.value })}
                    style={{
                      ...seamlessInputStyle,
                      cursor: 'pointer',
                      color: lead.debutanteBirthDate ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                    }}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Qtd. Convidados */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Qtd. convidados</span>
                <div style={cardValueStyle}>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 150, 200..."
                    value={draftEstimatedGuests}
                    onChange={(e) => setDraftEstimatedGuests(e.target.value)}
                    onBlur={() => {
                      const num = Number(draftEstimatedGuests) || undefined;
                      handleUpdate({ estimatedGuests: num });
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Período Desejado */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Período desejado</span>
                <div style={cardValueStyle}>
                  <textarea
                    rows={2}
                    placeholder="Ex: 2º Semestre 2027, Sábado..."
                    value={draftDesiredPeriod}
                    onChange={(e) => setDraftDesiredPeriod(e.target.value)}
                    onBlur={() => {
                      if (draftDesiredPeriod !== (lead.desiredPeriod || '')) {
                        handleUpdate({ desiredPeriod: draftDesiredPeriod.trim() });
                      }
                    }}
                    style={{
                      ...seamlessInputStyle,
                      fontWeight: 600,
                      resize: 'none',
                      height: 'auto',
                      minHeight: '34px',
                      lineHeight: '1.25',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Campos Personalizados: Seção Evento */}
              {renderCustomFieldsForSection('event')}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 2: 🌐 ORIGEM & RASTREAMENTO                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'origem' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Card Principal: Tipo de Origem */}
            <div style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
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
                      <Sparkles size={12} /> Indicação de Debutante
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
                    {leadVenue?.name || lead.venueName || 'F5 System'}
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

            {/* Bloco Específico: Indicação de Debutante (Clean card matching app style) */}
            {isReferralLead && (
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#D4AF37" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)', textTransform: 'uppercase' }}>
                    Debutante Indicadora
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--adm-bg-input)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--adm-border)',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.1) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      color: '#D4AF37',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {lead.debutanteName ? lead.debutanteName.substring(0, 2).toUpperCase() : 'DB'}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {lead.debutanteName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                        Debutante Anfitriã Indicadora
                      </div>
                    </div>
                  </div>

                  {/* Botão Quadrado com Ícone para acessar a sessão da Debutante (exclusivo para Pós-Venda/Admin/Master) */}
                  {canAccessPostSale && (lead.debutanteId || lead.debutanteName) && (
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('admin_switch_tab', { 
                          detail: { 
                            tab: 'debutantes', 
                            debutanteId: lead.debutanteId 
                          } 
                        }));
                      }}
                      title="Acessar Ficha da Debutante"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.08) 100%)',
                        border: '1px solid rgba(212, 175, 55, 0.45)',
                        color: '#D4AF37',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.18s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.35) 0%, rgba(212, 175, 55, 0.18) 100%)';
                        e.currentTarget.style.borderColor = '#D4AF37';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.08) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.45)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <ExternalLink size={17} />
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
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 4: 💼 HISTÓRICO COMERCIAL (LEAD ORIGINAL)                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'comercial' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="#3B82F6" />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#3B82F6' }}>
                  Ficha do Lead Comercial
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                Dados de captação, origem de anúncio e histórico comercial de quando o cliente ingressou como Lead.
              </p>
            </div>

            {/* Informações da Captação Comercial */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <div style={rowStyle}>
                <span style={rowLabelStyle}>Origem do Lead</span>
                <div style={rowValueStyle}>
                  {lead.sourceName || lead.source || 'WhatsApp Direto'}
                </div>
              </div>
              {lead.subSource && (
                <div style={rowStyle}>
                  <span style={rowLabelStyle}>Sub-origem</span>
                  <div style={rowValueStyle}>
                    {lead.subSource}
                  </div>
                </div>
              )}
              <div style={rowStyle}>
                <span style={rowLabelStyle}>Data de Entrada</span>
                <div style={rowValueStyle}>
                  {lead.createdAt ? new Date(lead.createdAt + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data não informada'}
                </div>
              </div>
              <div style={rowStyle}>
                <span style={rowLabelStyle}>SDR Responsável</span>
                <div style={rowValueStyle}>
                  {lead.sdrName || lead.assignedTo || 'Nenhum SDR'}
                </div>
              </div>
              <div style={rowStyle}>
                <span style={rowLabelStyle}>Closer (Vendas)</span>
                <div style={rowValueStyle}>
                  {lead.closerName || 'Venda Direta / Balcão'}
                </div>
              </div>
              <div style={rowStyle}>
                <span style={rowLabelStyle}>Valor Fechado</span>
                <div style={{ ...rowValueStyle, color: '#10B981', fontWeight: 800 }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.dealValue || 0)}
                </div>
              </div>
              {lead.packageSold && (
                <div style={rowStyle}>
                  <span style={rowLabelStyle}>Pacote Vendido</span>
                  <div style={rowValueStyle}>
                    {lead.packageSold}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 5: 📋 TAREFAS & FOLLOW-UPS DO LEAD                                */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'tasks' && (
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={sectionTitleStyle}>
                <CheckSquare size={13} color="var(--adm-accent)" />
                <span>Tarefas & Follow-ups ({leadTasks.length})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                style={{
                  background: 'var(--adm-accent)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={12} />
                <span>Nova Tarefa</span>
              </button>
            </div>

            {leadTasks.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: 'var(--adm-text-muted)',
                fontSize: '0.78rem',
                border: '1px dashed var(--adm-border)',
                borderRadius: '12px',
                background: 'var(--adm-bg-card)',
              }}>
                Nenhuma tarefa ou follow-up cadastrado para este lead.
              </div>
            ) : (
              leadTasks.map(t => {
                const isCompleted = t.status === 'completed';
                return (
                  <div
                    key={t.id}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--adm-border)'}`,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => toggleTaskStatus(t.id)}
                          title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                          style={{
                            background: isCompleted ? '#10B981' : 'transparent',
                            border: `1.5px solid ${isCompleted ? '#10B981' : 'var(--adm-border)'}`,
                            borderRadius: '5px',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isCompleted && <CheckCircle2 size={13} color="#FFF" />}
                        </button>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: isCompleted ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            wordBreak: 'break-word',
                          }}>
                            {t.title || t.description || t.content || 'Tarefa sem título'}
                          </div>
                          {(t.dueDate || t.customType || t.type) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                              {t.dueDate && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={10} />
                                  {t.dueDate} {t.dueTime ? `às ${t.dueTime}` : ''}
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(20, 169, 215, 0.12)',
                                color: isCompleted ? '#10B981' : 'var(--adm-accent)',
                              }}>
                                {t.customType || (t.type === 'followup' ? 'Follow-up' : 'Tarefa')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTask(t);
                            setIsTaskModalOpen(true);
                          }}
                          title="Editar detalhes completos da tarefa"
                          style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(t)}
                          title="Excluir tarefa"
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Campo de Resolução / Resultado Inline (auto-save on blur) */}
                    <div style={{ marginTop: '2px' }}>
                      <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, marginBottom: '2px' }}>
                        Resultado / Resolução:
                      </div>
                      <input
                        type="text"
                        defaultValue={t.resolution || t.customProperties?.resolution || ''}
                        placeholder="Digite o resultado/conclusão desta tarefa..."
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val !== (t.resolution || t.customProperties?.resolution || '')) {
                            updateTask(t.id, {
                              resolution: val,
                              customProperties: {
                                ...(t.customProperties || {}),
                                resolution: val,
                              }
                            });
                          }
                        }}
                        style={{
                          width: '100%',
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          fontSize: '0.74rem',
                          color: 'var(--adm-text-title)',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* ── MODAL ELEGANTE DE VALIDAÇÃO DE INDICAÇÃO ── */}
      {isValidateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--adm-accent)" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Validar Indicação
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsValidateModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Content */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--adm-text-muted)' }}>Anfitriã Indicadora:</span>
                <strong style={{ color: 'var(--adm-text-title)' }}>{lead.debutanteName || 'Debutante'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--adm-text-muted)' }}>Lead Convidado:</span>
                <strong style={{ color: 'var(--adm-text-title)' }}>{lead.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingTop: '8px', borderTop: '1px solid var(--adm-border)' }}>
                <span style={{ color: 'var(--adm-text-muted)' }}>Pontuação a creditar:</span>
                <span style={{ color: 'var(--adm-accent)', fontWeight: 800 }}>+1 Ponto na Jornada</span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--adm-text-muted)', lineHeight: 1.5 }}>
              Ao confirmar, a anfitriã receberá o crédito de 1 ponto no programa de indicações para desbloqueio de prêmios na jornada.
            </p>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsValidateModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  validateLead(lead.id);
                  setIsValidateModalOpen(false);
                }}
                style={{
                  background: 'var(--adm-accent)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                <Check size={14} />
                <span>Confirmar Validação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova / Editar Tarefa com AdminTaskDetailModal */}
      {isTaskModalOpen && (
        <AdminTaskDetailModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          task={editingTask}
          initialLeadId={lead.id}
        />
      )}

      {/* Modal Confirmar Exclusão de Tarefa */}
      {taskToDelete && (
        <AdminConfirmModal
          isOpen={true}
          title="Excluir Tarefa"
          message={`Tem certeza que deseja excluir a tarefa "${taskToDelete.title || taskToDelete.description || 'Selecionada'}"?`}
          confirmText="Sim, Excluir"
          danger={true}
          onConfirm={() => {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }}
          onClose={() => setTaskToDelete(null)}
        />
      )}
    </div>
  );
};
