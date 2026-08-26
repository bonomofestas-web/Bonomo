import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, FileText, UserCheck, AlertCircle } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Appointment, AppointmentCategory, AppointmentStatus } from '../../types';

interface AdminAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetDebutanteId?: string;
  presetDate?: string;
  appointmentToEdit?: { debutanteId: string; appointment: Appointment } | null;
}

export const AdminAppointmentModal: React.FC<AdminAppointmentModalProps> = ({
  isOpen,
  onClose,
  presetDebutanteId,
  presetDate,
  appointmentToEdit,
}) => {
  const { debutantes, collaborators, addAppointmentForDebutante, updateAppointmentForDebutante } = useAdminState();

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
      setDebutanteId(presetDebutanteId || debutantes[0]?.id || '');
      setTitle('Degustação do Menu de Gala');
      setCategory('Buffet & Degustação');
      setDate(presetDate || new Date().toISOString().split('T')[0]);
      setTime('19:00');
      setLocation('Espaço Rio Lounge - Salão Nobre');
      setStatus('confirmed');
      setNotes('Reunião acompanhada dos pais para escolha dos pratos.');
      setResponsibleCollaboratorId(collaborators[0]?.id || '');
    }
  }, [appointmentToEdit, presetDebutanteId, presetDate, isOpen, debutantes, collaborators]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !debutanteId) return;

    const selectedCollab = collaborators.find(c => c.id === responsibleCollaboratorId);
    const responsibleName = selectedCollab?.name;
    const responsibleRole = selectedCollab?.role === 'admin' ? 'Gerente do Evento' : 'Especialista em Degustação';
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
      });
    }

    onClose();
  };

  const categories: AppointmentCategory[] = [
    'Buffet & Degustação',
    'Vestido de Gala',
    'Maquiagem & Cabelo',
    'Decoração & Flores',
    'Ensaio Fotográfico',
    'DJ & Pista',
    'Cerimonial',
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '10px 14px',
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
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
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
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--adm-accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <Calendar size={20} />
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {appointmentToEdit ? 'Editar Compromisso' : 'Agendar Compromisso'}
          </h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '20px' }}>
          Este evento sincronizará instantaneamente na timeline da debutante.
        </p>

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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Aniversariante */}
            <div>
              <label style={labelStyle}>
                Debutante / Aniversariante *
              </label>
              <select
                value={debutanteId}
                onChange={(e) => setDebutanteId(e.target.value)}
                disabled={Boolean(appointmentToEdit)}
                style={inputStyle}
              >
                {debutantes.map(d => (
                  <option key={d.id} value={d.id} style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>
                    {d.name} ({d.partyDate.split('-').reverse().join('/')})
                  </option>
                ))}
              </select>
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

            {/* Categoria & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AppointmentCategory)}
                  style={inputStyle}
                >
                  {categories.map(c => (
                    <option key={c} value={c} style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  style={inputStyle}
                >
                  <option value="confirmed">Confirmado</option>
                  <option value="pending">Pendente</option>
                  <option value="rescheduled">Reagendado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>

            {/* Data & Hora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>
                  Data do Evento *
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: '38px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Horário *
                </label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: '38px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Colaborador Responsável pelo Atendimento */}
            <div>
              <label style={labelStyle}>
                Colaborador / Responsável pelo Atendimento
              </label>
              <div style={{ position: 'relative' }}>
                <UserCheck size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <select
                  value={responsibleCollaboratorId}
                  onChange={(e) => setResponsibleCollaboratorId(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '38px' }}
                >
                  <option value="" style={{ background: 'var(--adm-bg-card)' }}>Selecione o Responsável...</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id} style={{ background: 'var(--adm-bg-card)' }}>
                      {c.name} — {c.role === 'admin' ? 'Gerente' : 'Especialista'} ({c.phone || 'Sem telefone'})
                    </option>
                  ))}
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
                    minHeight: '65px',
                  }}
                />
              </div>
            </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
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
