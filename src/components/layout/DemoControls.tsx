import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, RotateCcw, Smartphone, Monitor, UserPlus, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppState, type ScenarioKey } from '../../context/AppStateContext';

export const DemoControls: React.FC = () => {
  const { 
    referrals, 
    validateReferral, 
    rejectReferral,
    simulateAddValidReferral,
    simulateAddPendingReferral,
    simulateAddVipSale,
    setVipSalesCount,
    simulateExpireCycle,
    simulateExpire6Months,
    simulateResetCycleTimer,
    simulateSetCycleRemainingHours,
    simulateAddRenewalReferral,
    convertedReferralSales,
    debutante,
    applyScenario,
    resetState,
    isMobileFrame,
    toggleMobileFrame,
    validatedReferralsCount,
    pendingReferralsCount,
    sentReferralsCount
  } = useAppState();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | 'custom'>('custom');

  const pendingReferral = referrals.find(r => r.status === 'pending');
  const cycleStatus = debutante.journeyCycle?.journeyStatus || 'active';
  const renewalProg = debutante.journeyCycle?.cycleRenewalProgress || 0;

  const handleScenario = (s: ScenarioKey) => {
    setActiveScenario(s);
    applyScenario(s);
  };

  const scenarios: { key: ScenarioKey; label: string; desc: string }[] = [
    { key: 'A', label: 'Cenário A (Zero)', desc: '0 enviadas / 0 validadas' },
    { key: 'T2', label: 'Teste 2 (5/5)', desc: '5 enviadas / 5 validadas (Meta 1 100%, Meta 2 50%)' },
    { key: 'T3', label: 'Teste 3 (7/7)', desc: '7 enviadas / 7 validadas (Meta 1 Concl., Meta 2 70%)' },
    { key: 'T9', label: 'Teste 9 (10/4)', desc: '10 enviadas / 4 validadas (6 pendentes)' },
    { key: 'D', label: 'Teste 4 (20/10)', desc: '20 enviadas / 10 validadas' },
    { key: 'E', label: 'Teste 5 (20/15)', desc: '20 enviadas / 15 validadas' },
    { key: 'F', label: 'Teste 6 (20/20)', desc: '20 enviadas / 20 validadas (Tudo Concluído)' },
    { key: 'C', label: 'Teste 7 (20/7)', desc: '20 enviadas / 7 validadas (13 pendentes)' },
    { key: 'B', label: 'Teste 8 (20/0)', desc: '20 enviadas / 0 validadas (Todas Rosas)' },
    { key: 'G', label: 'Cenário G (Recusa)', desc: '20 env / 7 val / 1 rec (19 consideradas)' },
  ];

  // Collapsed Minimal View
  if (!isExpanded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
        <div 
          onClick={() => setIsExpanded(true)}
          style={{
            background: 'rgba(20, 10, 30, 0.45)',
            border: '1px solid rgba(255, 92, 154, 0.25)',
            borderRadius: '20px',
            padding: '5px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            opacity: 0.5,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.95')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
          title="Clique para expandir o painel de testes"
        >
          <Sliders size={12} color="var(--primary)" />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Painel de Testes
          </span>
          <ChevronDown size={13} color="var(--primary-light)" />
        </div>
      </div>
    );
  }

  return (
    <div className="demo-controls-container" style={{
      background: 'linear-gradient(135deg, rgba(255, 77, 141, 0.12) 0%, rgba(35, 21, 47, 0.95) 100%)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 92, 154, 0.3)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 18px',
      marginBottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {/* Top Row: Title, Current Counters & View Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '10px',
      }}>
        {/* Clickable Title to Collapse */}
        <div 
          onClick={() => setIsExpanded(false)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            flexWrap: 'wrap',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="Clique no título para recolher o painel de testes"
        >
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(255, 92, 154, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sliders size={14} color="var(--primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Painel de Testes
            </span>
            <ChevronUp size={14} color="var(--primary-light)" />
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.4)',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontFamily: 'Poppins, sans-serif',
            flexWrap: 'wrap',
          }}>
            <span style={{ color: '#FFF' }}>Consideradas: <strong>{sentReferralsCount}</strong></span>
            <span style={{ color: '#FFD700' }}>• Validadas: <strong>{validatedReferralsCount}</strong></span>
            <span style={{ color: '#FF5C9A' }}>• Pendentes: <strong>{pendingReferralsCount}</strong></span>
            <span style={{ color: '#E8C98D' }}>• 👑 VIPs: <strong>{convertedReferralSales}</strong></span>
            <span style={{
              color: cycleStatus === 'active' ? '#34D399' : cycleStatus === 'paused' ? '#FF5C9A' : '#A8A2B0',
              fontWeight: 800
            }}>
              • ⏰ Ciclo: {cycleStatus.toUpperCase()} {cycleStatus === 'paused' ? `(${renewalProg}/3)` : ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Toggle Mobile Frame Preview */}
          <button
            onClick={toggleMobileFrame}
            style={{
              background: isMobileFrame ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'rgba(255,255,255,0.08)',
              color: '#FFF',
              border: isMobileFrame ? 'none' : '1px solid rgba(255,255,255,0.15)',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isMobileFrame ? <Monitor size={13} /> : <Smartphone size={13} />}
            {isMobileFrame ? 'Modo Desktop' : 'Simular Moldura'}
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              setActiveScenario('custom');
              resetState();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '5px 10px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
            title="Resetar dados para estado inicial"
          >
            <RotateCcw size={12} />
            Resetar
          </button>
        </div>
      </div>

      {/* Middle Row: Cenários A a G Presets */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '2px',
      }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, whiteSpace: 'nowrap', marginRight: '4px' }}>
          Cenários:
        </span>
        {scenarios.map(s => {
          const isSelected = activeScenario === s.key;
          return (
            <button
              key={s.key}
              onClick={() => handleScenario(s.key)}
              style={{
                background: isSelected ? 'linear-gradient(135deg, #FF5C9A 0%, #FF1493 100%)' : 'rgba(255, 255, 255, 0.07)',
                color: '#FFF',
                border: isSelected ? '1px solid #FFB0C8' : '1px solid rgba(255, 255, 255, 0.12)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 0 12px rgba(255, 92, 154, 0.5)' : 'none',
              }}
              title={s.desc}
            >
              {s.label} ({s.desc})
            </button>
          );
        })}
      </div>

      {/* Bottom Row: Quick Simulation Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, whiteSpace: 'nowrap', marginRight: '4px' }}>
          Ações Indicações:
        </span>

        {/* Button: Instant +1 Validated Referral */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateAddValidReferral();
          }}
          className="btn-primary"
          style={{ padding: '5px 12px', fontSize: '0.74rem' }}
        >
          <Play size={12} />
          +1 Validada
        </button>

        {/* Button: Instant +1 Pending Referral */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateAddPendingReferral();
          }}
          style={{
            background: 'rgba(255, 92, 154, 0.15)',
            border: '1px solid rgba(255, 92, 154, 0.4)',
            color: '#FFB0C8',
            padding: '5px 12px',
            borderRadius: '50px',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <UserPlus size={12} color="#FF5C9A" />
          +1 Enviada (Pendente)
        </button>

        {/* VIP Sales Section */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        <span style={{ fontSize: '0.72rem', color: '#FFD700', fontWeight: 800, whiteSpace: 'nowrap' }}>
          👑 Vendas VIP:
        </span>

        {/* Button: Instant +1 VIP Sale */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateAddVipSale();
          }}
          style={{
            background: 'linear-gradient(135deg, #DDA84B 0%, #FFD700 100%)',
            color: '#3D2702',
            border: 'none',
            padding: '5px 12px',
            borderRadius: '50px',
            fontSize: '0.74rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 0 12px rgba(255, 215, 0, 0.4)',
          }}
        >
          <Play size={12} />
          +1 Venda Fechada (VIP)
        </button>

        {/* Quick VIP presets: 1, 3, 5, 10 vendas */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { count: 1, label: '1 Venda (Watch)' },
            { count: 3, label: '3 Vendas (iPhone)' },
            { count: 5, label: '5 Vendas (MacBook)' },
            { count: 10, label: '10 Vendas (Viagem)' },
          ].map(p => (
            <button
              key={p.count}
              onClick={() => {
                setActiveScenario('custom');
                setVipSalesCount(p.count);
              }}
              style={{
                background: convertedReferralSales === p.count ? 'rgba(255, 215, 0, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                border: convertedReferralSales === p.count ? '1px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.1)',
                color: convertedReferralSales === p.count ? '#FFD700' : 'rgba(255, 255, 255, 0.7)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ⏰ Cycle & 6-Month Controls Section */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 800, whiteSpace: 'nowrap' }}>
          ⏰ Ciclo & 6 Meses:
        </span>

        {/* Button: Set 6 Days (Shows "Restam 6 dias / para o fim") */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateSetCycleRemainingHours(6 * 24 + 12);
          }}
          style={{
            background: 'rgba(255, 215, 0, 0.15)',
            border: '1px solid rgba(255, 215, 0, 0.4)',
            color: '#FFD700',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
          title="Simula 6 dias restantes (exibe 'Restam 6 dias / para o fim')"
        >
          ⏰ 6 Dias
        </button>

        {/* Button: Set 72h / 3 Days (Shows yellow HH:MM:SS clock) */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateSetCycleRemainingHours(71.98);
          }}
          style={{
            background: 'rgba(255, 183, 3, 0.2)',
            border: '1px solid rgba(255, 183, 3, 0.5)',
            color: '#FFB703',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
          title="Simula 3 dias / 72h restantes (inicia contador regressivo 72:00:00 amarelo)"
        >
          ⏰ 72h (3d)
        </button>

        {/* Button: Set 24h / Urgent (Shows red HH:MM:SS clock) */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateSetCycleRemainingHours(23.98);
          }}
          style={{
            background: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            color: '#FFA3A3',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
          title="Simula últimas 24h (contador regressivo fica vermelho)"
        >
          ⏰ 24h (Urgente)
        </button>

        {/* Button: Expire 7-Day Cycle (Triggers Paused state) */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateExpireCycle();
          }}
          style={{
            background: 'rgba(255, 92, 154, 0.2)',
            border: '1px solid rgba(255, 92, 154, 0.5)',
            color: '#FFB0C8',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
          title="Simula que os 7 dias do ciclo acabaram -> Jornada Pausada"
        >
          ⏸️ Expirar (Pausar)
        </button>

        {/* Button: Add 1 renewal referral step (1/3, 2/3, 3/3 -> unlock) */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateAddRenewalReferral();
          }}
          style={{
            background: 'linear-gradient(135deg, #FF5C9A 0%, #FF1493 100%)',
            color: '#FFF',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(255, 92, 154, 0.4)',
          }}
          title="Adiciona 1 indicação para renovar ciclo (1/3, 2/3, 3/3 -> Desbloqueia +7d)"
        >
          +1 p/ Renovar ({renewalProg}/3)
        </button>

        {/* Button: Expire 6-Month Hard Limit (Triggers Closed state) */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateExpire6Months();
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFF',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Simula atingir o limite máximo de 6 meses -> Jornada Encerrada"
        >
          ⏳ Fim 6 Meses
        </button>

        {/* Button: Reset Cycle Timer */}
        <button
          onClick={() => {
            setActiveScenario('custom');
            simulateResetCycleTimer();
          }}
          style={{
            background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            color: '#34D399',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Reinicia o ciclo com 7 dias completos e status ativo"
        >
          🔄 Reset (+7d)
        </button>

        {/* Button: Approve Commercial Pending Referral */}
        {pendingReferral && (
          <>
            <button
              onClick={() => {
                setActiveScenario('custom');
                validateReferral(pendingReferral.id);
              }}
              className="btn-secondary"
              style={{ padding: '5px 12px', fontSize: '0.74rem', borderColor: '#FFD700', color: '#FFD700' }}
            >
              <CheckCircle2 size={12} color="#FFD700" />
              Aprovar ({pendingReferral.name.split(' ')[0]})
            </button>
            <button
              onClick={() => {
                setActiveScenario('custom');
                rejectReferral(pendingReferral.id);
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#EF4444',
                padding: '5px 12px',
                borderRadius: '50px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <XCircle size={12} color="#EF4444" />
              Recusar ({pendingReferral.name.split(' ')[0]})
            </button>
          </>
        )}
      </div>
    </div>
  );
};

