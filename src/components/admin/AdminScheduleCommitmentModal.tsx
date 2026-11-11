import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, Check, ChevronLeft, ChevronRight,
  Search, Building2, AlertCircle,
  UtensilsCrossed, User, Sparkles, Clock,
  ArrowRight, ArrowLeft,
  RotateCw, Loader2, AlertTriangle, Lock
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Lead, CommercialCommitmentType } from '../../types/admin';
import { agendaAvailabilityService } from '../../services/agendaAvailabilityService';
import { appointmentService } from '../../services/appointmentService';
import { AdminAppointmentReceiptModal } from './AdminAppointmentReceiptModal';
import type { AppointmentReceiptData } from './AdminAppointmentReceiptModal';

interface AdminScheduleCommitmentModalProps {
  lead?: Lead | null;
  initialType?: CommercialCommitmentType;
  presetDate?: string;
  onClose: () => void;
  onScheduled?: () => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const AdminScheduleCommitmentModal: React.FC<AdminScheduleCommitmentModalProps> = ({
  lead: initialLead,
  initialType = 'visit',
  presetDate,
  onClose,
  onScheduled,
}) => {
  const { 
    leads,
    funnels,
    venues, 
    collaborators, 
    currentUser, 
    venueAgendaConfigs,
    venueEvents, 
    appointments, 
    refreshAppointments,
    addTask,
    scheduleCommercialCommitment,
    getNextCloserRoundRobinPreview,
    consumeCloserRoundRobinSlot
  } = useAdminState();

  const [isCheckingRealtime, setIsCheckingRealtime] = useState<boolean>(false);
  const [isSyncingSlots, setIsSyncingSlots] = useState<boolean>(false);
  const [realtimeBookingConflict, setRealtimeBookingConflict] = useState<string | null>(null);

  // Tipo ativo: Visita Comercial ou Degustação Gastronômica
  const [type, setType] = useState<CommercialCommitmentType>(initialType);

  type WizardStepKey = 'lead_select' | 'datetime' | 'pax_closer' | 'confirmations';
  const wizardSteps: WizardStepKey[] = useMemo(() => {
    return initialLead
      ? ['datetime', 'pax_closer', 'confirmations']
      : ['lead_select', 'datetime', 'pax_closer', 'confirmations'];
  }, [initialLead]);

  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const activeStepKey: WizardStepKey = wizardSteps[Math.min(currentStepIdx, wizardSteps.length - 1)] || 'datetime';

  // Seleção de Lead (se não veio via props)
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLead?.id || '');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [isLeadSearchOpen, setIsLeadSearchOpen] = useState(false);


  // Modo Lead vs Cliente (Visível para usuários com acesso misto)
  const isPostSaleUser = currentUser?.role === 'master' || 
    currentUser?.role === 'admin' || 
    (currentUser as any)?.role === 'pos_venda' || 
    (currentUser as any)?.group === 'Pós-Venda';
  const [targetCategoryMode, setTargetCategoryMode] = useState<'lead' | 'client'>('lead');

  const currentLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || initialLead || null;
  }, [leads, selectedLeadId, initialLead]);

  // A casa é detectada automaticamente do lead
  const targetVenueId = currentLead?.venueId || venues[0]?.id || 'all';
  const targetVenue = venues.find(v => v.id === targetVenueId);
  const venueConfig = venueAgendaConfigs.find(c => c.venueId === targetVenueId);

  const isVisitConfigured = useMemo(() => {
    return agendaAvailabilityService.isCommitmentTypeConfigured(venueConfig, 'visit');
  }, [venueConfig]);

  const isTastingConfigured = useMemo(() => {
    return agendaAvailabilityService.isCommitmentTypeConfigured(venueConfig, 'tasting');
  }, [venueConfig]);

  const isCurrentTypeConfigured = type === 'visit' ? isVisitConfigured : isTastingConfigured;

  // Auto-ajusta o tipo selecionado caso o tipo inicial esteja desabilitado mas o outro esteja habilitado
  useEffect(() => {
    if (type === 'visit' && !isVisitConfigured && isTastingConfigured) {
      setType('tasting');
    } else if (type === 'tasting' && !isTastingConfigured && isVisitConfigured) {
      setType('visit');
    }
  }, [type, isVisitConfigured, isTastingConfigured]);

  // Calendário de Navegação (Etapa 3)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (presetDate) return presetDate;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [pax, setPax] = useState<number>(() => {
    return currentLead?.estimatedGuests ? Math.min(currentLead.estimatedGuests, 4) : (type === 'tasting' ? 4 : 2);
  });

  // Filtro estrito: apenas colaboradores com acesso ao Comercial/CRM da unidade (exclui Dev e Financeiro)
  const commercialCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      if (c.active === false) return false;
      if ((c as any).isDev) return false;
      if (c.role === 'financeiro' || c.department === 'financeiro') return false;
      const cVenues = (c.venueIds && c.venueIds.length > 0)
        ? c.venueIds
        : (c.venueId && c.venueId !== 'all' ? [c.venueId] : []);
      if (targetVenueId && targetVenueId !== 'all' && cVenues.length > 0 && !cVenues.includes(targetVenueId)) {
        return false;
      }
      if (c.role === 'master' || c.role === 'admin') return true;
      const sectors = (c as any).sectors as string[] | undefined;
      if (Array.isArray(sectors) && sectors.length > 0) {
        return sectors.includes('comercial');
      }
      if (c.role === 'pos_venda' || (c as any).group === 'Pós-Venda') return false;
      return ['crm', 'sdr', 'closer', 'comercial', 'commercial', 'gerente'].includes((c.role || '').toLowerCase());
    });
  }, [collaborators, targetVenueId]);

  const leadFunnel = useMemo(() => {
    if (!currentLead?.funnelId) return undefined;
    return funnels.find(f => f.id === currentLead.funnelId || f.name === currentLead.funnelId);
  }, [funnels, currentLead?.funnelId]);

  // SDRs elegíveis (prioriza Equipe Atuante configurada no funil)
  const eligibleSdrs = useMemo(() => {
    const teamIds = leadFunnel?.teamMemberIds || (leadFunnel as any)?.duplicateRuleConfig?._teamMemberIds || [];
    if (Array.isArray(teamIds) && teamIds.length > 0) {
      const configured = commercialCollaborators.filter(c => teamIds.includes(c.id));
      if (configured.length > 0) return configured;
    }
    return commercialCollaborators;
  }, [commercialCollaborators, leadFunnel]);

  // Closers elegíveis para seleção manual (prioriza lista configurada da agenda da unidade e do funil)
  const eligibleManualClosers = useMemo(() => {
    const agendaCloserIds = venueConfig?.closerIds || [];
    if (agendaCloserIds.length > 0) {
      const uniqueIds = Array.from(new Set(agendaCloserIds));
      const configured = commercialCollaborators.filter(c => uniqueIds.includes(c.id));
      if (configured.length > 0) return configured;
    }
    const fCloserIds = leadFunnel?.closerIds || (leadFunnel as any)?.duplicateRuleConfig?._closerIds || [];
    if (Array.isArray(fCloserIds) && fCloserIds.length > 0) {
      const configured = commercialCollaborators.filter(c => fCloserIds.includes(c.id));
      if (configured.length > 0) return configured;
    }
    return commercialCollaborators;
  }, [commercialCollaborators, venueConfig?.closerIds, leadFunnel]);

  const isAutoSplitConfigured = Boolean(
    venueConfig?.closerDistributionMode === 'round_robin' && (venueConfig?.closerIds?.length || 0) > 0
  );

  // ── REGRA DO CLOSER FIXO & SPLIT AUTOMÁTICO ──
  const existingFixedCloserId = useMemo(() => {
    return currentLead?.closerId || 
      currentLead?.visitCommitment?.responsibleId || 
      currentLead?.tastingCommitment?.responsibleId || 
      null;
  }, [currentLead]);

  const isCloserFixed = Boolean(existingFixedCloserId);

  // Split Automático de Closers por Unidade usando Lista de Ordem Atômica (caso não seja fixo)
  const autoSplitCloserId = useMemo(() => {
    if (isCloserFixed) return existingFixedCloserId;
    if (venueConfig?.closerDistributionMode === 'round_robin') {
      const nextPreview = getNextCloserRoundRobinPreview(targetVenueId);
      if (nextPreview?.id) return nextPreview.id;
    }
    return null;
  }, [isCloserFixed, existingFixedCloserId, venueConfig?.closerDistributionMode, targetVenueId, getNextCloserRoundRobinPreview]);

  const [responsibleId, setResponsibleId] = useState<string>(() => {
    if (existingFixedCloserId) return existingFixedCloserId;
    if (isAutoSplitConfigured) {
      return autoSplitCloserId || '';
    }
    return '';
  });

  useEffect(() => {
    if (isCloserFixed && existingFixedCloserId) {
      setResponsibleId(existingFixedCloserId);
    } else if (isAutoSplitConfigured && autoSplitCloserId) {
      setResponsibleId(autoSplitCloserId);
    }
  }, [isCloserFixed, existingFixedCloserId, isAutoSplitConfigured, autoSplitCloserId]);

  const [sdrId, setSdrId] = useState<string>(() => {
    if (initialLead) {
      return initialLead.sdrId || currentUser?.id || '';
    }
    return currentUser?.id || '';
  });

  // Confirmação 1 (em dias antes) & Confirmação 2 (em horas antes)
  const [enableConfirm1, setEnableConfirm1] = useState<boolean>(true);
  const [confirm1Days, setConfirm1Days] = useState<number>(1);
  const [confirm1Time, setConfirm1Time] = useState<string>('10:00');
  const [enableConfirm2, setEnableConfirm2] = useState<boolean>(true);
  const [confirm2Hours, setConfirm2Hours] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [followUpNotes, setFollowUpNotes] = useState<string>('');

  const getCollabJobTitle = (c: any) => {
    if (!c) return '';
    return ((c.customJobTitle || c.roleTitle || c.jobTitle || c.cargo || '') as string).trim();
  };

  // Sincroniza Closer e SDR automaticamente a partir do Lead ou usuário atual
  useEffect(() => {
    if (currentLead?.closerId) {
      setResponsibleId(currentLead.closerId);
    }
    if (currentLead?.sdrId) {
      setSdrId(currentLead.sdrId);
    } else if (currentUser?.id && !sdrId) {
      setSdrId(currentUser.id);
    }
  }, [currentLead?.id, currentLead?.closerId, currentLead?.sdrId, currentUser?.id]);

  // Cálculo de viabilidade para Confirmação 1 (em dias) e Confirmação 2 (em horas)
  const notificationViability = useMemo(() => {
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowTimeLocal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let calendarDaysUntil = 0;
    if (selectedDate) {
      const [sy, sm, sd] = selectedDate.split('-').map(Number);
      const [ty, tm, td] = todayLocal.split('-').map(Number);
      const targetMs = new Date(sy, sm - 1, sd).getTime();
      const todayMs = new Date(ty, tm - 1, td).getTime();
      calendarDaysUntil = Math.round((targetMs - todayMs) / 86400000);
    }

    // Se for hoje (calendarDaysUntil <= 0), Confirmação 1 em dias é impossível
    let maxViableDays = 0;
    if (calendarDaysUntil > 0) {
      maxViableDays = confirm1Time > nowTimeLocal ? calendarDaysUntil : Math.max(0, calendarDaysUntil - 1);
    }

    let maxViableHours = 0;
    if (selectedDate && selectedTime) {
      const aptMs = new Date(`${selectedDate}T${selectedTime}:00`).getTime();
      if (!Number.isNaN(aptMs)) {
        const diffMs = aptMs - Date.now();
        maxViableHours = Math.max(0, Math.floor(diffMs / 3600000));
      }
    }

    return {
      calendarDaysUntil,
      maxViableDays,
      maxViableHours,
      canUseConfirm1: calendarDaysUntil > 0 && maxViableDays >= 1,
      canUseConfirm2: maxViableHours >= 1,
    };
  }, [selectedDate, selectedTime, confirm1Time]);

  useEffect(() => {
    if (!notificationViability.canUseConfirm1) {
      setEnableConfirm1(false);
    } else if (confirm1Days > notificationViability.maxViableDays) {
      setConfirm1Days(Math.max(1, notificationViability.maxViableDays));
    }
    if (!notificationViability.canUseConfirm2) {
      setEnableConfirm2(false);
    } else if (confirm2Hours > notificationViability.maxViableHours) {
      setConfirm2Hours(Math.max(1, notificationViability.maxViableHours));
    }
  }, [notificationViability, confirm1Days, confirm2Hours]);

  const computeConfirm1DateStr = useCallback((daysBefore: number) => {
    if (!selectedDate) return new Date().toISOString().split('T')[0];
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - daysBefore);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }, [selectedDate]);

  const computeConfirm2DateTime = useCallback((hoursBefore: number) => {
    const baseMs = selectedDate && selectedTime
      ? new Date(`${selectedDate}T${selectedTime}:00`).getTime()
      : Date.now();
    const dt = new Date(baseMs - hoursBefore * 3600000);
    const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    return { date, time };
  }, [selectedDate, selectedTime]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Comprovante Oficial após conclusão
  const [completedReceipt, setCompletedReceipt] = useState<AppointmentReceiptData | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const currentTimeStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  // Filtragem de Leads para Autocomplete
  const filteredLeadOptions = useMemo(() => {
    let pool = leads;
    if (targetCategoryMode === 'client') {
      pool = leads.filter(l => (l as any).status === 'won' || (l as any).pipelineStage === 'won' || (l as any).isClient || (l as any).won);
    }
    if (!leadSearchQuery.trim()) return pool.slice(0, 15);
    const q = leadSearchQuery.toLowerCase();
    return pool.filter(l => 
      l.name.toLowerCase().includes(q) || 
      l.phone.includes(q) || 
      (l.code && l.code.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [leads, leadSearchQuery, targetCategoryMode]);

  // Navegação no calendário
  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const formattedMonthTitle = useMemo(() => {
    const m = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, [calendarMonth]);

  // Grid de disponibilidade do mês corrente
  const monthDaysGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = dateStr < todayStr;

      let isAvailable = false;
      let reason = 'Data no passado';
      let spotsCount = 0;

      if (!isPast) {
        const avail = agendaAvailabilityService.getAvailableSlots(
          dateStr,
          type,
          targetVenueId,
          appointments,
          venueConfig,
          venueEvents
        );
        // Audio 2: No dia de hoje, desconsidera horários que já passaram em relação à hora atual local
        const validSlots = dateStr === todayStr
          ? avail.slots.filter(s => s.isAvailable && s.time > currentTimeStr)
          : avail.slots.filter(s => s.isAvailable);

        isAvailable = avail.isDayAvailable && validSlots.length > 0;
        spotsCount = validSlots.length;
        reason = avail.reason || (isAvailable ? `${spotsCount} horários livres` : 'Sem horários');
      }

      days.push({
        dateStr,
        dayNum: day,
        dayOfWeek: new Date(year, month, day).getDay(),
        isPast,
        isAvailable,
        spotsCount,
        reason,
        isCurrentMonth: true,
      });
    }

    return {
      firstDayIndex,
      days,
    };
  }, [calendarMonth, todayStr, currentTimeStr, type, targetVenueId, appointments, venueConfig, venueEvents]);

  // Slots do dia selecionado
  const selectedDayAvailability = useMemo(() => {
    if (!selectedDate || selectedDate < todayStr) return { isDayAvailable: false, slots: [], isFreeMode: false };
    const avail = agendaAvailabilityService.getAvailableSlots(
      selectedDate,
      type,
      targetVenueId,
      appointments,
      venueConfig,
      venueEvents
    );
    // Audio 2: Bloquear e ocultar horários no próprio dia de hoje que já passaram em relação à hora atual local
    if (selectedDate === todayStr) {
      const activeSlots = avail.slots.filter(s => s.time > currentTimeStr);
      return {
        ...avail,
        slots: activeSlots,
        isDayAvailable: activeSlots.some(s => s.isAvailable),
      };
    }
    return avail;
  }, [selectedDate, todayStr, currentTimeStr, type, targetVenueId, appointments, venueConfig, venueEvents]);

  // Limite máximo de PAX respeitando a regra configurada na agenda para o horário escolhido
  const selectedSlotPaxLimit = useMemo(() => {
    if (selectedDayAvailability.isFreeMode) {
      return { isLimited: false, maxAllowedPax: 50, totalSlotMaxPax: undefined as number | undefined };
    }
    const matchingSlot = selectedTime
      ? selectedDayAvailability.slots.find(s => s.time === selectedTime)
      : selectedDayAvailability.slots[0];
    const configuredMax = matchingSlot?.maxPax ?? (type === 'tasting' ? venueConfig?.tastingsRule?.maxPaxPerSlot : venueConfig?.visitsRule?.maxPaxPerSlot);
    if (configuredMax !== undefined && configuredMax !== null && configuredMax > 0) {
      const remaining = matchingSlot?.remainingPax !== undefined ? matchingSlot.remainingPax : configuredMax;
      return {
        isLimited: true,
        maxAllowedPax: Math.max(1, remaining),
        totalSlotMaxPax: configuredMax,
      };
    }
    return { isLimited: false, maxAllowedPax: 50, totalSlotMaxPax: undefined as number | undefined };
  }, [selectedDayAvailability, selectedTime, type, venueConfig]);

  useEffect(() => {
    if (selectedSlotPaxLimit.isLimited && pax > selectedSlotPaxLimit.maxAllowedPax) {
      setPax(selectedSlotPaxLimit.maxAllowedPax);
    }
  }, [selectedSlotPaxLimit.isLimited, selectedSlotPaxLimit.maxAllowedPax, pax]);

  // Submissão do agendamento com validação atômica em tempo real (Anti-Race Condition)
  const handleConfirmSchedule = async () => {
    if (!currentLead) {
      setErrorMessage('Selecione o lead ou cliente para continuar.');
      setCurrentStepIdx(0);
      return;
    }
    if (!selectedDate) {
      setErrorMessage('Selecione uma data para o agendamento.');
      return;
    }
    if (!selectedTime) {
      setErrorMessage('Selecione um horário disponível.');
      return;
    }
    if (selectedSlotPaxLimit.isLimited && pax > selectedSlotPaxLimit.maxAllowedPax) {
      setErrorMessage(`Este horário suporta no máximo ${selectedSlotPaxLimit.maxAllowedPax} pessoa(s) disponível(is).`);
      return;
    }

    // Validação estrita de data e horário no passado (Audio 2)
    if (selectedDate < todayStr) {
      setErrorMessage('Não é permitido agendar em data retroativa. Escolha uma data futura.');
      return;
    }
    if (selectedDate === todayStr && selectedTime <= currentTimeStr) {
      setErrorMessage(`O horário das ${selectedTime} já passou. Escolha um horário após as ${currentTimeStr}.`);
      return;
    }
    const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
    if (scheduledDateTime.getTime() < Date.now()) {
      setErrorMessage('Não é permitido agendar em data ou horário que já passaram. Escolha um horário futuro.');
      return;
    }
    if (!targetVenueId || targetVenueId === 'all') {
      setErrorMessage('A casa de festas do lead precisa ser selecionada.');
      return;
    }

    setIsSubmitting(true);
    setIsCheckingRealtime(true);
    setErrorMessage('');
    setRealtimeBookingConflict(null);

    try {
      // 1. CHECAGEM ATÔMICA EM TEMPO REAL DIRETAMENTE NO SUPABASE
      // Previne que dois consultores salvem o mesmo horário simultaneamente
      const activeRule = venueConfig ? (type === 'visit' ? venueConfig.visitsRule : venueConfig.tastingsRule) : undefined;
      const realtimeCheck = await appointmentService.checkSlotAvailabilityRealtime({
        venueId: targetVenueId,
        date: selectedDate,
        time: selectedTime,
        type,
        pax,
        maxConcurrent: activeRule?.maxConcurrentPerSlot,
        maxPax: activeRule?.maxPaxPerSlot,
      });

      if (!realtimeCheck.available) {
        // Concorrência detectada: o horário acabou de ser ocupado por outro usuário!
        setIsSubmitting(false);
        setIsCheckingRealtime(false);

        // Atualiza imediatamente a lista de agendamentos no contexto
        await refreshAppointments();

        // Alerta o usuário e reseta o horário selecionado para nova escolha na grade atualizada
        setRealtimeBookingConflict(
          realtimeCheck.reason || 
          `O horário das ${selectedTime} acabou de ser preenchido por outro agendamento no sistema. Atualizamos a grade de horários abaixo com os horários disponíveis em tempo real. Por favor, selecione outro horário.`
        );
        setSelectedTime('');
        return;
      }

      // 2. Horário livre e verificado: prossegue com a criação no banco
      setIsCheckingRealtime(false);
      const prefix = type === 'visit' ? 'AGV' : 'AGD';
      const randomCode = Math.floor(10000 + Math.random() * 90000);
      const receiptCode = `#${prefix}-${randomCode}`;

      // Avança atomicamente o ponteiro da Lista de Ordem se o agendamento seguiu o Split Automático
      let finalCloserId = responsibleId;
      if (!isCloserFixed && isAutoSplitConfigured && (!responsibleId || responsibleId === autoSplitCloserId)) {
        const consumed = await consumeCloserRoundRobinSlot(targetVenueId);
        if (consumed?.id) {
          finalCloserId = consumed.id;
        }
      }

      const assignedUser = collaborators.find(c => c.id === finalCloserId);
      const effectiveSdrId = sdrId || currentUser?.id || '';
      const sdrUser = collaborators.find(c => c.id === effectiveSdrId) || currentUser;

      // Notificações viáveis (Confirmação 1 em dias, Confirmação 2 em horas)
      const cleanReminder1 = enableConfirm1 && notificationViability.canUseConfirm1 ? `${confirm1Days}d` : undefined;
      const cleanReminder2 = enableConfirm2 && notificationViability.canUseConfirm2 ? `${confirm2Hours}h` : undefined;

      // Agenda no Lead / Supabase (atualiza Closer e SDR no lead automaticamente)
      if (scheduleCommercialCommitment) {
        await scheduleCommercialCommitment(currentLead.id, type, {
          date: selectedDate,
          time: selectedTime,
          pax,
          responsibleCollaboratorId: finalCloserId || undefined,
          responsibleName: assignedUser?.name,
          notes: notes || undefined,
          venueId: targetVenueId,
          sdrId: effectiveSdrId || undefined,
          sdrName: sdrUser?.name || undefined,
          reminder1: cleanReminder1,
          reminder2: cleanReminder2,
        } as any);
      }

      // Cria a tarefa no mural de agendamentos (db_visits_tastings)
      const titlePrefix = type === 'visit' ? 'Visita Comercial' : 'Degustação Gastronômica';
      const taskTitle = `${titlePrefix}: ${currentLead.name} (${targetVenue?.name || 'Unidade'})`;

      await addTask({
        title: taskTitle,
        description: `Agendamento confirmado (${receiptCode})\nLocal: ${targetVenue?.name}\nHorário: ${selectedTime}\nAcompanhantes: Até ${pax} pessoas\nAnfitrião/Closer: ${assignedUser?.name || 'Equipe'}\nSDR: ${sdrUser?.name || 'Equipe'}\nObs: ${notes || 'Sem observações.'}`,
        dueDate: selectedDate,
        dueTime: selectedTime,
        venueId: targetVenueId,
        assignedToIds: finalCloserId ? [finalCloserId] : (currentUser?.id ? [currentUser.id] : []),
        databaseId: 'db_visits_tastings',
        leadId: currentLead.id,
        leadName: currentLead.name,
        createdById: currentUser?.id || 'admin',
        createdByName: currentUser?.name || 'Administrador',
        type: 'meeting', 
        customType: type === 'visit' ? 'Visita' : 'Degustação',
        status: 'todo',
        priority: 'high',
        
        customProperties: {
          leadId: currentLead.id,
          leadName: currentLead.name,
          leadPhone: currentLead.phone,
          leadEmail: currentLead.email,
          commitmentType: type,
          scheduledTime: selectedTime,
          pax,
          receiptCode,
          venueName: targetVenue?.name,
          venueAddress: targetVenue?.address,
          closerId: finalCloserId,
          closerName: assignedUser?.name,
          sdrId: effectiveSdrId,
          sdrName: sdrUser?.name,
        },
      });

      const sdrAssigneeIds = effectiveSdrId ? [effectiveSdrId] : [currentUser?.id || 'admin'];

      // Tarefa de Confirmação 1 (baseada em DIAS antes)
      if (cleanReminder1) {
        const c1Date = computeConfirm1DateStr(confirm1Days);
        await addTask({
          title: `Confirmação 1 (${confirm1Days}d antes): ${type === 'visit' ? 'Visita' : 'Degustação'} • ${currentLead.name}`,
          description: `Primeira confirmação (${confirm1Days} dia(s) antes) com ${currentLead.name} para ${selectedDate.split('-').reverse().join('/')} às ${selectedTime} (${targetVenue?.name || 'Unidade'}).\nAnfitrião/Closer: ${assignedUser?.name || 'Equipe'}\nOrientações: ${followUpNotes || 'Confirmar presença e lembrar endereço da unidade.'}`,
          dueDate: c1Date,
          dueTime: confirm1Time,
          venueId: targetVenueId,
          assignedToIds: sdrAssigneeIds,
          databaseId: 'db_follow_ups',
          leadId: currentLead.id,
          leadName: currentLead.name,
          createdById: currentUser?.id || 'admin',
          createdByName: currentUser?.name || 'Administrador',
          type: 'call',
          customType: 'Confirmação 1',
          status: 'todo',
          priority: 'high',
          customProperties: {
            isFollowUp: true,
            confirmationStep: 1,
            commitmentType: type,
            commitmentDate: selectedDate,
            commitmentTime: selectedTime,
            closerName: assignedUser?.name,
            sdrName: sdrUser?.name,
            leadPhone: currentLead.phone,
          },
        });
      }

      // Tarefa de Confirmação 2 (baseada em HORAS antes)
      if (cleanReminder2) {
        const c2 = computeConfirm2DateTime(confirm2Hours);
        await addTask({
          title: `Confirmação 2 (${confirm2Hours}h antes): ${type === 'visit' ? 'Visita' : 'Degustação'} • ${currentLead.name}`,
          description: `Reforço final (${confirm2Hours} hora(s) antes) com ${currentLead.name} para ${selectedDate.split('-').reverse().join('/')} às ${selectedTime} (${targetVenue?.name || 'Unidade'}).\nAnfitrião/Closer: ${assignedUser?.name || 'Equipe'}\nOrientações: ${followUpNotes || 'Enviar mensagem de confirmação e localização.'}`,
          dueDate: c2.date,
          dueTime: c2.time,
          venueId: targetVenueId,
          assignedToIds: sdrAssigneeIds,
          databaseId: 'db_follow_ups',
          leadId: currentLead.id,
          leadName: currentLead.name,
          createdById: currentUser?.id || 'admin',
          createdByName: currentUser?.name || 'Administrador',
          type: 'call',
          customType: 'Confirmação 2',
          status: 'todo',
          priority: 'high',
          customProperties: {
            isFollowUp: true,
            confirmationStep: 2,
            commitmentType: type,
            commitmentDate: selectedDate,
            commitmentTime: selectedTime,
            closerName: assignedUser?.name,
            sdrName: sdrUser?.name,
            leadPhone: currentLead.phone,
          },
        });
      }

      // Sincroniza cache de appointments para refletir a nova vaga ocupada
      await refreshAppointments();

      // Monta o comprovante oficial para exibição imediata
      const closerObj = collaborators.find(c => c.id === finalCloserId) ||
        collaborators.find(c => Boolean(finalCloserId) && (c.name || '').trim().toLowerCase() === (finalCloserId || '').trim().toLowerCase()) ||
        currentUser;
      const closerRoleTitle = getCollabJobTitle(closerObj);

      setCompletedReceipt({
        id: receiptCode,
        leadId: currentLead.id,
        type,
        code: receiptCode,
        leadName: currentLead.name,
        leadPhone: currentLead.phone,
        leadEmail: currentLead.email,
        venueId: targetVenue?.id || targetVenueId,
        venueName: targetVenue?.name || 'Unidade F5 System',
        venueAddress: targetVenue?.address || '',
        venueLogoUrl: targetVenue?.logoUrl || (targetVenue as any)?.logo_url,
        dateStr: selectedDate,
        timeStr: selectedTime,
        pax,
        closerId: closerObj?.id || finalCloserId,
        responsibleCollaboratorId: closerObj?.id || finalCloserId,
        closerName: closerObj?.name || currentUser?.name || 'Equipe',
        closerRoleTitle,
        closerPhotoUrl: (closerObj as any)?.photoUrl || closerObj?.avatarUrl || (closerObj as any)?.avatar_url,
        createdByName: currentUser?.name || 'Administrador',
        createdAtStr: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        notes,
      });

      if (onScheduled) onScheduled();
    } catch (err: any) {
      console.error('Erro ao agendar compromisso:', err);
      setErrorMessage(err.message || 'Erro ao salvar o agendamento.');
    } finally {
      setIsSubmitting(false);
      setIsCheckingRealtime(false);
    }
  };

  const handleManualSyncSlots = async () => {
    setIsSyncingSlots(true);
    setRealtimeBookingConflict(null);
    try {
      await refreshAppointments();
    } finally {
      setIsSyncingSlots(false);
    }
  };

  // Se o comprovante está aberto, renderiza o modal de comprovante oficial
  if (completedReceipt) {
    return (
      <AdminAppointmentReceiptModal
        receipt={completedReceipt}
        onClose={onClose}
      />
    );
  }

  const themeColor = type === 'visit' ? '#10B981' : '#D97706';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 1200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '92vh',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(226,232,240,0.8)',
      }}>
        {/* Barra de Progresso no Topo Dinâmica */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--adm-bg-surface, #F8FAFC)',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: themeColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Etapa {currentStepIdx + 1} de {wizardSteps.length} • Novo Agendamento
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
              {activeStepKey === 'lead_select' && 'Quem é o Lead ou Cliente?'}
              {activeStepKey === 'datetime' && 'Escolha a Data e o Horário'}
              {activeStepKey === 'pax_closer' && (isCloserFixed || isAutoSplitConfigured ? 'Número de Pessoas (PAX)' : 'Número de Pessoas e Closer Responsável')}
              {activeStepKey === 'confirmations' && 'Tarefas de Confirmação e Notificação'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Indicador Visual dos Passos */}
        <div style={{ display: 'flex', height: '4px', background: '#E2E8F0' }}>
          {wizardSteps.map((stepKey, idx) => (
            <div
              key={stepKey}
              style={{
                flex: 1,
                background: currentStepIdx >= idx ? themeColor : 'transparent',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Tipo de Agendamento (Visita vs Degustação) */}
        <div style={{
          padding: '12px 24px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <button
            type="button"
            disabled={!isVisitConfigured}
            onClick={() => isVisitConfigured && setType('visit')}
            title={!isVisitConfigured ? `Visita comercial não configurada para a unidade "${targetVenue?.name || ''}"` : undefined}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: type === 'visit' ? '#10B981' : '#E2E8F0',
              background: type === 'visit' ? 'rgba(16,185,129,0.1)' : '#FFFFFF',
              color: type === 'visit' ? '#10B981' : '#64748B',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: isVisitConfigured ? 'pointer' : 'not-allowed',
              opacity: isVisitConfigured ? 1 : 0.45,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Building2 size={16} />
            <span>Visita Comercial</span>
            {!isVisitConfigured && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.85 }}>(Indisponível)</span>
            )}
          </button>

          <button
            type="button"
            disabled={!isTastingConfigured}
            onClick={() => isTastingConfigured && setType('tasting')}
            title={!isTastingConfigured ? `Degustação não configurada para a unidade "${targetVenue?.name || ''}"` : undefined}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: type === 'tasting' ? '#D97706' : '#E2E8F0',
              background: type === 'tasting' ? 'rgba(217,119,6,0.1)' : '#FFFFFF',
              color: type === 'tasting' ? '#D97706' : '#64748B',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: isTastingConfigured ? 'pointer' : 'not-allowed',
              opacity: isTastingConfigured ? 1 : 0.45,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UtensilsCrossed size={16} />
            <span>Degustação Gastronômica</span>
            {!isTastingConfigured && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.85 }}>(Indisponível)</span>
            )}
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}>
          {errorMessage && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: '0.80rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              ETAPA: SELEÇÃO DO LEAD / CLIENTE (quando aberto fora do card do lead)
              ═════════════════════════════════════════════════════════════════ */}
          {activeStepKey === 'lead_select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {isPostSaleUser && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetCategoryMode('lead');
                      setSelectedLeadId('');
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: targetCategoryMode === 'lead' ? themeColor : '#CBD5E1',
                      background: targetCategoryMode === 'lead' ? `${themeColor}12` : '#FFFFFF',
                      color: targetCategoryMode === 'lead' ? themeColor : '#64748B',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Buscar em Leads Comerciais
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetCategoryMode('client');
                      setSelectedLeadId('');
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: targetCategoryMode === 'client' ? themeColor : '#CBD5E1',
                      background: targetCategoryMode === 'client' ? `${themeColor}12` : '#FFFFFF',
                      color: targetCategoryMode === 'client' ? themeColor : '#64748B',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Buscar em Clientes (Pós-Venda)
                  </button>
                </div>
              )}

              {/* Campo de Busca Rápida */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  DIGITE O NOME, WHATSAPP OU CÓDIGO DO {targetCategoryMode === 'client' ? 'CLIENTE' : 'LEAD'} *
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}>
                    <Search size={18} color="#94A3B8" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome ou telefone..."
                      value={leadSearchQuery}
                      onChange={e => {
                        setLeadSearchQuery(e.target.value);
                        setIsLeadSearchOpen(true);
                      }}
                      onFocus={() => setIsLeadSearchOpen(true)}
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#0F172A',
                      }}
                    />
                  </div>

                  {/* Dropdown de Resultados */}
                  {isLeadSearchOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '6px',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      zIndex: 30,
                    }}>
                      {filteredLeadOptions.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.80rem', color: '#94A3B8' }}>
                          Nenhum registro encontrado com estes termos.
                        </div>
                      ) : (
                        filteredLeadOptions.map(l => {
                          const vName = venues.find(v => v.id === l.venueId)?.name || 'Sem casa vinculada';
                          return (
                            <div
                              key={l.id}
                              onClick={() => {
                                setSelectedLeadId(l.id);
                                setIsLeadSearchOpen(false);
                                setLeadSearchQuery('');
                              }}
                              style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #F1F5F9',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.12s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                            >
                              <div>
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>{l.name}</span>
                                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                                  {l.phone} • Unidade: <strong>{vName}</strong>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.70rem', color: themeColor, fontWeight: 700 }}>
                                Selecionar
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Selecionado com Confirmação */}
              {currentLead && (
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '14px',
                  background: 'var(--adm-bg-surface, #F8FAFC)',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: `${themeColor}15`,
                      color: themeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1rem',
                      border: `2px solid ${themeColor}33`,
                    }}>
                      {currentLead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A' }}>{currentLead.name}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#F1F5F9', color: '#64748B' }}>
                          {currentLead.code || 'LEAD'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
                        {currentLead.phone} • {currentLead.email || 'Sem e-mail'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedLeadId('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#EF4444',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Trocar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              ETAPA: ESCOLHA DA DATA E HORÁRIO (PASSO 1)
              ═════════════════════════════════════════════════════════════════ */}
          {activeStepKey === 'datetime' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {!isCurrentTypeConfigured ? (
                <div style={{
                  padding: '36px 24px',
                  borderRadius: '14px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '12px',
                }}>
                  <AlertCircle size={38} color="#EF4444" />
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#991B1B' }}>
                    Agendamento Indisponível
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#B91C1C', maxWidth: '480px', lineHeight: 1.5, fontWeight: 700 }}>
                    Não é possível fazer agendamento pois não há datas e nem horários disponíveis. Acesse a central de planejamento ou fale com seu gestor.
                  </div>
                  {targetVenue?.name && (
                    <div style={{ fontSize: '0.76rem', color: '#7F1D1D', marginTop: '2px' }}>
                      Unidade: <strong>{targetVenue.name}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Resumo compacto da unidade */}
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#0F172A',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {targetVenue?.logoUrl ? (
                        <img src={targetVenue.logoUrl} alt={targetVenue.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Building2 size={18} color="#D4AF37" />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: themeColor, textTransform: 'uppercase' }}>
                        Unidade do Agendamento
                      </div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {targetVenue?.name || 'Unidade não identificada'} {currentLead?.name ? `• ${currentLead.name}` : ''}
                      </div>
                    </div>
                  </div>
                  {/* Calendário e Seleção de Horários */}
                  <div style={{
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    padding: '18px',
                  }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0F172A' }}>
                    {formattedMonthTitle}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={handlePrevMonth} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Mês anterior">
                      <ChevronLeft size={16} color="#0F172A" />
                    </button>
                    <button type="button" onClick={handleNextMonth} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Próximo mês">
                      <ChevronRight size={16} color="#0F172A" />
                    </button>
                  </div>
                </div>

                {/* Grid do Mês */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                  {WEEKDAYS.map(w => (
                    <span key={w} style={{ fontSize: '0.70rem', fontWeight: 800, color: '#94A3B8', padding: '4px 0' }}>
                      {w}
                    </span>
                  ))}

                  {Array.from({ length: monthDaysGrid.firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {monthDaysGrid.days.map(d => {
                    const isSelected = selectedDate === d.dateStr;
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        disabled={d.isPast || !d.isAvailable}
                        onClick={() => {
                          setSelectedDate(d.dateStr);
                          setSelectedTime('');
                        }}
                        style={{
                          height: '38px',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${themeColor}` : '1px solid transparent',
                          background: isSelected ? `${themeColor}15` : (d.isAvailable ? '#F0FDF4' : '#F8FAFC'),
                          color: isSelected ? themeColor : (d.isAvailable ? '#15803D' : '#CBD5E1'),
                          fontSize: '0.80rem',
                          fontWeight: isSelected ? 900 : 700,
                          cursor: d.isAvailable ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: d.isPast ? 0.35 : 1,
                        }}
                      >
                        {d.dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Slots Disponíveis */}
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #E2E8F0' }}>
                  {/* Banner de Concorrência Detectada */}
                  {realtimeBookingConflict && (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: '#FEF2F2',
                      border: '1.5px solid #EF4444',
                      color: '#991B1B',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                    }}>
                      <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 800, marginBottom: '2px', color: '#B91C1C' }}>
                          Horário Já Preenchido no Banco de Dados
                        </div>
                        <div style={{ lineHeight: 1.45 }}>{realtimeBookingConflict}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', margin: 0 }}>
                      HORÁRIOS DISPONÍVEIS NA DATA ({selectedDate.split('-').reverse().join('/')})
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleManualSyncSlots}
                        disabled={isSyncingSlots}
                        title="Sincronizar horários em tempo real com o banco de dados"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: isSyncingSlots ? 'wait' : 'pointer',
                        }}
                      >
                        <RotateCw size={11} className={isSyncingSlots ? 'animate-spin' : ''} />
                        <span>{isSyncingSlots ? 'Sincronizando...' : 'Atualizar Vagas'}</span>
                      </button>

                      {selectedDayAvailability.isFreeMode && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#059669',
                          background: 'rgba(16,185,129,0.12)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}>
                          <Sparkles size={11} />
                          Modo Livre
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedDayAvailability.isFreeMode && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#059669',
                    }}>
                      <Sparkles size={14} />
                      <span>Modo Livre ativo: Escolha um horário sugerido ou digite qualquer horário desejado abaixo.</span>
                    </div>
                  )}

                  {selectedDayAvailability.isFreeMode ? (
                    /* MODO LIVRE: Não exibe chips pré-definidos. Exibe aviso e campo de horário em destaque */
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1.5px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 800, fontSize: '0.82rem' }}>
                        <Sparkles size={16} />
                        <span>O agendamento está no modo livre. Digite abaixo o horário do agendamento:</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={18} color="#059669" />
                        <input
                          type="time"
                          value={selectedTime}
                          min={selectedDate === todayStr ? currentTimeStr : undefined}
                          onChange={e => setSelectedTime(e.target.value)}
                          placeholder="HH:mm"
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1.5px solid #10B981',
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            background: '#FFFFFF',
                            colorScheme: 'light',
                            outline: 'none',
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
                          }}
                        />
                        {selectedTime && (
                          <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 800 }}>
                            Horário definido: <strong>{selectedTime}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* MODO HORÁRIOS FIXOS: Exibe chips de horários disponíveis */
                    selectedDayAvailability.slots.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic' }}>
                        Nenhum horário disponível para esta data.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedDayAvailability.slots.map(s => {
                          const isSelected = selectedTime === s.time;
                          return (
                            <button
                              key={s.time}
                              type="button"
                              disabled={!s.isAvailable}
                              onClick={() => {
                                setSelectedTime(s.time);
                                if (realtimeBookingConflict) setRealtimeBookingConflict(null);
                              }}
                              title={s.isAvailable ? `${s.remainingSpots} vaga(s) disponível(is)` : 'Horário esgotado'}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: isSelected ? themeColor : (s.isAvailable ? '#CBD5E1' : '#E2E8F0'),
                                background: isSelected ? themeColor : (s.isAvailable ? '#FFFFFF' : '#F8FAFC'),
                                color: isSelected ? '#FFFFFF' : (s.isAvailable ? '#0F172A' : '#94A3B8'),
                                fontSize: '0.80rem',
                                fontWeight: 800,
                                cursor: s.isAvailable ? 'pointer' : 'not-allowed',
                                opacity: s.isAvailable ? 1 : 0.55,
                                textDecoration: s.isAvailable ? 'none' : 'line-through',
                              }}
                            >
                              {s.time} {!s.isAvailable && '(Lotado)'}
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}

                  {/* Campo de Horário Livre / Customizado */}
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}>
                    <Clock size={16} color="#64748B" />
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                      {selectedDayAvailability.isFreeMode ? 'Definir Qualquer Horário Livre:' : 'Outro Horário:'}
                    </span>
                    <input
                      type="time"
                      value={selectedTime}
                      min={selectedDate === todayStr ? currentTimeStr : undefined}
                      onChange={e => setSelectedTime(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.80rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        colorScheme: 'light',
                        background: '#FFFFFF',
                      }}
                    />
                    {selectedTime && (
                      <span style={{ fontSize: '0.74rem', color: themeColor, fontWeight: 800 }}>
                        Horário Selecionado: {selectedTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              ETAPA: NÚMERO DE PESSOAS (PAX) + ANFITRIÃO (APENAS QUANDO MANUAL)
              ═════════════════════════════════════════════════════════════════ */}
          {activeStepKey === 'pax_closer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Resumo da Data & Horário Selecionados */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: `${themeColor}0D`,
                border: `1px solid ${themeColor}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: themeColor, textTransform: 'uppercase' }}>
                    Data & Horário Definidos
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0F172A' }}>
                    {selectedDate ? selectedDate.split('-').reverse().join('/') : '--/--/----'} às {selectedTime || '--:--'} • {targetVenue?.name || 'Unidade'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(wizardSteps.indexOf('datetime'))}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '7px',
                    padding: '5px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Alterar Data
                </button>
              </div>

              {/* Seletor de PAX / Acompanhantes (respeitando limite configurado da agenda) */}
              <div style={{
                padding: '20px',
                borderRadius: '14px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Quantas pessoas participarão (PAX / Acompanhantes)?
                  </label>
                  {selectedSlotPaxLimit.isLimited ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '999px',
                      background: 'rgba(217, 119, 6, 0.12)',
                      color: '#B45309',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                    }}>
                      Limite disponível neste horário: até {selectedSlotPaxLimit.maxAllowedPax} pessoa(s)
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '999px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                    }}>
                      Capacidade Livre
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  {[1, 2, 3, 4, 5, 6].map(num => {
                    const overLimit = selectedSlotPaxLimit.isLimited && num > selectedSlotPaxLimit.maxAllowedPax;
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={overLimit}
                        onClick={() => setPax(num)}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: pax === num ? themeColor : '#CBD5E1',
                          background: overLimit ? '#F1F5F9' : (pax === num ? themeColor : '#FFFFFF'),
                          color: overLimit ? '#94A3B8' : (pax === num ? '#FFFFFF' : '#0F172A'),
                          fontSize: '0.95rem',
                          fontWeight: 900,
                          cursor: overLimit ? 'not-allowed' : 'pointer',
                          opacity: overLimit ? 0.5 : 1,
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700 }}>Outro:</span>
                    <input
                      type="number"
                      min={1}
                      max={selectedSlotPaxLimit.isLimited ? selectedSlotPaxLimit.maxAllowedPax : 50}
                      value={pax}
                      onChange={e => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        const clamped = selectedSlotPaxLimit.isLimited ? Math.min(val, selectedSlotPaxLimit.maxAllowedPax) : val;
                        setPax(clamped);
                      }}
                      style={{
                        width: '74px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        textAlign: 'center',
                        color: '#0F172A',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Closer / Anfitrião: Automático (sem seletor) vs Manual (somente habilitados) */}
              {(isCloserFixed || isAutoSplitConfigured) ? (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isCloserFixed ? 'rgba(59, 130, 246, 0.06)' : 'rgba(16, 185, 129, 0.07)',
                  border: `1px solid ${isCloserFixed ? 'rgba(59, 130, 246, 0.30)' : 'rgba(16, 185, 129, 0.35)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  {isCloserFixed ? <Lock size={18} color="#2563EB" /> : <Sparkles size={18} color="#059669" />}
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                      {isCloserFixed
                        ? `Closer Vinculado ao Lead: ${collaborators.find(c => c.id === existingFixedCloserId)?.name || 'Anfitrião'}`
                        : 'Anfitrião definido automaticamente pelo Split da Unidade'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      {isCloserFixed
                        ? 'O lead já possui anfitrião fixo em seu histórico.'
                        : `Próximo closer na fila configurada: ${collaborators.find(c => c.id === autoSplitCloserId)?.name || 'Será atribuído ao confirmar'}.`}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', margin: 0 }}>
                      SELECIONE O ANFITRIÃO / CLOSER RESPONSÁVEL *
                    </label>
                    <span style={{ fontSize: '0.70rem', color: '#64748B' }}>
                      Listando apenas os closers configurados para esta unidade/funil
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                    {eligibleManualClosers.map(c => {
                      const isSelected = responsibleId === c.id;
                      const roleTitle = getCollabJobTitle(c);
                      return (
                        <div
                          key={c.id}
                          onClick={() => setResponsibleId(c.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid',
                            borderColor: isSelected ? themeColor : '#CBD5E1',
                            background: isSelected ? `${themeColor}0D` : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            boxShadow: isSelected ? `0 2px 8px ${themeColor}22` : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#E2E8F0',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {(c as any).photoUrl || c.avatarUrl ? (
                              <img src={(c as any).photoUrl || c.avatarUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <User size={16} color="#64748B" />
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.name}
                            </div>
                            {roleTitle && (
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: themeColor }}>
                                {roleTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              ETAPA: TAREFAS DE NOTIFICAÇÃO (CONFIRMAÇÃO 1 EM DIAS & CONFIRMAÇÃO 2 EM HORAS)
              ═════════════════════════════════════════════════════════════════ */}
          {activeStepKey === 'confirmations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* SDR Responsável (Pré-preenchido automaticamente quando dentro do Lead) */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}>
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0F172A' }}>
                    SDR Responsável pelas Notificações
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#64748B' }}>
                    {initialLead
                      ? 'Definido automaticamente para o SDR do lead / atendimento atual (altere se necessário).'
                      : 'Selecione o SDR que executará as tarefas de confirmação.'}
                  </div>
                </div>
                <select
                  value={sdrId}
                  onChange={e => setSdrId(e.target.value)}
                  style={{
                    minWidth: '220px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  {eligibleSdrs.map(c => {
                    const jobTitle = getCollabJobTitle(c);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}{jobTitle ? ` • ${jobTitle}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Confirmação 1 (Baseada em DIAS antes) */}
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: enableConfirm1 && notificationViability.canUseConfirm1 ? 'rgba(59, 130, 246, 0.05)' : '#F8FAFC',
                border: `1.5px solid ${enableConfirm1 && notificationViability.canUseConfirm1 ? 'rgba(59, 130, 246, 0.35)' : '#E2E8F0'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                      Confirmação 1 (Antecedência em Dias)
                    </div>
                    <div style={{ fontSize: '0.71rem', color: notificationViability.canUseConfirm1 ? '#64748B' : '#DC2626' }}>
                      {notificationViability.canUseConfirm1
                        ? `Máximo viável para a data selecionada: até ${notificationViability.maxViableDays} dia(s) antes.`
                        : 'Indisponível para agendamentos marcados para o dia de hoje.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!notificationViability.canUseConfirm1}
                    onClick={() => setEnableConfirm1(prev => !prev)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: enableConfirm1 && notificationViability.canUseConfirm1 ? '#3B82F6' : '#CBD5E1',
                      background: enableConfirm1 && notificationViability.canUseConfirm1 ? '#3B82F6' : '#FFFFFF',
                      color: enableConfirm1 && notificationViability.canUseConfirm1 ? '#FFFFFF' : '#64748B',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: notificationViability.canUseConfirm1 ? 'pointer' : 'not-allowed',
                      opacity: notificationViability.canUseConfirm1 ? 1 : 0.5,
                    }}
                  >
                    {enableConfirm1 && notificationViability.canUseConfirm1 ? 'Ativa' : 'Desativada'}
                  </button>
                </div>

                {enableConfirm1 && notificationViability.canUseConfirm1 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[1, 2, 3, 5, 7].map(d => {
                        const disabledDay = d > notificationViability.maxViableDays;
                        const isSel = confirm1Days === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={disabledDay}
                            onClick={() => setConfirm1Days(d)}
                            style={{
                              padding: '6px 11px',
                              borderRadius: '7px',
                              border: '1px solid',
                              borderColor: isSel ? '#3B82F6' : '#CBD5E1',
                              background: disabledDay ? '#F1F5F9' : (isSel ? 'rgba(59, 130, 246, 0.14)' : '#FFFFFF'),
                              color: disabledDay ? '#94A3B8' : (isSel ? '#1D4ED8' : '#334155'),
                              fontSize: '0.74rem',
                              fontWeight: isSel ? 800 : 600,
                              cursor: disabledDay ? 'not-allowed' : 'pointer',
                              opacity: disabledDay ? 0.5 : 1,
                            }}
                          >
                            {d} {d === 1 ? 'dia antes' : 'dias antes'}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Horário:</span>
                      <input
                        type="time"
                        value={confirm1Time}
                        onChange={e => setConfirm1Time(e.target.value)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          background: '#FFFFFF',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmação 2 (Baseada em HORAS antes) */}
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: enableConfirm2 && notificationViability.canUseConfirm2 ? 'rgba(16, 185, 129, 0.05)' : '#F8FAFC',
                border: `1.5px solid ${enableConfirm2 && notificationViability.canUseConfirm2 ? 'rgba(16, 185, 129, 0.35)' : '#E2E8F0'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                      Confirmação 2 (Antecedência em Horas)
                    </div>
                    <div style={{ fontSize: '0.71rem', color: notificationViability.canUseConfirm2 ? '#64748B' : '#DC2626' }}>
                      {notificationViability.canUseConfirm2
                        ? `Máximo viável até o horário marcado (${selectedTime}): até ${notificationViability.maxViableHours} hora(s) antes.`
                        : 'Horário muito próximo: não há janela mínima de horas disponíveis para esta tarefa.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!notificationViability.canUseConfirm2}
                    onClick={() => setEnableConfirm2(prev => !prev)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: enableConfirm2 && notificationViability.canUseConfirm2 ? '#10B981' : '#CBD5E1',
                      background: enableConfirm2 && notificationViability.canUseConfirm2 ? '#10B981' : '#FFFFFF',
                      color: enableConfirm2 && notificationViability.canUseConfirm2 ? '#FFFFFF' : '#64748B',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: notificationViability.canUseConfirm2 ? 'pointer' : 'not-allowed',
                      opacity: notificationViability.canUseConfirm2 ? 1 : 0.5,
                    }}
                  >
                    {enableConfirm2 && notificationViability.canUseConfirm2 ? 'Ativa' : 'Desativada'}
                  </button>
                </div>

                {enableConfirm2 && notificationViability.canUseConfirm2 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1' }}>
                    {[1, 2, 3, 4, 5, 6, 12].map(h => {
                      const disabledHour = h > notificationViability.maxViableHours;
                      const isSel = confirm2Hours === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          disabled={disabledHour}
                          onClick={() => setConfirm2Hours(h)}
                          style={{
                            padding: '6px 11px',
                            borderRadius: '7px',
                            border: '1px solid',
                            borderColor: isSel ? '#10B981' : '#CBD5E1',
                            background: disabledHour ? '#F1F5F9' : (isSel ? 'rgba(16, 185, 129, 0.14)' : '#FFFFFF'),
                            color: disabledHour ? '#94A3B8' : (isSel ? '#047857' : '#334155'),
                            fontSize: '0.74rem',
                            fontWeight: isSel ? 800 : 600,
                            cursor: disabledHour ? 'not-allowed' : 'pointer',
                            opacity: disabledHour ? 0.5 : 1,
                          }}
                        >
                          {h} {h === 1 ? 'hora antes' : 'horas antes'}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Instruções / Observações */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                    ORIENTAÇÕES PARA CONFIRMAÇÕES (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    value={followUpNotes}
                    onChange={e => setFollowUpNotes(e.target.value)}
                    placeholder="Ex: Enviar vídeo do espaço e localização..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.78rem',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                    OBSERVAÇÕES DO AGENDAMENTO (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Preferência por jardim, interesse no pacote..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.78rem',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE NAVEGAÇÃO INFERIOR */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--adm-bg-surface, #F8FAFC)',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {currentStepIdx > 0 ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                setCurrentStepIdx(prev => Math.max(0, prev - 1));
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#475569',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid #CBD5E1',
                color: '#64748B',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          )}

          {currentStepIdx < wizardSteps.length - 1 ? (
            <button
              type="button"
              disabled={
                (activeStepKey === 'lead_select' && !currentLead) ||
                (activeStepKey === 'datetime' && (!isCurrentTypeConfigured || !selectedDate || !selectedTime)) ||
                (activeStepKey === 'pax_closer' && !isCloserFixed && !isAutoSplitConfigured && !responsibleId)
              }
              onClick={() => {
                setErrorMessage('');
                setCurrentStepIdx(prev => Math.min(wizardSteps.length - 1, prev + 1));
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '8px',
                background: (
                  (activeStepKey === 'lead_select' && !currentLead) ||
                  (activeStepKey === 'datetime' && (!isCurrentTypeConfigured || !selectedDate || !selectedTime)) ||
                  (activeStepKey === 'pax_closer' && !isCloserFixed && !isAutoSplitConfigured && !responsibleId)
                ) ? '#CBD5E1' : themeColor,
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: (
                  (activeStepKey === 'lead_select' && !currentLead) ||
                  (activeStepKey === 'datetime' && (!isCurrentTypeConfigured || !selectedDate || !selectedTime)) ||
                  (activeStepKey === 'pax_closer' && !isCloserFixed && !isAutoSplitConfigured && !responsibleId)
                ) ? 'not-allowed' : 'pointer',
                boxShadow: `0 4px 14px ${themeColor}33`,
              }}
            >
              <span>Avançar</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || isCheckingRealtime || !selectedDate || !selectedTime || !isCurrentTypeConfigured}
              onClick={handleConfirmSchedule}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '8px',
                background: (!selectedDate || !selectedTime || isSubmitting || isCheckingRealtime || !isCurrentTypeConfigured) ? '#CBD5E1' : themeColor,
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: (!selectedDate || !selectedTime || isSubmitting || isCheckingRealtime || !isCurrentTypeConfigured) ? 'not-allowed' : 'pointer',
                boxShadow: (!selectedDate || !selectedTime || isSubmitting || isCheckingRealtime || !isCurrentTypeConfigured) ? 'none' : `0 4px 14px ${themeColor}33`,
              }}
            >
              {isCheckingRealtime ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Validando disponibilidade no banco...</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Confirmando agendamento...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Confirmar Agendamento</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
