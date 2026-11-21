import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MonthYearSwitcher } from '../../ui';
import type { AdminTask } from '../../../types/admin';
import { getTaskTypeTheme, renderTaskTypeIcon } from '../../../utils/taskColors';
import { toLocalDateStr, getTodayLocalStr } from '../../../utils/dateUtils';

interface AdminCalendarDayViewProps {
  tasks: AdminTask[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onOpenTask: (task: AdminTask) => void;
  onNewTaskForDate?: (dateStr: string, timeStr?: string) => void;
  onUpdateTask?: (id: string, data: Partial<AdminTask>) => void;
  /** Janela de horas exibida (padrao 07-23). Agenda de eventos usa 0-23 (dia inteiro) */
  startHour?: number;
  endHour?: number;
  getTaskAccent?: (task: AdminTask) => { color: string; label: string } | null;
}

export const AdminCalendarDayView: React.FC<AdminCalendarDayViewProps> = ({
  tasks,
  currentDate,
  onDateChange,
  onOpenTask,
  onNewTaskForDate,
  onUpdateTask,
  startHour = 7,
  endHour = 23,
  getTaskAccent,
}) => {
  const dateStr = useMemo(() => {
    return toLocalDateStr(currentDate);
  }, [currentDate]);

  const todayStr = useMemo(() => {
    return getTodayLocalStr();
  }, []);

  const isToday = dateStr === todayStr;

  // Formatted date label, e.g. "Segunda-feira, 23 Ago. 2026"
  const formattedHeaderDate = useMemo(() => {
    const weekday = currentDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = currentDate.getDate();
    const month = currentDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = currentDate.getFullYear();
    return `${capitalizedWeekday}, ${day} ${capitalizedMonth}. ${year}`;
  }, [currentDate]);

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Filter tasks for this day
  const dayTasks = useMemo(() => {
    return tasks.filter(t => t.dueDate === dateStr);
  }, [tasks, dateStr]);

  const allDayTasks = useMemo(() => {
    return dayTasks.filter(t => !t.dueTime);
  }, [dayTasks]);

  const timedTasks = useMemo(() => {
    return dayTasks.filter(t => Boolean(t.dueTime));
  }, [dayTasks]);

  // Hours: 07:00 to 23:00 (17 slots)
  const START_HOUR = startHour;
  const END_HOUR = endHour;
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      arr.push(h);
    }
    return arr;
  }, []);

  const HOUR_HEIGHT = 68; // px per hour (34px per 30min interval)

  // Current time position for real-time blue indicator line
  const [currentMinutesFromStart, setCurrentMinutesFromStart] = useState<number | null>(null);

  useEffect(() => {
    const updateTimeLine = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (h >= START_HOUR && h <= END_HOUR) {
        const totalMinutes = (h - START_HOUR) * 60 + m;
        setCurrentMinutesFromStart(totalMinutes);
      } else {
        setCurrentMinutesFromStart(null);
      }
    };
    updateTimeLine();
    const interval = setInterval(updateTimeLine, 60000);
    return () => clearInterval(interval);
  }, []);

  // Para a data so importa o INICIO; o fim serve para desenhar a duracao. Evento que termina no dia seguinte
  // (fim <= inicio) ocupa o bloco ate o fim do dia exibido.
  const toMins = (hhmm: string) => { const [hh, mm] = hhmm.split(':').map(Number); return hh * 60 + (mm || 0); };
  const GRID_END_MINS = (END_HOUR + 1) * 60;
  const getTaskSpan = (task: AdminTask) => {
    if (!task.dueTime) return { startAbs: START_HOUR * 60, endAbs: START_HOUR * 60 + 30, crossesMidnight: false };
    const startAbs = toMins(task.dueTime);
    let endAbs = task.endTime ? toMins(task.endTime) : startAbs + 10;
    let crossesMidnight = false;
    if (task.endTime && endAbs <= startAbs) { endAbs = GRID_END_MINS; crossesMidnight = true; }
    return { startAbs, endAbs: Math.min(endAbs, GRID_END_MINS), crossesMidnight };
  };
  const getTaskTopAndHeight = (task: AdminTask) => {
    if (!task.dueTime) return { top: 0, height: 32 };
    const { startAbs, endAbs } = getTaskSpan(task);
    const startMins = Math.max(0, startAbs - START_HOUR * 60);
    const durationMins = Math.max(10, endAbs - startAbs);
    return { top: (startMins / 60) * HOUR_HEIGHT, height: Math.max(34, (durationMins / 60) * HOUR_HEIGHT) };
  };

  // Eventos que se sobrepoem no horario ficam lado a lado (colunas), nunca um em cima do outro
  const columnLayout = useMemo(() => {
    const items = timedTasks.map(t => ({ id: t.id, ...getTaskSpan(t) })).sort((a, b) => a.startAbs - b.startAbs || a.endAbs - b.endAbs);
    const layout = new Map<string, { col: number; cols: number }>();
    let cluster: typeof items = [];
    let clusterEnd = -1;
    const flush = () => {
      const colEnds: number[] = [];
      const assigned = cluster.map(it => {
        let c = colEnds.findIndex(end => end <= it.startAbs);
        if (c === -1) { c = colEnds.length; colEnds.push(it.endAbs); } else colEnds[c] = it.endAbs;
        return { id: it.id, col: c };
      });
      assigned.forEach(a => layout.set(a.id, { col: a.col, cols: colEnds.length }));
      cluster = []; clusterEnd = -1;
    };
    for (const it of items) {
      if (cluster.length && it.startAbs >= clusterEnd) flush();
      cluster.push(it); clusterEnd = Math.max(clusterEnd, it.endAbs);
    }
    if (cluster.length) flush();
    return layout;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedTasks, START_HOUR, END_HOUR]);

  // Ao abrir o dia, rola ate o primeiro evento (ou 07:00 se nao houver)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = timedTasks.length ? Math.min(...timedTasks.map(t => toMins(t.dueTime as string))) : Math.max(7 * 60, START_HOUR * 60);
    el.scrollTop = Math.max(0, ((first - START_HOUR * 60) / 60) * HOUR_HEIGHT - 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, timedTasks.length]);

  // Drag & Drop Moving State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, task: AdminTask) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnTimeline = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || !onUpdateTask) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = Math.max(0, e.clientY - rect.top);
    const totalMinutes = (clickY / HOUR_HEIGHT) * 60;
    
    // Snap to nearest 15/30 min
    const snappedMinutes = Math.floor(totalMinutes / 15) * 15;
    const newHour = Math.min(END_HOUR, Math.max(START_HOUR, START_HOUR + Math.floor(snappedMinutes / 60)));
    const newMin = snappedMinutes % 60;
    const newDueTime = `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;

    let newEndTime: string | undefined = undefined;
    if (task.dueTime && task.endTime) {
      const [oldH, oldM] = task.dueTime.split(':').map(Number);
      const [oldEndH, oldEndM] = task.endTime.split(':').map(Number);
      const durationM = (oldEndH * 60 + oldEndM) - (oldH * 60 + oldM);
      if (durationM > 0) {
        const endTotalM = newHour * 60 + newMin + durationM;
        const endH = Math.min(23, Math.floor(endTotalM / 60));
        const endM = endTotalM % 60;
        newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }
    }

    onUpdateTask(task.id, {
      dueDate: dateStr,
      dueTime: newDueTime,
      ...(newEndTime ? { endTime: newEndTime } : {}),
    });
    setDraggedTaskId(null);
  };

  // Interactive Bottom Resize Handling
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null);
  const resizeStartY = useRef<number>(0);
  const resizeInitialHeight = useRef<number>(0);

  const startResize = (e: React.MouseEvent, task: AdminTask) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingTaskId(task.id);
    resizeStartY.current = e.clientY;
    const { height } = getTaskTopAndHeight(task);
    resizeInitialHeight.current = height;

    const onMouseMove = (_moveEvent: MouseEvent) => {
      // visual tracking
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setResizingTaskId(null);

      const deltaY = upEvent.clientY - resizeStartY.current;
      const newHeight = Math.max(34, resizeInitialHeight.current + deltaY);
      const newDurationMins = Math.max(10, Math.round(((newHeight / HOUR_HEIGHT) * 60) / 15) * 15);

      if (task.dueTime && onUpdateTask) {
        const [h, m] = task.dueTime.split(':').map(Number);
        const endTotalM = h * 60 + (m || 0) + newDurationMins;
        const endH = Math.min(23, Math.floor(endTotalM / 60));
        const endM = endTotalM % 60;
        const computedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        onUpdateTask(task.id, { endTime: computedEndTime });
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--adm-bg-card, #FFFFFF)',
      border: '1px solid var(--adm-border, #E2E8F0)',
      borderRadius: '16px',
      margin: '16px 24px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    }}>
      {/* Subheader Date Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid var(--adm-border, #E2E8F0)',
        background: 'var(--adm-bg-surface, #F8FAFC)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handlePrevDay}
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'var(--adm-bg-card, #FFFFFF)',
              border: '1px solid var(--adm-border, #CBD5E1)',
              color: 'var(--adm-text-title, #334155)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Dia anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <MonthYearSwitcher year={currentDate.getFullYear()} month={currentDate.getMonth()} label={formattedHeaderDate}
            onChange={(y, m) => onDateChange(new Date(y, m, Math.min(currentDate.getDate(), new Date(y, m + 1, 0).getDate())))}
            style={{ fontSize: '0.86rem', color: 'var(--adm-text-title, #0F172A)', letterSpacing: '-0.2px' }} />

          <button
            type="button"
            onClick={handleNextDay}
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'var(--adm-bg-card, #FFFFFF)',
              border: '1px solid var(--adm-border, #CBD5E1)',
              color: 'var(--adm-text-title, #334155)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Próximo dia"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleToday}
          style={{
            padding: '5px 12px',
            borderRadius: '8px',
            background: isToday ? 'rgba(2, 132, 199, 0.15)' : 'var(--adm-bg-card, #FFFFFF)',
            border: isToday ? '1px solid #0284C7' : '1px solid var(--adm-border, #CBD5E1)',
            color: isToday ? '#0284C7' : 'var(--adm-text-muted, #64748B)',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Hoje
        </button>
      </div>

      {/* All-Day Tasks Row */}
      {allDayTasks.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 20px',
          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
          background: 'var(--adm-bg-surface, #F8FAFC)',
        }}>
          <span style={{
            fontSize: '0.70rem',
            fontWeight: 800,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            width: '60px',
            flexShrink: 0,
          }}>
            Dia todo
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
            {allDayTasks.map(task => {
              const theme = getTaskTypeTheme(task);
              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: theme.badgeBg,
                    border: `1px solid ${theme.badgeBorder}`,
                    color: theme.badgeText,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {renderTaskTypeIcon(theme.category, 12, theme.primaryColor)}
                  <span>{task.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline Scrollable Grid (07:00 to 23:00 in 30min intervals) */}
      <div 
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', position: 'relative', background: 'var(--adm-bg-card, #FFFFFF)' }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={handleDropOnTimeline}
      >
        <div style={{
          position: 'relative',
          height: `${hours.length * HOUR_HEIGHT}px`,
          paddingLeft: '70px',
        }}>
          {/* Hour Horizontal Grid Lines with 30min midpoint */}
          {hours.map((hour, idx) => (
            <div
              key={hour}
              style={{
                position: 'absolute',
                top: `${idx * HOUR_HEIGHT}px`,
                left: 0,
                right: 0,
                height: `${HOUR_HEIGHT}px`,
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                boxSizing: 'border-box',
              }}
              onDoubleClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const isSecondHalf = clickY > HOUR_HEIGHT / 2;
                onNewTaskForDate?.(dateStr, `${String(hour).padStart(2, '0')}:${isSecondHalf ? '30' : '00'}`);
              }}
            >
              {/* Hour Label */}
              <div style={{
                width: '70px',
                textAlign: 'right',
                paddingRight: '14px',
                fontSize: '0.70rem',
                fontWeight: 700,
                color: '#64748B',
                marginTop: '-7px',
                userSelect: 'none',
                position: 'relative',
              }}>
                <div>{String(hour).padStart(2, '0')}:00</div>
                <div style={{
                  position: 'absolute',
                  top: `${HOUR_HEIGHT / 2}px`,
                  right: '14px',
                  fontSize: '0.62rem',
                  color: '#94A3B8',
                  fontWeight: 600,
                }}>
                  :30
                </div>
              </div>

              {/* 30-min dashed separator */}
              <div style={{
                position: 'absolute',
                top: `${HOUR_HEIGHT / 2}px`,
                left: '70px',
                right: 0,
                borderTop: '1px dashed var(--adm-border, #E2E8F0)',
              }} />
            </div>
          ))}

          {/* Real-Time Current Time Indicator (Blue Line) */}
          {isToday && currentMinutesFromStart !== null && currentMinutesFromStart >= 0 && (
            <div style={{
              position: 'absolute',
              top: `${(currentMinutesFromStart / 60) * HOUR_HEIGHT}px`,
              left: '60px',
              right: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284C7', marginLeft: '-4px' }} />
              <div style={{ flex: 1, height: '2px', background: '#0284C7', boxShadow: '0 0 6px rgba(2, 132, 199, 0.4)' }} />
            </div>
          )}

          {/* Timed Task Blocks */}
          {timedTasks.map(task => {
            const { top, height } = getTaskTopAndHeight(task);
            const theme = getTaskTypeTheme(task);
            const leadOrTargetName = task.leadName || task.debutanteName;
            const isBeingDragged = draggedTaskId === task.id;
            const accent = getTaskAccent ? getTaskAccent(task) : null;
            const lay = columnLayout.get(task.id) || { col: 0, cols: 1 };
            const span = getTaskSpan(task);
            const pct = 100 / lay.cols;

            return (
              <div
                key={task.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, task)}
                onClick={() => onOpenTask(task)}
                style={{
                  position: 'absolute',
                  top: `${top + 2}px`,
                  height: `${height - 4}px`,
                  left: `calc(80px + (100% - 104px) * ${lay.col * pct / 100})`,
                  width: `calc((100% - 104px) * ${pct / 100} - 4px)`,
                  background: accent ? `${accent.color}18` : theme.badgeBg,
                  border: `1.5px solid ${accent ? accent.color : theme.primaryColor}`,
                  borderLeft: accent ? `5px solid ${accent.color}` : undefined,
                  borderRadius: '10px',
                  padding: '6px 12px',
                  cursor: 'grab',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  transition: resizingTaskId === task.id ? 'none' : 'all 0.15s ease',
                  opacity: isBeingDragged ? 0.4 : 1,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.003)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
              >
                {accent && (
                  <div style={{ fontSize: '0.64rem', fontWeight: 800, color: accent.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{accent.label}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span style={{ display: 'flex', flexShrink: 0 }}>{renderTaskTypeIcon(theme.category, 13, theme.primaryColor)}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 700, color: theme.badgeText, flexShrink: 0 }}>
                    {task.dueTime}{task.endTime ? ` - ${task.endTime}${span.crossesMidnight ? ' (dia seguinte)' : ''}` : ''}
                  </span>
                </div>
                {leadOrTargetName && (
                  <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '2px' }}>
                    {leadOrTargetName}
                  </div>
                )}

                {/* Bottom Resize Handle */}
                <div
                  onMouseDown={(e) => startResize(e, task)}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '6px',
                    cursor: 'ns-resize',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Puxar para alterar duração"
                >
                  <div style={{ width: '24px', height: '2px', background: 'rgba(0,0,0,0.2)', borderRadius: '1px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
