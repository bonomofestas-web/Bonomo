import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, AlertTriangle, Check, Utensils, ChevronLeft, ChevronRight,
  Search, Bell, Building2, RotateCcw, AlertCircle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Lead, CommercialCommitmentType } from '../../types/admin';
import { agendaAvailabilityService } from '../../services/agendaAvailabilityService';

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
    addTask,
    scheduleCommercialCommitment 
  } = useAdminState();

  // Tipo ativo: Visita Comercial ou Degustação Gastronômica
  const [type, setType] = useState<CommercialCommitmentType>(initialType);

  // Seleção de Lead (se não veio via props)
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLead?.id || '');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [isLeadSearchOpen, setIsLeadSearchOpen] = useState(false);
  const leadSearchRef = useRef<HTMLDivElement>(null);

  // Modo Lead vs Cliente (Visível apenas para Pós-Venda / Master / Admin)
  const isPostSaleUser = currentUser?.role === 'master' || 
    currentUser?.role === 'admin' || 
    (currentUser as any)?.role === 'pos_venda' || 
    (currentUser as any)?.group === 'Pós-Venda';
  const [targetCategoryMode, setTargetCategoryMode] = useState<'lead' | 'client'>('lead');

  const currentLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || initialLead || null;
  }, [leads, selectedLeadId, initialLead]);

  const targetVenueId = currentLead?.venueId || venues[0]?.id || 'all';
  const targetVenue = venues.find(v => v.id === targetVenueId);
  const venueConfig = venueAgendaConfigs.find(c => c.venueId === targetVenueId);

  // Calendário de Navegação
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
    return currentLead?.closerId || currentLead?.sdrId || currentUser?.id || '';
  });
  const [notes, setNotes] = useState<string>('');

  // Automação de Lembretes para o SDR
  const [enableDayReminder, setEnableDayReminder] = useState<boolean>(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(2); // 2 dias antes
  const [enableHourReminder, setEnableHourReminder] = useState<boolean>(true);
  const [reminderHoursBefore, setReminderHoursBefore] = useState<number>(24); // 24 horas antes

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Verificar se o lead já possui compromisso deste tipo
  const existingCommitment = type === 'visit' ? currentLead?.visitCommitment : currentLead?.tastingCommitment;
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Status de compromisso anterior
  const isFutureCommitment = Boolean(
    existingCommitment && 
    existingCommitment.date && 
    existingCommitment.status === 'scheduled' && 
    existingCommitment.date >= todayStr
  );

  const isPastOverdueCommitment = Boolean(
    existingCommitment && 
    existingCommitment.date && 
    existingCommitment.status === 'scheduled' && 
    existingCommitment.date < todayStr
  );

  // Filtragem de Leads para Autocomplete
  const filteredLeadOptions = useMemo(() => {
    if (!leadSearchQuery.trim()) return leads.slice(0, 15);
    const q = leadSearchQuery.toLowerCase();
    return leads.filter(l => 
      l.name.toLowerCase().includes(q) || 
      l.phone.includes(q) || 
      (l.code && l.code.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [leads, leadSearchQuery]);

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
        isPast,
        isAvailable,
        reason,
        spotsCount,
      });
    }

    return { firstDayIndex, days };
  }, [calendarMonth, type, targetVenueId, appointments, venueConfig, todayStr]);

  // Slots do dia selecionado
  const dayAvailability = useMemo(() => {
    if (!selectedDate) {
      return { isDayAvailable: false, reason: 'Selecione uma data.', slots: [] };
    }
    return agendaAvailabilityService.getAvailableSlots(
      selectedDate,
      type,
      targetVenueId,
      appointments,
      venueConfig
    );
  }, [selectedDate, type, targetVenueId, appointments, venueConfig]);

  // Seleciona o primeiro horário disponível quando o dia muda
  useEffect(() => {
    if (dayAvailability.slots.length > 0) {
      const exists = dayAvailability.slots.some(s => s.time === selectedTime && s.isAvailable);
      if (!exists) {
        const firstAvailable = dayAvailability.slots.find(s => s.isAvailable);
        setSelectedTime(firstAvailable ? firstAvailable.time : '');
      }
    } else {
      setSelectedTime('');
    }
  }, [dayAvailability, selectedDate]);

  // Sincroniza mês se data padrão for de outro mês
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (y && m) {
        setCalendarMonth(new Date(y, m - 1, 1));
      }
    }
  }, []);

  // Fechar dropdown de busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (leadSearchRef.current && !leadSearchRef.current.contains(e.target as Node)) {
        setIsLeadSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Submissão do agendamento
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentLead) {
      setErrorMessage('Por favor, selecione um lead para realizar o agendamento.');
      return;
    }

    if (!selectedDate) {
      setErrorMessage('Por favor, selecione uma data no calendário.');
      return;
    }

    if (!selectedTime) {
      setErrorMessage('Por favor, escolha um horário disponível na grade.');
      return;
    }

    if (!pax || pax < 1) {
      setErrorMessage('A contagem de PAX (pessoas) deve ser de pelo menos 1.');
      return;
    }

    const chosenSlot = dayAvailability.slots.find(s => s.time === selectedTime);
    if (!chosenSlot || !chosenSlot.isAvailable) {
      setErrorMessage('O horário selecionado não está mais disponível.');
      return;
    }

    if (pax > chosenSlot.remainingPax) {
      setErrorMessage(`Capacidade excedida: este horário comporta no máximo mais ${chosenSlot.remainingPax} PAX.`);
      return;
    }

    setIsSubmitting(true);
    const assignedCollab = collaborators.find(c => c.id === responsibleId);
    const sdrName = assignedCollab?.name || currentUser?.name || 'Equipe Comercial';

    // 1. Cria compromisso comercial central
    const success = await scheduleCommercialCommitment(currentLead.id, type, {
      date: selectedDate,
      time: selectedTime,
      durationMinutes: chosenSlot.durationMinutes,
      pax,
      responsibleCollaboratorId: responsibleId || undefined,
      responsibleName: sdrName,
      notes: notes.trim() || undefined,
      venueId: targetVenueId,
    });

    if (success) {
      // 2. Cria a tarefa principal no módulo de Visitas & Degustações (databaseId: 'db_visits_tastings')
      const targetSubtype = type === 'visit' ? 'Visita Comercial' : 'Degustação';
      let mainTaskId = '';
      if (addTask) {
        mainTaskId = addTask({
          leadId: currentLead.id,
          leadName: currentLead.name,
          title: `${type === 'visit' ? '🏛️ Visita' : '🍽️ Degustação'}: ${currentLead.name}`,
          description: `Agendado para ${selectedDate.split('-').reverse().join('/')} às ${selectedTime} (${pax} PAX). ${notes ? `Obs: "${notes}"` : ''}`,
          type: 'meeting',
          customType: targetSubtype,
          databaseId: 'db_visits_tastings',
          dueDate: selectedDate,
          dueTime: selectedTime,
          priority: 'high',
          status: 'todo',
          createdById: currentUser?.id || 'admin',
          createdByName: currentUser?.name || 'Sistema',
          assignedToIds: responsibleId ? [responsibleId] : (currentUser?.id ? [currentUser.id] : []),
          venueId: targetVenueId,
          customProperties: {
            pax,
            isCommercialCommitment: true,
            commitmentType: type,
          }
        });
      }

      // 3. Automação de Tarefas de Follow-up do SDR
      const scheduleDateObj = new Date(`${selectedDate}T${selectedTime}:00`);

      // Lembrete em Dias
      if (enableDayReminder && reminderDaysBefore > 0) {
        const dayReminderDate = new Date(scheduleDateObj);
        dayReminderDate.setDate(dayReminderDate.getDate() - reminderDaysBefore);
        const dayDateStr = dayReminderDate.toISOString().split('T')[0];

        if (dayDateStr >= todayStr && addTask) {
          addTask({
            leadId: currentLead.id,
            leadName: currentLead.name,
            title: `Confirmação de ${type === 'visit' ? 'Visita' : 'Degustação'} (${reminderDaysBefore} dias antes) - ${currentLead.name}`,
            description: `Entrar em contato com o lead para pré-confirmar presença na ${type === 'visit' ? 'visita' : 'degustação'} agendada para ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}.`,
            type: 'followup',
            customType: 'Follow-up Confirmação',
            databaseId: 'db_followup',
            dueDate: dayDateStr,
            dueTime: '10:00',
            priority: 'medium',
            status: 'todo',
            isFollowUp: true,
            createdById: currentUser?.id || 'admin',
            createdByName: 'F5 Automação',
            assignedToIds: responsibleId ? [responsibleId] : (currentUser?.id ? [currentUser.id] : []),
            venueId: targetVenueId,
            customProperties: {
              parentTaskId: mainTaskId,
              autoGenerated: true,
            }
          });
        }
      }

      // Lembrete em Horas
      if (enableHourReminder && reminderHoursBefore > 0) {
        const hourReminderDate = new Date(scheduleDateObj.getTime() - reminderHoursBefore * 60 * 60 * 1000);
        const hourDateStr = hourReminderDate.toISOString().split('T')[0];
        const hourTimeStr = `${String(hourReminderDate.getHours()).padStart(2, '0')}:${String(hourReminderDate.getMinutes()).padStart(2, '0')}`;

        if (hourDateStr >= todayStr && addTask) {
          addTask({
            leadId: currentLead.id,
            leadName: currentLead.name,
            title: `Lembrete Final de ${type === 'visit' ? 'Visita' : 'Degustação'} (${reminderHoursBefore}h antes) - ${currentLead.name}`,
            description: `Enviar lembrete e localização no WhatsApp para o lead confirmando a ${type === 'visit' ? 'visita' : 'degustação'} hoje às ${selectedTime}.`,
            type: 'followup',
            customType: 'Lembrete Horas',
            databaseId: 'db_followup',
            dueDate: hourDateStr,
            dueTime: hourTimeStr || '09:00',
            priority: 'high',
            status: 'todo',
            isFollowUp: true,
            createdById: currentUser?.id || 'admin',
            createdByName: 'F5 Automação',
            assignedToIds: responsibleId ? [responsibleId] : (currentUser?.id ? [currentUser.id] : []),
            venueId: targetVenueId,
            customProperties: {
              parentTaskId: mainTaskId,
              autoGenerated: true,
            }
          });
        }
      }

      setIsSubmitting(false);
      if (onScheduled) onScheduled();
      onClose();
    } else {
      setIsSubmitting(false);
      setErrorMessage('Erro ao persistir o agendamento no sistema. Tente novamente.');
    }
  };

  const themeColor = type === 'visit' ? '#10B981' : '#D97706';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--adm-bg-card, #131b26)',
        width: '100%',
        maxWidth: '1060px',
        maxHeight: '94vh',
        borderRadius: '16px',
        border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* HEADER */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${themeColor}33, ${themeColor}11)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${themeColor}44`,
            }}>
              {type === 'visit' ? <Building2 size={20} color={themeColor} /> : <Utensils size={20} color={themeColor} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                  Novo Agendamento Oficial
                </h2>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: `${themeColor}22`,
                  color: themeColor,
                  border: `1px solid ${themeColor}44`,
                }}>
                  {type === 'visit' ? 'VISITA COMERCIAL' : 'DEGUSTAÇÃO'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                {targetVenue?.name ? `Unidade: ${targetVenue.name}` : 'Selecione data, horário e responsável'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #94A3B8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* BARRA DE TIPO (VISITA VS DEGUSTAÇÃO) */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setType('visit')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: type === 'visit' ? '#10B981' : 'transparent',
                color: type === 'visit' ? '#FFFFFF' : 'var(--adm-text-muted, #94A3B8)',
                border: type === 'visit' ? '1px solid #10B981' : '1px solid var(--adm-border, rgba(255,255,255,0.1))',
              }}
            >
              <Building2 size={15} />
              🏛️ Visita Comercial
            </button>

            <button
              type="button"
              onClick={() => setType('tasting')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: type === 'tasting' ? '#D97706' : 'transparent',
                color: type === 'tasting' ? '#FFFFFF' : 'var(--adm-text-muted, #94A3B8)',
                border: type === 'tasting' ? '1px solid #D97706' : '1px solid var(--adm-border, rgba(255,255,255,0.1))',
              }}
            >
              <Utensils size={15} />
              🍽️ Degustação Gastronômica
            </button>
          </div>

          {/* Toggle Lead vs Cliente (Exclusivo para Pós-Venda) */}
          {isPostSaleUser && (
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.3)',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
            }}>
              <button
                type="button"
                onClick={() => setTargetCategoryMode('lead')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: targetCategoryMode === 'lead' ? 'var(--adm-bg-card, #1E293B)' : 'transparent',
                  color: targetCategoryMode === 'lead' ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #94A3B8)',
                }}
              >
                Lead Comercial
              </button>
              <button
                type="button"
                onClick={() => setTargetCategoryMode('client')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: targetCategoryMode === 'client' ? 'var(--adm-bg-card, #1E293B)' : 'transparent',
                  color: targetCategoryMode === 'client' ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #94A3B8)',
                }}
              >
                👑 Cliente (Pós-Venda)
              </button>
            </div>
          )}
        </div>

        {/* CORPO DO FORMULÁRIO */}
        <form onSubmit={handleSchedule} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMessage && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid #EF4444',
              color: '#F87171',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertTriangle size={18} />
              {errorMessage}
            </div>
          )}

          {/* AVISO DE COMPROMISSO EXISTENTE (REMARCAÇÃO OU ATRASADO) */}
          {isFutureCommitment && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#FBBF24',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <RotateCcw size={16} />
              <span>
                Este lead já possui uma {type === 'visit' ? 'visita' : 'degustação'} agendada para <strong>{existingCommitment?.date ? existingCommitment.date.split('-').reverse().join('/') : ''} às {existingCommitment?.time}</strong>.
                Ao prosseguir, você estará <strong>reagendando</strong> este compromisso.
              </span>
            </div>
          )}

          {isPastOverdueCommitment && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#F87171',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={16} />
              <span>
                Este lead possuía um agendamento atrasado ({existingCommitment?.date ? existingCommitment.date.split('-').reverse().join('/') : ''}). O sistema registrará uma <strong>Remarcação de No-Show</strong> preservando o histórico.
              </span>
            </div>
          )}

          {/* SELEÇÃO DO LEAD / CLIENTE */}
          <div ref={leadSearchRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '6px' }}>
              LEAD / CONTATO VINCULADO *
            </label>

            {currentLead ? (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--adm-bg-card, #1E293B)',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `${themeColor}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: themeColor,
                    fontSize: '0.8rem',
                  }}>
                    {currentLead.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--adm-text-title, #FFFFFF)' }}>
                      {currentLead.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted, #94A3B8)', marginLeft: '8px' }}>
                      • {currentLead.phone}
                    </span>
                  </div>
                </div>

                {!initialLead && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLeadId('');
                      setIsLeadSearchOpen(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Trocar
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Buscar lead por nome, telefone ou código..."
                    value={leadSearchQuery}
                    onChange={e => {
                      setLeadSearchQuery(e.target.value);
                      setIsLeadSearchOpen(true);
                    }}
                    onFocus={() => setIsLeadSearchOpen(true)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      background: 'var(--adm-bg-card, #1E293B)',
                      color: 'var(--adm-text-title, #FFFFFF)',
                      border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                      fontSize: '0.85rem',
                    }}
                  />
                  <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>

                {isLeadSearchOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-card, #1E293B)',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                  }}>
                    {filteredLeadOptions.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center' }}>
                        Nenhum lead encontrado com esse termo.
                      </div>
                    ) : (
                      filteredLeadOptions.map(l => (
                        <div
                          key={l.id}
                          onClick={() => {
                            setSelectedLeadId(l.id);
                            setIsLeadSearchOpen(false);
                            if (l.estimatedGuests) setPax(Math.min(l.estimatedGuests, 4));
                            if (l.closerId || l.sdrId) setResponsibleId(l.closerId || l.sdrId || '');
                          }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            transition: 'background 0.12s ease',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--adm-text-title, #FFFFFF)' }}>
                              {l.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted, #94A3B8)', marginLeft: '8px' }}>
                              {l.phone}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>
                            Selecionar
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GRID CALENDÁRIO VISUAL E HORÁRIOS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
            {/* Coluna Esquerda: Mini Calendário com status de dias */}
            <div style={{
              background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
              borderRadius: '12px',
              border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                  {formattedMonthTitle}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Dias da Semana */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
                {WEEKDAYS.map(w => (
                  <span key={w} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted, #64748B)' }}>{w}</span>
                ))}
              </div>

              {/* Grid de Dias */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {Array.from({ length: monthDaysGrid.firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ height: '42px' }} />
                ))}

                {monthDaysGrid.days.map(d => {
                  const isSelected = selectedDate === d.dateStr;
                  const isClickable = !d.isPast && d.isAvailable;

                  return (
                    <div
                      key={d.dateStr}
                      onClick={() => {
                        if (isClickable) setSelectedDate(d.dateStr);
                      }}
                      title={d.reason}
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isClickable ? 'pointer' : 'not-allowed',
                        opacity: d.isPast ? 0.35 : 1,
                        background: isSelected 
                          ? themeColor 
                          : d.isAvailable 
                            ? 'rgba(16,185,129,0.12)' 
                            : 'rgba(255,255,255,0.03)',
                        border: isSelected 
                          ? `1px solid ${themeColor}` 
                          : d.isAvailable 
                            ? '1px solid rgba(16,185,129,0.3)' 
                            : '1px solid rgba(255,255,255,0.04)',
                        color: isSelected 
                          ? '#FFFFFF' 
                          : d.isAvailable 
                            ? '#34D399' 
                            : 'var(--adm-text-muted, #64748B)',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: isSelected || d.isAvailable ? 800 : 500 }}>
                        {d.dayNum}
                      </span>
                      {d.isAvailable && !isSelected && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>
                          {d.spotsCount} v
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna Direita: Horários Disponíveis */}
            <div style={{
              background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
              borderRadius: '12px',
              border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Horários Livres ({selectedDate ? selectedDate.split('-').reverse().join('/') : 'Selecione data'})
              </span>

              {dayAvailability.slots.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'var(--adm-text-muted, #64748B)',
                  fontSize: '0.8rem',
                  padding: '20px',
                }}>
                  {dayAvailability.reason || 'Nenhum horário liberado para esta data.'}
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}>
                  {dayAvailability.slots.map(s => {
                    const isSelected = selectedTime === s.time;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.isAvailable}
                        onClick={() => setSelectedTime(s.time)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: isSelected 
                            ? `1px solid ${themeColor}` 
                            : s.isAvailable 
                              ? '1px solid var(--adm-border, rgba(255,255,255,0.12))' 
                              : '1px dashed rgba(255,255,255,0.05)',
                          background: isSelected 
                            ? `${themeColor}22` 
                            : s.isAvailable 
                              ? 'var(--adm-bg-card, #1E293B)' 
                              : 'transparent',
                          color: isSelected 
                            ? themeColor 
                            : s.isAvailable 
                              ? 'var(--adm-text-title, #FFFFFF)' 
                              : 'var(--adm-text-muted, #64748B)',
                          cursor: s.isAvailable ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{s.time}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                          {s.isAvailable ? `${s.remainingSpots} vaga(s)` : 'Esgotado'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PAX, RESPONSÁVEL E NOTAS */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1.5fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '4px' }}>
                {type === 'tasting' ? 'PAX (PESSOAS) *' : 'PAX (PESSOAS)'}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={pax}
                onChange={e => setPax(Number(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--adm-bg-card, #1E293B)',
                  color: 'var(--adm-text-title, #FFFFFF)',
                  border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '4px' }}>
                SDR / RESPONSÁVEL PELO ATENDIMENTO
              </label>
              <select
                value={responsibleId}
                onChange={e => setResponsibleId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--adm-bg-card, #1E293B)',
                  color: 'var(--adm-text-title, #FFFFFF)',
                  border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="">Selecione um responsável...</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role === 'admin' ? 'Gerente' : c.role === 'master' ? 'Master' : 'Colaborador'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AUTOMAÇÃO DE LEMBRETES PARA O SDR (DIAS E HORAS) */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="#10B981" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', textTransform: 'uppercase' }}>
                Automação de Lembretes do SDR (Follow-up)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Lembrete em Dias */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={enableDayReminder}
                  onChange={e => setEnableDayReminder(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10B981' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>Criar lembrete</span>
                <select
                  disabled={!enableDayReminder}
                  value={reminderDaysBefore}
                  onChange={e => setReminderDaysBefore(Number(e.target.value))}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    background: 'var(--adm-bg-card, #1E293B)',
                    color: 'var(--adm-text-title, #FFFFFF)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: '0.78rem',
                  }}
                >
                  <option value={1}>1 dia antes</option>
                  <option value={2}>2 dias antes</option>
                  <option value={3}>3 dias antes</option>
                  <option value={5}>5 dias antes</option>
                </select>
              </div>

              {/* Lembrete em Horas */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={enableHourReminder}
                  onChange={e => setEnableHourReminder(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10B981' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>Criar lembrete</span>
                <select
                  disabled={!enableHourReminder}
                  value={reminderHoursBefore}
                  onChange={e => setReminderHoursBefore(Number(e.target.value))}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    background: 'var(--adm-bg-card, #1E293B)',
                    color: 'var(--adm-text-title, #FFFFFF)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: '0.78rem',
                  }}
                >
                  <option value={1}>1 hora antes</option>
                  <option value={3}>3 horas antes</option>
                  <option value={24}>24 horas antes</option>
                  <option value={48}>48 horas antes</option>
                </select>
              </div>
            </div>
          </div>

          {/* NOTAS E OBSERVAÇÕES */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '4px' }}>
              OBSERVAÇÕES INTERNAS
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Debutante vem com os pais e a tia. Gostariam de ver iluminação cenográfica..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--adm-bg-card, #1E293B)',
                color: 'var(--adm-text-title, #FFFFFF)',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                fontSize: '0.82rem',
                resize: 'none',
              }}
            />
          </div>

          {/* FOOTER */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                color: 'var(--adm-text-muted, #94A3B8)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 24px',
                borderRadius: '8px',
                background: themeColor,
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${themeColor}44`,
              }}
            >
              <Check size={16} />
              {isSubmitting ? 'Agendando...' : (isFutureCommitment ? 'Confirmar Remarcação' : 'Confirmar Agendamento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
