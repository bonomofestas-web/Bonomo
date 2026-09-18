import React, { useState, useMemo } from 'react';
import { 
  PhoneCall, CheckCircle2, Clock, 
  Users, Search, ExternalLink, Plus,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { AdminTask } from '../../types/admin';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminTaskCompletionModal } from './AdminTaskCompletionModal';

// WhatsApp Brand SVG Icon
const WhatsAppBrandIcon: React.FC<{ size?: number; color?: string }> = ({ size = 13, color = '#25D366' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.678.15-.2.301-.778.978-.954 1.179-.176.2-.351.226-.652.075-1.781-.892-2.946-1.597-4.108-3.593-.306-.527.306-.489.876-1.629.096-.192.048-.36-.024-.51-.072-.15-.678-1.636-.93-2.242-.244-.588-.493-.509-.678-.518-.176-.008-.377-.01-.578-.01s-.527.075-.803.376c-.276.301-1.055 1.03-1.055 2.511s1.08 2.913 1.231 3.114c.151.2 2.126 3.246 5.15 4.553.719.311 1.28.497 1.718.636.723.23 1.381.198 1.901.12.58-.087 1.78-.728 2.032-1.431.252-.703.252-1.305.176-1.431-.076-.126-.276-.201-.577-.351z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.92.545 3.715 1.488 5.237L2.05 21.95l4.857-1.39A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.634 0-3.175-.483-4.472-1.314l-.321-.205-2.887.826.837-2.822-.218-.337A8.17 8.17 0 0 1 3.8 12c0-4.522 3.678-8.2 8.2-8.2 4.522 0 8.2 3.678 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z"/>
  </svg>
);

interface AdminFollowUpsViewProps {
  onOpenLead?: (leadId: string) => void;
}

const HOURS_LIST = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00'
];

export const AdminFollowUpsView: React.FC<AdminFollowUpsViewProps> = ({ onOpenLead }) => {
  const { 
    tasks, 
    leads, 
    collaborators, 
    completeTaskWithFeedback 
  } = useAdminState();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCollabId, setSelectedCollabId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [defaultTaskTime, setDefaultTaskTime] = useState<string>('09:00');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);


  // Filter tasks for the selected date
  const dayFollowUps = useMemo(() => {
    return tasks.filter(task => {
      const isFollowUp = task.type === 'followup' || task.type === 'call' || Boolean(task.leadId);
      if (!isFollowUp) return false;

      // Date match
      if (task.dueDate !== selectedDate) return false;

      // Collab match
      if (selectedCollabId !== 'all') {
        const isAssigned = (task.assignedToIds || []).includes(selectedCollabId) || task.createdById === selectedCollabId;
        if (!isAssigned) return false;
      }

      // Status match
      if (filterStatus === 'pending' && task.status === 'completed') return false;
      if (filterStatus === 'completed' && task.status !== 'completed') return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesLead = (task.leadName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesLead) return false;
      }

      return true;
    });
  }, [tasks, selectedDate, selectedCollabId, filterStatus, searchQuery]);

  // Group tasks by hour
  const tasksByHour = useMemo(() => {
    const map: Record<string, AdminTask[]> = {};
    HOURS_LIST.forEach(h => { map[h] = []; });

    dayFollowUps.forEach(task => {
      const time = task.dueTime || '09:00';
      const hourPart = time.split(':')[0].padStart(2, '0');
      const roundedHour = `${hourPart}:00`;
      if (map[roundedHour]) {
        map[roundedHour].push(task);
      } else {
        // Fallback to nearest or 09:00
        if (!map['09:00']) map['09:00'] = [];
        map['09:00'].push(task);
      }
    });

    // Sort each hour slot by exact time
    Object.keys(map).forEach(h => {
      map[h].sort((a, b) => (a.dueTime || '00:00').localeCompare(b.dueTime || '00:00'));
    });

    return map;
  }, [dayFollowUps]);

  // Stats for the day
  const stats = useMemo(() => {
    const total = dayFollowUps.length;
    const completed = dayFollowUps.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    const isPastDate = selectedDate < todayStr;
    const overdue = isPastDate ? pending : 0;
    return { total, completed, pending, overdue };
  }, [dayFollowUps, selectedDate, todayStr]);

  const handleQuickComplete = (task: AdminTask) => {
    setCompletingTaskId(task.id);
  };

  const handleOpenNewAtHour = (hour: string) => {
    setDefaultTaskTime(hour);
    setIsNewTaskModalOpen(true);
  };

  const handleShiftDay = (days: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formattedDateTitle = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const fullDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${fullDate}`;
  }, [selectedDate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      padding: '24px 32px 60px 32px',
      fontFamily: "'Inter', sans-serif",
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      {/* Header with Title & Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'rgba(20, 169, 215, 0.15)',
              border: '1px solid var(--adm-accent)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PhoneCall size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                Follow-up Comercial
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Linha do tempo diária em blocos de 1 hora para recuperação e acompanhamento de leads.
              </p>
            </div>
          </div>
        </div>

        {/* Agendar Follow-up Button */}
        <button
          type="button"
          onClick={() => {
            setDefaultTaskTime('09:00');
            setIsNewTaskModalOpen(true);
          }}
          className="adm-btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>+ Agendar Follow-up</span>
        </button>
      </div>

      {/* Date Navigation & Control Bar */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}>
        {/* Date Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleShiftDay(-1)}
            title="Dia Anterior"
            style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-title)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-title)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.84rem',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          />

          <button
            type="button"
            onClick={() => handleShiftDay(1)}
            title="Próximo Dia"
            style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-title)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={16} />
          </button>

          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              style={{
                background: 'rgba(20, 169, 215, 0.12)',
                border: '1px solid var(--adm-accent)',
                color: 'var(--adm-accent)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Hoje
            </button>
          )}

          <span style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title)', marginLeft: '6px' }}>
            {formattedDateTitle}
          </span>
        </div>

        {/* Filters: Collaborator + Status + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Collaborator Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} color="var(--adm-text-muted)" />
            <select
              value={selectedCollabId}
              onChange={(e) => setSelectedCollabId(e.target.value)}
              style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="all">Todos os Colaboradores</option>
              {collaborators.filter(c => c.active).map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.role.toUpperCase()})</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-title)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.78rem',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Apenas Pendentes</option>
            <option value="completed">Concluídos</option>
          </select>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={13} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar lead ou texto..."
              style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                borderRadius: '8px',
                padding: '6px 10px 6px 28px',
                fontSize: '0.78rem',
                outline: 'none',
                fontFamily: 'inherit',
                width: '180px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Mini KPIs do Dia */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={18} color="var(--adm-accent)" />
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Total do Dia</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{stats.total}</div>
          </div>
        </div>

        <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PhoneCall size={18} color="#F59E0B" />
          <div>
            <div style={{ fontSize: '0.66rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 800 }}>Pendentes</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#F59E0B' }}>{stats.pending}</div>
          </div>
        </div>

        <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="#10B981" />
          <div>
            <div style={{ fontSize: '0.66rem', color: '#10B981', textTransform: 'uppercase', fontWeight: 800 }}>Concluídos</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10B981' }}>{stats.completed}</div>
          </div>
        </div>
      </div>

      {/* ── TIMELINE DIÁRIA EM BLOCOS DE 1 HORA COM SLOTS DE 15 MINUTOS ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {HOURS_LIST.map(hour => {
          const hourTasks = tasksByHour[hour] || [];
          const hasTasks = hourTasks.length > 0;

          return (
            <div
              key={hour}
              style={{
                background: 'var(--adm-bg-card)',
                border: hasTasks ? '1px solid rgba(20, 169, 215, 0.35)' : '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '18px',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Hour Indicator */}
              <div style={{
                width: '64px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '10px',
                background: hasTasks ? 'rgba(20, 169, 215, 0.12)' : 'var(--adm-bg-input)',
                border: `1px solid ${hasTasks ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
              }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 900, color: hasTasks ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                  {hour}
                </span>
                <span style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                  {hourTasks.length} {hourTasks.length === 1 ? 'contato' : 'contatos'}
                </span>
              </div>

              {/* Slots de 15 Minutos (Cabem até 4 cards no grid) */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {hasTasks ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '12px',
                  }}>
                    {hourTasks.map(task => {
                      const isCompleted = task.status === 'completed';
                      const lead = leads.find(l => l.id === task.leadId);
                      const assignedCollab = collaborators.find(c => (task.assignedToIds || []).includes(c.id));
                      const cleanPhone = lead?.phone ? lead.phone.replace(/\D/g, '') : '';
                      const waPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

                      return (
                        <div
                          key={task.id}
                          style={{
                            background: isCompleted ? 'rgba(16, 185, 129, 0.06)' : 'var(--adm-bg-input)',
                            border: isCompleted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--adm-border)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            position: 'relative',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          }}
                        >
                          {/* Card Top: Time Pill + Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              background: 'rgba(20, 169, 215, 0.15)',
                              color: 'var(--adm-accent)',
                              border: '1px solid rgba(20, 169, 215, 0.3)',
                              padding: '2px 7px',
                              borderRadius: '6px',
                            }}>
                              {task.dueTime || hour} (~15 min)
                            </span>

                            {/* Quick Complete Toggle */}
                            <button
                              type="button"
                              onClick={() => handleQuickComplete(task)}
                              title={isCompleted ? 'Concluído' : 'Marcar como concluído'}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: isCompleted ? '#10B981' : 'transparent',
                                border: `1.5px solid ${isCompleted ? '#10B981' : 'var(--adm-border)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              {isCompleted && <CheckCircle2 size={14} color="#FFFFFF" />}
                            </button>
                          </div>

                          {/* Lead Name & Info */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.86rem',
                              fontWeight: 800,
                              color: isCompleted ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {lead ? lead.name : task.leadName || 'Contato sem lead'}
                            </div>

                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                              {task.title}
                            </div>
                          </div>

                          {/* Collaborator info */}
                          {assignedCollab && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                              <img
                                src={assignedCollab.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedCollab.name)}&background=14A9D7&color=FFFFFF`}
                                alt={assignedCollab.name}
                                style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <span>{assignedCollab.name}</span>
                            </div>
                          )}

                          {/* Card Footer: WhatsApp Button & Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto', paddingTop: '4px' }}>
                            {lead && cleanPhone && (
                              <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(37, 211, 102, 0.14)',
                                  border: '1px solid rgba(37, 211, 102, 0.4)',
                                  color: '#25D366',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                }}
                              >
                                <WhatsAppBrandIcon size={12} />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            {lead && onOpenLead && (
                              <button
                                type="button"
                                onClick={() => onOpenLead(lead.id)}
                                title="Abrir Ficha no CRM"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--adm-border)',
                                  color: 'var(--adm-text-muted)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <ExternalLink size={11} />
                                <span>Ficha</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedTask(task)}
                              style={{
                                marginLeft: 'auto',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--adm-accent)',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              Detalhes
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: '1px dashed var(--adm-border)',
                    borderRadius: '10px',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.74rem',
                  }}>
                    <span>Nenhum follow-up agendado para o bloco de {hour}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenNewAtHour(hour)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-accent)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={12} />
                      <span>Agendar às {hour}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notion-Style Task Modal */}
      {selectedTask && (
        <AdminTaskDetailModal
          isOpen={Boolean(selectedTask)}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onOpenLead={onOpenLead}
          workspaceContext="followup"
          initialDatabaseId="db_followup"
        />
      )}

      {/* Create New Task Modal */}
      {isNewTaskModalOpen && (
        <AdminTaskDetailModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          task={null}
          initialDueDate={selectedDate}
          initialDueTime={defaultTaskTime}
          initialCustomType="Follow-up WhatsApp"
          initialDatabaseId="db_followup"
          workspaceContext="followup"
        />
      )}

      {/* Feedback Prompt on Complete */}
      <AdminTaskCompletionModal
        isOpen={Boolean(completingTaskId)}
        taskTitle={tasks.find(t => t.id === completingTaskId)?.title || 'Follow-up'}
        onClose={() => setCompletingTaskId(null)}
        onConfirm={(feedback) => {
          if (completingTaskId) {
            completeTaskWithFeedback(completingTaskId, feedback);
            setCompletingTaskId(null);
          }
        }}
      />
    </div>
  );
};
