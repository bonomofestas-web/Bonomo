import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronDown, ChevronLeft, ChevronRight, X, Plus, Trash2, Zap, Copy, 
  ShieldAlert, Sparkles, AlertTriangle, Building2, FileText, Settings,
  Calendar, Tag, Sliders,
  ArrowLeft, Edit2, CheckSquare, Type, Hash, ListFilter
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ICP_SITUATION_CONFIG } from '../../types/admin';
import { AdminFunnelDeleteModal } from './AdminFunnelDeleteModal';
import { SafeAvatar } from './SafeAvatar';
import { formatPhone } from '../../utils/phoneFormatter';
import { 
  FUNNEL_AND_STAGE_ICONS, 
  renderFunnelOrStageIcon, 
  FunnelIconPicker 
} from '../../utils/funnelIconLibrary';
import type { 
  FunnelStageConfig, 
  FunnelDuplicateRuleConfig,
  FunnelCustomField,
  FunnelCustomFieldSection,
  FunnelFieldType,
  MqlQuestion,
  MqlOption,
  MqlOptionSituation 
} from '../../types/admin';

interface AdminFunnelSettingsViewProps {
  initialFunnelId?: string;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

const STAGE_COLORS = [
  '#94A3B8', // Slate / Grey
  '#3B82F6', // Blue
  '#EAB308', // Yellow
  '#F97316', // Orange
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#EF4444', // Red
];

export const STAGE_ICON_OPTIONS = FUNNEL_AND_STAGE_ICONS;

export const renderStageIcon = (iconName?: string, size = 14, color = 'currentColor') => {
  return renderFunnelOrStageIcon(iconName, size, color, 'layers');
};

const ENTRY_STAGE_DEF: FunnelStageConfig = {
  id: 'new_lead',
  name: 'NOVO LEAD',
  color: '#EF4444',
  icon: 'inbox',
  isFixed: true,
  order: 0,
};

export const AdminFunnelSettingsView: React.FC<AdminFunnelSettingsViewProps> = ({
  initialFunnelId,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const { 
    currentUser,
    collaborators,
    funnels, 
    venues,
    sources,
    leads,
    mqlQuestions,
    addMqlQuestion,
    updateMqlQuestion,
    deleteMqlQuestion,
    updateLeadStage,
    updateFunnel, 
    deleteFunnelWithLeadMigration,
    duplicateFunnel
  } = useAdminState();

  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() => {
    return initialFunnelId || funnels[0]?.id || '';
  });

  useEffect(() => {
    if (initialFunnelId) {
      setSelectedFunnelId(initialFunnelId);
    }
  }, [initialFunnelId]);

  const activeFunnel = useMemo(() => {
    let found = funnels.find(f => f.id === selectedFunnelId);
    if (!found && selectedFunnelId?.startsWith('post_sale')) {
      found = funnels.find(f => f.isPostSale || f.category === 'Pós-Venda' || f.name?.toLowerCase().includes('pós-venda'));
    }
    return found || funnels[0];
  }, [funnels, selectedFunnelId]);

  // Role / Permission Control: Master or Venue Admin
  const canConfigure = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'master') return true;
    if (currentUser.role === 'admin') {
      if (!activeFunnel?.venueId || activeFunnel.venueId === 'all') return true;
      return currentUser.venueIds?.includes(activeFunnel.venueId) ?? false;
    }
    return false;
  }, [currentUser, activeFunnel]);

  // Local Form states (Only saved when clicking "Salvar")
  const [funnelName, setFunnelName] = useState('');
  const [funnelIcon, setFunnelIcon] = useState('target');
  const [funnelBadgeColor, setFunnelBadgeColor] = useState('#3B82F6');
  const [funnelDescription, setFunnelDescription] = useState('');
  const [isFunnelIconPickerOpen, setIsFunnelIconPickerOpen] = useState(false);
  const [isEntryStageActive, setIsEntryStageActive] = useState(false);
  const [isWonStageEnabled, setIsWonStageEnabled] = useState(true);
  const [distributionMode, setDistributionMode] = useState<'manual' | 'round_robin'>('manual');
  const [assignedSdrIds, setAssignedSdrIds] = useState<string[]>([]);
  const [venueDistributionConfig, setVenueDistributionConfig] = useState<Record<string, {
    distributionMode?: 'manual' | 'round_robin' | 'inherit';
    assignedSdrIds?: string[];
    priorityWhatsappSourceId?: string;
  }>>({});
  const [detectDuplicates, setDetectDuplicates] = useState(true);
  const [duplicateRuleConfig, setDuplicateRuleConfig] = useState<FunnelDuplicateRuleConfig>({
    matchPhone: true,
    matchEmail: false,
    matchName: false,
    action: 'keep_recent',
  });
  const [stages, setStages] = useState<FunnelStageConfig[]>([]);
  const [activeEditingHintStageId, setActiveEditingHintStageId] = useState<string | null>(null);
  const [activeIconPickerStageId, setActiveIconPickerStageId] = useState<string | null>(null);

  // Estados de Gatilhos / Automação da Etapa
  const [activeTriggerStageId, setActiveTriggerStageId] = useState<string | null>(null);
  const [selectedTargetFunnelId, setSelectedTargetFunnelId] = useState<string>('');
  const [selectedTargetStageId, setSelectedTargetStageId] = useState<string>('');
  const [defaultWhatsAppSourceId, setDefaultWhatsAppSourceId] = useState<string>('');
  const [priorityWhatsappPerVenue, setPriorityWhatsappPerVenue] = useState<Record<string, string>>({});
  
  // Custom Funnel Data: Packages, Payments, Tags & Custom Fields
  const [packageOptions, setPackageOptions] = useState<string[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [predefinedTags, setPredefinedTags] = useState<string[]>([]);
  const [allowCollaboratorsCreateTags, setAllowCollaboratorsCreateTags] = useState<boolean>(false);
  const [customFields, setCustomFields] = useState<FunnelCustomField[]>([]);
  const [isCustomDataModalOpen, setIsCustomDataModalOpen] = useState(false);
  const [customDataModalView, setCustomDataModalView] = useState<'hub' | 'tags' | 'add_field' | 'edit_field'>('hub');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FunnelFieldType>('text');
  const [newFieldSection, setNewFieldSection] = useState<FunnelCustomFieldSection>('priority');
  const [newCustomSectionName, setNewCustomSectionName] = useState('');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Modals state
  const [isDuplicateRulesModalOpen, setIsDuplicateRulesModalOpen] = useState(false);
  const [isQualificationModalOpen, setIsQualificationModalOpen] = useState(false);
  const [isMigrateEntryLeadsModalOpen, setIsMigrateEntryLeadsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [migrationTargetStageId, setMigrationTargetStageId] = useState('');

  // Qualification Sub-Modal State
  const [isAddingQuestionModalOpen, setIsAddingQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionTitleInput, setQuestionTitleInput] = useState('');
  const [questionDescInput, setQuestionDescInput] = useState('');
  const [questionVenueIdInput, setQuestionVenueIdInput] = useState<string>('all');
  const [questionOptionsInput, setQuestionOptionsInput] = useState<Array<{ situation: MqlOptionSituation; label: string }>>([
    { situation: 'ideal', label: '' },
    { situation: 'good', label: '' },
    { situation: 'medium', label: '' },
    { situation: 'bad', label: '' },
  ]);

  // Inline Stage Creation State
  const [insertingStageAtIndex, setInsertingStageAtIndex] = useState<number | null>(null);
  const [newStageInputText, setNewStageInputText] = useState('');

  // Horizontal Pan / Drag-to-Scroll
  const pipelineScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, button, textarea, select, a, [data-no-drag]')) return;
    if (!pipelineScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - pipelineScrollRef.current.offsetLeft);
    setScrollLeftState(pipelineScrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !pipelineScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - pipelineScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.35;
    pipelineScrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const isPostSale = Boolean(
    activeFunnel?.isPostSale || 
    activeFunnel?.category === 'Pós-Venda' || 
    activeFunnel?.name?.toLowerCase().includes('pós-venda') || 
    selectedFunnelId?.startsWith('post_sale')
  );

  const defaultStages: FunnelStageConfig[] = useMemo(() => {
    if (isPostSale) {
      return [
        { id: 'onboarding', name: 'Onboarding & Boas-Vindas', color: '#3B82F6', icon: 'shield', isFixed: true, order: 0 },
        { id: 'planning', name: 'Planejamento & Cronograma', color: '#F59E0B', icon: 'calendar', order: 1 },
        { id: 'suppliers', name: 'Definição de Fornecedores', color: '#8B5CF6', icon: 'award', order: 2 },
        { id: 'final_alignment', name: 'Alinhamento Final (Reta Final)', color: '#6366F1', icon: 'clock', order: 3 },
        { id: 'party_day', name: 'Semana da Festa / Evento', color: '#EAB308', icon: 'award', order: 4 },
        { id: 'completed', name: 'Festa Realizada', color: '#10B981', icon: 'dollar', isFixed: true, isWon: true, order: 5 },
      ];
    }
    return [
      ENTRY_STAGE_DEF,
      { id: 'in_negotiation', name: 'EM NEGOCIAÇÃO', color: '#3B82F6', icon: 'clock', order: 1 },
      { id: 'scheduled', name: 'AGENDADO', color: '#EAB308', icon: 'calendar', order: 2 },
      { id: 'decision', name: 'EM ANÁLISE / DEGUSTAÇÃO', color: '#F97316', icon: 'award', order: 3 },
      { id: 'deal_closed', name: 'GANHO', color: '#10B981', icon: 'dollar', isFixed: true, isWon: true, order: 4 },
      { id: 'lost', name: 'PERDIDO', color: '#EF4444', icon: 'x-circle', isFixed: true, isLoss: true, order: 5 },
    ];
  }, [isPostSale]);

  useEffect(() => {
    if (!activeFunnel) return;
    setFunnelName(activeFunnel.name || '');
    setFunnelIcon(activeFunnel.icon || (isPostSale ? 'shield-check' : 'target'));
    setFunnelBadgeColor(activeFunnel.badgeColor || '#3B82F6');
    setFunnelDescription(activeFunnel.description || '');
    const entryActive = Boolean(activeFunnel.isEntryStageActive);
    setIsEntryStageActive(entryActive);
    setIsWonStageEnabled(activeFunnel.isWonStageEnabled !== false);
    setDistributionMode(activeFunnel.distributionMode || 'manual');
    setAssignedSdrIds(activeFunnel.assignedSdrIds || []);
    setDetectDuplicates(activeFunnel.detectDuplicates !== false);
    setDuplicateRuleConfig(activeFunnel.duplicateRuleConfig || {
      matchPhone: true,
      matchEmail: false,
      matchName: false,
      action: 'keep_recent',
    });
    setPackageOptions(activeFunnel.packageOptions || []);
    setPaymentOptions(activeFunnel.paymentOptions || []);
    setPredefinedTags(activeFunnel.predefinedTags || []);
    setAllowCollaboratorsCreateTags(Boolean(activeFunnel.allowCollaboratorsCreateTags));
    setCustomFields(activeFunnel.customFields || []);
    setDefaultWhatsAppSourceId((activeFunnel as any)?.defaultWhatsAppSourceId || '');
    const initialPriorities: Record<string, string> = {
      ...((activeFunnel as any)?.priorityWhatsappPerVenue || {}),
    };
    if (activeFunnel.venueDistributionConfig) {
      Object.entries(activeFunnel.venueDistributionConfig).forEach(([vId, vConf]) => {
        if (vConf?.priorityWhatsappSourceId) {
          initialPriorities[vId] = vConf.priorityWhatsappSourceId;
        }
      });
    }
    setPriorityWhatsappPerVenue(initialPriorities);
    setVenueDistributionConfig(activeFunnel.venueDistributionConfig || {});
    
    if (activeFunnel.stages && activeFunnel.stages.length > 0) {
      let loadedStages = [...activeFunnel.stages];
      if (entryActive && !loadedStages.some(s => s.id === 'new_lead' || s.id === 'onboarding' || s.name.toLowerCase().includes('entrada'))) {
        loadedStages = [ENTRY_STAGE_DEF, ...loadedStages];
      }
      setStages(loadedStages.map((st, idx) => ({
        ...st,
        order: idx,
        color: st.color || STAGE_COLORS[idx % STAGE_COLORS.length],
      })));
    } else {
      setStages(defaultStages);
    }
  }, [activeFunnel, defaultStages, isPostSale]);

  // Leads in entry stage for this specific funnel
  const leadsInEntryStage = useMemo(() => {
    if (!activeFunnel) return [];
    return leads.filter(l => {
      const matchesFunnel = l.funnelId === activeFunnel.id || (!l.funnelId && (activeFunnel.venueId === 'all' || l.venueId === activeFunnel.venueId));
      const stageStr = l.stage as string;
      const isEntry = stageStr === 'new_lead' || stageStr === 'onboarding' || stageStr === stages[0]?.id;
      return matchesFunnel && isEntry;
    });
  }, [leads, activeFunnel, stages]);

  const handleToggleEntryStage = (checked: boolean) => {
    if (!checked && leadsInEntryStage.length > 0) {
      const firstAvailableStage = stages.find(s => s.id !== 'new_lead' && s.id !== 'onboarding' && !s.name.toLowerCase().includes('entrada'));
      setMigrationTargetStageId(firstAvailableStage?.id || stages[1]?.id || 'in_negotiation');
      setIsMigrateEntryLeadsModalOpen(true);
      return;
    }
    setIsEntryStageActive(checked);
    if (checked) {
      setStages(prev => {
        const hasEntry = prev.some(s => s.id === 'new_lead' || s.id === 'onboarding' || s.name.toLowerCase().includes('entrada'));
        if (hasEntry) return prev;
        return [ENTRY_STAGE_DEF, ...prev.map((s, idx) => ({ ...s, order: idx + 1 }))];
      });
    }
  };

  const handleConfirmMigrationAndDisableEntry = () => {
    if (!migrationTargetStageId) return;
    leadsInEntryStage.forEach(l => {
      updateLeadStage(l.id, migrationTargetStageId as any);
    });
    setIsEntryStageActive(false);
    setIsMigrateEntryLeadsModalOpen(false);
  };

  const handleSave = () => {
    if (!activeFunnel) return;

    let finalStages = [...stages];
    if (isEntryStageActive) {
      const hasEntry = finalStages.some(s => s.id === 'new_lead' || s.id === 'onboarding' || s.name.toLowerCase().includes('entrada'));
      if (!hasEntry) {
        finalStages = [ENTRY_STAGE_DEF, ...finalStages];
      }
    } else {
      finalStages = finalStages.filter(s => s.id !== 'new_lead' && s.id !== 'onboarding' && !s.name.toLowerCase().includes('entrada'));
    }
    finalStages = finalStages.map((s, idx) => ({
      ...s,
      name: (s.name || '').trim().toUpperCase(),
      order: idx,
    }));

    updateFunnel(activeFunnel.id, {
      name: funnelName.trim() || activeFunnel.name,
      icon: funnelIcon,
      badgeColor: funnelBadgeColor,
      description: funnelDescription,
      isEntryStageActive,
      isWonStageEnabled,
      distributionMode,
      assignedSdrIds,
      venueDistributionConfig,
      detectDuplicates,
      duplicateRuleConfig,
      stages: finalStages,
      stagesCount: finalStages.length,
      packageOptions,
      paymentOptions,
      predefinedTags,
      allowCollaboratorsCreateTags,
      customFields,
      defaultWhatsAppSourceId,
      priorityWhatsappPerVenue,
    } as any);
    if (onSaved) onSaved();
    onClose();
  };

  const handleDuplicate = () => {
    if (!activeFunnel) return;
    const newId = duplicateFunnel(activeFunnel.id);
    if (newId) {
      alert(`Funil duplicado com sucesso!`);
      setSelectedFunnelId(newId);
    }
  };

  const handleDeleteFunnel = async (destinationFunnelId: string, stageMapping: Record<string, string>) => {
    if (!activeFunnel) return;
    const res = await deleteFunnelWithLeadMigration(activeFunnel.id, destinationFunnelId, stageMapping);
    if (res.success) {
      setIsDeleteModalOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        if (onSaved) onSaved();
        const remainingFunnels = funnels.filter(f => f.id !== activeFunnel.id);
        const nextFunnelId = destinationFunnelId || remainingFunnels[0]?.id || '';
        setSelectedFunnelId(nextFunnelId);
        onClose();
      }
    }
  };

  // Inline Stage Commit
  const handleCommitNewStage = (index: number) => {
    const trimmed = newStageInputText.trim();
    if (!trimmed) {
      setInsertingStageAtIndex(null);
      setNewStageInputText('');
      return;
    }
    const color = STAGE_COLORS[index % STAGE_COLORS.length];
    const newStage: FunnelStageConfig = {
      id: `stage_${Date.now()}`,
      name: trimmed.toUpperCase(),
      color,
      order: index,
      hints: '',
      triggers: [],
    };
    const nextStages = [...stages];
    nextStages.splice(index, 0, newStage);
    setStages(nextStages.map((s, idx) => ({ ...s, order: idx })));
    setInsertingStageAtIndex(null);
    setNewStageInputText('');
  };

  const handleDeleteStage = (stageId: string) => {
    const target = stages.find(s => s.id === stageId);
    if (target?.isFixed) {
      alert('Esta é uma etapa padrão essencial do funil e não pode ser excluída.');
      return;
    }
    if (confirm(`Deseja remover a etapa "${target?.name}"?`)) {
      setStages(prev => prev.filter(s => s.id !== stageId));
    }
  };

  const handleMoveStage = (stageId: string, direction: 'left' | 'right') => {
    setStages(prev => {
      const stageIdx = prev.findIndex(s => s.id === stageId);
      if (stageIdx === -1) return prev;
      const targetIdx = direction === 'left' ? stageIdx - 1 : stageIdx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const next = [...prev];
      const temp = next[stageIdx];
      next[stageIdx] = next[targetIdx];
      next[targetIdx] = temp;

      return next.map((s, idx) => ({ ...s, order: idx }));
    });
  };

  const handleSaveHint = (stageId: string, hint: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, hints: hint } : s));
    setActiveEditingHintStageId(null);
  };

  // Verifica se uma instância de WhatsApp está efetivamente conectada/online
  const isSourceOnline = (src?: any): boolean => {
    if (!src) return false;
    const config = (src.configuration as any) || {};
    if (src.status === 'inactive') return false;
    if (config.connectionStatus === 'disconnected' || config.isConnected === false) return false;
    if (config.connectionStatus === 'connected' || config.isConnected === true) return true;
    return Boolean(config.connectedPhone && config.connectionStatus !== 'disconnected');
  };

  // Qualification Questions for this Funnel
  const displayedQualificationQuestions = useMemo(() => {
    if (!activeFunnel) return [];
    return mqlQuestions.filter(q => 
      (q.funnelIds && q.funnelIds.includes(activeFunnel.id)) ||
      q.funnelId === activeFunnel.id ||
      (!q.funnelId && (!q.funnelIds || q.funnelIds.length === 0) && (q.venueId === 'all' || q.venueId === activeFunnel.venueId))
    );
  }, [mqlQuestions, activeFunnel]);

  const handleOpenAddQuestionModal = () => {
    setEditingQuestionId(null);
    setQuestionTitleInput('');
    setQuestionDescInput('');
    setQuestionVenueIdInput(activeFunnel?.venueId && activeFunnel.venueId !== 'all' ? activeFunnel.venueId : 'all');
    setQuestionOptionsInput([
      { situation: 'ideal', label: '' },
      { situation: 'good', label: '' },
      { situation: 'medium', label: '' },
      { situation: 'bad', label: '' },
    ]);
    setIsAddingQuestionModalOpen(true);
  };

  const handleOpenEditQuestionModal = (q: MqlQuestion) => {
    setEditingQuestionId(q.id);
    setQuestionTitleInput(q.title);
    setQuestionDescInput(q.description || '');
    setQuestionVenueIdInput(q.venueId || (q.venueIds && q.venueIds[0]) || 'all');
    setQuestionOptionsInput([
      { situation: 'ideal', label: q.options.find(o => o.situation === 'ideal' || o.points >= 90)?.label || '' },
      { situation: 'good', label: q.options.find(o => o.situation === 'good' || (o.points >= 65 && o.points < 90))?.label || '' },
      { situation: 'medium', label: q.options.find(o => o.situation === 'medium' || (o.points >= 30 && o.points < 65))?.label || '' },
      { situation: 'bad', label: q.options.find(o => o.situation === 'bad' || o.points < 30)?.label || '' },
    ]);
    setIsAddingQuestionModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionTitleInput.trim()) {
      alert('Preencha o título da pergunta.');
      return;
    }
    const filled = questionOptionsInput.filter(o => o.label.trim().length > 0);
    if (filled.length < 2) {
      alert('Preencha pelo menos 2 situações de resposta.');
      return;
    }

    const finalOptions: MqlOption[] = questionOptionsInput
      .filter(o => o.label.trim().length > 0)
      .map((o, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        label: o.label.trim(),
        situation: o.situation,
        points: ICP_SITUATION_CONFIG[o.situation].points,
      }));

    if (editingQuestionId) {
      updateMqlQuestion(editingQuestionId, {
        title: questionTitleInput.trim(),
        description: questionDescInput.trim() || undefined,
        options: finalOptions,
        funnelId: activeFunnel?.id,
        funnelIds: activeFunnel ? [activeFunnel.id] : [],
        venueId: questionVenueIdInput,
        venueIds: questionVenueIdInput === 'all' ? [] : [questionVenueIdInput],
        profileName: `Qualificação - ${activeFunnel?.name || 'Funil'}`,
      });
    } else {
      addMqlQuestion({
        funnelId: activeFunnel?.id,
        funnelIds: activeFunnel ? [activeFunnel.id] : [],
        venueId: questionVenueIdInput,
        venueIds: questionVenueIdInput === 'all' ? [] : [questionVenueIdInput],
        profileName: `Qualificação - ${activeFunnel?.name || 'Funil'}`,
        title: questionTitleInput.trim(),
        description: questionDescInput.trim() || undefined,
        options: finalOptions,
        order: displayedQualificationQuestions.length,
      });
    }

    setIsAddingQuestionModalOpen(false);
  };

  const displayedStages = useMemo(() => {
    let list = isEntryStageActive ? stages : stages.filter((s, idx) => {
      if (idx === 0 && (s.id === 'new_lead' || s.id === 'onboarding' || s.name.toLowerCase().includes('entrada'))) {
        return false;
      }
      return true;
    });
    if (!isWonStageEnabled) {
      list = list.filter(s => !s.isWon && s.id !== 'deal_closed' && s.id !== 'contrato_fechado');
    }
    return list;
  }, [stages, isEntryStageActive, isWonStageEnabled]);

  const handleSaveTransferTrigger = (stageId: string) => {
    if (!selectedTargetFunnelId) return;
    const newTrigger = {
      id: `trig_${Date.now()}`,
      type: 'move_to_funnel' as const,
      label: 'Transferência de Funil',
      targetFunnelId: selectedTargetFunnelId,
      targetStageId: selectedTargetStageId,
    };
    setStages(prev => prev.map(s => {
      if (s.id !== stageId) return s;
      const existing = (s.triggers || []).filter(t => t.type !== 'move_to_funnel');
      return {
        ...s,
        triggers: [...existing, newTrigger],
      };
    }));
    setActiveTriggerStageId(null);
  };

  const handleRemoveTrigger = (stageId: string, triggerId: string) => {
    setStages(prev => prev.map(s => {
      if (s.id !== stageId) return s;
      return {
        ...s,
        triggers: (s.triggers || []).filter(t => t.id !== triggerId),
      };
    }));
  };

  if (!canConfigure) {
    return (
      <div style={{
        padding: '60px 24px',
        textAlign: 'center',
        background: 'var(--adm-bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--adm-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#EF4444',
        }}>
          <ShieldAlert size={28} />
        </div>
        <div style={{ maxWidth: '420px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0' }}>
            Acesso Restrito
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Apenas a Diretoria (Master), Desenvolvedores ou Gerentes autorizados têm permissão para configurar este funil.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            color: 'var(--adm-text-title)',
            padding: '8px 20px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Voltar ao Funil
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      color: 'var(--adm-text-body)',
      background: 'var(--adm-bg-app)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* ── TOP HEADER BAR (KOMMO REPLICA) ── */}
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
        {/* Left: Funnel Icon + Funnel Title Editable Input & Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Funnel Icon Picker Trigger */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsFunnelIconPickerOpen(!isFunnelIconPickerOpen)}
                title="Clique para alterar o ícone do funil"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${funnelBadgeColor || '#3B82F6'}18`,
                  border: `1.5px solid ${funnelBadgeColor || '#3B82F6'}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: funnelBadgeColor || '#3B82F6',
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: `0 2px 10px ${funnelBadgeColor || '#3B82F6'}25`,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.06)';
                  e.currentTarget.style.borderColor = funnelBadgeColor || '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = `${funnelBadgeColor || '#3B82F6'}55`;
                }}
              >
                {renderFunnelOrStageIcon(funnelIcon, 18, funnelBadgeColor || '#3B82F6')}
              </button>

              {isFunnelIconPickerOpen && (
                <FunnelIconPicker
                  selectedIcon={funnelIcon}
                  onSelectIcon={(iconId) => setFunnelIcon(iconId)}
                  onClose={() => setIsFunnelIconPickerOpen(false)}
                  accentColor={funnelBadgeColor || 'var(--adm-accent, #3B82F6)'}
                  title="Ícone Principal do Funil"
                />
              )}
            </div>

            <input
              type="text"
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              placeholder="Nome do Funil"
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                borderBottom: '1px dashed var(--adm-border)',
                color: 'var(--adm-text-title)',
                fontSize: '1.05rem',
                fontWeight: 900,
                letterSpacing: '-0.2px',
                padding: '4px 8px',
                borderRadius: '6px',
                outline: 'none',
                minWidth: '200px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--adm-accent)';
                e.currentTarget.style.background = 'var(--adm-bg-input)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.borderBottom = '1px dashed var(--adm-border)';
                e.currentTarget.style.background = 'transparent';
              }}
            />

            {/* Quick Color Palette Trigger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
              {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#D4AF37'].map(color => (
                <button
                  key={color}
                  type="button"
                  title={`Definir cor do funil: ${color}`}
                  onClick={() => setFunnelBadgeColor(color)}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: color,
                    border: funnelBadgeColor === color ? '2px solid #FFFFFF' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: funnelBadgeColor === color ? `0 0 6px ${color}` : 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.12s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
          </div>

          {!isPostSale && (
            <>
              <button
                type="button"
                onClick={handleDuplicate}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--adm-text-title)';
                  e.currentTarget.style.borderColor = 'var(--adm-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--adm-text-muted)';
                  e.currentTarget.style.borderColor = 'var(--adm-border)';
                }}
              >
                <Copy size={13} />
                <span>Duplicar Funil</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  opacity: 0.55,
                  fontSize: '0.74rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = '#EF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.55';
                  e.currentTarget.style.color = 'var(--adm-text-muted)';
                }}
              >
                Excluir funil
              </button>
            </>
          )}
        </div>

        {/* Right: Voltar (Descartar) & Salvar Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 12px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--adm-text-title)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              background: 'var(--adm-accent, #3B82F6)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 22px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(59, 130, 246, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            Salvar
          </button>
        </div>
      </div>

      {/* ── BODY: LEFT CONFIG PANEL + RIGHT PIPELINE GRID ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── LEFT PANEL (REORDENADO: 1. OPERACIONAIS -> 2. QUALIFICAÇÃO/CAMPOS -> 3. DISTRIBUIÇÃO) ── */}
        <div style={{
          width: '300px',
          borderRight: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-card)',
          overflowY: 'auto',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          flexShrink: 0,
        }}>
          
          {/* ── 1. CONFIGURAÇÕES OPERACIONAIS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              1. CONFIGURAÇÕES OPERACIONAIS
            </div>

            {/* Etapa de leads de entrada Toggle */}
            <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Etapa de leads de entrada</span>
                <input 
                  type="checkbox" 
                  checked={isEntryStageActive} 
                  onChange={(e) => handleToggleEntryStage(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--adm-accent, #3B82F6)' }} 
                />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.35 }}>
                Mantenha seu funil {isPostSale ? 'de clientes' : 'de vendas'} mais limpo, adicionando esta etapa pré-funil.
              </p>
              {leadsInEntryStage.length > 0 && !isEntryStageActive && (
                <div style={{ fontSize: '0.68rem', color: '#EAB308', fontWeight: 700, marginTop: '2px' }}>
                  ⚠️ {leadsInEntryStage.length} leads aguardando migração
                </div>
              )}
            </div>

            {/* Habilitar Etapa de Ganho no Funil */}
            <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Habilitar Etapa de Ganho</span>
                <input 
                  type="checkbox" 
                  checked={isWonStageEnabled} 
                  onChange={(e) => setIsWonStageEnabled(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--adm-accent, #3B82F6)' }} 
                />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.35 }}>
                {isWonStageEnabled 
                  ? 'Este funil permite conclusão de vendas (etapa Ganho ativa).' 
                  : 'Funil de Passagem / Qualificação: leads são apenas qualificados e transferidos ou dados como perda.'}
              </p>
            </div>

            {/* Controle duplicado */}
            <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Controle duplicado</span>
                <input 
                  type="checkbox" 
                  checked={detectDuplicates} 
                  onChange={(e) => setDetectDuplicates(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--adm-accent, #3B82F6)' }} 
                />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.35 }}>
                Identifica automaticamente leads com mesmo telefone ou e-mail.
              </p>
              <button 
                type="button" 
                onClick={() => setIsDuplicateRulesModalOpen(true)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent, #3B82F6)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Configurar regras</span>
                <ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          </div>

          {/* ── 2. QUALIFICAÇÃO / ICP & CAMPOS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--adm-border)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              2. QUALIFICAÇÃO & CAMPOS
            </div>

            {/* Qualificação / ICP */}
            {!isPostSale && (
              <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    Perfil ICP por Unidade
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: displayedQualificationQuestions.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: displayedQualificationQuestions.length > 0 ? '#10B981' : '#EF4444',
                  }}>
                    {displayedQualificationQuestions.length > 0 ? `${displayedQualificationQuestions.length} Perguntas` : 'Desativado'}
                  </span>
                </div>
                
                <p style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.35 }}>
                  Perguntas de qualificação e cálculo de pontuação ICP específicas por casa de festas.
                </p>

                <button 
                  type="button" 
                  onClick={() => setIsQualificationModalOpen(true)} 
                  style={{ 
                    background: 'var(--adm-accent-bg, rgba(59, 130, 246, 0.1))', 
                    border: '1px solid var(--adm-accent, #3B82F6)', 
                    color: 'var(--adm-accent, #3B82F6)', 
                    fontSize: '0.74rem', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    padding: '7px 10px', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '2px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Sliders size={13} />
                  <span>Configurar ICP do Funil</span>
                </button>
              </div>
            )}

            {/* Custom Data, Fields & Tags */}
            <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  Campos & Tags
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(212, 175, 55, 0.15)',
                  color: '#D4AF37',
                }}>
                  {customFields.length + predefinedTags.length} Itens
                </span>
              </div>
              
              <p style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.35 }}>
                Configure tags recomendadas e campos personalizados para este funil.
              </p>

              <button 
                type="button" 
                onClick={() => {
                  setCustomDataModalView('hub');
                  setIsCustomDataModalOpen(true);
                }} 
                style={{ 
                  background: 'var(--adm-bg-card)', 
                  border: '1px solid var(--adm-border)', 
                  color: 'var(--adm-text-title)', 
                  fontSize: '0.74rem', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  padding: '7px 10px', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '2px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Tag size={13} color="var(--adm-accent)" />
                <span>Gerenciar Campos & Tags</span>
              </button>
            </div>
          </div>

          {/* ── 3. UNIDADES ── */}
          {!isPostSale && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--adm-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} style={{ color: 'var(--adm-accent, #3B82F6)' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    3. UNIDADES
                  </span>
                </div>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--adm-accent)',
                }}>
                  {(() => {
                    const targetVenues = (!activeFunnel || activeFunnel.venueId === 'all' || !activeFunnel.venueId)
                      ? venues.filter(v => v.active !== false)
                      : venues.filter(v => v.id === activeFunnel.venueId);
                    return `${targetVenues.length} ${targetVenues.length === 1 ? 'Unidade' : 'Unidades'}`;
                  })()}
                </span>
              </div>

              {(() => {
                const targetVenues = (!activeFunnel || activeFunnel.venueId === 'all' || !activeFunnel.venueId)
                  ? venues.filter(v => v.active !== false)
                  : venues.filter(v => v.id === activeFunnel.venueId);

                if (targetVenues.length === 0) {
                  return (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed var(--adm-border)',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      color: 'var(--adm-text-muted)',
                    }}>
                      Nenhuma casa vinculada.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {targetVenues.map(venue => {
                      const venueSources = (sources || []).filter(s => s.venueId === venue.id);
                      const venueWhatsappSources = venueSources.filter(
                        s => s.type === 'whatsapp_api' || (s as any).channelType === 'whatsapp' || s.name.toLowerCase().includes('whatsapp')
                      );

                      const venueConfig = venueDistributionConfig[venue.id] || {};
                      const venueDistMode = venueConfig.distributionMode || 'manual';
                      const venueSdrIds = venueConfig.assignedSdrIds || [];
                      const displayCollaborators = collaborators.filter(c => c.active !== false);

                      return (
                        <div
                          key={venue.id}
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={13} color="var(--adm-accent)" />
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                {venue.name}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                              {venueSources.length} {venueSources.length === 1 ? 'origem' : 'origens'}
                            </span>
                          </div>

                          {/* Origens Vinculadas */}
                          {venueSources.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                                Origens da Casa
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {venueSources.map(s => (
                                  <span
                                    key={s.id}
                                    style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'var(--adm-bg-card)',
                                      border: '1px solid var(--adm-border)',
                                      color: 'var(--adm-text-title)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: s.type === 'whatsapp_api' ? '#10B981' : '#3B82F6' }} />
                                    <span>{s.name}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* WhatsApp da Unidade */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                              WhatsApp da Casa
                            </span>
                            {venueWhatsappSources.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {(() => {
                                  const onlineWhatsappSources = venueWhatsappSources.filter(s => isSourceOnline(s));
                                  const storedPriorityId = priorityWhatsappPerVenue[venue.id] || venueConfig.priorityWhatsappSourceId;
                                  const isStoredOnline = onlineWhatsappSources.some(s => s.id === storedPriorityId);
                                  const effectivePriorityId = isStoredOnline ? storedPriorityId : (onlineWhatsappSources[0]?.id || null);

                                  return venueWhatsappSources.map(src => {
                                    const isOnline = isSourceOnline(src);
                                    const isPriority = isOnline && effectivePriorityId === src.id;
                                    const rawPhone = src.whatsappInstanceId || (src.configuration && (src.configuration.connectedPhone || src.configuration.targetPhone)) || '';
                                    const phoneDisplay = rawPhone ? formatPhone(rawPhone) : null;

                                    return (
                                      <div
                                        key={src.id}
                                        onClick={() => {
                                          if (!isOnline) {
                                            alert(`A instância "${src.name}" está desconectada. Acesse o menu lateral em Origens para reconectar o WhatsApp.`);
                                            return;
                                          }
                                          setPriorityWhatsappPerVenue(prev => ({
                                            ...prev,
                                            [venue.id]: src.id,
                                          }));
                                          setVenueDistributionConfig(prev => ({
                                            ...prev,
                                            [venue.id]: {
                                              ...(prev[venue.id] || {}),
                                              priorityWhatsappSourceId: src.id,
                                            },
                                          }));
                                        }}
                                        style={{
                                          background: !isOnline 
                                            ? 'rgba(239, 68, 68, 0.12)' 
                                            : isPriority 
                                              ? 'rgba(16, 185, 129, 0.12)' 
                                              : 'var(--adm-bg-card)',
                                          border: !isOnline 
                                            ? '1.5px solid #EF4444' 
                                            : isPriority 
                                              ? '1.5px solid #10B981' 
                                              : '1px solid var(--adm-border)',
                                          borderRadius: '8px',
                                          padding: '6px 8px',
                                          cursor: isOnline ? 'pointer' : 'default',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: '6px',
                                          transition: 'all 0.15s ease',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                          <SafeAvatar name={src.name || 'WhatsApp'} src={(src as any).avatarUrl || (src.configuration && src.configuration.connectedAvatar)} size={24} />
                                          <div style={{ minWidth: 0 }}>
                                            <div style={{ 
                                              fontSize: '0.70rem', 
                                              fontWeight: 700, 
                                              color: !isOnline ? '#EF4444' : 'var(--adm-text-title)', 
                                              whiteSpace: 'nowrap', 
                                              overflow: 'hidden', 
                                              textOverflow: 'ellipsis' 
                                            }}>
                                              {src.name}
                                            </div>
                                            {phoneDisplay && (
                                              <div style={{ fontSize: '0.62rem', color: !isOnline ? '#EF4444' : 'var(--adm-text-muted)', opacity: !isOnline ? 0.9 : 1 }}>
                                                {phoneDisplay}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {!isOnline ? (
                                          <span style={{ fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.25)', color: '#EF4444' }}>
                                            🔴 Desconectado
                                          </span>
                                        ) : isPriority ? (
                                          <span style={{ fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#10B981', color: '#FFF' }}>
                                            Principal
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>
                                            Definir
                                          </span>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.65rem', color: 'var(--adm-text-muted)' }}>
                                Sem WhatsApp conectado.
                              </div>
                            )}
                          </div>

                          {/* Distribuição: Manual vs Rodízio */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--adm-border)', paddingTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                                Modo de Distribuição
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setVenueDistributionConfig(prev => ({
                                    ...prev,
                                    [venue.id]: {
                                      ...(prev[venue.id] || {}),
                                      distributionMode: 'manual',
                                    },
                                  }));
                                }}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: venueDistMode === 'manual' ? '1.5px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                                  background: venueDistMode === 'manual' ? 'rgba(59, 130, 246, 0.15)' : 'var(--adm-bg-card)',
                                  color: venueDistMode === 'manual' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                Manual
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setVenueDistributionConfig(prev => ({
                                    ...prev,
                                    [venue.id]: {
                                      ...(prev[venue.id] || {}),
                                      distributionMode: 'round_robin',
                                    },
                                  }));
                                }}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: venueDistMode === 'round_robin' ? '1.5px solid #10B981' : '1px solid var(--adm-border)',
                                  background: venueDistMode === 'round_robin' ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-card)',
                                  color: venueDistMode === 'round_robin' ? '#10B981' : 'var(--adm-text-muted)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                Rodízio
                              </button>
                            </div>

                            {/* Letras miúdas explicativas */}
                            <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', lineHeight: 1.35, padding: '2px 2px' }}>
                              {venueDistMode === 'manual' 
                                ? 'No modo manual, os novos leads entram na Caixa de Entrada e qualquer SDR disponível pode puxar para atendimento.'
                                : 'No modo rodízio, os novos leads são distribuídos de forma sequencial na ordem definida na lista de entrega.'}
                            </div>

                            {/* Quando Rodízio: Monte a lista de entrega com ordem e duplicação */}
                            {venueDistMode === 'round_robin' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', background: 'var(--adm-bg-card)', padding: '8px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                                    Monte a lista de entrega ({venueSdrIds.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const firstCollab = displayCollaborators[0]?.id;
                                      if (firstCollab) {
                                        setVenueDistributionConfig(prev => ({
                                          ...prev,
                                          [venue.id]: {
                                            ...(prev[venue.id] || {}),
                                            assignedSdrIds: [...venueSdrIds, firstCollab],
                                          },
                                        }));
                                      }
                                    }}
                                    style={{
                                      background: 'var(--adm-accent-bg, rgba(59, 130, 246, 0.15))',
                                      border: '1px solid var(--adm-accent, #3B82F6)',
                                      color: 'var(--adm-accent, #3B82F6)',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '0.60rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <Plus size={10} />
                                    <span>Adicionar</span>
                                  </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                                  {venueSdrIds.map((collabId, idx) => {
                                    const collab = displayCollaborators.find(c => c.id === collabId);
                                    return (
                                      <div
                                        key={`${collabId}-${idx}`}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: '6px',
                                          padding: '4px 6px',
                                          borderRadius: '6px',
                                          background: 'var(--adm-bg-input)',
                                          border: '1px solid var(--adm-border)',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                          <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#10B981', minWidth: '18px' }}>
                                            #{idx + 1}
                                          </span>
                                          <SafeAvatar name={collab?.name || 'Colaborador'} src={collab?.avatarUrl} size={18} />
                                          <select
                                            value={collabId}
                                            onChange={(e) => {
                                              const newId = e.target.value;
                                              const updated = [...venueSdrIds];
                                              updated[idx] = newId;
                                              setVenueDistributionConfig(prev => ({
                                                ...prev,
                                                [venue.id]: {
                                                  ...(prev[venue.id] || {}),
                                                  assignedSdrIds: updated,
                                                },
                                              }));
                                            }}
                                            style={{
                                              background: 'transparent',
                                              border: 'none',
                                              color: 'var(--adm-text-title)',
                                              fontSize: '0.68rem',
                                              fontWeight: 700,
                                              outline: 'none',
                                              cursor: 'pointer',
                                              maxWidth: '130px',
                                            }}
                                          >
                                            {displayCollaborators.map(c => (
                                              <option key={c.id} value={c.id} style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>
                                                {c.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <button
                                            type="button"
                                            title="Duplicar no rodízio"
                                            onClick={() => {
                                              const updated = [...venueSdrIds];
                                              updated.splice(idx + 1, 0, collabId);
                                              setVenueDistributionConfig(prev => ({
                                                ...prev,
                                                [venue.id]: {
                                                  ...(prev[venue.id] || {}),
                                                  assignedSdrIds: updated,
                                                },
                                              }));
                                            }}
                                            style={{
                                              background: 'transparent',
                                              border: 'none',
                                              color: 'var(--adm-text-muted)',
                                              cursor: 'pointer',
                                              padding: '2px 4px',
                                              fontSize: '0.58rem',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <Copy size={11} />
                                          </button>
                                          <button
                                            type="button"
                                            title="Remover do rodízio"
                                            onClick={() => {
                                              const updated = venueSdrIds.filter((_, i) => i !== idx);
                                              setVenueDistributionConfig(prev => ({
                                                ...prev,
                                                [venue.id]: {
                                                  ...(prev[venue.id] || {}),
                                                  assignedSdrIds: updated,
                                                },
                                              }));
                                            }}
                                            style={{
                                              background: 'transparent',
                                              border: 'none',
                                              color: '#EF4444',
                                              cursor: 'pointer',
                                              padding: '2px 4px',
                                              fontSize: '0.58rem',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {venueSdrIds.length === 0 && (
                                    <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', textAlign: 'center', padding: '6px' }}>
                                      Nenhum colaborador no rodízio. Clique em "+ Adicionar".
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── RIGHT MAIN PIPELINE GRID (KOMMO REPLICA + HORIZONTAL PAN/DRAG) ── */}
        <div 
          ref={pipelineScrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--adm-bg-app)',
            cursor: isDragging ? 'grabbing' : 'default',
            userSelect: isDragging ? 'none' : 'auto',
          }}
        >
          <div style={{ display: 'flex', minWidth: `${(displayedStages.length + (insertingStageAtIndex !== null ? 1 : 0)) * 280 + 120}px`, minHeight: '100%' }}>
            {displayedStages.map((stage, index) => {
              const isWon = stage.isWon;
              const isLoss = stage.isLoss;
              const isFixed = stage.isFixed || isWon || isLoss;

              return (
                <React.Fragment key={stage.id}>
                  {/* Column Box */}
                  <div style={{
                    width: '270px',
                    borderRight: '1px solid var(--adm-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--adm-bg-app)',
                    flexShrink: 0,
                    position: 'relative',
                  }}>
                    {/* Stage Header (Uniform Fixed Height & Single Line No-Wrap) */}
                    <div style={{
                      height: '84px',
                      padding: '8px 12px',
                      background: 'var(--adm-bg-card)',
                      borderBottom: '1px solid var(--adm-border)',
                      borderTop: `4px solid ${stage.color || '#3B82F6'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      position: 'relative',
                      overflow: 'visible',
                    }}>
                      {/* Top Row: Icon Button + Stage Name Input + Meeting Toggle + Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                        {/* Icon Picker Trigger */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => setActiveIconPickerStageId(activeIconPickerStageId === stage.id ? null : stage.id)}
                            title="Alterar ícone da etapa"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: stage.color || 'var(--adm-accent)',
                              cursor: 'pointer',
                              padding: 0,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {renderStageIcon(stage.icon || (stage.id === 'new_lead' ? 'inbox' : stage.isWon ? 'dollar' : stage.isLoss ? 'x-circle' : 'layers'), 13, stage.color || 'var(--adm-accent)')}
                          </button>

                          {/* Popover Icon Picker */}
                          {activeIconPickerStageId === stage.id && (
                            <FunnelIconPicker
                              selectedIcon={stage.icon}
                              onSelectIcon={(iconId) => {
                                setStages(prev => prev.map(s => s.id === stage.id ? { ...s, icon: iconId } : s));
                                setActiveIconPickerStageId(null);
                              }}
                              onClose={() => setActiveIconPickerStageId(null)}
                              accentColor={stage.color || 'var(--adm-accent, #3B82F6)'}
                              title={`Ícone da Etapa: ${stage.name}`}
                            />
                          )}
                        </div>

                        {/* Stage Name Input (No Wrap, Ellipsis) */}
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => {
                            const newName = e.target.value.toUpperCase();
                            setStages(prev => prev.map(s => s.id === stage.id ? { ...s, name: newName } : s));
                          }}
                          title={stage.name}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--adm-text-title)',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            outline: 'none',
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        />

                        {/* Delete Stage Button (only for custom stages) */}
                        {!isFixed && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStage(stage.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--adm-text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              flexShrink: 0,
                            }}
                            title="Excluir etapa"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Bottom Row: Colors */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        {/* Color Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {STAGE_COLORS.map(c => (
                            <div
                              key={c}
                              onClick={() => {
                                setStages(prev => prev.map(s => s.id === stage.id ? { ...s, color: c } : s));
                              }}
                              style={{
                                width: '11px',
                                height: '11px',
                                borderRadius: '50%',
                                background: c,
                                cursor: 'pointer',
                                border: stage.color === c ? '2px solid #FFFFFF' : 'none',
                                boxShadow: stage.color === c ? '0 0 4px rgba(0,0,0,0.5)' : 'none',
                                flexShrink: 0,
                              }}
                            />
                          ))}
                        </div>

                        {/* Reorder Buttons (Mover para esquerda / direita) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            type="button"
                            onClick={() => handleMoveStage(stage.id, 'left')}
                            disabled={index === 0}
                            title="Mover etapa para a esquerda"
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              color: index === 0 ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              opacity: index === 0 ? 0.4 : 1,
                              padding: 0,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <ChevronLeft size={11} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveStage(stage.id, 'right')}
                            disabled={index === displayedStages.length - 1}
                            title="Mover etapa para a direita"
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              color: index === displayedStages.length - 1 ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: index === displayedStages.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: index === displayedStages.length - 1 ? 0.4 : 1,
                              padding: 0,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <ChevronRight size={11} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stage Body (Hints & Triggers) */}
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                      {/* Hints Card */}
                      <div style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                            DICAS / ORIENTAÇÕES
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveEditingHintStageId(activeEditingHintStageId === stage.id ? null : stage.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {activeEditingHintStageId === stage.id ? 'Fechar' : 'Editar'}
                          </button>
                        </div>

                        {activeEditingHintStageId === stage.id ? (
                          <textarea
                            defaultValue={stage.hints || ''}
                            onBlur={(e) => handleSaveHint(stage.id, e.target.value)}
                            placeholder="Adicione orientações para a equipe comercial nesta etapa..."
                            rows={3}
                            style={{
                              width: '100%',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '6px',
                              color: 'var(--adm-text-body)',
                              fontSize: '0.74rem',
                              padding: '6px',
                              resize: 'vertical',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          <p style={{ fontSize: '0.72rem', color: stage.hints ? 'var(--adm-text-body)' : 'var(--adm-text-muted)', margin: 0, fontStyle: stage.hints ? 'normal' : 'italic', lineHeight: 1.35 }}>
                            {stage.hints || 'Nenhuma orientação cadastrada para esta etapa.'}
                          </p>
                        )}
                      </div>

                      {/* Gatilhos / Automação da Etapa */}
                      <div style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Zap size={12} color="#8B5CF6" />
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                              GATILHOS / AUTOMAÇÃO
                            </span>
                          </div>
                        </div>

                        {/* Lista de Gatilhos configurados */}
                        {((stage.triggers || []).filter(t => t.type === 'move_to_funnel')).map(trigger => {
                          const targetFunnel = funnels.find(f => f.id === trigger.targetFunnelId);
                          const targetStage = targetFunnel?.stages?.find(s => s.id === trigger.targetStageId);

                          return (
                            <div
                              key={trigger.id}
                              style={{
                                background: 'rgba(139, 92, 246, 0.08)',
                                border: '1px solid rgba(139, 92, 246, 0.25)',
                                borderRadius: '6px',
                                padding: '6px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Zap size={10} /> Transferência de Funil
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  Para: <strong>{targetFunnel?.name || 'Outro Funil'}</strong> {targetStage ? `• ${targetStage.name}` : ''}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveTrigger(stage.id, trigger.id)}
                                title="Remover gatilho"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}

                        {/* Formulário Inline para Adicionar Novo Gatilho */}
                        {activeTriggerStageId === stage.id ? (
                          <div style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-accent)',
                            borderRadius: '6px',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}>
                            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              Novo Gatilho: Transferência de Funil
                            </span>
                            
                            <label style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                              Funil de Destino:
                            </label>
                            <select
                              value={selectedTargetFunnelId}
                              onChange={(e) => {
                                setSelectedTargetFunnelId(e.target.value);
                                const f = funnels.find(fun => fun.id === e.target.value);
                                setSelectedTargetStageId(f?.stages?.[0]?.id || '');
                              }}
                              style={{
                                width: '100%',
                                background: 'var(--adm-bg-card)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                fontSize: '0.72rem',
                                color: 'var(--adm-text-body)',
                                outline: 'none',
                              }}
                            >
                              <option value="">Selecione o funil de destino...</option>
                              {funnels.filter(f => f.id !== activeFunnel?.id).map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>

                            {selectedTargetFunnelId && (
                              <>
                                <label style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                                  Etapa de Destino:
                                </label>
                                <select
                                  value={selectedTargetStageId}
                                  onChange={(e) => setSelectedTargetStageId(e.target.value)}
                                  style={{
                                    width: '100%',
                                    background: 'var(--adm-bg-card)',
                                    border: '1px solid var(--adm-border)',
                                    borderRadius: '4px',
                                    padding: '4px 6px',
                                    fontSize: '0.72rem',
                                    color: 'var(--adm-text-body)',
                                    outline: 'none',
                                  }}
                                >
                                  {funnels.find(f => f.id === selectedTargetFunnelId)?.stages?.map(st => (
                                    <option key={st.id} value={st.id}>{st.name}</option>
                                  ))}
                                </select>
                              </>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => setActiveTriggerStageId(null)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-muted)',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={!selectedTargetFunnelId}
                                onClick={() => handleSaveTransferTrigger(stage.id)}
                                style={{
                                  background: selectedTargetFunnelId ? 'var(--adm-accent)' : 'var(--adm-border)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '3px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: selectedTargetFunnelId ? 'pointer' : 'not-allowed',
                                }}
                              >
                                Salvar Gatilho
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTriggerStageId(stage.id);
                              const otherFunnel = funnels.find(f => f.id !== activeFunnel?.id);
                              setSelectedTargetFunnelId(otherFunnel?.id || '');
                              setSelectedTargetStageId(otherFunnel?.stages?.[0]?.id || '');
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px dashed var(--adm-border)',
                              borderRadius: '6px',
                              padding: '5px',
                              color: 'var(--adm-accent)',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <Plus size={11} />
                            Adicionar Gatilho
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Intersection Plus (+) Button directly on the column right border */}
                    {index < displayedStages.length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setInsertingStageAtIndex(index + 1);
                          setNewStageInputText('');
                        }}
                        style={{
                          position: 'absolute',
                          top: '29px',
                          right: '-13px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'var(--adm-bg-card)',
                          border: '2px solid var(--adm-accent)',
                          color: 'var(--adm-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                          transition: 'all 0.15s ease',
                          zIndex: 35,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#FFFFFF';
                          e.currentTarget.style.background = 'var(--adm-accent)';
                          e.currentTarget.style.borderColor = 'var(--adm-accent)';
                          e.currentTarget.style.transform = 'scale(1.18)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--adm-accent)';
                          e.currentTarget.style.background = 'var(--adm-bg-card)';
                          e.currentTarget.style.borderColor = 'var(--adm-accent)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Adicionar etapa entre estas duas"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  {/* Inline Stage Creation Input Card */}
                  {insertingStageAtIndex === index + 1 && (
                    <div style={{
                      width: '270px',
                      borderRight: '1px solid var(--adm-border)',
                      background: 'var(--adm-bg-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '14px',
                      gap: '10px',
                      boxShadow: 'inset 0 0 10px rgba(59, 130, 246, 0.1)',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase' }}>
                        Nova Etapa
                      </span>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nome da etapa..."
                        value={newStageInputText}
                        onChange={(e) => setNewStageInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommitNewStage(index + 1);
                          if (e.key === 'Escape') setInsertingStageAtIndex(null);
                        }}
                        style={{
                          background: 'var(--adm-bg-input)',
                          border: '1.5px solid var(--adm-accent)',
                          borderRadius: '8px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.80rem',
                          fontWeight: 700,
                          padding: '8px 10px',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setInsertingStageAtIndex(null)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCommitNewStage(index + 1)}
                          style={{ background: 'var(--adm-accent)', border: 'none', color: '#FFFFFF', borderRadius: '6px', padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Criar
                        </button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL 1: CONTROLE DUPLICADO (REGRAS E AÇÕES) ── */}
      {isDuplicateRulesModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#141118',
            border: '1.5px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.10rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                Regras de Controle de Duplicados
              </h3>
              <button
                type="button"
                onClick={() => setIsDuplicateRulesModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9E988D', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                  Critérios de Identificação de Duplicidade:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', color: '#D3E0EA' }}>
                    <input
                      type="checkbox"
                      checked={duplicateRuleConfig.matchPhone}
                      onChange={(e) => setDuplicateRuleConfig({ ...duplicateRuleConfig, matchPhone: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#3B82F6' }}
                    />
                    <span>Mesmo Telefone / WhatsApp</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', color: '#D3E0EA' }}>
                    <input
                      type="checkbox"
                      checked={duplicateRuleConfig.matchEmail}
                      onChange={(e) => setDuplicateRuleConfig({ ...duplicateRuleConfig, matchEmail: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#3B82F6' }}
                    />
                    <span>Mesmo E-mail</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', color: '#D3E0EA' }}>
                    <input
                      type="checkbox"
                      checked={duplicateRuleConfig.matchName}
                      onChange={(e) => setDuplicateRuleConfig({ ...duplicateRuleConfig, matchName: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#3B82F6' }}
                    />
                    <span>Mesmo Nome do Lead / Aniversariante</span>
                  </label>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                  Ação ao Detectar Lead Duplicado:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'keep_recent', title: 'Manter o mais recente e atualizar dados', desc: 'Move o lead para o topo e atualiza os dados com a nova entrada.' },
                    { id: 'keep_both', title: 'Manter ambos os leads no funil', desc: 'Cria o novo lead mantendo o histórico do lead anterior intacto.' },
                    { id: 'keep_oldest_update', title: 'Manter o lead mais antigo e mesclar histórico', desc: 'Não cria novo card, mas adiciona as novas notas ao lead existente.' },
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setDuplicateRuleConfig({ ...duplicateRuleConfig, action: opt.id as any })}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: duplicateRuleConfig.action === opt.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1.5px solid ${duplicateRuleConfig.action === opt.id ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: duplicateRuleConfig.action === opt.id ? '#3B82F6' : '#FFFFFF' }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#9E988D' }}>
                        {opt.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsDuplicateRulesModalOpen(false)}
                className="adm-btn-primary"
                style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800 }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: QUALIFICAÇÃO DO FUNIL (PERGUNTAS & PONTUAÇÃO) ── */}
      {isQualificationModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#141118',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '20px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.10rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                    Critérios de Qualificação • {activeFunnel?.name}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#9E988D', marginTop: '2px' }}>
                    1 formato exclusivo para este funil. Atribui pontuação e probabilidade de fechamento aos leads.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQualificationModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9E988D', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* List Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase' }}>
                  Perguntas de Avaliação ({displayedQualificationQuestions.length})
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddQuestionModal}
                  className="adm-btn-primary"
                  style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} />
                  <span>Nova Pergunta</span>
                </button>
              </div>

              {displayedQualificationQuestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {displayedQualificationQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#10B981' }}>#{idx + 1}</span>
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>{q.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditQuestionModal(q)}
                            style={{ background: 'transparent', border: 'none', color: '#38BDF8', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Excluir pergunta "${q.title}"?`)) deleteMqlQuestion(q.id);
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '0.70rem', cursor: 'pointer' }}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>

                      {q.description && (
                        <p style={{ fontSize: '0.70rem', color: '#9E988D', margin: 0 }}>{q.description}</p>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', marginTop: '4px' }}>
                        {q.options.map(opt => {
                          const sit = opt.situation || 'ideal';
                          const conf = ICP_SITUATION_CONFIG[sit];
                          return (
                            <div
                              key={opt.id}
                              style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: `1px solid ${conf.border}`,
                                borderRadius: '6px',
                                padding: '5px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '4px',
                              }}
                            >
                              <span style={{ fontSize: '0.66rem', color: '#D3E0EA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {opt.label}
                              </span>
                              <span style={{ fontSize: '0.60rem', fontWeight: 800, color: conf.color }}>
                                {conf.points}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.78rem', color: '#9E988D', margin: 0 }}>
                    Nenhuma pergunta de qualificação configurada para este funil.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsQualificationModalOpen(false)}
                className="adm-btn-primary"
                style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800 }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-MODAL: CRIAR / EDITAR PERGUNTA DE QUALIFICAÇÃO ── */}
      {isAddingQuestionModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
        }}>
          <div style={{
            background: '#141118',
            border: '1.5px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                {editingQuestionId ? 'Editar Pergunta de Qualificação' : 'Nova Pergunta de Qualificação'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingQuestionModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9E988D', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                  Título da Pergunta *
                </label>
                <input
                  type="text"
                  required
                  value={questionTitleInput}
                  onChange={(e) => setQuestionTitleInput(e.target.value)}
                  placeholder="Ex: Qual a previsão de data da comemoração?"
                  className="adm-input"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.80rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                  Casa de Festas (Unidade) *
                </label>
                <select
                  value={questionVenueIdInput}
                  onChange={(e) => setQuestionVenueIdInput(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.80rem', cursor: 'pointer' }}
                >
                  <option value="all">Todas as Casas / Unidades</option>
                  {venues.filter(v => v.active !== false).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                  Descrição / Objetivo (Opcional)
                </label>
                <input
                  type="text"
                  value={questionDescInput}
                  onChange={(e) => setQuestionDescInput(e.target.value)}
                  placeholder="Ex: Avalia urgência e maturidade comercial"
                  className="adm-input"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.80rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Opções por Situação:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {questionOptionsInput.map((opt, idx) => {
                    const conf = ICP_SITUATION_CONFIG[opt.situation];
                    return (
                      <div key={opt.situation} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: conf.color, width: '70px', flexShrink: 0 }}>
                          {conf.label} ({conf.points}%):
                        </span>
                        <input
                          type="text"
                          required
                          value={opt.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuestionOptionsInput(prev => prev.map((p, i) => i === idx ? { ...p, label: val } : p));
                          }}
                          placeholder={`Resposta ${conf.label.toLowerCase()}...`}
                          className="adm-input"
                          style={{ flex: 1, height: '34px', borderRadius: '6px', fontSize: '0.76rem' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddingQuestionModalOpen(false)}
                  className="adm-btn-secondary"
                  style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.74rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{ padding: '6px 18px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800 }}
                >
                  Salvar Pergunta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: MIGRAÇÃO DE LEADS AO DESMARCAR ETAPA DE ENTRADA ── */}
      {isMigrateEntryLeadsModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#141118',
            border: '1.5px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EAB308', flexShrink: 0 }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                  Mover Leads da Etapa de Entrada
                </h3>
                <p style={{ fontSize: '0.74rem', color: '#9E988D', margin: '2px 0 0 0' }}>
                  Existem <strong>{leadsInEntryStage.length} lead(s)</strong> atualmente na Etapa de Entrada.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.76rem', color: '#D3E0EA', lineHeight: 1.45, margin: 0 }}>
              Para desativar a <em>Etapa de leads de entrada</em> sem perder esses contatos, escolha para qual etapa do funil eles serão movidos automaticamente:
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                Etapa de Destino:
              </label>
              <select
                value={migrationTargetStageId}
                onChange={(e) => setMigrationTargetStageId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                  padding: '10px 12px',
                  outline: 'none',
                }}
              >
                {stages.filter(s => s.id !== 'new_lead' && s.id !== 'onboarding' && !s.name.toLowerCase().includes('entrada')).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsMigrateEntryLeadsModalOpen(false)}
                className="adm-btn-secondary"
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMigrationAndDisableEntry}
                className="adm-btn-primary"
                style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, background: '#EAB308', borderColor: '#EAB308', color: '#000000' }}
              >
                Mover Leads e Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM FUNNEL DATA (PACKAGES, PAYMENTS, TAGS & FIELDS) MODAL ── */}
      {isCustomDataModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            width: '780px',
            maxWidth: '95vw',
            height: '620px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--adm-bg-elevated)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D4AF37',
                }}>
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                    {customDataModalView === 'hub' && 'Gerenciador de Campos & Tags'}
                    {customDataModalView === 'tags' && 'Tags Recomendadas & Permissões'}
                    {customDataModalView === 'add_field' && 'Novo Campo Personalizado'}
                    {customDataModalView === 'edit_field' && 'Editar Campo Personalizado'}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                    {customDataModalView === 'hub' && 'Gerencie as tags recomendadas e campos customizados exclusivos para este funil.'}
                    {customDataModalView === 'tags' && 'Tags pré-configuradas e permissões de etiquetagem dos leads.'}
                    {(customDataModalView === 'add_field' || customDataModalView === 'edit_field') && 'Defina o nome, seção de exibição e tipo do campo.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {customDataModalView !== 'hub' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDataModalView('hub');
                      setEditingFieldId(null);
                      setNewFieldLabel('');
                      setNewFieldOptions('');
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-title)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <ArrowLeft size={13} />
                    <span>Voltar ao Hub</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDataModalOpen(false);
                    setCustomDataModalView('hub');
                    setEditingFieldId(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* ── VIEW: HUB PRINCIPAL ── */}
              {customDataModalView === 'hub' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Seção 1: Tags Recomendadas do Funil */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Tags do Funil
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>Classificação</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      {/* Card Tags Recomendadas */}
                      <div style={{
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(212, 175, 55, 0.15)',
                            color: '#D4AF37',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Tag size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              Tags Recomendadas & Permissões
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                              {predefinedTags.length} tags ativas • {allowCollaboratorsCreateTags ? 'Criação livre permitida' : 'Apenas tags predefinidas'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCustomDataModalView('tags')}
                          style={{
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            color: '#D4AF37',
                            borderRadius: '7px',
                            padding: '7px 14px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#D4AF37'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--adm-border)'}
                        >
                          <Settings size={13} />
                          <span>Configurar Tags</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Campos Personalizados por Seção */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--adm-border)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Campos Personalizados do Lead
                        </div>
                        <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                          Organizados em seções prioritárias, festa, contratante ou seções personalizadas.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setNewFieldLabel('');
                          setNewFieldType('text');
                          setNewFieldSection('priority');
                          setNewCustomSectionName('');
                          setNewFieldOptions('');
                          setEditingFieldId(null);
                          setCustomDataModalView('add_field');
                        }}
                        style={{
                          background: 'var(--adm-accent)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(20, 169, 215, 0.25)',
                        }}
                      >
                        <Plus size={14} />
                        <span>Adicionar Novo Campo</span>
                      </button>
                    </div>

                    {customFields.length === 0 ? (
                      <div style={{
                        padding: '30px 20px',
                        background: 'var(--adm-bg-input)',
                        border: '1px dashed var(--adm-border)',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: 'var(--adm-text-muted)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <FileText size={28} color="var(--adm-text-muted)" style={{ opacity: 0.6 }} />
                        <span>Nenhum campo personalizado cadastrado para este funil.</span>
                        <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>Clique em "+ Adicionar Novo Campo" para criar campos sob medida.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {customFields.map((field) => {
                          const sectionName = 
                            field.section === 'party_data' || field.section === 'event' ? 'Dados da Festa / Evento' :
                            field.section === 'contractor' || field.section === 'contact' ? 'Contratante & Aniversariante' :
                            field.section === 'custom' ? (field.customSectionName || 'Seção Personalizada') :
                            'Campos Prioritários';

                          const typeName = 
                            field.type === 'todo' ? 'Checklist' :
                            field.type === 'date' ? 'Data' :
                            field.type === 'number' ? 'Número' :
                            field.type === 'select' ? 'Seleção Única' :
                            field.type === 'multi_select' ? 'Seleção Múltipla' :
                            'Texto';

                          return (
                            <div
                              key={field.id}
                              style={{
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: 'var(--adm-bg-card)',
                                  border: '1px solid var(--adm-border)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--adm-accent)',
                                  flexShrink: 0,
                                }}>
                                  {field.type === 'todo' ? <CheckSquare size={15} /> :
                                   field.type === 'date' ? <Calendar size={15} /> :
                                   field.type === 'number' ? <Hash size={15} /> :
                                   field.type === 'select' || field.type === 'multi_select' ? <ListFilter size={15} /> :
                                   <Type size={15} />}
                                </div>

                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {field.label}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                                    <span style={{
                                      fontSize: '0.64rem',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(20, 169, 215, 0.15)',
                                      color: '#14A9D7',
                                    }}>
                                      {sectionName}
                                    </span>
                                    <span style={{
                                      fontSize: '0.64rem',
                                      fontWeight: 600,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(255, 255, 255, 0.06)',
                                      color: 'var(--adm-text-muted)',
                                    }}>
                                      {typeName}
                                    </span>
                                    {field.options && field.options.length > 0 && (
                                      <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                                        ({field.options.length} opções: {field.options.slice(0, 3).join(', ')}{field.options.length > 3 ? '...' : ''})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingFieldId(field.id);
                                    setNewFieldLabel(field.label);
                                    setNewFieldType(field.type);
                                    setNewFieldSection(field.section || 'priority');
                                    setNewCustomSectionName(field.customSectionName || '');
                                    setNewFieldOptions(field.options ? field.options.join(', ') : '');
                                    setCustomDataModalView('edit_field');
                                  }}
                                  style={{
                                    background: 'var(--adm-bg-card)',
                                    border: '1px solid var(--adm-border)',
                                    color: 'var(--adm-text-title)',
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '0.70rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Edit2 size={11} />
                                  <span>Editar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setCustomFields(prev => prev.filter(f => f.id !== field.id))}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                  title="Remover campo"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── VIEW: TAGS RECOMENDADAS ── */}
              {customDataModalView === 'tags' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Permissão de criação livre de tags */}
                  <div style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        Permitir que colaboradores criem novas tags livres
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                        Se desativado, os colaboradores só poderão vincular as tags cadastradas nesta lista de configuração.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowCollaboratorsCreateTags}
                      onChange={(e) => setAllowCollaboratorsCreateTags(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#10B981', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Input de Adicionar Tag */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nome da tag (ex: VIP, Degustação Agendada)..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          if (!predefinedTags.includes(newTagInput.trim())) {
                            setPredefinedTags(prev => [...prev, newTagInput.trim()]);
                          }
                          setNewTagInput('');
                        }
                      }}
                      style={{
                        flex: 1,
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.80rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTagInput.trim() && !predefinedTags.includes(newTagInput.trim())) {
                          setPredefinedTags(prev => [...prev, newTagInput.trim()]);
                          setNewTagInput('');
                        }
                      }}
                      style={{
                        background: 'var(--adm-accent)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={14} />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {predefinedTags.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--adm-text-title)',
                        }}
                      >
                        <Tag size={13} color="var(--adm-accent)" />
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => setPredefinedTags(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: 0 }}
                          title="Remover tag"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                    {predefinedTags.length === 0 && (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem', width: '100%' }}>
                        Nenhuma tag cadastrada para este funil.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── VIEW: ADICIONAR / EDITAR CAMPO PERSONALIZADO ── */}
              {(customDataModalView === 'add_field' || customDataModalView === 'edit_field') && (
                <div style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {editingFieldId ? 'Editar Campo' : 'Novo Campo Personalizado'}
                  </div>

                  {/* Nome do Campo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                      Nome / Rótulo do Campo *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Tema da Decoração, Data Limite, Estilo Musical..."
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.78rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Seção Alvo e Tipo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                        Seção de Exibição no Lead *
                      </label>
                      <select
                        value={newFieldSection}
                        onChange={(e) => setNewFieldSection(e.target.value as FunnelCustomFieldSection)}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.78rem',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="priority">1. Campos Prioritários (Seção 1)</option>
                        <option value="party_data">2. Dados da Festa / Evento</option>
                        <option value="contractor">3. Contratante & Aniversariante</option>
                        <option value="custom">4. Seção Personalizada...</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                        Tipo de Dado *
                      </label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as FunnelFieldType)}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.78rem',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="text">Texto Livre</option>
                        <option value="date">Data (com Seletor)</option>
                        <option value="number">Número</option>
                        <option value="todo">Checklist (Pendente / Concluído)</option>
                        <option value="select">Seleção Única (Dropdown)</option>
                        <option value="multi_select">Seleção Múltipla (Pills)</option>
                      </select>
                    </div>
                  </div>

                  {/* Nome da Seção Personalizada se custom */}
                  {newFieldSection === 'custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                        Nome da Seção Personalizada *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Cerimonial & Assessoria, Fornecedores Extras..."
                        value={newCustomSectionName}
                        onChange={(e) => setNewCustomSectionName(e.target.value)}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.78rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}

                  {/* Opções de Seleção */}
                  {(newFieldType === 'select' || newFieldType === 'multi_select') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                        Opções de Seleção (separadas por vírgula) *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Clássico, Rústico, Neon, Balada Moderna, Princesa..."
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.78rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDataModalView('hub');
                        setEditingFieldId(null);
                        setNewFieldLabel('');
                        setNewFieldOptions('');
                        setNewCustomSectionName('');
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-muted)',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newFieldLabel.trim()) return;
                        const parsedOptions = (newFieldType === 'select' || newFieldType === 'multi_select')
                          ? newFieldOptions.split(',').map(s => s.trim()).filter(Boolean)
                          : undefined;

                        if (editingFieldId) {
                          setCustomFields(prev => prev.map(f => {
                            if (f.id === editingFieldId) {
                              return {
                                ...f,
                                label: newFieldLabel.trim(),
                                type: newFieldType,
                                section: newFieldSection,
                                customSectionName: newFieldSection === 'custom' ? newCustomSectionName.trim() : undefined,
                                options: parsedOptions,
                              };
                            }
                            return f;
                          }));
                        } else {
                          const createdField: FunnelCustomField = {
                            id: `field_${Date.now()}`,
                            label: newFieldLabel.trim(),
                            type: newFieldType,
                            section: newFieldSection,
                            customSectionName: newFieldSection === 'custom' ? newCustomSectionName.trim() : undefined,
                            options: parsedOptions,
                          };
                          setCustomFields(prev => [...prev, createdField]);
                        }

                        setEditingFieldId(null);
                        setNewFieldLabel('');
                        setNewFieldOptions('');
                        setNewCustomSectionName('');
                        setCustomDataModalView('hub');
                      }}
                      style={{
                        background: 'var(--adm-accent)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 18px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {editingFieldId ? 'Salvar Alterações' : 'Criar Campo'}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsCustomDataModalOpen(false);
                  setCustomDataModalView('hub');
                  setEditingFieldId(null);
                }}
                style={{
                  background: 'var(--adm-accent)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 24px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FUNNEL DELETION & LEAD MIGRATION MODAL ── */}
      <AdminFunnelDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        funnelToDelete={activeFunnel}
        availableFunnels={funnels}
        leads={leads}
        sources={sources}
        onConfirmDelete={handleDeleteFunnel}
      />
    </div>
  );
};
