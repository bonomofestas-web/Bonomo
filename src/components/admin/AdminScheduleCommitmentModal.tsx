import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar as CalendarIcon, Clock, Users, ShieldAlert,
  AlertTriangle, Check, UserCheck, Utensils, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Lead, CommercialCommitmentType } from '../../types/admin';
import { agendaAvailabilityService } from '../../services/agendaAvailabilityService';

interface AdminScheduleCommitmentModalProps {
  lead: Lead;
  initialType?: CommercialCommitmentType;
  onClose: () => void;
  onScheduled?: () => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const AdminScheduleCommitmentModal: React.FC<AdminScheduleCommitmentModalProps> = ({
  lead,
  initialType = 'visit',
  onClose,
  onScheduled,
}) => {
  const { 
    venues, 
    collaborators, 
    currentUser, 
    venueAgendaConfigs, 
    appointments, 
    scheduleCommercialCommitment 
  } = useAdminState();

  const [type, setType] = useState<CommercialCommitmentType>(initialType);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Data padrão: amanhã
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [pax, setPax] = useState<number>(() => {
    return lead.estimatedGuests ? Math.min(lead.estimatedGuests, 4) : 2;
  });
  const [responsibleId, setResponsibleId] = useState<string>(() => {
    return lead.closerId || lead.sdrId || currentUser?.id || '';
  });
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const targetVenueId = lead.venueId || venues[0]?.id || 'all';
  const targetVenue = venues.find(v => v.id === targetVenueId);
  const venueConfig = venueAgendaConfigs.find(c => c.venueId === targetVenueId);

  // Verificar se o lead já possui compromisso deste tipo (Trava de Unicidade)
  const existingCommitment = type === 'visit' ? lead.visitCommitment : lead.tastingCommitment;
  const isAlreadyCommitted = existingCommitment && (existingCommitment.status === 'scheduled' || existingCommitment.status === 'completed');

  // Navegação entre meses do calendário visual
  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const formattedMonthTitle = useMemo(() => {
    const m = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, [calendarMonth]);

  // Computa a disponibilidade de cada dia do mês corrente (Dias cinzas vs disponíveis)
  const monthDaysGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstDayIndex = firstDay.getDay(); // 0 = Domingo
    const totalDays = lastDay.getDate();

    const todayStr = new Date().toISOString().split('T')[0];

    const days: {
      dateStr: string;
      dayNum: number;
      isPast: boolean;
      isAvailable: boolean;
      reason?: string;
      slotsCount: number;
    }[] = [];

    for (let day = 1; day <= totalDays; day++) {
      const dObj = new Date(year, month, day);
      const dateStr = dObj.toISOString().split('T')[0];
      const isPast = dateStr < todayStr;

      let isAvailable = false;
      let reason = 'Data no passado';
      let slotsCount = 0;

      if (!isPast) {
        const avail = agendaAvailabilityService.getAvailableSlots(
          dateStr,
          type,
          targetVenueId,
          appointments,
          venueConfig
        );
        isAvailable = avail.isDayAvailable && avail.slots.some(s => s.isAvailable);
        reason = avail.reason || (isAvailable ? `${avail.slots.filter(s => s.isAvailable).length} horários disponíveis` : 'Sem horários');
        slotsCount = avail.slots.filter(s => s.isAvailable).length;
      }

      days.push({
        dateStr,
        dayNum: day,
        isPast,
        isAvailable,
        reason,
        slotsCount,
      });
    }

    return { firstDayIndex, days };
  }, [calendarMonth, type, targetVenueId, appointments, venueConfig]);

  // Se a data selecionada mudar de mês, sincroniza
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (y && m) {
        setCalendarMonth(new Date(y, m - 1, 1));
      }
    }
  }, []);

  // Calcular slots disponíveis para a data selecionada usando o motor de disponibilidade
  const dayAvailability = useMemo(() => {
    if (!selectedDate) {
      return { isDayAvailable: false, reason: 'Selecione uma data disponível.', slots: [] };
    }
    return agendaAvailabilityService.getAvailableSlots(
      selectedDate,
      type,
      targetVenueId,
      appointments,
      venueConfig
    );
  }, [selectedDate, type, targetVenueId, appointments, venueConfig]);

  // Se o horário selecionado não estiver nos slots disponíveis daquela data, seleciona o primeiro disponível
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
  }, [dayAvailability, selectedTime]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isAlreadyCommitted) {
      setErrorMessage(`Este lead já possui uma ${type === 'visit' ? 'Visita Comercial' : 'Degustação'} ativa.`);
      return;
    }

    if (!selectedDate) {
      setErrorMessage('Por favor, selecione uma data no calendário.');
      return;
    }

    if (!selectedTime) {
      setErrorMessage('Por favor, escolha um horário liberado na grade.');
      return;
    }

    if (!pax || pax < 1) {
      setErrorMessage('A contagem de PAX deve ser de pelo menos 1 pessoa.');
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

    const success = await scheduleCommercialCommitment(lead.id, type, {
      date: selectedDate,
      time: selectedTime,
      durationMinutes: chosenSlot.durationMinutes,
      pax,
      responsibleCollaboratorId: responsibleId || undefined,
      responsibleName: assignedCollab?.name || currentUser?.name,
      notes: notes.trim() || undefined,
      venueId: targetVenueId,
    });

    setIsSubmitting(false);

    if (success) {
      if (onScheduled) onScheduled();
      onClose();
    } else {
      setErrorMessage('Erro ao persistir o agendamento no sistema. Tente novamente.');
    }
  };

  const themeColor = type === 'visit' ? '#38BDF8' : '#F59E0B';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 12, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: '#0F111A',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Cabeçalho */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: type === 'visit' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: themeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${type === 'visit' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}>
              {type === 'visit' ? <CalendarIcon size={20} /> : <Utensils size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#FFFFFF' }}>
                Agendar {type === 'visit' ? 'Visita Comercial' : 'Degustação'}
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '2px 0 0 0' }}>
                Lead: <strong style={{ color: '#FFFFFF' }}>{lead.name}</strong> • {targetVenue?.name || 'Unidade'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSchedule} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Seletor de Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setType('visit')}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${type === 'visit' ? '#38BDF8' : 'rgba(255,255,255,0.1)'}`,
                background: type === 'visit' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                color: type === 'visit' ? '#38BDF8' : '#94A3B8',
                fontSize: '0.80rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <CalendarIcon size={15} />
              <span>Visita</span>
            </button>

            <button
              type="button"
              onClick={() => setType('tasting')}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${type === 'tasting' ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
                background: type === 'tasting' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                color: type === 'tasting' ? '#F59E0B' : '#94A3B8',
                fontSize: '0.80rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Utensils size={15} />
              <span>Degustação</span>
            </button>
          </div>

          {/* Alerta de Trava de Unicidade */}
          {isAlreadyCommitted && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: '#FCA5A5',
              fontSize: '0.76rem',
            }}>
              <ShieldAlert size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: '2px' }}>
                  Trava de Unicidade: Compromisso Já Registrado
                </strong>
                Este lead já possui uma {type === 'visit' ? 'Visita' : 'Degustação'} com status <strong>{existingCommitment.status === 'completed' ? 'Concluída' : 'Agendada'}</strong> em {new Date(existingCommitment.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {existingCommitment.time} ({existingCommitment.pax} PAX).
              </div>
            </div>
          )}

          {/* Calendário Visual Interativo de Seleção de Data */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={13} color={themeColor} />
                <span>Selecione a Data Disponível</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.66rem', color: '#94A3B8', marginRight: '6px', fontWeight: 600 }}>
                  Cinza = Indisponível / Lotado
                </span>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', minWidth: '110px', textAlign: 'center' }}>
                  {formattedMonthTitle}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Grid dos Dias */}
            <div style={{
              background: '#141622',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '10px',
            }}>
              {/* Cabeçalho dos dias da semana */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
                {WEEKDAYS.map(w => (
                  <div key={w} style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    {w}
                  </div>
                ))}
              </div>

              {/* Dias do mês */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {/* Espaços em branco para o primeiro dia do mês */}
                {Array.from({ length: monthDaysGrid.firstDayIndex }).map((_, i) => (
                  <div key={`empty_${i}`} style={{ height: '36px' }} />
                ))}

                {monthDaysGrid.days.map(day => {
                  const isSelected = selectedDate === day.dateStr;
                  const isAvailable = day.isAvailable;

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedDate(day.dateStr)}
                      title={day.reason}
                      style={{
                        height: '36px',
                        borderRadius: '8px',
                        border: isSelected 
                          ? `1.5px solid ${themeColor}`
                          : isAvailable 
                          ? '1px solid rgba(255, 255, 255, 0.15)' 
                          : '1px solid rgba(255, 255, 255, 0.04)',
                        background: isSelected
                          ? themeColor
                          : isAvailable
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(255, 255, 255, 0.02)',
                        color: isSelected
                          ? '#0F172A'
                          : isAvailable
                          ? '#FFFFFF'
                          : '#475569',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: isSelected ? 900 : isAvailable ? 700 : 400,
                        fontSize: '0.76rem',
                        transition: 'all 0.12s ease',
                        position: 'relative',
                        opacity: isAvailable ? 1 : 0.45,
                      }}
                    >
                      <span>{day.dayNum}</span>
                      {isAvailable && !isSelected && (
                        <span style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: themeColor,
                          marginTop: '1px',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Horários Disponíveis para a Data Selecionada */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#E2E8F0' }}>
                Horários Disponíveis em {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '...'}
              </label>
              {dayAvailability.slots.length > 0 && (
                <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>
                  {dayAvailability.slots.filter(s => s.isAvailable).length} horários abertos
                </span>
              )}
            </div>

            {!dayAvailability.isDayAvailable ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px dashed rgba(239, 68, 68, 0.35)',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
                color: '#F87171',
                fontSize: '0.76rem',
              }}>
                <AlertTriangle size={16} style={{ margin: '0 auto 4px auto', display: 'block' }} />
                {dayAvailability.reason}
              </div>
            ) : dayAvailability.slots.length === 0 ? (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: '0.76rem',
              }}>
                Nenhum horário liberado nesta data.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '8px',
              }}>
                {dayAvailability.slots.map(slot => {
                  const isSelected = selectedTime === slot.time;
                  const isAvail = slot.isAvailable;

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!isAvail}
                      onClick={() => setSelectedTime(slot.time)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: `1.5px solid ${isSelected ? themeColor : isAvail ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.25)'}`,
                        background: isSelected 
                          ? (type === 'visit' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(245, 158, 11, 0.25)')
                          : isAvail 
                          ? '#1A1824' 
                          : 'rgba(239, 68, 68, 0.05)',
                        color: isSelected ? '#FFFFFF' : isAvail ? '#FFFFFF' : '#64748B',
                        cursor: isAvail ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        opacity: isAvail ? 1 : 0.5,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {slot.time}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: isAvail ? '#94A3B8' : '#EF4444' }}>
                        {isAvail ? `${slot.remainingPax} PAX restantes` : 'Esgotado'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção PAX e Responsável */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Campo Oficial PAX com Botões de Ajuste Rápido */}
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Users size={13} color={themeColor} />
                <span>Contagem de PAX (Total)</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPax(prev => Math.max(1, prev - 1))}
                  style={{
                    width: '34px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: '#1A1824',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={pax}
                  onChange={(e) => setPax(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    flex: 1,
                    height: '36px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: '#1A1824',
                    color: '#FFFFFF',
                    fontSize: '0.90rem',
                    fontWeight: 900,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPax(prev => prev + 1)}
                  style={{
                    width: '34px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: '#1A1824',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>
              <span style={{ fontSize: '0.62rem', color: '#94A3B8', marginTop: '3px', display: 'block' }}>
                Lead + familiares presentes
              </span>
            </div>

            {/* Responsável pelo Atendimento */}
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <UserCheck size={13} color={themeColor} />
                <span>Responsável</span>
              </label>
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#1A1824',
                  color: '#FFFFFF',
                  fontSize: '0.80rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Selecione o colaborador...</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#E2E8F0', display: 'block', marginBottom: '6px' }}>
              Observações / Preferências
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Família virá com a debutante; interesse em buffet finger food..."
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

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#F87171',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <AlertTriangle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Rodapé com Botão de Confirmação */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#94A3B8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isAlreadyCommitted || !selectedTime || !dayAvailability.isDayAvailable}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: isAlreadyCommitted || !selectedTime || !dayAvailability.isDayAvailable
                  ? 'rgba(255,255,255,0.08)'
                  : themeColor,
                border: 'none',
                color: isAlreadyCommitted || !selectedTime || !dayAvailability.isDayAvailable
                  ? '#64748B'
                  : '#0F172A',
                fontSize: '0.78rem',
                fontWeight: 900,
                cursor: isAlreadyCommitted || !selectedTime || !dayAvailability.isDayAvailable
                  ? 'not-allowed'
                  : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isAlreadyCommitted || !selectedTime || !dayAvailability.isDayAvailable
                  ? 'none'
                  : `0 4px 14px ${type === 'visit' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              }}
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check size={14} />
                  <span>Confirmar Agendamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
