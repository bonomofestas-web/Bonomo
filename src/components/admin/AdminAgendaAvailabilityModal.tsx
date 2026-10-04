import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, Trash2, ShieldAlert, Sparkles,
  Check, Copy, ChevronLeft, ChevronRight,
  Plus, Building2, UtensilsCrossed,
  Repeat, CalendarRange, ArrowRight, ArrowLeft,
  Edit3, CheckCircle2
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { generateUuid } from '../../utils/uuid';
import type { 
  VenueAgendaConfig, 
  AgendaRecurringRule, 
  AgendaDaySchedule,
  AgendaBlockRule,
  AgendaDateOverride,
  CommercialCommitmentType
} from '../../types/admin';
import { 
  DEFAULT_VISITS_RULE, 
  DEFAULT_TASTINGS_RULE,
  generateSlotsFromRange,
  agendaAvailabilityService 
} from '../../services/agendaAvailabilityService';

interface AdminAgendaAvailabilityModalProps {
  venueId?: string;
  initialType?: CommercialCommitmentType;
  onClose: () => void;
  onSaved?: () => void;
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Segunda-feira', short: 'Seg' },
  { id: 2, label: 'Terça-feira', short: 'Ter' },
  { id: 3, label: 'Quarta-feira', short: 'Qua' },
  { id: 4, label: 'Quinta-feira', short: 'Qui' },
  { id: 5, label: 'Sexta-feira', short: 'Sex' },
  { id: 6, label: 'Sábado', short: 'Sáb' },
  { id: 0, label: 'Domingo', short: 'Dom' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30 min' },
  { value: 120, label: '2 horas' },
];

export const AdminAgendaAvailabilityModal: React.FC<AdminAgendaAvailabilityModalProps> = ({
  venueId,
  initialType = 'visit',
  onClose,
  onSaved,
}) => {
  const { 
    venues, 
    activeVenueId,
    venueAgendaConfigs, 
    updateVenueAgendaConfig,
    tasks,
    updateTask
  } = useAdminState();

  // Mini-App Etapas: 1: Selecionar Casa -> 2: Selecionar Tipo -> 3: Painel de Configurações
  const [planningStep, setPlanningStep] = useState<1 | 2 | 3>(() => {
    if (venueId && initialType) return 3;
    if (venueId) return 2;
    return 1;
  });

  const [selectedVenueId, setSelectedVenueId] = useState<string>(() => {
    return venueId || (activeVenueId !== 'all' && activeVenueId ? activeVenueId : venues[0]?.id || 'all');
  });

  const [activeType, setActiveType] = useState<CommercialCommitmentType>(() => {
    return initialType || 'visit';
  });

  const existingConfig = venueAgendaConfigs.find(c => c.venueId === selectedVenueId) 
    || agendaAvailabilityService.getDefaultConfig(selectedVenueId);

  // Modo ativo dentro da Etapa 3: 'hub', 'recurring', 'block', 'override'
  const [activeMode, setActiveMode] = useState<'hub' | 'recurring' | 'block' | 'override'>('hub');

  // Modo de Edição vs Leitura da Recorrência Semanal (por padrão entra em LEITURA)
  const [isEditingRecurring, setIsEditingRecurring] = useState(false);
  const [showRecurringConfirmModal, setShowRecurringConfirmModal] = useState(false);

  // Sub-estados para Bloco (Lista vs Editor)
  const [blockViewMode, setBlockViewMode] = useState<'list' | 'editor'>('list');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockCreationStep, setBlockCreationStep] = useState<1 | 2>(1);
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockStart, setNewBlockStart] = useState('');
  const [newBlockEnd, setNewBlockEnd] = useState('');
  const [newBlockDefaultStartTime, setNewBlockDefaultStartTime] = useState('09:00');
  const [newBlockDefaultEndTime, setNewBlockDefaultEndTime] = useState('18:00');
  const [newBlockDuration, setNewBlockDuration] = useState(60);
  // Mapa de configuração individual por data dentro do bloco: { 'YYYY-MM-DD': { enabled: boolean, startTime: string, endTime: string } }
  const [blockDaysConfig, setBlockDaysConfig] = useState<Record<string, { enabled: boolean; startTime: string; endTime: string }>>({});

  // Sub-estados para Data Específica / Overrides
  const [overrideDateInput, setOverrideDateInput] = useState('');
  const [overrideIsBlocked, setOverrideIsBlocked] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  // Regras de Visitas e Degustações
  const [visitsRule, setVisitsRule] = useState<AgendaRecurringRule>(() => ({
    enabled: existingConfig.visitsRule?.enabled ?? true,
    enabledDays: existingConfig.visitsRule?.enabledDays || DEFAULT_VISITS_RULE.enabledDays,
    timeSlots: existingConfig.visitsRule?.timeSlots || DEFAULT_VISITS_RULE.timeSlots,
    durationMinutes: existingConfig.visitsRule?.durationMinutes || DEFAULT_VISITS_RULE.durationMinutes,
    maxConcurrentPerSlot: existingConfig.visitsRule?.maxConcurrentPerSlot || DEFAULT_VISITS_RULE.maxConcurrentPerSlot,
    maxPaxPerSlot: existingConfig.visitsRule?.maxPaxPerSlot || DEFAULT_VISITS_RULE.maxPaxPerSlot,
    daySchedules: existingConfig.visitsRule?.daySchedules || DEFAULT_VISITS_RULE.daySchedules,
  }));

  const [tastingsRule, setTastingsRule] = useState<AgendaRecurringRule>(() => ({
    enabled: existingConfig.tastingsRule?.enabled ?? true,
    enabledDays: existingConfig.tastingsRule?.enabledDays || DEFAULT_TASTINGS_RULE.enabledDays,
    timeSlots: existingConfig.tastingsRule?.timeSlots || DEFAULT_TASTINGS_RULE.timeSlots,
    durationMinutes: existingConfig.tastingsRule?.durationMinutes || DEFAULT_TASTINGS_RULE.durationMinutes,
    maxConcurrentPerSlot: existingConfig.tastingsRule?.maxConcurrentPerSlot || DEFAULT_TASTINGS_RULE.maxConcurrentPerSlot,
    maxPaxPerSlot: existingConfig.tastingsRule?.maxPaxPerSlot || DEFAULT_TASTINGS_RULE.maxPaxPerSlot,
    daySchedules: existingConfig.tastingsRule?.daySchedules || DEFAULT_TASTINGS_RULE.daySchedules,
  }));

  // Sincroniza regras quando seleciona outra casa no fluxo
  useEffect(() => {
    const fresh = venueAgendaConfigs.find(c => c.venueId === selectedVenueId) 
      || agendaAvailabilityService.getDefaultConfig(selectedVenueId);
    setVisitsRule({
      enabled: fresh.visitsRule?.enabled ?? true,
      enabledDays: fresh.visitsRule?.enabledDays || DEFAULT_VISITS_RULE.enabledDays,
      timeSlots: fresh.visitsRule?.timeSlots || DEFAULT_VISITS_RULE.timeSlots,
      durationMinutes: fresh.visitsRule?.durationMinutes || DEFAULT_VISITS_RULE.durationMinutes,
      maxConcurrentPerSlot: fresh.visitsRule?.maxConcurrentPerSlot || DEFAULT_VISITS_RULE.maxConcurrentPerSlot,
      maxPaxPerSlot: fresh.visitsRule?.maxPaxPerSlot || DEFAULT_VISITS_RULE.maxPaxPerSlot,
      daySchedules: fresh.visitsRule?.daySchedules || DEFAULT_VISITS_RULE.daySchedules,
    });
    setTastingsRule({
      enabled: fresh.tastingsRule?.enabled ?? true,
      enabledDays: fresh.tastingsRule?.enabledDays || DEFAULT_TASTINGS_RULE.enabledDays,
      timeSlots: fresh.tastingsRule?.timeSlots || DEFAULT_TASTINGS_RULE.timeSlots,
      durationMinutes: fresh.tastingsRule?.durationMinutes || DEFAULT_TASTINGS_RULE.durationMinutes,
      maxConcurrentPerSlot: fresh.tastingsRule?.maxConcurrentPerSlot || DEFAULT_TASTINGS_RULE.maxConcurrentPerSlot,
      maxPaxPerSlot: fresh.tastingsRule?.maxPaxPerSlot || DEFAULT_TASTINGS_RULE.maxPaxPerSlot,
      daySchedules: fresh.tastingsRule?.daySchedules || DEFAULT_TASTINGS_RULE.daySchedules,
    });
    setBlockRules(fresh.blockRules || []);
    setDateOverrides(fresh.dateOverrides || []);
  }, [selectedVenueId, venueAgendaConfigs]);

  // Blocos por Período
  const [blockRules, setBlockRules] = useState<AgendaBlockRule[]>(() => existingConfig.blockRules || []);

  // Bloqueios e Exceções Pontuais
  const [dateOverrides, setDateOverrides] = useState<AgendaDateOverride[]>(() => existingConfig.dateOverrides || []);

  // Calendário de Navegação para Modos 2 e 3
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Modal de Conflito de Bloqueio
  const [conflictModalData, setConflictModalData] = useState<{
    targetDate: string;
    affectedTasks: any[];
    onConfirm: () => void;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const currentRule = activeType === 'visit' ? visitsRule : tastingsRule;
  const setCurrentRule = activeType === 'visit' ? setVisitsRule : setTastingsRule;
  const themeColor = activeType === 'visit' ? '#10B981' : '#D97706';

  const handleToggleFreeMode = () => {
    setCurrentRule(prev => ({
      ...prev,
      isFreeMode: !prev.isFreeMode,
    }));
  };

  const handleToggleRecurringEnabled = () => {
    if (!isEditingRecurring) return;
    setCurrentRule(prev => ({
      ...prev,
      enabled: prev.enabled === false ? true : false,
    }));
  };

  // Duração da Sessão
  const handleDurationChange = (duration: number) => {
    if (!isEditingRecurring) return;
    setCurrentRule(prev => {
      const nextSchedules: Record<number, AgendaDaySchedule> = { ...(prev.daySchedules || {}) };
      Object.keys(nextSchedules).forEach(key => {
        const d = Number(key);
        if (nextSchedules[d]) {
          nextSchedules[d] = {
            ...nextSchedules[d],
            slotDurationMinutes: duration,
            timeSlots: generateSlotsFromRange(nextSchedules[d].startTime, nextSchedules[d].endTime, duration),
          };
        }
      });

      return {
        ...prev,
        durationMinutes: duration,
        daySchedules: nextSchedules,
      };
    });
  };

  // Alterna ativação de um dia da semana na regra recorrente
  const handleToggleDay = (dayId: number) => {
    if (!isEditingRecurring) return;
    setCurrentRule(prev => {
      const isEnabled = prev.enabledDays.includes(dayId);
      const nextEnabledDays = isEnabled 
        ? prev.enabledDays.filter(d => d !== dayId)
        : [...prev.enabledDays, dayId].sort();

      const existingDaySchedule = prev.daySchedules?.[dayId] || {
        dayOfWeek: dayId,
        enabled: !isEnabled,
        startTime: activeType === 'visit' ? '09:00' : '19:00',
        endTime: activeType === 'visit' ? '18:00' : '22:00',
        slotDurationMinutes: prev.durationMinutes,
      };

      const calculatedSlots = !isEnabled 
        ? generateSlotsFromRange(existingDaySchedule.startTime, existingDaySchedule.endTime, prev.durationMinutes)
        : [];

      return {
        ...prev,
        enabledDays: nextEnabledDays,
        daySchedules: {
          ...(prev.daySchedules || {}),
          [dayId]: {
            ...existingDaySchedule,
            enabled: !isEnabled,
            timeSlots: calculatedSlots,
          },
        },
      };
    });
  };

  // Atualiza horário de um dia da semana
  const handleUpdateDayTime = (dayId: number, field: 'startTime' | 'endTime', value: string) => {
    if (!isEditingRecurring) return;
    setCurrentRule(prev => {
      const currentSchedule = prev.daySchedules?.[dayId] || {
        dayOfWeek: dayId,
        enabled: true,
        startTime: activeType === 'visit' ? '09:00' : '19:00',
        endTime: activeType === 'visit' ? '18:00' : '22:00',
        slotDurationMinutes: prev.durationMinutes,
      };

      const updated = {
        ...currentSchedule,
        [field]: value,
      };

      updated.timeSlots = generateSlotsFromRange(updated.startTime, updated.endTime, prev.durationMinutes);

      return {
        ...prev,
        daySchedules: {
          ...(prev.daySchedules || {}),
          [dayId]: updated,
        },
      };
    });
  };

  // Copia a configuração de um dia para todos os demais dias ativos
  const handleCopyDayScheduleToAll = (sourceDayId: number) => {
    if (!isEditingRecurring) return;
    const source = currentRule.daySchedules?.[sourceDayId];
    if (!source) return;

    setCurrentRule(prev => {
      const nextSchedules: Record<number, AgendaDaySchedule> = { ...(prev.daySchedules || {}) };
      prev.enabledDays.forEach(dayId => {
        nextSchedules[dayId] = {
          ...source,
          dayOfWeek: dayId,
          enabled: true,
        };
      });

      return {
        ...prev,
        daySchedules: nextSchedules,
      };
    });
  };

  // Iniciar criação ou edição de bloco
  const handleStartCreateBlock = () => {
    setEditingBlockId(null);
    setNewBlockTitle('');
    setNewBlockStart('');
    setNewBlockEnd('');
    setNewBlockDefaultStartTime(activeType === 'visit' ? '09:00' : '19:00');
    setNewBlockDefaultEndTime(activeType === 'visit' ? '18:00' : '22:00');
    setNewBlockDuration(currentRule.durationMinutes || 60);
    setBlockDaysConfig({});
    setBlockCreationStep(1);
    setBlockViewMode('editor');
  };

  const handleStartEditBlock = (block: AgendaBlockRule) => {
    setEditingBlockId(block.id);
    setNewBlockTitle(block.title || '');
    setNewBlockStart(block.startDate || '');
    setNewBlockEnd(block.endDate || '');
    setNewBlockDuration(block.durationMinutes || currentRule.durationMinutes || 60);
    
    // Constrói configuração dos dias a partir dos dados do bloco
    const initialDaysConfig: Record<string, { enabled: boolean; startTime: string; endTime: string }> = {};
    const [y1, m1, d1] = block.startDate.split('-').map(Number);
    const [y2, m2, d2] = block.endDate.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      const isEnabled = block.enabledDays?.includes(dayOfWeek) ?? true;
      initialDaysConfig[dateStr] = {
        enabled: isEnabled,
        startTime: block.timeSlots?.[0] || '09:00',
        endTime: block.timeSlots?.[block.timeSlots.length - 1] || '18:00',
      };
    }

    setBlockDaysConfig(initialDaysConfig);
    setBlockCreationStep(2);
    setBlockViewMode('editor');
  };

  // Avançar para o Passo 2 da Criação do Bloco (Minicalendário do Período)
  const handleAdvanceBlockStep = () => {
    if (!newBlockStart || !newBlockEnd) {
      alert('Selecione data de início e término para o bloco.');
      return;
    }
    if (newBlockStart > newBlockEnd) {
      alert('A data de início deve ser anterior ou igual à data de término.');
      return;
    }

    // Inicializa os dias com a configuração padrão
    const initialConfig: Record<string, { enabled: boolean; startTime: string; endTime: string }> = {};
    const [y1, m1, d1] = newBlockStart.split('-').map(Number);
    const [y2, m2, d2] = newBlockEnd.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      // Não marca domingo por padrão, segunda a sábado ativos
      const isDefaultActive = dayOfWeek !== 0;
      initialConfig[dateStr] = {
        enabled: isDefaultActive,
        startTime: newBlockDefaultStartTime,
        endTime: newBlockDefaultEndTime,
      };
    }

    setBlockDaysConfig(initialConfig);
    setBlockCreationStep(2);
  };

  // Alterna um dia específico dentro do minicalendário do bloco
  const handleToggleBlockDay = (dateStr: string) => {
    setBlockDaysConfig(prev => {
      const current = prev[dateStr] || { enabled: true, startTime: newBlockDefaultStartTime, endTime: newBlockDefaultEndTime };
      return {
        ...prev,
        [dateStr]: {
          ...current,
          enabled: !current.enabled,
        },
      };
    });
  };

  // Salvar novo bloco por período
  const handleSaveBlockRule = () => {
    const activeDates = Object.entries(blockDaysConfig).filter(([_, cfg]) => cfg.enabled);
    const enabledDaysOfWeek = Array.from(new Set(activeDates.map(([dateStr]) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d).getDay();
    })));

    const calculatedSlots = generateSlotsFromRange(newBlockDefaultStartTime, newBlockDefaultEndTime, newBlockDuration);

    const blockToSave: AgendaBlockRule = {
      id: editingBlockId || generateUuid(),
      startDate: newBlockStart,
      endDate: newBlockEnd,
      title: newBlockTitle.trim() || `Período Especial (${newBlockStart.slice(5)} a ${newBlockEnd.slice(5)})`,
      type: activeType === 'visit' ? 'visits' : 'tastings',
      durationMinutes: newBlockDuration,
      enabledDays: enabledDaysOfWeek,
      timeSlots: calculatedSlots,
      maxConcurrentPerSlot: currentRule.maxConcurrentPerSlot,
      maxPaxPerSlot: currentRule.maxPaxPerSlot,
    };

    setBlockRules(prev => {
      if (editingBlockId) {
        return prev.map(b => b.id === editingBlockId ? blockToSave : b);
      }
      return [...prev, blockToSave];
    });

    setBlockViewMode('list');
  };

  // Remover bloco
  const handleRemoveBlockRule = (id: string) => {
    if (confirm('Deseja realmente remover este bloco de período especial?')) {
      setBlockRules(prev => prev.filter(b => b.id !== id));
    }
  };

  // Salva ou atualiza exceção pontual / bloqueio de data
  const handleSaveDateOverride = () => {
    if (!overrideDateInput) {
      alert('Selecione uma data para configurar.');
      return;
    }

    if (overrideIsBlocked) {
      const conflicts = findConflictingAppointmentsForDate(overrideDateInput);
      if (conflicts.length > 0) {
        setConflictModalData({
          targetDate: overrideDateInput,
          affectedTasks: conflicts,
          onConfirm: () => {
            conflicts.forEach(task => {
              updateTask(task.id, {
                status: 'todo',
                customStatusId: 'st_cancelled',
                resolution: 'Agendamento cancelado automaticamente: data bloqueada pela gerência.',
                customProperties: {
                  ...task.customProperties,
                  cancelledDueToBlock: true,
                  blockedDate: overrideDateInput,
                }
              });
            });

            setDateOverrides(prev => [
              ...prev.filter(o => o.date !== overrideDateInput),
              {
                date: overrideDateInput,
                isBlocked: true,
                reason: overrideReason || 'Data bloqueada pela administração com cancelamento de agendamentos.',
              }
            ]);
            setConflictModalData(null);
            setShowOverrideForm(false);
            setOverrideDateInput('');
            setOverrideReason('');
          },
        });
        return;
      }
    }

    setDateOverrides(prev => [
      ...prev.filter(o => o.date !== overrideDateInput),
      {
        date: overrideDateInput,
        isBlocked: overrideIsBlocked,
        reason: overrideReason || (overrideIsBlocked ? 'Bloqueio Pontual' : 'Horário Personalizado'),
      }
    ]);

    setShowOverrideForm(false);
    setOverrideDateInput('');
    setOverrideReason('');
  };

  // Busca agendamentos conflitantes em uma data
  const findConflictingAppointmentsForDate = (dateStr: string) => {
    const targetTypeKeyword = activeType === 'visit' ? 'visita' : 'degust';
    return tasks.filter(t => {
      if (t.dueDate !== dateStr) return false;
      if (t.status === 'completed' || (t.status as string) === 'cancelled') return false;
      if (selectedVenueId !== 'all' && t.venueId && t.venueId !== selectedVenueId) return false;
      const typeStr = (t.customType || t.type || '').toLowerCase();
      const titleStr = (t.title || '').toLowerCase();
      return typeStr.includes(targetTypeKeyword) || titleStr.includes(targetTypeKeyword);
    });
  };

  // Clique em uma data no calendário mensal
  const handleCalendarDayClick = (dateStr: string) => {
    const existingOverride = dateOverrides.find(o => o.date === dateStr);
    const isCurrentlyBlocked = existingOverride?.isBlocked;

    if (isCurrentlyBlocked) {
      setDateOverrides(prev => prev.filter(o => o.date !== dateStr));
    } else {
      setOverrideDateInput(dateStr);
      setOverrideIsBlocked(true);
      setShowOverrideForm(true);
    }
  };

  // Salvar alterações gerais no Supabase e fechar
  const handleSave = async () => {
    setIsSaving(true);
    const updatedConfig: VenueAgendaConfig = {
      id: existingConfig.id,
      venueId: selectedVenueId,
      visitsRule,
      tastingsRule,
      blockRules,
      dateOverrides,
    };

    try {
      await updateVenueAgendaConfig(updatedConfig);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar disponibilidade:', err);
      alert('Erro ao salvar as configurações no servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  // Botão Universal Voltar
  const handleUniversalBack = () => {
    if (activeMode !== 'hub') {
      if (activeMode === 'block' && blockViewMode === 'editor') {
        setBlockViewMode('list');
        return;
      }
      setActiveMode('hub');
      setIsEditingRecurring(false);
      setShowOverrideForm(false);
      return;
    }

    if (venueId && initialType) {
      onClose();
      return;
    }

    setPlanningStep(2);
  };

  // Blocos filtrados para o tipo ativo
  const activeTypeBlockRules = useMemo(() => {
    const targetType = activeType === 'visit' ? 'visits' : 'tastings';
    return blockRules.filter(b => b.type === targetType);
  }, [blockRules, activeType]);

  // Lista dos dias do período para o Passo 2 de Bloco
  const blockPeriodDays = useMemo(() => {
    if (!newBlockStart || !newBlockEnd || newBlockStart > newBlockEnd) return [];
    const days: string[] = [];
    const [y1, m1, d1] = newBlockStart.split('-').map(Number);
    const [y2, m2, d2] = newBlockEnd.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${day}`);
    }
    return days;
  }, [newBlockStart, newBlockEnd]);

  // Dias do calendário mensal para o Modo 3
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, dateStr: '' });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const override = dateOverrides.find(o => o.date === dateStr);
      const isBlocked = Boolean(override?.isBlocked);
      const hasBlockRule = blockRules.some(b => dateStr >= b.startDate && dateStr <= b.endDate);
      const dayOfWeek = new Date(year, month, d).getDay();
      const isRecurringActive = currentRule.enabledDays.includes(dayOfWeek);

      days.push({
        day: d,
        dateStr,
        isBlocked,
        override,
        hasBlockRule,
        isRecurringActive,
        conflictsCount: findConflictingAppointmentsForDate(dateStr).length,
      });
    }

    return days;
  }, [calendarMonth, dateOverrides, blockRules, currentRule, tasks, selectedVenueId]);

  const venueName = venues.find(v => v.id === selectedVenueId)?.name || 'Todas as Unidades';

  // ═════════════════════════════════════════════════════════════════════════════
  // ETAPA 1: SELEÇÃO DA UNIDADE (CASAS DE FESTA)
  // ═════════════════════════════════════════════════════════════════════════════
  if (planningStep === 1) {
    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--adm-bg-app, #F8FAFC)',
        color: 'var(--adm-text-title, #0F172A)',
        padding: '32px',
        overflowY: 'auto',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-accent)', marginBottom: '6px' }}>
              <Calendar size={18} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Etapa 1 de 3 • Planejamento de Calendário
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
              Selecione a Casa de Festas
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
              Escolha a unidade física para gerenciar e planejar as agendas de Visitas e Degustações.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-muted)',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {venues.map(v => (
            <div
              key={v.id}
              onClick={() => {
                setSelectedVenueId(v.id);
                setPlanningStep(2);
              }}
              style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ height: '140px', background: 'var(--adm-bg-surface)', position: 'relative', overflow: 'hidden' }}>
                {v.ballroomImageUrl || v.logoUrl ? (
                  <img src={v.ballroomImageUrl || v.logoUrl} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-text-muted)' }}>
                    <Building2 size={40} />
                  </div>
                )}
                {v.logoUrl && (
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '14px',
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '2px solid #FFFFFF',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}>
                    <img src={v.logoUrl} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  {v.name}
                </h3>
                {v.address && (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                    {v.address}
                  </p>
                )}
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--adm-border)',
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', fontWeight: 800 }}>
                    Planejar Horários
                  </span>
                  <ArrowRight size={14} color="var(--adm-accent)" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ETAPA 2: SELEÇÃO DO TIPO DE AGENDA (VISITAS VS DEGUSTAÇÕES)
  // ═════════════════════════════════════════════════════════════════════════════
  if (planningStep === 2) {
    const activeVenueObj = venues.find(v => v.id === selectedVenueId);
    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--adm-bg-app, #F8FAFC)',
        color: 'var(--adm-text-title, #0F172A)',
        padding: '32px',
        overflowY: 'auto',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <button
              type="button"
              onClick={() => setPlanningStep(1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-accent)',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: '12px',
                padding: 0,
              }}
            >
              <ArrowLeft size={16} />
              Voltar às Casas
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-accent)', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Etapa 2 de 3 • {activeVenueObj?.name || 'Casa Selecionada'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
              Qual Agenda Você Deseja Planejar?
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
              Selecione o tipo de compromisso para configurar a grade semanal, blocos e datas pontuais.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-muted)',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 2 Cards de Tipo */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          maxWidth: '850px',
        }}>
          {/* Card Visitas */}
          <div
            onClick={() => {
              setActiveType('visit');
              setPlanningStep(3);
            }}
            style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '18px',
              padding: '28px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}>
              <Building2 size={26} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Visitas Comerciais
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--adm-text-muted)', lineHeight: '1.4' }}>
                Apresentação dos salões, reuniões com noivos e debutantes, agendamento de reuniões presenciais para fechamento de contratos.
              </p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 800, fontSize: '0.80rem' }}>
              <span>Configurar Agenda de Visitas</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* Card Degustação */}
          <div
            onClick={() => {
              setActiveType('tasting');
              setPlanningStep(3);
            }}
            style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '18px',
              padding: '28px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(217,119,6,0.12)',
              border: '1px solid rgba(217,119,6,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}>
              <UtensilsCrossed size={26} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Degustação Gastronômica
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--adm-text-muted)', lineHeight: '1.4' }}>
                Experiência de menu completo, prova de pratos, definição de limites rigorosos de PAX (número de pessoas) e horários de buffet.
              </p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontWeight: 800, fontSize: '0.80rem' }}>
              <span>Configurar Agenda de Degustações</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ETAPA 3: PAINEL DE CONFIGURAÇÕES COM HEADER UNIVERSAL
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 60,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--adm-bg-card, #FFFFFF)',
      color: 'var(--adm-text-title, #0F172A)',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* HEADER SUPERIOR UNIVERSAL ÚNICO */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--adm-border, #E2E8F0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--adm-bg-surface, #F8FAFC)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Botão Universal Voltar */}
          <button
            type="button"
            onClick={handleUniversalBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-title)',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} />
            <span>{activeMode === 'hub' ? 'Voltar' : 'Voltar ao Menu'}</span>
          </button>

          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: activeType === 'visit' ? 'rgba(16,185,129,0.12)' : 'rgba(217,119,6,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${activeType === 'visit' ? 'rgba(16,185,129,0.25)' : 'rgba(217,119,6,0.25)'}`,
          }}>
            {activeType === 'visit' ? <Building2 size={20} color="#10B981" /> : <UtensilsCrossed size={20} color="#D97706" />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                {activeMode === 'hub' && (activeType === 'visit' ? 'Disponibilidade de Visitas Comerciais' : 'Disponibilidade de Degustações')}
                {activeMode === 'recurring' && 'Recorrência Semanal Padrão'}
                {activeMode === 'block' && 'Configuração por Bloco de Datas'}
                {activeMode === 'override' && 'Configuração por Data'}
              </h2>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: activeType === 'visit' ? 'rgba(16,185,129,0.12)' : 'rgba(217,119,6,0.12)',
                color: activeType === 'visit' ? '#10B981' : '#D97706',
                border: `1px solid ${activeType === 'visit' ? 'rgba(16,185,129,0.25)' : 'rgba(217,119,6,0.25)'}`,
              }}>
                {activeType === 'visit' ? 'VISITAS' : 'DEGUSTAÇÃO'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--adm-text-muted, #64748B)' }}>
              Unidade: <strong>{venueName}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '8px',
              background: themeColor,
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: `0 4px 14px ${themeColor}33`,
            }}
          >
            <Check size={16} />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--adm-border, #CBD5E1)',
              color: 'var(--adm-text-muted, #64748B)',
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* CORPO PRINCIPAL EXPANDIDO */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: 'var(--adm-bg-app, #F8FAFC)',
      }}>
        {/* ═══════════════════════════════════════════════════════════════════
            HUB GERAL (3 CARDS COM SETINHA)
            ═══════════════════════════════════════════════════════════════════ */}
        {activeMode === 'hub' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '860px', margin: '0 auto', width: '100%' }}>
                        {/* Card 0: Modo Livre (Qualquer Horário) */}
            <div style={{
              background: currentRule.isFreeMode ? 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(2,132,199,0.06) 100%)' : '#FFFFFF',
              borderRadius: '14px',
              border: `1.5px solid ${currentRule.isFreeMode ? themeColor : 'var(--adm-border, #E2E8F0)'}`,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              boxShadow: currentRule.isFreeMode ? `0 4px 18px ${themeColor}1a` : '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: currentRule.isFreeMode ? `${themeColor}20` : 'rgba(100,116,139,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: currentRule.isFreeMode ? themeColor : '#64748B',
                  flexShrink: 0,
                }}>
                  <Sparkles size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
                      Modo Livre (Qualquer Horário)
                    </span>
                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: currentRule.isFreeMode ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.12)',
                      color: currentRule.isFreeMode ? '#059669' : '#64748B',
                      border: `1px solid ${currentRule.isFreeMode ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
                    }}>
                      {currentRule.isFreeMode ? 'ATIVADO' : 'DESATIVADO'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.45 }}>
                    Quando ativado, a regra semanal fixa fica suspensa e qualquer horário pode ser agendado livremente. Se houver um bloco especial ou bloqueio pontual configurado, ele continuará se adaptando com prioridade máxima.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleFreeMode}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: currentRule.isFreeMode ? themeColor : 'var(--adm-bg-surface, #F1F5F9)',
                  border: `1px solid ${currentRule.isFreeMode ? themeColor : 'var(--adm-border, #CBD5E1)'}`,
                  color: currentRule.isFreeMode ? '#FFFFFF' : '#0F172A',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {currentRule.isFreeMode ? <Check size={16} /> : null}
                <span>{currentRule.isFreeMode ? 'Modo Livre Ativo' : 'Ativar Modo Livre'}</span>
              </button>
            </div>

            {/* Card 1: Recorrência Semanal */}
            <div 
              onClick={() => setActiveMode('recurring')}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '22px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: `${themeColor}14`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: themeColor,
                  flexShrink: 0,
                }}>
                  <Repeat size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                      Recorrência Semanal
                    </span>
                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: currentRule.isFreeMode ? 'rgba(217,119,6,0.12)' : (currentRule.enabled !== false ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'),
                      color: currentRule.isFreeMode ? '#D97706' : (currentRule.enabled !== false ? '#10B981' : '#EF4444'),
                      border: `1px solid ${currentRule.isFreeMode ? 'rgba(217,119,6,0.25)' : (currentRule.enabled !== false ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)')}`,
                    }}>
                      {currentRule.isFreeMode ? 'Suspensa (Modo Livre)' : (currentRule.enabled !== false ? 'Ativo' : 'Desativado')}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: 1.45 }}>
                    {currentRule.enabled !== false ? (
                      <>Ativo em <strong>{currentRule.enabledDays.length} dias da semana</strong> com slots de <strong>{currentRule.durationMinutes} minutos</strong>. Capacidade de <strong>{currentRule.maxConcurrentPerSlot} vaga(s) simultânea(s)</strong> • Até <strong>{currentRule.maxPaxPerSlot || 5} PAX</strong>.</>
                    ) : (
                      <span style={{ color: '#EF4444', fontWeight: 600 }}>Recorrência desativada. Nenhum dia semanal padrão estará aberto para agendamento.</span>
                    )}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: themeColor, fontWeight: 700, fontSize: '0.82rem' }}>
                <span>Abrir Recorrência</span>
                <ChevronRight size={18} />
              </div>
            </div>

            {/* Card 2: Configuração por Bloco */}
            <div 
              onClick={() => {
                setActiveMode('block');
                setBlockViewMode('list');
              }}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '22px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(2,132,199,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284C7',
                  flexShrink: 0,
                }}>
                  <CalendarRange size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                      Configuração por Bloco
                    </span>
                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: activeTypeBlockRules.length > 0 ? 'rgba(2,132,199,0.12)' : 'rgba(100,116,139,0.12)',
                      color: activeTypeBlockRules.length > 0 ? '#0284C7' : '#64748B',
                      border: `1px solid ${activeTypeBlockRules.length > 0 ? 'rgba(2,132,199,0.25)' : 'rgba(100,116,139,0.2)'}`,
                    }}>
                      {activeTypeBlockRules.length} bloco(s) configurado(s)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: 1.45 }}>
                    {activeTypeBlockRules.length === 0 ? (
                      'Defina períodos com minicalendário onde cada dia é configurado de forma individual.'
                    ) : (
                      `Existem ${activeTypeBlockRules.length} bloco(s) cadastrados com horários específicos que sobrepõem a semana.`
                    )}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', fontWeight: 700, fontSize: '0.82rem' }}>
                <span>Ver Blocos</span>
                <ChevronRight size={18} />
              </div>
            </div>

            {/* Card 3: Configuração por Data */}
            <div 
              onClick={() => setActiveMode('override')}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '22px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                  flexShrink: 0,
                }}>
                  <Calendar size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                      Configuração por Data
                    </span>
                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: dateOverrides.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.12)',
                      color: dateOverrides.length > 0 ? '#EF4444' : '#64748B',
                      border: `1px solid ${dateOverrides.length > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.2)'}`,
                    }}>
                      {dateOverrides.length} data(s) configurada(s)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: 1.45 }}>
                    Lista de datas com bloqueios de feriados, recessos pontuais ou horários específicos.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontWeight: 700, fontSize: '0.82rem' }}>
                <span>Ver Datas</span>
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MODO 1: RECORRÊNCIA SEMANAL (MODO LEITURA -> EDITAR -> SALVAR)
            ═══════════════════════════════════════════════════════════════════ */}
        {activeMode === 'recurring' && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid var(--adm-border, #E2E8F0)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            flex: 1,
            minHeight: '540px',
          }}>
            {/* Barra Superior da Recorrência com Modo Leitura / Edição */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--adm-border, #E2E8F0)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                    Grade de Horários Semanais Padrão
                  </h3>
              {/* Toggle Rápido de Modo Livre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>Modo Livre:</span>
                <button
                  type="button"
                  onClick={handleToggleFreeMode}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: currentRule.isFreeMode ? '#10B981' : '#CBD5E1',
                    background: currentRule.isFreeMode ? 'rgba(16,185,129,0.12)' : '#FFFFFF',
                    color: currentRule.isFreeMode ? '#059669' : '#64748B',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={12} />
                  <span>{currentRule.isFreeMode ? 'Ativo' : 'Desativado'}</span>
                </button>
              </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: isEditingRecurring ? 'rgba(2,132,199,0.12)' : 'rgba(100,116,139,0.12)',
                    color: isEditingRecurring ? '#0284C7' : '#64748B',
                    border: `1px solid ${isEditingRecurring ? 'rgba(2,132,199,0.3)' : 'rgba(100,116,139,0.2)'}`,
                  }}>
                    {isEditingRecurring ? 'MODO EDIÇÃO' : 'MODO VISUALIZAÇÃO'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  {isEditingRecurring 
                    ? 'Faça os ajustes desejados nos dias e turnos e clique em Salvar Planejamento.' 
                    : 'Visualização da regra semanal. Clique em "Editar Planejamento" para modificar.'}
                </p>
              </div>

              {/* Botões de Ação do Modo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {!isEditingRecurring ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingRecurring(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: themeColor,
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: `0 4px 12px ${themeColor}33`,
                    }}
                  >
                    <Edit3 size={15} />
                    Editar Planejamento
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingRecurring(false)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid #CBD5E1',
                        color: '#64748B',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar Edição
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRecurringConfirmModal(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        background: '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                      }}
                    >
                      <Check size={16} />
                      Salvar Planejamento
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Configurações Gerais da Recorrência */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'var(--adm-bg-surface, #F8FAFC)',
              border: '1px solid var(--adm-border, #E2E8F0)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Status da Recorrência:</span>
                <button
                  type="button"
                  disabled={!isEditingRecurring}
                  onClick={handleToggleRecurringEnabled}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: currentRule.enabled !== false ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                    background: currentRule.enabled !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: currentRule.enabled !== false ? '#10B981' : '#EF4444',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: isEditingRecurring ? 'pointer' : 'default',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isEditingRecurring ? 1 : 0.85,
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: currentRule.enabled !== false ? '#10B981' : '#EF4444' }} />
                  {currentRule.enabled !== false ? 'Ativo na Semana' : 'Desativado'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: '2px' }}>
                    DURAÇÃO DO HORÁRIO
                  </label>
                  <select
                    disabled={!isEditingRecurring}
                    value={currentRule.durationMinutes}
                    onChange={e => handleDurationChange(Number(e.target.value))}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: isEditingRecurring ? '#FFFFFF' : '#F1F5F9',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: isEditingRecurring ? 'pointer' : 'default',
                    }}
                  >
                    {DURATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: '2px' }}>
                    VAGAS SIMULTÂNEAS
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    disabled={!isEditingRecurring}
                    value={currentRule.maxConcurrentPerSlot}
                    onChange={e => setCurrentRule(prev => ({ ...prev, maxConcurrentPerSlot: Number(e.target.value) || 1 }))}
                    style={{
                      width: '70px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: isEditingRecurring ? '#FFFFFF' : '#F1F5F9',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: isEditingRecurring ? 'text' : 'default',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginBottom: '2px' }}>
                    PAX MÁX. POR FAMÍLIA
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    disabled={!isEditingRecurring}
                    value={currentRule.maxPaxPerSlot || (activeType === 'tasting' ? 4 : 5)}
                    onChange={e => setCurrentRule(prev => ({ ...prev, maxPaxPerSlot: Number(e.target.value) || 5 }))}
                    style={{
                      width: '70px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: isEditingRecurring ? '#FFFFFF' : '#F1F5F9',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: isEditingRecurring ? 'text' : 'default',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Grid Visual de 7 Colunas da Semana EXPANDIDA VERTICALMENTE */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '10px',
              flex: 1,
              minHeight: '380px',
            }}>
              {DAYS_OF_WEEK.map(day => {
                const isEnabled = currentRule.enabledDays.includes(day.id);
                const schedule = currentRule.daySchedules?.[day.id] || {
                  dayOfWeek: day.id,
                  enabled: isEnabled,
                  startTime: activeType === 'visit' ? '09:00' : '19:00',
                  endTime: activeType === 'visit' ? '18:00' : '22:00',
                  slotDurationMinutes: currentRule.durationMinutes,
                };

                const slots = isEnabled 
                  ? (schedule.timeSlots?.length ? schedule.timeSlots : generateSlotsFromRange(schedule.startTime, schedule.endTime, currentRule.durationMinutes))
                  : [];

                return (
                  <div
                    key={day.id}
                    style={{
                      background: isEnabled ? '#FFFFFF' : 'var(--adm-bg-surface, #F8FAFC)',
                      borderRadius: '10px',
                      border: isEnabled ? `1px solid ${themeColor}66` : '1px dashed var(--adm-border, #CBD5E1)',
                      padding: '12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: isEnabled ? '0 2px 6px rgba(0,0,0,0.03)' : 'none',
                    }}
                  >
                    {/* Topo da Coluna: Checkbox e Nome do Dia */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          disabled={!isEditingRecurring}
                          checked={isEnabled}
                          onChange={() => handleToggleDay(day.id)}
                          style={{ width: '15px', height: '15px', cursor: isEditingRecurring ? 'pointer' : 'default', accentColor: themeColor }}
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isEnabled ? '#0F172A' : '#94A3B8' }}>
                          {day.short}
                        </span>
                      </div>

                      {isEnabled && isEditingRecurring && (
                        <button
                          type="button"
                          onClick={() => handleCopyDayScheduleToAll(day.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                          title="Copiar horário deste dia para os demais"
                        >
                          <Copy size={13} />
                        </button>
                      )}
                    </div>

                    {/* Configuração de Horários (Início e Fim) */}
                    {isEnabled ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <input
                            type="time"
                            disabled={!isEditingRecurring}
                            value={schedule.startTime}
                            onChange={e => handleUpdateDayTime(day.id, 'startTime', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              color: '#0F172A',
                              background: isEditingRecurring ? '#FFFFFF' : '#F8FAFC',
                              colorScheme: 'light',
                            }}
                          />
                          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>às</span>
                          <input
                            type="time"
                            disabled={!isEditingRecurring}
                            value={schedule.endTime}
                            onChange={e => handleUpdateDayTime(day.id, 'endTime', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              color: '#0F172A',
                              background: isEditingRecurring ? '#FFFFFF' : '#F8FAFC',
                              colorScheme: 'light',
                            }}
                          />
                        </div>

                        {/* Lista de Horários Gerados com Altura Ampla */}
                        <div style={{
                          flex: 1,
                          minHeight: '260px',
                          maxHeight: '340px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          paddingRight: '2px',
                        }}>
                          {slots.map(s => (
                            <div
                              key={s}
                              style={{
                                padding: '6px 4px',
                                borderRadius: '5px',
                                background: activeType === 'visit' ? 'rgba(16,185,129,0.08)' : 'rgba(217,119,6,0.08)',
                                border: `1px solid ${activeType === 'visit' ? 'rgba(16,185,129,0.2)' : 'rgba(217,119,6,0.2)'}`,
                                color: activeType === 'visit' ? '#047857' : '#B45309',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                textAlign: 'center',
                              }}
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94A3B8',
                        fontSize: '0.74rem',
                        fontStyle: 'italic',
                        minHeight: '200px',
                      }}>
                        Fechado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MODO 2: POR BLOCO DE DATAS (LISTA DE BLOCOS -> MINICALENDÁRIO INDIVIDUAL)
            ═══════════════════════════════════════════════════════════════════ */}
        {activeMode === 'block' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Visualização 1: Lista de Blocos Cadastrados */}
            {blockViewMode === 'list' && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CalendarRange size={22} color="#0284C7" />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                        Blocos de Períodos Especiais
                      </h3>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.80rem', color: '#64748B' }}>
                      Os blocos prevalecem com prioridade máxima sobre a recorrência semanal durante o período configurado.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartCreateBlock}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 18px',
                      borderRadius: '8px',
                      background: '#0284C7',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(2,132,199,0.25)',
                    }}
                  >
                    <Plus size={16} />
                    Criar Novo Bloco
                  </button>
                </div>

                {/* Lista dos Blocos */}
                {activeTypeBlockRules.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    borderRadius: '12px',
                    background: 'var(--adm-bg-surface, #F8FAFC)',
                    border: '1px dashed #CBD5E1',
                    textAlign: 'center',
                  }}>
                    <CalendarRange size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800, color: '#334155' }}>
                      Nenhum Bloco Cadastrado
                    </h4>
                    <p style={{ margin: '0 0 16px', fontSize: '0.80rem', color: '#64748B', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                      Crie um bloco especial para períodos de mutirões, campanhas comemorativas ou recesso com minicalendário onde cada dia é configurado individualmente.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartCreateBlock}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Criar Primeiro Bloco
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeTypeBlockRules.map(b => (
                      <div
                        key={b.id}
                        style={{
                          padding: '16px 20px',
                          borderRadius: '10px',
                          background: 'var(--adm-bg-surface, #F8FAFC)',
                          border: '1px solid var(--adm-border, #E2E8F0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            background: 'rgba(2,132,199,0.12)',
                            color: '#0284C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <CalendarRange size={18} />
                          </div>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0F172A' }}>{b.title}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '0.76rem', color: '#64748B' }}>
                              <span>Período: <strong>{b.startDate.split('-').reverse().join('/')}</strong> até <strong>{b.endDate.split('-').reverse().join('/')}</strong></span>
                              <span>•</span>
                              <span>Slots de <strong>{b.durationMinutes} min</strong></span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEditBlock(b)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              color: '#0284C7',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Edit3 size={13} />
                            Editar Bloco
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveBlockRule(b.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px',
                            }}
                            title="Remover Bloco"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Visualização 2: Editor de Bloco (Passo 1 e Passo 2) */}
            {blockViewMode === 'editor' && (
              <div style={{
                padding: '24px',
                borderRadius: '14px',
                background: '#FFFFFF',
                border: '1px solid var(--adm-border, #E2E8F0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                {blockCreationStep === 1 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CalendarRange size={20} color="#0284C7" />
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                          {editingBlockId ? 'Editar Período do Bloco' : 'Passo 1: Selecionar o Período do Bloco'}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBlockViewMode('list')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          fontSize: '0.80rem',
                          fontWeight: 700,
                        }}
                      >
                        Cancelar
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '14px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                          TÍTULO DO BLOCO
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Mutirão de Visitas, Campanha de Férias..."
                          value={newBlockTitle}
                          onChange={e => setNewBlockTitle(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                          DATA DE INÍCIO *
                        </label>
                        <input
                          type="date"
                          value={newBlockStart}
                          onChange={e => setNewBlockStart(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            color: '#0F172A',
                            colorScheme: 'light',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                          DATA DE TÉRMINO *
                        </label>
                        <input
                          type="date"
                          value={newBlockEnd}
                          onChange={e => setNewBlockEnd(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            color: '#0F172A',
                            colorScheme: 'light',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAdvanceBlockStep}
                        style={{
                          padding: '9px 18px',
                          borderRadius: '8px',
                          background: '#0284C7',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>Avançar para Calendário do Bloco</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Passo 2: Minicalendário do Período com Configuração INDIVIDUAL de cada dia */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setBlockCreationStep(1)}
                          style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ArrowLeft size={16} />
                          <span style={{ fontSize: '0.78rem' }}>Voltar ao Período</span>
                        </button>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                          Configuração Individual dos Dias ({newBlockStart.split('-').reverse().join('/')} a {newBlockEnd.split('-').reverse().join('/')})
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveBlockRule}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          background: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Check size={16} />
                        Salvar e Concluir Bloco
                      </button>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B' }}>
                      Cada dia do período abaixo é configurável individualmente. Clique no dia para ativar/desativar ou definir seu horário próprio.
                    </p>

                    {/* Minicalendário com Configuração Individual por Dia */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                      gap: '12px',
                      maxHeight: '420px',
                      overflowY: 'auto',
                      padding: '4px',
                    }}>
                      {blockPeriodDays.map(dateStr => {
                        const [y, m, d] = dateStr.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        const weekdayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                        const dayMonth = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
                        const dayCfg = blockDaysConfig[dateStr] || { enabled: false, startTime: newBlockDefaultStartTime, endTime: newBlockDefaultEndTime };

                        return (
                          <div
                            key={dateStr}
                            style={{
                              padding: '12px',
                              borderRadius: '10px',
                              background: dayCfg.enabled ? '#FFFFFF' : 'var(--adm-bg-surface, #F8FAFC)',
                              border: dayCfg.enabled ? '1px solid #0284C7' : '1px dashed #CBD5E1',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              boxShadow: dayCfg.enabled ? '0 2px 6px rgba(2,132,199,0.08)' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: dayCfg.enabled ? '#0284C7' : '#94A3B8' }}>
                                {weekdayName.toUpperCase()} • {dayMonth}
                              </span>
                              <input
                                type="checkbox"
                                checked={dayCfg.enabled}
                                onChange={() => handleToggleBlockDay(dateStr)}
                                style={{ accentColor: '#0284C7', cursor: 'pointer', width: '15px', height: '15px' }}
                              />
                            </div>

                            {dayCfg.enabled ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="time"
                                  value={dayCfg.startTime}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setBlockDaysConfig(prev => ({
                                      ...prev,
                                      [dateStr]: { ...(prev[dateStr] || dayCfg), startTime: val },
                                    }));
                                  }}
                                  style={{ width: '100%', padding: '3px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.72rem', fontWeight: 700 }}
                                />
                                <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>às</span>
                                <input
                                  type="time"
                                  value={dayCfg.endTime}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setBlockDaysConfig(prev => ({
                                      ...prev,
                                      [dateStr]: { ...(prev[dateStr] || dayCfg), endTime: val },
                                    }));
                                  }}
                                  style={{ width: '100%', padding: '3px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.72rem', fontWeight: 700 }}
                                />
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', padding: '4px 0' }}>
                                Fechado
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MODO 3: POR DATA ESPECÍFICA (LISTA DE DATAS + CALENDÁRIO)
            ═══════════════════════════════════════════════════════════════════ */}
        {activeMode === 'override' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Cabeçalho da Configuração por Data */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid var(--adm-border, #E2E8F0)',
              padding: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={22} color="#EF4444" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                    Datas com Configurações e Bloqueios Específicos
                  </h3>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.80rem', color: '#64748B' }}>
                  Visualize as datas configuradas ou clique em qualquer dia do calendário para bloquear ou ajustar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOverrideDateInput('');
                  setOverrideIsBlocked(true);
                  setOverrideReason('');
                  setShowOverrideForm(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
                }}
              >
                <Plus size={16} />
                Adicionar Nova Data / Bloqueio
              </button>
            </div>

            {/* Lista das Datas Já Configuradas */}
            {dateOverrides.length > 0 && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '20px',
              }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '0.90rem', fontWeight: 800, color: '#0F172A' }}>
                  Datas Pré-Configuradas ({dateOverrides.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                  {dateOverrides.map(o => (
                    <div
                      key={o.date}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: o.isBlocked ? '#FEF2F2' : '#F0FDF4',
                        border: `1px solid ${o.isBlocked ? '#FECACA' : '#BBF7D0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: o.isBlocked ? '#DC2626' : '#15803D' }}>
                            {o.date.split('-').reverse().join('/')}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: o.isBlocked ? '#EF444422' : '#10B98122', color: o.isBlocked ? '#DC2626' : '#15803D' }}>
                            {o.isBlocked ? 'Bloqueada' : 'Especial'}
                          </span>
                        </div>
                        {o.reason && (
                          <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#64748B' }}>{o.reason}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDateOverrides(prev => prev.filter(x => x.date !== o.date))}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        title="Remover Configuração desta Data"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendário Mensal */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid var(--adm-border, #E2E8F0)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.90rem', fontWeight: 800, minWidth: '150px', textAlign: 'center' }}>
                    {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#F0FDF4', border: '1px solid #86EFAC' }} />
                    <span>Recorrência Ativa</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#FEF2F2', border: '1px solid #EF4444' }} />
                    <span>Data Bloqueada</span>
                  </div>
                </div>
              </div>

              {/* Grid Mensal */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(w => (
                  <span key={w} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', padding: '6px 0' }}>
                    {w}
                  </span>
                ))}

                {calendarGrid.map((cell, idx) => {
                  if (!cell.day) {
                    return <div key={`empty-${idx}`} style={{ height: '70px' }} />;
                  }

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => handleCalendarDayClick(cell.dateStr)}
                      style={{
                        height: '70px',
                        borderRadius: '8px',
                        border: cell.isBlocked ? '2px solid #EF4444' : '1px solid #E2E8F0',
                        background: cell.isBlocked ? '#FEF2F2' : (cell.isRecurringActive ? '#F0FDF4' : '#F8FAFC'),
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                      title={cell.isBlocked ? 'Data bloqueada (clique para desbloquear)' : 'Clique para bloquear ou configurar esta data'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.80rem', fontWeight: 800, color: cell.isBlocked ? '#EF4444' : '#0F172A' }}>
                          {cell.day}
                        </span>
                        {cell.isBlocked && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#EF4444' }}>
                            Bloqueado
                          </span>
                        )}
                      </div>

                      {cell.conflictsCount > 0 && (
                        <span style={{ fontSize: '0.64rem', color: '#D97706', fontWeight: 700 }}>
                          {cell.conflictsCount} agendamento(s)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO COM RESUMO DE ALTERAÇÃO DA RECORRÊNCIA */}
      {showRecurringConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid var(--adm-border, #E2E8F0)',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(16,185,129,0.12)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  Confirmar Planejamento Recorrente
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Você realmente deseja atualizar a regra recorrente para as {activeType === 'visit' ? 'Visitas' : 'Degustações'} da unidade <strong>{venueName}</strong>?
                </p>
              </div>
            </div>

            {/* Resumo do que foi alterado */}
            <div style={{
              background: 'var(--adm-bg-surface, #F8FAFC)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid var(--adm-border, #E2E8F0)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                <span style={{ color: '#64748B' }}>Dias Ativos da Semana:</span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>
                  {currentRule.enabledDays.length > 0 
                    ? currentRule.enabledDays.map(d => DAYS_OF_WEEK.find(x => x.id === d)?.short).join(', ')
                    : 'Nenhum dia ativo'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                <span style={{ color: '#64748B' }}>Duração por Horário:</span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>{currentRule.durationMinutes} minutos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                <span style={{ color: '#64748B' }}>Vagas Simultâneas por Slot:</span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>{currentRule.maxConcurrentPerSlot} vaga(s)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                <span style={{ color: '#64748B' }}>Limite de PAX por Família:</span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>{currentRule.maxPaxPerSlot || 5} pessoas</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowRecurringConfirmModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Voltar e Revisar
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRecurringConfirmModal(false);
                  setIsEditingRecurring(false);
                  handleSave();
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: '#10B981',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                }}
              >
                Confirmar e Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADICIONAR NOVA DATA / BLOQUEIO */}
      {showOverrideForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid var(--adm-border, #E2E8F0)',
            maxWidth: '460px',
            width: '100%',
            padding: '22px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              Configurar Data Específica
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                  DATA *
                </label>
                <input
                  type="date"
                  value={overrideDateInput}
                  onChange={e => setOverrideDateInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    colorScheme: 'light',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                  TIPO DE AÇÃO
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setOverrideIsBlocked(true)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: overrideIsBlocked ? '#EF4444' : '#CBD5E1',
                      background: overrideIsBlocked ? '#FEF2F2' : '#FFFFFF',
                      color: overrideIsBlocked ? '#DC2626' : '#64748B',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Bloquear Data Inteira
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideIsBlocked(false)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: !overrideIsBlocked ? '#10B981' : '#CBD5E1',
                      background: !overrideIsBlocked ? '#F0FDF4' : '#FFFFFF',
                      color: !overrideIsBlocked ? '#15803D' : '#64748B',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Liberar Exceção
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                  MOTIVO / OBSERVAÇÃO
                </label>
                <input
                  type="text"
                  placeholder="Ex: Feriado Nacional, Manutenção no Salão..."
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowOverrideForm(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid #CBD5E1',
                  color: '#64748B',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveDateOverride}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  background: '#10B981',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Salvar Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CONFLITO DE BLOQUEIO */}
      {conflictModalData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EF4444',
            maxWidth: '480px',
            width: '100%',
            padding: '22px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <ShieldAlert size={24} color="#EF4444" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Conflito: Agendamentos Marcados na Data
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              Existem <strong>{conflictModalData.affectedTasks.length} agendamento(s)</strong> marcados para a data {conflictModalData.targetDate.split('-').reverse().join('/')}.
              Ao confirmar o bloqueio, estes agendamentos serão automaticamente cancelados e sinalizados na agenda.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConflictModalData(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={conflictModalData.onConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirmar Bloqueio e Cancelar Agendamentos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
