import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, Square, Calendar, Clock, 
  CheckCircle2, XCircle, Sparkles, ThumbsUp,
  Building2, UtensilsCrossed, ChevronLeft, ChevronRight, CalendarDays, Plus, History
} from 'lucide-react';
import type { AdminTask, Collaborator, Lead, Client, DebutanteAccount } from '../../../types/admin';
import { useAdminState } from '../../../context/AdminStateContext';
import { getTaskTypeTheme, renderTaskTypeIcon } from '../../../utils/taskColors';
import { agendaAvailabilityService } from '../../../services/agendaAvailabilityService';

interface AdminTasksTableViewProps {
  tasks: AdminTask[];
  allTasks?: AdminTask[];
  collaborators?: Collaborator[];
  leads?: Lead[];
  clients?: Client[];
  debutantes?: DebutanteAccount[];
  onOpenTask: (task: AdminTask) => void;
  onToggleStatus: (taskId: string) => void;
  onScheduleForDate?: (dateStr: string) => void;
  todayStr: string;
  workspaceContext?: string;
  visitsSubFilter?: 'all' | 'visit' | 'tasting';
}

interface DateGroup {
  key: string;
  title: string;
  subtitle: string;
  isOverdue: boolean;
  isToday: boolean;
  tasks: AdminTask[];
  availableTypes?: { visit: boolean; tasting: boolean };
  availableVenues?: Array<{ id: string; name: string; logoUrl?: string; hasVisit: boolean; hasTasting: boolean }>;
}

export const AdminTasksTableView: React.FC<AdminTasksTableViewProps> = ({
  tasks,
  allTasks = [],
  collaborators = [],
  leads: propsLeads,
  clients: propsClients,
  debutantes: propsDebutantes,
  onOpenTask,
  onToggleStatus,
  onScheduleForDate,
  todayStr,
  workspaceContext = 'all',
  visitsSubFilter = 'all',
}) => {
  const adminState = useAdminState();
  const leads = propsLeads || adminState?.leads || [];
  const clients = propsClients || adminState?.clients || [];
  const debutantes = propsDebutantes || adminState?.debutantes || [];
  const venueAgendaConfigs = adminState?.venueAgendaConfigs || [];
  const activeVenueId = adminState?.activeVenueId;

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const isVisitsContext = workspaceContext === 'visits_tastings';

  // ── Alternador de Período da Lista: 'week' (Semana) ou 'month' (Mês) ──
  const [listPeriodMode, setListPeriodMode] = useState<'week' | 'month'>('week');

  // ── Filtro de Histórico: por padrão false (apenas presente e futuro: date >= todayStr) ──
  const [showPastHistory, setShowPastHistory] = useState<boolean>(false);

  // ── Navegação Semanal: Domingo a Sábado ──
  const getSundayOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 é Domingo
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [currentWeekSunday, setCurrentWeekSunday] = useState<Date>(() => getSundayOfWeek(new Date()));

  const handlePrevWeek = () => {
    setCurrentWeekSunday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekSunday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleTodayWeek = () => {
    setCurrentWeekSunday(getSundayOfWeek(new Date()));
  };

  const weekInfo = useMemo(() => {
    const days: { dateStr: string; dateObj: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(currentWeekSunday);
      cur.setDate(currentWeekSunday.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${y}-${m}-${d}`,
        dateObj: cur,
      });
    }

    const first = days[0].dateObj;
    const last = days[6].dateObj;

    const firstFormatted = first.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const lastFormatted = last.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const label = `Semana de ${firstFormatted} a ${lastFormatted} (Dom a Sáb)`;

    const thisSundayStr = getSundayOfWeek(new Date()).toISOString().split('T')[0];
    const currentSundayStr = currentWeekSunday.toISOString().split('T')[0];
    const isCurrentWeek = thisSundayStr === currentSundayStr;

    return { days, label, isCurrentWeek };
  }, [currentWeekSunday]);

  // ── Navegação Mensal: 1º ao último dia do mês ──
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayMonth = () => {
    setCurrentMonthDate(new Date());
  };

  const handleSelectPeriodMode = (mode: 'week' | 'month') => {
    if (mode === 'month') {
      setCurrentMonthDate(new Date(currentWeekSunday.getFullYear(), currentWeekSunday.getMonth(), 1));
    }
    setListPeriodMode(mode);
  };

  const monthInfo = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    const days: { dateStr: string; dateObj: Date }[] = [];
    for (let day = 1; day <= totalDays; day++) {
      const cur = new Date(year, month, day);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${y}-${m}-${d}`,
        dateObj: cur,
      });
    }

    const monthFormatted = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const label = monthFormatted.charAt(0).toUpperCase() + monthFormatted.slice(1);

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

    return { days, label, isCurrentMonth };
  }, [currentMonthDate]);

  // Helper para verificar se uma data é de Bloco ou Data Única / Override aberto
  const isDateCoveredByBlockOrOpenOverride = (cfg: any, dateStr: string, filter: 'all' | 'visit' | 'tasting'): boolean => {
    if (!cfg) return false;

    // 1. Checa Override pontual de data (dateOverrides)
    const dateOverride = (cfg.dateOverrides || []).find((o: any) => o.date === dateStr);
    if (dateOverride) {
      if (dateOverride.isBlocked) return false;
      return true;
    }

    // 2. Checa Regras por Bloco de Período (blockRules)
    const blockRules = cfg.blockRules || [];
    const targetBlock = blockRules.find((b: any) => {
      if (!b.startDate || !b.endDate) return false;
      if (dateStr < b.startDate || dateStr > b.endDate) return false;
      if (filter === 'visit' && b.type !== 'visits' && b.type !== 'both') return false;
      if (filter === 'tasting' && b.type !== 'tastings' && b.type !== 'both') return false;
      return true;
    });

    if (targetBlock) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      if (targetBlock.enabledDays && !targetBlock.enabledDays.includes(dayOfWeek)) {
        return false;
      }
      if (targetBlock.daySchedules?.[dayOfWeek] && !targetBlock.daySchedules[dayOfWeek].enabled) {
        return false;
      }
      return true;
    }

    // Se não for bloco nem override, é modo recorrente ou livre -> não auto-aparece vazio
    return false;
  };

  // Format Time/Deadline for individual task row
  const formatDeadline = (task: AdminTask) => {
    if (!task.dueDate) return 'Sem prazo';
    const timePart = task.dueTime ? (task.endTime ? ` ${task.dueTime} - ${task.endTime}` : ` ${task.dueTime}`) : '';
    if (task.dueDate === todayStr) {
      return `Hoje${timePart || ' 23:59'}`;
    }
    if (task.dueDate === tomorrowStr) {
      return `Amanhã${timePart || ' 23:59'}`;
    }
    const parts = task.dueDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}${timePart}`;
    }
    return `${task.dueDate}${timePart}`;
  };

  // Group tasks strictly by date (single header per calendar date)
  const groupedTasks = useMemo(() => {
    const groupMap = new Map<string, AdminTask[]>();

    const targetVenueId = activeVenueId !== 'all' && activeVenueId ? activeVenueId : (adminState?.venues?.[0]?.id || 'all');
    const venueConfig = venueAgendaConfigs.find(c => c.venueId === targetVenueId);

    // Dias do período ativo (Semana ou Mês)
    const activeDays = listPeriodMode === 'week' ? weekInfo.days : monthInfo.days;
    const activeDateSet = new Set(activeDays.map(d => d.dateStr));

    // 1. Agrupa tarefas que pertencem ao período ativo
    tasks.forEach(task => {
      const key = task.dueDate || 'no_date';

      if (key !== 'no_date') {
        // Se estiver fora do período ativo (semana ou mês), ignora
        if (!activeDateSet.has(key)) return;

        // Se histórico estiver desligado e a data for do passado, ignora
        if (!showPastHistory && key < todayStr) return;
      } else {
        // Se for sem data: em visitas/degustações geralmente não há sem data, mas se houver só se histórico ou fora de visitas
        if (isVisitsContext) return;
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(task);
    });

    // 2. Se estiver em Visitas & Degustações:
    //    - Se for BLOCO ou DATA ÚNICA / OVERRIDE ABERTO: auto-aparece na lista mesmo sem agendamentos
    //    - Se for LIVRE ou RECORRENTE: NÃO insere datas vazias (fica limpo/branco como follow-up)
    //    - O que estiver indisponível NÃO aparece
    if (isVisitsContext) {
      const configsToInspect = (activeVenueId && activeVenueId !== 'all')
        ? venueAgendaConfigs.filter(c => c.venueId === activeVenueId)
        : (venueAgendaConfigs.length > 0 ? venueAgendaConfigs : (adminState?.venues || []).map(v => agendaAvailabilityService.getDefaultConfig(v.id)));

      activeDays.forEach(d => {
        const dateStr = d.dateStr;

        // Se histórico estiver desligado e data for passada, nunca auto-aparece
        if (!showPastHistory && dateStr < todayStr) return;
        // Se a data for passada (mesmo com histórico ativo), dias passados VAZIOS nunca devem aparecer
        if (dateStr < todayStr) return;

        // Se já tem tarefas agendadas, já está no groupMap
        if (groupMap.has(dateStr)) return;

        // Checa se algum bloco ou override aberto cobre esta data
        const hasOpenBlockOrOverride = configsToInspect.some(cfg => {
          if (!isDateCoveredByBlockOrOpenOverride(cfg, dateStr, visitsSubFilter)) return false;

          // Valida se está com disponibilidade aberta
          if (visitsSubFilter === 'visit') {
            return agendaAvailabilityService.checkDayAvailability(cfg, dateStr, 'visit');
          }
          if (visitsSubFilter === 'tasting') {
            return agendaAvailabilityService.checkDayAvailability(cfg, dateStr, 'tasting');
          }
          return agendaAvailabilityService.checkDayAvailability(cfg, dateStr, 'visit') ||
                 agendaAvailabilityService.checkDayAvailability(cfg, dateStr, 'tasting');
        });

        if (hasOpenBlockOrOverride) {
          // Auto-aparece no modo lista mesmo sem agendamentos!
          groupMap.set(dateStr, []);
        }
      });
    }

    const groups: DateGroup[] = [];

    // Sort keys chronologically
    const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => {
      if (a === 'no_date') return 1;
      if (b === 'no_date') return -1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      const groupItems = groupMap.get(key) || [];
      if (key === 'no_date') {
        groups.push({
          key,
          title: 'Sem Data Prevista',
          subtitle: 'Tarefas sem prazo definido',
          isOverdue: false,
          isToday: false,
          tasks: groupItems,
        });
        return;
      }

      const isOverdue = key < todayStr;
      const isToday = key === todayStr;
      const isTomorrow = key === tomorrowStr;

      let availableTypes: { visit: boolean; tasting: boolean } | undefined = undefined;
      let availableVenues: Array<{ id: string; name: string; logoUrl?: string; hasVisit: boolean; hasTasting: boolean }> | undefined = undefined;

      if (isVisitsContext) {
        if (activeVenueId && activeVenueId !== 'all') {
          if (venueConfig) {
            availableTypes = {
              visit: agendaAvailabilityService.checkDayAvailability(venueConfig, key, 'visit'),
              tasting: agendaAvailabilityService.checkDayAvailability(venueConfig, key, 'tasting'),
            };
          }
        } else {
          availableVenues = (adminState?.venues || []).map(v => {
            const vConfig = venueAgendaConfigs.find(c => c.venueId === v.id) || agendaAvailabilityService.getDefaultConfig(v.id);
            const hasVisit = agendaAvailabilityService.checkDayAvailability(vConfig, key, 'visit');
            const hasTasting = agendaAvailabilityService.checkDayAvailability(vConfig, key, 'tasting');
            return {
              id: v.id,
              name: v.name,
              logoUrl: v.logoUrl,
              hasVisit,
              hasTasting,
            };
          }).filter(v => v.hasVisit || v.hasTasting);
        }
      }

      try {
        const [y, m, d] = key.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
        const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

        let title = dayMonth;
        if (isToday) {
          title = `Hoje • ${dayMonth}`;
        } else if (isTomorrow) {
          title = `Amanhã • ${dayMonth}`;
        }

        groups.push({
          key,
          title,
          subtitle: capitalizedWeekday,
          isOverdue,
          isToday,
          tasks: groupItems,
          availableTypes,
          availableVenues,
        });
      } catch {
        groups.push({
          key,
          title: key,
          subtitle: '',
          isOverdue,
          isToday,
          tasks: groupItems,
          availableTypes,
        });
      }
    });

    return groups;
  }, [
    tasks, todayStr, tomorrowStr, isVisitsContext, activeVenueId, 
    venueAgendaConfigs, adminState?.venues, listPeriodMode, 
    weekInfo, monthInfo, showPastHistory, visitsSubFilter
  ]);

  // Helper for Visitas & Degustações: Calculate Notification 1 & 2 + Presence metric
  const getVisitNotificationData = (parentTask: AdminTask) => {
    const parentId = parentTask.id;
    const leadId = parentTask.leadId;

    // Search for Notification 1
    const notif1 = allTasks.find(t => {
      if (t.customProperties?.parentTaskId === parentId && t.customProperties?.notificationNumber === 1) return true;
      if (t.leadId && t.leadId === leadId && (t.title.toLowerCase().includes('notificar sobre') || t.title.toLowerCase().includes('lembrete: notificar'))) return true;
      return false;
    });

    // Search for Notification 2
    const notif2 = allTasks.find(t => {
      if (t.customProperties?.parentTaskId === parentId && t.customProperties?.notificationNumber === 2) return true;
      if (t.leadId && t.leadId === leadId && (t.title.toLowerCase().includes('confirmar presença') || t.title.toLowerCase().includes('confirmação 24h'))) return true;
      return false;
    });

    const evaluateNotification = (notif?: AdminTask) => {
      if (!notif) return { status: 'not_created', label: 'Pendente', isPositive: false };
      if (notif.status !== 'completed') {
        return { status: 'pending', label: 'Pendente', isPositive: false };
      }
      const resText = `${notif.resolution || ''} ${notif.observations || ''}`.toLowerCase();
      const isNegative = resText.includes('cancelad') || resText.includes('não') || resText.includes('desmarc') || resText.includes('ausente') || resText.includes('negativ');
      if (isNegative) {
        return { status: 'negative', label: 'Não Confirmado', isPositive: false };
      }
      return { status: 'positive', label: 'Confirmado', isPositive: true };
    };

    const eval1 = evaluateNotification(notif1);
    const eval2 = evaluateNotification(notif2);

    let positiveCount = 0;
    if (eval1.isPositive) positiveCount++;
    if (eval2.isPositive) positiveCount++;

    let presenceStatus: { label: string; bg: string; text: string; border: string; icon: React.ReactNode };

    if (positiveCount === 2) {
      presenceStatus = {
        label: 'Mais que Confirmado (100%)',
        bg: '#ECFDF5',
        text: '#047857',
        border: '#A7F3D0',
        icon: <Sparkles size={13} style={{ color: '#059669' }} />,
      };
    } else if (positiveCount === 1) {
      presenceStatus = {
        label: 'Cliente Confirmado (50%)',
        bg: '#EFF6FF',
        text: '#1D4ED8',
        border: '#BFDBFE',
        icon: <ThumbsUp size={13} style={{ color: '#2563EB' }} />,
      };
    } else {
      presenceStatus = {
        label: 'Não Confirmado (0%)',
        bg: 'var(--adm-bg-surface, #F8FAFC)',
        text: 'var(--adm-text-muted, #64748B)',
        border: 'var(--adm-border, #E2E8F0)',
        icon: <Clock size={13} style={{ color: 'var(--adm-text-muted, #94A3B8)' }} />,
      };
    }

    return {
      eval1,
      eval2,
      positiveCount,
      presenceStatus,
    };
  };

  const totalColumns = isVisitsContext ? 8 : 6;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      padding: '16px 24px',
      gap: '14px',
      boxSizing: 'border-box',
    }}>
      {/* BARRA SUPERIOR DE NAVEGAÇÃO (Semana vs Mês, Navegação Temporal e Histórico) */}
      <div style={{
        padding: '10px 16px',
        borderRadius: '12px',
        border: '1px solid var(--adm-border, #E2E8F0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--adm-bg-card, #FFFFFF)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        flexShrink: 0,
      }}>
        {/* Esquerda: Alternador de Visualização [ Semana | Mês ] */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--adm-bg-surface, #F1F5F9)',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid var(--adm-border, #E2E8F0)',
        }}>
          <button
            type="button"
            onClick={() => handleSelectPeriodMode('week')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: listPeriodMode === 'week' ? '1px solid var(--adm-border, #CBD5E1)' : '1px solid transparent',
              background: listPeriodMode === 'week' ? 'var(--adm-bg-card, #FFFFFF)' : 'transparent',
              color: listPeriodMode === 'week' ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-muted, #64748B)',
              fontWeight: 700,
              fontSize: '0.74rem',
              cursor: 'pointer',
              boxShadow: listPeriodMode === 'week' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Visualizar lista organizada por semana"
          >
            <CalendarDays size={14} />
            <span>Semana</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPeriodMode('month')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: listPeriodMode === 'month' ? '1px solid var(--adm-border, #CBD5E1)' : '1px solid transparent',
              background: listPeriodMode === 'month' ? 'var(--adm-bg-card, #FFFFFF)' : 'transparent',
              color: listPeriodMode === 'month' ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-muted, #64748B)',
              fontWeight: 700,
              fontSize: '0.74rem',
              cursor: 'pointer',
              boxShadow: listPeriodMode === 'month' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Visualizar lista organizada por mês"
          >
            <Calendar size={14} />
            <span>Mês</span>
          </button>
        </div>

        {/* Centro: Navegação Temporal (Semana Anterior / Próxima ou Mês Anterior / Próximo) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          {/* Botão Anterior */}
          <button
            type="button"
            onClick={listPeriodMode === 'week' ? handlePrevWeek : handlePrevMonth}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--adm-bg-surface, #F8FAFC)',
              border: '1px solid var(--adm-border, #CBD5E1)',
              color: 'var(--adm-text-title, #334155)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title={listPeriodMode === 'week' ? 'Semana anterior' : 'Mês anterior'}
          >
            <ChevronLeft size={16} />
            <span>{listPeriodMode === 'week' ? 'Semana Anterior' : 'Mês Anterior'}</span>
          </button>

          {/* Rótulo Central Clicável */}
          <div
            onClick={
              listPeriodMode === 'week'
                ? (!weekInfo.isCurrentWeek ? handleTodayWeek : undefined)
                : (!monthInfo.isCurrentMonth ? handleTodayMonth : undefined)
            }
            title={
              listPeriodMode === 'week'
                ? (!weekInfo.isCurrentWeek ? 'Clique para voltar para a Semana Atual' : undefined)
                : (!monthInfo.isCurrentMonth ? 'Clique para voltar para o Mês Atual' : undefined)
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: (listPeriodMode === 'week' ? !weekInfo.isCurrentWeek : !monthInfo.isCurrentMonth) ? 'pointer' : 'default',
              padding: '5px 12px',
              borderRadius: '8px',
              background: (listPeriodMode === 'week' ? !weekInfo.isCurrentWeek : !monthInfo.isCurrentMonth) ? 'rgba(2, 132, 199, 0.06)' : 'transparent',
              transition: 'all 0.15s ease',
            }}
          >
            {listPeriodMode === 'week' ? (
              <CalendarDays size={17} style={{ color: 'var(--adm-accent, #0284C7)' }} />
            ) : (
              <Calendar size={17} style={{ color: 'var(--adm-accent, #0284C7)' }} />
            )}

            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
              {listPeriodMode === 'week' ? weekInfo.label : monthInfo.label}
            </span>

            {listPeriodMode === 'week' ? (
              weekInfo.isCurrentWeek ? (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: 'rgba(2,132,199,0.12)',
                  color: '#0284C7',
                  border: '1px solid rgba(2,132,199,0.25)',
                }}>
                  Semana Atual
                </span>
              ) : (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: 'var(--adm-accent, #0284C7)',
                  color: '#FFFFFF',
                }}>
                  Voltar para Hoje
                </span>
              )
            ) : (
              monthInfo.isCurrentMonth ? (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: 'rgba(2,132,199,0.12)',
                  color: '#0284C7',
                  border: '1px solid rgba(2,132,199,0.25)',
                }}>
                  Mês Atual
                </span>
              ) : (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: 'var(--adm-accent, #0284C7)',
                  color: '#FFFFFF',
                }}>
                  Voltar para Este Mês
                </span>
              )
            )}
          </div>

          {/* Botão Próximo */}
          <button
            type="button"
            onClick={listPeriodMode === 'week' ? handleNextWeek : handleNextMonth}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--adm-bg-surface, #F8FAFC)',
              border: '1px solid var(--adm-border, #CBD5E1)',
              color: 'var(--adm-text-title, #334155)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title={listPeriodMode === 'week' ? 'Próxima semana' : 'Próximo mês'}
          >
            <span>{listPeriodMode === 'week' ? 'Próxima Semana' : 'Próximo Mês'}</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Direita: Filtro de Histórico (Presente -> Futuro vs Passado) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowPastHistory(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: showPastHistory ? 'rgba(2, 132, 199, 0.12)' : 'var(--adm-bg-surface, #F8FAFC)',
              border: showPastHistory ? '1.5px solid var(--adm-accent, #0284C7)' : '1px solid var(--adm-border, #CBD5E1)',
              color: showPastHistory ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-title, #334155)',
              fontSize: '0.74rem',
              fontWeight: showPastHistory ? 800 : 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: showPastHistory ? '0 1px 4px rgba(2, 132, 199, 0.2)' : 'none',
            }}
            title={showPastHistory ? 'Ocultar datas e compromissos passados (focar no presente e futuro)' : 'Exibir histórico de datas e compromissos passados'}
          >
            <History size={14} style={{ color: showPastHistory ? '#0284C7' : 'inherit' }} />
            <span>Histórico</span>
            {showPastHistory ? (
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                background: '#0284C7',
                color: '#FFFFFF',
                padding: '1px 5px',
                borderRadius: '6px',
              }}>
                Ativo
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* ÁREA DA TABELA */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--adm-bg-card, #FFFFFF)',
        borderRadius: '14px',
        border: '1px solid var(--adm-border, #E2E8F0)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.80rem',
          }}>
            {/* Table Body Grouped by Date */}
            <tbody style={{ color: '#334155' }}>
              {groupedTasks.length === 0 ? (
                <tr>
                  <td colSpan={totalColumns} style={{ padding: '60px 16px', textAlign: 'center' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(2, 132, 199, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--adm-accent, #0284C7)',
                        marginBottom: '4px',
                      }}>
                        {listPeriodMode === 'week' ? <CalendarDays size={22} /> : <Calendar size={22} />}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--adm-text-title, #1E293B)' }}>
                        Nenhum agendamento para {listPeriodMode === 'week' ? 'esta semana' : 'este mês'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted, #64748B)', maxWidth: '440px', lineHeight: 1.4 }}>
                        {!showPastHistory 
                          ? 'Modo padrão (presente e futuro). Compromissos passados estão ocultos. Para visualizá-los, clique no botão "Histórico".'
                          : 'Nenhum agendamento ou bloco de atendimento aberto encontrado no período selecionado.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedTasks.map((group) => {
                  const isUnavailable = (() => {
                    if (!isVisitsContext || !group.availableTypes || group.key === 'no_date') return false;
                    if (visitsSubFilter === 'visit') return !group.availableTypes.visit;
                    if (visitsSubFilter === 'tasting') return !group.availableTypes.tasting;
                    return !group.availableTypes.visit && !group.availableTypes.tasting;
                  })();

                  const hasNoTasks = group.tasks.length === 0;
                  const isDimmed = isUnavailable || hasNoTasks;

                  return (
                    <React.Fragment key={group.key}>
                      {/* 1. Linha do Dia (Data Centralizada + Tags Suaves + Botão [+] Simples) */}
                      <tr 
                        style={{
                          background: isDimmed 
                            ? 'var(--adm-bg-surface-subtle, rgba(255,255,255,0.02))'
                            : (group.isToday ? 'rgba(2, 132, 199, 0.10)' : 'var(--adm-bg-surface, #F8FAFC)'),
                          borderTop: '1px solid var(--adm-border, #E2E8F0)',
                          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
                          opacity: isDimmed ? 0.72 : 1,
                        }}
                      >
                        <td 
                          colSpan={totalColumns} 
                          style={{ 
                            padding: '8px 16px',
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexWrap: 'wrap', 
                            gap: '12px',
                            width: '100%',
                          }}>
                            {/* Data Centralizada */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <Calendar size={14} style={{ color: isDimmed ? 'var(--adm-text-muted, #94A3B8)' : (group.isToday ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-muted, #64748B)') }} />
                              <span style={{
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                color: isDimmed ? 'var(--adm-text-muted, #64748B)' : (group.isToday ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-title, #1E293B)'),
                                letterSpacing: '-0.2px',
                              }}>
                                {group.title}
                              </span>
                              {group.subtitle && (
                                <span style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  color: isDimmed ? 'var(--adm-text-muted, #94A3B8)' : (group.isToday ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-muted, #64748B)'),
                                }}>
                                  • {group.subtitle}
                                </span>
                              )}
                            </div>

                            {/* Tags de Disponibilidade mais Fracas / Suaves */}
                            
                            {/* Visualização Aberta (Todas as Casas): Símbolos das Casas com Disponibilidade */}
                            {isVisitsContext && (activeVenueId === 'all' || !activeVenueId) && group.availableVenues && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {group.availableVenues.length === 0 ? (
                                  <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted, #94A3B8)', fontStyle: 'italic' }}>
                                    Sem disponibilidade cadastrada
                                  </span>
                                ) : (
                                  group.availableVenues.map(av => (
                                    <div
                                      key={av.id}
                                      onClick={() => adminState?.setActiveVenueId?.(av.id)}
                                      title={`${av.name}: Disponibilidade aberta (Clique para filtrar esta casa)`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '2px 8px 2px 4px',
                                        borderRadius: '6px',
                                        background: 'rgba(2, 132, 199, 0.08)',
                                        border: '1px solid rgba(2, 132, 199, 0.25)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      {av.logoUrl ? (
                                        <img
                                          src={av.logoUrl}
                                          alt={av.name}
                                          style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            objectFit: 'contain',
                                            background: '#ffffff',
                                            padding: '1px',
                                          }}
                                        />
                                      ) : (
                                        <Building2 size={12} color="#0284C7" />
                                      )}
                                      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-text-title, #1E293B)' }}>
                                        {av.name}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {group.availableTypes && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {visitsSubFilter === 'visit' && (
                                  group.availableTypes.visit ? (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      background: 'rgba(16, 185, 129, 0.08)',
                                      color: '#059669',
                                      border: '1px solid rgba(16, 185, 129, 0.15)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      <Building2 size={11} />
                                      Visita Disponível
                                    </span>
                                  ) : (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      background: 'rgba(148, 163, 184, 0.10)',
                                      color: '#94A3B8',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      Sem vagas de Visita
                                    </span>
                                  )
                                )}

                                {visitsSubFilter === 'tasting' && (
                                  group.availableTypes.tasting ? (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      background: 'rgba(217, 119, 6, 0.08)',
                                      color: '#B45309',
                                      border: '1px solid rgba(217, 119, 6, 0.15)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      <UtensilsCrossed size={11} />
                                      Degustação Disponível
                                    </span>
                                  ) : (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      background: 'rgba(148, 163, 184, 0.10)',
                                      color: '#94A3B8',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      Sem vagas de Degustação
                                    </span>
                                  )
                                )}

                                {visitsSubFilter === 'all' && (
                                  <>
                                    {group.availableTypes.visit && (
                                      <span style={{
                                        fontSize: '0.66rem',
                                        fontWeight: 600,
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        background: 'rgba(16, 185, 129, 0.08)',
                                        color: '#059669',
                                        border: '1px solid rgba(16, 185, 129, 0.15)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}>
                                        <Building2 size={11} />
                                        Visita
                                      </span>
                                    )}
                                    {group.availableTypes.tasting && (
                                      <span style={{
                                        fontSize: '0.66rem',
                                        fontWeight: 600,
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        background: 'rgba(217, 119, 6, 0.08)',
                                        color: '#B45309',
                                        border: '1px solid rgba(217, 119, 6, 0.15)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}>
                                        <UtensilsCrossed size={11} />
                                        Degustação
                                      </span>
                                    )}
                                    {!group.availableTypes.visit && !group.availableTypes.tasting && (
                                      <span style={{
                                        fontSize: '0.66rem',
                                        fontWeight: 600,
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        background: 'rgba(148, 163, 184, 0.10)',
                                        color: '#94A3B8',
                                      }}>
                                        Sem atendimento
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            {/* Botão simples [+] de agendar para este dia */}
                            {isVisitsContext && onScheduleForDate && group.key !== 'no_date' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onScheduleForDate(group.key);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: 'var(--adm-bg-surface, #F8FAFC)',
                                  border: '1px solid var(--adm-border, #CBD5E1)',
                                  color: 'var(--adm-text-title, #334155)',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  transition: 'all 0.15s ease',
                                }}
                                title={`Novo agendamento para ${group.title}`}
                              >
                                <Plus size={14} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* 2. Sub-cabeçalho das Colunas (Variáveis) dentro de cada Data */}
                      <tr style={{
                        background: 'var(--adm-bg-card, #FFFFFF)',
                        borderBottom: '1px solid var(--adm-border, #E2E8F0)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: isDimmed ? 'var(--adm-text-muted, #94A3B8)' : 'var(--adm-text-muted, #64748B)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        opacity: isDimmed ? 0.72 : 1,
                      }}>
                        {isVisitsContext ? (
                          <>
                            <th style={{ padding: '8px 14px', width: '40px', textAlign: 'center' }}>
                              <span className="sr-only">Status</span>
                            </th>
                            <th style={{ padding: '8px 16px', minWidth: '130px' }}>HORÁRIO / PRAZO</th>
                            <th style={{ padding: '8px 16px', minWidth: '160px' }}>RESPONSÁVEIS</th>
                            <th style={{ padding: '8px 16px', minWidth: '220px' }}>FAMÍLIA & EVENTO</th>
                            <th style={{ padding: '8px 14px', minWidth: '120px' }}>TIPO</th>
                            <th style={{ padding: '8px 14px', minWidth: '140px' }}>CONFIRMAÇÃO 1</th>
                            <th style={{ padding: '8px 14px', minWidth: '140px' }}>CONFIRMAÇÃO 2</th>
                            <th style={{ padding: '8px 16px', minWidth: '180px' }}>CONFIRMAÇÃO PRESENÇA</th>
                          </>
                        ) : (
                          <>
                            <th style={{ padding: '8px 14px', width: '40px', textAlign: 'center' }}>
                              <span className="sr-only">Status</span>
                            </th>
                            <th style={{ padding: '8px 16px', minWidth: '140px' }}>PRAZO</th>
                            <th style={{ padding: '8px 16px', minWidth: '160px' }}>USUÁRIO RESPONSÁVEL</th>
                            <th style={{ padding: '8px 16px', minWidth: '240px' }}>OBJETO / TAREFA</th>
                            <th style={{ padding: '8px 16px', minWidth: '150px' }}>TIPO DE TAREFA</th>
                            <th style={{ padding: '8px 16px', minWidth: '200px' }}>RESULTADO / RESOLUÇÃO</th>
                          </>
                        )}
                      </tr>

                      {/* 3. Linha para dia vazio: informativo limpo */}
                      {group.tasks.length === 0 && (
                        <tr 
                          style={{ background: 'transparent', borderBottom: '1px solid var(--adm-border, #E2E8F0)' }}
                        >
                          <td colSpan={totalColumns} style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.74rem', color: isUnavailable ? 'var(--adm-text-muted, #94A3B8)' : 'var(--adm-accent, #0284C7)', fontStyle: 'italic', fontWeight: isUnavailable ? 400 : 600 }}>
                              {isUnavailable 
                                ? `Data indisponível para ${visitsSubFilter === 'visit' ? 'visitas comerciais' : (visitsSubFilter === 'tasting' ? 'degustações' : 'visitas ou degustações')}`
                                : 'Bloco de atendimento disponível • Nenhum cliente agendado ainda'}
                            </span>
                          </td>
                        </tr>
                      )}

                  {/* Tasks in this Date Group */}
                  {group.tasks.map((task, idx) => {
                    const isCancelledDueToBlock = Boolean(task.customProperties?.cancelledDueToBlock || task.status === 'cancelled');
                    const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== 'completed';
                    const isCompleted = task.status === 'completed';
                    const theme = getTaskTypeTheme(task);
                    // Resolve linked entity names (Lead, Client, Debutante)
                    const resolvedLeadName = task.leadName || (task.leadId ? leads.find(l => l.id === task.leadId)?.name : null);
                    const resolvedClientName = task.clientName || (task.clientId ? (clients.find(c => c.id === task.clientId)?.birthdayPersonName || clients.find(c => c.id === task.clientId)?.name) : null);
                    const resolvedDebutanteName = task.debutanteName || (task.debutanteId ? debutantes.find(d => d.id === task.debutanteId)?.name : null);
                    const leadOrTargetName = resolvedLeadName || resolvedClientName || resolvedDebutanteName || (task.customProperties?.company ? `${task.title}, ${task.customProperties.company}` : null);
                    
                    // Specific calculations for Visitas & Degustações
                    const visitData = isVisitsContext ? getVisitNotificationData(task) : null;

                    // Resolve Responsável and SDR for avatar display
                    const assignedCollab = collaborators.find(c => (task.assignedToIds || []).includes(c.id));
                    const assignedName = assignedCollab?.name || task.createdByName || 'Responsável';
                    const assignedAvatar = assignedCollab?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedName)}&background=3B82F6&color=FFFFFF`;

                    const sdrCollab = collaborators.find(c => c.id === task.customProperties?.sdrAssigneeId);
                    const sdrName = sdrCollab?.name || task.customProperties?.sdrName || 'SDR';
                    const sdrAvatar = sdrCollab?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(sdrName)}&background=D97706&color=FFFFFF`;

                    // Dynamic row background based on presence in Visitas & Degustações
                    let rowBg = isCancelledDueToBlock 
                      ? 'rgba(239, 68, 68, 0.08)' 
                      : (idx % 2 === 0 ? 'var(--adm-bg-card, #FFFFFF)' : 'var(--adm-bg-surface, #FAFAFA)');
                    let rowHoverBg = isCancelledDueToBlock ? 'rgba(239, 68, 68, 0.14)' : 'var(--adm-bg-card-hover, #F0F9FF)';

                    if (isVisitsContext && visitData && !isCancelledDueToBlock) {
                      if (visitData.positiveCount === 2) {
                        rowBg = 'rgba(16, 185, 129, 0.12)';
                        rowHoverBg = 'rgba(16, 185, 129, 0.2)';
                      } else if (visitData.positiveCount === 1) {
                        rowBg = 'rgba(2, 132, 199, 0.12)';
                        rowHoverBg = 'rgba(2, 132, 199, 0.2)';
                      } else {
                        rowBg = idx % 2 === 0 ? 'var(--adm-bg-card, #FFFFFF)' : 'var(--adm-bg-surface, #FAFAFA)';
                        rowHoverBg = 'var(--adm-bg-card-hover, #F1F5F9)';
                      }
                    }

                    if (isCompleted) {
                      rowBg = 'var(--adm-bg-surface, #F8FAFC)';
                    }

                    return (
                      <tr
                        key={task.id}
                        onClick={() => onOpenTask(task)}
                        style={{
                          borderBottom: '1px solid var(--adm-border, #F1F5F9)',
                          background: rowBg,
                          cursor: 'pointer',
                          transition: 'background 0.12s ease',
                          opacity: isCompleted ? 0.75 : 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = rowHoverBg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = rowBg;
                        }}
                      >
                        {/* Checkbox Column */}
                        <td 
                          style={{ padding: '12px 14px', textAlign: 'center' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(task.id);
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isCompleted ? '#059669' : '#CBD5E1',
                            }}
                            title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                          >
                            {isCompleted ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>

                        {/* Prazo / Horário */}
                        <td style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: isOverdue ? '#EF4444' : isCompleted ? 'var(--adm-text-muted, #94A3B8)' : 'var(--adm-text-title, #0F172A)',
                          whiteSpace: 'nowrap',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isOverdue && (
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                            )}
                            <span>{task.dueTime ? `${task.dueTime}${task.endTime ? ` - ${task.endTime}` : ''}` : formatDeadline(task)}</span>
                          </div>
                        </td>

                        {/* Usuário Responsável / SDR (Avatars in Visitas Context) */}
                        {isVisitsContext ? (
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {/* Responsável pelo Atendimento */}
                              <div 
                                title={`Responsável: ${assignedName}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <img
                                  src={assignedAvatar}
                                  alt={assignedName}
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1.5px solid #3B82F6',
                                  }}
                                />
                                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--adm-text-title, #334155)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {assignedName.split(' ')[0]}
                                </span>
                              </div>

                              {/* SDR Notificador */}
                              {task.customProperties?.sdrAssigneeId && (
                                <div 
                                  title={`SDR Notificador: ${sdrName}`}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <img
                                    src={sdrAvatar}
                                    alt={sdrName}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '1.5px solid #D97706',
                                    }}
                                  />
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D97706', background: 'rgba(217, 119, 6, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                                    SDR
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        ) : (
                          <td style={{ padding: '12px 16px', color: 'var(--adm-text-title, #475569)', fontWeight: 600 }}>
                            {assignedName}
                          </td>
                        )}

                        {/* Objeto / Tarefa / Família */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', fontSize: '0.82rem', lineHeight: 1.3, textDecoration: isCompleted ? 'line-through' : 'none' }}>
                            {task.title}
                          </div>
                          {leadOrTargetName && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #64748B)', marginTop: '2px', fontWeight: 500 }}>
                              {leadOrTargetName}
                            </div>
                          )}
                        </td>

                        {/* Tipo de Tarefa */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: theme.badgeBg,
                            border: `1px solid ${theme.badgeBorder}`,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: theme.badgeText,
                            whiteSpace: 'nowrap',
                          }}>
                            {renderTaskTypeIcon(theme.category, 12, theme.primaryColor)}
                            <span>{theme.label}</span>
                          </span>
                        </td>

                        {/* VISITAS & DEGUSTAÇÕES SPECIFIC COLUMNS */}
                        {isVisitsContext && visitData && (
                          <>
                            {/* Confirmação 1 */}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                background: visitData.eval1.status === 'positive' ? '#ECFDF5' : visitData.eval1.status === 'negative' ? '#FEF2F2' : '#FFFBEB',
                                color: visitData.eval1.status === 'positive' ? '#047857' : visitData.eval1.status === 'negative' ? '#B91C1C' : '#B45309',
                                border: `1px solid ${visitData.eval1.status === 'positive' ? '#A7F3D0' : visitData.eval1.status === 'negative' ? '#FECACA' : '#FDE68A'}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {visitData.eval1.status === 'positive' && <CheckCircle2 size={12} />}
                                {visitData.eval1.status === 'negative' && <XCircle size={12} />}
                                {visitData.eval1.status === 'pending' && <Clock size={12} />}
                                <span>{visitData.eval1.label}</span>
                              </span>
                            </td>

                            {/* Confirmação 2 */}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                background: visitData.eval2.status === 'positive' ? '#ECFDF5' : visitData.eval2.status === 'negative' ? '#FEF2F2' : '#FFFBEB',
                                color: visitData.eval2.status === 'positive' ? '#047857' : visitData.eval2.status === 'negative' ? '#B91C1C' : '#B45309',
                                border: `1px solid ${visitData.eval2.status === 'positive' ? '#A7F3D0' : visitData.eval2.status === 'negative' ? '#FECACA' : '#FDE68A'}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {visitData.eval2.status === 'positive' && <CheckCircle2 size={12} />}
                                {visitData.eval2.status === 'negative' && <XCircle size={12} />}
                                {visitData.eval2.status === 'pending' && <Clock size={12} />}
                                <span>{visitData.eval2.label}</span>
                              </span>
                            </td>

                            {/* Confirmação de Presença */}
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 9px',
                                borderRadius: '7px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                background: visitData.presenceStatus.bg,
                                color: visitData.presenceStatus.text,
                                border: `1px solid ${visitData.presenceStatus.border}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {visitData.presenceStatus.icon}
                                <span>{visitData.presenceStatus.label}</span>
                              </span>
                            </td>
                          </>
                        )}

                        {/* Resultado / Resolução (apenas para outros contextos) */}
                        {!isVisitsContext && (
                          <td style={{
                            padding: '12px 16px',
                            color: task.resolution ? 'var(--adm-text-title, #0F172A)' : 'var(--adm-text-muted, #94A3B8)',
                            fontStyle: task.resolution ? 'normal' : 'italic',
                            maxWidth: '280px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {task.resolution || 'Sem resolução registrada'}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                </React.Fragment>
              );
            })
          )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
};
