import React, { useState } from 'react';
import { 
  Thermometer, Plus, Trash2, Edit2, X, Building2, ArrowRight
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { MqlQuestion, MqlOption } from '../../types/admin';

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
  const [options, setOptions] = useState<MqlOption[]>([
    { id: 'opt_1', label: 'Opção de Alta Prioridade (ICP A)', points: 100 },
    { id: 'opt_2', label: 'Opção Intermediária (ICP B)', points: 60 },
    { id: 'opt_3', label: 'Opção Baixa / Fora do Perfil (ICP C)', points: 0 },
  ]);

  const handleOpenNewModal = () => {
    setEditingQuestionId(null);
    setQuestionTitle('');
    setQuestionDescription('');
    setOptions([
      { id: `opt_${Date.now()}_1`, label: '', points: 100 },
      { id: `opt_${Date.now()}_2`, label: '', points: 60 },
      { id: `opt_${Date.now()}_3`, label: '', points: 0 },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (q: MqlQuestion) => {
    setEditingQuestionId(q.id);
    setQuestionTitle(q.title);
    setQuestionDescription(q.description || '');
    setOptions(q.options.map(opt => ({ ...opt })));
    setIsModalOpen(true);
  };

  const handleAddOptionRow = () => {
    setOptions(prev => [
      ...prev,
      { id: `opt_${Date.now()}`, label: '', points: 50 },
    ]);
  };

  const handleRemoveOptionRow = (optId: string) => {
    if (options.length <= 2) {
      alert('A pergunta deve conter pelo menos 2 alternativas.');
      return;
    }
    setOptions(prev => prev.filter(o => o.id !== optId));
  };

  const handleOptionChange = (optId: string, field: 'label' | 'points', value: string | number) => {
    setOptions(prev => prev.map(o => {
      if (o.id === optId) {
        return { ...o, [field]: value };
      }
      return o;
    }));
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionTitle.trim()) {
      alert('Por favor, preencha o título da pergunta.');
      return;
    }

    const validOptions = options.filter(o => o.label.trim().length > 0);
    if (validOptions.length < 2) {
      alert('Por favor, preencha pelo menos 2 alternativas válidas.');
      return;
    }

    if (editingQuestionId) {
      updateMqlQuestion(editingQuestionId, {
        title: questionTitle.trim(),
        description: questionDescription.trim() || undefined,
        options: validOptions,
      });
    } else {
      addMqlQuestion({
        venueId: targetVenueId,
        title: questionTitle.trim(),
        description: questionDescription.trim() || undefined,
        options: validOptions,
        order: venueQuestions.length,
      });
    }

    setIsModalOpen(false);
  };

  // ── SE ESTIVER EM "TODAS AS CASAS", EXIBE TELA PARA SELECIONAR A CASA ──
  if (isAllVenues) {
    return (
      <div style={{
        padding: '32px',
        maxWidth: '1000px',
        margin: '0 auto',
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
            <Thermometer size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
              Qualificação ICP (Perfil de Cliente Ideal)
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '4px' }}>
              Selecione uma casa de festas para configurar ou visualizar o questionário de qualificação ICP.
            </p>
          </div>
        </div>

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
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '28px 32px 60px',
      maxWidth: '1200px',
      margin: '0 auto',
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
            <Thermometer size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
              Qualificação ICP • {currentVenue?.name || 'Unidade'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '4px' }}>
              Configure o termômetro de perguntas para classificar o lead nas notas ICP A, ICP B ou ICP C.
            </p>
          </div>
        </div>
      </div>

      {/* ── ICP SCORE TIERS EXPLANATION ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '14px',
      }}>
        {/* Tier 1: ICP A */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--adm-bg-card) 100%)',
          border: '1.5px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
            fontWeight: 900,
            fontSize: '1rem',
            flexShrink: 0,
          }}>
            🟢
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#10B981' }}>
              ICP A (80% a 100%) • Top / Bom
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Alta urgência de contratação, orçamento alinhado e decisor presente.
            </div>
          </div>
        </div>

        {/* Tier 2: ICP B */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, var(--adm-bg-card) 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F59E0B',
            fontWeight: 900,
            fontSize: '1rem',
            flexShrink: 0,
          }}>
            🟡
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#F59E0B' }}>
              ICP B (50% a 79%) • Médio / Qualificado
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Interesse concreto em negociação com data flexível ou proposta pendente.
            </div>
          </div>
        </div>

        {/* Tier 3: ICP C */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--adm-bg-card) 100%)',
          border: '1.5px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
            fontWeight: 900,
            fontSize: '1rem',
            flexShrink: 0,
          }}>
            🔴
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#EF4444' }}>
              ICP C (0% a 49%) • Baixo / Ruim
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Apenas pesquisando valores sem prazo ou descompasso orçamentário.
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
              <Thermometer size={28} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                Monte o ICP do {currentVenue?.name || 'Espaço'}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', maxWidth: '440px', margin: '6px auto 0' }}>
                Defina as perguntas e alternativas com pontuação para o time comercial qualificar os leads com precisão (ICP A, B ou C).
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

                {/* Options Breakdown (Vertical Form-Style List) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px',
                  background: 'var(--adm-bg-input)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                    Alternativas de Resposta:
                  </div>
                  {q.options.map(opt => (
                    <div
                      key={opt.id}
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                        • {opt.label}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: opt.points >= 75 ? 'rgba(16,185,129,0.15)' : opt.points >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: opt.points >= 75 ? '#10B981' : opt.points >= 50 ? '#F59E0B' : '#EF4444',
                        border: `1px solid ${opt.points >= 75 ? 'rgba(16,185,129,0.3)' : opt.points >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        flexShrink: 0,
                      }}>
                        {opt.points} pts
                      </span>
                    </div>
                  ))}
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

      {/* ── MODAL: CRIAR / EDITAR PERGUNTA ICP ── */}
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
            maxWidth: '640px',
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
                <Thermometer size={20} color="var(--adm-accent)" />
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
                  placeholder="Ex: Qual a previsão de data da festa?"
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
                  placeholder="Ex: Avalia urgência e momento de fechamento"
                  className="adm-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem' }}
                />
              </div>

              {/* Options Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Alternativas de Resposta e Pontuação
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOptionRow}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      color: '#D4AF37',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Adicionar Opção</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {options.map((opt, oIdx) => (
                    <div
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '8px 10px',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', color: '#9E988D', fontWeight: 700, width: '16px' }}>
                        {oIdx + 1}.
                      </span>
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => handleOptionChange(opt.id, 'label', e.target.value)}
                        placeholder="Texto da alternativa..."
                        className="adm-input"
                        style={{ flex: 1, height: '36px', borderRadius: '8px', fontSize: '0.78rem' }}
                        required
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '90px' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={opt.points}
                          onChange={(e) => handleOptionChange(opt.id, 'points', Number(e.target.value))}
                          className="adm-input"
                          style={{ width: '100%', height: '36px', borderRadius: '8px', fontSize: '0.78rem', textAlign: 'center' }}
                          required
                        />
                        <span style={{ fontSize: '0.68rem', color: '#9E988D', fontWeight: 800 }}>pts</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionRow(opt.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(239, 68, 68, 0.7)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
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
                  {editingQuestionId ? 'Salvar Alterações' : 'Criar Pergunta ICP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
