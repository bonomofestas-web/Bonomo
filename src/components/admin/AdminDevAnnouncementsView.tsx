import React, { useState } from 'react';
import { 
  Radio, Plus, Eye, CheckCircle2, 
  Calendar, ShieldAlert, Sparkles, Megaphone, X, Clock 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { SystemAnnouncement } from '../../types/admin';

export const AdminDevAnnouncementsView: React.FC = () => {
  const { announcements, createAnnouncement } = useAdminState();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAnnouncementForReceipts, setSelectedAnnouncementForReceipts] = useState<SystemAnnouncement | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<SystemAnnouncement['type']>('feature');
  const [targetAudience, setTargetAudience] = useState<'all' | 'masters'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type,
        targetAudience,
      });
      setTitle('');
      setContent('');
      setType('feature');
      setTargetAudience('all');
      setIsCreateModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (annType: SystemAnnouncement['type']) => {
    switch (annType) {
      case 'feature':
        return {
          icon: <Sparkles size={13} color="#14A9D7" />,
          label: 'Nova Funcionalidade',
          bg: 'rgba(20, 169, 215, 0.15)',
          color: '#14A9D7',
          border: '1px solid rgba(20, 169, 215, 0.35)',
        };
      case 'update':
        return {
          icon: <Megaphone size={13} color="#10B981" />,
          label: 'Atualização',
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.35)',
        };
      case 'maintenance':
        return {
          icon: <ShieldAlert size={13} color="#F59E0B" />,
          label: 'Aviso Importante',
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#F59E0B',
          border: '1px solid rgba(245, 158, 11, 0.35)',
        };
      default:
        return {
          icon: <Radio size={13} color="#D4AF37" />,
          label: 'Geral',
          bg: 'rgba(212, 175, 55, 0.15)',
          color: '#D4AF37',
          border: '1px solid rgba(212, 175, 55, 0.35)',
        };
    }
  };

  return (
    <div style={{
      padding: '24px 32px',
      color: 'var(--adm-text-title)',
      maxWidth: '1200px',
      margin: '0 auto',
      boxSizing: 'border-box',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '0.7rem',
            color: '#14A9D7',
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            <Radio size={13} />
            <span>Controle de Comunicação Global</span>
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            margin: '0 0 6px 0',
            color: 'var(--adm-text-title)',
            letterSpacing: '-0.3px',
          }}>
            Comunicados & Notificações Gerais
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Dispare avisos pop-up em primeiro acesso para Masters e Colaboradores, e audite em tempo real quem já visualizou.
          </p>
        </div>

        {/* Action Button: Novo Comunicado */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
            color: '#080C14',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 6px 20px rgba(20, 169, 215, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          <Plus size={17} />
          <span>Novo Comunicado Global</span>
        </button>
      </div>

      {/* ── LIST OF ANNOUNCEMENTS ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        padding: '24px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--adm-text-title)' }}>
            Histórico de Comunicados Enviados ({announcements.length})
          </h2>
        </div>

        {announcements.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--adm-text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Megaphone size={40} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
              Nenhum comunicado enviado ainda
            </div>
            <div style={{ fontSize: '0.8rem', maxWidth: '380px' }}>
              Clique em "Novo Comunicado Global" para disparar novidades sobre novas funções, atualizações e manutenções no app.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {announcements.map(ann => {
              const badge = getTypeBadge(ann.type);
              const readCount = ann.readReceipts.length;

              return (
                <div
                  key={ann.id}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '16px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: badge.bg,
                        border: badge.border,
                        color: badge.color,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      <span style={{
                        background: ann.targetAudience === 'all' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(212, 175, 55, 0.12)',
                        color: ann.targetAudience === 'all' ? '#22C55E' : '#D4AF37',
                        border: `1px solid ${ann.targetAudience === 'all' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(212, 175, 55, 0.35)'}`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}>
                        Público: {ann.targetAudience === 'all' ? 'Todos os Usuários' : 'Apenas Masters'}
                      </span>

                      <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{new Date(ann.createdAt).toLocaleDateString('pt-BR')} às {new Date(ann.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0' }}>
                      {ann.title}
                    </h3>

                    <p style={{
                      fontSize: '0.8rem',
                      color: 'var(--adm-text-muted)',
                      lineHeight: 1.4,
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {ann.content}
                    </p>
                  </div>

                  {/* Read Receipts Stats & Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '0.76rem',
                      color: 'var(--adm-text-title)',
                    }}>
                      <Eye size={14} color="#14A9D7" />
                      <span><strong>{readCount}</strong> visualizações</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedAnnouncementForReceipts(ann)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '10px',
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--adm-accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--adm-border)'}
                    >
                      <span>Auditar Leituras</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: CRIAR NOVO COMUNICADO ─────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            color: 'var(--adm-text-title)',
            position: 'relative',
          }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'var(--adm-bg-input)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: 'var(--adm-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(20, 169, 215, 0.15)',
                border: '1px solid #14A9D7',
                color: '#14A9D7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}>
                <Megaphone size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--adm-text-title)' }}>
                Novo Comunicado Global
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                Aparecerá como janela de destaque para os usuários na primeira vez que acessarem o F5 System.
              </p>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Título do Comunicado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 🚀 Novo Módulo de WhatsApp Liberado!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Tipo
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  >
                    <option value="feature">Nova Funcionalidade</option>
                    <option value="update">Atualização do Sistema</option>
                    <option value="maintenance">Aviso / Manutenção</option>
                    <option value="general">Comunicado Geral</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Público-Alvo
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  >
                    <option value="all">Todos os Usuários</option>
                    <option value="masters">Apenas Contas Master</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Conteúdo da Mensagem *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Escreva a mensagem que aparecerá na tela do usuário explicando as novidades ou avisos..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #14A9D7 0%, #4AB7C2 100%)',
                  color: '#080C14',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Disparando...' : 'Disparar Comunicado no App'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AUDITORIA DE VISUALIZAÇÕES ─────────────────────────────────── */}
      {selectedAnnouncementForReceipts && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            maxWidth: '560px',
            width: '100%',
            padding: '28px',
            color: 'var(--adm-text-title)',
            position: 'relative',
          }}>
            <button
              type="button"
              onClick={() => setSelectedAnnouncementForReceipts(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'var(--adm-bg-input)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: 'var(--adm-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 800, textTransform: 'uppercase' }}>
                Relatório de Leituras
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 2px 0', color: 'var(--adm-text-title)' }}>
                {selectedAnnouncementForReceipts.title}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                {selectedAnnouncementForReceipts.readReceipts.length} pessoas visualizaram e confirmaram a leitura.
              </p>
            </div>

            {selectedAnnouncementForReceipts.readReceipts.length === 0 ? (
              <div style={{
                padding: '36px',
                textAlign: 'center',
                color: 'var(--adm-text-muted)',
                fontSize: '0.84rem',
                background: 'var(--adm-bg-input)',
                borderRadius: '14px',
              }}>
                Nenhum usuário visualizou este comunicado até o momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {selectedAnnouncementForReceipts.readReceipts.map((receipt, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        {receipt.userName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                        {receipt.userEmail} • <span style={{ textTransform: 'uppercase', color: '#14A9D7' }}>{receipt.userRole}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{new Date(receipt.readAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
