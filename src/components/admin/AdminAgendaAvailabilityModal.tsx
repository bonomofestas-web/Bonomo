import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, Trash2, ShieldAlert, Sparkles,
  Check, Copy, ChevronLeft, ChevronRight,
  Plus, Building2, UtensilsCrossed,
  Repeat, CalendarRange, ArrowRight, ArrowLeft,
  Edit3, CheckCircle2, AlertCircle, MapPin, RotateCcw
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { generateUuid } from '../../utils/uuid';
import type { 
  VenueAgendaConfig, 
  AgendaRecurringRule, 
  AgendaDaySchedule,
  AgendaBlockRule,
  AgendaBlockDayConfig,
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


interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  size?: 'sm' | 'md';
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ 
  checked, 
  onChange, 
  disabled = false, 
  activeColor = '#10B981',
  size = 'md' 
}) => {
  const isSm = size === 'sm';
  const width = isSm ? '38px' : '48px';
  const height = isSm ? '22px' : '26px';
  const knobSize = isSm ? '18px' : '22px';
  const translate = isSm ? '16px' : '22px';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width,
        height,
        borderRadius: '9999px',
        background: checked ? activeColor : '#CBD5E1',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
        padding: '2px',
        boxShadow: checked ? `0 2px 8px ${activeColor}40` : 'none',
        opacity: disabled ? 0.6 : 1,
        outline: 'none',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: knobSize,
          height: knobSize,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
          transform: checked ? `translateX(${translate})` : 'translateX(0)',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </button>
  );
};

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

  const selectedVenue = venues.find(v => v.id === selectedVenueId);

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
  // Mapa de configuração individual por data dentro do bloco
  const [blockDaysConfig, setBlockDaysConfig] = useState<Record<string, AgendaBlockDayConfig>>({});
  const [selectedBlockDate, setSelectedBlockDate] = useState<string>('');
  const [blockCalendarMonth, setBlockCalendarMonth] = useState<Date>(() => new Date());

  // Toast de sucesso para salvar alterações
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Estados da Configuração por Data em Split-View (100% Livre)
  const [overrideCalendarMonth, setOverrideCalendarMonth] = useState<Date>(() => new Date());
  const [selectedOverrideDate, setSelectedOverrideDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Sub-estados para Data Específica / Overrides com duração, vagas e pax por data
  const [overrideIsBlocked, setOverrideIsBlocked] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideStartTime, setOverrideStartTime] = useState('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState('18:00');
  const [overrideDuration, setOverrideDuration] = useState(60);
  const [overrideMaxConcurrent, setOverrideMaxConcurrent] = useState(3);
  const [overrideMaxPax, setOverrideMaxPax] = useState(15);

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

  // Auto-Save reativo ao alternar o Modo Livre no Hub com mútua exclusão
  const handleToggleFreeModeAutoSave = (willBeFree: boolean) => {
    const updatedRule: AgendaRecurringRule = {
      ...currentRule,
      isFreeMode: willBeFree,
      enabled: willBeFree ? false : currentRule.enabled,
    };
    setCurrentRule(updatedRule);

    const updatedConfig: VenueAgendaConfig = {
      ...existingConfig,
      venueId: selectedVenueId,
      visitsRule: activeType === 'visit' ? updatedRule : existingConfig.visitsRule,
      tastingsRule: activeType === 'tasting' ? updatedRule : existingConfig.tastingsRule,
      blockRules: existingConfig.blockRules || [],
      dateOverrides,
      updatedAt: new Date().toISOString(),
    };

    updateVenueAgendaConfig(updatedConfig);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2000);
  };

  // Auto-Save reativo ao alternar a Recorrência Semanal no Hub com mútua exclusão
  const handleToggleRecurringAutoSave = (willBeActive: boolean) => {
    const updatedRule: AgendaRecurringRule = {
      ...currentRule,
      enabled: willBeActive,
      isFreeMode: willBeActive ? false : currentRule.isFreeMode,
    };
    setCurrentRule(updatedRule);

    const updatedConfig: VenueAgendaConfig = {
      ...existingConfig,
      venueId: selectedVenueId,
      visitsRule: activeType === 'visit' ? updatedRule : existingConfig.visitsRule,
      tastingsRule: activeType === 'tasting' ? updatedRule : existingConfig.tastingsRule,
      blockRules: existingConfig.blockRules || [],
      dateOverrides,
      updatedAt: new Date().toISOString(),
    };

    updateVenueAgendaConfig(updatedConfig);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2000);
  };

  // Atualiza campo individual de um dia na Recorrência Semanal
  const handleUpdateDayScheduleField = (
    dayId: number,
    field: 'startTime' | 'endTime' | 'slotDurationMinutes' | 'maxConcurrentPerSlot' | 'maxPaxPerSlot',
    value: any
  ) => {
    if (!isEditingRecurring) return;
    setCurrentRule(prev => {
      const currentSchedule = prev.daySchedules?.[dayId] || {
        dayOfWeek: dayId,
        enabled: true,
        startTime: activeType === 'visit' ? '09:00' : '19:00',
        endTime: activeType === 'visit' ? '18:00' : '22:00',
        slotDurationMinutes: prev.durationMinutes || 60,
        maxConcurrentPerSlot: prev.maxConcurrentPerSlot || 1,
        maxPaxPerSlot: prev.maxPaxPerSlot || 5,
      };

      const updated = {
        ...currentSchedule,
        [field]: value,
      };

      const dur = field === 'slotDurationMinutes' ? Number(value) : (updated.slotDurationMinutes || prev.durationMinutes || 60);
      updated.slotDurationMinutes = dur;
      updated.timeSlots = generateSlotsFromRange(updated.startTime, updated.endTime, dur);

      return {
        ...prev,
        daySchedules: {
          ...(prev.daySchedules || {}),
          [dayId]: updated,
        },
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

  // Copia a configuração completa (horários, duração, vagas e pax) de um dia para todos os demais dias ativos
  const handleCopyDayScheduleToAll = (sourceDayId: number) => {
    if (!isEditingRecurring) return;
    const source = currentRule.daySchedules?.[sourceDayId] || {
      dayOfWeek: sourceDayId,
      enabled: true,
      startTime: activeType === 'visit' ? '09:00' : '19:00',
      endTime: activeType === 'visit' ? '18:00' : '22:00',
      slotDurationMinutes: currentRule.durationMinutes || 60,
      maxConcurrentPerSlot: currentRule.maxConcurrentPerSlot || 1,
      maxPaxPerSlot: currentRule.maxPaxPerSlot || 5,
    };

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
    setSelectedBlockDate('');
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
    const initialDaysConfig: Record<string, AgendaBlockDayConfig> = {};
    const [y1, m1, d1] = block.startDate.split('-').map(Number);
    const [y2, m2, d2] = block.endDate.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const savedDateCfg = block.dateSchedules?.[dateStr];
      if (savedDateCfg) {
        initialDaysConfig[dateStr] = {
          ...savedDateCfg,
          isConfigured: true,
        };
      } else {
        const dayOfWeek = d.getDay();
        const isEnabled = block.enabledDays?.includes(dayOfWeek) ?? true;
        const sTime = block.timeSlots?.[0] || (activeType === 'visit' ? '09:00' : '19:00');
        const eTime = block.timeSlots?.[block.timeSlots.length - 1] || (activeType === 'visit' ? '18:00' : '22:00');
        const dur = block.durationMinutes || currentRule.durationMinutes || 60;
        initialDaysConfig[dateStr] = {
          enabled: isEnabled,
          isConfigured: true,
          startTime: sTime,
          endTime: eTime,
          durationMinutes: dur,
          maxConcurrentPerSlot: block.maxConcurrentPerSlot || currentRule.maxConcurrentPerSlot || 3,
          maxPaxPerSlot: block.maxPaxPerSlot || currentRule.maxPaxPerSlot || 15,
          timeSlots: generateSlotsFromRange(sTime, eTime, dur),
        };
      }
    }

    setBlockDaysConfig(initialDaysConfig);
    setSelectedBlockDate(block.startDate);
    setBlockCalendarMonth(new Date(y1, m1 - 1, 1));
    setBlockCreationStep(2);
    setBlockViewMode('editor');
  };

  // Avançar para o Passo 2 da Criação do Bloco (Calendário Split-View do Período)
  const handleAdvanceBlockStep = () => {
    if (!newBlockStart || !newBlockEnd) {
      alert('Selecione data de início e término para o bloco.');
      return;
    }
    if (newBlockStart > newBlockEnd) {
      alert('A data de início deve ser anterior ou igual à data de término.');
      return;
    }

    // Inicializa os dias com isConfigured = false (BRANCOS por padrão)
    const initialConfig: Record<string, AgendaBlockDayConfig> = {};
    const [y1, m1, d1] = newBlockStart.split('-').map(Number);
    const [y2, m2, d2] = newBlockEnd.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dur = newBlockDuration || 60;
      initialConfig[dateStr] = {
        enabled: true,
        isConfigured: false, // Inicia branco (não configurado)
        startTime: newBlockDefaultStartTime,
        endTime: newBlockDefaultEndTime,
        durationMinutes: dur,
        maxConcurrentPerSlot: currentRule.maxConcurrentPerSlot || 3,
        maxPaxPerSlot: currentRule.maxPaxPerSlot || 15,
        timeSlots: generateSlotsFromRange(newBlockDefaultStartTime, newBlockDefaultEndTime, dur),
      };
    }

    setBlockDaysConfig(initialConfig);
    setSelectedBlockDate(newBlockStart);
    setBlockCalendarMonth(new Date(y1, m1 - 1, 1));
    setBlockCreationStep(2);
  };

  // Atualiza um campo de configuração do dia selecionado no bloco
  const handleUpdateSelectedBlockDay = (updates: Partial<AgendaBlockDayConfig>) => {
    if (!selectedBlockDate) return;
    setBlockDaysConfig(prev => {
      const current = prev[selectedBlockDate] || {
        enabled: true,
        isConfigured: false,
        startTime: newBlockDefaultStartTime,
        endTime: newBlockDefaultEndTime,
        durationMinutes: newBlockDuration,
        maxConcurrentPerSlot: currentRule.maxConcurrentPerSlot || 3,
        maxPaxPerSlot: currentRule.maxPaxPerSlot || 15,
        timeSlots: [],
      };

      const merged = { ...current, ...updates, isConfigured: true };
      const dur = merged.durationMinutes || 60;
      merged.timeSlots = generateSlotsFromRange(merged.startTime, merged.endTime, dur);

      return {
        ...prev,
        [selectedBlockDate]: merged,
      };
    });
  };



  // Copia a configuração do dia selecionado para todas as outras datas do bloco
  const handleApplySelectedBlockDayToAll = () => {
    if (!selectedBlockDate) return;
    const sourceCfg = blockDaysConfig[selectedBlockDate];
    if (!sourceCfg) return;

    setBlockDaysConfig(prev => {
      const updated: Record<string, AgendaBlockDayConfig> = { ...prev };
      blockPeriodDays.forEach(d => {
        updated[d] = {
          ...sourceCfg,
          isConfigured: true,
        };
      });
      return updated;
    });
  };

  // Configura todas as datas restantes que ainda estão brancas (pendentes) com o padrão
  const handleConfigureAllRemaining = () => {
    setBlockDaysConfig(prev => {
      const updated: Record<string, AgendaBlockDayConfig> = { ...prev };
      blockPeriodDays.forEach(d => {
        if (!updated[d] || !updated[d].isConfigured) {
          const dur = newBlockDuration || 60;
          updated[d] = {
            enabled: true,
            isConfigured: true,
            startTime: newBlockDefaultStartTime,
            endTime: newBlockDefaultEndTime,
            durationMinutes: dur,
            maxConcurrentPerSlot: currentRule.maxConcurrentPerSlot || 3,
            maxPaxPerSlot: currentRule.maxPaxPerSlot || 15,
            timeSlots: generateSlotsFromRange(newBlockDefaultStartTime, newBlockDefaultEndTime, dur),
          };
        }
      });
      return updated;
    });
  };

  // Remover bloco
  const handleRemoveBlockRule = (id: string) => {
    if (confirm('Deseja realmente remover este bloco de período especial?')) {
      setBlockRules(prev => prev.filter(b => b.id !== id));
    }
  };


  // Células do calendário mensal livre para a Configuração por Data em Split-View
  const overrideCalendarDays = useMemo(() => {
    const year = overrideCalendarMonth.getFullYear();
    const month = overrideCalendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // 0=Dom, 1=Seg, ..., 6=Sab -> mapear para Seg=0 ... Dom=6
    let firstWeekday = firstDayOfMonth.getDay() - 1;
    if (firstWeekday < 0) firstWeekday = 6;

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      override?: AgendaDateOverride;
    }> = [];

    // Células vazias antes do primeiro dia
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({
        dateStr: '',
        dayNumber: 0,
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const override = dateOverrides.find(o => o.date === dateStr);
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        override,
      });
    }

    return cells;
  }, [overrideCalendarMonth, dateOverrides]);

  // Carrega os dados da data clicada no painel de Override
  const handleSelectOverrideDate = (dateStr: string) => {
    setSelectedOverrideDate(dateStr);
    const existing = dateOverrides.find(o => o.date === dateStr);
    if (existing) {
      setOverrideIsBlocked(existing.isBlocked);
      setOverrideReason(existing.reason || '');
      setOverrideStartTime(existing.startTime || (activeType === 'visit' ? '09:00' : '19:00'));
      setOverrideEndTime(existing.endTime || (activeType === 'visit' ? '18:00' : '22:00'));
      setOverrideDuration(existing.durationMinutes || currentRule.durationMinutes || 60);
      setOverrideMaxConcurrent(existing.maxConcurrentPerSlot || currentRule.maxConcurrentPerSlot || 1);
      setOverrideMaxPax(existing.maxPaxPerSlot || currentRule.maxPaxPerSlot || 5);
    } else {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      const daySchedule = currentRule.daySchedules?.[dayOfWeek];
      setOverrideIsBlocked(false);
      setOverrideReason('');
      setOverrideStartTime(daySchedule?.startTime || (activeType === 'visit' ? '09:00' : '19:00'));
      setOverrideEndTime(daySchedule?.endTime || (activeType === 'visit' ? '18:00' : '22:00'));
      setOverrideDuration(daySchedule?.slotDurationMinutes || currentRule.durationMinutes || 60);
      setOverrideMaxConcurrent(daySchedule?.maxConcurrentPerSlot || currentRule.maxConcurrentPerSlot || 1);
      setOverrideMaxPax(daySchedule?.maxPaxPerSlot || currentRule.maxPaxPerSlot || 5);
    }
  };

  // Salva a data selecionada no painel de Override
  const handleSaveSelectedOverrideDate = () => {
    if (!selectedOverrideDate) return;

    if (overrideIsBlocked) {
      const conflicts = findConflictingAppointmentsForDate(selectedOverrideDate);
      if (conflicts.length > 0) {
        setConflictModalData({
          targetDate: selectedOverrideDate,
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
                  blockedDate: selectedOverrideDate,
                }
              });
            });

            const newOverrides = [
              ...dateOverrides.filter(o => o.date !== selectedOverrideDate),
              {
                date: selectedOverrideDate,
                isBlocked: true,
                reason: overrideReason || 'Data bloqueada pela administração com cancelamento de agendamentos.',
                updatedAt: new Date().toISOString(),
              }
            ];
            setDateOverrides(newOverrides);

            const updatedConfig: VenueAgendaConfig = {
              ...existingConfig,
              venueId: selectedVenueId,
              visitsRule,
              tastingsRule,
              blockRules,
              dateOverrides: newOverrides,
              updatedAt: new Date().toISOString(),
            };
            updateVenueAgendaConfig(updatedConfig);

            setConflictModalData(null);
            setSaveSuccessToast(true);
            setTimeout(() => setSaveSuccessToast(false), 2500);
          },
        });
        return;
      }
    }

    const calculatedSlots = !overrideIsBlocked 
      ? generateSlotsFromRange(overrideStartTime, overrideEndTime, overrideDuration)
      : undefined;

    const newOverrides: AgendaDateOverride[] = [
      ...dateOverrides.filter(o => o.date !== selectedOverrideDate),
      {
        date: selectedOverrideDate,
        isBlocked: overrideIsBlocked,
        reason: overrideReason || (overrideIsBlocked ? 'Bloqueio Pontual' : 'Horário Personalizado'),
        startTime: !overrideIsBlocked ? overrideStartTime : undefined,
        endTime: !overrideIsBlocked ? overrideEndTime : undefined,
        durationMinutes: !overrideIsBlocked ? overrideDuration : undefined,
        maxConcurrentPerSlot: !overrideIsBlocked ? overrideMaxConcurrent : undefined,
        maxPaxPerSlot: !overrideIsBlocked ? overrideMaxPax : undefined,
        customSlots: calculatedSlots,
        updatedAt: new Date().toISOString(),
      }
    ];

    setDateOverrides(newOverrides);

    const updatedConfig: VenueAgendaConfig = {
      ...existingConfig,
      venueId: selectedVenueId,
      visitsRule,
      tastingsRule,
      blockRules,
      dateOverrides: newOverrides,
      updatedAt: new Date().toISOString(),
    };
    updateVenueAgendaConfig(updatedConfig);

    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2500);
  };

  // Remove a personalização da data selecionada (restaura padrão da casa)
  const handleRemoveSelectedOverrideDate = () => {
    if (!selectedOverrideDate) return;
    const newOverrides = dateOverrides.filter(o => o.date !== selectedOverrideDate);
    setDateOverrides(newOverrides);

    const updatedConfig: VenueAgendaConfig = {
      ...existingConfig,
      venueId: selectedVenueId,
      visitsRule,
      tastingsRule,
      blockRules,
      dateOverrides: newOverrides,
      updatedAt: new Date().toISOString(),
    };
    updateVenueAgendaConfig(updatedConfig);

    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2500);
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

  // Salvar alterações gerais no Supabase e voltar para a tela de modos (Hub)
  const handleSave = async () => {
    let nextBlockRules = [...blockRules];

    // Se estiver no editor de bloco no Passo 2, valida se todas as datas foram configuradas
    if (activeMode === 'block' && blockViewMode === 'editor' && blockCreationStep === 2) {
      const unconfigured = blockPeriodDays.filter(d => !blockDaysConfig[d]?.isConfigured);
      if (unconfigured.length > 0) {
        alert(`Atenção: Existem ${unconfigured.length} data(s) ainda não configuradas no período (destacadas em branco no calendário).\n\nTodas as datas precisam ser configuradas (ativas ou desativadas) antes de salvar o bloco. Você também pode clicar no botão "Configurar Restantes com Padrão" para aprovar as datas pendentes.`);
        return;
      }

      const activeDates = Object.entries(blockDaysConfig).filter(([_, cfg]) => cfg.enabled);
      const enabledDaysOfWeek = Array.from(new Set(activeDates.map(([dateStr]) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).getDay();
      })));

      const firstActiveCfg = activeDates[0]?.[1];
      const defaultDuration = firstActiveCfg?.durationMinutes || newBlockDuration || 60;
      const defaultStartTime = firstActiveCfg?.startTime || newBlockDefaultStartTime;
      const defaultEndTime = firstActiveCfg?.endTime || newBlockDefaultEndTime;

      const blockToSave: AgendaBlockRule = {
        id: editingBlockId || generateUuid(),
        startDate: newBlockStart,
        endDate: newBlockEnd,
        title: newBlockTitle.trim() || `Período Especial (${newBlockStart.split('-').reverse().join('/')} a ${newBlockEnd.split('-').reverse().join('/')})`,
        type: activeType === 'visit' ? 'visits' : 'tastings',
        durationMinutes: defaultDuration,
        enabledDays: enabledDaysOfWeek,
        timeSlots: generateSlotsFromRange(defaultStartTime, defaultEndTime, defaultDuration),
        maxConcurrentPerSlot: firstActiveCfg?.maxConcurrentPerSlot || currentRule.maxConcurrentPerSlot || 3,
        maxPaxPerSlot: firstActiveCfg?.maxPaxPerSlot || currentRule.maxPaxPerSlot || 15,
        dateSchedules: blockDaysConfig,
        updatedAt: new Date().toISOString(),
      };

      if (editingBlockId) {
        nextBlockRules = nextBlockRules.map(b => b.id === editingBlockId ? blockToSave : b);
      } else {
        nextBlockRules = [...nextBlockRules, blockToSave];
      }
      setBlockRules(nextBlockRules);
    }

    setIsSaving(true);
    const updatedConfig: VenueAgendaConfig = {
      id: existingConfig.id,
      venueId: selectedVenueId,
      visitsRule,
      tastingsRule,
      blockRules: nextBlockRules,
      dateOverrides,
    };

    try {
      await updateVenueAgendaConfig(updatedConfig);
      if (onSaved) onSaved();
      // Exibe toast de sucesso
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3500);
      // Volta para a tela de modos (Hub) sem fechar o modal
      setActiveMode('hub');
      setBlockViewMode('list');
      setIsEditingRecurring(false);
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

  // Helpers de formatação de data
  const formatDateLong = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatWeekdayLong = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const raw = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

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

  // Grade mensal do Calendário do Bloco (Segunda a Domingo)
  const blockCalendarDays = useMemo(() => {
    const year = blockCalendarMonth.getFullYear();
    const month = blockCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    // Segunda = coluna 0 ... Domingo = coluna 6
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number | null;
      isInBlock: boolean;
      isLeadingBlank?: boolean;
    }> = [];

    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({
        dateStr: `blank-lead-${i}`,
        dayNumber: null,
        isInBlock: false,
        isLeadingBlank: true,
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isInBlock = dateStr >= newBlockStart && dateStr <= newBlockEnd;
      cells.push({
        dateStr,
        dayNumber: d,
        isInBlock,
      });
    }

    const trailingBlanks = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < trailingBlanks; i++) {
      cells.push({
        dateStr: `blank-trail-${i}`,
        dayNumber: null,
        isInBlock: false,
      });
    }

    return cells;
  }, [blockCalendarMonth, newBlockStart, newBlockEnd]);

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
        padding: '14px 24px',
        borderBottom: '1px solid var(--adm-border, #E2E8F0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--adm-bg-surface, #F8FAFC)',
        flexShrink: 0,
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
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
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={14} />
            <span>{activeMode === 'hub' ? 'Voltar' : 'Voltar ao Menu'}</span>
          </button>

          {/* Logo da Casa com Fundo Preto de Destaque */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: '#000000',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            {selectedVenue?.logoUrl ? (
              <img src={selectedVenue.logoUrl} alt={venueName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Building2 size={22} color="#D4AF37" />
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {venueName}
            </h2>
            {selectedVenue?.address ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: 'var(--adm-text-muted, #64748B)', marginTop: '2px' }}>
                <MapPin size={11} color="#94A3B8" />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedVenue.address}</span>
              </div>
            ) : (
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--adm-text-muted, #64748B)' }}>
                Configuração de Agenda e Disponibilidade
              </p>
            )}
          </div>
        </div>

        {/* Seletor Central Elegante: Visita Comercial vs Degustação Gastronômica */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--adm-bg-input, #E2E8F0)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--adm-border, #CBD5E1)',
        }}>
          <button
            type="button"
            onClick={() => setActiveType('visit')}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: activeType === 'visit' ? '#10B981' : 'transparent',
              color: activeType === 'visit' ? '#FFFFFF' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: activeType === 'visit' ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
            }}
          >
            <Building2 size={13} />
            <span>Visita Comercial</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('tasting')}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: activeType === 'tasting' ? '#D97706' : 'transparent',
              color: activeType === 'tasting' ? '#FFFFFF' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: activeType === 'tasting' ? '0 2px 6px rgba(217,119,6,0.3)' : 'none',
            }}
          >
            <UtensilsCrossed size={13} />
            <span>Degustação Gastronômica</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {activeMode !== 'hub' && (
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
          )}

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
            
            {/* Banner Moderno e Suave quando Ambos estão Desativados */}
            {!currentRule.isFreeMode && currentRule.enabled === false && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: '#991B1B',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.04)',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#DC2626',
                }}>
                  <AlertCircle size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#B91C1C' }}>
                    Agenda de {activeType === 'visit' ? 'Visitas Comerciais' : 'Degustações'} Desativada para esta Casa
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#7F1D1D', marginTop: '2px', lineHeight: 1.45 }}>
                    Nenhum dia ou horário está aberto para agendamentos na unidade <strong>{venueName}</strong>. Para liberar a agenda desta casa, ligue a chavinha da <strong>Recorrência Semanal</strong> ou do <strong>Modo Livre</strong> abaixo.
                  </div>
                </div>
              </div>
            )}

            {/* Card 0: Modo Livre (Qualquer Horário) */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: `1.5px solid ${currentRule.isFreeMode ? themeColor : 'var(--adm-border, #E2E8F0)'}`,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              boxShadow: currentRule.isFreeMode ? `0 4px 18px ${themeColor}1a` : '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: currentRule.isFreeMode ? `${themeColor}18` : 'rgba(100,116,139,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: currentRule.isFreeMode ? themeColor : '#64748B',
                  flexShrink: 0,
                }}>
                  <Sparkles size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
                      Modo Livre (Qualquer Horário)
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: currentRule.isFreeMode ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.10)',
                      color: currentRule.isFreeMode ? '#059669' : '#64748B',
                      border: `1px solid ${currentRule.isFreeMode ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.18)'}`,
                    }}>
                      {currentRule.isFreeMode ? 'ATIVADO' : 'DESATIVADO'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.45 }}>
                    Permite agendar em qualquer horário livremente sem travas na grade semanal fixa. Blocos especiais continuam prevalecendo com prioridade.
                  </p>
                </div>
              </div>

              {/* Switch On/Off Elegante */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <ToggleSwitch
                  checked={Boolean(currentRule.isFreeMode)}
                  onChange={handleToggleFreeModeAutoSave}
                  activeColor={themeColor}
                />
              </div>
            </div>

            {/* Card 1: Recorrência Semanal */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: `1.5px solid ${currentRule.enabled !== false && !currentRule.isFreeMode ? themeColor : 'var(--adm-border, #E2E8F0)'}`,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              boxShadow: currentRule.enabled !== false && !currentRule.isFreeMode ? `0 4px 18px ${themeColor}1a` : '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: currentRule.enabled !== false && !currentRule.isFreeMode ? `${themeColor}18` : 'rgba(100,116,139,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: currentRule.enabled !== false && !currentRule.isFreeMode ? themeColor : '#64748B',
                  flexShrink: 0,
                }}>
                  <Repeat size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
                      Recorrência Semanal
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: currentRule.isFreeMode ? 'rgba(217,119,6,0.12)' : (currentRule.enabled !== false ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)'),
                      color: currentRule.isFreeMode ? '#D97706' : (currentRule.enabled !== false ? '#059669' : '#DC2626'),
                      border: `1px solid ${currentRule.isFreeMode ? 'rgba(217,119,6,0.25)' : (currentRule.enabled !== false ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.20)')}`,
                    }}>
                      {currentRule.isFreeMode ? 'SUSPENSA (MODO LIVRE)' : (currentRule.enabled !== false ? 'ATIVO NA SEMANA' : 'DESATIVADO')}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.45 }}>
                    {currentRule.enabled !== false && !currentRule.isFreeMode ? (
                      <>Grade fixa ativa em <strong>{currentRule.enabledDays.length} dia(s) da semana</strong> com horários, vagas e limites configurados por dia.</>
                    ) : currentRule.isFreeMode ? (
                      <span style={{ color: '#D97706', fontWeight: 600 }}>Suspensa enquanto o Modo Livre estiver ativo acima.</span>
                    ) : (
                      <span style={{ color: '#DC2626', fontWeight: 600 }}>Recorrência desativada. Ligue a chavinha para reativar.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Switch On/Off + Botão Configurar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                <ToggleSwitch
                  checked={Boolean(currentRule.enabled !== false && !currentRule.isFreeMode)}
                  onChange={handleToggleRecurringAutoSave}
                  activeColor={themeColor}
                />
                <button
                  type="button"
                  onClick={() => setActiveMode('recurring')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Configurar horários de cada dia da semana"
                >
                  <span>Configurar Grade</span>
                  <ChevronRight size={15} color="#64748B" />
                </button>
              </div>
            </div>

            {/* Card 2: Configuração por Bloco de Datas */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid var(--adm-border, #E2E8F0)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(2,132,199,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284C7',
                  flexShrink: 0,
                }}>
                  <CalendarRange size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
                      Configuração por Bloco
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: activeTypeBlockRules.length > 0 ? 'rgba(2,132,199,0.12)' : 'rgba(100,116,139,0.10)',
                      color: activeTypeBlockRules.length > 0 ? '#0284C7' : '#64748B',
                      border: `1px solid ${activeTypeBlockRules.length > 0 ? 'rgba(2,132,199,0.25)' : 'rgba(100,116,139,0.18)'}`,
                    }}>
                      {activeTypeBlockRules.length} bloco(s) configurado(s)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.45 }}>
                    Defina períodos com minicalendário onde cada dia é configurado de forma individual com horários e vagas próprias.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    setBlockViewMode('list');
                    setActiveMode('block');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#0284C7',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Configurar Blocos</span>
                  <ChevronRight size={15} color="#0284C7" />
                </button>
              </div>
            </div>

            {/* Card 3: Configuração por Data */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid var(--adm-border, #E2E8F0)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(239,68,68,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                  flexShrink: 0,
                }}>
                  <Calendar size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
                      Configuração por Data
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: dateOverrides.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.10)',
                      color: dateOverrides.length > 0 ? '#DC2626' : '#64748B',
                      border: `1px solid ${dateOverrides.length > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.18)'}`,
                    }}>
                      {dateOverrides.length} data(s) personalizada(s)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.45 }}>
                    Calendário mensal 100% livre para bloquear feriados ou criar horários especiais em datas pontuais.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setActiveMode('override')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#DC2626',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Configurar Datas</span>
                  <ChevronRight size={15} color="#DC2626" />
                </button>
              </div>
            </div>

          </div>
        )}

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
            {/* Barra Superior Enxuta da Recorrência Semanal */}
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
                  <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
                    Grade de Horários Semanais Padrão
                  </h3>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
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
                  Configure individualmente para cada dia da semana os horários, duração, vagas simultâneas e limite de convidados (PAX).
                </p>
              </div>

              {/* Controles de Ação da Grade Semanal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Switch de Ativação Geral da Recorrência */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px', borderRight: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                    {currentRule.enabled !== false && !currentRule.isFreeMode ? 'Recorrência Ativa' : 'Recorrência Desativada'}
                  </span>
                  <ToggleSwitch
                    checked={Boolean(currentRule.enabled !== false && !currentRule.isFreeMode)}
                    onChange={handleToggleRecurringAutoSave}
                    activeColor={themeColor}
                    size="sm"
                  />
                </div>

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
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Edit3 size={15} />
                    <span>Editar Grade Semanal</span>
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
                      <span>Salvar Grade</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Grid Visual de 7 Colunas da Semana (Configuração Individual por Dia) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '10px',
              flex: 1,
              alignItems: 'stretch',
            }}>
              {DAYS_OF_WEEK.map(day => {
                const isEnabled = currentRule.enabledDays.includes(day.id);
                const schedule: AgendaDaySchedule = currentRule.daySchedules?.[day.id] || {
                  dayOfWeek: day.id,
                  enabled: isEnabled,
                  startTime: activeType === 'visit' ? '09:00' : '19:00',
                  endTime: activeType === 'visit' ? '18:00' : '22:00',
                  slotDurationMinutes: currentRule.durationMinutes || 60,
                  maxConcurrentPerSlot: currentRule.maxConcurrentPerSlot || 1,
                  maxPaxPerSlot: currentRule.maxPaxPerSlot || 5,
                };

                const dayDuration = schedule.slotDurationMinutes || currentRule.durationMinutes || 60;
                const dayConcurrent = schedule.maxConcurrentPerSlot || currentRule.maxConcurrentPerSlot || 1;
                const dayPax = schedule.maxPaxPerSlot || currentRule.maxPaxPerSlot || 5;

                const slots = isEnabled 
                  ? (schedule.timeSlots?.length ? schedule.timeSlots : generateSlotsFromRange(schedule.startTime, schedule.endTime, dayDuration))
                  : [];

                return (
                  <div
                    key={day.id}
                    style={{
                      background: isEnabled ? '#FFFFFF' : 'var(--adm-bg-surface, #F8FAFC)',
                      borderRadius: '12px',
                      border: isEnabled ? `1.5px solid ${themeColor}55` : '1px dashed var(--adm-border, #CBD5E1)',
                      padding: '12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: isEnabled ? '0 2px 8px rgba(0,0,0,0.03)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Topo da Coluna: Checkbox de ativação do dia e nome */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: isEnabled ? '1px solid #F1F5F9' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          disabled={!isEditingRecurring}
                          checked={isEnabled}
                          onChange={() => handleToggleDay(day.id)}
                          style={{ width: '15px', height: '15px', cursor: isEditingRecurring ? 'pointer' : 'default', accentColor: themeColor }}
                        />
                        <span style={{ fontSize: '0.84rem', fontWeight: 900, color: isEnabled ? '#0F172A' : '#94A3B8' }}>
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
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '3px 5px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                          title="Copiar horários, duração, vagas e PAX deste dia para os outros dias da semana"
                        >
                          <Copy size={12} />
                          <span>Copiar</span>
                        </button>
                      )}
                    </div>

                    {/* Conteúdo do Dia Ativo */}
                    {isEnabled ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        {/* 1. Horário Início e Fim */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#64748B', marginBottom: '2px', textTransform: 'uppercase' }}>
                            Horário
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px' }}>
                            <input
                              type="time"
                              disabled={!isEditingRecurring}
                              value={schedule.startTime}
                              onChange={e => handleUpdateDayTime(day.id, 'startTime', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 3px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: '#0F172A',
                                background: isEditingRecurring ? '#FFFFFF' : '#F8FAFC',
                                colorScheme: 'light',
                                textAlign: 'center',
                              }}
                            />
                            <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>às</span>
                            <input
                              type="time"
                              disabled={!isEditingRecurring}
                              value={schedule.endTime}
                              onChange={e => handleUpdateDayTime(day.id, 'endTime', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 3px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: '#0F172A',
                                background: isEditingRecurring ? '#FFFFFF' : '#F8FAFC',
                                colorScheme: 'light',
                                textAlign: 'center',
                              }}
                            />
                          </div>
                        </div>

                        {/* 2. Duração do Horário deste Dia */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#64748B', marginBottom: '2px', textTransform: 'uppercase' }}>
                            Duração
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                              disabled={!isEditingRecurring}
                              value={[30, 45, 60, 90, 120].includes(dayDuration) ? dayDuration : 'custom'}
                              onChange={e => {
                                const val = e.target.value;
                                if (val !== 'custom') {
                                  handleUpdateDayScheduleField(day.id, 'slotDurationMinutes', Number(val));
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 3px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#0F172A',
                                background: isEditingRecurring ? '#FFFFFF' : '#F8FAFC',
                              }}
                            >
                              <option value={30}>30 min</option>
                              <option value={45}>45 min</option>
                              <option value={60}>1h</option>
                              <option value={90}>1h 30m</option>
                              <option value={120}>2h</option>
                              <option value="custom">Outro</option>
                            </select>

                            <input
                              type="number"
                              min={10}
                              max={300}
                              disabled={!isEditingRecurring}
                              value={dayDuration}
                              onChange={e => handleUpdateDayScheduleField(day.id, 'slotDurationMinutes', Math.max(10, Number(e.target.value) || 60))}
                              style={{
                                width: '42px',
                                padding: '4px 2px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#0F172A',
                                textAlign: 'center',
                                background: isEditingRecurring ? '#FFFFFF' : '#F8FAFC',
                              }}
                              title="Duração em minutos"
                            />
                            <span style={{ fontSize: '0.62rem', color: '#64748B' }}>m</span>
                          </div>
                        </div>

                        {/* 3. Vagas Simultâneas e PAX Máximo deste Dia */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.60rem', fontWeight: 800, color: '#64748B', marginBottom: '2px', textTransform: 'uppercase' }}>
                              Vagas
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              disabled={!isEditingRecurring}
                              value={dayConcurrent}
                              onChange={e => handleUpdateDayScheduleField(day.id, 'maxConcurrentPerSlot', Math.max(1, Number(e.target.value) || 1))}
                              style={{
                                width: '100%',
                                padding: '4px 3px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#0F172A',
                                textAlign: 'center',
                                background: isEditingRecurring ? '#FFFFFF' : '#F8FAFC',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.60rem', fontWeight: 800, color: '#64748B', marginBottom: '2px', textTransform: 'uppercase' }}>
                              PAX Máx
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              disabled={!isEditingRecurring}
                              value={dayPax}
                              onChange={e => handleUpdateDayScheduleField(day.id, 'maxPaxPerSlot', Math.max(1, Number(e.target.value) || 5))}
                              style={{
                                width: '100%',
                                padding: '4px 3px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#0F172A',
                                textAlign: 'center',
                                background: isEditingRecurring ? '#FFFFFF' : '#F8FAFC',
                              }}
                            />
                          </div>
                        </div>

                        {/* 4. Grade de Slots Calculados deste Dia */}
                        <div style={{ marginTop: '4px', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                            SLOTS ({slots.length})
                          </span>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                            gap: '4px',
                            maxHeight: '180px',
                            overflowY: 'auto',
                          }}>
                            {slots.map(s => (
                              <div
                                key={s}
                                style={{
                                  padding: '3px 2px',
                                  borderRadius: '4px',
                                  background: `${themeColor}12`,
                                  border: `1px solid ${themeColor}33`,
                                  color: themeColor,
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  textAlign: 'center',
                                }}
                              >
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94A3B8',
                        fontSize: '0.74rem',
                        fontStyle: 'italic',
                        minHeight: '220px',
                        gap: '8px',
                      }}>
                        <span>Fechado</span>
                        {isEditingRecurring && (
                          <button
                            type="button"
                            onClick={() => handleToggleDay(day.id)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#64748B',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Ativar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    {/* Passo 2: Calendário Split-View do Bloco */}
                    {(() => {
                      const totalDaysCount = blockPeriodDays.length;
                      const configuredDaysCount = blockPeriodDays.filter(d => blockDaysConfig[d]?.isConfigured).length;
                      const unconfiguredDaysCount = totalDaysCount - configuredDaysCount;
                      const activeDaysCount = blockPeriodDays.filter(d => blockDaysConfig[d]?.isConfigured && blockDaysConfig[d]?.enabled).length;
                      const deactivatedDaysCount = blockPeriodDays.filter(d => blockDaysConfig[d]?.isConfigured && !blockDaysConfig[d]?.enabled).length;

                      const selectedCfg = selectedBlockDate ? (blockDaysConfig[selectedBlockDate] || {
                        enabled: true,
                        isConfigured: false,
                        startTime: newBlockDefaultStartTime,
                        endTime: newBlockDefaultEndTime,
                        durationMinutes: newBlockDuration || 60,
                        maxConcurrentPerSlot: currentRule.maxConcurrentPerSlot || 3,
                        maxPaxPerSlot: currentRule.maxPaxPerSlot || 15,
                        timeSlots: generateSlotsFromRange(newBlockDefaultStartTime, newBlockDefaultEndTime, newBlockDuration || 60),
                      }) : null;

                      const selectedDaySlots = selectedCfg?.enabled 
                        ? (selectedCfg.timeSlots && selectedCfg.timeSlots.length > 0
                            ? selectedCfg.timeSlots 
                            : generateSlotsFromRange(selectedCfg.startTime, selectedCfg.endTime, selectedCfg.durationMinutes || 60))
                        : [];

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {/* Cabeçalho do Bloco e Status */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '14px',
                            paddingBottom: '16px',
                            borderBottom: '1px solid var(--adm-border, #E2E8F0)',
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '280px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => setBlockCreationStep(1)}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    color: '#64748B',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <ArrowLeft size={14} />
                                  <span>Alterar Período</span>
                                </button>
                                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#64748B' }}>
                                  Período: <strong>{newBlockStart.split('-').reverse().join('/')}</strong> até <strong>{newBlockEnd.split('-').reverse().join('/')}</strong> ({totalDaysCount} dias)
                                </span>
                              </div>

                              <input
                                type="text"
                                placeholder="TÍTULO DO BLOCO (Ex: FÉRIAS DE OUTUBRO, RECESSO...)"
                                value={newBlockTitle}
                                onChange={e => setNewBlockTitle(e.target.value)}
                                style={{
                                  fontSize: '1.25rem',
                                  fontWeight: 900,
                                  color: '#0F172A',
                                  border: 'none',
                                  borderBottom: '2px solid transparent',
                                  padding: '4px 0',
                                  outline: 'none',
                                  background: 'transparent',
                                  textTransform: 'uppercase',
                                  letterSpacing: '-0.02em',
                                }}
                                onFocus={e => e.target.style.borderBottomColor = '#0284C7'}
                                onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                              />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              {unconfiguredDaysCount === 0 ? (
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: '#DCFCE7',
                                  color: '#15803D',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.80rem',
                                  fontWeight: 800,
                                  border: '1px solid #86EFAC',
                                }}>
                                  <Check size={16} />
                                  <span>Todas as {totalDaysCount} datas configuradas</span>
                                </div>
                              ) : (
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: '#FEF3C7',
                                  color: '#B45309',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.80rem',
                                  fontWeight: 800,
                                  border: '1px solid #FCD34D',
                                }}>
                                  <AlertCircle size={16} />
                                  <span>{unconfiguredDaysCount} data(s) pendente(s) de configuração</span>
                                </div>
                              )}

                              {unconfiguredDaysCount > 0 && (
                                <button
                                  type="button"
                                  onClick={handleConfigureAllRemaining}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 14px',
                                    borderRadius: '8px',
                                    background: '#0284C7',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(2,132,199,0.2)',
                                  }}
                                  title="Aprova e marca todas as datas pendentes com o horário padrão"
                                >
                                  <Sparkles size={14} />
                                  <span>Configurar Restantes com Padrão</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* TELA DIVIDIDA (SPLIT-VIEW): Calendário Mensal à Esquerda e Configuração do Dia à Direita */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(260px, 0.85fr)',
                            gap: '24px',
                            alignItems: 'start',
                          }}>
                            {/* COLUNA ESQUERDA: Calendário Mensal */}
                            <div style={{
                              background: '#FFFFFF',
                              borderRadius: '14px',
                              border: '1px solid var(--adm-border, #E2E8F0)',
                              padding: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            }}>
                              {/* Barra de Navegação do Mês */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setBlockCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                    style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
                                    title="Mês Anterior"
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 800, minWidth: '160px', textAlign: 'center', textTransform: 'capitalize' }}>
                                    {blockCalendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setBlockCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                    style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
                                    title="Próximo Mês"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const [y, m] = newBlockStart.split('-').map(Number);
                                    setBlockCalendarMonth(new Date(y, m - 1, 1));
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid #CBD5E1',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    color: '#64748B',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Início do Bloco
                                </button>
                              </div>

                              {/* Legenda Visual de Status */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.72rem', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F1F5F9', border: '1px solid #E2E8F0' }} />
                                  <span style={{ color: '#94A3B8' }}>Fora do Bloco</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FFFFFF', border: '1px solid #CBD5E1' }} />
                                  <span style={{ color: '#475569', fontWeight: 600 }}>Pendente ({unconfiguredDaysCount})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#DCFCE7', border: '1px solid #22C55E' }} />
                                  <span style={{ color: '#15803D', fontWeight: 700 }}>Ativo & Configurado ({activeDaysCount})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FEE2E2', border: '1px solid #EF4444' }} />
                                  <span style={{ color: '#DC2626', fontWeight: 700 }}>Desativado ({deactivatedDaysCount})</span>
                                </div>
                              </div>

                              {/* Grade de 7 Colunas: Seg a Dom */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(w => (
                                  <span key={w} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', padding: '4px 0' }}>
                                    {w}
                                  </span>
                                ))}

                                {blockCalendarDays.map((cell, idx) => {
                                  if (!cell.isInBlock) {
                                    // Célula fora do bloco: cinza, sem número de dia, desabilitada
                                    return (
                                      <div
                                        key={cell.dateStr || `empty-${idx}`}
                                        style={{
                                          minHeight: '85px',
                                          borderRadius: '10px',
                                          background: '#F1F5F9',
                                          border: '1px solid #E2E8F0',
                                          cursor: 'not-allowed',
                                        }}
                                      />
                                    );
                                  }

                                  const cfg = blockDaysConfig[cell.dateStr];
                                  const isConfigured = Boolean(cfg?.isConfigured);
                                  const isEnabled = Boolean(cfg?.enabled);
                                  const isSelected = cell.dateStr === selectedBlockDate;

                                  // Cores de fundo e borda baseadas no status
                                  let bg = '#FFFFFF';
                                  let borderColor = '#CBD5E1';
                                  if (isConfigured) {
                                    if (isEnabled) {
                                      bg = '#DCFCE7';
                                      borderColor = '#22C55E';
                                    } else {
                                      bg = '#FEE2E2';
                                      borderColor = '#EF4444';
                                    }
                                  } else if (isSelected) {
                                    // Destaca em amarelo suave enquanto pendente
                                    bg = '#FEF3C7';
                                    borderColor = '#F59E0B';
                                  }

                                  return (
                                    <div
                                      key={cell.dateStr}
                                      onClick={() => setSelectedBlockDate(cell.dateStr)}
                                      style={{
                                        minHeight: '85px',
                                        borderRadius: '10px',
                                        background: bg,
                                        border: `1.5px solid ${borderColor}`,
                                        padding: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        boxShadow: isSelected ? '0 0 0 3px #0284C7, 0 4px 12px rgba(2,132,199,0.2)' : 'none',
                                        transition: 'all 0.12s ease',
                                      }}
                                    >
                                      {/* Topo da Célula com Dia */}
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{
                                          fontSize: '0.90rem',
                                          fontWeight: 800,
                                          color: !isConfigured ? '#334155' : (isEnabled ? '#15803D' : '#DC2626'),
                                        }}>
                                          {cell.dayNumber}
                                        </span>

                                        {isSelected && (
                                          <span style={{
                                            fontSize: '0.60rem',
                                            fontWeight: 800,
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            background: '#0284C7',
                                            color: '#FFFFFF',
                                          }}>
                                            Editando
                                          </span>
                                        )}
                                      </div>

                                      {/* Centro da Célula com Ícone Lucide Check ou X */}
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '4px 0' }}>
                                        {isConfigured ? (
                                          isEnabled ? (
                                            <>
                                              <Check size={28} color="#16A34A" strokeWidth={2.8} />
                                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#15803D' }}>
                                                {cfg?.startTime}-{cfg?.endTime}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <X size={28} color="#DC2626" strokeWidth={2.8} />
                                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#DC2626' }}>
                                                Desativado
                                              </span>
                                            </>
                                          )
                                        ) : (
                                          <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#94A3B8', fontStyle: 'italic' }}>
                                            Pendente
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* COLUNA DIREITA: Card de Configuração da Data Selecionada */}
                            <div style={{
                              background: '#FFFFFF',
                              borderRadius: '14px',
                              border: '1px solid var(--adm-border, #E2E8F0)',
                              padding: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                              position: 'sticky',
                              top: '20px',
                            }}>
                              {selectedBlockDate && selectedCfg ? (
                                <>
                                  {/* Cabeçalho do Card da Data Selecionada */}
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={selectedCfg.enabled}
                                        onChange={e => handleUpdateSelectedBlockDay({ enabled: e.target.checked })}
                                        style={{ width: '18px', height: '18px', accentColor: '#10B981', cursor: 'pointer' }}
                                      />
                                      <div>
                                        <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                                          {formatDateLong(selectedBlockDate)}
                                        </span>
                                        <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748B' }}>
                                          {formatWeekdayLong(selectedBlockDate)}
                                        </span>
                                      </div>
                                    </label>

                                    <span style={{
                                      fontSize: '0.70rem',
                                      fontWeight: 800,
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      background: !selectedCfg.isConfigured ? '#FEF3C7' : (selectedCfg.enabled ? '#DCFCE7' : '#FEE2E2'),
                                      color: !selectedCfg.isConfigured ? '#B45309' : (selectedCfg.enabled ? '#15803D' : '#DC2626'),
                                      border: `1px solid ${!selectedCfg.isConfigured ? '#FCD34D' : (selectedCfg.enabled ? '#86EFAC' : '#FCA5A5')}`,
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {!selectedCfg.isConfigured ? 'Pendente' : (selectedCfg.enabled ? 'Ativo' : 'Desativado')}
                                    </span>
                                  </div>

                                  {selectedCfg.enabled ? (
                                    <>
                                      {/* Faixa de Horário */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                          <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '3px' }}>
                                            INÍCIO
                                          </label>
                                          <input
                                            type="time"
                                            value={selectedCfg.startTime}
                                            onChange={e => handleUpdateSelectedBlockDay({ startTime: e.target.value })}
                                            style={{
                                              width: '100%',
                                              padding: '6px 10px',
                                              borderRadius: '6px',
                                              border: '1px solid #CBD5E1',
                                              fontSize: '0.85rem',
                                              fontWeight: 800,
                                            }}
                                          />
                                        </div>
                                        <span style={{ paddingTop: '16px', fontSize: '0.74rem', fontWeight: 700, color: '#94A3B8' }}>às</span>
                                        <div style={{ flex: 1 }}>
                                          <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '3px' }}>
                                            TÉRMINO
                                          </label>
                                          <input
                                            type="time"
                                            value={selectedCfg.endTime}
                                            onChange={e => handleUpdateSelectedBlockDay({ endTime: e.target.value })}
                                            style={{
                                              width: '100%',
                                              padding: '6px 10px',
                                              borderRadius: '6px',
                                              border: '1px solid #CBD5E1',
                                              fontSize: '0.85rem',
                                              fontWeight: 800,
                                            }}
                                          />
                                        </div>
                                      </div>

                                      {/* Campos de Configuração por Data: Duração, PAX e Vagas */}
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div style={{ gridColumn: 'span 2' }}>
                                          <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '3px' }}>
                                            DURAÇÃO DO HORÁRIO (MINUTOS)
                                          </label>
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <select
                                              value={selectedCfg.durationMinutes}
                                              onChange={e => handleUpdateSelectedBlockDay({ durationMinutes: Number(e.target.value) })}
                                              style={{
                                                flex: 1,
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #CBD5E1',
                                                fontSize: '0.80rem',
                                                fontWeight: 700,
                                                background: '#FFFFFF',
                                                color: '#0F172A',
                                              }}
                                            >
                                              {DURATION_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                              ))}
                                              {!DURATION_OPTIONS.some(opt => opt.value === selectedCfg.durationMinutes) && (
                                                <option value={selectedCfg.durationMinutes}>{selectedCfg.durationMinutes} minutos (Personalizado)</option>
                                              )}
                                            </select>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <input
                                                type="number"
                                                min={5}
                                                max={480}
                                                step={5}
                                                value={selectedCfg.durationMinutes}
                                                onChange={e => handleUpdateSelectedBlockDay({ durationMinutes: Math.max(5, Number(e.target.value)) })}
                                                style={{
                                                  width: '72px',
                                                  padding: '7px 8px',
                                                  borderRadius: '6px',
                                                  border: '1px solid #CBD5E1',
                                                  fontSize: '0.82rem',
                                                  fontWeight: 800,
                                                  background: '#FFFFFF',
                                                  color: '#0F172A',
                                                  textAlign: 'center',
                                                }}
                                                title="Digitar duração personalizada em minutos"
                                              />
                                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>min</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div>
                                          <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '3px' }}>
                                            VAGAS SIMULTÂNEAS
                                          </label>
                                          <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={selectedCfg.maxConcurrentPerSlot}
                                            onChange={e => handleUpdateSelectedBlockDay({ maxConcurrentPerSlot: Math.max(1, Number(e.target.value)) })}
                                            style={{
                                              width: '100%',
                                              padding: '6px 10px',
                                              borderRadius: '6px',
                                              border: '1px solid #CBD5E1',
                                              fontSize: '0.82rem',
                                              fontWeight: 800,
                                              background: '#FFFFFF',
                                              color: '#0F172A',
                                            }}
                                          />
                                        </div>

                                        <div>
                                          <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '3px' }}>
                                            PAX MÁX. POR FAMÍLIA
                                          </label>
                                          <input
                                            type="number"
                                            min={1}
                                            max={50}
                                            value={selectedCfg.maxPaxPerSlot}
                                            onChange={e => handleUpdateSelectedBlockDay({ maxPaxPerSlot: Math.max(1, Number(e.target.value)) })}
                                            style={{
                                              width: '100%',
                                              padding: '6px 10px',
                                              borderRadius: '6px',
                                              border: '1px solid #CBD5E1',
                                              fontSize: '0.82rem',
                                              fontWeight: 800,
                                              background: '#FFFFFF',
                                              color: '#0F172A',
                                            }}
                                          />
                                        </div>
                                      </div>

                                      {/* Lista de Slots Calculados em Tempo Real */}
                                      <div style={{ marginTop: '4px' }}>
                                        <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                                          HORÁRIOS DISPONÍVEIS ({selectedDaySlots.length} SLOTS)
                                        </label>
                                        <div style={{
                                          maxHeight: '180px',
                                          overflowY: 'auto',
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                                          gap: '6px',
                                          paddingRight: '4px',
                                        }}>
                                          {selectedDaySlots.map(slot => (
                                            <div
                                              key={slot}
                                              style={{
                                                padding: '7px 8px',
                                                borderRadius: '8px',
                                                background: '#F0FDF4',
                                                border: '1px solid #BBF7D0',
                                                color: '#15803D',
                                                fontWeight: 800,
                                                fontSize: '0.82rem',
                                                textAlign: 'center',
                                              }}
                                            >
                                              {slot}
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Ações Rápidas da Data */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                                        <button
                                          type="button"
                                          onClick={handleApplySelectedBlockDayToAll}
                                          style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            background: '#F8FAFC',
                                            border: '1px solid #CBD5E1',
                                            color: '#0F172A',
                                            fontSize: '0.76rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                          }}
                                        >
                                          <Copy size={14} />
                                          <span>Aplicar Horário a Todas as Datas do Bloco</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleUpdateSelectedBlockDay({ enabled: false })}
                                          style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#EF4444',
                                            fontSize: '0.74rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Desativar Atendimento neste Dia
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div style={{
                                      padding: '20px 14px',
                                      background: '#FEF2F2',
                                      borderRadius: '10px',
                                      border: '1px solid #FECACA',
                                      textAlign: 'center',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '12px',
                                      alignItems: 'center',
                                    }}>
                                      <X size={32} color="#DC2626" />
                                      <div>
                                        <strong style={{ display: 'block', fontSize: '0.84rem', color: '#DC2626' }}>
                                          Dia Desativado no Bloco
                                        </strong>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                                          Nenhum horário será ofertado aos clientes para agendamento nesta data.
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSelectedBlockDay({ enabled: true })}
                                        style={{
                                          padding: '7px 16px',
                                          borderRadius: '8px',
                                          background: '#10B981',
                                          color: '#FFFFFF',
                                          border: 'none',
                                          fontSize: '0.78rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                        }}
                                      >
                                        <Check size={14} />
                                        <span>Reativar Atendimento</span>
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748B', fontSize: '0.82rem' }}>
                                  <Calendar size={28} color="#94A3B8" style={{ marginBottom: '8px' }} />
                                  <p style={{ margin: 0, fontWeight: 700 }}>Selecione uma data no calendário</p>
                                  <span style={{ fontSize: '0.74rem' }}>Clique em qualquer dia do bloco para configurar seus horários.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={22} color="#DC2626" />
                  <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
                    Configuração por Data Específica (Bloqueios e Horários Especiais)
                  </h3>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: dateOverrides.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.12)',
                    color: dateOverrides.length > 0 ? '#DC2626' : '#64748B',
                    border: `1px solid ${dateOverrides.length > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.2)'}`,
                  }}>
                    {dateOverrides.length} data(s) personalizada(s)
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Navegue livremente pelo calendário mensal à esquerda, clique em qualquer dia e ajuste os horários ou bloqueie o atendimento à direita.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    handleSelectOverrideDate(today);
                    setOverrideCalendarMonth(new Date());
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Ir para Data Atual
                </button>
              </div>
            </div>

            {/* TELA DIVIDIDA (SPLIT-VIEW): Calendário 100% Livre à Esquerda e Painel do Dia à Direita */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 0.95fr)',
              gap: '24px',
              alignItems: 'start',
            }}>
              {/* COLUNA ESQUERDA: Calendário Mensal 100% Livre */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}>
                {/* Navegação de Mês */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setOverrideCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
                      title="Mês Anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, minWidth: '160px', textAlign: 'center', textTransform: 'capitalize', color: '#0F172A' }}>
                      {overrideCalendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOverrideCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
                      title="Próximo Mês"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#F8FAFC', border: '1px solid #CBD5E1' }} />
                      <span style={{ color: '#64748B' }}>Padrão</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#DCFCE7', border: '1px solid #22C55E' }} />
                      <span style={{ color: '#15803D', fontWeight: 700 }}>Especial</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#FEE2E2', border: '1px solid #EF4444' }} />
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>Bloqueado</span>
                    </div>
                  </div>
                </div>

                {/* Grade de 7 Colunas: Seg a Dom */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(w => (
                    <span key={w} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', padding: '4px 0' }}>
                      {w}
                    </span>
                  ))}

                  {overrideCalendarDays.map((cell, idx) => {
                    if (!cell.isCurrentMonth) {
                      return <div key={`empty-${idx}`} style={{ minHeight: '80px', borderRadius: '8px' }} />;
                    }

                    const isSelected = selectedOverrideDate === cell.dateStr;
                    const ov = cell.override;
                    const isBlocked = ov?.isBlocked;
                    const isSpecial = Boolean(ov && !ov.isBlocked);

                    let bg = '#FFFFFF';
                    let borderColor = '#E2E8F0';
                    let textColor = '#0F172A';

                    if (isBlocked) {
                      bg = '#FEF2F2';
                      borderColor = '#FCA5A5';
                      textColor = '#DC2626';
                    } else if (isSpecial) {
                      bg = '#F0FDF4';
                      borderColor = '#86EFAC';
                      textColor = '#15803D';
                    }

                    if (isSelected) {
                      borderColor = '#0F172A';
                    }

                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => handleSelectOverrideDate(cell.dateStr)}
                        style={{
                          minHeight: '80px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #0F172A' : `1px solid ${borderColor}`,
                          background: bg,
                          padding: '8px 6px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 900, color: textColor }}>
                            {cell.dayNumber}
                          </span>
                          {isBlocked && (
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 4px', borderRadius: '4px', background: '#EF4444', color: '#FFFFFF' }}>
                              Bloq
                            </span>
                          )}
                          {isSpecial && (
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 4px', borderRadius: '4px', background: '#10B981', color: '#FFFFFF' }}>
                              Especial
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.66rem', color: isBlocked ? '#DC2626' : (isSpecial ? '#15803D' : '#64748B'), lineHeight: 1.2 }}>
                          {isBlocked 
                            ? (ov?.reason || 'Bloqueado')
                            : isSpecial 
                              ? `${ov?.startTime || '09:00'} - ${ov?.endTime || '18:00'}`
                              : 'Padrão da Casa'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUNA DIREITA: Painel da Data Selecionada */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}>
                <div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Data Selecionada
                  </span>
                  <h4 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
                    {selectedOverrideDate ? selectedOverrideDate.split('-').reverse().join('/') : 'Nenhuma data selecionada'}
                  </h4>
                </div>

                {/* Toggle Aberto vs Bloqueado */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: overrideIsBlocked ? '#FEF2F2' : '#F0FDF4',
                  border: `1px solid ${overrideIsBlocked ? '#FECACA' : '#BBF7D0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: overrideIsBlocked ? '#DC2626' : '#15803D' }}>
                      {overrideIsBlocked ? 'Dia Bloqueado / Sem Atendimento' : 'Dia Aberto para Atendimento'}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: overrideIsBlocked ? '#B91C1C' : '#166534', marginTop: '1px' }}>
                      {overrideIsBlocked ? 'Nenhum agendamento será aceito nesta data.' : 'Horários configurados exclusivamente para este dia.'}
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={!overrideIsBlocked}
                    onChange={val => setOverrideIsBlocked(!val)}
                    activeColor="#10B981"
                  />
                </div>

                {/* Campos se Bloqueado: Motivo */}
                {overrideIsBlocked ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Motivo do Bloqueio (Opcional)
                    </label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      placeholder="Ex: Feriado Nacional, Manutenção, Evento Privado..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.80rem',
                        color: '#0F172A',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                ) : (
                  /* Campos se Aberto: Horários, Duração, Vagas e PAX */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Horário Início e Fim */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                        Horário de Atendimento
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="time"
                          value={overrideStartTime}
                          onChange={e => setOverrideStartTime(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            background: '#FFFFFF',
                            colorScheme: 'light',
                            textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>às</span>
                        <input
                          type="time"
                          value={overrideEndTime}
                          onChange={e => setOverrideEndTime(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            background: '#FFFFFF',
                            colorScheme: 'light',
                            textAlign: 'center',
                          }}
                        />
                      </div>
                    </div>

                    {/* Duração */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                        Duração de Cada Horário
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={[30, 45, 60, 90, 120].includes(overrideDuration) ? overrideDuration : 'custom'}
                          onChange={e => {
                            const val = e.target.value;
                            if (val !== 'custom') setOverrideDuration(Number(val));
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            background: '#FFFFFF',
                          }}
                        >
                          <option value={30}>30 minutos</option>
                          <option value={45}>45 minutos</option>
                          <option value={60}>1 hora (60 min)</option>
                          <option value={90}>1 hora e meia (90 min)</option>
                          <option value={120}>2 horas (120 min)</option>
                          <option value="custom">Outro (Digitar)</option>
                        </select>

                        <input
                          type="number"
                          min={10}
                          max={300}
                          value={overrideDuration}
                          onChange={e => setOverrideDuration(Math.max(10, Number(e.target.value) || 60))}
                          style={{
                            width: '65px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            textAlign: 'center',
                            background: '#FFFFFF',
                          }}
                          title="Duração em minutos"
                        />
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>min</span>
                      </div>
                    </div>

                    {/* Vagas Simultâneas e Limite PAX */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                          Vagas Simultâneas
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={overrideMaxConcurrent}
                          onChange={e => setOverrideMaxConcurrent(Math.max(1, Number(e.target.value) || 1))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            textAlign: 'center',
                            background: '#FFFFFF',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                          PAX Máx. Família
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={overrideMaxPax}
                          onChange={e => setOverrideMaxPax(Math.max(1, Number(e.target.value) || 5))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            textAlign: 'center',
                            background: '#FFFFFF',
                          }}
                        />
                      </div>
                    </div>

                    {/* Preview dos Slots Calculados */}
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748B', display: 'block', marginBottom: '6px' }}>
                        HORÁRIOS GERADOS EM TEMPO REAL:
                      </span>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))',
                        gap: '6px',
                        maxHeight: '130px',
                        overflowY: 'auto',
                      }}>
                        {generateSlotsFromRange(overrideStartTime, overrideEndTime, overrideDuration).map(s => (
                          <div
                            key={s}
                            style={{
                              padding: '4px 2px',
                              borderRadius: '5px',
                              background: '#F0FDF4',
                              border: '1px solid #86EFAC',
                              color: '#15803D',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textAlign: 'center',
                            }}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de Ação do Painel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSaveSelectedOverrideDate}
                    style={{
                      width: '100%',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
                    }}
                  >
                    <Check size={16} />
                    <span>Salvar Configuração Desta Data</span>
                  </button>

                  {dateOverrides.some(o => o.date === selectedOverrideDate) && (
                    <button
                      type="button"
                      onClick={handleRemoveSelectedOverrideDate}
                      style={{
                        width: '100%',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid #CBD5E1',
                        color: '#64748B',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <RotateCcw size={14} />
                      <span>Restaurar Regra Padrão</span>
                    </button>
                  )}
                </div>
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

      {/* TOAST DE FEEDBACK DE SALVAMENTO */}
      {saveSuccessToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#065F46',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1400,
          fontSize: '0.88rem',
          fontWeight: 700,
        }}>
          <CheckCircle2 size={20} color="#34D399" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      {/* MODAL DE ADICIONAR NOVA DATA / BLOQUEIO */}
      

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
