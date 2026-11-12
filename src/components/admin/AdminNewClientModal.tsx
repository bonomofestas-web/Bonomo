import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Check, Building2, Calendar, User, Phone, DollarSign, Clock, 
  Users, Sparkles, ChevronDown, ChevronLeft, ChevronRight, FileText, 
  Heart, Cake, Briefcase, GraduationCap, Zap, Sliders, Shield
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput } from '../../utils/phoneFormatter';

interface AdminNewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: (clientId: string) => void;
  defaultFunnelId?: string;
}

const EVENT_TYPE_OPTIONS = [
  { key: '', label: 'Não Definido / A Definir', icon: Sparkles },
  { key: '15 Anos', label: '15 Anos / Debutante', icon: Sparkles },
  { key: 'Infantil', label: 'Festa Infantil', icon: Cake },
  { key: 'Aniversário Adulto', label: 'Aniversário Adulto', icon: Cake },
  { key: 'Casamento', label: 'Casamento', icon: Heart },
  { key: 'Formatura', label: 'Formatura', icon: GraduationCap },
  { key: 'Corporativo', label: 'Corporativo', icon: Briefcase },
  { key: 'Outro', label: 'Outro Formato', icon: Sparkles },
];

const RELATIONSHIP_OPTIONS = [
  { key: 'mother', label: 'Mãe' },
  { key: 'father', label: 'Pai' },
  { key: 'guardian', label: 'Responsável Legal' },
  { key: 'spouse', label: 'Noivo(a) / Cônjuge' },
  { key: 'self', label: 'Próprio(a) Homenageado(a) / Contratante' },
  { key: 'other', label: 'Outro' },
];

export const AdminNewClientModal: React.FC<AdminNewClientModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
  defaultFunnelId,
}) => {
  const { venues, activeVenueId, addClient } = useAdminState();

  const getEffectiveVenueId = () => {
    if (activeVenueId && activeVenueId !== 'all' && venues.some(v => v.id === activeVenueId)) {
      return activeVenueId;
    }
    return venues[0]?.id || '';
  };

  // Modo: Rápido (padrão) vs Completo
  const [mode, setMode] = useState<'quick' | 'full'>('quick');

  // Campos Fundamentais (Iniciam 100% em branco, zero mock)
  const [eventType, setEventType] = useState('');
  const [venueId, setVenueId] = useState(getEffectiveVenueId);
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerRelationship, setPayerRelationship] = useState('mother');

  // Campos do Cadastro Completo / Condicionais
  const [birthdayPersonName, setBirthdayPersonName] = useState('');
  const [birthdayPersonAge, setBirthdayPersonAge] = useState<string>('');
  const [isSelfDecisor, setIsSelfDecisor] = useState(false);
  const [secondSpouseName, setSecondSpouseName] = useState('');
  const [payerCpf, setPayerCpf] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [guestCount, setGuestCount] = useState<string>('');
  const [packageSold, setPackageSold] = useState('');
  const [rawDealValue, setRawDealValue] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');

  // Dropdowns States
  const [isEventTypeDropdownOpen, setIsEventTypeDropdownOpen] = useState(false);
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);
  const [isRelDropdownOpen, setIsRelDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  const eventTypeRef = useRef<HTMLDivElement>(null);
  const venueRef = useRef<HTMLDivElement>(null);
  const relRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (eventTypeRef.current && !eventTypeRef.current.contains(target)) {
        setIsEventTypeDropdownOpen(false);
      }
      if (venueRef.current && !venueRef.current.contains(target)) {
        setIsVenueDropdownOpen(false);
      }
      if (relRef.current && !relRef.current.contains(target)) {
        setIsRelDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Formatação de Moeda
  const handleDealValueChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      setRawDealValue('');
      return;
    }
    const num = parseFloat(digits) / 100;
    setRawDealValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num));
  };

  const getNumericDealValue = (): number => {
    if (!rawDealValue) return 0;
    const clean = rawDealValue.replace(/\D/g, '');
    return clean ? parseFloat(clean) / 100 : 0;
  };

  // Mini Calendário Customizado
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Dias do mês anterior para completar semana
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Dias do próximo mês para fechar grid de 35 ou 42
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [calendarMonth]);

  const selectedVenue = venues.find(v => v.id === venueId);
  const selectedEventTypeObj = EVENT_TYPE_OPTIONS.find(o => o.key === eventType) || EVENT_TYPE_OPTIONS[0];
  const selectedRelObj = RELATIONSHIP_OPTIONS.find(o => o.key === payerRelationship) || RELATIONSHIP_OPTIONS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const effectivePayerName = payerName.trim() || (isSelfDecisor ? birthdayPersonName.trim() : '');
    const effectivePhone = payerPhone.trim();

    if (!effectivePayerName || !effectivePhone) {
      alert('Por favor informe o Nome do Responsável / Contratante e o WhatsApp.');
      return;
    }

    // Determina o nome do aniversariante/homenageado
    let effectiveHostName = birthdayPersonName.trim();
    if (mode === 'quick' && !effectiveHostName) {
      effectiveHostName = effectivePayerName;
    } else if (mode === 'full') {
      if (isSelfDecisor) {
        effectiveHostName = effectivePayerName;
      } else if (!effectiveHostName) {
        effectiveHostName = effectivePayerName;
      }
    }

    const newClientId = addClient({
      venueId,
      eventType: eventType || undefined,
      payerName: effectivePayerName,
      payerPhone: effectivePhone,
      payerRelationship: isSelfDecisor ? 'self' : (payerRelationship as any),
      payerCpf: payerCpf.trim() || undefined,
      payerEmail: payerEmail.trim() || undefined,
      birthdayPersonName: effectiveHostName,
      birthdayPersonAge: birthdayPersonAge ? Number(birthdayPersonAge) : (eventType === '15 Anos' ? 15 : undefined),
      eventDate: eventDate.trim() || undefined,
      eventTime: eventTime.trim() || undefined,
      guestCount: guestCount ? Number(guestCount) : undefined,
      packageSold: packageSold.trim() || undefined,
      dealValue: getNumericDealValue(),
      paymentTerms: paymentTerms.trim() || undefined,
      notes: notes.trim() || (secondSpouseName.trim() ? `2º Cônjuge: ${secondSpouseName.trim()}` : undefined),
      funnelId: defaultFunnelId,
      stage: 'onboarding',
    });

    if (onClientCreated) {
      onClientCreated(newClientId);
    }
    onClose();
  };

  const fieldInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--adm-border, #CBD5E1)',
    backgroundColor: 'var(--adm-bg-input, #F8FAFC)',
    color: 'var(--adm-text-title, #0F172A)',
    fontSize: '0.82rem',
    fontWeight: 500,
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--adm-text-title, #1E293B)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'var(--adm-bg-card, #FFFFFF)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: mode === 'quick' ? '520px' : '680px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--adm-text-body, #111827)',
        transition: 'max-width 0.2s ease',
      }}>
        {/* Header com Tabs de Alternância Rápido vs Completo */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'var(--adm-bg-surface, #F8FAFC)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                Novo Cliente • Pós-Venda
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #64748B)' }}>
                {mode === 'quick' ? 'Cadastro ágil: preencha apenas os dados essenciais para iniciar o atendimento.' : 'Cadastro detalhado: especifique dados contratuais, homenageado e cronograma.'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--adm-text-muted, #64748B)',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Switch Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--adm-bg-input, #E2E8F0)',
            padding: '3px',
            borderRadius: '8px',
            gap: '4px',
          }}>
            <button
              type="button"
              onClick={() => setMode('quick')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'quick' ? 'var(--adm-bg-card, #FFFFFF)' : 'transparent',
                color: mode === 'quick' ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-muted, #64748B)',
                fontWeight: mode === 'quick' ? 800 : 600,
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: mode === 'quick' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={13} />
              <span>Cadastro Rápido (Essencial)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('full')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'full' ? 'var(--adm-bg-card, #FFFFFF)' : 'transparent',
                color: mode === 'full' ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-muted, #64748B)',
                fontWeight: mode === 'full' ? 800 : 600,
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: mode === 'full' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Sliders size={13} />
              <span>Formulário Completo</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── CAMPO 1: TIPO DE EVENTO (Dropdown Elegante do Sistema - Presente em Ambos) ── */}
          <div style={{ position: 'relative' }} ref={eventTypeRef}>
            <label style={fieldLabelStyle}>
              <Sparkles size={13} color="#8B5CF6" />
              <span>Tipo de Evento</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 500, color: 'var(--adm-text-muted)' }}>(Opcional)</span>
            </label>

            <button
              type="button"
              onClick={() => setIsEventTypeDropdownOpen(!isEventTypeDropdownOpen)}
              style={{
                ...fieldInputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: isEventTypeDropdownOpen ? 'var(--adm-bg-card)' : fieldInputStyle.backgroundColor,
                borderColor: isEventTypeDropdownOpen ? 'var(--adm-accent)' : 'var(--adm-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: selectedEventTypeObj.key ? 'var(--adm-text-title)' : 'var(--adm-text-muted)' }}>
                  {selectedEventTypeObj.label}
                </span>
              </div>
              <ChevronDown size={14} color="var(--adm-text-muted)" style={{ transform: isEventTypeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {isEventTypeDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--adm-bg-card, #FFFFFF)',
                border: '1px solid var(--adm-border, #CBD5E1)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
                padding: '4px',
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}>
                {EVENT_TYPE_OPTIONS.map(opt => {
                  const isSel = eventType === opt.key;
                  const IconCmp = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setEventType(opt.key);
                        setIsEventTypeDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isSel ? 'var(--adm-accent-bg, rgba(2, 132, 199, 0.12))' : 'transparent',
                        color: isSel ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-title, #0F172A)',
                        fontWeight: isSel ? 700 : 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--adm-bg-hover, rgba(0,0,0,0.04))'; }}
                      onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconCmp size={13} />
                        <span>{opt.label}</span>
                      </div>
                      {isSel && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── CAMPO 2: UNIDADE / CASA DE FESTAS (Dropdown Elegante do Sistema) ── */}
          <div style={{ position: 'relative' }} ref={venueRef}>
            <label style={fieldLabelStyle}>
              <Building2 size={13} color="#3B82F6" />
              <span>Casa de Festas (Unidade) *</span>
            </label>

            <button
              type="button"
              onClick={() => setIsVenueDropdownOpen(!isVenueDropdownOpen)}
              style={{
                ...fieldInputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderColor: isVenueDropdownOpen ? 'var(--adm-accent)' : 'var(--adm-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  {selectedVenue?.name || 'Selecione uma casa'}
                </span>
              </div>
              <ChevronDown size={14} color="var(--adm-text-muted)" style={{ transform: isVenueDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {isVenueDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--adm-bg-card, #FFFFFF)',
                border: '1px solid var(--adm-border, #CBD5E1)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
                padding: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}>
                {venues.filter(v => v.active !== false).map(v => {
                  const isSel = venueId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVenueId(v.id);
                        setIsVenueDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isSel ? 'var(--adm-accent-bg, rgba(2, 132, 199, 0.12))' : 'transparent',
                        color: isSel ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-title, #0F172A)',
                        fontWeight: isSel ? 700 : 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--adm-bg-hover, rgba(0,0,0,0.04))'; }}
                      onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={13} color={isSel ? 'var(--adm-accent)' : 'var(--adm-text-muted)'} />
                        <span>{v.name}</span>
                      </div>
                      {isSel && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── MODO RÁPIDO: Apenas Nome do Responsável e WhatsApp ── */}
          {mode === 'quick' ? (
            <>
              <div>
                <label style={fieldLabelStyle}>
                  <User size={13} color="#10B981" />
                  <span>Nome do Responsável / Contratante *</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Alberto ou Patrick"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  required
                  style={fieldInputStyle}
                />
              </div>

              <div>
                <label style={fieldLabelStyle}>
                  <Phone size={13} color="#10B981" />
                  <span>WhatsApp do Responsável *</span>
                </label>
                <input
                  type="text"
                  placeholder="(21) 98877-6655"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(maskPhoneInput(e.target.value))}
                  required
                  style={fieldInputStyle}
                />
              </div>
            </>
          ) : (
            /* ── MODO COMPLETO: Condicionado por Tipo de Evento e Idade ── */
            <>
              {/* Se for Casamento: Dados dos Noivos */}
              {eventType === 'Casamento' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(236, 72, 153, 0.05)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#DB2777', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Heart size={13} />
                    <span>Dados dos Noivos</span>
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>1º Noivo(a) / Contratante *</label>
                      <input
                        type="text"
                        placeholder="Nome do(a) noivo(a) principal"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        required
                        style={fieldInputStyle}
                      />
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>2º Noivo(a) / Cônjuge</label>
                      <input
                        type="text"
                        placeholder="Nome do(a) companheiro(a)"
                        value={secondSpouseName}
                        onChange={(e) => setSecondSpouseName(e.target.value)}
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>
                      <Phone size={13} color="#10B981" />
                      <span>WhatsApp de Atendimento *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="(21) 98877-6655"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(maskPhoneInput(e.target.value))}
                      required
                      style={fieldInputStyle}
                    />
                  </div>
                </div>
              ) : (
                /* Se for Aniversário / Debutante / Infantil / Outro */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--adm-bg-surface, #F8FAFC)', padding: '12px', borderRadius: '10px', border: '1px solid var(--adm-border, #CBD5E1)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-accent, #0284C7)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Cake size={13} />
                    <span>1. Dados do Homenageado / Aniversariante</span>
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>Nome do Homenageado(a) *</label>
                      <input
                        type="text"
                        placeholder="Ex: Rafaela Bonomo"
                        value={birthdayPersonName}
                        onChange={(e) => {
                          setBirthdayPersonName(e.target.value);
                          if (isSelfDecisor) setPayerName(e.target.value);
                        }}
                        style={fieldInputStyle}
                      />
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>Idade Prevista</label>
                      <input
                        type="number"
                        placeholder="Ex: 15"
                        value={birthdayPersonAge}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBirthdayPersonAge(v);
                          if (Number(v) > 0 && Number(v) < 18) {
                            setIsSelfDecisor(false);
                          }
                        }}
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>

                  {/* Toggle para maior de 18 anos ou eventos não infantis/debutantes */}
                  {eventType !== '15 Anos' && eventType !== 'Infantil' && (Number(birthdayPersonAge) >= 18 || !birthdayPersonAge) && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.76rem', color: 'var(--adm-text-title)', marginTop: '2px' }}>
                      <input
                        type="checkbox"
                        checked={isSelfDecisor}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsSelfDecisor(checked);
                          if (checked) {
                            setPayerName(birthdayPersonName);
                            setPayerRelationship('self');
                          }
                        }}
                        style={{ cursor: 'pointer', accentColor: 'var(--adm-accent)' }}
                      />
                      <span>O próprio aniversariante é o contratante / decisor pagante</span>
                    </label>
                  )}
                </div>
              )}

              {/* Seção Decisor / Responsável Legal (Obrigatório se menor de 18 ou não for o próprio) */}
              {!isSelfDecisor && eventType !== 'Casamento' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Shield size={13} />
                    <span>2. Decisor / Responsável Legal Pagante</span>
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>Nome do Decisor *</label>
                      <input
                        type="text"
                        placeholder="Ex: Patrick Bonomo (Pai)"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        required={!isSelfDecisor}
                        style={fieldInputStyle}
                      />
                    </div>

                    {/* Parentesco com Dropdown do Sistema */}
                    <div style={{ position: 'relative' }} ref={relRef}>
                      <label style={fieldLabelStyle}>Parentesco</label>
                      <button
                        type="button"
                        onClick={() => setIsRelDropdownOpen(!isRelDropdownOpen)}
                        style={{
                          ...fieldInputStyle,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ color: 'var(--adm-text-title)', fontWeight: 600 }}>{selectedRelObj.label}</span>
                        <ChevronDown size={14} color="var(--adm-text-muted)" />
                      </button>

                      {isRelDropdownOpen && (
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          background: 'var(--adm-bg-card, #FFFFFF)',
                          border: '1px solid var(--adm-border, #CBD5E1)',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
                          padding: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}>
                          {RELATIONSHIP_OPTIONS.map(r => {
                            const isSel = payerRelationship === r.key;
                            return (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => {
                                  setPayerRelationship(r.key);
                                  setIsRelDropdownOpen(false);
                                }}
                                style={{
                                  padding: '7px 9px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: isSel ? 'var(--adm-accent-bg, rgba(2, 132, 199, 0.12))' : 'transparent',
                                  color: isSel ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-title)',
                                  fontWeight: isSel ? 700 : 500,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  textAlign: 'left',
                                }}
                              >
                                <span>{r.label}</span>
                                {isSel && <Check size={13} />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>
                        <Phone size={13} color="#10B981" />
                        <span>WhatsApp do Decisor *</span>
                      </label>
                      <input
                        type="text"
                        placeholder="(21) 98877-6655"
                        value={payerPhone}
                        onChange={(e) => setPayerPhone(maskPhoneInput(e.target.value))}
                        required
                        style={fieldInputStyle}
                      />
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>CPF do Decisor</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={payerCpf}
                        onChange={(e) => setPayerCpf(e.target.value)}
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>E-mail do Decisor</label>
                    <input
                      type="email"
                      placeholder="email@exemplo.com.br"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      style={fieldInputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Seção 3: Dados do Contrato e Evento */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FileText size={13} />
                  <span>3. Dados do Evento & Contrato (Opcionais)</span>
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  {/* Data da Festa com Calendário Bonitinho Embutido */}
                  <div style={{ position: 'relative' }} ref={datePickerRef}>
                    <label style={fieldLabelStyle}>
                      <Calendar size={13} color="#F59E0B" />
                      <span>Data da Festa</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                      style={{
                        ...fieldInputStyle,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: eventDate ? 'var(--adm-text-title)' : 'var(--adm-text-muted)' }}>
                        {eventDate ? new Date(eventDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Clique para selecionar'}
                      </span>
                      <Calendar size={14} color="var(--adm-text-muted)" />
                    </button>

                    {isDatePickerOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        zIndex: 200,
                        width: '280px',
                        background: 'var(--adm-bg-card, #FFFFFF)',
                        border: '1px solid var(--adm-border, #CBD5E1)',
                        borderRadius: '10px',
                        boxShadow: '0 15px 30px -5px rgba(0,0,0,0.3)',
                        padding: '12px',
                      }}>
                        {/* Header do Mês */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: 'var(--adm-text-title)' }}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'capitalize' }}>
                            {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: 'var(--adm-text-title)' }}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>

                        {/* Dias da Semana */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.66rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                          <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
                        </div>

                        {/* Grade de Dias */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                          {calendarDays.map((cDay, idx) => {
                            const isSelected = eventDate === cDay.dateStr;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setEventDate(cDay.dateStr);
                                  setIsDatePickerOpen(false);
                                }}
                                style={{
                                  padding: '5px 0',
                                  borderRadius: '4px',
                                  border: 'none',
                                  background: isSelected ? 'var(--adm-accent, #0284C7)' : 'transparent',
                                  color: isSelected ? '#FFFFFF' : cDay.isCurrentMonth ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                                  fontWeight: isSelected ? 800 : 500,
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  opacity: cDay.isCurrentMonth ? 1 : 0.4,
                                }}
                              >
                                {cDay.dayNum}
                              </button>
                            );
                          })}
                        </div>

                        {/* Limpar Data */}
                        {eventDate && (
                          <button
                            type="button"
                            onClick={() => {
                              setEventDate('');
                              setIsDatePickerOpen(false);
                            }}
                            style={{
                              marginTop: '8px',
                              width: '100%',
                              padding: '5px',
                              background: 'transparent',
                              border: 'none',
                              color: '#EF4444',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            Remover Data
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>
                      <Clock size={13} />
                      <span>Horário</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 20:00 às 02:00"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      style={fieldInputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={fieldLabelStyle}>
                      <DollarSign size={13} color="#10B981" />
                      <span>Valor do Contrato (R$)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={rawDealValue}
                      onChange={(e) => handleDealValueChange(e.target.value)}
                      style={fieldInputStyle}
                    />
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>
                      <Users size={13} />
                      <span>Nº Convidados</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 150"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      style={fieldInputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={fieldLabelStyle}>Pacote Contratado</label>
                  <input
                    type="text"
                    placeholder="Ex: Pacote Imperial Ouro"
                    value={packageSold}
                    onChange={(e) => setPackageSold(e.target.value)}
                    style={fieldInputStyle}
                  />
                </div>

                <div>
                  <label style={fieldLabelStyle}>Condições de Pagamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Entrada R$ 5.000 + parcelamento em boletos"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    style={fieldInputStyle}
                  />
                </div>

                <div>
                  <label style={fieldLabelStyle}>Observações Iniciais</label>
                  <textarea
                    rows={2}
                    placeholder="Anotações do perfil do cliente, preferências ou acordos especiais..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ ...fieldInputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid var(--adm-border, #E2E8F0)',
            paddingTop: '14px',
            marginTop: '4px',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                backgroundColor: 'transparent',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--adm-accent, #0284C7)',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              <Check size={16} />
              <span>{mode === 'quick' ? 'Cadastrar Cliente Rápido' : 'Concluir Cadastro Completo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
