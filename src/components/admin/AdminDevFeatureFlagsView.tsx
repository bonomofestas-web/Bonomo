import React, { useState } from 'react';
import { 
  Sliders, ShieldCheck, CheckCircle2, Clock, EyeOff, 
  MessageSquare, Target, Users, Compass, 
  Building2, Crown, LayoutDashboard, CheckSquare,
  AlertTriangle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { FeatureFlagId, FeatureFlagStatus, FeatureFlagConfig } from '../../types/admin';

export const AdminDevFeatureFlagsView: React.FC = () => {
  const { featureFlags, updateFeatureFlag, featureDescriptions, updateFeatureComingSoonMessage } = useAdminState();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<{
    id: FeatureFlagId;
    status: FeatureFlagStatus;
    name: string;
    currentStatus: FeatureFlagStatus;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const featureDefinitions: FeatureFlagConfig[] = [
    {
      id: 'home',
      name: 'Página Inicial (Início / Meu Dia)',
      description: 'Visão inicial com tarefas pendentes, lembretes, atalhos rápidos e agenda do dia.',
      category: 'Comercial & CRM',
      status: featureFlags.home || 'active',
    },
    {
      id: 'dashboard',
      name: 'Dashboard Geral & Indicadores',
      description: 'Painel visual de métricas, taxa de conversão, gráficos de desempenho e volume de vendas.',
      category: 'Inteligência',
      status: featureFlags.dashboard || 'active',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp & Atendimento',
      description: 'Caixa de entrada integrada, disparos de mensagens, histórico e botões de WhatsApp em todo o CRM.',
      category: 'Atendimento',
      status: featureFlags.whatsapp || 'active',
    },
    {
      id: 'icp',
      name: 'Qualificação ICP & MQL',
      description: 'Perguntas de qualificação da casa, cálculo de notas (ICP A, B, C), gauges e badges nos leads.',
      category: 'Inteligência',
      status: featureFlags.icp || 'active',
    },
    {
      id: 'sources',
      name: 'Origens & Rastreamento',
      description: 'Rastreamento de canais de entrada, formulários incorporáveis, parâmetros UTM e links públicos.',
      category: 'Comercial & CRM',
      status: featureFlags.sources || 'active',
    },
    {
      id: 'debutantes',
      name: 'Aniversariantes & Debutantes',
      description: 'Gestão de anfitriãs de 15 anos, vinculação de jornadas, acompanhamento de metas e convites.',
      category: 'Comercial & CRM',
      status: featureFlags.debutantes || 'active',
    },
    {
      id: 'venue_goals',
      name: 'Metas & Indicadores da Casa',
      description: 'Metas de faturamento, novos contratos e acompanhamento de desempenho por unidade.',
      category: 'Comercial & CRM',
      status: featureFlags.venue_goals || 'active',
    },
    {
      id: 'funnels',
      name: 'Funis Comerciais & Kanban',
      description: 'Pipeline comercial, etapas customizadas, distribuição Round-Robin e arrasto de cards.',
      category: 'Comercial & CRM',
      status: featureFlags.funnels || 'active',
    },
    {
      id: 'master_dashboard',
      name: 'Dashboard Executivo Master',
      description: 'Visão consolidada multi-unidades, métricas globais e volume de vendas de toda a rede.',
      category: 'Administrativo',
      status: featureFlags.master_dashboard || 'active',
    },
    {
      id: 'collaborators',
      name: 'Equipe & Colaboradores',
      description: 'Gestão de usuários, atribuição de cargos operacionais (SDR, Closer, CRM) e permissões.',
      category: 'Administrativo',
      status: featureFlags.collaborators || 'active',
    },
    {
      id: 'venues',
      name: 'Casas de Festa & Unidades',
      description: 'Cadastro de unidades, salões, fotos, capacidade, dados estruturais e endereços.',
      category: 'Administrativo',
      status: featureFlags.venues || 'active',
    },
  ];

  const handleStatusChange = (id: FeatureFlagId, status: FeatureFlagStatus, name: string) => {
    updateFeatureFlag(id, status);
    const label = status === 'active' ? 'Liberado (Ativo)' : status === 'coming_soon' ? 'Em Breve' : 'Desativado (Oculto)';
    showToast(`Recurso "${name}" atualizado para: ${label}`);
  };

  const getFeatureIcon = (id: FeatureFlagId) => {
    switch (id) {
      case 'home': return <CheckSquare size={20} color="#14A9D7" />;
      case 'dashboard': return <LayoutDashboard size={20} color="#14A9D7" />;
      case 'whatsapp': return <MessageSquare size={20} color="#14A9D7" />;
      case 'icp': return <Target size={20} color="#14A9D7" />;
      case 'sources': return <Compass size={20} color="#14A9D7" />;
      case 'debutantes': return <Users size={20} color="#14A9D7" />;
      case 'venue_goals': return <Target size={20} color="#14A9D7" />;
      case 'funnels': return <LayoutDashboard size={20} color="#14A9D7" />;
      case 'master_dashboard': return <Crown size={20} color="#14A9D7" />;
      case 'collaborators': return <ShieldCheck size={20} color="#14A9D7" />;
      case 'venues': return <Building2 size={20} color="#14A9D7" />;
      default: return <Sliders size={20} color="#14A9D7" />;
    }
  };

  // Counts
  const activeCount = featureDefinitions.filter(f => f.status === 'active').length;
  const comingSoonCount = featureDefinitions.filter(f => f.status === 'coming_soon').length;
  const disabledCount = featureDefinitions.filter(f => f.status === 'disabled').length;

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1280px', margin: '0 auto', fontFamily: "'Poppins', sans-serif" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(20, 169, 215, 0.45)',
          zIndex: 99999,
          fontSize: '0.84rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <CheckCircle2 size={16} color="#FFF" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.2) 0%, rgba(74, 183, 194, 0.1) 100%)',
            border: '1.5px solid var(--adm-accent, #14A9D7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(20, 169, 215, 0.25)',
          }}>
            <Sliders size={24} color="#14A9D7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                Painel do Desenvolvedor • Feature Flags
              </h1>
              <span style={{
                background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                color: '#FFFFFF',
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Acesso Exclusivo Dev
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
              Controle o ciclo de vida dos recursos em produção. Teste antes de liberar para os usuários Master e operadores.
            </p>
          </div>
        </div>

        {/* Counter Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#22C55E',
            padding: '6px 14px',
            borderRadius: '12px',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <CheckCircle2 size={14} />
            <span>{activeCount} Ativos</span>
          </div>

          <div style={{
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            color: '#14A9D7',
            padding: '6px 14px',
            borderRadius: '12px',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Clock size={14} />
            <span>{comingSoonCount} Em Breve</span>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#EF4444',
            padding: '6px 14px',
            borderRadius: '12px',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <EyeOff size={14} />
            <span>{disabledCount} Ocultos</span>
          </div>
        </div>
      </div>

      {/* Dev Super-Power Notice Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.12) 0%, rgba(17, 26, 41, 0.6) 100%)',
        border: '1.5px solid rgba(20, 169, 215, 0.35)',
        borderRadius: '18px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <ShieldCheck size={26} color="#14A9D7" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-body)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--adm-accent, #14A9D7)' }}>Como funciona a hierarquia de bloqueios:</strong> O Desenvolvedor (você) possui acesso irrestrito e visualiza 100% de todos os recursos do F5 System permanentemente.
          As opções abaixo (Desativar ou Em Breve) são aplicadas instantaneamente para todas as contas Master, Administradores, SDRs e Closers.
        </div>
      </div>

      {/* Features Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '16px',
      }}>
        {featureDefinitions.map(f => {
          const currentStatus = f.status;

          return (
            <div
              key={f.id}
              style={{
                background: 'var(--adm-bg-card)',
                border: `1.5px solid ${
                  currentStatus === 'active' 
                    ? 'var(--adm-border)' 
                    : currentStatus === 'coming_soon' 
                    ? 'rgba(20, 169, 215, 0.5)' 
                    : 'rgba(239, 68, 68, 0.35)'
                }`,
                borderRadius: '18px',
                padding: '20px',
                boxShadow: 'var(--adm-shadow)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(20, 169, 215, 0.12)',
                      border: '1px solid rgba(20, 169, 215, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {getFeatureIcon(f.id)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                        {f.name}
                      </h3>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {f.category}
                      </span>
                    </div>
                  </div>

                  {/* Status Pill Indicator - Linha única sem quebra */}
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    background: 
                      currentStatus === 'active' ? 'rgba(34, 197, 94, 0.15)' :
                      currentStatus === 'coming_soon' ? 'rgba(20, 169, 215, 0.18)' :
                      'rgba(239, 68, 68, 0.15)',
                    color: 
                      currentStatus === 'active' ? '#22C55E' :
                      currentStatus === 'coming_soon' ? '#14A9D7' :
                      '#EF4444',
                    border: `1px solid ${
                      currentStatus === 'active' ? 'rgba(34, 197, 94, 0.4)' :
                      currentStatus === 'coming_soon' ? 'rgba(20, 169, 215, 0.4)' :
                      'rgba(239, 68, 68, 0.4)'
                    }`,
                  }}>
                    {currentStatus === 'active' ? '🟢 Ativo' : currentStatus === 'coming_soon' ? '🟡 Em Breve' : '🔴 Oculto'}
                  </span>
                </div>

                <p style={{
                  fontSize: '0.78rem',
                  color: 'var(--adm-text-muted)',
                  lineHeight: 1.5,
                  margin: '12px 0 0 0',
                }}>
                  {f.description}
                </p>

                {/* Editor de Mensagem de "Em Breve" (Teaser para gerar Hype) */}
                {currentStatus === 'coming_soon' && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    background: 'rgba(20, 169, 215, 0.08)',
                    border: '1px solid rgba(20, 169, 215, 0.25)',
                    borderRadius: '12px',
                  }}>
                    <label style={{ display: 'block', fontSize: '0.66rem', color: '#14A9D7', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                      Descrição de "Em Breve" (visível aos usuários):
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Ex: Estamos preparando novidades exclusivas para sua unidade..."
                        defaultValue={featureDescriptions[f.id] || ''}
                        id={`desc-input-${f.id}`}
                        style={{
                          flex: 1,
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.74rem',
                          color: 'var(--adm-text-title)',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(`desc-input-${f.id}`) as HTMLInputElement;
                          if (input) {
                            updateFeatureComingSoonMessage(f.id, input.value.trim());
                            showToast(`Mensagem de "Em Breve" salva para ${f.name}!`);
                          }
                        }}
                        style={{
                          background: 'var(--adm-accent)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3-State Toggle Segment */}
              <div style={{
                background: 'var(--adm-bg-input)',
                padding: '4px',
                borderRadius: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '4px',
                border: '1px solid var(--adm-border)',
              }}>
                {/* 1. Ativo */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentStatus === 'active') return;
                    setPendingChange({ id: f.id, status: 'active', name: f.name, currentStatus });
                  }}
                  style={{
                    background: currentStatus === 'active' ? '#22C55E' : 'transparent',
                    color: currentStatus === 'active' ? '#FFFFFF' : 'var(--adm-text-muted)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 4px',
                    fontSize: '0.72rem',
                    fontWeight: currentStatus === 'active' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Liberar funcionalidade para todos"
                >
                  <CheckCircle2 size={12} />
                  <span>Ativo</span>
                </button>

                {/* 2. Em Breve */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentStatus === 'coming_soon') return;
                    setPendingChange({ id: f.id, status: 'coming_soon', name: f.name, currentStatus });
                  }}
                  style={{
                    background: currentStatus === 'coming_soon' ? '#14A9D7' : 'transparent',
                    color: currentStatus === 'coming_soon' ? '#FFFFFF' : 'var(--adm-text-muted)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 4px',
                    fontSize: '0.72rem',
                    fontWeight: currentStatus === 'coming_soon' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Exibir badge 'Em Breve' e tela embaçada para os usuários"
                >
                  <Clock size={12} />
                  <span>Em Breve</span>
                </button>

                {/* 3. Desativado */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentStatus === 'disabled') return;
                    setPendingChange({ id: f.id, status: 'disabled', name: f.name, currentStatus });
                  }}
                  style={{
                    background: currentStatus === 'disabled' ? '#EF4444' : 'transparent',
                    color: currentStatus === 'disabled' ? '#FFFFFF' : 'var(--adm-text-muted)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 4px',
                    fontSize: '0.72rem',
                    fontWeight: currentStatus === 'disabled' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Ocultar completamente do menu e do aplicativo para todos abaixo do Dev"
                >
                  <EyeOff size={12} />
                  <span>Desativar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL: CONFIRMAÇÃO DE ALTERAÇÃO DE RECURSO ───────────────────────── */}
      {pendingChange && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 999999,
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: `1.5px solid ${
              pendingChange.status === 'disabled' ? 'rgba(239, 68, 68, 0.5)' :
              pendingChange.status === 'coming_soon' ? 'rgba(20, 169, 215, 0.5)' :
              'rgba(34, 197, 94, 0.5)'
            }`,
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            padding: '28px',
            color: 'var(--adm-text-title)',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            position: 'relative',
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 
                pendingChange.status === 'disabled' ? 'rgba(239, 68, 68, 0.15)' :
                pendingChange.status === 'coming_soon' ? 'rgba(20, 169, 215, 0.15)' :
                'rgba(34, 197, 94, 0.15)',
              border: `1px solid ${
                pendingChange.status === 'disabled' ? '#EF4444' :
                pendingChange.status === 'coming_soon' ? '#14A9D7' :
                '#22C55E'
              }`,
              color: 
                pendingChange.status === 'disabled' ? '#EF4444' :
                pendingChange.status === 'coming_soon' ? '#14A9D7' :
                '#22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--adm-text-title)' }}>
              Confirmar Alteração de Recurso
            </h3>

            <p style={{ fontSize: '0.86rem', color: 'var(--adm-text-muted)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Você tem certeza que deseja alterar o status do recurso <strong>"{pendingChange.name}"</strong> para{' '}
              <strong style={{
                color: 
                  pendingChange.status === 'disabled' ? '#EF4444' :
                  pendingChange.status === 'coming_soon' ? '#14A9D7' :
                  '#22C55E'
              }}>
                {pendingChange.status === 'active' ? '🟢 Ativo' : pendingChange.status === 'coming_soon' ? '🟡 Em Breve' : '🔴 Desativado (Oculto)'}
              </strong>?
            </p>

            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '0.74rem',
              color: 'var(--adm-text-muted)',
              marginBottom: '20px',
              textAlign: 'left',
            }}>
              ℹ️ A alteração será aplicada <strong>instantaneamente em tempo real</strong> para todos os usuários abaixo do Desenvolvedor no ecossistema F5 System.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPendingChange(null)}
                style={{
                  flex: 1,
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  handleStatusChange(pendingChange.id, pendingChange.status, pendingChange.name);
                  setPendingChange(null);
                }}
                style={{
                  flex: 1,
                  background: 
                    pendingChange.status === 'disabled' ? '#EF4444' :
                    pendingChange.status === 'coming_soon' ? '#14A9D7' :
                    '#22C55E',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Confirmar Alteração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
