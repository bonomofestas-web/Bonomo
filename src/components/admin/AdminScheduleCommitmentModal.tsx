import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, Check, ChevronLeft, ChevronRight,
  Search, Building2, AlertCircle,
  UtensilsCrossed, User, Sparkles, Clock,
  ArrowRight, ArrowLeft, MapPin,
  RotateCw, Loader2, AlertTriangle
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
    venues, 
    collaborators, 
    currentUser, 
    venueAgendaConfigs, 
    appointments, 
    refreshAppointments,
    addTask,
    scheduleCommercialCommitment 
  } = useAdminState();

  const [isCheckingRealtime, setIsCheckingRealtime] = useState<boolean>(false);
  const [isSyncingSlots, setIsSyncingSlots] = useState<boolean>(false);
  const [realtimeBookingConflict, setRealtimeBookingConflict] = useState<string | null>(null);

  // Tipo ativo: Visita Comercial ou Degustação Gastronômica
  const [type, setType] = useState<CommercialCommitmentType>(initialType);

  // Fluxo em 3 Etapas (Estilo Typeform):
  // Etapa 1: Quem é o Lead/Cliente? (Até selecionar, o símbolo da casa NÃO aparece)
  // Etapa 2: Acompanhantes (PAX) e Dados da Casa Vinculada
  // Etapa 3: Calendário, Horários e Responsável (Cargo entre parênteses)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(() => {
    return initialLead ? 2 : 1;
  });

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

  const [responsibleId, setResponsibleId] = useState<string>(() => {
    return currentLead?.closerId || currentUser?.id || '';
  });
  const [sdrId, setSdrId] = useState<string>(() => {
    return currentLead?.sdrId || (collaborators.find(c => (c as any).roleTitle?.toLowerCase().includes('sdr') || c.role === 'sdr')?.id) || currentUser?.id || '';
  });
  const [reminder1, setReminder1] = useState<string>('24h');
  const [reminder2, setReminder2] = useState<string>('2h');
  const [notes, setNotes] = useState<string>('');

  // ── ESTADOS DE CONFIGURAÇÃO DE FOLLOW-UP COMERCIAL ──
  const [createFollowUpTask, setCreateFollowUpTask] = useState<boolean>(true);
  const [followUpTiming, setFollowUpTiming] = useState<'1d' | '2d' | 'same_day' | 'custom'>('1d');
  const [customFollowUpDate, setCustomFollowUpDate] = useState<string>('');
  const [followUpTime, setFollowUpTime] = useState<string>('10:00');
  const [followUpResponsibleId, setFollowUpResponsibleId] = useState<string>(() => {
    return currentLead?.sdrId || (collaborators.find(c => (c as any).roleTitle?.toLowerCase().includes('sdr') || c.role === 'sdr')?.id) || currentUser?.id || '';
  });
  const [followUpNotes, setFollowUpNotes] = useState<string>('');

  // Sincroniza Closer e SDR automaticamente a partir do Lead
  useEffect(() => {
    if (currentLead?.closerId) {
      setResponsibleId(currentLead.closerId);
    }
    if (currentLead?.sdrId) {
      setSdrId(currentLead.sdrId);
      setFollowUpResponsibleId(currentLead.sdrId);
    }
  }, [currentLead?.closerId, currentLead?.sdrId]);

  // Se o SDR mudar e o responsável pelo follow-up ainda não foi alterado manualmente, sincroniza
  useEffect(() => {
    if (sdrId) {
      setFollowUpResponsibleId(sdrId);
    }
  }, [sdrId]);

  const isReminderOptionRetroactive = useCallback((hoursBefore: number) => {
    if (!selectedDate || !selectedTime || hoursBefore === 0) return false;
    const aptTime = new Date(`${selectedDate}T${selectedTime}:00`).getTime();
    if (isNaN(aptTime)) return false;
    return aptTime - (hoursBefore * 3600 * 1000) < Date.now();
  }, [selectedDate, selectedTime]);

  // Helper para calcular a data efetiva da tarefa de follow-up
  const calculateFollowUpDate = useCallback(() => {
    if (!selectedDate) return new Date().toISOString().split('T')[0];
    if (followUpTiming === 'custom' && customFollowUpDate) {
      return customFollowUpDate;
    }
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (followUpTiming === '1d') {
      dateObj.setDate(dateObj.getDate() - 1);
    } else if (followUpTiming === '2d') {
      dateObj.setDate(dateObj.getDate() - 2);
    }
    const today = new Date().toISOString().split('T')[0];
    const target = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    return target < today ? today : target;
  }, [selectedDate, followUpTiming, customFollowUpDate]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Comprovante Oficial após conclusão
  const [completedReceipt, setCompletedReceipt] = useState<AppointmentReceiptData | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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
          venueConfig
        );
        isAvailable = avail.isDayAvailable && avail.slots.some(s => s.isAvailable);
        spotsCount = avail.slots.filter(s => s.isAvailable).length;
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
  }, [calendarMonth, todayStr, type, targetVenueId, appointments, venueConfig]);

  // Slots do dia selecionado
  const selectedDayAvailability = useMemo(() => {
    if (!selectedDate) return { isDayAvailable: false, slots: [], isFreeMode: false };
    return agendaAvailabilityService.getAvailableSlots(
      selectedDate,
      type,
      targetVenueId,
      appointments,
      venueConfig
    );
  }, [selectedDate, type, targetVenueId, appointments, venueConfig]);

  // Submissão do agendamento com validação atômica em tempo real (Anti-Race Condition)
  const handleConfirmSchedule = async () => {
    if (!currentLead) {
      setErrorMessage('Selecione o lead ou cliente para continuar.');
      setCurrentStep(1);
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

      const assignedUser = collaborators.find(c => c.id === responsibleId);
      const sdrUser = collaborators.find(c => c.id === sdrId);

      // Agenda no Lead / Supabase (atualiza Closer e SDR no lead automaticamente)
      if (scheduleCommercialCommitment) {
        await scheduleCommercialCommitment(currentLead.id, type, {
          date: selectedDate,
          time: selectedTime,
          pax,
          responsibleCollaboratorId: responsibleId || undefined,
          responsibleName: assignedUser?.name,
          notes: notes || undefined,
          venueId: targetVenueId,
          sdrId: sdrId || undefined,
          sdrName: sdrUser?.name || undefined,
          reminder1: reminder1 || undefined,
          reminder2: reminder2 || undefined,
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
        assignedToIds: responsibleId ? [responsibleId] : (currentUser?.id ? [currentUser.id] : []),
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
          closerId: responsibleId,
          closerName: assignedUser?.name,
          sdrId,
          sdrName: sdrUser?.name,
        },
      });

      // Se configurado, cria a tarefa de Follow-up prévio na esteira vinculada ao SDR
      if (createFollowUpTask) {
        const targetFollowUpDate = calculateFollowUpDate();
        const followUpAssignee = collaborators.find(c => c.id === followUpResponsibleId) || sdrUser || currentUser;
        const followUpTitle = `Follow-up: Confirmar ${type === 'visit' ? 'Visita Comercial' : 'Degustação'} • ${currentLead.name}`;

        await addTask({
          title: followUpTitle,
          description: `Follow-up prévio de alinhamento e confirmação de presença com a família de ${currentLead.name}.\nCompromisso marcado para ${selectedDate.split('-').reverse().join('/')} às ${selectedTime} (${targetVenue?.name || 'Unidade'}).\nAnfitrião/Closer da Recepção: ${assignedUser?.name || 'Equipe'}\nSDR Responsável: ${followUpAssignee?.name || 'Equipe'}\nOrientações: ${followUpNotes || 'Entrar em contato para confirmar a presença dos convidados e alinhar detalhes preliminares da reunião.'}`,
          dueDate: targetFollowUpDate,
          dueTime: followUpTime,
          venueId: targetVenueId,
          assignedToIds: followUpResponsibleId ? [followUpResponsibleId] : (sdrId ? [sdrId] : [currentUser?.id || 'admin']),
          databaseId: 'db_follow_ups',
          leadId: currentLead.id,
          leadName: currentLead.name,
          createdById: currentUser?.id || 'admin',
          createdByName: currentUser?.name || 'Administrador',
          type: 'call',
          customType: 'Follow-up',
          status: 'todo',
          priority: 'high',
          customProperties: {
            isFollowUp: true,
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
      const closerObj = collaborators.find(c => c.id === responsibleId) ||
        collaborators.find(c => Boolean(responsibleId) && (c.name || '').trim().toLowerCase() === (responsibleId || '').trim().toLowerCase()) ||
        currentUser;
      const closerRoleTitle = (closerObj as any)?.roleTitle || (closerObj as any)?.customJobTitle || closerObj?.role || 'Anfitrião';

      setCompletedReceipt({
        id: receiptCode,
        leadId: currentLead.id,
        type,
        code: receiptCode,
        leadName: currentLead.name,
        leadPhone: currentLead.phone,
        leadEmail: currentLead.email,
        venueName: targetVenue?.name || 'Unidade F5 System',
        venueAddress: targetVenue?.address || '',
        venueLogoUrl: targetVenue?.logoUrl || (targetVenue as any)?.logo_url,
        dateStr: selectedDate,
        timeStr: selectedTime,
        pax,
        closerName: closerObj?.name || currentUser?.name || 'Equipe',
        closerRoleTitle,
        closerPhotoUrl: (closerObj as any)?.photoUrl || closerObj?.avatarUrl,
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
        {/* Barra de Progresso no Topo com 3 Etapas */}
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
              Etapa {currentStep} de 3 • Novo Agendamento
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
              {currentStep === 1 && 'Quem é o Lead ou Cliente?'}
              {currentStep === 2 && 'Número de Acompanhantes e Unidade'}
              {currentStep === 3 && 'Escolha da Data, Horário e Anfitrião'}
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
          <div style={{ flex: 1, background: currentStep >= 1 ? themeColor : 'transparent', transition: 'all 0.2s ease' }} />
          <div style={{ flex: 1, background: currentStep >= 2 ? themeColor : 'transparent', transition: 'all 0.2s ease' }} />
          <div style={{ flex: 1, background: currentStep >= 3 ? themeColor : 'transparent', transition: 'all 0.2s ease' }} />
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
              ETAPA 1: SELEÇÃO DO LEAD / CLIENTE
              (Símbolo da casa de festa NÃO aparece até selecionar o lead!)
              ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
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
              ETAPA 2: ACOMPANHANTES (PAX) E DADOS DA CASA VINCULADA
              ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Card da Casa de Festas Detectada */}
              <div style={{
                padding: '16px 20px',
                borderRadius: '14px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: '#000000',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}>
                  {targetVenue?.logoUrl ? (
                    <img src={targetVenue.logoUrl} alt={targetVenue.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Building2 size={24} color="#D4AF37" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.70rem', fontWeight: 800, color: themeColor, textTransform: 'uppercase' }}>
                    Unidade Detectada do Lead
                  </div>
                  <h4 style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    {targetVenue?.name || 'Unidade não identificada'}
                  </h4>
                  {targetVenue?.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                      <MapPin size={12} />
                      <span>{targetVenue.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seletor de PAX / Acompanhantes */}
              <div style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--adm-bg-surface, #F8FAFC)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                  Quantas pessoas participarão (PAX / Acompanhantes)?
                </label>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B' }}>
                  Defina o número de pessoas para preparo da recepção e limites da sessão de {type === 'visit' ? 'visita' : 'degustação'}.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPax(num)}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: pax === num ? themeColor : '#CBD5E1',
                        background: pax === num ? themeColor : '#FFFFFF',
                        color: pax === num ? '#FFFFFF' : '#0F172A',
                        fontSize: '0.95rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {num}
                    </button>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700 }}>Outro:</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={pax}
                      onChange={e => setPax(Number(e.target.value) || 1)}
                      style={{
                        width: '70px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        textAlign: 'center',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              ETAPA 3: CALENDÁRIO, HORÁRIOS E RESPONSÁVEL (CARGO ENTRE PARÊNTESES)
              ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                    <button type="button" onClick={handlePrevMonth} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" onClick={handleNextMonth} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}>
                      <ChevronRight size={16} />
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

                  {selectedDayAvailability.slots.length === 0 ? (
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

              {/* Responsável / Anfitrião / Closer da Recepção */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', margin: 0 }}>
                    ANFITRIÃO / CLOSER DA RECEPÇÃO *
                  </label>
                  <span style={{ fontSize: '0.70rem', color: '#64748B' }}>
                    Define automaticamente o Closer deste lead ao agendar
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {collaborators.map(c => {
                    const isSelected = responsibleId === c.id;
                    const isLeadCloser = currentLead?.closerId === c.id;
                    const roleTitle = (c as any)?.roleTitle || c.role || 'Anfitrião';
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
                          width: '36px',
                          height: '36px',
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
                            <User size={18} color="#64748B" />
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.name}
                            </span>
                            {isLeadCloser && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: `${themeColor}20`, color: themeColor }}>
                                Lead
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: themeColor }}>
                            ({roleTitle})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SDR Vinculado */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', margin: 0 }}>
                    SDR RESPONSÁVEL DO ATENDIMENTO
                  </label>
                  <span style={{ fontSize: '0.70rem', color: '#64748B' }}>
                    Pré-vincula o SDR do lead (clique para trocar se necessário)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {collaborators.map(c => {
                    const isSelected = sdrId === c.id;
                    const isLeadSdr = currentLead?.sdrId === c.id;
                    const isSdrRole = (c as any)?.roleTitle?.toLowerCase().includes('sdr') || c.role === 'sdr';
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSdrId(c.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1.5px solid',
                          borderColor: isSelected ? '#3B82F6' : '#E2E8F0',
                          background: isSelected ? 'rgba(59, 130, 246, 0.08)' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{
                          width: '30px',
                          height: '30px',
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
                            <User size={15} color="#64748B" />
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.name}
                            </span>
                            {isLeadSdr && (
                              <span style={{ fontSize: '0.60rem', fontWeight: 800, padding: '1px 4px', borderRadius: '4px', background: 'rgba(59,130,246,0.18)', color: '#2563EB' }}>
                                Lead
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: isSdrRole ? '#3B82F6' : '#64748B' }}>
                            {isSdrRole ? '(SDR)' : `(${(c as any)?.roleTitle || c.role || 'Equipe'})`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── SEÇÃO: CONFIGURAÇÃO DE FOLLOW-UP COMERCIAL (ESTEIRA DE ATENDIMENTO) ── */}
              <div style={{
                padding: '16px 18px',
                borderRadius: '12px',
                background: createFollowUpTask ? 'rgba(59, 130, 246, 0.04)' : '#F8FAFC',
                border: `1.5px solid ${createFollowUpTask ? 'rgba(59, 130, 246, 0.35)' : '#E2E8F0'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                transition: 'all 0.15s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: createFollowUpTask ? 'rgba(59, 130, 246, 0.12)' : '#E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: createFollowUpTask ? '#2563EB' : '#64748B',
                    }}>
                      <Clock size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                        Tarefa de Follow-up / Confirmação Prévia
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Gera tarefa na esteira do SDR para confirmar a presença dos anfitriões
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCreateFollowUpTask(!createFollowUpTask)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: createFollowUpTask ? '#3B82F6' : '#CBD5E1',
                      background: createFollowUpTask ? '#3B82F6' : '#FFFFFF',
                      color: createFollowUpTask ? '#FFFFFF' : '#64748B',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {createFollowUpTask ? 'Ativo' : 'Desativado'}
                  </button>
                </div>

                {createFollowUpTask && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1' }}>
                    {/* Timing do Follow-up */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        QUANDO REALIZAR O FOLLOW-UP / CONTATO?
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {[
                          { id: '1d', label: '1 dia antes da visita' },
                          { id: '2d', label: '2 dias antes' },
                          { id: 'same_day', label: 'No dia da visita (manhã)' },
                          { id: 'custom', label: 'Data personalizada' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFollowUpTiming(opt.id as any)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: followUpTiming === opt.id ? '#3B82F6' : '#CBD5E1',
                              background: followUpTiming === opt.id ? 'rgba(59, 130, 246, 0.12)' : '#FFFFFF',
                              color: followUpTiming === opt.id ? '#1D4ED8' : '#334155',
                              fontSize: '0.74rem',
                              fontWeight: followUpTiming === opt.id ? 800 : 600,
                              cursor: 'pointer',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {followUpTiming === 'custom' && (
                        <div style={{ marginTop: '8px' }}>
                          <input
                            type="date"
                            value={customFollowUpDate}
                            onChange={e => setCustomFollowUpDate(e.target.value)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: '#0F172A',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Horário */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          HORÁRIO DO FOLLOW-UP
                        </label>
                        <input
                          type="time"
                          value={followUpTime}
                          onChange={e => setFollowUpTime(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#0F172A',
                            background: '#FFFFFF',
                          }}
                        />
                      </div>

                      {/* Responsável pelo Follow-up (Pré-vinculado ao SDR com opção de troca) */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          RESPONSÁVEL PELO FOLLOW-UP (SDR)
                        </label>
                        <select
                          value={followUpResponsibleId}
                          onChange={e => setFollowUpResponsibleId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#0F172A',
                            background: '#FFFFFF',
                          }}
                        >
                          {collaborators.map(c => {
                            const isSdr = (c as any)?.roleTitle?.toLowerCase().includes('sdr') || c.role === 'sdr';
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name} {isSdr ? '(SDR)' : `(${(c as any)?.roleTitle || c.role || 'Equipe'})`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Instruções */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        ORIENTAÇÕES PARA A TAREFA (OPCIONAL)
                      </label>
                      <input
                        type="text"
                        value={followUpNotes}
                        onChange={e => setFollowUpNotes(e.target.value)}
                        placeholder={`Ex: Ligar para confirmar presença da família de ${currentLead?.name || 'cliente'}...`}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.76rem',
                          color: '#0F172A',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lembretes / Notificações Automáticas */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color={themeColor} />
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0F172A' }}>
                    NOTIFICAÇÕES E LEMBRETES AUTOMÁTICOS
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Notificação 1 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                      NOTIFICAÇÃO 1 (ANTECEDÊNCIA)
                    </label>
                    <select
                      value={reminder1}
                      onChange={e => setReminder1(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    >
                      <option value="none">Não notificar</option>
                      <option value="1h" disabled={isReminderOptionRetroactive(1)}>
                        1 hora antes {isReminderOptionRetroactive(1) ? '(Horário já ultrapassado)' : ''}
                      </option>
                      <option value="2h" disabled={isReminderOptionRetroactive(2)}>
                        2 horas antes {isReminderOptionRetroactive(2) ? '(Horário já ultrapassado)' : ''}
                      </option>
                      <option value="4h" disabled={isReminderOptionRetroactive(4)}>
                        4 horas antes {isReminderOptionRetroactive(4) ? '(Horário já ultrapassado)' : ''}
                      </option>
                      <option value="12h" disabled={isReminderOptionRetroactive(12)}>
                        12 horas antes {isReminderOptionRetroactive(12) ? '(Horário já ultrapassado)' : ''}
                      </option>
                      <option value="24h" disabled={isReminderOptionRetroactive(24)}>
                        24 horas antes (1 dia antes) {isReminderOptionRetroactive(24) ? '(Horário já ultrapassado)' : ''}
                      </option>
                    </select>
                  </div>

                  {/* Notificação 2 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                      NOTIFICAÇÃO 2 (REFORÇO)
                    </label>
                    <select
                      value={reminder2}
                      onChange={e => setReminder2(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    >
                      <option value="none">Não notificar</option>
                      <option value="1h" disabled={isReminderOptionRetroactive(1)}>
                        1 hora antes {isReminderOptionRetroactive(1) ? '(Horário já ultrapassado)' : ''}
                      </option>
                      <option value="2h" disabled={isReminderOptionRetroactive(2)}>
                        2 horas antes {isReminderOptionRetroactive(2) ? '(Horário já ultrapassado)' : ''}
                      </option>
                      <option value="4h" disabled={isReminderOptionRetroactive(4)}>
                        4 horas antes {isReminderOptionRetroactive(4) ? '(Horário já ultrapassado)' : ''}
                      </option>
                      <option value="12h" disabled={isReminderOptionRetroactive(12)}>
                        12 horas antes {isReminderOptionRetroactive(12) ? '(Horário já ultrapassado)' : ''}
                      </option>
                      <option value="24h" disabled={isReminderOptionRetroactive(24)}>
                        24 horas antes (1 dia antes) {isReminderOptionRetroactive(24) ? '(Horário já ultrapassado)' : ''}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                  OBSERVAÇÕES DO AGENDAMENTO (OPCIONAL)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Noivos com preferência por mesa próxima ao jardim, debutante com interesse no pacote de pista..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.80rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
                </>
              )}
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
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep - 1) as any)}
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

          {currentStep < 3 ? (
            <button
              type="button"
              disabled={(currentStep === 1 && !currentLead) || (currentStep === 2 && !isCurrentTypeConfigured)}
              onClick={() => setCurrentStep((currentStep + 1) as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '8px',
                background: ((currentStep === 1 && !currentLead) || (currentStep === 2 && !isCurrentTypeConfigured)) ? '#CBD5E1' : themeColor,
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: ((currentStep === 1 && !currentLead) || (currentStep === 2 && !isCurrentTypeConfigured)) ? 'not-allowed' : 'pointer',
                boxShadow: ((currentStep === 1 && !currentLead) || (currentStep === 2 && !isCurrentTypeConfigured)) ? 'none' : `0 4px 14px ${themeColor}33`,
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
