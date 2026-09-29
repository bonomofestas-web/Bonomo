import React, { useState, useMemo } from 'react';
import { 
  X, Calendar, Trash2, ShieldAlert, AlertTriangle,
  Check, Copy, ChevronLeft, ChevronRight,
  Plus, Users, Sparkles, Building2
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

  const selectedVenueId = venueId || (activeVenueId !== 'all' && activeVenueId ? activeVenueId : venues[0]?.id || 'all');
  const existingConfig = venueAgendaConfigs.find(c => c.venueId === selectedVenueId) 
    || agendaAvailabilityService.getDefaultConfig(selectedVenueId);

  // Tipo ativo: Visita vs Degustação
  const [activeType, setActiveType] = useState<CommercialCommitmentType>(initialType);

  // Modo ativo: 1. Recorrente Semanal, 2. Bloco por Período, 3. Dia Específico (Bloqueios/Exceções)
  const [activeMode, setActiveMode] = useState<'recurring' | 'block' | 'override'>('recurring');

  // Regras de Visitas e Degustações
  const [visitsRule, setVisitsRule] = useState<AgendaRecurringRule>(() => ({
    enabledDays: existingConfig.visitsRule?.enabledDays || DEFAULT_VISITS_RULE.enabledDays,
    timeSlots: existingConfig.visitsRule?.timeSlots || DEFAULT_VISITS_RULE.timeSlots,
    durationMinutes: existingConfig.visitsRule?.durationMinutes || DEFAULT_VISITS_RULE.durationMinutes,
    maxConcurrentPerSlot: existingConfig.visitsRule?.maxConcurrentPerSlot || DEFAULT_VISITS_RULE.maxConcurrentPerSlot,
    maxPaxPerSlot: existingConfig.visitsRule?.maxPaxPerSlot || DEFAULT_VISITS_RULE.maxPaxPerSlot,
    daySchedules: existingConfig.visitsRule?.daySchedules || DEFAULT_VISITS_RULE.daySchedules,
  }));

  const [tastingsRule, setTastingsRule] = useState<AgendaRecurringRule>(() => ({
    enabledDays: existingConfig.tastingsRule?.enabledDays || DEFAULT_TASTINGS_RULE.enabledDays,
    timeSlots: existingConfig.tastingsRule?.timeSlots || DEFAULT_TASTINGS_RULE.timeSlots,
    durationMinutes: existingConfig.tastingsRule?.durationMinutes || DEFAULT_TASTINGS_RULE.durationMinutes,
    maxConcurrentPerSlot: existingConfig.tastingsRule?.maxConcurrentPerSlot || DEFAULT_TASTINGS_RULE.maxConcurrentPerSlot,
    maxPaxPerSlot: existingConfig.tastingsRule?.maxPaxPerSlot || DEFAULT_TASTINGS_RULE.maxPaxPerSlot,
    daySchedules: existingConfig.tastingsRule?.daySchedules || DEFAULT_TASTINGS_RULE.daySchedules,
  }));

  // Blocos por Período
  const [blockRules, setBlockRules] = useState<AgendaBlockRule[]>(() => existingConfig.blockRules || []);

  // Bloqueios e Exceções Pontuais
  const [dateOverrides, setDateOverrides] = useState<AgendaDateOverride[]>(() => existingConfig.dateOverrides || []);

  // Form de Novo Bloco
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockStart, setNewBlockStart] = useState('');
  const [newBlockEnd, setNewBlockEnd] = useState('');
  const [newBlockStartTime, setNewBlockStartTime] = useState('09:00');
  const [newBlockEndTime, setNewBlockEndTime] = useState('18:00');
  const [newBlockDuration, setNewBlockDuration] = useState(60);
  const [newBlockDays] = useState<number[]>([1, 2, 3, 4, 5]);

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
  const isDarkMode = document.documentElement.classList.contains('dark') || true;

  const currentRule = activeType === 'visit' ? visitsRule : tastingsRule;
  const setCurrentRule = activeType === 'visit' ? setVisitsRule : setTastingsRule;

  // Duração da Sessão
  const handleDurationChange = (duration: number) => {
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

      const nextDaySchedule: AgendaDaySchedule = {
        ...existingDaySchedule,
        enabled: !isEnabled,
        timeSlots: !isEnabled 
          ? generateSlotsFromRange(existingDaySchedule.startTime, existingDaySchedule.endTime, prev.durationMinutes)
          : [],
      };

      return {
        ...prev,
        enabledDays: nextEnabledDays,
        daySchedules: {
          ...(prev.daySchedules || {}),
          [dayId]: nextDaySchedule,
        },
      };
    });
  };

  // Altera horário de início ou fim de um dia da semana
  const handleScheduleTimeChange = (dayId: number, field: 'startTime' | 'endTime', value: string) => {
    setCurrentRule(prev => {
      const daySchedule = prev.daySchedules?.[dayId] || {
        dayOfWeek: dayId,
        enabled: prev.enabledDays.includes(dayId),
        startTime: '09:00',
        endTime: '18:00',
        slotDurationMinutes: prev.durationMinutes,
      };

      const updated = {
        ...daySchedule,
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

  // Adicionar novo bloco por período
  const handleAddBlockRule = () => {
    if (!newBlockStart || !newBlockEnd) {
      alert('Selecione data de início e término para o bloco.');
      return;
    }
    if (newBlockStart > newBlockEnd) {
      alert('A data de início deve ser anterior ou igual à data de término.');
      return;
    }

    const calculatedSlots = generateSlotsFromRange(newBlockStartTime, newBlockEndTime, newBlockDuration);

    const newBlock: AgendaBlockRule = {
      id: generateUuid(),
      startDate: newBlockStart,
      endDate: newBlockEnd,
      title: newBlockTitle.trim() || `Período Especial (${newBlockStart.slice(5)} a ${newBlockEnd.slice(5)})`,
      type: activeType === 'visit' ? 'visits' : 'tastings',
      durationMinutes: newBlockDuration,
      enabledDays: newBlockDays,
      timeSlots: calculatedSlots,
      maxConcurrentPerSlot: currentRule.maxConcurrentPerSlot,
      maxPaxPerSlot: currentRule.maxPaxPerSlot,
    };

    setBlockRules(prev => [...prev, newBlock]);
    setNewBlockTitle('');
    setNewBlockStart('');
    setNewBlockEnd('');
  };

  // Remover bloco
  const handleRemoveBlockRule = (id: string) => {
    setBlockRules(prev => prev.filter(b => b.id !== id));
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

  // Clique em uma data no calendário mensal (Modo 3 - Dia Específico)
  const handleCalendarDayClick = (dateStr: string) => {
    const existingOverride = dateOverrides.find(o => o.date === dateStr);
    const isCurrentlyBlocked = existingOverride?.isBlocked;

    if (isCurrentlyBlocked) {
      // Desbloqueia a data
      setDateOverrides(prev => prev.filter(o => o.date !== dateStr));
    } else {
      // Tentativa de bloqueio: checa conflitos
      const conflicts = findConflictingAppointmentsForDate(dateStr);
      if (conflicts.length > 0) {
        setConflictModalData({
          targetDate: dateStr,
          affectedTasks: conflicts,
          onConfirm: () => {
            // Cancela os agendamentos afetados
            conflicts.forEach(task => {
              updateTask(task.id, {
                status: 'todo',
                customStatusId: 'st_cancelled',
                resolution: 'Agendamento cancelado automaticamente: data bloqueada pela gerência.',
                customProperties: {
                  ...task.customProperties,
                  cancelledDueToBlock: true,
                  blockedDate: dateStr,
                }
              });
            });

            // Aplica o bloqueio
            setDateOverrides(prev => [
              ...prev.filter(o => o.date !== dateStr),
              {
                date: dateStr,
                isBlocked: true,
                reason: 'Data bloqueada pela administração com cancelamento de agendamentos.',
              }
            ]);
            setConflictModalData(null);
          },
        });
      } else {
        // Bloqueia diretamente
        setDateOverrides(prev => [
          ...prev.filter(o => o.date !== dateStr),
          {
            date: dateStr,
            isBlocked: true,
            reason: 'Bloqueio Pontual',
          }
        ]);
      }
    }
  };

  // Salvar alterações
  const handleSave = async () => {
    setIsSaving(true);
    const updatedConfig: VenueAgendaConfig = {
      id: existingConfig.id,
      venueId: selectedVenueId,
      visitsRule,
      tastingsRule,
      blockRules,
      dateOverrides,
      updatedAt: new Date().toISOString(),
    };

    const ok = await updateVenueAgendaConfig(updatedConfig);
    setIsSaving(false);
    if (ok) {
      if (onSaved) onSaved();
      onClose();
    } else {
      alert('Configuração salva com sucesso localmente.');
      onClose();
    }
  };

  // Navegação no calendário mensal
  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthTitle = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Grid de dias do mês para Modos 2 e 3
  const monthDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isBlocked = dateOverrides.some(o => o.date === dateStr && o.isBlocked);
      const isInsideBlock = blockRules.some(b => b.startDate <= dateStr && dateStr <= b.endDate);
      const hasConflicts = findConflictingAppointmentsForDate(dateStr).length > 0;
      days.push({
        dayNumber: d,
        dateStr,
        isBlocked,
        isInsideBlock,
        hasConflicts,
      });
    }
    return days;
  }, [calendarMonth, dateOverrides, blockRules, tasks]);

  const venueName = venues.find(v => v.id === selectedVenueId)?.name || 'Todas as Unidades';

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
        maxWidth: '1240px',
        maxHeight: '94vh',
        borderRadius: '16px',
        border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* HEADER SUPERIOR */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,95,70,0.4))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>
              <Calendar size={22} color="#10B981" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                  Configuração de Disponibilidade da Agenda
                </h2>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16,185,129,0.15)',
                  color: '#10B981',
                  border: '1px solid rgba(16,185,129,0.3)',
                }}>
                  F5 SYSTEM
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                Defina horários, sessões e bloqueios para a unidade: <strong>{venueName}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-text-muted, #94A3B8)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BARRA DE SELEÇÃO: VISITAS VS DEGUSTAÇÕES + MODOS */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(0,0,0,0.15)',
        }}>
          {/* Seletor Principal: Visita vs Degustação */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setActiveType('visit')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeType === 'visit' ? '#10B981' : 'transparent',
                color: activeType === 'visit' ? '#FFFFFF' : 'var(--adm-text-muted, #94A3B8)',
                border: activeType === 'visit' ? '1px solid #10B981' : '1px solid var(--adm-border, rgba(255,255,255,0.1))',
              }}
            >
              <Building2 size={16} />
              🏛️ Visitas Comerciais
            </button>

            <button
              type="button"
              onClick={() => setActiveType('tasting')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeType === 'tasting' ? '#D97706' : 'transparent',
                color: activeType === 'tasting' ? '#FFFFFF' : 'var(--adm-text-muted, #94A3B8)',
                border: activeType === 'tasting' ? '1px solid #D97706' : '1px solid var(--adm-border, rgba(255,255,255,0.1))',
              }}
            >
              <Users size={16} />
              🍽️ Degustações Gastronômicas
            </button>
          </div>

          {/* Seletor de Modo: Recorrente, Bloco, Dia Específico */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          }}>
            <button
              type="button"
              onClick={() => setActiveMode('recurring')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeMode === 'recurring' ? 'var(--adm-bg-card, #1E293B)' : 'transparent',
                color: activeMode === 'recurring' ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #94A3B8)',
                boxShadow: activeMode === 'recurring' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              🔁 1. Recorrente Semanal
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('block')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeMode === 'block' ? 'var(--adm-bg-card, #1E293B)' : 'transparent',
                color: activeMode === 'block' ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #94A3B8)',
                boxShadow: activeMode === 'block' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              🗓️ 2. Por Bloco (Período)
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('override')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeMode === 'override' ? 'var(--adm-bg-card, #1E293B)' : 'transparent',
                color: activeMode === 'override' ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #94A3B8)',
                boxShadow: activeMode === 'override' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              📅 3. Bloqueio de Feriados / Dia Específico
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          {/* ═══════════════════════════════════════════════════════════════════
              MODO 1: RECORRENTE SEMANAL (ESTILO GOOGLE CALENDAR)
              ═══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'recurring' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
              {/* Coluna da Esquerda: Configurações dos Dias e Horários */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Duração e Capacidade */}
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
                  border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '6px' }}>
                      DURAÇÃO DE CADA HORÁRIO
                    </label>
                    <select
                      value={currentRule.durationMinutes}
                      onChange={e => handleDurationChange(Number(e.target.value))}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-card, #1E293B)',
                        color: 'var(--adm-text-title, #FFFFFF)',
                        border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '6px' }}>
                      VAGAS SIMULTÂNEAS POR HORÁRIO
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={currentRule.maxConcurrentPerSlot}
                      onChange={e => setCurrentRule(prev => ({ ...prev, maxConcurrentPerSlot: Number(e.target.value) || 1 }))}
                      style={{
                        width: '90px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-card, #1E293B)',
                        color: 'var(--adm-text-title, #FFFFFF)',
                        border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  {activeType === 'tasting' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '6px' }}>
                        LIMITE TOTAL DE PAX (PESSOAS)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={currentRule.maxPaxPerSlot || 20}
                        onChange={e => setCurrentRule(prev => ({ ...prev, maxPaxPerSlot: Number(e.target.value) || 20 }))}
                        style={{
                          width: '90px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'var(--adm-bg-card, #1E293B)',
                          color: 'var(--adm-text-title, #FFFFFF)',
                          border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Lista dos 7 Dias da Semana (Seg a Dom) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {DAYS_OF_WEEK.map(day => {
                    const isEnabled = currentRule.enabledDays.includes(day.id);
                    const schedule = currentRule.daySchedules?.[day.id] || {
                      dayOfWeek: day.id,
                      enabled: isEnabled,
                      startTime: activeType === 'visit' ? '09:00' : '19:00',
                      endTime: activeType === 'visit' ? '18:00' : '22:00',
                      slotDurationMinutes: currentRule.durationMinutes,
                    };

                    return (
                      <div
                        key={day.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: isEnabled 
                            ? (isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') 
                            : 'transparent',
                          border: isEnabled 
                            ? '1px solid var(--adm-border, rgba(255,255,255,0.1))' 
                            : '1px dashed var(--adm-border, rgba(255,255,255,0.08))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        {/* Checkbox e Nome do Dia */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px' }}>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggleDay(day.id)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: activeType === 'visit' ? '#10B981' : '#D97706',
                            }}
                          />
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: isEnabled ? 700 : 500,
                            color: isEnabled ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #64748B)',
                          }}>
                            {day.label}
                          </span>
                        </div>

                        {/* Seletor de Horário Início - Fim */}
                        {isEnabled ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="time"
                              value={schedule.startTime}
                              onChange={e => handleScheduleTimeChange(day.id, 'startTime', e.target.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: 'var(--adm-bg-card, #1E293B)',
                                color: 'var(--adm-text-title, #FFFFFF)',
                                border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                              }}
                            />
                            <span style={{ color: 'var(--adm-text-muted, #94A3B8)', fontSize: '0.8rem' }}>até</span>
                            <input
                              type="time"
                              value={schedule.endTime}
                              onChange={e => handleScheduleTimeChange(day.id, 'endTime', e.target.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: 'var(--adm-bg-card, #1E293B)',
                                color: 'var(--adm-text-title, #FFFFFF)',
                                border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => handleCopyDayScheduleToAll(day.id)}
                              title="Copiar horário deste dia para os demais dias ativos"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--adm-text-muted, #94A3B8)',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.72rem',
                              }}
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted, #64748B)', fontStyle: 'italic' }}>
                            Indisponível
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coluna da Direita: Preview Visual das Vagas (Google Calendar Style) */}
              <div style={{
                background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
                borderRadius: '12px',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Preview Semanal de Horários Gerados
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>
                    ● Ao vivo
                  </span>
                </div>

                <div style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '6px',
                  overflowY: 'auto',
                  maxHeight: '440px',
                }}>
                  {DAYS_OF_WEEK.map(day => {
                    const isEnabled = currentRule.enabledDays.includes(day.id);
                    const schedule = currentRule.daySchedules?.[day.id];
                    const slots = isEnabled && schedule
                      ? (schedule.timeSlots?.length ? schedule.timeSlots : generateSlotsFromRange(schedule.startTime, schedule.endTime, currentRule.durationMinutes))
                      : [];

                    return (
                      <div
                        key={day.id}
                        style={{
                          background: isEnabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)',
                          borderRadius: '8px',
                          border: isEnabled ? '1px solid rgba(255,255,255,0.06)' : '1px dashed rgba(255,255,255,0.04)',
                          padding: '8px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: isEnabled ? (activeType === 'visit' ? '#10B981' : '#F59E0B') : '#64748B',
                        }}>
                          {day.short}
                        </span>

                        {isEnabled && slots.length > 0 ? (
                          slots.map(s => (
                            <div
                              key={s}
                              style={{
                                width: '100%',
                                padding: '4px 2px',
                                borderRadius: '4px',
                                background: activeType === 'visit' ? 'rgba(16,185,129,0.15)' : 'rgba(217,119,6,0.15)',
                                border: `1px solid ${activeType === 'visit' ? 'rgba(16,185,129,0.3)' : 'rgba(217,119,6,0.3)'}`,
                                color: activeType === 'visit' ? '#34D399' : '#FBBF24',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textAlign: 'center',
                              }}
                            >
                              {s}
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '10px' }}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 2: POR BLOCO DE DATAS (PERÍODO COM PRECEDÊNCIA)
              ═══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'block' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Card de Adição de Novo Bloco */}
              <div style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="#F59E0B" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                      Criar Novo Bloco por Período de Datas
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 600 }}>
                    ⚡ Prevalece sobre a regra semanal durante as datas selecionadas
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '4px' }}>
                      TÍTULO DO BLOCO
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Férias de Outubro, Degustação Especial..."
                      value={newBlockTitle}
                      onChange={e => setNewBlockTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-card, #1E293B)',
                        color: 'var(--adm-text-title, #FFFFFF)',
                        border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '4px' }}>
                      DATA INÍCIO
                    </label>
                    <input
                      type="date"
                      value={newBlockStart}
                      onChange={e => setNewBlockStart(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-card, #1E293B)',
                        color: 'var(--adm-text-title, #FFFFFF)',
                        border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '4px' }}>
                      DATA TÉRMINO
                    </label>
                    <input
                      type="date"
                      value={newBlockEnd}
                      onChange={e => setNewBlockEnd(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-card, #1E293B)',
                        color: 'var(--adm-text-title, #FFFFFF)',
                        border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '4px' }}>
                      HORÁRIO (INÍCIO - FIM)
                    </label>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="time"
                        value={newBlockStartTime}
                        onChange={e => setNewBlockStartTime(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 6px',
                          borderRadius: '8px',
                          background: 'var(--adm-bg-card, #1E293B)',
                          color: 'var(--adm-text-title, #FFFFFF)',
                          border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                          fontSize: '0.82rem',
                        }}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={newBlockEndTime}
                        onChange={e => setNewBlockEndTime(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 6px',
                          borderRadius: '8px',
                          background: 'var(--adm-bg-card, #1E293B)',
                          color: 'var(--adm-text-title, #FFFFFF)',
                          border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                          fontSize: '0.82rem',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '4px' }}>
                      DURAÇÃO
                    </label>
                    <select
                      value={newBlockDuration}
                      onChange={e => setNewBlockDuration(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-card, #1E293B)',
                        color: 'var(--adm-text-title, #FFFFFF)',
                        border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                        fontSize: '0.82rem',
                      }}
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBlockRule}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 18px',
                      borderRadius: '8px',
                      background: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={16} />
                    Adicionar Bloco
                  </button>
                </div>
              </div>

              {/* Lista de Blocos Cadastrados */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-muted, #94A3B8)', textTransform: 'uppercase' }}>
                  Blocos Ativos Cadastrados ({blockRules.length})
                </span>

                {blockRules.length === 0 ? (
                  <div style={{
                    padding: '24px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.1)',
                    border: '1px dashed var(--adm-border, rgba(255,255,255,0.08))',
                    textAlign: 'center',
                    color: 'var(--adm-text-muted, #64748B)',
                    fontSize: '0.85rem',
                  }}>
                    Nenhum bloco de período cadastrado. A regra recorrente semanal está em vigor permanente.
                  </div>
                ) : (
                  blockRules.map(b => (
                    <div
                      key={b.id}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '10px',
                        background: 'var(--adm-bg-card, #1E293B)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--adm-text-title, #FFFFFF)' }}>
                            {b.title}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(245,158,11,0.2)',
                            color: '#F59E0B',
                          }}>
                            {b.startDate} até {b.endDate}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                          Sessões de {b.durationMinutes} min • Horários: {b.timeSlots?.join(', ') || 'Calculados'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveBlockRule(b.id)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          color: '#EF4444',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={13} />
                        Excluir Bloco
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 3: DIA ESPECÍFICO / BLOQUEIO DE FERIADOS
              ═══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'override' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
              {/* Calendário Mensal Interativo para Bloqueio em 1 Clique */}
              <div style={{
                background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
                borderRadius: '12px',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', textTransform: 'capitalize' }}>
                    {monthTitle}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px', textAlign: 'center' }}>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <span key={d} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted, #64748B)' }}>{d}</span>
                  ))}
                </div>

                {/* Grid de Dias */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {monthDays.map((d, idx) => {
                    if (!d) return <div key={`empty-${idx}`} style={{ height: '54px' }} />;

                    return (
                      <div
                        key={d.dateStr}
                        onClick={() => handleCalendarDayClick(d.dateStr)}
                        style={{
                          height: '54px',
                          borderRadius: '8px',
                          padding: '6px',
                          background: d.isBlocked 
                            ? 'rgba(239,68,68,0.15)' 
                            : d.isInsideBlock 
                              ? 'rgba(245,158,11,0.15)' 
                              : 'rgba(16,185,129,0.08)',
                          border: d.isBlocked 
                            ? '1px solid #EF4444' 
                            : d.isInsideBlock 
                              ? '1px solid #F59E0B' 
                              : '1px solid rgba(16,185,129,0.2)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: d.isBlocked ? '#EF4444' : 'var(--adm-text-title, #FFFFFF)',
                          }}>
                            {d.dayNumber}
                          </span>
                          {d.hasConflicts && (
                            <span title="Possui agendamentos marcados" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                          )}
                        </div>

                        <span style={{
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          color: d.isBlocked ? '#EF4444' : d.isInsideBlock ? '#F59E0B' : '#10B981',
                        }}>
                          {d.isBlocked ? 'BLOQUEADO' : d.isInsideBlock ? 'BLOCO' : 'ABERTO'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '0.7rem', color: '#94A3B8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(16,185,129,0.5)' }} /> Aberto (Recorrente)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(245,158,11,0.5)' }} /> Bloco por Período
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#EF4444' }} /> Bloqueado / Feriado
                  </span>
                </div>
              </div>

              {/* Coluna da Direita: Lista de Datas Bloqueadas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-muted, #94A3B8)', textTransform: 'uppercase' }}>
                  Datas Bloqueadas ({dateOverrides.filter(o => o.isBlocked).length})
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '400px' }}>
                  {dateOverrides.filter(o => o.isBlocked).length === 0 ? (
                    <div style={{
                      padding: '20px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.1)',
                      textAlign: 'center',
                      color: 'var(--adm-text-muted, #64748B)',
                      fontSize: '0.8rem',
                    }}>
                      Nenhum feriado ou data bloqueada. Clique em qualquer data no calendário ao lado para bloquear.
                    </div>
                  ) : (
                    dateOverrides.filter(o => o.isBlocked).map(o => (
                      <div
                        key={o.date}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#EF4444' }}>
                            {o.date}
                          </span>
                          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                            {o.reason || 'Bloqueio Gerencial'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDateOverrides(prev => prev.filter(item => item.date !== o.date))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER INFERIOR */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-subtle, rgba(255,255,255,0.02))',
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
            As configurações têm efeito imediato nas novas solicitações de agendamento.
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
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
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 24px',
                borderRadius: '8px',
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              }}
            >
              <Check size={16} />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE BLINDAGEM CONTRA CONFLITOS */}
      {conflictModalData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card, #1E293B)',
            maxWidth: '520px',
            width: '100%',
            borderRadius: '14px',
            border: '1px solid rgba(239,68,68,0.4)',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ShieldAlert size={22} color="#EF4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#EF4444' }}>
                  Atenção: Existem Agendamentos Marcados
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Data: {conflictModalData.targetDate}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--adm-text-title, #FFFFFF)', lineHeight: 1.5, margin: '0 0 14px' }}>
              Esta data possui <strong>{conflictModalData.affectedTasks.length} agendamento(s)</strong> confirmado(s).
              Se você confirmar o bloqueio, eles serão marcados como <strong>CANCELADOS</strong> e o CRM exibirá um alerta vermelho para que a equipe comercial faça a averiguação e reagendamento.
            </p>

            <div style={{
              maxHeight: '140px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '18px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {conflictModalData.affectedTasks.map(t => (
                <div key={t.id} style={{ fontSize: '0.78rem', color: '#CBD5E1', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  • <strong>{t.title}</strong> {t.dueTime ? `(${t.dueTime})` : ''} - {t.leadName || 'Lead'}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConflictModalData(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                  color: 'var(--adm-text-muted, #94A3B8)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Voltar e Manter Aberto
              </button>

              <button
                type="button"
                onClick={conflictModalData.onConfirm}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <AlertTriangle size={15} />
                Bloquear e Cancelar Agendamentos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
