import React, { useState } from 'react';
import { 
  Clock, CheckCircle2, Sparkles, 
  RotateCcw, Check
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';

export const AdminSlaSettingsView: React.FC = () => {
  const { systemSlaConfig, updateSystemSlaConfig } = useAdminState();

  const [idealMinutes, setIdealMinutes] = useState<number>(systemSlaConfig?.idealMinutes ?? 10);
  const [criticalMinutes, setCriticalMinutes] = useState<number>(systemSlaConfig?.criticalMinutes ?? 60);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = async () => {
    if (idealMinutes <= 0) {
      alert('O tempo ideal deve ser maior que zero minutos.');
      return;
    }
    if (criticalMinutes <= idealMinutes) {
      alert('O tempo alarmante (crítico) deve ser estritamente maior que o tempo ideal.');
      return;
    }

    setIsSaving(true);
    try {
      await updateSystemSlaConfig({
        idealMinutes: Number(idealMinutes),
        warningMinutes: Number(idealMinutes),
        criticalMinutes: Number(criticalMinutes),
      });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err) {
      console.error('Erro ao salvar SLA:', err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    setIdealMinutes(10);
    setCriticalMinutes(60);
  };

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1000px',
      margin: '0 auto',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--adm-bg-card, #FFFFFF)',
        borderRadius: '16px',
        border: '1px solid var(--adm-border, #E2E8F0)',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(20, 169, 215, 0.12)',
            color: '#14A9D7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Clock size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
              SLA de Tempo de Resposta (Atendimento)
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--adm-text-muted, #64748B)' }}>
              Configure os limites de tempo de espera para respostas a clientes no WhatsApp e Kanban.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleRestoreDefaults}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--adm-border, #CBD5E1)',
              color: 'var(--adm-text-muted, #64748B)',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 22px',
              borderRadius: '8px',
              background: '#14A9D7',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(20, 169, 215, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <Check size={16} />
            <span>{isSaving ? 'Salvando...' : 'Salvar Parâmetros'}</span>
          </button>
        </div>
      </div>

      {/* 3 Threshold Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
      }}>
        {/* Nível 1: Ideal */}
        <div style={{
          background: 'var(--adm-bg-card, #FFFFFF)',
          borderRadius: '16px',
          border: '1.5px solid rgba(56, 189, 248, 0.35)',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 4px 14px rgba(56, 189, 248, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38BDF8' }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0284C7' }}>
                Tempo Ideal (Verde/Azul Claro)
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#0284C7',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.35)',
            }}>
              ≤ {idealMinutes} min
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.80rem', color: 'var(--adm-text-muted, #64748B)', lineHeight: 1.45 }}>
            Clientes que aguardam há poucos minutos. Estão no tempo de resposta ideal recomendado pela gerência.
          </p>

          <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--adm-border, #F1F5F9)' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', marginBottom: '6px' }}>
              Limite Máximo da Faixa Ideal (minutos):
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={idealMinutes}
              onChange={(e) => setIdealMinutes(Math.max(1, Number(e.target.value)))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-surface, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.86rem',
                fontWeight: 700,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Nível 2: Preocupante */}
        <div style={{
          background: 'var(--adm-bg-card, #FFFFFF)',
          borderRadius: '16px',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#D97706' }}>
                Tempo Preocupante (Amarelo)
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#D97706',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(245, 158, 11, 0.35)',
            }}>
              &gt; {idealMinutes}m e ≤ {criticalMinutes}m
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.80rem', color: 'var(--adm-text-muted, #64748B)', lineHeight: 1.45 }}>
            Clientes aguardando além do ideal. Cartões ficam com destaque âmbar suave para priorização pelo atendente.
          </p>

          <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--adm-border, #F1F5F9)' }}>
            <span style={{ fontSize: '0.74rem', color: '#D97706', fontWeight: 700 }}>
              Faixa intermediária automática entre o tempo Ideal e o Alarmante.
            </span>
          </div>
        </div>

        {/* Nível 3: Alarmante */}
        <div style={{
          background: 'var(--adm-bg-card, #FFFFFF)',
          borderRadius: '16px',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#DC2626' }}>
                Tempo Alarmante (Vermelho)
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#DC2626',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.35)',
            }}>
              &gt; {criticalMinutes} min
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.80rem', color: 'var(--adm-text-muted, #64748B)', lineHeight: 1.45 }}>
            Atraso grave de resposta. O cartão ganha borda e destaque vermelho vivo para intervenção imediata.
          </p>

          <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--adm-border, #F1F5F9)' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', marginBottom: '6px' }}>
              Limite para Estado Crítico (minutos):
            </label>
            <input
              type="number"
              min={idealMinutes + 1}
              max={1440}
              value={criticalMinutes}
              onChange={(e) => setCriticalMinutes(Math.max(idealMinutes + 1, Number(e.target.value)))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-surface, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.86rem',
                fontWeight: 700,
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div style={{
        background: 'var(--adm-bg-card, #FFFFFF)',
        borderRadius: '16px',
        border: '1px solid var(--adm-border, #E2E8F0)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#14A9D7" />
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
            Demonstração Visual no Kanban e WhatsApp
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          {/* Card Mock 1: Ideal */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1.5px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Beatriz Ramos</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#0284C7',
                padding: '2px 6px',
                borderRadius: '6px',
              }}>
                {Math.round(idealMinutes / 2)}m • Ideal
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>"Gostaria de agendar uma visita..."</span>
          </div>

          {/* Card Mock 2: Preocupante */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1.5px solid rgba(245, 158, 11, 0.40)',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Mariana Silva</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#D97706',
                padding: '2px 6px',
                borderRadius: '6px',
              }}>
                {Math.round((idealMinutes + criticalMinutes) / 2)}m • Preocupante
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>"Olá, vocês têm sábado livre?"</span>
          </div>

          {/* Card Mock 3: Alarmante */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1.5px solid rgba(239, 68, 68, 0.55)',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Juliana Costa</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#DC2626',
                padding: '2px 6px',
                borderRadius: '6px',
              }}>
                {criticalMinutes + 15}m • Alarmante
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>"Aguardando retorno do orçamento."</span>
          </div>
        </div>
      </div>

      {/* Toast de Sucesso */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#065F46',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 9999,
          fontSize: '0.86rem',
          fontWeight: 700,
        }}>
          <CheckCircle2 size={18} color="#34D399" />
          <span>Parâmetros de SLA atualizados com sucesso!</span>
        </div>
      )}
    </div>
  );
};
