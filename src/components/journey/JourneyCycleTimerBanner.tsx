import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert, UserPlus } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const JourneyCycleTimerBanner: React.FC = () => {
  const { debutante, setActiveTab, setIsReferralModalOpen } = useAppState();
  const journeyCycle = debutante.journeyCycle;

  if (!journeyCycle) return null;

  // Calculate live countdown timer down to the second
  const calculateTimeLeft = () => {
    const rawEnd = journeyCycle?.currentCycleEndDate;
    let end = rawEnd ? new Date(rawEnd).getTime() : NaN;

    // Fallback seguro se a data do ciclo for inválida ou ausente
    if (isNaN(end) || end <= 0) {
      const fallbackStart = journeyCycle?.currentCycleStartDate ? new Date(journeyCycle.currentCycleStartDate).getTime() : Date.now();
      end = isNaN(fallbackStart) ? Date.now() + 7 * 86400000 : fallbackStart + 7 * 86400000;
    }

    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0, isCountdownMode: true, isRedAlert: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const totalHours = Math.floor(totalSeconds / 3600);
    const days = Math.floor(totalHours / 24);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const isCountdownMode = totalHours <= 72;
    const isRedAlert = totalHours <= 24;

    return {
      totalMs: diff,
      days: isNaN(days) ? 0 : days,
      hours: isNaN(totalHours) ? 0 : totalHours % 24,
      totalHours: isNaN(totalHours) ? 0 : totalHours,
      minutes: isNaN(minutes) ? 0 : minutes,
      seconds: isNaN(seconds) ? 0 : seconds,
      isCountdownMode,
      isRedAlert,
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [journeyCycle.currentCycleEndDate]);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Case 1: Journey Closed (6 Months Reached)
  if (journeyCycle.journeyStatus === 'closed') {
    return (
      <div 
        className="cycle-timer-compact"
        style={{
          background: 'rgba(26, 18, 32, 0.85)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '14px',
          padding: '8px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="#D4AF37" />
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#D4AF37', fontFamily: 'Poppins, sans-serif' }}>
            Ciclo de 6 Meses Encerrado
          </span>
        </div>
        <button
          onClick={() => setActiveTab('benefits')}
          style={{
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            color: '#E8C98D',
            padding: '4px 10px',
            borderRadius: '10px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Ver Benefícios
        </button>
      </div>
    );
  }

  // Case 2: Journey Paused (Cycle Expired)
  if (journeyCycle.journeyStatus === 'paused' || timeLeft.totalMs <= 0) {
    const remaining = Math.max(0, 3 - journeyCycle.cycleRenewalProgress);

    return (
      <div 
        className="cycle-timer-compact"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(26, 12, 22, 0.95) 100%)',
          border: '1px solid rgba(255, 92, 154, 0.45)',
          borderRadius: '14px',
          padding: '8px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#FF5C9A" />
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FF5C9A', fontFamily: 'Poppins, sans-serif' }}>
            Jornada Pausada ({journeyCycle.cycleRenewalProgress}/3)
          </span>
        </div>

        <button
          onClick={() => setIsReferralModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 50%, #FB8500 100%)',
            color: '#1A0E00',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '14px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <UserPlus size={11} color="#1A0E00" strokeWidth={2.5} />
          <span>Indicar ({remaining} restante{remaining === 1 ? '' : 's'})</span>
        </button>
      </div>
    );
  }

  // Case 3: Journey Active (Single-line ultra-compact pill without redundant subtitle)
  const isUrgent = timeLeft.isRedAlert;

  return (
    <div 
      className="cycle-timer-compact"
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(24, 12, 26, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(20, 14, 28, 0.95) 100%)',
        border: isUrgent ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(212, 175, 55, 0.28)',
        borderRadius: '14px',
        padding: '7px 14px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        boxShadow: isUrgent
          ? '0 4px 16px rgba(239, 68, 68, 0.2)'
          : '0 4px 14px rgba(0, 0, 0, 0.35)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Left: Clock Icon + Label in one row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={14} color={isUrgent ? '#EF4444' : '#D4AF37'} style={{ flexShrink: 0 }} />
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 800,
          color: isUrgent ? '#EF4444' : '#E8C98D',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          fontFamily: 'Poppins, sans-serif',
          whiteSpace: 'nowrap',
        }}>
          {isUrgent ? 'Prazo Acabando' : 'Tempo para Indicar'}
        </span>
      </div>

      {/* Right: Single-line mini pill with Restam X dias (no extra text) */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        padding: '4px 10px',
        borderRadius: '10px',
        border: isUrgent ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(212, 175, 55, 0.3)',
        flexShrink: 0,
      }}>
        {timeLeft.isCountdownMode ? (
          <span style={{
            fontSize: '0.86rem',
            fontWeight: 800,
            color: isUrgent ? '#EF4444' : '#FFD700',
            fontFamily: 'monospace, "SF Mono", Consolas, monospace',
            letterSpacing: '0.5px',
          }}>
            {pad(timeLeft.totalHours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          </span>
        ) : (
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#FFD700',
            fontFamily: 'Poppins, sans-serif',
            whiteSpace: 'nowrap',
          }}>
            Restam {timeLeft.days} {timeLeft.days === 1 ? 'dia' : 'dias'}
          </span>
        )}
      </div>
    </div>
  );
};
