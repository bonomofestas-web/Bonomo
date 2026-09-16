import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AdminTask } from '../../../types/admin';
import { getTaskTypeTheme, renderTaskTypeIcon } from '../../../utils/taskColors';

interface AdminCalendarMonthViewProps {
  tasks: AdminTask[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onOpenTask?: (task: AdminTask) => void;
  onNewTaskForDate?: (dateStr: string) => void;
  onSelectDay?: (date: Date) => void;
}

export const AdminCalendarMonthView: React.FC<AdminCalendarMonthViewProps> = ({
  tasks,
  currentDate,
  onDateChange,
  onOpenTask: _onOpenTask,
  onNewTaskForDate: _onNewTaskForDate,
  onSelectDay,
}) => {
  const todayStr = React.useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    onDateChange(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    onDateChange(d);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const formattedMonthHeader = React.useMemo(() => {
    const month = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalizedMonth} de ${currentYear}`;
  }, [currentDate, currentYear]);

  // Compute month calendar cells (starting on Monday)
  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // 0 = Sunday, 1 = Monday...
    let firstDayIndex = firstDayOfMonth.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Sunday becomes 6

    const days: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      monthLabel?: string;
    }[] = [];

    // Prev month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateStr = d.toISOString().split('T')[0];
      let monthLabel: string | undefined = undefined;
      if (i === 1) {
        const mShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        monthLabel = `1 ${mShort.charAt(0).toUpperCase() + mShort.slice(1)}. ${currentYear}`;
      }
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        monthLabel,
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      let monthLabel: string | undefined = undefined;
      if (i === 1) {
        const mShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        monthLabel = `1 ${mShort.charAt(0).toUpperCase() + mShort.slice(1)}. ${d.getFullYear()}`;
      }
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        monthLabel,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const handleDayClick = (cellDate: Date) => {
    if (onSelectDay) {
      onSelectDay(cellDate);
    } else {
      onDateChange(cellDate);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      margin: '16px 24px',
      userSelect: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      boxSizing: 'border-box',
    }}>
      {/* Month Subheader Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid #E2E8F0',
        background: '#F8FAFC',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
            {formattedMonthHeader}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Próximo mês"
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
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#64748B',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Hoje
        </button>
      </div>

      {/* 7 Weekdays Header Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        textAlign: 'center',
        padding: '10px 0',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
      }}>
        {weekdays.map((w, i) => (
          <div
            key={w}
            style={{
              fontSize: '0.76rem',
              fontWeight: 800,
              color: '#64748B',
              borderRight: i < 6 ? '1px solid #E2E8F0' : 'none',
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Calendar Grid 7xN */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridAutoRows: 'minmax(110px, 1fr)',
        background: '#FFFFFF',
      }}>
        {calendarDays.map((cell, index) => {
          const dayTasks = tasks.filter(t => t.dueDate === cell.dateStr);

          return (
            <div
              key={cell.dateStr}
              onClick={() => handleDayClick(cell.date)}
              style={{
                minHeight: '110px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'background 0.15s ease',
                background: !cell.isCurrentMonth ? '#F8FAFC' : cell.isToday ? '#EFF6FF' : '#FFFFFF',
                borderRight: (index + 1) % 7 !== 0 ? '1px solid #E2E8F0' : 'none',
                borderBottom: '1px solid #E2E8F0',
                opacity: !cell.isCurrentMonth ? 0.6 : 1,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = cell.isToday ? '#DBEAFE' : '#F1F5F9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = !cell.isCurrentMonth ? '#F8FAFC' : cell.isToday ? '#EFF6FF' : '#FFFFFF';
              }}
              title="Clique para ver o dia detalhado"
            >
              {/* Day Number / Month Label */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                {cell.monthLabel ? (
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748B' }}>
                    {cell.monthLabel}
                  </span>
                ) : <span />}

                <span
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: cell.isToday ? '#0284C7' : 'transparent',
                    color: cell.isToday ? '#FFFFFF' : cell.isCurrentMonth ? '#0F172A' : '#94A3B8',
                  }}
                >
                  {cell.dayNumber}
                </span>
              </div>

              {/* Day Tasks List / Badges */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflowY: 'auto',
                paddingRight: '2px',
              }}>
                {dayTasks.map(task => {
                  const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== 'completed';
                  const isCompleted = task.status === 'completed';
                  const theme = getTaskTypeTheme(task);
                  const timeDisplay = task.dueTime ? (task.endTime ? `${task.dueTime} - ${task.endTime}` : task.dueTime) : '';

                  return (
                    <div
                      key={task.id}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        fontSize: '0.70rem',
                        transition: 'all 0.15s ease',
                        border: isOverdue 
                          ? '1px solid #FCA5A5' 
                          : isCompleted 
                            ? '1px solid #E2E8F0' 
                            : `1px solid ${theme.badgeBorder}`,
                        background: isOverdue 
                          ? '#FEF2F2' 
                          : isCompleted 
                            ? '#F8FAFC' 
                            : theme.badgeBg,
                        color: '#0F172A',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        lineHeight: 1.2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isOverdue ? '#991B1B' : '#0F172A' }}>
                        {task.title}
                      </div>
                      <div style={{ 
                        fontSize: '0.66rem', 
                        color: theme.badgeText, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        {renderTaskTypeIcon(theme.category, 10, theme.primaryColor)}
                        <span>{timeDisplay ? `${timeDisplay} • ${theme.label}` : theme.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
