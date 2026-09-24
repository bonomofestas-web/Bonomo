import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, Trash2, Check, Archive,
  ChevronLeft, ChevronRight, Plus,
  Shield, PartyPopper, Users,
  CheckCircle2, Clock, X, Sparkles,
  Globe, ExternalLink, FileText, Copy, Tag,
  Building2, PhoneCall, Eye, MessageSquare,
  User, Calendar as CalendarIcon, Utensils,
  Lock, Unlock, AlertTriangle, Send
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import { AdminScheduleCommitmentModal } from './AdminScheduleCommitmentModal';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput, formatPhone } from '../../utils/phoneFormatter';
import { ICP_SITUATION_CONFIG } from '../../types/admin';
import { generateUuid } from '../../utils/uuid';
import type { 
  Lead, 
  CrmStage, 
  LeadContactRole,
  LeadContact,
  LeadActivity,
  LeadEventType,
  LeadTemperature,
  LeadMqlLevel,
  CommercialCommitmentType
} from '../../types/admin';

interface AdminLeadInspectorProps {
  lead: Lead;
  onWhatsApp?: (lead: Lead) => void;
  onStageChange: (stage: CrmStage) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  readOnly?: boolean;
  isPostSale?: boolean;
  selectedRecipientPhone?: string;
  onSelectRecipientPhone?: (phone: string) => void;
}

const STAGE_CONFIGS: Record<CrmStage, { label: string; color: string; bg: string; border: string }> = {
  new_lead:          { label: 'Novo Lead',                    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: '#60A5FA' },
  in_analysis:       { label: 'Em Análise / Contato',         color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  border: '#FBBF24' },
  meeting_scheduled: { label: 'Reunião / Degustação',         color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: '#A78BFA' },
  contract_signed:   { label: 'Ganho',                        color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: '#10B981' },
  lost:              { label: 'Perdido',                      color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: '#EF4444' },
};

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

const URGENCY_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: '', label: 'Não Definida', color: 'var(--adm-text-muted)' },
  { key: 'baixa', label: 'Baixa', color: '#10B981' },
  { key: 'media', label: 'Média', color: '#F59E0B' },
  { key: 'alta', label: 'Alta', color: '#F97316' },
  { key: 'imediata', label: 'Imediata / Crítica', color: '#EF4444' },
];

export const AdminLeadInspector: React.FC<AdminLeadInspectorProps> = ({
  lead,
  onStageChange,
  onToggleCollapse,
  isCollapsed,
  readOnly = false,
  isPostSale = false,
  selectedRecipientPhone,
  onSelectRecipientPhone,
}) => {
  const { 
    currentUser, 
    collaborators, 
    venues,
    funnels,
    sources,
    mqlQuestions,
    updateLeadStage,
    updateLeadData, 
    deleteLead,
    archiveLead,
    unarchiveLead,
    validateLead, 
    assignLeadSdr,
    assignLeadCloser,
    removeLeadSdr,
    removeLeadCloser,
    saveLeadMqlAnswers,
    completeCommercialCommitment,
    cancelCommercialCommitment,
  } = useAdminState();

  const [activeTab, setActiveTab] = useState<'principal' | 'origem' | 'mql' | 'comercial' | 'tasks'>('principal');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [scheduleCommitmentType, setScheduleCommitmentType] = useState<CommercialCommitmentType | null>(null);
  const [completingCommitmentType, setCompletingCommitmentType] = useState<CommercialCommitmentType | null>(null);
  const [completionFeedback, setCompletionFeedback] = useState<string>('');
  const [cancellingCommitmentType, setCancellingCommitmentType] = useState<CommercialCommitmentType | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [isTempDropdownOpen, setIsTempDropdownOpen] = useState(false);
  const [isCreditCardDropdownOpen, setIsCreditCardDropdownOpen] = useState(false);
  const [isEventTypeDropdownOpen, setIsEventTypeDropdownOpen] = useState(false);
  const [isUrgencyDropdownOpen, setIsUrgencyDropdownOpen] = useState(false);

  // Trava de segurança para leads com resultado final (Ganho/Perdido)
  const [isOutcomeUnlocked, setIsOutcomeUnlocked] = useState(false);
  const [showUnlockConfirmModal, setShowUnlockConfirmModal] = useState(false);

  // Subcontacts state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactCpf, setNewContactCpf] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactRole, setNewContactRole] = useState<LeadContactRole>('mother');

  // Tag state
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Dropdown states for commercial responsibles
  const [isSdrDropdownOpen, setIsSdrDropdownOpen] = useState(false);
  const [isCloserDropdownOpen, setIsCloserDropdownOpen] = useState(false);

  const leadFunnel = useMemo(() => {
    return funnels.find(f => f.id === lead.funnelId || f.name === lead.funnelId) ||
      funnels.find(f => (f.venueId === 'all' || f.venueId === lead.venueId) && !f.isPostSale) ||
      funnels[0];
  }, [funnels, lead.funnelId, lead.venueId]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    (leadFunnel?.predefinedTags || []).forEach(t => { if (t) set.add(t.trim()); });
    const currentTags = (lead.tags || []).map(t => t.toLowerCase());
    return Array.from(set).filter(t => !currentTags.includes(t.toLowerCase()) && t.toLowerCase() !== 'indicação');
  }, [leadFunnel, lead.tags]);

  const closeAllDropdowns = () => {
    setIsTempDropdownOpen(false);
    setIsCreditCardDropdownOpen(false);
    setIsEventTypeDropdownOpen(false);
    setIsUrgencyDropdownOpen(false);
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
  const [draftBirthday, setDraftBirthday] = useState(lead.birthday || lead.debutanteBirthDate || '');
  const [draftCpf, setDraftCpf] = useState(lead.cpf || '');
  const [draftEstimatedGuests, setDraftEstimatedGuests] = useState<string>(lead.estimatedGuests ? String(lead.estimatedGuests) : '');
  const [draftDealValue, setDraftDealValue] = useState<string>(() => {
    const val = lead.dealValue || lead.estimatedBudget || 0;
    return val > 0 ? formatCurrency(val) : '';
  });
  const [draftEventYear, setDraftEventYear] = useState<string>(() => {
    if (lead.eventYear) return String(lead.eventYear);
    if (lead.eventDate) return String(new Date(lead.eventDate + 'T12:00:00').getFullYear());
    return '';
  });
  const [draftDecisionMakers, setDraftDecisionMakers] = useState<string>(lead.decisionMakers || '');
  const [draftDownPayment, setDraftDownPayment] = useState<string>(() => lead.downPayment ? formatCurrency(lead.downPayment) : '');
  const [draftInstallments, setDraftInstallments] = useState<string>(() => lead.installments ? String(lead.installments) : '');
  const [draftProfession, setDraftProfession] = useState<string>(lead.profession || '');

  // Dynamic optional fields toggle
  const [showEmailField, setShowEmailField] = useState(false);
  const [showCpfField, setShowCpfField] = useState(false);
  const [showNeighborhoodField, setShowNeighborhoodField] = useState(false);
  const [showAddressField, setShowAddressField] = useState(false);

  React.useEffect(() => {
    setDraftName(lead.name || '');
    setDraftPhone(lead.phone || '');
    setDraftEmail(lead.email || '');
    setDraftNeighborhood(lead.neighborhood || '');
    setDraftAddress(lead.address || '');
    setDraftBirthday(lead.birthday || lead.debutanteBirthDate || '');
    setDraftCpf(lead.cpf || '');
    setDraftEstimatedGuests(lead.estimatedGuests ? String(lead.estimatedGuests) : '');
    const val = lead.dealValue || lead.estimatedBudget || 0;
    setDraftDealValue(val > 0 ? formatCurrency(val) : '');
    setDraftEventYear(lead.eventYear ? String(lead.eventYear) : (lead.eventDate ? String(new Date(lead.eventDate + 'T12:00:00').getFullYear()) : ''));
    setDraftDecisionMakers(lead.decisionMakers || '');
    setDraftDownPayment(lead.downPayment ? formatCurrency(lead.downPayment) : '');
    setDraftInstallments(lead.installments ? String(lead.installments) : '');
    setDraftProfession(lead.profession || '');
    setIsOutcomeUnlocked(false);
    setShowEmailField(false);
    setShowCpfField(false);
    setShowNeighborhoodField(false);
    setShowAddressField(false);
  }, [lead.id, lead.name, lead.phone, lead.email, lead.neighborhood, lead.address, lead.birthday, lead.debutanteBirthDate, lead.cpf, lead.estimatedGuests, lead.dealValue, lead.estimatedBudget, lead.eventYear, lead.decisionMakers, lead.downPayment, lead.installments, lead.profession]);


  const leadVenue = venues.find(v => v.id === lead.venueId);
  const leadSource = lead.sourceId ? sources.find(s => s.id === lead.sourceId) : undefined;
  const sdrCollab = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : undefined;

  const isManagerOrMaster = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const canAccessPostSale = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'pos_venda' || (currentUser as any)?.sectors?.includes('pos_venda');
  
  const commercialCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      if (!c.active) return false;
      if (c.role === 'master') return true;
      if (c.sectors && c.sectors.length > 0) {
        return c.sectors.includes('comercial');
      }
      return ['comercial', 'sdr', 'closer', 'crm'].includes(c.role || '');
    });
  }, [collaborators]);

  const sdrList = commercialCollaborators;
  const closerList = commercialCollaborators;

  const isReferralLead = useMemo(() => {
    const hasReferralFlag = lead.source === 'indicacao' || Boolean((lead as any).referralCode);
    const hasValidDebutante = Boolean(
      (lead.debutanteId && lead.debutanteId.trim() !== '' && lead.debutanteId !== 'none') ||
      (lead.debutanteName && !['Indicação Externa', 'WhatsApp Direto', 'teste', 'Sem indicação', 'Direto', 'Lead sem nome'].includes(lead.debutanteName.trim()))
    );
    return hasReferralFlag && hasValidDebutante;
  }, [lead.source, (lead as any).referralCode, lead.debutanteId, lead.debutanteName]);

  const originTag = useMemo(() => {
    if (isReferralLead) return 'Indicação';
    if (lead.subSource) return `WhatsApp / ${lead.subSource}`;
    if (lead.source === 'whatsapp' || lead.sourceName?.toLowerCase().includes('whatsapp')) return 'WhatsApp';
    return lead.sourceName || lead.source || 'Entrada Direta';
  }, [isReferralLead, lead.subSource, lead.source, lead.sourceName]);

  // Estágios dinâmicos obtidos diretamente do Funil do Lead
  const funnelStages = useMemo(() => {
    let rawStages = leadFunnel?.stages || [];
    if (rawStages.length === 0) {
      rawStages = [
        { id: 'new_lead', name: 'NOVO LEAD', color: '#60A5FA', icon: 'inbox' },
        { id: 'in_analysis', name: 'EM ANÁLISE', color: '#FBBF24', icon: 'clock' },
        { id: 'meeting_scheduled', name: 'VISITA AGENDADA', color: '#A78BFA', icon: 'calendar' },
        { id: 'contract_signed', name: 'GANHO', color: '#10B981', isWon: true, icon: 'dollar' },
        { id: 'lost', name: 'PERDIDO', color: '#EF4444', isLoss: true, icon: 'x-circle' },
      ];
    }
    if (leadFunnel?.isWonStageEnabled === false) {
      rawStages = rawStages.filter(s => !s.isWon && s.id !== 'contract_signed' && s.id !== 'deal_closed');
    }
    return rawStages;
  }, [leadFunnel]);

  const currentStageConfig = useMemo(() => {
    const matched = funnelStages.find(s => s.id === lead.stage);
    if (matched) {
      const color = matched.color || '#3B82F6';
      return {
        label: matched.name,
        icon: matched.icon || matched.id,
        color,
        bg: `${color}18`,
        border: `${color}55`,
      };
    }
    const fallback = STAGE_CONFIGS[lead.stage] || { label: lead.stage, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: '#3B82F6' };
    return {
      ...fallback,
      icon: (lead.stage as string) || 'layers',
    };
  }, [funnelStages, lead.stage]);

  const handleSelectStage = (newStageId: string) => {
    if (readOnly) return;
    const isBlockedEntry = (newStageId === 'new_lead' || newStageId === 'onboarding') && lead.stage !== 'new_lead' && (lead.stage as string) !== 'onboarding';
    if (isBlockedEntry) {
      alert('Regra do CRM: A etapa "NOVO LEAD" é exclusivamente para entrada. Leads que avançaram não podem retornar para ela.');
      return;
    }
    if (onStageChange) {
      onStageChange(newStageId as CrmStage);
    }
    updateLeadStage(lead.id, newStageId as CrmStage);
    setIsStageDropdownOpen(false);
  };

  const currentStageIndex = useMemo(() => {
    const idx = funnelStages.findIndex(s => s.id === lead.stage);
    return idx >= 0 ? idx : 0;
  }, [funnelStages, lead.stage]);

  // ICP / MQL Questions específicas vinculadas a este Funil + Casa de Festas (Unidade)
  const venueMqlQuestions = useMemo(() => {
    if (!mqlQuestions || mqlQuestions.length === 0) return [];
    
    // Pergunta deve estar vinculada à casa deste lead (ou all) E ao funil deste lead (ou all)
    return mqlQuestions.filter(q => {
      const matchesFunnel = !lead.funnelId || !q.funnelId || q.funnelId === lead.funnelId || (q.funnelIds && q.funnelIds.includes(lead.funnelId));
      const matchesVenue = (q.venueId && (q.venueId === lead.venueId || (q.venueId === 'all' && (!q.venueIds || q.venueIds.length === 0)))) ||
                           (q.venueIds && q.venueIds.length > 0 && q.venueIds.includes(lead.venueId));
      return matchesFunnel && matchesVenue;
    });
  }, [mqlQuestions, lead.funnelId, lead.venueId]);

  // Current MQL state
  const [mqlAnswers, setMqlAnswers] = useState<Record<string, string>>(lead.mqlAnswers || {});

  // Calculate MQL dynamically (com suporte a estado Indefinido quando nada for marcado)
  const mqlResult = useMemo(() => {
    const answeredKeys = Object.keys(mqlAnswers).filter(k => Boolean(mqlAnswers[k]));
    if (venueMqlQuestions.length === 0 || answeredKeys.length === 0) {
      if (typeof lead.mqlScore === 'number' && lead.mqlScore > 0 && lead.mqlAnswers && Object.keys(lead.mqlAnswers).length > 0) {
        return { score: lead.mqlScore, level: lead.mqlLevel || 'cold', isDefined: true };
      }
      return { score: undefined, level: undefined, isDefined: false };
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

    return { score, level, isDefined: true };
  }, [venueMqlQuestions, mqlAnswers, lead.mqlScore, lead.mqlLevel, lead.mqlAnswers]);

  const handleSelectMqlOption = (questionId: string, optionId: string) => {
    const updated = { ...mqlAnswers };
    // Toggle: Se já estava selecionada, desmarca a alternativa!
    if (updated[questionId] === optionId) {
      delete updated[questionId];
    } else {
      updated[questionId] = optionId;
    }
    setMqlAnswers(updated);

    const answeredKeys = Object.keys(updated).filter(k => Boolean(updated[k]));
    if (answeredKeys.length === 0) {
      // Quando nenhuma alternativa estiver selecionada: ICP torna-se Indefinido
      saveLeadMqlAnswers(lead.id, updated, undefined as any, undefined as any);
      return;
    }

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

  // Trava de segurança para leads com resultado final (Ganho / Perdido)
  const isOutcomeStage = lead.stage === 'contract_signed' || lead.stage === 'lost';
  const effectiveReadOnly = Boolean(readOnly || (isOutcomeStage && !isOutcomeUnlocked));

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
      email: newContactEmail.trim() || undefined,
      cpf: newContactCpf.trim() || undefined,
      address: newContactAddress.trim() || undefined,
      role: newContactRole,
      isPrimaryDecisionMaker: false,
    };

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newContactActivity: LeadActivity = {
      id: generateUuid(),
      leadId: lead.id,
      timestamp: new Date().toISOString(),
      type: 'note',
      title: 'Contato Vinculado Adicionado',
      text: `Contato vinculado adicionado no dia ${new Date().toLocaleDateString('pt-BR')}, com o nome "${newContactName.trim()}" (${newContactRole}) e telefone ${newContactPhone.trim()} por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    handleUpdate({ 
      contacts: [...(lead.contacts || []), contact],
      activities: [...(lead.activities || []), newContactActivity],
    });
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactCpf('');
    setNewContactAddress('');
    setIsAddingContact(false);
  };

  // Designation of Decisor does NOT overwrite the Aniversariante's name or phone!
  const handleSetPrimaryDecisor = (contact: LeadContact) => {
    const updatedContacts = (lead.contacts || []).map(c => ({
      ...c,
      isPrimaryDecisionMaker: c.id === contact.id,
    }));

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const decisorActivity: LeadActivity = {
      id: generateUuid(),
      leadId: lead.id,
      timestamp: new Date().toISOString(),
      type: 'note',
      title: 'Decisor Principal Definido',
      text: `Decisor adicionado no dia ${new Date().toLocaleDateString('pt-BR')}, com o nome "${contact.name}" (${contact.role}) e número de telefone ${contact.phone} por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    handleUpdate({
      contacts: updatedContacts,
      primaryContactRole: contact.role,
      activities: [...(lead.activities || []), decisorActivity],
    });
  };

  const handleSetLeadAsDecisor = () => {
    const updatedContacts = (lead.contacts || []).map(c => ({
      ...c,
      isPrimaryDecisionMaker: false,
    }));

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const decisorActivity: LeadActivity = {
      id: generateUuid(),
      leadId: lead.id,
      timestamp: new Date().toISOString(),
      type: 'note',
      title: 'Decisor Principal Definido',
      text: `Lead / Aniversariante "${lead.name}" definido como decisor principal no dia ${new Date().toLocaleDateString('pt-BR')}, telefone ${lead.phone || 'não informado'} por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    handleUpdate({
      contacts: updatedContacts,
      primaryContactRole: 'aniversariante',
      activities: [...(lead.activities || []), decisorActivity],
    });
  };

  const handleRemoveSubContact = (contactId: string) => {
    const removedContact = (lead.contacts || []).find(c => c.id === contactId);
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const removeActivity: LeadActivity = {
      id: generateUuid(),
      leadId: lead.id,
      timestamp: new Date().toISOString(),
      type: 'note',
      title: 'Contato Vinculado Removido',
      text: `Contato "${removedContact?.name || 'Contato'}" removido por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    handleUpdate({ 
      contacts: (lead.contacts || []).filter(c => c.id !== contactId),
      activities: [...(lead.activities || []), removeActivity],
    });
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

  // ── Styles Compactos & Densos ──────────────────────────────────────────
  const sectionTitleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 1px 1px',
    fontSize: '0.67rem',
    fontWeight: 800,
    color: 'var(--adm-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--adm-bg-card)',
    border: '1px solid var(--adm-border)',
    borderRadius: '8px',
    padding: '8px 10px',
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  };

  const cardRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '0.74rem',
    minHeight: '22px',
    gap: '6px',
    paddingTop: '1px',
    paddingBottom: '1px',
  };

  const cardLabelStyle: React.CSSProperties = {
    width: '85px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.70rem',
    fontWeight: 600,
    paddingTop: '2px',
  };

  const cardValueStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
    wordBreak: 'break-word',
    whiteSpace: 'normal',
    lineHeight: '1.3',
  };

  const seamlessInputStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid transparent',
    borderRadius: '0',
    padding: '1px 0',
    color: 'var(--adm-text-title)',
    fontSize: '0.76rem',
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
    padding: '2px 6px',
    color: 'var(--adm-text-title)',
    fontSize: '0.72rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderBottom: '1px solid var(--adm-border)',
    minHeight: '26px',
    fontSize: '0.74rem',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const rowLabelStyle: React.CSSProperties = {
    width: '100px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.70rem',
    fontWeight: 600,
  };

  const rowValueStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  };

  const inlineInputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    padding: '2px 5px',
    color: 'var(--adm-text-title)',
    fontSize: '0.76rem',
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
      
      {/* ── 1. CABEÇALHO DARK & F5 SYSTEM CIANO (COM ESPAÇAMENTO REFINADO) ──────── */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid rgba(20, 169, 215, 0.25)',
        background: 'linear-gradient(180deg, #0B111A 0%, #0F1724 100%)',
        color: '#FFFFFF',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {/* Title row + Collapse Button (< / >) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            {lead.avatarUrl ? (
              <img
                src={lead.avatarUrl}
                alt={lead.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid rgba(20, 169, 215, 0.5)',
                  flexShrink: 0,
                }}
              />
            ) : null}
            <input
              type="text"
              value={lead.name}
              disabled={effectiveReadOnly}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              style={{
                ...inlineInputStyle,
                fontSize: '0.92rem',
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
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    if (lead.isArchived) {
                      if (confirm(`Deseja desarquivar o lead "${lead.name}"?`)) {
                        await unarchiveLead(lead.id);
                      }
                    } else {
                      if (confirm(`Deseja arquivar o lead "${lead.name}"? Ele será desanexado dos funis ativos sem disparar alertas.`)) {
                        await archiveLead(lead.id);
                      }
                    }
                  }}
                  title={lead.isArchived ? "Desarquivar este Lead" : "Arquivar este Lead"}
                  style={{
                    background: lead.isArchived ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.12)',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    color: '#A78BFA',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Archive size={13} />
                </button>

                {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.isDev) && (
                  lead.stage !== 'contract_signed' && (lead.stage as string) !== 'deal_closed' && lead.stage !== 'lost'
                ) && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmModal(true)}
                    title="Excluir este Lead"
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </>
            )}

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: isPostSale ? 'rgba(6, 182, 212, 0.15)' : 'rgba(20, 169, 215, 0.12)',
            border: `1px solid ${isPostSale ? 'rgba(6, 182, 212, 0.4)' : 'rgba(20, 169, 215, 0.35)'}`,
            borderRadius: '6px',
            padding: '2px 7px',
          }}>
            <Tag size={11} color={isPostSale ? '#06B6D4' : '#14A9D7'} />
            <span style={{ fontSize: '0.60rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
              {isPostSale ? 'CLIENTE:' : 'CÓDIGO:'}
            </span>
            <span style={{ fontSize: '0.70rem', fontWeight: 900, color: isPostSale ? '#06B6D4' : '#14A9D7', letterSpacing: '0.6px', fontFamily: "'Poppins', monospace" }}>
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
                marginLeft: '3px',
              }}
            >
              {copiedCode ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
          {copiedCode && (
            <span style={{ fontSize: '0.62rem', color: '#10B981', fontWeight: 700 }}>
              Copiado!
            </span>
          )}
        </div>

        {/* Event date if post-sale */}
        {isPostSale && (lead.eventDate || lead.partyDate) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.68rem', color: '#06B6D4', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <PartyPopper size={11} color="#06B6D4" /> {new Date((lead.eventDate || lead.partyDate) + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}

        {/* Badge de Pós-Venda (apenas se for pós-venda) */}
        {isPostSale && (
          <div>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06B6D4',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <Shield size={11} /> Cliente Ativo
            </span>
          </div>
        )}

        {/* Banner de Modo Somente Leitura para Pós-Venda em Funis Comerciais */}
        {readOnly && (
          <div style={{
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            borderRadius: '8px',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.68rem',
            color: 'var(--adm-text-title)',
          }}>
            <Eye size={13} color="#06B6D4" />
            <div>
              <strong style={{ color: '#06B6D4' }}>Modo Somente Leitura (Pós-Venda):</strong> Visualização permitida.
            </div>
          </div>
        )}

        {/* Pipeline Stage Dropdown with Colored Indicator & Stage Icon */}
        <div data-inspector-dropdown="stage-container" style={{ position: 'relative', marginTop: '2px', zIndex: 70 }}>
          <div
            data-inspector-dropdown="stage-toggle"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly) setIsStageDropdownOpen(prev => !prev);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              background: currentStageConfig.bg,
              border: `1px solid ${currentStageConfig.border}`,
              borderLeft: `3.5px solid ${currentStageConfig.color}`,
              borderRadius: '8px',
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: currentStageConfig.color,
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              {renderFunnelOrStageIcon(currentStageConfig.icon, 14, currentStageConfig.color)}
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {String(currentStageConfig.label || '').toUpperCase()}
              </span>
            </div>
            {!readOnly && (
              <ChevronDown 
                size={14} 
                style={{ 
                  transform: isStageDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.15s ease',
                  flexShrink: 0,
                  opacity: 0.85,
                }} 
              />
            )}
          </div>

          {/* Multi-Stage Color Progress Bar */}
          <div data-inspector-dropdown="stage-progress" style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
            {funnelStages.map((stg, idx) => {
              const color = stg.color || '#3B82F6';
              const isLost = stg.id === 'lost' || stg.isLoss;
              const isCurrentLost = lead.stage === 'lost';
              const isFilled = idx <= currentStageIndex && !isCurrentLost;
              const isBlockedEntry = (stg.id === 'new_lead' || (stg.id as string) === 'onboarding') && lead.stage !== 'new_lead' && (lead.stage as string) !== 'onboarding';

              return (
                <div
                  key={stg.id}
                  data-inspector-dropdown="stage-progress-tick"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (readOnly) return;
                    handleSelectStage(stg.id);
                  }}
                  title={isBlockedEntry ? `${stg.name.toUpperCase()} (BLOQUEADO: ETAPA EXCLUSIVA DE ENTRADA)` : `Mudar para: ${stg.name.toUpperCase()}`}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: isCurrentLost && isLost ? '#EF4444' : isFilled ? color : 'rgba(255,255,255,0.15)',
                    cursor: readOnly || isBlockedEntry ? 'not-allowed' : 'pointer',
                    opacity: isBlockedEntry ? 0.35 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!readOnly && !isBlockedEntry) {
                      e.currentTarget.style.transform = 'scaleY(1.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scaleY(1)';
                  }}
                />
              );
            })}
          </div>

          {/* Stage Dropdown Menu */}
          {isStageDropdownOpen && (
            <div 
              data-inspector-dropdown="stage-menu"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 5px)',
                left: 0,
                right: 0,
                background: '#0F1724',
                border: '1px solid rgba(20, 169, 215, 0.4)',
                borderRadius: '10px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
                zIndex: 99999,
                overflow: 'hidden',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {funnelStages.map(stg => {
                const color = stg.color || '#3B82F6';
                const isSelected = lead.stage === stg.id;
                const isBlockedEntry = (stg.id === 'new_lead' || (stg.id as string) === 'onboarding') && lead.stage !== 'new_lead' && (lead.stage as string) !== 'onboarding';

                if (isBlockedEntry) {
                  return (
                    <div
                      key={stg.id}
                      data-inspector-dropdown="stage-menu-item-blocked"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('Regra do CRM: Não é permitido retornar para "NOVO LEAD" após o lead já ter avançado no funil.');
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'not-allowed',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: 'var(--adm-text-muted)',
                        background: 'transparent',
                        opacity: 0.45,
                        textTransform: 'uppercase',
                        userSelect: 'none',
                      }}
                      title="Etapa bloqueada: apenas para entrada de leads"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        {renderFunnelOrStageIcon(stg.icon || stg.id, 13, 'var(--adm-text-muted)')}
                        <span>{stg.name.toUpperCase()}</span>
                        <span style={{ fontSize: '0.60rem', color: '#EF4444', fontWeight: 700 }}>(BLOQUEADO)</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={stg.id}
                    type="button"
                    data-inspector-dropdown="stage-menu-item"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectStage(stg.id);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: isSelected ? `1px solid ${color}60` : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.74rem',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? color : '#E2E8F0',
                      background: isSelected ? `${color}25` : 'transparent',
                      textTransform: 'uppercase',
                      textAlign: 'left',
                      transition: 'all 0.12s ease',
                      width: '100%',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#E2E8F0';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      {renderFunnelOrStageIcon(stg.icon || stg.id, 14, color)}
                      <span>{stg.name.toUpperCase()}</span>
                    </div>
                    {isSelected && <Check size={14} color={color} />}
                  </button>
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
          {/* Tag de Casa de Festas Fixa (Não removível) */}
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              background: 'rgba(20, 169, 215, 0.14)',
              color: '#14A9D7',
              border: '1px solid rgba(20, 169, 215, 0.4)',
              padding: '2px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
            title="Unidade / Casa de Festas vinculada (fixa)"
          >
            <Building2 size={10} color="#14A9D7" />
            <span>{leadVenue?.name || lead.venueName || 'Bonomo Festas'}</span>
          </span>

          {/* Tag de Origem Fixa (Sempre a 2ª Tag, Não Removível, Sem # e Sem Ícone) */}
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              background: isReferralLead
                ? 'rgba(212, 175, 55, 0.18)' 
                : 'rgba(16, 185, 129, 0.18)',
              color: isReferralLead
                ? '#D4AF37' 
                : '#10B981',
              border: `1px solid ${isReferralLead ? 'rgba(212, 175, 55, 0.45)' : 'rgba(16, 185, 129, 0.45)'}`,
              padding: '2px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
            title="Origem do lead (fixa)"
          >
            {isReferralLead
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
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('principal')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'principal' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '3px 8px',
                color: activeTab === 'principal' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.70rem',
                fontWeight: activeTab === 'principal' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={12} color={activeTab === 'principal' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Ficha do Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comercial')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'comercial' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '3px 8px',
                color: activeTab === 'comercial' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.70rem',
                fontWeight: activeTab === 'comercial' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <Shield size={12} color={activeTab === 'comercial' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Comercial (Lead)</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('principal')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'principal' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '3px 8px',
                color: activeTab === 'principal' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.70rem',
                fontWeight: activeTab === 'principal' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={12} color={activeTab === 'principal' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
              <span>Principal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('origem')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'origem' ? '2px solid #14A9D7' : '2px solid transparent',
                padding: '3px 8px',
                color: activeTab === 'origem' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.70rem',
                fontWeight: activeTab === 'origem' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <Globe size={12} color={activeTab === 'origem' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
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
                  padding: '3px 8px',
                  color: activeTab === 'mql' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                  fontSize: '0.70rem',
                  fontWeight: activeTab === 'mql' ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <IcpTargetUserIcon size={13} color={activeTab === 'mql' ? '#14A9D7' : 'rgba(255,255,255,0.6)'} />
                <span>ICP</span>
                <span style={{
                  fontSize: '0.58rem',
                  background: !mqlResult.isDefined ? 'rgba(148,163,184,0.18)' : mqlResult.level === 'top' ? 'rgba(16,185,129,0.2)' : mqlResult.level === 'qualified' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                  color: !mqlResult.isDefined ? '#94A3B8' : mqlResult.level === 'top' ? '#10B981' : mqlResult.level === 'qualified' ? '#F59E0B' : '#EF4444',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontWeight: 800
                }}>
                  {!mqlResult.isDefined ? 'Indefinido' : `${mqlResult.level === 'top' ? 'ICP A' : mqlResult.level === 'qualified' ? 'ICP B' : 'ICP C'} (${mqlResult.score}%)`}
                </span>
              </button>
            )}
          </div>
        )}

        {/* ── BANNER DE TRAVA DE LEAD GANHO / PERDIDO ── */}
        {isOutcomeStage && (
          <div style={{
            padding: '6px 10px',
            marginTop: '4px',
            background: isOutcomeUnlocked 
              ? 'rgba(245, 158, 11, 0.15)' 
              : lead.stage === 'contract_signed' 
              ? 'rgba(16, 185, 129, 0.15)' 
              : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${isOutcomeUnlocked ? 'rgba(245, 158, 11, 0.35)' : lead.stage === 'contract_signed' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '0.70rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isOutcomeUnlocked ? (
                <Unlock size={13} color="#F59E0B" />
              ) : (
                <Lock size={13} color={lead.stage === 'contract_signed' ? '#10B981' : '#EF4444'} />
              )}
              <span style={{ 
                fontWeight: 700, 
                color: isOutcomeUnlocked ? '#F59E0B' : lead.stage === 'contract_signed' ? '#10B981' : '#EF4444' 
              }}>
                {isOutcomeUnlocked 
                  ? 'Edição Desbloqueada nesta sessão' 
                  : `Lead ${lead.stage === 'contract_signed' ? 'Ganho' : 'Perdido'} (Edição Bloqueada)`}
              </span>
            </div>

            {isManagerOrMaster && (
              isOutcomeUnlocked ? (
                <button
                  type="button"
                  onClick={() => setIsOutcomeUnlocked(false)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid #F59E0B',
                    color: '#F59E0B',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Bloquear
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUnlockConfirmModal(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Desbloquear
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE DESBLOQUEIO */}
      {showUnlockConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                flexShrink: 0,
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Desbloquear Edição de Lead Concluído?
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                  Ação restrita a Master e Gerentes Comerciais
                </span>
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.78rem',
              color: 'var(--adm-text-body)',
              lineHeight: 1.45,
            }}>
              <strong style={{ color: '#EF4444', display: 'block', marginBottom: '4px' }}>
                Atenção com relatórios consolidados:
              </strong>
              Este lead já foi finalizado como <strong>{lead.stage === 'contract_signed' ? 'GANHO (Contrato Assinado)' : 'PERDIDO'}</strong>.
              Alterar valores contratuais, datas de evento, dados cadastrais ou sua etapa afeta diretamente as métricas consolidadas, gráficos de conversão e relatórios de auditoria da unidade.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowUnlockConfirmModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border)',
                  background: 'transparent',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOutcomeUnlocked(true);
                  setShowUnlockConfirmModal(false);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Unlock size={14} />
                <span>Confirmar Desbloqueio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. CONTEÚDO DA ABA SELECIONADA ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 1: 📋 PRINCIPAL                                                  */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'principal' && (
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>

            {/* ── SEÇÃO 1: ⭐ DADOS PRIORITÁRIOS UNIFICADOS (16 CAMPOS ESSENCIAIS) ── */}
            <div style={sectionTitleStyle}>
              <Sparkles size={13} color="var(--adm-accent)" />
              <span>Dados Prioritários</span>
            </div>

            <div style={cardStyle}>
              {/* 1. SDR (Responsável Pré-Vendas) */}
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
                      padding: '2px 4px',
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
                          width: '20px',
                          height: '20px',
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
                          {sdrCollab?.avatarUrl ? (
                            <img src={sdrCollab.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            (sdrCollab?.name || lead.assignedTo || 'S').charAt(0).toUpperCase()
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sdrCollab?.name || lead.assignedTo || 'SDR'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
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
                      left: 0,
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
                              width: '20px',
                              height: '20px',
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
                              <div style={{ fontSize: '0.76rem', fontWeight: isSelected ? 800 : 600, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

              {/* 2. Closer (Responsável Fechamento) */}
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
                        padding: '2px 4px',
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
                            width: '20px',
                            height: '20px',
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
                            {closerList.find(c => c.id === lead.closerId)?.avatarUrl ? (
                              <img src={closerList.find(c => c.id === lead.closerId)!.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (closerList.find(c => c.id === lead.closerId)?.name || lead.closerName || 'C').charAt(0).toUpperCase()
                            )}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {closerList.find(c => c.id === lead.closerId)?.name || lead.closerName || 'Closer'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
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
                        left: 0,
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
                                width: '20px',
                                height: '20px',
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
                                <div style={{ fontSize: '0.76rem', fontWeight: isSelected ? 800 : 600, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

              {/* 3. Temperatura */}
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
                        justifyContent: 'space-between',
                        width: '100%',
                        cursor: readOnly ? 'default' : 'pointer',
                        padding: '2px 0',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: (lead.temperature === 'hot') ? '#EF4444' : (lead.temperature === 'cold') ? '#3B82F6' : (lead.temperature === 'warm') ? '#F59E0B' : '#94A3B8',
                        }} />
                        <span style={{ fontSize: '0.80rem', fontWeight: 700, color: lead.temperature ? 'var(--adm-text-title)' : 'var(--adm-text-muted)' }}>
                          {lead.temperature === 'hot' ? 'Quente' : lead.temperature === 'cold' ? 'Frio' : lead.temperature === 'warm' ? 'Morno' : 'Sem Temperatura'}
                        </span>
                      </div>
                      {!readOnly && <ChevronDown size={12} color="var(--adm-text-muted)" />}
                    </div>

                    {/* Custom Popover Temperatura */}
                    {isTempDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        zIndex: 60,
                        overflow: 'hidden',
                      }}>
                        {[
                          { key: 'hot', label: 'Quente', color: '#EF4444' },
                          { key: 'warm', label: 'Morno', color: '#F59E0B' },
                          { key: 'cold', label: 'Frio', color: '#3B82F6' },
                          { key: 'none', label: 'Sem Temperatura (Limpar)', color: '#94A3B8' },
                        ].map((t) => (
                          <div
                            key={t.key}
                            onClick={() => {
                              handleUpdate({ temperature: t.key === 'none' ? undefined : (t.key as LeadTemperature) });
                              setIsTempDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '0.76rem',
                              fontWeight: ((!lead.temperature && t.key === 'none') || lead.temperature === t.key) ? 800 : 500,
                              color: 'var(--adm-text-title)',
                              background: ((!lead.temperature && t.key === 'none') || lead.temperature === t.key) ? 'var(--adm-bg-hover)' : 'transparent',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = ((!lead.temperature && t.key === 'none') || lead.temperature === t.key) ? 'var(--adm-bg-hover)' : 'transparent'}
                          >
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color }} />
                            <span>{t.label}</span>
                            {((!lead.temperature && t.key === 'none') || lead.temperature === t.key) && <Check size={12} style={{ marginLeft: 'auto' }} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Valor Venda R$ */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Valor Venda</span>
                <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '4px' }}>
                  <span style={{ color: '#10B981', fontWeight: 900, fontSize: '0.82rem', flexShrink: 0 }}>R$</span>
                  <input
                    type="text"
                    disabled={effectiveReadOnly}
                    placeholder="0,00"
                    value={draftDealValue}
                    onChange={(e) => setDraftDealValue(maskCurrencyInput(e.target.value))}
                    onBlur={() => {
                      const cleaned = draftDealValue.replace(/\./g, '').replace(',', '.');
                      const num = parseFloat(cleaned) || 0;
                      handleUpdate({ dealValue: num || undefined, estimatedBudget: num || undefined });
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    style={{ ...seamlessInputStyle, fontWeight: 800, color: '#10B981', fontSize: '0.86rem' }}
                    onFocus={(e) => { e.target.style.borderBottomColor = '#10B981'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* 5. Entrada R$ */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Entrada</span>
                <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-muted)', flexShrink: 0 }}>R$</span>
                  <input
                    type="text"
                    disabled={effectiveReadOnly}
                    placeholder="0,00"
                    value={draftDownPayment}
                    onChange={(e) => setDraftDownPayment(maskCurrencyInput(e.target.value))}
                    onBlur={() => {
                      const num = draftDownPayment ? parseFloat(draftDownPayment.replace(/\./g, '').replace(',', '.')) : 0;
                      handleUpdate({ downPayment: num || undefined });
                    }}
                    style={seamlessInputStyle}
                  />
                </div>
              </div>

              {/* 6. Parcelas */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Parcelas</span>
                <div style={cardValueStyle}>
                  <input
                    type="number"
                    disabled={effectiveReadOnly}
                    placeholder="Ex: 10, 12, 24"
                    value={draftInstallments}
                    onChange={(e) => setDraftInstallments(e.target.value)}
                    onBlur={() => {
                      const num = draftInstallments ? parseInt(draftInstallments, 10) : undefined;
                      handleUpdate({ installments: num });
                    }}
                    style={seamlessInputStyle}
                  />
                </div>
              </div>

              {/* 7. Cartão de Crédito */}
              <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>Cartão Crédito</span>
                <div style={cardValueStyle}>
                  <div
                    onClick={() => {
                      if (!readOnly) {
                        const next = !isCreditCardDropdownOpen;
                        closeAllDropdowns();
                        setIsCreditCardDropdownOpen(next);
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
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      color: lead.hasCreditCard === true ? '#10B981' : lead.hasCreditCard === false ? '#EF4444' : 'var(--adm-text-muted)',
                    }}>
                      {lead.hasCreditCard === true ? 'Sim' : lead.hasCreditCard === false ? 'Não' : 'Não informado'}
                    </span>
                    {!readOnly && <ChevronDown size={12} color="var(--adm-text-muted)" />}
                  </div>

                  {/* Popover Cartão de Crédito */}
                  {isCreditCardDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      zIndex: 60,
                      overflow: 'hidden',
                    }}>
                      {[
                        { val: true, label: 'Sim', color: '#10B981', icon: CheckCircle2 },
                        { val: false, label: 'Não', color: '#EF4444', icon: X },
                        { val: undefined, label: 'Não informado', color: 'var(--adm-text-muted)', icon: Clock },
                      ].map(opt => {
                        const isSelected = lead.hasCreditCard === opt.val;
                        const Icon = opt.icon;
                        return (
                          <div
                            key={String(opt.val)}
                            onClick={() => {
                              handleUpdate({ hasCreditCard: opt.val });
                              setIsCreditCardDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '0.76rem',
                              fontWeight: isSelected ? 800 : 500,
                              color: 'var(--adm-text-title)',
                              background: isSelected ? 'var(--adm-bg-hover)' : 'transparent',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'var(--adm-bg-hover)' : 'transparent'}
                          >
                            <Icon size={12} color={opt.color} />
                            <span>{opt.label}</span>
                            {isSelected && <Check size={12} style={{ marginLeft: 'auto' }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 8. Tipo de Evento (Dropdown Popover Integrado) */}
              <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>Tipo Evento</span>
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
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      color: lead.eventType ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                    }}>
                      {lead.eventType || '15 Anos'}
                    </span>
                    {!readOnly && <ChevronDown size={12} color="var(--adm-text-muted)" />}
                  </div>

                  {isEventTypeDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
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
                            fontWeight: (lead.eventType || '15 Anos') === opt ? 800 : 500,
                            color: 'var(--adm-text-title)',
                            background: (lead.eventType || '15 Anos') === opt ? 'var(--adm-bg-hover)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = (lead.eventType || '15 Anos') === opt ? 'var(--adm-bg-hover)' : 'transparent'}
                        >
                          <span>{opt}</span>
                          {(lead.eventType || '15 Anos') === opt && <Check size={12} color="var(--adm-accent)" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 9. N° Pessoas */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>N° Pessoas</span>
                <div style={cardValueStyle}>
                  <input
                    type="number"
                    disabled={effectiveReadOnly}
                    placeholder="0 convidados"
                    value={draftEstimatedGuests}
                    onChange={(e) => setDraftEstimatedGuests(e.target.value)}
                    onBlur={() => {
                      const num = draftEstimatedGuests ? parseInt(draftEstimatedGuests, 10) : undefined;
                      handleUpdate({ estimatedGuests: num });
                    }}
                    style={seamlessInputStyle}
                  />
                </div>
              </div>

              {/* 10. Ano Evento */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Ano Evento</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={effectiveReadOnly}
                    placeholder="Ex: 2026, 2027"
                    value={draftEventYear}
                    onChange={(e) => setDraftEventYear(e.target.value)}
                    onBlur={() => {
                      handleUpdate({ eventYear: draftEventYear.trim() || undefined });
                    }}
                    style={seamlessInputStyle}
                  />
                </div>
              </div>

              {/* 11. Nível Urgência */}
              <div data-inspector-dropdown style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>Urgência</span>
                <div style={cardValueStyle}>
                  <div
                    onClick={() => {
                      if (!readOnly) {
                        const next = !isUrgencyDropdownOpen;
                        closeAllDropdowns();
                        setIsUrgencyDropdownOpen(next);
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
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: lead.urgencyLevel === 'baixa' ? '#10B981' : lead.urgencyLevel === 'media' ? '#F59E0B' : lead.urgencyLevel === 'alta' ? '#F97316' : lead.urgencyLevel === 'imediata' ? '#EF4444' : '#94A3B8',
                      }} />
                      <span style={{ fontSize: '0.80rem', fontWeight: 700, color: lead.urgencyLevel ? 'var(--adm-text-title)' : 'var(--adm-text-muted)' }}>
                        {lead.urgencyLevel === 'baixa' ? 'Baixa' : lead.urgencyLevel === 'media' ? 'Média' : lead.urgencyLevel === 'alta' ? 'Alta' : lead.urgencyLevel === 'imediata' ? 'Imediata / Crítica' : 'Não Definida'}
                      </span>
                    </div>
                    {!readOnly && <ChevronDown size={12} color="var(--adm-text-muted)" />}
                  </div>

                  {isUrgencyDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      zIndex: 60,
                      overflow: 'hidden',
                    }}>
                      {URGENCY_OPTIONS.map((opt) => (
                        <div
                          key={opt.key}
                          onClick={() => {
                            handleUpdate({ urgencyLevel: (opt.key as any) || undefined });
                            setIsUrgencyDropdownOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.76rem',
                            fontWeight: ((!lead.urgencyLevel && !opt.key) || lead.urgencyLevel === opt.key) ? 800 : 500,
                            color: 'var(--adm-text-title)',
                            background: ((!lead.urgencyLevel && !opt.key) || lead.urgencyLevel === opt.key) ? 'var(--adm-bg-hover)' : 'transparent',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = ((!lead.urgencyLevel && !opt.key) || lead.urgencyLevel === opt.key) ? 'var(--adm-bg-hover)' : 'transparent'}
                        >
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }} />
                          <span>{opt.label}</span>
                          {((!lead.urgencyLevel && !opt.key) || lead.urgencyLevel === opt.key) && <Check size={12} style={{ marginLeft: 'auto' }} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 14. Decisores */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Decisores</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={effectiveReadOnly}
                    placeholder="Ex: Pais, Noivos, Debutante"
                    value={draftDecisionMakers}
                    onChange={(e) => setDraftDecisionMakers(e.target.value)}
                    onBlur={() => {
                      handleUpdate({ decisionMakers: draftDecisionMakers.trim() || undefined });
                    }}
                    style={seamlessInputStyle}
                  />
                </div>
              </div>

              {/* 15. Bairro */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Bairro</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={effectiveReadOnly}
                    placeholder="Bairro do cliente"
                    value={draftNeighborhood}
                    onChange={(e) => setDraftNeighborhood(e.target.value)}
                    onBlur={() => handleUpdate({ neighborhood: draftNeighborhood.trim() || undefined })}
                    style={seamlessInputStyle}
                  />
                </div>
              </div>

              {/* 16. Profissão */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Profissão</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={effectiveReadOnly}
                    placeholder="Profissão do contratante"
                    value={draftProfession}
                    onChange={(e) => setDraftProfession(e.target.value)}
                    onBlur={() => handleUpdate({ profession: draftProfession.trim() || undefined })}
                    style={seamlessInputStyle}
                  />
                </div>
              </div>

              {/* Campos Personalizados: Seções Comercial e Evento */}
              {renderCustomFieldsForSection('commercial')}
              {renderCustomFieldsForSection('event')}
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
                  </div>
                </div>

                {/* Botão de Decisor do Aniversariante (exibido apenas se outro contato for o decisor atual) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {(lead.contacts || []).some(c => c.isPrimaryDecisionMaker) && !readOnly && (
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
                  )}
                </div>
              </div>

              {/* Telefone */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Telefone</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    value={draftPhone}
                    disabled={effectiveReadOnly}
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
                  {lead.phone && onSelectRecipientPhone && (
                    <button
                      type="button"
                      onClick={() => onSelectRecipientPhone(lead.phone!)}
                      title={selectedRecipientPhone === lead.phone ? "Destinatário ativo no chat" : "Definir este número como destinatário para envio"}
                      style={{
                        background: selectedRecipientPhone === lead.phone ? 'rgba(16, 185, 129, 0.2)' : 'var(--adm-bg-input)',
                        border: `1px solid ${selectedRecipientPhone === lead.phone ? '#10B981' : 'var(--adm-border)'}`,
                        color: selectedRecipientPhone === lead.phone ? '#10B981' : 'var(--adm-text-muted)',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Send size={10} color={selectedRecipientPhone === lead.phone ? '#10B981' : 'var(--adm-text-muted)'} />
                      <span>{selectedRecipientPhone === lead.phone ? 'Ativo' : 'Enviar'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Data de Nascimento / Aniversário */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Aniversário</span>
                <div style={cardValueStyle}>
                  <input
                    type="date"
                    value={draftBirthday}
                    disabled={effectiveReadOnly}
                    onClick={(e) => { try { (e.target as any).showPicker?.(); } catch {} }}
                    onChange={(e) => {
                      setDraftBirthday(e.target.value);
                      handleUpdate({ birthday: e.target.value, debutanteBirthDate: e.target.value });
                    }}
                    style={{
                      ...seamlessInputStyle,
                      cursor: !effectiveReadOnly ? 'pointer' : 'default',
                      color: draftBirthday ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                    }}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Data do Evento */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Data Evento</span>
                <div style={cardValueStyle}>
                  <input
                    type="date"
                    value={lead.eventDate || lead.partyDate || ''}
                    disabled={effectiveReadOnly}
                    onClick={(e) => { try { (e.target as any).showPicker?.(); } catch {} }}
                    onChange={(e) => handleUpdate({ eventDate: e.target.value, partyDate: e.target.value })}
                    style={{
                      ...seamlessInputStyle,
                      cursor: !effectiveReadOnly ? 'pointer' : 'default',
                      color: (lead.eventDate || lead.partyDate) ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                    }}
                    onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              {/* Se o aniversariante for o decisor, exibe E-mail, CPF, Bairro e Endereço contratuais sob demanda */}
              {!(lead.contacts || []).some(c => c.isPrimaryDecisionMaker) && lead.primaryContactRole !== 'none' && (
                <>
                  {/* E-mail */}
                  {(draftEmail || showEmailField) && (
                    <div style={cardRowStyle}>
                      <span style={cardLabelStyle}>E-mail</span>
                      <div style={cardValueStyle}>
                        <input
                          type="email"
                          value={draftEmail}
                          disabled={effectiveReadOnly}
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
                  )}

                  {/* CPF Contratual */}
                  {(draftCpf || showCpfField) && (
                    <div style={cardRowStyle}>
                      <span style={cardLabelStyle}>CPF Contratual</span>
                      <div style={cardValueStyle}>
                        <input
                          type="text"
                          value={draftCpf}
                          disabled={effectiveReadOnly}
                          onChange={(e) => setDraftCpf(e.target.value)}
                          onBlur={() => {
                            if (draftCpf !== (lead.cpf || '')) {
                              handleUpdate({ cpf: draftCpf.trim() });
                            }
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          placeholder="000.000.000-00"
                          style={seamlessInputStyle}
                          onFocus={(e) => { e.target.style.borderBottomColor = 'var(--adm-accent)'; }}
                          onBlurCapture={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Bairro */}
                  {(draftNeighborhood || showNeighborhoodField) && (
                    <div style={cardRowStyle}>
                      <span style={cardLabelStyle}>Bairro</span>
                      <div style={cardValueStyle}>
                        <input
                          type="text"
                          value={draftNeighborhood}
                          disabled={effectiveReadOnly}
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
                  )}

                  {/* Endereço */}
                  {(draftAddress || showAddressField) && (
                    <div style={cardRowStyle}>
                      <span style={cardLabelStyle}>Endereço</span>
                      <div style={cardValueStyle}>
                        <input
                          type="text"
                          value={draftAddress}
                          disabled={effectiveReadOnly}
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
                  )}

                  {/* Botões Rápidos para Adicionar Dados Opcionais Ocultos ao Decisor */}
                  {!effectiveReadOnly && (
                    (!draftEmail && !showEmailField) ||
                    (!draftCpf && !showCpfField) ||
                    (!draftNeighborhood && !showNeighborhoodField) ||
                    (!draftAddress && !showAddressField)
                  ) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '6px', marginTop: '2px', borderTop: '1px dashed var(--adm-border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>+ Adicionar dado:</span>
                      {!draftEmail && !showEmailField && (
                        <button
                          type="button"
                          onClick={() => setShowEmailField(true)}
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.68rem',
                            color: 'var(--adm-text-title)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Plus size={10} /> E-mail
                        </button>
                      )}
                      {!draftCpf && !showCpfField && (
                        <button
                          type="button"
                          onClick={() => setShowCpfField(true)}
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.68rem',
                            color: 'var(--adm-text-title)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Plus size={10} /> CPF
                        </button>
                      )}
                      {!draftNeighborhood && !showNeighborhoodField && (
                        <button
                          type="button"
                          onClick={() => setShowNeighborhoodField(true)}
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.68rem',
                            color: 'var(--adm-text-title)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Plus size={10} /> Bairro
                        </button>
                      )}
                      {!draftAddress && !showAddressField && (
                        <button
                          type="button"
                          onClick={() => setShowAddressField(true)}
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.68rem',
                            color: 'var(--adm-text-title)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Plus size={10} /> Endereço
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Decisor (Checkbox Sim / Não para o Aniversariante) */}
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Decisor</span>
                <div style={cardValueStyle}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: !effectiveReadOnly ? 'pointer' : 'default',
                    userSelect: 'none',
                    padding: '2px 0',
                  }}>
                    <input
                      type="checkbox"
                      disabled={effectiveReadOnly}
                      checked={!(lead.contacts || []).some(c => c.isPrimaryDecisionMaker) && lead.primaryContactRole !== 'none'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSetLeadAsDecisor();
                        } else {
                          const updatedContacts = (lead.contacts || []).map(c => ({ ...c, isPrimaryDecisionMaker: false }));
                          handleUpdate({ contacts: updatedContacts, primaryContactRole: 'none' });
                        }
                      }}
                      style={{
                        cursor: !effectiveReadOnly ? 'pointer' : 'default',
                        accentColor: '#10B981',
                        width: '14px',
                        height: '14px',
                      }}
                    />
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: (!(lead.contacts || []).some(c => c.isPrimaryDecisionMaker) && lead.primaryContactRole !== 'none') ? '#10B981' : 'var(--adm-text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {(!(lead.contacts || []).some(c => c.isPrimaryDecisionMaker) && lead.primaryContactRole !== 'none') ? (
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
                  flexDirection: 'column',
                  gap: '6px',
                  marginTop: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
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

                          {contact.phone && onSelectRecipientPhone && (
                            <button
                              type="button"
                              onClick={() => onSelectRecipientPhone(contact.phone)}
                              title={selectedRecipientPhone === contact.phone ? "Destinatário ativo no chat" : "Definir este contato como destinatário para envio"}
                              style={{
                                background: selectedRecipientPhone === contact.phone ? 'rgba(16, 185, 129, 0.2)' : 'var(--adm-bg-card)',
                                border: `1px solid ${selectedRecipientPhone === contact.phone ? '#10B981' : 'var(--adm-border)'}`,
                                color: selectedRecipientPhone === contact.phone ? '#10B981' : 'var(--adm-text-muted)',
                                borderRadius: '5px',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Send size={9} color={selectedRecipientPhone === contact.phone ? '#10B981' : 'var(--adm-text-muted)'} />
                              <span>{selectedRecipientPhone === contact.phone ? 'Ativo' : 'Enviar'}</span>
                            </button>
                          )}

                          {contact.phone && (
                            <button
                              type="button"
                              onClick={() => handleDirectWhatsApp(contact.phone)}
                              title="Abrir WhatsApp Externo"
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
                      ) : !effectiveReadOnly ? (
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

                      {!effectiveReadOnly && (
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

                  {/* Informações Contratuais do Contato / Decisor (Inline, sem prompt!) */}
                  {(contact.isPrimaryDecisionMaker || contact.cpf || contact.email || contact.address) && (
                    <div style={{
                      marginTop: '4px',
                      padding: '6px 8px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '0.70rem',
                    }}>
                      {/* CPF */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--adm-text-muted)', fontWeight: 600, flexShrink: 0 }}>CPF Contratual:</span>
                        <input
                          type="text"
                          placeholder="000.000.000-00"
                          defaultValue={contact.cpf || ''}
                          disabled={effectiveReadOnly}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (contact.cpf || '')) {
                              const updated = (lead.contacts || []).map(c => c.id === contact.id ? { ...c, cpf: val || undefined } : c);
                              handleUpdate({ contacts: updated });
                            }
                          }}
                          style={{
                            ...seamlessInputStyle,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textAlign: 'right',
                            color: 'var(--adm-text-title)',
                          }}
                        />
                      </div>

                      {/* E-mail */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--adm-text-muted)', fontWeight: 600, flexShrink: 0 }}>E-mail:</span>
                        <input
                          type="email"
                          placeholder="email@contato.com"
                          defaultValue={contact.email || ''}
                          disabled={effectiveReadOnly}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (contact.email || '')) {
                              const updated = (lead.contacts || []).map(c => c.id === contact.id ? { ...c, email: val || undefined } : c);
                              handleUpdate({ contacts: updated });
                            }
                          }}
                          style={{
                            ...seamlessInputStyle,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            textAlign: 'right',
                            color: 'var(--adm-text-title)',
                          }}
                        />
                      </div>

                      {/* Endereço */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--adm-text-muted)', fontWeight: 600, flexShrink: 0 }}>Endereço:</span>
                        <input
                          type="text"
                          placeholder="Endereço do decisor..."
                          defaultValue={contact.address || ''}
                          disabled={effectiveReadOnly}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (contact.address || '')) {
                              const updated = (lead.contacts || []).map(c => c.id === contact.id ? { ...c, address: val || undefined } : c);
                              handleUpdate({ contacts: updated });
                            }
                          }}
                          style={{
                            ...seamlessInputStyle,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            textAlign: 'right',
                            color: 'var(--adm-text-title)',
                          }}
                        />
                      </div>
                    </div>
                  )}
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
                      <input
                        type="text"
                        placeholder="CPF do responsável (opcional)..."
                        value={newContactCpf}
                        onChange={(e) => setNewContactCpf(e.target.value)}
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
                        type="email"
                        placeholder="E-mail do responsável (opcional)..."
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
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
                        placeholder="Endereço do responsável (opcional)..."
                        value={newContactAddress}
                        onChange={(e) => setNewContactAddress(e.target.value)}
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

            {/* ── SEÇÃO 3: 📅 COMPROMISSOS COMERCIAIS (VISITA & DEGUSTAÇÃO) ── */}
            <div style={{ ...sectionTitleStyle, marginTop: '6px' }}>
              <CalendarIcon size={13} color="var(--adm-accent)" />
              <span>Compromissos Comerciais</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* CARD 1: VISITA */}
              <div style={{
                background: 'var(--adm-bg-card)',
                border: `1px solid ${lead.visitCommitment ? (lead.visitCommitment.status === 'completed' ? 'rgba(16, 185, 129, 0.35)' : lead.visitCommitment.status === 'no_show' || lead.visitCommitment.status === 'cancelled' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)') : 'var(--adm-border)'}`,
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarIcon size={14} color="#38BDF8" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      Visita
                    </span>
                  </div>

                  {lead.visitCommitment ? (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: lead.visitCommitment.status === 'completed'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : lead.visitCommitment.status === 'scheduled'
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                      color: lead.visitCommitment.status === 'completed'
                        ? '#10B981'
                        : lead.visitCommitment.status === 'scheduled'
                        ? '#38BDF8'
                        : '#EF4444',
                      border: `1px solid ${lead.visitCommitment.status === 'completed' ? '#10B981' : lead.visitCommitment.status === 'scheduled' ? '#38BDF8' : '#EF4444'}`,
                      textTransform: 'uppercase',
                    }}>
                      {lead.visitCommitment.status === 'completed' ? '✓ Realizada com Sucesso' : lead.visitCommitment.status === 'scheduled' ? 'Agendada' : lead.visitCommitment.status === 'no_show' ? 'Não Compareceu (No-Show)' : 'Cancelada'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                      Não agendada
                    </span>
                  )}
                </div>

                {lead.visitCommitment ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--adm-text-muted)' }}>Data & Horário:</span>
                      <strong style={{ color: 'var(--adm-text-title)' }}>
                        {new Date(lead.visitCommitment.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {lead.visitCommitment.time}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--adm-text-muted)' }}>Pessoas:</span>
                      <span style={{
                        fontWeight: 900,
                        color: '#D4AF37',
                        background: 'rgba(212, 175, 55, 0.15)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}>
                        {lead.visitCommitment.pax} PAX
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--adm-text-muted)' }}>Responsável:</span>
                      <span style={{ color: 'var(--adm-text-body)', fontWeight: 600 }}>
                        {lead.visitCommitment.responsibleName || 'Equipe Comercial'}
                      </span>
                    </div>

                    {!effectiveReadOnly && lead.visitCommitment.status === 'scheduled' && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--adm-border)' }}>
                        <button
                          type="button"
                          onClick={() => setCompletingCommitmentType('visit')}
                          style={{
                            flex: 1,
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#10B981',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Concluir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancellingCommitmentType('visit')}
                          style={{
                            flex: 1,
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#EF4444',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <X size={12} />
                          <span>Não Compareceu</span>
                        </button>
                      </div>
                    )}

                    {!effectiveReadOnly && (lead.visitCommitment.status === 'no_show' || lead.visitCommitment.status === 'cancelled') && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--adm-border)' }}>
                        <button
                          type="button"
                          onClick={() => setScheduleCommitmentType('visit')}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#38BDF8',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Plus size={11} /> Reagendar Visita
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  !effectiveReadOnly && (
                    <button
                      type="button"
                      onClick={() => setScheduleCommitmentType('visit')}
                      style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px dashed rgba(56, 189, 248, 0.4)',
                        color: '#38BDF8',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: 'fit-content',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'; }}
                    >
                      <Plus size={12} />
                      <span>Agendar Visita</span>
                    </button>
                  )
                )}
              </div>

              {/* CARD 2: DEGUSTAÇÃO */}
              <div style={{
                background: 'var(--adm-bg-card)',
                border: `1px solid ${lead.tastingCommitment ? (lead.tastingCommitment.status === 'completed' ? 'rgba(16, 185, 129, 0.35)' : lead.tastingCommitment.status === 'no_show' || lead.tastingCommitment.status === 'cancelled' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(212, 175, 55, 0.35)') : 'var(--adm-border)'}`,
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Utensils size={14} color="#D4AF37" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      Degustação
                    </span>
                  </div>

                  {lead.tastingCommitment ? (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: lead.tastingCommitment.status === 'completed'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : lead.tastingCommitment.status === 'scheduled'
                        ? 'rgba(212, 175, 55, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                      color: lead.tastingCommitment.status === 'completed'
                        ? '#10B981'
                        : lead.tastingCommitment.status === 'scheduled'
                        ? '#D4AF37'
                        : '#EF4444',
                      border: `1px solid ${lead.tastingCommitment.status === 'completed' ? '#10B981' : lead.tastingCommitment.status === 'scheduled' ? '#D4AF37' : '#EF4444'}`,
                      textTransform: 'uppercase',
                    }}>
                      {lead.tastingCommitment.status === 'completed' ? '✓ Realizada com Sucesso' : lead.tastingCommitment.status === 'scheduled' ? 'Agendada' : lead.tastingCommitment.status === 'no_show' ? 'Não Compareceu (No-Show)' : 'Cancelada'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                      Não agendada
                    </span>
                  )}
                </div>

                {lead.tastingCommitment ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--adm-text-muted)' }}>Data & Horário:</span>
                      <strong style={{ color: 'var(--adm-text-title)' }}>
                        {new Date(lead.tastingCommitment.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {lead.tastingCommitment.time}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--adm-text-muted)' }}>Pessoas:</span>
                      <span style={{
                        fontWeight: 900,
                        color: '#D4AF37',
                        background: 'rgba(212, 175, 55, 0.15)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}>
                        {lead.tastingCommitment.pax} PAX
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--adm-text-muted)' }}>Responsável:</span>
                      <span style={{ color: 'var(--adm-text-body)', fontWeight: 600 }}>
                        {lead.tastingCommitment.responsibleName || 'Equipe de Degustação'}
                      </span>
                    </div>

                    {!effectiveReadOnly && lead.tastingCommitment.status === 'scheduled' && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--adm-border)' }}>
                        <button
                          type="button"
                          onClick={() => setCompletingCommitmentType('tasting')}
                          style={{
                            flex: 1,
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#10B981',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Concluir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancellingCommitmentType('tasting')}
                          style={{
                            flex: 1,
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#EF4444',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <X size={12} />
                          <span>Não Compareceu</span>
                        </button>
                      </div>
                    )}

                    {!effectiveReadOnly && (lead.tastingCommitment.status === 'no_show' || lead.tastingCommitment.status === 'cancelled') && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--adm-border)' }}>
                        <button
                          type="button"
                          onClick={() => setScheduleCommitmentType('tasting')}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            background: 'rgba(212, 175, 55, 0.12)',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                            color: '#D4AF37',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Plus size={11} /> Reagendar Degustação
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  !effectiveReadOnly && (
                    <button
                      type="button"
                      onClick={() => setScheduleCommitmentType('tasting')}
                      style={{
                        background: 'rgba(212, 175, 55, 0.1)',
                        border: '1px dashed rgba(212, 175, 55, 0.4)',
                        color: '#D4AF37',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: 'fit-content',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)'; }}
                    >
                      <Plus size={12} />
                      <span>Agendar Degustação</span>
                    </button>
                  )
                )}
              </div>
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
                  background: isReferralLead 
                    ? 'rgba(212, 175, 55, 0.15)' 
                    : (lead.source === 'cadastro_interno' || (lead as any).createdBy) 
                    ? 'rgba(99, 102, 241, 0.12)' 
                    : 'rgba(59, 130, 246, 0.15)',
                  color: isReferralLead 
                    ? '#D4AF37' 
                    : (lead.source === 'cadastro_interno' || (lead as any).createdBy) 
                    ? '#6366F1' 
                    : '#60A5FA',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {isReferralLead ? (
                    <>
                      <Sparkles size={12} /> Indicação de Debutante
                    </>
                  ) : (lead.source === 'cadastro_interno' || (lead as any).createdBy) ? (
                    <>
                      <User size={12} /> Cadastro Manual
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
                  : (lead.source === 'cadastro_interno' || (lead as any).createdBy)
                  ? `Lead cadastrado manualmente no CRM${(lead as any).createdByName ? ` por ${(lead as any).createdByName}` : ''}${lead.sourceName && lead.sourceName !== 'Cadastro Manual' ? ` (Canal informado: ${lead.sourceName})` : ''}.`
                  : leadSource
                  ? `Lead captado através da origem rastreada "${leadSource.name}".`
                  : 'Lead inserido diretamente pela equipe ou formulário institucional.'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--adm-border)' }}>
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
                <div>
                  <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', display: 'block' }}>Data de Entrada no Funil:</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284C7' }}>
                    {lead.funnelEnteredAt || lead.createdAt 
                      ? new Date(lead.funnelEnteredAt || lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Não registrada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco Específico: Cadastro Manual no CRM */}
            {(lead.source === 'cadastro_interno' || (lead as any).createdBy || (lead as any).createdByName) && (
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
                  <User size={16} color="#6366F1" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)', textTransform: 'uppercase' }}>
                    Responsável pelo Cadastro Manual
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#6366F1',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}>
                    Entrada Manual CRM
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
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.1) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: '#6366F1',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {(lead as any).createdByAvatar ? (
                        <img src={(lead as any).createdByAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        ((lead as any).createdByName || 'CM').substring(0, 2).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {(lead as any).createdByName || 'Colaborador Comercial'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                        Cadastrado em {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data não registrada'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', display: 'block' }}>Canal de Origem Declarado</span>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--adm-accent)' }}>
                      {lead.sourceName || 'Cadastro Direto'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

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

      {/* ── MODAL DE AGENDAMENTO COMERCIAL TRAVADO NA GRADE DA UNIDADE ── */}
      {scheduleCommitmentType && (
        <AdminScheduleCommitmentModal
          lead={lead}
          initialType={scheduleCommitmentType}
          onClose={() => setScheduleCommitmentType(null)}
        />
      )}

      {/* ── MODAL DE CONCLUSÃO DE COMPROMISSO (COM FEEDBACK) ── */}
      {completingCommitmentType && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px',
        }}>
          <div style={{
            background: '#121118',
            border: '1px solid #10B981',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '22px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Concluir {completingCommitmentType === 'visit' ? 'Visita Comercial' : 'Degustação Gastronômica'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setCompletingCommitmentType(null); setCompletionFeedback(''); }}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.74rem', color: '#CBD5E1', margin: 0, lineHeight: 1.45 }}>
              Confirma a realização deste compromisso com a família de <strong>{lead.name}</strong>? Este registro ficará salvo perpetuamente na ficha do lead.
            </p>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                Parecer / Feedback da Realização (Opcional)
              </label>
              <textarea
                rows={3}
                value={completionFeedback}
                onChange={(e) => setCompletionFeedback(e.target.value)}
                placeholder="Ex: Família adorou a estrutura do salão e o buffet. Alinharam proposta final..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#1A1824',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => { setCompletingCommitmentType(null); setCompletionFeedback(''); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#94A3B8',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (completingCommitmentType) {
                    await completeCommercialCommitment(lead.id, completingCommitmentType, completionFeedback);
                    setCompletingCommitmentType(null);
                    setCompletionFeedback('');
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#10B981',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} />
                <span>Confirmar Conclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE CANCELAMENTO DE COMPROMISSO ── */}
      {cancellingCommitmentType && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px',
        }}>
          <div style={{
            background: '#121118',
            border: '1px solid #EF4444',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '22px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(239, 68, 68, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <X size={18} color="#EF4444" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Cancelar {cancellingCommitmentType === 'visit' ? 'Visita Comercial' : 'Degustação Gastronômica'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setCancellingCommitmentType(null); setCancellationReason(''); }}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.74rem', color: '#CBD5E1', margin: 0, lineHeight: 1.45 }}>
              Deseja realmente cancelar este compromisso? O horário será liberado na grade e o histórico permanecerá registrado.
            </p>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                Motivo do Cancelamento
              </label>
              <textarea
                rows={2}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ex: Imprevisto familiar da noiva; solicitou reagendamento para o próximo mês..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#1A1824',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => { setCancellingCommitmentType(null); setCancellationReason(''); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#94A3B8',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (cancellingCommitmentType) {
                    await cancelCommercialCommitment(lead.id, cancellingCommitmentType, cancellationReason);
                    setCancellingCommitmentType(null);
                    setCancellationReason('');
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <X size={14} />
                <span>Confirmar Cancelamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE LEAD */}
      {showDeleteConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirmModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--adm-bg-card, #FFFFFF)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid var(--adm-border, #E2E8F0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} color="#EF4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  Excluir Lead
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--adm-text-muted, #64748B)' }}>
                  Esta ação é irreversível
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--adm-text-body, #334155)', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir o lead <strong>"{lead.name}"</strong>? Todo o histórico de atendimentos, tarefas e dados associados serão removidos.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-input, #F8FAFC)',
                  color: 'var(--adm-text-title, #334155)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDeleteConfirmModal(false);
                  await deleteLead(lead.id);
                  if (onToggleCollapse) onToggleCollapse();
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
