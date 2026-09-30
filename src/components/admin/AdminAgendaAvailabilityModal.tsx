import React, { useState, useMemo } from 'react';
import { 
  X, Calendar, Trash2, ShieldAlert,
  Check, Copy, ChevronLeft, ChevronRight,
  Plus, Building2, UtensilsCrossed,
  Repeat, CalendarRange, ArrowRight, ArrowLeft,
  Sliders
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

  // Tipo ativo fixado pela escolha prévia do usuário: Visita vs Degustação
  const activeType = initialType;

  // Modo ativo: 'hub' (Pré-tela / Visão Geral), 'recurring' (Grade Semanal), 'block' (Por Bloco), 'override' (Por Data)
  const [activeMode, setActiveMode] = useState<'hub' | 'recurring' | 'block' | 'override'>('hub');

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

  // Blocos por Período
  const [blockRules, setBlockRules] = useState<AgendaBlockRule[]>(() => existingConfig.blockRules || []);

  // Bloqueios e Exceções Pontuais
  const [dateOverrides, setDateOverrides] = useState<AgendaDateOverride[]>(() => existingConfig.dateOverrides || []);

  // Fluxo de Novo Bloco em 2 Etapas
  const [blockCreationStep, setBlockCreationStep] = useState<1 | 2>(1);
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockStart, setNewBlockStart] = useState('');
  const [newBlockEnd, setNewBlockEnd] = useState('');
  const [newBlockStartTime, setNewBlockStartTime] = useState('09:00');
  const [newBlockEndTime, setNewBlockEndTime] = useState('18:00');
  const [newBlockDuration, setNewBlockDuration] = useState(60);
  const [newBlockDays, setNewBlockDays] = useState<number[]>([1, 2, 3, 4, 5]);

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

  const handleToggleRecurringEnabled = () => {
    setCurrentRule(prev => ({
      ...prev,
      enabled: prev.enabled === false ? true : false,
    }));
  };

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

  // Avançar para o Passo 2 da Criação do Bloco (Calendário do Período)
  const handleAdvanceBlockStep = () => {
    if (!newBlockStart || !newBlockEnd) {
      alert('Selecione data de início e término para o bloco.');
      return;
    }
    if (newBlockStart > newBlockEnd) {
      alert('A data de início deve ser anterior ou igual à data de término.');
      return;
    }
    setBlockCreationStep(2);
  };

  // Salvar novo bloco por período
  const handleAddBlockRule = () => {
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
    setBlockCreationStep(1);
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

  // Salvar alterações no Supabase e fechar
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

  // Blocos filtrados para o tipo ativo (Visitas vs Degustações)
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
      <div style={{
        background: 'var(--adm-bg-card, #FFFFFF)',
        color: 'var(--adm-text-title, #0F172A)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* HEADER SUPERIOR LIMPO E ELEGANTE */}
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
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: activeType === 'visit' ? 'rgba(16,185,129,0.12)' : 'rgba(217,119,6,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${activeType === 'visit' ? 'rgba(16,185,129,0.25)' : 'rgba(217,119,6,0.25)'}`,
            }}>
              {activeType === 'visit' ? <Building2 size={22} color="#10B981" /> : <UtensilsCrossed size={22} color="#D97706" />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  {activeType === 'visit' ? 'Disponibilidade de Visitas Comerciais' : 'Disponibilidade de Degustações'}
                </h2>
                <span style={{
                  fontSize: '0.70rem',
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
              <p style={{ margin: '2px 0 0', fontSize: '0.80rem', color: 'var(--adm-text-muted, #64748B)' }}>
                Configuração para a unidade: <strong>{venueName}</strong>
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

        {/* CORPO PRINCIPAL COM SCROLL SUAVE */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: 'var(--adm-bg-app, #F8FAFC)',
        }}>
          {/* BARRA DE RETORNO ÀS OPÇÕES (QUANDO ESTIVER DENTRO DE UM MODO ESPECÍFICO) */}
          {activeMode !== 'hub' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1px solid var(--adm-border, #E2E8F0)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
              <button
                type="button"
                onClick={() => setActiveMode('hub')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: 'var(--adm-bg-surface, #F1F5F9)',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={16} />
                Voltar às Opções
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  {activeMode === 'recurring' && 'Recorrência Semanal Padrão'}
                  {activeMode === 'block' && 'Configuração por Bloco de Datas'}
                  {activeMode === 'override' && 'Configuração por Data (Feriados e Exceções)'}
                </span>
              </div>
            </div>
          )}
          {/* ═══════════════════════════════════════════════════════════════════
              PRÉ-TELA DE CONFIGURAÇÃO / HUB DE VISÃO GERAL
              ═══════════════════════════════════════════════════════════════════ */}
          {/* ═══════════════════════════════════════════════════════════════════
              PRÉ-TELA DE CONFIGURAÇÃO / HUB DE VISÃO GERAL (3 CARDS VERTICAIS)
              ═══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'hub' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '860px', margin: '0 auto', width: '100%' }}>
              {/* Card 1: Recorrência Semanal */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: `${themeColor}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: themeColor,
                    flexShrink: 0,
                  }}>
                    <Repeat size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                        Recorrência Semanal
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleRecurringEnabled}
                        style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: currentRule.enabled !== false ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: currentRule.enabled !== false ? '#10B981' : '#EF4444',
                          border: `1px solid ${currentRule.enabled !== false ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Clique para ativar ou desativar a recorrência semanal padrão"
                      >
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: currentRule.enabled !== false ? '#10B981' : '#EF4444',
                        }} />
                        {currentRule.enabled !== false ? 'Ativo' : 'Desativado'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.45 }}>
                      {currentRule.enabled !== false ? (
                        <>Ativo em <strong>{currentRule.enabledDays.length} dias da semana</strong> com slots de <strong>{currentRule.durationMinutes} minutos</strong>. Capacidade de <strong>{currentRule.maxConcurrentPerSlot} vaga(s) simultânea(s)</strong> • Até <strong>{currentRule.maxPaxPerSlot || 5} PAX</strong> por família.</>
                      ) : (
                        <span style={{ color: '#EF4444', fontWeight: 600 }}>Recorrência desativada. Nenhum dia semanal padrão estará aberto para agendamento, exceto se configurado por bloco ou exceção de data.</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMode('recurring')}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-surface, #F1F5F9)',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    color: '#0F172A',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                  }}
                >
                  <Sliders size={15} />
                  Configurar Recorrência
                </button>
              </div>

              {/* Card 2: Configuração por Bloco */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: 'rgba(2,132,199,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284C7',
                    flexShrink: 0,
                  }}>
                    <CalendarRange size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
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
                        {activeTypeBlockRules.length} bloco(s)
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.45 }}>
                      {activeTypeBlockRules.length === 0 ? (
                        'Defina períodos específicos com horários especiais que sobrepõem a recorrência semanal padrão.'
                      ) : (
                        `Existem ${activeTypeBlockRules.length} bloco(s) cadastrados com horários específicos para períodos determinados.`
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMode('block')}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-surface, #F1F5F9)',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    color: '#0F172A',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={15} />
                  {activeTypeBlockRules.length === 0 ? 'Criar Primeiro Bloco' : 'Gerenciar Blocos'}
                </button>
              </div>

              {/* Card 3: Configuração por Data */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#EF4444',
                    flexShrink: 0,
                  }}>
                    <Calendar size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
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
                        {dateOverrides.length} exceção(ões)
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.45 }}>
                      Bloqueio de feriados, recessos pontuais e horários específicos por dia diretamente no calendário.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMode('override')}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-surface, #F1F5F9)',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    color: '#0F172A',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={15} />
                  Ver Calendário de Datas
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 1: RECORRÊNCIA SEMANAL PADRÃO (GRADE DE 7 DIAS)
              ═══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'recurring' && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                {/* Cabeçalho da Grade Semanal com Duração, Vagas e PAX */}
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
                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                      Grade de Horários Semanais Padrão
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                      Ative os dias da semana e ajuste os horários de início e término de cada turno.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Duração */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                        DURAÇÃO DO HORÁRIO
                      </label>
                      <select
                        value={currentRule.durationMinutes}
                        onChange={e => handleDurationChange(Number(e.target.value))}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.80rem',
                          fontWeight: 600,
                        }}
                      >
                        {DURATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vagas Simultâneas */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                        VAGAS SIMULTÂNEAS
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={currentRule.maxConcurrentPerSlot}
                        onChange={e => setCurrentRule(prev => ({ ...prev, maxConcurrentPerSlot: Number(e.target.value) || 1 }))}
                        style={{
                          width: '80px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.80rem',
                          fontWeight: 700,
                        }}
                      />
                    </div>

                    {/* Limite de PAX por Família */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                        PAX MÁX. POR AGENDAMENTO
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={currentRule.maxPaxPerSlot || (activeType === 'tasting' ? 4 : 5)}
                        onChange={e => setCurrentRule(prev => ({ ...prev, maxPaxPerSlot: Number(e.target.value) || 5 }))}
                        style={{
                          width: '80px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.80rem',
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Grid Visual de 7 Colunas da Semana (Seg a Dom) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '10px',
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
                              checked={isEnabled}
                              onChange={() => handleToggleDay(day.id)}
                              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: themeColor }}
                            />
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isEnabled ? '#0F172A' : '#94A3B8' }}>
                              {day.short}
                            </span>
                          </div>

                          {isEnabled && (
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <input
                                type="time"
                                value={schedule.startTime}
                                onChange={e => handleUpdateDayTime(day.id, 'startTime', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '5px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  color: '#0F172A',
                                  background: '#FFFFFF',
                                  colorScheme: 'light',
                                  outline: 'none',
                                }}
                              />
                              <span style={{ fontSize: '0.70rem', color: '#94A3B8' }}>às</span>
                              <input
                                type="time"
                                value={schedule.endTime}
                                onChange={e => handleUpdateDayTime(day.id, 'endTime', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '5px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  color: '#0F172A',
                                  background: '#FFFFFF',
                                  colorScheme: 'light',
                                  outline: 'none',
                                }}
                              />
                            </div>

                            {/* Lista de Horários Gerados */}
                            <div style={{
                              maxHeight: '260px',
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
                                    padding: '5px 4px',
                                    borderRadius: '5px',
                                    background: activeType === 'visit' ? 'rgba(16,185,129,0.08)' : 'rgba(217,119,6,0.08)',
                                    border: `1px solid ${activeType === 'visit' ? 'rgba(16,185,129,0.2)' : 'rgba(217,119,6,0.2)'}`,
                                    color: activeType === 'visit' ? '#047857' : '#B45309',
                                    fontSize: '0.74rem',
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
                            fontSize: '0.72rem',
                            fontStyle: 'italic',
                            minHeight: '120px',
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
              MODO 2: POR BLOCO DE DATAS (PERÍODO COM PRECEDÊNCIA)
              ═══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'block' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Etapa 1: Selecionar o Período do Bloco */}
              {blockCreationStep === 1 && (
                <div style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: '1px solid var(--adm-border, #E2E8F0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CalendarRange size={20} color="#0284C7" />
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                        Passo 1: Selecionar o Período do Bloco
                      </h3>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#0284C7', fontWeight: 600 }}>
                      Prevalece com prioridade total sobre a regra semanal no período definido
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '14px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                        TÍTULO DO BLOCO
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Mutirão de Visitas, Recesso de Fim de Ano..."
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
                      <span>Avançar para Horários</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa 2: Calendário do Período com Opções Semanais e Ajuste Pontual */}
              {blockCreationStep === 2 && (
                <div style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: '1px solid var(--adm-border, #E2E8F0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setBlockCreationStep(1)}
                        style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ArrowLeft size={16} />
                        <span style={{ fontSize: '0.78rem' }}>Voltar ao Período</span>
                      </button>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                        Passo 2: Horários do Período ({newBlockStart.split('-').reverse().join('/')} a {newBlockEnd.split('-').reverse().join('/')})
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBlockRule}
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
                      Concluir e Salvar Bloco
                    </button>
                  </div>

                  {/* Barra Rápida: Aplicar Horários Semanais ao Bloco */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-surface, #F8FAFC)',
                    border: '1px solid var(--adm-border, #E2E8F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#334155' }}>
                      Definição Rápida de Turno para o Bloco:
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>Horário:</span>
                        <input
                          type="time"
                          value={newBlockStartTime}
                          onChange={e => setNewBlockStartTime(e.target.value)}
                          style={{ padding: '4px 6px', borderRadius: '5px', border: '1px solid #CBD5E1', fontSize: '0.76rem', fontWeight: 800, color: '#0F172A', background: '#FFFFFF', colorScheme: 'light' }}
                        />
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>às</span>
                        <input
                          type="time"
                          value={newBlockEndTime}
                          onChange={e => setNewBlockEndTime(e.target.value)}
                          style={{ padding: '4px 6px', borderRadius: '5px', border: '1px solid #CBD5E1', fontSize: '0.76rem', fontWeight: 800, color: '#0F172A', background: '#FFFFFF', colorScheme: 'light' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>Duração:</span>
                        <select
                          value={newBlockDuration}
                          onChange={e => setNewBlockDuration(Number(e.target.value))}
                          style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #CBD5E1', fontSize: '0.76rem', fontWeight: 600 }}
                        >
                          {DURATION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Calendário Amplo do Período Selecionado */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '10px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}>
                    {blockPeriodDays.map(dateStr => {
                      const [y, m, d] = dateStr.split('-').map(Number);
                      const dateObj = new Date(y, m - 1, d);
                      const dayOfWeek = dateObj.getDay();
                      const weekdayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                      const dayMonth = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
                      const isDayEnabled = newBlockDays.includes(dayOfWeek);

                      return (
                        <div
                          key={dateStr}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: isDayEnabled ? '#FFFFFF' : 'var(--adm-bg-surface, #F8FAFC)',
                            border: isDayEnabled ? '1px solid #0284C7' : '1px dashed #CBD5E1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            // Alterna se o dia da semana faz parte do bloco
                            setNewBlockDays(prev => 
                              prev.includes(dayOfWeek) ? prev.filter(x => x !== dayOfWeek) : [...prev, dayOfWeek]
                            );
                          }}
                          title="Clique para ativar/desativar este dia da semana no bloco"
                        >
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isDayEnabled ? '#0284C7' : '#94A3B8' }}>
                            {weekdayName.toUpperCase()} • {dayMonth}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isDayEnabled ? '#15803D' : '#94A3B8' }}>
                            {isDayEnabled ? `${newBlockStartTime} - ${newBlockEndTime}` : 'Fechado'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lista dos Blocos Já Cadastrados */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--adm-border, #E2E8F0)',
                padding: '20px',
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  Blocos Cadastrados ({activeTypeBlockRules.length})
                </h4>

                {activeTypeBlockRules.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.80rem', color: '#94A3B8', fontStyle: 'italic' }}>
                    Nenhum bloco cadastrado.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeTypeBlockRules.map(b => (
                      <div
                        key={b.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: 'var(--adm-bg-surface, #F8FAFC)',
                          border: '1px solid var(--adm-border, #E2E8F0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>{b.title}</span>
                          <span style={{ fontSize: '0.76rem', color: '#64748B', marginLeft: '12px' }}>
                            {b.startDate.split('-').reverse().join('/')} até {b.endDate.split('-').reverse().join('/')}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBlockRule(b.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Remover Bloco"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 3: POR DATA ESPECÍFICA (BLOQUEIO DE FERIADOS E EXCEÇÕES)
              ═══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'override' && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid var(--adm-border, #E2E8F0)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={20} color="#EF4444" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                    Calendário de Datas Específicas e Bloqueios
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, minWidth: '150px', textAlign: 'center' }}>
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
              </div>

              {/* Grid Mensal dos Dias */}
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
          )}
        </div>

        {/* MODAL DE CONFIRMAÇÃO DE CONFLITO DE BLOQUEIO */}
        {conflictModalData && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1300,
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
    </div>
  );
};
