import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { MonthYearSwitcher } from '../../ui';
import type { AdminTask } from '../../../types/admin';
import { getTaskTypeTheme, renderTaskTypeIcon } from '../../../utils/taskColors';
import { toLocalDateStr, getTodayLocalStr } from '../../../utils/dateUtils';

interface AdminCalendarWeekViewProps {
  tasks: AdminTask[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onOpenTask: (task: AdminTask) => void;
  onNewTaskForDate?: (dateStr: string, timeStr?: string) => void;
  onUpdateTask?: (id: string, data: Partial<AdminTask>) => void;
  getTaskAccent?: (task: AdminTask) => { color: string; label: string } | null;
}

export const AdminCalendarWeekView: React.FC<AdminCalendarWeekViewProps> = ({
  tasks,
  currentDate,
  onDateChange,
  onOpenTask,
  onNewTaskForDate,
  onUpdateTask,
  getTaskAccent,
}) => {
  const todayStr = useMemo(() => {
    return getTodayLocalStr();
  }, []);

  // Compute the 7 days of the current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const current = new Date(currentDate);
    const day = current.getDay(); // 0 = Dom, 1 = Seg...
    const diff = current.getDate() - (day === 0 ? 6 : day - 1); // Adjust to Monday
    const monday = new Date(current.setDate(diff));

    const days: { date: Date; dateStr: string; label: string; weekdayShort: string; dayNum: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toLocalDateStr(d);
      const weekdayShort = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i];
      const dayNum = d.getDate();
      
      let label = `${weekdayShort} ${dayNum}`;
      if (i === 0) {
        const monthShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const capitalizedMonth = monthShort.charAt(0).toUpperCase() + monthShort.slice(1);
        label = `${weekdayShort}. ${dayNum} ${capitalizedMonth}.`;
      }

      days.push({
        date: d,
        dateStr,
        label,
        weekdayShort,
        dayNum,
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [currentDate, todayStr]);

  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    const firstMonth = first.toLocaleDateString('pt-BR', { month: 'short' });
    const lastMonth = last.toLocaleDateString('pt-BR', { month: 'short' });
    return `${first.getDate()} ${firstMonth} – ${last.getDate()} ${lastMonth} de ${last.getFullYear()}`;
  }, [weekDays]);

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    onDateChange(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    onDateChange(d);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Hours: 07:00 to 23:00 (17 hours)
  const START_HOUR = 7;
  const END_HOUR = 23;
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      arr.push(h);
    }
    return arr;
  }, []);

  const HOUR_HEIGHT = 64; // px per hour (32px per 30min slot)
  const GUTTER_WIDTH = 64; // px

  // Real-time current time indicator
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

  // Calculate pixel top and height for a task (parse seguro de horário)
  const getTaskTopAndHeight = (task: AdminTask) => {
    if (!task.dueTime) return { top: 0, height: 28 };
    const match = String(task.dueTime).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return { top: 0, height: 28 };
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const startMins = Math.max(0, (h - START_HOUR) * 60 + (m || 0));
    
    // Duração padrão: 60 minutos para eventos / tarefas na grade
    let durationMins = 60;
    if (task.endTime) {
      const endMatch = String(task.endTime).match(/^(\d{1,2}):(\d{2})/);
      if (endMatch) {
        const endH = parseInt(endMatch[1], 10);
        const endM = parseInt(endMatch[2], 10);
        let endTotalMins = (endH - START_HOUR) * 60 + (endM || 0);
        // Se cruzar meia-noite (ex: 20:00 às 02:00)
        if (endH < h) {
          endTotalMins = (24 - START_HOUR) * 60;
        }
        if (endTotalMins > startMins) {
          durationMins = Math.max(20, endTotalMins - startMins);
        }
      }
    }
    
    const topPx = (startMins / 60) * HOUR_HEIGHT;
    const heightPx = Math.max(28, (durationMins / 60) * HOUR_HEIGHT);
    return { top: topPx, height: heightPx };
  };

  // Drag & Drop Moving State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, task: AdminTask) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnColumn = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || !onUpdateTask) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = Math.max(0, e.clientY - rect.top);
    const totalMinutes = (clickY / HOUR_HEIGHT) * 60;
    
    // Snap to nearest 30-min or 15-min interval
    const snappedMinutes = Math.floor(totalMinutes / 15) * 15;
    const newHour = Math.min(END_HOUR, Math.max(START_HOUR, START_HOUR + Math.floor(snappedMinutes / 60)));
    const newMin = snappedMinutes % 60;
    const newDueTime = `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;

    // Preserve duration if endTime was defined
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
      const newHeight = Math.max(28, resizeInitialHeight.current + deltaY);
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
      userSelect: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      boxSizing: 'border-box',
    }}>
      {/* 1. Top Week Navigation Bar */}
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
            onClick={handlePrevWeek}
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
            title="Semana anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <MonthYearSwitcher year={currentDate.getFullYear()} month={currentDate.getMonth()} label={weekRangeLabel}
            onChange={(y, m) => onDateChange(new Date(y, m, Math.min(currentDate.getDate(), new Date(y, m + 1, 0).getDate())))}
            style={{ fontSize: '0.86rem', color: 'var(--adm-text-title, #0F172A)', letterSpacing: '-0.2px' }} />

          <button
            type="button"
            onClick={handleNextWeek}
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
            title="Próxima semana"
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
            background: 'var(--adm-bg-card, #FFFFFF)',
            border: '1px solid var(--adm-border, #CBD5E1)',
            color: 'var(--adm-text-muted, #64748B)',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Hoje
        </button>
      </div>

      {/* 2. 7 Days Column Headers */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '1px solid var(--adm-border, #E2E8F0)',
        background: 'var(--adm-bg-surface, #F8FAFC)',
        fontSize: '0.78rem',
        fontWeight: 800,
      }}>
        <div style={{
          width: `${GUTTER_WIDTH}px`,
          flexShrink: 0,
          borderRight: '1px solid var(--adm-border, #E2E8F0)',
          background: 'var(--adm-bg-surface, #F8FAFC)',
        }} />

        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}>
          {weekDays.map((wd, index) => (
            <div
              key={wd.dateStr}
              style={{
                padding: '10px 6px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderRight: index < 6 ? '1px solid #E2E8F0' : 'none',
                background: wd.isToday ? '#EFF6FF' : 'transparent',
                color: wd.isToday ? '#0284C7' : '#334155',
                fontWeight: wd.isToday ? 900 : 700,
              }}
            >
              <span>{wd.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2.1 Linha de Eventos Sem Horário / O Dia Todo */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '1px solid var(--adm-border, #E2E8F0)',
        background: 'var(--adm-bg-surface, #F8FAFC)',
        minHeight: '42px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{
          width: `${GUTTER_WIDTH}px`,
          flexShrink: 0,
          borderRight: '1px solid var(--adm-border, #E2E8F0)',
          background: 'var(--adm-bg-surface, #F8FAFC)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 2px',
          gap: '2px',
          userSelect: 'none',
        }}>
          <Clock size={11} color="#64748B" style={{ opacity: 0.8 }} />
          <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.2px', textAlign: 'center', lineHeight: 1.1 }}>
            Sem hora
          </span>
        </div>

        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}>
          {weekDays.map((wd, index) => {
            const dayTasks = tasks.filter(t => t.dueDate === wd.dateStr);
            const untimedTasks = dayTasks.filter(t => {
              if (!t.dueTime || !t.dueTime.trim()) return true;
              const match = String(t.dueTime).match(/^(\d{1,2}):(\d{2})/);
              if (!match) return true;
              const h = parseInt(match[1], 10);
              return h < START_HOUR || h > END_HOUR;
            });

            return (
              <div
                key={`untimed-${wd.dateStr}`}
                style={{
                  padding: '4px',
                  borderRight: index < 6 ? '1px solid #E2E8F0' : 'none',
                  background: wd.isToday ? 'rgba(2, 132, 199, 0.03)' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  minHeight: '34px',
                  maxHeight: '130px',
                  overflowY: 'auto',
                }}
              >
                {untimedTasks.map(task => {
                  const accent = getTaskAccent ? getTaskAccent(task) : null;
                  const isCompleted = task.status === 'completed';
                  const theme = getTaskTypeTheme(task);

                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTask(task);
                      }}
                      style={{
                        padding: '3px 6px',
                        borderRadius: '5px',
                        border: accent ? `1px solid ${accent.color}66` : `1px solid ${theme.badgeBorder}`,
                        borderLeft: accent ? `3.5px solid ${accent.color}` : `3.5px solid ${theme.primaryColor}`,
                        background: accent ? `${accent.color}14` : (isCompleted ? 'var(--adm-bg-surface, #F8FAFC)' : theme.badgeBg),
                        color: 'var(--adm-text-title, #0F172A)',
                        cursor: 'pointer',
                        fontSize: '0.67rem',
                        fontWeight: 800,
                        lineHeight: 1.2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                      }}
                      title={task.title}
                    >
                      <span style={{ display: 'flex', flexShrink: 0 }}>
                        {renderTaskTypeIcon(theme.category, 10, accent ? accent.color : theme.primaryColor)}
                      </span>
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {task.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main Grid (07:00 to 23:00 in 30min slots) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        position: 'relative',
        background: 'var(--adm-bg-card, #FFFFFF)',
      }}>
        {/* Time Gutter (Left) with 30-min sub-markers */}
        <div style={{
          width: `${GUTTER_WIDTH}px`,
          flexShrink: 0,
          borderRight: '1px solid var(--adm-border, #E2E8F0)',
          userSelect: 'none',
          background: 'var(--adm-bg-surface, #F8FAFC)',
        }}>
          {hours.map(hour => (
            <div
              key={hour}
              style={{
                height: `${HOUR_HEIGHT}px`,
                paddingRight: '8px',
                paddingTop: '2px',
                textAlign: 'right',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#64748B',
                borderBottom: '1px solid #E2E8F0',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div>{String(hour).padStart(2, '0')}:00</div>
              <div style={{
                position: 'absolute',
                top: `${HOUR_HEIGHT / 2}px`,
                right: '8px',
                fontSize: '0.60rem',
                color: '#94A3B8',
                fontWeight: 600,
              }}>
                :30
              </div>
            </div>
          ))}
        </div>

        {/* 7 Day Vertical Columns */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          position: 'relative',
          minHeight: `${hours.length * HOUR_HEIGHT}px`,
        }}>
          {weekDays.map((wd, colIndex) => {
            const dayTasks = tasks.filter(t => t.dueDate === wd.dateStr);
            const timedTasks = dayTasks.filter(t => {
              if (!t.dueTime || !t.dueTime.trim()) return false;
              const match = String(t.dueTime).match(/^(\d{1,2}):(\d{2})/);
              if (!match) return false;
              const h = parseInt(match[1], 10);
              return h >= START_HOUR && h <= END_HOUR;
            });

            return (
              <div
                key={wd.dateStr}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => handleDropOnColumn(e, wd.dateStr)}
                style={{
                  position: 'relative',
                  background: wd.isToday ? 'rgba(2, 132, 199, 0.02)' : 'transparent',
                  borderRight: colIndex < 6 ? '1px solid #E2E8F0' : 'none',
                }}
                onDoubleClick={(e) => {
                  if (!onNewTaskForDate) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const totalMinutes = (clickY / HOUR_HEIGHT) * 60;
                  const snappedMins = Math.floor(totalMinutes / 30) * 30;
                  const hourClicked = Math.min(END_HOUR, Math.max(START_HOUR, START_HOUR + Math.floor(snappedMins / 60)));
                  const minClicked = snappedMins % 60;
                  onNewTaskForDate(wd.dateStr, `${String(hourClicked).padStart(2, '0')}:${String(minClicked).padStart(2, '0')}`);
                }}
              >
                {/* Horizontal hour & 30-min guide lines */}
                {hours.map(hour => (
                  <div
                    key={hour}
                    style={{
                      height: `${HOUR_HEIGHT}px`,
                      borderBottom: '1px solid #E2E8F0',
                      width: '100%',
                      boxSizing: 'border-box',
                      position: 'relative',
                    }}
                  >
                    {/* 30-min midpoint dotted line */}
                    <div style={{
                      position: 'absolute',
                      top: `${HOUR_HEIGHT / 2}px`,
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed var(--adm-border, #E2E8F0)',
                    }} />
                  </div>
                ))}

                {/* Real-time Current Hour Blue Line on today's column */}
                {wd.isToday && currentMinutesFromStart !== null && (
                  <div
                    style={{
                      top: `${(currentMinutesFromStart / 60) * HOUR_HEIGHT}px`,
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7', marginLeft: '-3px' }} />
                    <div style={{ flex: 1, height: '2px', background: '#0284C7', boxShadow: '0 0 6px rgba(2, 132, 199, 0.4)' }} />
                  </div>
                )}

                {/* Day Tasks Cards */}
                {timedTasks.map(task => {
                  const { top, height } = getTaskTopAndHeight(task);
                  const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== 'completed';
                  const isCompleted = task.status === 'completed';
                  const theme = getTaskTypeTheme(task);
                  const timeDisplay = task.endTime ? `${task.dueTime}-${task.endTime}` : task.dueTime;
                  const isBeingDragged = draggedTaskId === task.id;
                  const accent = getTaskAccent ? getTaskAccent(task) : null;

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTask(task);
                      }}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: '4px',
                        right: '4px',
                        position: 'absolute',
                        zIndex: 10,
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: accent ? `1px solid ${accent.color}66` : isOverdue
                          ? '1.5px solid #FCA5A5' 
                          : isCompleted 
                            ? '1px solid var(--adm-border, #E2E8F0)' 
                            : `1px solid ${theme.badgeBorder}`,
                        borderLeft: accent ? `4px solid ${accent.color}` : undefined,
                        background: accent ? `${accent.color}18` : isOverdue
                          ? '#FEF2F2' 
                          : isCompleted 
                            ? 'var(--adm-bg-surface, #F8FAFC)' 
                            : theme.badgeBg,
                        color: 'var(--adm-text-title, #0F172A)',
                        cursor: 'grab',
                        transition: resizingTaskId === task.id ? 'none' : 'box-shadow 0.15s ease',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        opacity: isBeingDragged ? 0.4 : isCompleted ? 0.75 : 1,
                      }}
                    >
                      <div>
                        <div style={{ 
                          fontSize: '0.70rem', 
                          fontWeight: 800, 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          lineHeight: 1.15, 
                          color: isOverdue ? '#991B1B' : 'var(--adm-text-title, #0F172A)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <span style={{ display: 'flex', flexShrink: 0 }}>
                            {renderTaskTypeIcon(theme.category, 10, theme.primaryColor)}
                          </span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '1px' }}>
                          {timeDisplay}
                        </div>
                      </div>

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
                        <div style={{ width: '16px', height: '2px', background: 'rgba(0,0,0,0.15)', borderRadius: '1px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
