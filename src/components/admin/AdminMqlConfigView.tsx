import React, { useState } from 'react';
import { 
  Target, Plus, Trash2, Edit2, X
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

  const currentVenue = venues.find(v => v.id === activeVenueId) || venues[0];
  const targetVenueId = currentVenue?.id || 'all';

  const venueQuestions = mqlQuestions.filter(q => q.venueId === targetVenueId || q.venueId === 'all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [options, setOptions] = useState<MqlOption[]>([
    { id: 'opt_1', label: 'Opção de Alta Prioridade', points: 100 },
    { id: 'opt_2', label: 'Opção Intermediária', points: 50 },
    { id: 'opt_3', label: 'Opção Baixa / Desqualificada', points: 0 },
  ]);

  const handleOpenNewModal = () => {
    setEditingQuestionId(null);
    setQuestionTitle('');
    setQuestionDescription('');
    setOptions([
      { id: `opt_${Date.now()}_1`, label: '', points: 100 },
      { id: `opt_${Date.now()}_2`, label: '', points: 50 },
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
        weight: 1,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <Target size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                MQL • Qualificação de Leads
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '2px' }}>
                Defina os critérios e perguntas-chave para calcular automaticamente a porcentagem de qualificação dos leads da casa.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {venues.length > 1 && (
            <select
              value={activeVenueId || currentVenue?.id || ''}
              onChange={(e) => setActiveVenueId(e.target.value)}
              className="adm-input"
              style={{ height: '40px', fontSize: '0.82rem', fontWeight: 700, borderRadius: '10px', minWidth: '180px' }}
            >
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="adm-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800 }}
          >
            <Plus size={16} />
            <span>Nova Pergunta MQL</span>
          </button>
        </div>
      </div>

      {/* ── MQL SCORE TIERS BANNER ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {/* Tier 1: Lead Top */}
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
              Lead Top (80% a 100%)
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Alta urgência de contratação, orçamento alinhado e decisor presente.
            </div>
          </div>
        </div>

        {/* Tier 2: Lead Qualificado */}
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
              Lead Qualificado (50% a 79%)
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Interesse concreto em negociação com data flexível ou proposta pendente.
            </div>
          </div>
        </div>

        {/* Tier 3: Lead Frio */}
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
              Lead Frio / Inicial (0% a 49%)
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Apenas pesquisando valores sem prazo ou descompasso orçamentário.
            </div>
          </div>
        </div>
      </div>

      {/* ── QUESTIONS LIST ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
            Perguntas-Chave Configuradas ({venueQuestions.length})
          </h2>
          <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
            Unidade: <strong>{currentVenue?.name || 'Geral'}</strong>
          </span>
        </div>

        {venueQuestions.length === 0 ? (
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px dashed var(--adm-border)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Target size={36} color="var(--adm-text-muted)" style={{ opacity: 0.4 }} />
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              Nenhuma pergunta de qualificação cadastrada para esta casa
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', maxWidth: '400px', margin: 0 }}>
              Crie perguntas-chave com opções de pontuação para o time comercial qualificar os leads com precisão.
            </p>
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="adm-btn-primary"
              style={{ marginTop: '8px', padding: '8px 18px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800 }}
            >
              Criar Primeira Pergunta
            </button>
          </div>
        ) : (
          venueQuestions.map((q, idx) => (
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

              {/* Options Breakdown */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '8px',
                padding: '12px',
                background: 'var(--adm-bg-input)',
                borderRadius: '12px',
              }}>
                {q.options.map(opt => (
                  <div
                    key={opt.id}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                      {opt.label}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: opt.points >= 75 ? 'rgba(16,185,129,0.15)' : opt.points >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: opt.points >= 75 ? '#10B981' : opt.points >= 50 ? '#F59E0B' : '#EF4444',
                    }}>
                      {opt.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── MODAL: CRIAR / EDITAR PERGUNTA MQL ── */}
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
                <Target size={20} color="var(--adm-accent)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                  {editingQuestionId ? 'Editar Pergunta MQL' : 'Nova Pergunta MQL'}
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
                  required
                  placeholder="Ex: Qual o prazo previsto para fechamento do contrato?"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', height: '40px', borderRadius: '10px' }}
                />
              </div>

              {/* Question Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#9E988D', marginBottom: '6px' }}>
                  Orientação para o Time Comercial (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Avalia urgência e maturidade da contratação"
                  value={questionDescription}
                  onChange={(e) => setQuestionDescription(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', height: '38px', borderRadius: '10px' }}
                />
              </div>

              {/* Options & Points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Alternativas de Resposta Única & Pontuação (0 a 100) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOptionRow}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-accent)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={13} /> Adicionar Opção
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {options.map((opt, oIdx) => (
                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        required
                        placeholder={`Alternativa ${oIdx + 1}...`}
                        value={opt.label}
                        onChange={(e) => handleOptionChange(opt.id, 'label', e.target.value)}
                        className="adm-input"
                        style={{ flex: 1, height: '38px', borderRadius: '8px' }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '110px' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          required
                          value={opt.points}
                          onChange={(e) => handleOptionChange(opt.id, 'points', Number(e.target.value) || 0)}
                          className="adm-input"
                          style={{ width: '65px', height: '38px', borderRadius: '8px', textAlign: 'center', fontWeight: 800 }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#9E988D', fontWeight: 700 }}>pts</span>
                      </div>

                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionRow(opt.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="adm-btn-secondary"
                  style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.8rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{ padding: '10px 22px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800 }}
                >
                  Salvar Pergunta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
