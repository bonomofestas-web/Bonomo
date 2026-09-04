import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CheckSquare, 
  Phone, Users, Utensils, MessageSquare, Briefcase,
  Check, Calendar, Clock, ChevronDown, Search, Target, Crown
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { AdminTask, TaskPriority, TaskType } from '../../types/admin';

interface AdminTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: AdminTask | null;
  presetLeadId?: string;
  presetDebutanteId?: string;
}

export const AdminTaskModal: React.FC<AdminTaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  presetLeadId,
  presetDebutanteId,
}) => {
  const { 
    currentUser, 
    collaborators, 
    leads, 
    debutantes, 
    addTask, 
    updateTask 
  } = useAdminState();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('14:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [type, setType] = useState<TaskType>('general');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedDebutanteId, setSelectedDebutanteId] = useState<string>('');
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [isDebDropdownOpen, setIsDebDropdownOpen] = useState(false);
  const [debSearchQuery, setDebSearchQuery] = useState('');

  const leadDropdownRef = useRef<HTMLDivElement>(null);
  const debDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setDueDate(taskToEdit.dueDate);
      setDueTime(taskToEdit.dueTime || '14:00');
      setPriority(taskToEdit.priority);
      setType(taskToEdit.type || 'general');
      setAssignedToIds(taskToEdit.assignedToIds || []);
      setSelectedLeadId(taskToEdit.leadId || '');
      setSelectedDebutanteId(taskToEdit.debutanteId || '');
      setSelectedVenueId(taskToEdit.venueId || '');
    } else {
      setTitle('');
      setDescription('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setDueTime('14:00');
      setPriority('medium');
      setType('call');
      setAssignedToIds(currentUser ? [currentUser.id] : []);
      setSelectedLeadId(presetLeadId || '');
      setSelectedDebutanteId(presetDebutanteId || '');
      setSelectedVenueId('');
    }
    setIsLeadDropdownOpen(false);
    setIsDebDropdownOpen(false);
    setLeadSearchQuery('');
    setDebSearchQuery('');
  }, [isOpen, taskToEdit, presetLeadId, presetDebutanteId, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leadDropdownRef.current && !leadDropdownRef.current.contains(event.target as Node)) {
        setIsLeadDropdownOpen(false);
      }
      if (debDropdownRef.current && !debDropdownRef.current.contains(event.target as Node)) {
        setIsDebDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const isManager = currentUser?.role === 'master' || currentUser?.role === 'admin';

  const toggleCollaborator = (collabId: string) => {
    if (!isManager && collabId === currentUser?.id) {
      return;
    }
    setAssignedToIds(prev => 
      prev.includes(collabId) ? prev.filter(id => id !== collabId) : [...prev, collabId]
    );
  };

  const handleSetQuickDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const selectedLead = leads.find(l => l.id === selectedLeadId);
  const selectedDebutante = debutantes.find(d => d.id === selectedDebutanteId);

  const filteredLeads = leads.filter(l => {
    const q = leadSearchQuery.toLowerCase();
    return (l.name || '').toLowerCase().includes(q) || ((l.partyDate || '')).includes(q) || (l.phone || '').includes(q);
  });

  const filteredDebutantes = debutantes.filter(d => {
    const q = debSearchQuery.toLowerCase();
    return (d.name || '').toLowerCase().includes(q) || (d.partyDate || '').includes(q);
  });

  const formatPartyDate = (dStr?: string) => {
    if (!dStr) return 'Data a definir';
    try {
      const [y, m, d] = dStr.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return dStr;
    } catch {
      return dStr;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const lead = leads.find(l => l.id === selectedLeadId);
    const debutante = debutantes.find(d => d.id === selectedDebutanteId);

    let finalAssignedIds = assignedToIds;
    if (!isManager && currentUser?.id && !finalAssignedIds.includes(currentUser.id)) {
      finalAssignedIds = [...finalAssignedIds, currentUser.id];
    }
    if (finalAssignedIds.length === 0) {
      finalAssignedIds = [currentUser?.id || 'master'];
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      dueTime,
      priority,
      type,
      status: taskToEdit ? taskToEdit.status : 'todo' as const,
      createdById: currentUser?.id || 'master',
      createdByName: currentUser?.name || 'Diretoria',
      assignedToIds: finalAssignedIds,
      leadId: selectedLeadId || undefined,
      leadName: lead?.name,
      debutanteId: selectedDebutanteId || undefined,
      debutanteName: debutante?.name,
      venueId: selectedVenueId || lead?.venueId || debutante?.venueId || undefined,
    };

    if (taskToEdit) {
      updateTask(taskToEdit.id, taskData);
    } else {
      addTask(taskData);
    }
    onClose();
  };

  return (
    <div className="admin-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div className="admin-modal-content" style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-input)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckSquare size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '1px 0 0 0' }}>
                {taskToEdit ? 'Atualize os dados e prazos da tarefa' : 'Agende uma ação comercial ou operacional'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Título da Tarefa *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ligar para confirmar visita, Enviar proposta personalizada..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontWeight: 600,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Tipo de Ação
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {[
                  { id: 'call', label: 'Ligar', icon: <Phone size={13} /> },
                  { id: 'followup', label: 'WhatsApp', icon: <MessageSquare size={13} /> },
                  { id: 'meeting', label: 'Reunião', icon: <Users size={13} /> },
                  { id: 'tasting', label: 'Degustação', icon: <Utensils size={13} /> },
                  { id: 'general', label: 'Geral', icon: <Briefcase size={13} /> },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as TaskType)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      background: type === t.id ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                      border: `1px solid ${type === t.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                      color: type === t.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                      borderRadius: '10px',
                      padding: '8px 4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Nível de Prioridade
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'low', label: 'Baixa', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
                  { id: 'medium', label: 'Média', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
                  { id: 'high', label: 'Alta / Urgente', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as TaskPriority)}
                    style={{
                      background: priority === p.id ? p.bg : 'var(--adm-bg-input)',
                      border: `1.5px solid ${priority === p.id ? p.color : 'var(--adm-border)'}`,
                      color: priority === p.id ? p.color : 'var(--adm-text-muted)',
                      borderRadius: '10px',
                      padding: '8px 4px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} color="var(--adm-accent)" />
                    <span>Data Limite *</span>
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(0)}
                      style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '6px', padding: '2px 6px', fontSize: '0.62rem', color: 'var(--adm-text-muted)', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(1)}
                      style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '6px', padding: '2px 6px', fontSize: '0.62rem', color: 'var(--adm-text-muted)', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Amanhã
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.8rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} color="var(--adm-accent)" />
                    <span>Horário</span>
                  </label>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {['09:00', '14:00', '18:00'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDueTime(t)}
                        style={{
                          background: dueTime === t ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                          border: `1px solid ${dueTime === t ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                          borderRadius: '6px',
                          padding: '2px 5px',
                          fontSize: '0.62rem',
                          color: dueTime === t ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.8rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            <div ref={leadDropdownRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Target size={13} color="#60A5FA" />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Vincular a Lead (CRM)</span>
              </div>

              {presetLeadId && selectedLead ? (
                <div style={{
                  background: 'rgba(96, 165, 250, 0.12)',
                  border: '1px solid rgba(96, 165, 250, 0.4)',
                  borderRadius: '12px',
                  padding: '9px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#60A5FA' }}>
                      {selectedLead.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                      • Festa: {formatPartyDate(selectedLead.partyDate)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.64rem', background: 'rgba(96, 165, 250, 0.2)', color: '#60A5FA', padding: '2px 8px', borderRadius: '20px', fontWeight: 800 }}>
                    Vinculado
                  </span>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => setIsLeadDropdownOpen(!isLeadDropdownOpen)}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: `1px solid ${isLeadDropdownOpen ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                      borderRadius: '12px',
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: selectedLead ? 'var(--adm-text-title)' : 'var(--adm-text-muted)', fontWeight: selectedLead ? 600 : 500 }}>
                      {selectedLead ? (
                        <><span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Target size={12} color="#3B82F6" /> {selectedLead.name}</span> <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.72rem', fontWeight: 500 }}>• Festa: {formatPartyDate(selectedLead.partyDate)}</span></>
                      ) : (
                        'Nenhum lead selecionado (Opcional)'
                      )}
                    </span>
                    <ChevronDown size={14} color="var(--adm-text-muted)" style={{ transform: isLeadDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {isLeadDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '14px',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                      zIndex: 1200,
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      maxHeight: '220px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--adm-bg-input)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        marginBottom: '4px',
                        border: '1px solid var(--adm-border)',
                      }}>
                        <Search size={12} color="var(--adm-text-muted)" />
                        <input
                          type="text"
                          placeholder="Buscar por nome ou data..."
                          value={leadSearchQuery}
                          onChange={(e) => setLeadSearchQuery(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--adm-text-title)',
                            fontSize: '0.74rem',
                            width: '100%',
                          }}
                        />
                      </div>

                      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div
                          onClick={() => {
                            setSelectedLeadId('');
                            setIsLeadDropdownOpen(false);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            color: !selectedLeadId ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                            background: !selectedLeadId ? 'var(--adm-accent-bg)' : 'transparent',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <X size={12} /> Nenhum lead (Tarefa geral)
                        </div>

                        {filteredLeads.map(l => (
                          <div
                            key={l.id}
                            onClick={() => {
                              setSelectedLeadId(l.id);
                              setIsLeadDropdownOpen(false);
                            }}
                            style={{
                              padding: '7px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: selectedLeadId === l.id ? 'var(--adm-accent-bg)' : 'transparent',
                              border: selectedLeadId === l.id ? '1px solid var(--adm-accent)' : '1px solid transparent',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                {l.name}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                                Festa: {formatPartyDate(l.partyDate)} {l.phone ? `• ${l.phone}` : ''}
                              </span>
                            </div>
                            {selectedLeadId === l.id && <Check size={14} color="var(--adm-accent)" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div ref={debDropdownRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Crown size={13} color="var(--adm-accent)" />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Vincular a Debutante (Opcional)</span>
              </div>

              <div
                onClick={() => setIsDebDropdownOpen(!isDebDropdownOpen)}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: `1px solid ${isDebDropdownOpen ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                  borderRadius: '12px',
                  padding: '9px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: selectedDebutante ? 'var(--adm-text-title)' : 'var(--adm-text-muted)', fontWeight: selectedDebutante ? 600 : 500 }}>
                  {selectedDebutante ? (
                    <><span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Crown size={12} color="#F472B6" /> {selectedDebutante.name}</span> <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.72rem', fontWeight: 500 }}>• Festa: {formatPartyDate(selectedDebutante.partyDate)}</span></>
                  ) : (
                    'Nenhuma debutante selecionada (Opcional)'
                  )}
                </span>
                <ChevronDown size={14} color="var(--adm-text-muted)" style={{ transform: isDebDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {isDebDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                  zIndex: 1200,
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '220px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--adm-bg-input)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    marginBottom: '4px',
                    border: '1px solid var(--adm-border)',
                  }}>
                    <Search size={12} color="var(--adm-text-muted)" />
                    <input
                      type="text"
                      placeholder="Buscar debutante..."
                      value={debSearchQuery}
                      onChange={(e) => setDebSearchQuery(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.74rem',
                        width: '100%',
                      }}
                    />
                  </div>

                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div
                      onClick={() => {
                        setSelectedDebutanteId('');
                        setIsDebDropdownOpen(false);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        color: !selectedDebutanteId ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                        background: !selectedDebutanteId ? 'var(--adm-accent-bg)' : 'transparent',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <X size={12} /> Nenhuma debutante
                    </div>

                    {filteredDebutantes.map(d => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDebutanteId(d.id);
                          setIsDebDropdownOpen(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: selectedDebutanteId === d.id ? 'var(--adm-accent-bg)' : 'transparent',
                          border: selectedDebutanteId === d.id ? '1px solid var(--adm-accent)' : '1px solid transparent',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            {d.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                            Festa: {formatPartyDate(d.partyDate)}
                          </span>
                        </div>
                        {selectedDebutanteId === d.id && <Check size={14} color="var(--adm-accent)" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                  Responsáveis Atribuídos
                </label>
              </div>
              <div style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxHeight: '130px',
                overflowY: 'auto',
              }}>
                {collaborators.map(c => {
                  const isCurrentUser = c.id === currentUser?.id;
                  const isSelected = assignedToIds.includes(c.id) || (!isManager && isCurrentUser);
                  const isLocked = !isManager && isCurrentUser;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => toggleCollaborator(c.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isSelected ? 'var(--adm-accent-bg)' : 'transparent',
                        border: `1px solid ${isSelected ? 'var(--adm-accent)' : 'transparent'}`,
                        borderRadius: '8px',
                        padding: '6px 10px',
                        cursor: isLocked ? 'default' : 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(212, 175, 55, 0.2)', color: 'var(--adm-accent)', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                          {c.name}
                        </span>
                      </div>
                      {isSelected && <Check size={14} color="var(--adm-accent)" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Observações / Instruções
              </label>
              <textarea
                rows={3}
                placeholder="Detalhes adicionais, pauta da reunião, dados de contato..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '9px 12px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--adm-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--adm-bg-card)',
          }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.82rem',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                padding: '9px 24px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.84rem',
              }}
            >
              {taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
