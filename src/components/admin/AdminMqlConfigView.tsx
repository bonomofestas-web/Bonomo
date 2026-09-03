import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit2, X, Building2, ArrowRight
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { useAdminState } from '../../context/AdminStateContext';
import { ICP_SITUATION_CONFIG } from '../../types/admin';
import type { MqlQuestion, MqlOption, MqlOptionSituation } from '../../types/admin';

interface FixedOptionFormState {
  situation: MqlOptionSituation;
  label: string;
}

const DEFAULT_FIXED_OPTIONS: FixedOptionFormState[] = [
  { situation: 'ideal', label: '' },
  { situation: 'good', label: '' },
  { situation: 'medium', label: '' },
  { situation: 'bad', label: '' },
];

export const AdminMqlConfigView: React.FC = () => {
  const { 
    venues, 
    activeVenueId, 
    setActiveVenueId, 
    mqlQuestions, 
    addMqlQuestion, 
    updateMqlQuestion, 
    deleteMqlQuestion 
  } = useAdminState();

  const isAllVenues = !activeVenueId || activeVenueId === 'all' || activeVenueId === 'multi';
  const currentVenue = venues.find(v => v.id === activeVenueId) || null;
  const targetVenueId = currentVenue?.id || 'all';

  const venueQuestions = mqlQuestions.filter(q => q.venueId === targetVenueId || q.venueId === 'all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [formOptions, setFormOptions] = useState<FixedOptionFormState[]>(DEFAULT_FIXED_OPTIONS);

  const handleOpenNewModal = () => {
    setEditingQuestionId(null);
    setQuestionTitle('');
    setQuestionDescription('');
    setFormOptions([
      { situation: 'ideal', label: '' },
      { situation: 'good', label: '' },
      { situation: 'medium', label: '' },
      { situation: 'bad', label: '' },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (q: MqlQuestion) => {
    setEditingQuestionId(q.id);
    setQuestionTitle(q.title);
    setQuestionDescription(q.description || '');

    // Map existing options or fallback to 4 fixed situations
    const mapped: FixedOptionFormState[] = [
      {
        situation: 'ideal',
        label: q.options.find(o => o.situation === 'ideal' || o.points >= 90)?.label || '',
      },
      {
        situation: 'good',
        label: q.options.find(o => o.situation === 'good' || (o.points >= 65 && o.points < 90))?.label || '',
      },
      {
        situation: 'medium',
        label: q.options.find(o => o.situation === 'medium' || (o.points >= 30 && o.points < 65))?.label || '',
      },
      {
        situation: 'bad',
        label: q.options.find(o => o.situation === 'bad' || o.points < 30)?.label || '',
      },
    ];

    setFormOptions(mapped);
    setIsModalOpen(true);
  };

  const handleOptionLabelChange = (situation: MqlOptionSituation, text: string) => {
    setFormOptions(prev => prev.map(opt => {
      if (opt.situation === situation) {
        return { ...opt, label: text };
      }
      return opt;
    }));
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionTitle.trim()) {
      alert('Por favor, preencha o título da pergunta.');
      return;
    }

    const filledOptions = formOptions.filter(o => o.label.trim().length > 0);
    if (filledOptions.length < 2) {
      alert('Por favor, preencha pelo menos 2 situações para a pergunta.');
      return;
    }

    // Convert form options to MqlOption array with automated weights
    const finalOptions: MqlOption[] = formOptions
      .filter(o => o.label.trim().length > 0)
      .map((o, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        label: o.label.trim(),
        situation: o.situation,
        points: ICP_SITUATION_CONFIG[o.situation].points,
      }));

    if (editingQuestionId) {
      updateMqlQuestion(editingQuestionId, {
        title: questionTitle.trim(),
        description: questionDescription.trim() || undefined,
        options: finalOptions,
      });
    } else {
      addMqlQuestion({
        venueId: targetVenueId,
        title: questionTitle.trim(),
        description: questionDescription.trim() || undefined,
        options: finalOptions,
        order: venueQuestions.length,
      });
    }

    setIsModalOpen(false);
  };

  // ── SE ESTIVER EM "TODAS AS CASAS", EXIBE TELA PARA SELECIONAR A CASA ──
  if (isAllVenues) {
    return (
      <div style={{
        padding: '28px 32px 60px',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37',
            flexShrink: 0,
          }}>
            <IcpTargetUserIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
              Qualificação ICP (Perfil de Cliente Ideal)
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '4px' }}>
              Selecione uma casa de festas para configurar o alvo de qualificação comercial.
            </p>
          </div>
        </div>

        {venues.length === 0 ? (
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px dashed var(--adm-border)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            marginTop: '10px',
          }}>
            <Building2 size={32} color="var(--adm-accent)" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0' }}>
                Nenhuma Casa de Festa Cadastrada
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                Cadastre sua primeira unidade para poder criar as perguntas de qualificação ICP.
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginTop: '10px',
          }}>
            {venues.map(v => {
              const count = mqlQuestions.filter(q => q.venueId === v.id).length;

              return (
                <div
                key={v.id}
                onClick={() => setActiveVenueId(v.id)}
                style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D4AF37';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--adm-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D4AF37',
                    }}>
                      <Building2 size={18} />
                    </div>
                    <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      {v.name}
                    </span>
                  </div>
                  <ArrowRight size={16} color="#D4AF37" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--adm-border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                    {count > 0 ? `${count} pergunta(s) configurada(s)` : 'ICP não configurado'}
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: count > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                    color: count > 0 ? '#10B981' : '#EF4444',
                  }}>
                    {count > 0 ? 'Ativo' : 'Vazio'}
                  </span>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '28px 32px 60px',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37',
            flexShrink: 0,
          }}>
            <IcpTargetUserIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
              Qualificação ICP • {currentVenue?.name || 'Unidade'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '4px' }}>
              Defina as 4 situações para cada pergunta. O sistema calcula automaticamente a porcentagem e a nota ICP A, B ou C.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 SITUAÇÕES PADRONIZADAS & NOTAS ICP ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
      }}>
        {/* Ideal */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '14px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '1.4rem' }}>🟢</span>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#10B981' }}>
              Situação Ideal (100%)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
              Perfil perfeito com urgência e decisor.
            </div>
          </div>
        </div>

        {/* Bom */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '14px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '1.4rem' }}>🔵</span>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#60A5FA' }}>
              Situação Boa (70%)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
              Perfil favorável com pequenos ajustes.
            </div>
          </div>
        </div>

        {/* Médio */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '14px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '1.4rem' }}>🟡</span>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#F59E0B' }}>
              Situação Média (40%)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
              Data aberta ou orçamento justo.
            </div>
          </div>
        </div>

        {/* Ruim */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '14px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '1.4rem' }}>🔴</span>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#EF4444' }}>
              Situação Ruim (0%)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
              Fora do perfil ou apenas curioso.
            </div>
          </div>
        </div>
      </div>

      {/* ── QUESTIONS LIST OR CLEAN EMPTY STATE ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
            Perguntas-Chave do ICP ({venueQuestions.length})
          </h2>
          <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
            Unidade: <strong>{currentVenue?.name}</strong>
          </span>
        </div>

        {venueQuestions.length === 0 ? (
          /* EMPTY STATE CARD: "Monte o ICP da Casa" */
          <div style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, var(--adm-bg-card) 100%)',
            border: '1.5px dashed rgba(212, 175, 55, 0.4)',
            borderRadius: '20px',
            padding: '50px 30px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D4AF37',
            }}>
              <IcpTargetUserIcon size={28} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                Monte o ICP do {currentVenue?.name || 'Espaço'}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', maxWidth: '460px', margin: '6px auto 0' }}>
                Defina as perguntas e as 4 respostas da sua casa (Ideal, Bom, Médio e Ruim). O sistema calculará automaticamente o enquadramento de cada lead em ICP A, B ou C.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="adm-btn-primary"
              style={{
                marginTop: '10px',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '0.86rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(212, 175, 55, 0.25)',
              }}
            >
              <Plus size={18} />
              <span>Criar Primeira Pergunta ICP</span>
            </button>
          </div>
        ) : (
          <>
            {venueQuestions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'var(--adm-accent-bg)',
                      color: 'var(--adm-accent)',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                        {q.title}
                      </h3>
                      {q.description && (
                        <p style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '2px' }}>
                          {q.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(q)}
                      className="adm-btn-secondary"
                      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit2 size={13} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir a pergunta "${q.title}"?`)) {
                          deleteMqlQuestion(q.id);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#EF4444',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 4 Options Vertical Stack (Like a Questionnaire / Form) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px',
                  background: 'var(--adm-bg-input)',
                  borderRadius: '12px',
                }}>
                  {q.options.map(opt => {
                    const sit: MqlOptionSituation = opt.situation || (opt.points >= 90 ? 'ideal' : opt.points >= 65 ? 'good' : opt.points >= 30 ? 'medium' : 'bad');
                    const conf = ICP_SITUATION_CONFIG[sit];

                    return (
                      <div
                        key={opt.id}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: `1px solid ${conf.border}`,
                          borderRadius: '10px',
                          padding: '11px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: conf.bg,
                            color: conf.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                            minWidth: '85px',
                            justifyContent: 'center',
                          }}>
                            {conf.icon} {conf.label}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--adm-text-title)', fontWeight: 600, lineHeight: 1.3 }}>
                            {opt.label}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: conf.color,
                          background: conf.bg,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${conf.border}`,
                          flexShrink: 0,
                        }}>
                          {conf.points}% pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* BOTÃO NOVA PERGUNTA NO FINAL DA LISTA */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="adm-btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 28px',
                  borderRadius: '12px',
                  fontSize: '0.86rem',
                  fontWeight: 900,
                  boxShadow: '0 8px 24px rgba(212, 175, 55, 0.25)',
                }}
              >
                <Plus size={18} />
                <span>Adicionar Nova Pergunta ICP</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL: CRIAR / EDITAR PERGUNTA ICP (4 SITUAÇÕES FIXAS) ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px',
        }}>
          <div style={{
            background: '#141118',
            border: '1.5px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '20px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IcpTargetUserIcon size={22} color="#D4AF37" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                  {editingQuestionId ? 'Editar Pergunta ICP' : 'Nova Pergunta ICP'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9E988D', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Question Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Título da Pergunta *
                </label>
                <input
                  type="text"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  placeholder="Ex: Qual a previsão de data da celebração?"
                  className="adm-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Descrição / Objetivo (Opcional)
                </label>
                <input
                  type="text"
                  value={questionDescription}
                  onChange={(e) => setQuestionDescription(e.target.value)}
                  placeholder="Ex: Avalia urgência de decisão e maturidade do cliente"
                  className="adm-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
                />
              </div>

              {/* 4 Standardized Situations Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Defina o Texto para as 4 Situações Comerciais:
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#D4AF37', fontWeight: 700 }}>
                    Cálculo automatizado pelo sistema
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {formOptions.map((opt) => {
                    const conf = ICP_SITUATION_CONFIG[opt.situation];

                    return (
                      <div
                        key={opt.situation}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${conf.border}`,
                          borderRadius: '12px',
                          padding: '10px 12px',
                        }}
                      >
                        {/* Situation Badge */}
                        <div style={{
                          width: '110px',
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: conf.bg,
                            color: conf.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            {conf.icon} {conf.label}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: '#9E988D', marginLeft: '4px' }}>
                            Peso: {conf.points}%
                          </span>
                        </div>

                        {/* Input for this situation */}
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => handleOptionLabelChange(opt.situation, e.target.value)}
                          placeholder={`Texto da resposta ${conf.label.toLowerCase()} (ex: Data nos próximos 6 meses)...`}
                          className="adm-input"
                          style={{ flex: 1, height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                          required
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="adm-btn-secondary"
                  style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{ padding: '10px 22px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 900 }}
                >
                  {editingQuestionId ? 'Salvar Pergunta' : 'Criar Pergunta ICP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
