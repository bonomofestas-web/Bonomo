import React, { useState } from 'react';
import { 
  X, Calendar, Clock, Trash2, ShieldAlert, 
  Check, Sliders, RefreshCw
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { 
  VenueAgendaConfig, 
  AgendaRecurringRule, 
  AgendaDateOverride 
} from '../../types/admin';
import { 
  DEFAULT_VISITS_RULE, 
  DEFAULT_TASTINGS_RULE,
  agendaAvailabilityService 
} from '../../services/agendaAvailabilityService';

interface AdminAgendaAvailabilityModalProps {
  venueId?: string;
  initialTab?: 'visits' | 'tastings' | 'overrides';
  onClose: () => void;
  onSaved?: () => void;
}

const DAYS_OF_WEEK = [
  { id: 0, label: 'Domingo', short: 'Dom' },
  { id: 1, label: 'Segunda', short: 'Seg' },
  { id: 2, label: 'Terça', short: 'Ter' },
  { id: 3, label: 'Quarta', short: 'Qua' },
  { id: 4, label: 'Quinta', short: 'Qui' },
  { id: 5, label: 'Sexta', short: 'Sex' },
  { id: 6, label: 'Sábado', short: 'Sáb' },
];

export const AdminAgendaAvailabilityModal: React.FC<AdminAgendaAvailabilityModalProps> = ({
  venueId,
  initialTab,
  onClose,
  onSaved,
}) => {
  const { venues, currentUser, venueAgendaConfigs, updateVenueAgendaConfig } = useAdminState();

  const selectedVenueId = venueId || (venues[0]?.id || 'all');
  const existingConfig = venueAgendaConfigs.find(c => c.venueId === selectedVenueId) 
    || agendaAvailabilityService.getDefaultConfig(selectedVenueId);

  const [activeTab, setActiveTab] = useState<'visits' | 'tastings' | 'overrides'>(initialTab || 'visits');

  // Regras de Visitas
  const [visitsRule, setVisitsRule] = useState<AgendaRecurringRule>({
    enabledDays: existingConfig.visitsRule?.enabledDays || DEFAULT_VISITS_RULE.enabledDays,
    timeSlots: existingConfig.visitsRule?.timeSlots || DEFAULT_VISITS_RULE.timeSlots,
    durationMinutes: existingConfig.visitsRule?.durationMinutes || DEFAULT_VISITS_RULE.durationMinutes,
    maxConcurrentPerSlot: existingConfig.visitsRule?.maxConcurrentPerSlot || DEFAULT_VISITS_RULE.maxConcurrentPerSlot,
    maxPaxPerSlot: existingConfig.visitsRule?.maxPaxPerSlot || DEFAULT_VISITS_RULE.maxPaxPerSlot,
  });

  // Regras de Degustações
  const [tastingsRule, setTastingsRule] = useState<AgendaRecurringRule>({
    enabledDays: existingConfig.tastingsRule?.enabledDays || DEFAULT_TASTINGS_RULE.enabledDays,
    timeSlots: existingConfig.tastingsRule?.timeSlots || DEFAULT_TASTINGS_RULE.timeSlots,
    durationMinutes: existingConfig.tastingsRule?.durationMinutes || DEFAULT_TASTINGS_RULE.durationMinutes,
    maxConcurrentPerSlot: existingConfig.tastingsRule?.maxConcurrentPerSlot || DEFAULT_TASTINGS_RULE.maxConcurrentPerSlot,
    maxPaxPerSlot: existingConfig.tastingsRule?.maxPaxPerSlot || DEFAULT_TASTINGS_RULE.maxPaxPerSlot,
  });

  // Bloqueios de Datas Específicas
  const [dateOverrides, setDateOverrides] = useState<AgendaDateOverride[]>(
    existingConfig.dateOverrides || []
  );

  // Estados locais para adição rápida de slot
  const [newVisitTime, setNewVisitTime] = useState('');
  const [newTastingTime, setNewTastingTime] = useState('');

  // Estados para novo bloqueio de data
  const [blockDateInput, setBlockDateInput] = useState('');
  const [blockReasonInput, setBlockReasonInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const canEdit = currentUser?.role === 'master' || currentUser?.role === 'dev' || currentUser?.role === 'admin';

  const handleSave = async () => {
    if (!canEdit) {
      alert('Apenas Gerentes, Master ou Administradores podem configurar a disponibilidade da agenda.');
      return;
    }

    setIsSaving(true);
    const updatedConfig: VenueAgendaConfig = {
      id: existingConfig.id,
      venueId: selectedVenueId,
      visitsRule,
      tastingsRule,
      dateOverrides,
      updatedAt: new Date().toISOString(),
    };

    const ok = await updateVenueAgendaConfig(updatedConfig);
    setIsSaving(false);
    if (ok) {
      if (onSaved) onSaved();
      onClose();
    } else {
      alert('Erro ao salvar configurações no banco de dados. As preferências foram salvas localmente.');
      onClose();
    }
  };

  const toggleVisitDay = (dayId: number) => {
    setVisitsRule(prev => {
      const exists = prev.enabledDays.includes(dayId);
      const nextDays = exists 
        ? prev.enabledDays.filter(d => d !== dayId)
        : [...prev.enabledDays, dayId].sort();
      return { ...prev, enabledDays: nextDays };
    });
  };

  const toggleTastingDay = (dayId: number) => {
    setTastingsRule(prev => {
      const exists = prev.enabledDays.includes(dayId);
      const nextDays = exists 
        ? prev.enabledDays.filter(d => d !== dayId)
        : [...prev.enabledDays, dayId].sort();
      return { ...prev, enabledDays: nextDays };
    });
  };

  const addVisitTime = () => {
    if (!newVisitTime.trim()) return;
    if (visitsRule.timeSlots.includes(newVisitTime.trim())) return;
    setVisitsRule(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, newVisitTime.trim()].sort(),
    }));
    setNewVisitTime('');
  };

  const removeVisitTime = (time: string) => {
    setVisitsRule(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(t => t !== time),
    }));
  };

  const addTastingTime = () => {
    if (!newTastingTime.trim()) return;
    if (tastingsRule.timeSlots.includes(newTastingTime.trim())) return;
    setTastingsRule(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, newTastingTime.trim()].sort(),
    }));
    setNewTastingTime('');
  };

  const removeTastingTime = (time: string) => {
    setTastingsRule(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(t => t !== time),
    }));
  };

  const addDateBlock = () => {
    if (!blockDateInput) return;
    if (dateOverrides.some(o => o.date === blockDateInput)) {
      alert('Esta data já possui uma regra ou bloqueio cadastrado.');
      return;
    }
    setDateOverrides(prev => [
      ...prev,
      {
        date: blockDateInput,
        isBlocked: true,
        reason: blockReasonInput.trim() || 'Bloqueio Gerencial',
      }
    ].sort((a, b) => a.date.localeCompare(b.date)));
    setBlockDateInput('');
    setBlockReasonInput('');
  };

  const removeDateBlock = (date: string) => {
    setDateOverrides(prev => prev.filter(o => o.date !== date));
  };

  const venueName = venues.find(v => v.id === selectedVenueId)?.name || 'Todas as Unidades';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '16px',
    }}>
      <div style={{
        background: '#0D1522',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3B82F6',
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Disponibilidade da Agenda
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0 0' }}>
                Unidade: <strong style={{ color: '#60A5FA' }}>{venueName}</strong> • Defina datas, horários e capacidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px 0 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('visits')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'visits' ? '2px solid #3B82F6' : '2px solid transparent',
              color: activeTab === 'visits' ? '#60A5FA' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.80rem',
              fontWeight: activeTab === 'visits' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Calendar size={14} />
            <span>Visitas Comerciais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tastings')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tastings' ? '2px solid #F472B6' : '2px solid transparent',
              color: activeTab === 'tastings' ? '#F472B6' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.80rem',
              fontWeight: activeTab === 'tastings' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={14} />
            <span>Degustações Gastronômicas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overrides')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'overrides' ? '2px solid #EAB308' : '2px solid transparent',
              color: activeTab === 'overrides' ? '#FBBF24' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.80rem',
              fontWeight: activeTab === 'overrides' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldAlert size={14} />
            <span>Bloqueios & Exceções ({dateOverrides.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* TAB 1: VISITAS COMERCIAIS */}
          {activeTab === 'visits' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '10px', padding: '12px 14px' }}>
                <span style={{ fontSize: '0.78rem', color: '#93C5FD', fontWeight: 600, lineHeight: 1.4 }}>
                  ⚙️ Configure a regra semanal recorrente para visitas ao espaço. O time comercial só poderá agendar nos dias e horários liberados abaixo.
                </span>
              </div>

              {/* Dias da Semana */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                  Dias da Semana Permitidos
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DAYS_OF_WEEK.map(d => {
                    const isSelected = visitsRule.enabledDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleVisitDay(d.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? '#3B82F6' : 'rgba(255, 255, 255, 0.12)'}`,
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: isSelected ? '#60A5FA' : 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horários / Slots */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                  Horários Permitidos (Slots Fixos)
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {visitsRule.timeSlots.map(time => (
                    <div
                      key={time}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                      }}
                    >
                      <span>{time}</span>
                      <button
                        type="button"
                        onClick={() => removeVisitTime(time)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', maxWidth: '240px' }}>
                  <input
                    type="time"
                    value={newVisitTime}
                    onChange={e => setNewVisitTime(e.target.value)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      flex: 1,
                    }}
                  />
                  <button
                    type="button"
                    onClick={addVisitTime}
                    style={{
                      background: '#3B82F6',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Duração e Vagas Simultâneas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '4px' }}>
                    Duração Estimada (minutos)
                  </label>
                  <input
                    type="number"
                    value={visitsRule.durationMinutes}
                    onChange={e => setVisitsRule({ ...visitsRule, durationMinutes: Number(e.target.value) || 45 })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '4px' }}>
                    Capacidade por Horário (Vagas)
                  </label>
                  <input
                    type="number"
                    value={visitsRule.maxConcurrentPerSlot}
                    onChange={e => setVisitsRule({ ...visitsRule, maxConcurrentPerSlot: Number(e.target.value) || 1 })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEGUSTAÇÕES */}
          {activeTab === 'tastings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(244, 114, 182, 0.08)', border: '1px solid rgba(244, 114, 182, 0.2)', borderRadius: '10px', padding: '12px 14px' }}>
                <span style={{ fontSize: '0.78rem', color: '#F9A8D4', fontWeight: 600, lineHeight: 1.4 }}>
                  🍽️ Configure as sessões oficiais de degustação de cardápio. Você pode estipular os dias (ex: Quartas), os horários e o limite máximo total de PAX por noite.
                </span>
              </div>

              {/* Dias da Semana */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                  Dias da Semana Permitidos para Degustação
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DAYS_OF_WEEK.map(d => {
                    const isSelected = tastingsRule.enabledDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleTastingDay(d.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? '#F472B6' : 'rgba(255, 255, 255, 0.12)'}`,
                          background: isSelected ? 'rgba(244, 114, 182, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: isSelected ? '#F472B6' : 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horários / Slots */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                  Horários Permitidos (Sessões)
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {tastingsRule.timeSlots.map(time => (
                    <div
                      key={time}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                      }}
                    >
                      <span>{time}</span>
                      <button
                        type="button"
                        onClick={() => removeTastingTime(time)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', maxWidth: '240px' }}>
                  <input
                    type="time"
                    value={newTastingTime}
                    onChange={e => setNewTastingTime(e.target.value)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      flex: 1,
                    }}
                  />
                  <button
                    type="button"
                    onClick={addTastingTime}
                    style={{
                      background: '#F472B6',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Famílias e Limite de PAX */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '4px' }}>
                    Máx. de Famílias por Horário
                  </label>
                  <input
                    type="number"
                    value={tastingsRule.maxConcurrentPerSlot}
                    onChange={e => setTastingsRule({ ...tastingsRule, maxConcurrentPerSlot: Number(e.target.value) || 1 })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '4px' }}>
                    Capacidade Total de PAX por Horário
                  </label>
                  <input
                    type="number"
                    value={tastingsRule.maxPaxPerSlot || 20}
                    onChange={e => setTastingsRule({ ...tastingsRule, maxPaxPerSlot: Number(e.target.value) || 20 })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BLOQUEIOS & EXCEÇÕES */}
          {activeTab === 'overrides' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
                <span style={{ fontSize: '0.78rem', color: '#FDE047', fontWeight: 600, lineHeight: 1.4 }}>
                  🚫 Bloqueie datas específicas (feriados, reformas ou eventos privados) sem alterar a regra recorrente semanal da casa.
                </span>
              </div>

              {/* Formulário de Novo Bloqueio */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FFFFFF' }}>Bloquear Data Específica</span>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '8px' }}>
                  <input
                    type="date"
                    value={blockDateInput}
                    onChange={e => setBlockDateInput(e.target.value)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Motivo (ex: Feriado Nacional, Manutenção)"
                    value={blockReasonInput}
                    onChange={e => setBlockReasonInput(e.target.value)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addDateBlock}
                    style={{
                      background: '#EAB308',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      color: '#000000',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Bloquear
                  </button>
                </div>
              </div>

              {/* Lista de Bloqueios Cadastrados */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                  Datas Bloqueadas ({dateOverrides.length})
                </label>
                {dateOverrides.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                    Nenhuma data bloqueada no momento.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dateOverrides.map(override => (
                      <div
                        key={override.date}
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FCA5A5' }}>
                            {override.date.split('-').reverse().join('/')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                            • {override.reason || 'Bloqueado'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDateBlock(override.date)}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                          title="Remover bloqueio"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.78rem',
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
              padding: '8px 20px',
              background: '#3B82F6',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            <span>Salvar Disponibilidade</span>
          </button>
        </div>
      </div>
    </div>
  );
};
