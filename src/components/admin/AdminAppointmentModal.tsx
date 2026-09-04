import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Calendar, Clock, MapPin, FileText, UserCheck, AlertCircle, 
  UtensilsCrossed, Sparkles, Camera, Music, Flower2, Heart,
  CheckCircle2, Crown, Building2
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Appointment, AppointmentCategory, AppointmentStatus } from '../../types';

interface AdminAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetDebutanteId?: string;
  presetDate?: string;
  appointmentToEdit?: { debutanteId: string; appointment: Appointment } | null;
}

const CATEGORY_CONFIG: Record<AppointmentCategory, { label: string; icon: any; color: string }> = {
  'Buffet & Degustação': { label: 'Buffet & Degustação', icon: UtensilsCrossed, color: '#10B981' },
  'Vestido de Gala': { label: 'Vestido & Trajes', icon: Sparkles, color: '#EC4899' },
  'Maquiagem & Cabelo': { label: 'Maquiagem & Cabelo', icon: Heart, color: '#F43F5E' },
  'Decoração & Flores': { label: 'Decoração & Flores', icon: Flower2, color: '#8B5CF6' },
  'Ensaio Fotográfico': { label: 'Ensaio Fotográfico', icon: Camera, color: '#06B6D4' },
  'DJ & Pista': { label: 'DJ & Pista de Dança', icon: Music, color: '#F59E0B' },
  'Cerimonial': { label: 'Cerimonial & Roteiro', icon: FileText, color: '#3B82F6' },
};

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; icon: any; color: string; bg: string }> = {
  confirmed: { label: 'Confirmado', icon: CheckCircle2, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  scheduled: { label: 'Agendado', icon: Clock, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' },
  completed: { label: 'Concluído', icon: Sparkles, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
};

export const AdminAppointmentModal: React.FC<AdminAppointmentModalProps> = ({
  isOpen,
  onClose,
  presetDebutanteId,
  presetDate,
  appointmentToEdit,
}) => {
  const { debutantes, venues, collaborators, addAppointmentForDebutante, updateAppointmentForDebutante } = useAdminState();

  const [debutanteId, setDebutanteId] = useState(
    appointmentToEdit?.debutanteId || presetDebutanteId || debutantes[0]?.id || ''
  );
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AppointmentCategory>('Buffet & Degustação');
  const [date, setDate] = useState('2026-09-15');
  const [time, setTime] = useState('19:00');
  const [location, setLocation] = useState('Espaço Rio Lounge - Salão Nobre');
  const [status, setStatus] = useState<AppointmentStatus>('confirmed');
  const [notes, setNotes] = useState('');
  const [responsibleCollaboratorId, setResponsibleCollaboratorId] = useState<string>('');

  // Find currently selected debutante and venue
  const selectedDebutante = useMemo(() => {
    return debutantes.find(d => d.id === debutanteId || d.slug === debutanteId) || debutantes[0];
  }, [debutantes, debutanteId]);

  const selectedVenue = useMemo(() => {
    if (!selectedDebutante?.venueId) return null;
    return venues.find(v => v.id === selectedDebutante.venueId);
  }, [venues, selectedDebutante]);

  // Filter collaborators to prioritize pos_venda, master, crm
  const eligibleCollaborators = useMemo(() => {
    return [...collaborators].sort((a, b) => {
      const order: Record<string, number> = { pos_venda: 1, master: 2, crm: 3, closer: 4, sdr: 5 };
      return (order[a.role || ''] || 6) - (order[b.role || ''] || 6);
    });
  }, [collaborators]);

  useEffect(() => {
    if (appointmentToEdit) {
      setDebutanteId(appointmentToEdit.debutanteId);
      setTitle(appointmentToEdit.appointment.title);
      setCategory(appointmentToEdit.appointment.category);
      setDate(appointmentToEdit.appointment.date);
      setTime(appointmentToEdit.appointment.time);
      setLocation(appointmentToEdit.appointment.location);
      setStatus(appointmentToEdit.appointment.status);
      setNotes(appointmentToEdit.appointment.notes || '');
      setResponsibleCollaboratorId(appointmentToEdit.appointment.responsibleCollaboratorId || '');
    } else {
      const initialDebId = presetDebutanteId || debutantes[0]?.id || '';
      setDebutanteId(initialDebId);
      setTitle('Degustação do Menu de Gala');
      setCategory('Buffet & Degustação');
      setDate(presetDate || new Date().toISOString().split('T')[0]);
      setTime('19:00');
      setLocation(selectedVenue?.name ? `${selectedVenue.name} - Salão Nobre` : 'Espaço Realizar - Salão Nobre');
      setStatus('confirmed');
      setNotes('Reunião acompanhada dos pais para escolha dos pratos.');
      const defaultCollab = eligibleCollaborators[0]?.id || '';
      setResponsibleCollaboratorId(defaultCollab);
    }
  }, [appointmentToEdit, presetDebutanteId, presetDate, isOpen, debutantes, selectedVenue, eligibleCollaborators]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !debutanteId) return;

    const selectedCollab = collaborators.find(c => c.id === responsibleCollaboratorId);
    const responsibleName = selectedCollab?.name;
    const responsibleRole = selectedCollab?.role === 'master' 
      ? 'Gerente Geral / Master' 
      : selectedCollab?.role === 'pos_venda' 
      ? 'Especialista Pós-Venda' 
      : 'Responsável do Evento';
    const responsiblePhone = selectedCollab?.phone;

    if (appointmentToEdit) {
      updateAppointmentForDebutante(debutanteId, appointmentToEdit.appointment.id, {
        title: title.trim(),
        category,
        date,
        time,
        location: location.trim(),
        status,
        notes: notes.trim() || undefined,
        responsibleCollaboratorId: responsibleCollaboratorId || undefined,
        responsibleName,
        responsibleRole,
        responsiblePhone,
        venueId: selectedDebutante?.venueId,
      });
    } else {
      addAppointmentForDebutante(debutanteId, {
        title: title.trim(),
        category,
        date,
        time,
        location: location.trim(),
        status,
        notes: notes.trim() || undefined,
        responsibleCollaboratorId: responsibleCollaboratorId || undefined,
        responsibleName,
        responsibleRole,
        responsiblePhone,
        venueId: selectedDebutante?.venueId,
      });
    }

    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '9px 12px',
    color: 'var(--adm-text-title)',
    fontSize: '0.84rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--adm-text-title)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

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
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '24px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'var(--adm-bg-elevated)',
            border: '1px solid var(--adm-border)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--adm-accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              margin: 0,
              letterSpacing: '-0.3px',
            }}>
              {appointmentToEdit ? 'Editar Compromisso' : 'Agendar Novo Compromisso'}
            </h2>
            <p style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', margin: 0 }}>
              Sincronização imediata na agenda corporativa e no app da debutante.
            </p>
          </div>
        </div>

        {debutantes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <AlertCircle size={44} color="var(--adm-accent)" style={{ opacity: 0.7, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
              Nenhuma Aniversariante Cadastrada
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', maxWidth: '360px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
              Para agendar degustações e compromissos, é necessário cadastrar ao menos uma aniversariante primeiro.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-primary"
              style={{ padding: '8px 18px', borderRadius: '10px', fontWeight: 800, margin: '0 auto' }}
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            
            {/* 1. Card Personalizado da Debutante com Avatar & Detalhes */}
            <div>
              <label style={labelStyle}>
                Debutante / Aniversariante *
              </label>

              {!appointmentToEdit ? (
                <div style={{ marginBottom: '8px' }}>
                  <select
                    value={debutanteId}
                    onChange={(e) => setDebutanteId(e.target.value)}
                    style={inputStyle}
                  >
                    {debutantes.map(d => (
                      <option key={d.id} value={d.id} style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>
                        {d.name} • Festa: {d.partyDate ? d.partyDate.split('-').reverse().join('/') : 'A definir'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Visual Card da Debutante Selecionada */}
              {selectedDebutante && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.08) 0%, rgba(212, 175, 55, 0.06) 100%)',
                  border: '1px solid rgba(20, 169, 215, 0.25)',
                  borderRadius: '12px',
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #14A9D7 0%, #D4AF37 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '1rem',
                    flexShrink: 0,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}>
                    {selectedDebutante.avatarUrl ? (
                      <img 
                        src={selectedDebutante.avatarUrl} 
                        alt={selectedDebutante.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      selectedDebutante.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--adm-text-title)', fontWeight: 800 }}>
                        {selectedDebutante.name}
                      </strong>
                      <Crown size={12} color="#D4AF37" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={11} color="var(--adm-accent)" />
                        Festa: {selectedDebutante.partyDate ? selectedDebutante.partyDate.split('-').reverse().join('/') : 'A definir'}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={11} color="#D4AF37" />
                        {selectedVenue?.name || 'Espaço Realizar'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Título do Compromisso */}
            <div>
              <label style={labelStyle}>
                Título do Compromisso *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Prova do Vestido de Gala"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Categoria com Ícones Lucide */}
            <div>
              <label style={labelStyle}>
                Categoria do Compromisso
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                {(Object.keys(CATEGORY_CONFIG) as AppointmentCategory[]).map(catKey => {
                  const item = CATEGORY_CONFIG[catKey];
                  const Icon = item.icon;
                  const isSelected = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 10px',
                        background: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-bg-elevated)',
                        border: isSelected ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                    >
                      <Icon size={14} color={isSelected ? 'var(--adm-accent)' : item.color} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status com Símbolos e Cores */}
            <div>
              <label style={labelStyle}>
                Status do Compromisso
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(stKey => {
                  const item = STATUS_CONFIG[stKey];
                  const Icon = item.icon;
                  const isSelected = status === stKey;
                  return (
                    <button
                      key={stKey}
                      type="button"
                      onClick={() => setStatus(stKey)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        background: isSelected ? item.bg : 'var(--adm-bg-elevated)',
                        border: isSelected ? `1.5px solid ${item.color}` : '1px solid var(--adm-border)',
                        borderRadius: '16px',
                        color: isSelected ? item.color : 'var(--adm-text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={13} color={item.color} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data & Horário com Datepicker Limpo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>
                  Data do Evento *
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px', pointerEvents: 'none' }} />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: '36px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Horário *
                </label>
                <div style={{ position: 'relative' }}>
                  <Clock size={15} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px', pointerEvents: 'none' }} />
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: '36px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Colaborador Responsável (Pós-Venda, Gerente ou Master com Avatar) */}
            <div>
              <label style={labelStyle}>
                Colaborador / Responsável pelo Atendimento
              </label>
              <div style={{ position: 'relative' }}>
                <UserCheck size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px', pointerEvents: 'none' }} />
                <select
                  value={responsibleCollaboratorId}
                  onChange={(e) => setResponsibleCollaboratorId(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '38px', cursor: 'pointer' }}
                >
                  <option value="" style={{ background: 'var(--adm-bg-card)' }}>Selecione o Responsável...</option>
                  {eligibleCollaborators.map(c => {
                    const roleLabel = c.role === 'master' 
                      ? 'Gerente Geral' 
                      : c.role === 'pos_venda' 
                      ? 'Pós-Venda' 
                      : c.role === 'crm' 
                      ? 'Gestor CRM' 
                      : c.role === 'closer'
                      ? 'Closer Comercial'
                      : 'Consultor Comercial';
                    return (
                      <option key={c.id} value={c.id} style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>
                        {c.name} — {roleLabel} ({c.phone || 'Sem WhatsApp'})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Local */}
            <div>
              <label style={labelStyle}>
                Local / Endereço
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Ex: Espaço Rio Lounge - Salão Nobre"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                  }}
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label style={labelStyle}>
                Instruções / Observações
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <textarea
                  rows={2}
                  placeholder="Recomendações para a debutante, trajes ou o que levar..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                    resize: 'vertical',
                    minHeight: '60px',
                  }}
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                className="adm-btn-secondary"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="adm-btn-primary"
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                }}
              >
                {appointmentToEdit ? 'Salvar Alterações' : 'Salvar Compromisso'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
