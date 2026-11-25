import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BarChart3, Building2, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink, Eye,
  FolderPlus, GitBranch, Layout, Link2, Loader2, Palette, Plus, Save, Sparkles, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../context/AdminStateContext';
import { surveyPublicUrl, surveyService } from '../../services/surveyService';
import { generateUuid } from '../../utils/uuid';
import { Select, Switch } from '../ui';
import { SurveyRunner } from '../public/SurveyRunner';
import { SurveyMediaUpload } from './surveys/SurveyMediaUpload';
import {
  LOGIC_TYPES, SURVEY_TYPE_LABELS,
  type Survey, type SurveyButtonRadius, type SurveyCoverLayout, type SurveyFontFamily,
  type SurveyLogicOp, type SurveyLogicRule, type SurveyQuestion, type SurveyQuestionType,
} from '../../types/survey';

interface Props {
  surveyId: string;
  masterId: string;
  onBack: () => void;
  onOpenResults: (id: string) => void;
}

const label: React.CSSProperties = {
  display: 'block', fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5,
};
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--adm-border, #CBD5E1)', background: 'var(--adm-bg-input, #fff)',
  color: 'var(--adm-text-title)', fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none',
};
const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
  border: '1px solid var(--adm-border)', background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)',
  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
  borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-card)',
  color: 'var(--adm-text-muted)', cursor: 'pointer',
};

const TYPE_ORDER: SurveyQuestionType[] = [
  'single_choice', 'multi_choice', 'short_text', 'long_text', 'scale', 'rating',
  'yes_no', 'dropdown', 'date', 'phone', 'email', 'number', 'statement',
];

const blankQuestion = (surveyId: string, type: SurveyQuestionType, position: number): SurveyQuestion => {
  const withChoices = type === 'single_choice' || type === 'multi_choice' || type === 'dropdown';
  return {
    id: generateUuid(),
    surveyId,
    position,
    type,
    title: type === 'statement' ? 'Texto informativo' : 'Nova pergunta',
    description: '',
    required: false,
    options: withChoices
      ? { choices: [{ id: generateUuid(), label: 'Opção 1' }, { id: generateUuid(), label: 'Opção 2' }] }
      : type === 'scale'
        ? { scaleMin: 0, scaleMax: 10, minLabel: 'Nada satisfeito', maxLabel: 'Excelente' }
        : type === 'rating'
          ? { scaleMin: 1, scaleMax: 5 }
          : {},
    logic: [],
  };
};

interface TopicGroup {
  key: string;
  title: string;
  description: string;
  startIndex: number;
  items: Array<{ q: SurveyQuestion; index: number }>;
}

/** Construtor moderno estilo Google Forms: Capa -> Sessões & Perguntas -> Tela de Obrigado, com painel lateral de Tema e Unidade. */
export const AdminSurveyBuilderView: React.FC<Props> = ({ surveyId, masterId, onBack, onOpenResults }) => {
  const { venues } = useAdminState();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [activeBlock, setActiveBlock] = useState<string>('capa');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [logicOpenId, setLogicOpenId] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    surveyService.get(surveyId, masterId).then(res => {
      if (cancelled) return;
      if (res) {
        setSurvey(res.survey);
        setQuestions(res.questions);
        setActiveBlock(res.questions[0]?.id || 'capa');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [surveyId, masterId]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const patchSurvey = useCallback((p: Partial<Survey>) => {
    setSurvey(s => (s ? { ...s, ...p } : s));
    setDirty(true);
  }, []);

  const updateQuestion = useCallback((id: string, p: Partial<SurveyQuestion>) => {
    setQuestions(qs => qs.map(q => (q.id === id ? { ...q, ...p } : q)));
    setDirty(true);
  }, []);

  const topicGroups = useMemo<TopicGroup[]>(() => {
    const groups: TopicGroup[] = [];
    questions.forEach((q, index) => {
      const explicitTitle = q.options?.sectionTitle?.trim();
      if (groups.length === 0 || explicitTitle) {
        groups.push({
          key: q.id,
          title: explicitTitle || 'Sobre Você',
          description: q.options?.sectionDescription || '',
          startIndex: index,
          items: [{ q, index }],
        });
      } else {
        groups[groups.length - 1].items.push({ q, index });
      }
    });
    return groups;
  }, [questions]);

  const scrollToBlock = (id: string) => {
    setActiveBlock(id);
    setTimeout(() => {
      blockRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 40);
  };

  const addQuestionAt = (type: SurveyQuestionType, insertAfterIndex?: number, sectionTitle?: string) => {
    const pos = insertAfterIndex !== undefined ? insertAfterIndex + 1 : questions.length;
    const q = blankQuestion(surveyId, type, pos);
    if (sectionTitle) {
      q.options = { ...q.options, sectionTitle };
    }
    setQuestions(qs => {
      const next = [...qs];
      next.splice(pos, 0, q);
      return next.map((item, idx) => ({ ...item, position: idx }));
    });
    scrollToBlock(q.id);
    setDirty(true);
  };

  const addNewTopicAfter = (insertAfterIndex?: number) => {
    const num = topicGroups.length + 1;
    addQuestionAt('single_choice', insertAfterIndex ?? questions.length - 1, `Sessão ${num}`);
  };

  const move = (id: string, delta: number) => {
    setQuestions(qs => {
      const i = qs.findIndex(q => q.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[i], next[j]] = [next[j], next[i]];
      const order = new Map(next.map((q, k) => [q.id, k]));
      return next.map((q, k) => ({
        ...q,
        position: k,
        logic: q.logic.filter(r => r.goto === 'end' || (order.get(r.goto) ?? -1) > k),
      }));
    });
    setDirty(true);
  };

  const duplicate = (q: SurveyQuestion) => {
    const copy: SurveyQuestion = {
      ...q,
      id: generateUuid(),
      title: `${q.title} (cópia)`,
      logic: [],
      options: {
        ...q.options,
        sectionTitle: undefined,
        sectionDescription: undefined,
        choices: q.options.choices?.map(c => ({ ...c, id: generateUuid() })),
      },
    };
    setQuestions(qs => {
      const i = qs.findIndex(x => x.id === q.id);
      const next = [...qs];
      next.splice(i + 1, 0, copy);
      return next.map((item, idx) => ({ ...item, position: idx }));
    });
    scrollToBlock(copy.id);
    setDirty(true);
  };

  const remove = (id: string) => {
    setQuestions(qs => {
      const idx = qs.findIndex(x => x.id === id);
      const removed = qs[idx];
      const filtered = qs.filter(q => q.id !== id);
      if (removed?.options?.sectionTitle && filtered[idx] && !filtered[idx].options?.sectionTitle) {
        filtered[idx] = {
          ...filtered[idx],
          options: {
            ...filtered[idx].options,
            sectionTitle: removed.options.sectionTitle,
            sectionDescription: removed.options.sectionDescription,
          },
        };
      }
      return filtered.map((q, k) => ({
        ...q,
        position: k,
        logic: q.logic.filter(r => r.goto !== id),
      }));
    });
    setActiveBlock(prev => (prev === id ? 'capa' : prev));
    setDirty(true);
  };

  const save = async (): Promise<boolean> => {
    if (!survey) return false;
    if (!survey.title.trim()) { toast.warning('Dê um nome à pesquisa.'); return false; }
    const empty = questions.find(q => !q.title.trim());
    if (empty) { toast.warning('Há pergunta sem título.'); scrollToBlock(empty.id); return false; }
    const noChoices = questions.find(q =>
      (q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'dropdown') &&
      (q.options.choices || []).filter(c => c.label.trim()).length < 2
    );
    if (noChoices) {
      toast.warning('Perguntas de escolha precisam de pelo menos 2 opções.');
      scrollToBlock(noChoices.id);
      return false;
    }
    setSaving(true);
    try {
      const cleaned = questions.map((q, idx) => ({
        ...q,
        position: idx,
        options: { ...q.options, choices: q.options.choices?.filter(c => c.label.trim()) },
      }));
      await surveyService.update(survey.id, masterId, {
        title: survey.title.trim(),
        description: survey.description,
        venueId: survey.venueId,
        welcome: survey.welcome,
        thanks: survey.thanks,
        theme: survey.theme,
      });
      await surveyService.saveQuestions(survey.id, masterId, cleaned);
      setQuestions(cleaned);
      setDirty(false);
      toast.success('Pesquisa salva.');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!survey) return;
    if (survey.status !== 'published' && questions.filter(q => q.type !== 'statement').length === 0) {
      toast.warning('Adicione pelo menos uma pergunta antes de publicar.');
      return;
    }
    if (dirty && !(await save())) return;
    const next = survey.status === 'published' ? 'closed' : 'published';
    try {
      await surveyService.update(survey.id, masterId, { status: next });
      setSurvey({ ...survey, status: next });
      toast.success(next === 'published' ? 'Pesquisa publicada. O link já funciona.' : 'Pesquisa encerrada. O link não recebe mais respostas.');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível mudar o status.');
    }
  };

  const selectedVenue = venues.find(v => v.id === survey?.venueId);
  const accentColor = survey?.theme?.color || '#0284C7';
  const link = survey ? surveyPublicUrl(survey.slug) : '';
  const runnerSurvey = useMemo(() => (
    survey
      ? {
          title: survey.title,
          description: survey.description,
          welcome: survey.welcome,
          thanks: survey.thanks,
          theme: survey.theme,
          questions,
          venueName: selectedVenue?.name || null,
        }
      : null
  ), [survey, questions, selectedVenue?.name]);

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader2 size={24} className="animate-spin" /></div>;
  if (!survey) return <div style={{ padding: 40 }}>Pesquisa não encontrada. <button type="button" onClick={onBack} style={ghostBtn}>Voltar</button></div>;

  const published = survey.status === 'published';
  const setWelcome = (p: Partial<Survey['welcome']>) => patchSurvey({ welcome: { ...survey.welcome, ...p } });
  const setThanks = (p: Partial<Survey['thanks']>) => patchSurvey({ thanks: { ...survey.thanks, ...p } });

  const renderLogic = (q: SurveyQuestion, idx: number) => {
    const later = questions.slice(idx + 1);
    const numeric = q.type === 'scale' || q.type === 'rating' || q.type === 'number';
    const ops: Array<{ v: SurveyLogicOp; l: string }> = numeric
      ? [{ v: 'is', l: 'for igual a' }, { v: 'gt', l: 'for maior que' }, { v: 'lt', l: 'for menor que' }, { v: 'between', l: 'estiver entre' }]
      : [{ v: 'is', l: 'for' }, { v: 'is_not', l: 'não for' }];
    const setRule = (i: number, p: Partial<SurveyLogicRule>) => updateQuestion(q.id, { logic: q.logic.map((r, k) => (k === i ? { ...r, ...p } : r)) });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 10, background: 'var(--adm-bg-app)', border: '1px solid var(--adm-border)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
          Regras de direcionamento condicional
        </div>
        {q.logic.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: 8, borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-card)' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>Se responder</span>
            <div style={{ width: 130 }}>
              <Select value={r.op} onChange={e => setRule(i, { op: e.target.value as SurveyLogicOp })} style={input}>
                {ops.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </div>
            {numeric ? (
              <>
                <input type="number" value={r.value === undefined ? '' : String(r.value)} onChange={e => setRule(i, { value: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ ...input, width: 70 }} />
                {r.op === 'between' && <><span style={{ fontSize: '0.76rem' }}>e</span><input type="number" value={r.value2 ?? ''} onChange={e => setRule(i, { value2: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ ...input, width: 70 }} /></>}
              </>
            ) : (
              <div style={{ width: 175 }}>
                <Select value={String(r.value ?? '')} onChange={e => setRule(i, { value: e.target.value })} style={input}>
                  <option value="">Escolha</option>
                  {q.type === 'yes_no' ? <><option value="yes">Sim</option><option value="no">Não</option></> : (q.options.choices || []).map(c => <option key={c.id} value={c.id}>{c.label || '(sem texto)'}</option>)}
                </Select>
              </div>
            )}
            <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>ir para</span>
            <div style={{ flex: 1, minWidth: 175 }}>
              <Select value={r.goto} onChange={e => setRule(i, { goto: e.target.value })} style={input}>
                <option value="end">Finalizar (Tela de Obrigado)</option>
                {later.map((x, k) => <option key={x.id} value={x.id}>{idx + k + 2}. {x.title.slice(0, 40)}</option>)}
              </Select>
            </div>
            <button type="button" aria-label="Remover regra" onClick={() => updateQuestion(q.id, { logic: q.logic.filter((_, k) => k !== i) })} style={iconBtn}><X size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => updateQuestion(q.id, { logic: [...q.logic, { op: 'is', goto: later[0]?.id || 'end' }] })} style={{ ...ghostBtn, alignSelf: 'flex-start' }}>
          <Plus size={13} /> Adicionar regra
        </button>
      </div>
    );
  };

  const renderQuestionCard = (q: SurveyQuestion, idx: number) => {
    const isActive = q.id === activeBlock;
    const opts = q.options || {};
    const setOpts = (p: Partial<typeof opts>) => updateQuestion(q.id, { options: { ...opts, ...p } });
    const hasChoices = q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'dropdown';

    return (
      <div
        key={q.id}
        ref={el => { blockRefs.current[q.id] = el; }}
        onClick={() => setActiveBlock(q.id)}
        style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 10 }}
      >
        <div style={{
          flex: 1,
          borderRadius: 14,
          background: 'var(--adm-bg-card)',
          border: `1px solid ${isActive ? accentColor : 'var(--adm-border)'}`,
          borderLeft: `5px solid ${isActive ? accentColor : 'transparent'}`,
          padding: isActive ? '18px 20px' : '14px 18px',
          boxShadow: isActive ? `0 10px 28px ${accentColor}1f` : '0 1px 4px rgba(0,0,0,0.04)',
          cursor: isActive ? 'default' : 'pointer',
          transition: 'all 0.16s ease',
        }}>
          {!isActive ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: accentColor, background: `${accentColor}16`, padding: '2px 8px', borderRadius: 6 }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    {q.title || '(sem título)'}
                    {q.required && <span style={{ color: '#DC2626', marginLeft: 4 }}>*</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.72rem', color: 'var(--adm-text-muted)', flexWrap: 'wrap' }}>
                  <span>{SURVEY_TYPE_LABELS[q.type]}</span>
                  {hasChoices && (opts.choices?.length || 0) > 0 && <span>• {opts.choices!.length} opções</span>}
                  {q.logic.length > 0 && <span style={{ color: '#059669', fontWeight: 700 }}>• {q.logic.length} regra(s)</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button type="button" title="Duplicar para baixo" onClick={() => duplicate(q)} style={iconBtn}><Copy size={13} /></button>
                <button type="button" title="Subir" onClick={() => move(q.id, -1)} disabled={idx === 0} style={{ ...iconBtn, opacity: idx === 0 ? 0.3 : 1 }}><ChevronUp size={14} /></button>
                <button type="button" title="Descer" onClick={() => move(q.id, 1)} disabled={idx === questions.length - 1} style={{ ...iconBtn, opacity: idx === questions.length - 1 ? 0.3 : 1 }}><ChevronDown size={14} /></button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 215px', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={label}>Pergunta {idx + 1}</label>
                  <input
                    value={q.title}
                    onChange={e => updateQuestion(q.id, { title: e.target.value })}
                    placeholder="Digite a pergunta..."
                    style={{ ...input, fontSize: '0.96rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={label}>Tipo de resposta</label>
                  <Select
                    value={q.type}
                    onChange={e => {
                      const type = e.target.value as SurveyQuestionType;
                      const fresh = blankQuestion(surveyId, type, q.position);
                      updateQuestion(q.id, {
                        type,
                        options: {
                          ...fresh.options,
                          sectionTitle: q.options?.sectionTitle,
                          sectionDescription: q.options?.sectionDescription,
                        },
                        logic: [],
                      });
                    }}
                    style={input}
                  >
                    {TYPE_ORDER.map(t => <option key={t} value={t}>{SURVEY_TYPE_LABELS[t]}</option>)}
                  </Select>
                </div>
              </div>

              <input
                value={q.description || ''}
                onChange={e => updateQuestion(q.id, { description: e.target.value })}
                placeholder="Descrição ou texto de apoio (opcional)"
                style={{ ...input, fontSize: '0.78rem' }}
              />

              {hasChoices && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={label}>Alternativas</label>
                  {(opts.choices || []).map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ width: 22, fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        value={c.label}
                        onChange={e => setOpts({ choices: (opts.choices || []).map(x => (x.id === c.id ? { ...x, label: e.target.value } : x)) })}
                        style={input}
                      />
                      <button
                        type="button"
                        aria-label="Remover opção"
                        onClick={() => setOpts({ choices: (opts.choices || []).filter(x => x.id !== c.id) })}
                        style={iconBtn}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setOpts({ choices: [...(opts.choices || []), { id: generateUuid(), label: `Opção ${(opts.choices || []).length + 1}` }] })}
                      style={ghostBtn}
                    >
                      <Plus size={13} /> Adicionar opção
                    </button>
                    <Switch checked={Boolean(opts.allowOther)} onChange={e => setOpts({ allowOther: e.target.checked })} label='Incluir "Outro"' />
                    {q.type === 'multi_choice' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>
                        Máx. escolhas:
                        <input
                          type="number"
                          min={1}
                          value={opts.maxSelections ?? ''}
                          placeholder="livre"
                          onChange={e => setOpts({ maxSelections: e.target.value === '' ? undefined : Math.max(1, Number(e.target.value)) })}
                          style={{ ...input, width: 72 }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {(q.type === 'scale' || q.type === 'rating') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={label}>Rótulo mínimo</label><input value={opts.minLabel || ''} onChange={e => setOpts({ minLabel: e.target.value })} style={input} /></div>
                  <div><label style={label}>Rótulo máximo</label><input value={opts.maxLabel || ''} onChange={e => setOpts({ maxLabel: e.target.value })} style={input} /></div>
                </div>
              )}

              {(q.type === 'short_text' || q.type === 'long_text' || q.type === 'number') && (
                <div style={{ maxWidth: 380 }}>
                  <input value={opts.placeholder || ''} onChange={e => setOpts({ placeholder: e.target.value })} placeholder="Texto de exemplo no campo (placeholder)" style={{ ...input, fontSize: '0.78rem' }} />
                </div>
              )}

              <SurveyMediaUpload
                label="Imagem ou vídeo nesta pergunta (opcional • R2)"
                value={opts.mediaUrl || ''}
                kind="any"
                folder="surveys/questions"
                onChange={url => {
                  const isVid = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url) || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
                  setOpts({ mediaUrl: url || undefined, mediaType: url ? (isVid ? 'video' : 'image') : undefined });
                }}
              />

              {LOGIC_TYPES.includes(q.type) && logicOpenId === q.id && idx < questions.length - 1 && renderLogic(q, idx)}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTop: '1px solid var(--adm-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {q.type !== 'statement' && (
                    <Switch checked={q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} label="Obrigatória" />
                  )}
                  {LOGIC_TYPES.includes(q.type) && idx < questions.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setLogicOpenId(prev => prev === q.id ? null : q.id)}
                      style={{
                        ...ghostBtn,
                        padding: '5px 10px',
                        fontSize: '0.72rem',
                        borderColor: q.logic.length > 0 ? '#059669' : 'var(--adm-border)',
                        color: q.logic.length > 0 ? '#059669' : 'var(--adm-text-title)',
                      }}
                    >
                      <GitBranch size={13} />
                      <span>Lógica{q.logic.length > 0 ? ` (${q.logic.length})` : ''}</span>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button type="button" title="Subir" onClick={() => move(q.id, -1)} disabled={idx === 0} style={{ ...iconBtn, opacity: idx === 0 ? 0.3 : 1 }}><ChevronUp size={14} /></button>
                  <button type="button" title="Descer" onClick={() => move(q.id, 1)} disabled={idx === questions.length - 1} style={{ ...iconBtn, opacity: idx === questions.length - 1 ? 0.3 : 1 }}><ChevronDown size={14} /></button>
                  <button type="button" title="Duplicar abaixo" onClick={() => duplicate(q)} style={iconBtn}><Copy size={13} /></button>
                  <button type="button" title="Excluir" onClick={() => remove(q.id)} style={{ ...iconBtn, color: '#DC2626' }}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra Flutuante Estilo Google Forms ao lado do Card Ativo */}
        {isActive && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: 6,
              borderRadius: 12,
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              position: 'sticky',
              top: 16,
              flexShrink: 0,
            }}
          >
            <button type="button" title="Adicionar pergunta abaixo" onClick={() => addQuestionAt('single_choice', idx)} style={{ ...iconBtn, background: accentColor, color: '#fff', border: 'none' }}>
              <Plus size={16} />
            </button>
            <button type="button" title="Duplicar esta pergunta abaixo" onClick={() => duplicate(q)} style={iconBtn}>
              <Copy size={14} />
            </button>
            <button type="button" title="Iniciar nova sessão abaixo" onClick={() => addNewTopicAfter(idx)} style={iconBtn}>
              <FolderPlus size={14} />
            </button>
            <button type="button" title="Excluir pergunta" onClick={() => remove(q.id)} style={{ ...iconBtn, color: '#DC2626' }}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--adm-bg-app)' }}>
      {/* Barra Superior */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--adm-border)', flexWrap: 'wrap', background: 'var(--adm-bg-card)' }}>
        <button type="button" onClick={() => { if (!dirty || window.confirm('Há alterações não salvas. Sair mesmo assim?')) onBack(); }} style={ghostBtn}>
          <ArrowLeft size={14} /> Pesquisas
        </button>
        <input
          value={survey.title}
          onChange={e => patchSurvey({ title: e.target.value })}
          style={{ ...input, flex: 1, minWidth: 200, maxWidth: 420, fontWeight: 800, fontSize: '0.95rem' }}
          aria-label="Nome da pesquisa"
        />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: '#fff', background: published ? '#059669' : survey.status === 'closed' ? '#64748B' : '#D97706' }}>
          {published ? 'Publicada' : survey.status === 'closed' ? 'Encerrada' : 'Rascunho'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setPreview(true)} style={ghostBtn}><Eye size={14} /> Pré-visualizar</button>
          <button type="button" onClick={() => onOpenResults(survey.id)} style={ghostBtn}><BarChart3 size={14} /> Resultados</button>
          <button type="button" onClick={() => void save()} disabled={saving || !dirty} style={{ ...ghostBtn, opacity: dirty ? 1 : 0.55 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {dirty ? 'Salvar' : 'Salvo'}
          </button>
          <button type="button" onClick={() => void toggleStatus()} style={{ ...ghostBtn, background: published ? 'var(--adm-bg-card)' : accentColor, color: published ? 'var(--adm-text-title)' : '#fff', border: published ? '1px solid var(--adm-border)' : 'none' }}>
            {published ? 'Encerrar' : survey.status === 'closed' ? 'Publicar de novo' : 'Publicar'}
          </button>
        </div>
      </div>

      {published && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px', fontSize: '0.78rem', background: 'rgba(5,150,105,0.08)', borderBottom: '1px solid var(--adm-border)', flexWrap: 'wrap' }}>
          <Link2 size={14} color="#059669" />
          <span style={{ color: 'var(--adm-text-muted)' }}>Link público direto:</span>
          <strong style={{ color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</strong>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(link); toast.success('Link copiado.'); }} style={{ ...ghostBtn, padding: '3px 9px' }}><Copy size={12} /> Copiar</button>
          <a href={link} target="_blank" rel="noreferrer" style={{ ...ghostBtn, padding: '3px 9px', textDecoration: 'none' }}><ExternalLink size={12} /> Abrir</a>
        </div>
      )}

      {/* Workspace Tri-Colunar: Navegação | Canvas Estilo Google Forms | Aparência & Unidade */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '230px 1fr 290px' }}>
        {/* Coluna Esquerda: Mapa do Formulário */}
        <aside style={{ borderRight: '1px solid var(--adm-border)', background: 'var(--adm-bg-card)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--adm-border)', fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
            Etapas do Formulário
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => scrollToBlock('capa')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${activeBlock === 'capa' ? accentColor : 'var(--adm-border)'}`,
                background: activeBlock === 'capa' ? `${accentColor}14` : 'transparent',
                color: activeBlock === 'capa' ? accentColor : 'var(--adm-text-title)',
                fontSize: '0.78rem', fontWeight: 700, textAlign: 'left',
              }}
            >
              <Layout size={14} /> <span>Capa Principal</span>
            </button>

            {topicGroups.map((grp, gIdx) => (
              <div key={grp.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: accentColor, padding: '4px 6px 2px', textTransform: 'uppercase' }}>
                  Sessão {gIdx + 1}: {grp.title}
                </div>
                {grp.items.map(({ q, index }) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => scrollToBlock(q.id)}
                    style={{
                      textAlign: 'left', padding: '5px 8px', borderRadius: 7, cursor: 'pointer',
                      border: `1px solid ${activeBlock === q.id ? accentColor : 'transparent'}`,
                      background: activeBlock === q.id ? `${accentColor}14` : 'transparent',
                      color: 'var(--adm-text-title)', fontSize: '0.74rem', fontWeight: activeBlock === q.id ? 700 : 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {index + 1}. {q.title || '(sem título)'}
                  </button>
                ))}
              </div>
            ))}

            <button
              type="button"
              onClick={() => scrollToBlock('obrigado')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginTop: 4,
                border: `1px solid ${activeBlock === 'obrigado' ? '#059669' : 'var(--adm-border)'}`,
                background: activeBlock === 'obrigado' ? 'rgba(5,150,105,0.12)' : 'transparent',
                color: activeBlock === 'obrigado' ? '#059669' : 'var(--adm-text-title)',
                fontSize: '0.78rem', fontWeight: 700, textAlign: 'left',
              }}
            >
              <CheckCircle2 size={14} /> <span>Capa de Obrigado</span>
            </button>
          </div>
          <div style={{ padding: 10, borderTop: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" onClick={() => addQuestionAt('single_choice')} style={{ ...ghostBtn, justifyContent: 'center', background: accentColor, color: '#fff', border: 'none' }}>
              <Plus size={14} /> Nova Pergunta
            </button>
            <button type="button" onClick={() => addNewTopicAfter()} style={{ ...ghostBtn, justifyContent: 'center' }}>
              <FolderPlus size={14} /> Nova Sessão
            </button>
          </div>
        </aside>

        {/* Coluna Central: Canvas Estilo Google Forms (Capa -> Sessões -> Obrigado) */}
        <main style={{ overflowY: 'auto', padding: '24px 28px', display: 'flex', justifyContent: 'center', background: survey.theme.backgroundColor ? `${survey.theme.backgroundColor}22` : 'var(--adm-bg-app)' }}>
          <div style={{ width: '100%', maxWidth: 740, display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 60 }}>

            {/* Preview da Identidade da Unidade no Topo */}
            {(selectedVenue || survey.theme.logoUrl) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 12,
                background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)',
              }}>
                {survey.theme.logoUrl ? (
                  <img src={survey.theme.logoUrl} alt="" style={{ height: 34, maxWidth: 140, objectFit: 'contain', borderRadius: 6 }} />
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accentColor}18`, color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={18} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {selectedVenue?.name || 'Todas as unidades'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                    Exibido no cabeçalho durante todo o preenchimento
                  </div>
                </div>
              </div>
            )}

            {/* ── SESSÃO CAPA PRINCIPAL ── */}
            <div
              ref={el => { blockRefs.current['capa'] = el; }}
              onClick={() => setActiveBlock('capa')}
              style={{
                background: 'var(--adm-bg-card)',
                border: `1px solid ${activeBlock === 'capa' ? accentColor : 'var(--adm-border)'}`,
                borderTop: `8px solid ${accentColor}`,
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: activeBlock === 'capa' ? `0 10px 28px ${accentColor}1f` : '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} /> Sessão Capa Principal (Boas-vindas)
                </span>
              </div>
              <input
                value={survey.welcome.title || ''}
                onChange={e => setWelcome({ title: e.target.value })}
                placeholder={survey.title || 'Título da capa'}
                style={{ ...input, fontSize: '1.15rem', fontWeight: 800 }}
              />
              <textarea
                rows={2}
                value={survey.welcome.text || ''}
                onChange={e => setWelcome({ text: e.target.value })}
                placeholder="Descrição de boas-vindas para o cliente..."
                style={{ ...input, resize: 'vertical' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                {([
                  ['centered', 'Centralizado'],
                  ['split_left', 'Mídia à Esquerda'],
                  ['split_right', 'Mídia à Direita'],
                  ['hero_bg', 'Fundo Completo'],
                ] as Array<[SurveyCoverLayout, string]>).map(([val, lbl]) => {
                  const active = (survey.welcome.layout || 'centered') === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWelcome({ layout: val })}
                      style={{
                        padding: '7px 8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
                        border: `1.5px solid ${active ? accentColor : 'var(--adm-border)'}`,
                        background: active ? `${accentColor}14` : 'transparent',
                        color: active ? accentColor : 'var(--adm-text-title)',
                      }}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SurveyMediaUpload label="Imagem de Capa (R2)" value={survey.welcome.coverImageUrl || ''} kind="image" folder="surveys/covers" onChange={url => setWelcome({ coverImageUrl: url || undefined })} />
                <SurveyMediaUpload label="Vídeo de Capa (R2 ou YouTube)" value={survey.welcome.coverVideoUrl || ''} kind="video" folder="surveys/videos" onChange={url => setWelcome({ coverVideoUrl: url || undefined })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12 }}>
                <div><label style={label}>Texto do botão</label><input value={survey.welcome.buttonLabel || ''} onChange={e => setWelcome({ buttonLabel: e.target.value })} placeholder="Começar" style={input} /></div>
                <div><label style={label}>Aviso de privacidade (opcional)</label><input value={survey.welcome.privacyNote || ''} onChange={e => setWelcome({ privacyNote: e.target.value })} placeholder="Ex.: Suas respostas são confidenciais." style={input} /></div>
              </div>
            </div>

            {/* ── SESSÕES / TÓPICOS E PERGUNTAS ── */}
            {topicGroups.map((grp, gIdx) => {
              const firstQ = grp.items[0]?.q;
              const lastIdxInGroup = grp.items[grp.items.length - 1]?.index ?? questions.length - 1;
              return (
                <div key={grp.key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderTop: `5px solid ${accentColor}`,
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Sessão {gIdx + 1} de {topicGroups.length}
                      </span>
                      {gIdx > 0 && firstQ && (
                        <button
                          type="button"
                          onClick={() => updateQuestion(firstQ.id, { options: { ...firstQ.options, sectionTitle: undefined, sectionDescription: undefined } })}
                          style={{ background: 'none', border: 'none', color: 'var(--adm-text-muted)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Mesclar com sessão anterior
                        </button>
                      )}
                    </div>
                    {firstQ && (
                      <>
                        <input
                          value={firstQ.options?.sectionTitle ?? grp.title}
                          onChange={e => updateQuestion(firstQ.id, { options: { ...firstQ.options, sectionTitle: e.target.value } })}
                          placeholder="Nome da sessão (ex: Sobre Você, Sobre o Evento)"
                          style={{ ...input, fontSize: '1.02rem', fontWeight: 800 }}
                        />
                        <input
                          value={firstQ.options?.sectionDescription ?? ''}
                          onChange={e => updateQuestion(firstQ.id, { options: { ...firstQ.options, sectionDescription: e.target.value } })}
                          placeholder="Descrição desta sessão (opcional)"
                          style={{ ...input, fontSize: '0.78rem' }}
                        />
                      </>
                    )}
                  </div>

                  {grp.items.map(({ q, index }) => renderQuestionCard(q, index))}

                  {/* Barra rápida "+" ao final da sessão */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 4 }}>
                    <button type="button" onClick={() => addQuestionAt('single_choice', lastIdxInGroup)} style={{ ...ghostBtn, borderColor: `${accentColor}66`, color: accentColor }}>
                      <Plus size={14} /> Adicionar Pergunta
                    </button>
                    <button type="button" onClick={() => addNewTopicAfter(lastIdxInGroup)} style={ghostBtn}>
                      <FolderPlus size={14} /> Nova Sessão abaixo
                    </button>
                  </div>
                </div>
              );
            })}

            {questions.length === 0 && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', padding: 20, border: '1.5px dashed var(--adm-border)', borderRadius: 14 }}>
                <button type="button" onClick={() => addQuestionAt('single_choice')} style={{ ...ghostBtn, background: accentColor, color: '#fff', border: 'none' }}>
                  <Plus size={15} /> Adicionar Primeira Pergunta
                </button>
              </div>
            )}

            {/* ── SESSÃO CAPA DE OBRIGADO PERSONALIZADA ── */}
            <div
              ref={el => { blockRefs.current['obrigado'] = el; }}
              onClick={() => setActiveBlock('obrigado')}
              style={{
                background: 'var(--adm-bg-card)',
                border: `1px solid ${activeBlock === 'obrigado' ? '#059669' : 'var(--adm-border)'}`,
                borderTop: '8px solid #059669',
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: activeBlock === 'obrigado' ? '0 10px 28px rgba(5,150,105,0.14)' : '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Sessão Final: Capa de Obrigado Personalizada
                </span>
                <Switch
                  checked={survey.thanks.showBadge !== false}
                  onChange={e => setThanks({ showBadge: e.target.checked })}
                  label="Selo de confirmação"
                />
              </div>
              <input
                value={survey.thanks.title || ''}
                onChange={e => setThanks({ title: e.target.value })}
                placeholder="Título de agradecimento (ex.: Muito obrigado!)"
                style={{ ...input, fontSize: '1.08rem', fontWeight: 800 }}
              />
              <textarea
                rows={3}
                value={survey.thanks.text || ''}
                onChange={e => setThanks({ text: e.target.value })}
                placeholder="Mensagem final exibida após enviar a pesquisa..."
                style={{ ...input, resize: 'vertical' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {([
                  ['centered', 'Centralizado'],
                  ['split_left', 'Mídia à Esquerda'],
                  ['split_right', 'Mídia à Direita'],
                ] as const).map(([val, lbl]) => {
                  const active = (survey.thanks.layout || 'centered') === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setThanks({ layout: val })}
                      style={{
                        padding: '7px 8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
                        border: `1.5px solid ${active ? '#059669' : 'var(--adm-border)'}`,
                        background: active ? 'rgba(5,150,105,0.10)' : 'transparent',
                        color: active ? '#059669' : 'var(--adm-text-title)',
                      }}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SurveyMediaUpload label="Imagem de Obrigado (R2)" value={survey.thanks.imageUrl || ''} kind="image" folder="surveys/thanks" onChange={url => setThanks({ imageUrl: url || undefined })} />
                <SurveyMediaUpload label="Vídeo de Obrigado (R2 ou YouTube)" value={survey.thanks.videoUrl || ''} kind="video" folder="surveys/videos" onChange={url => setThanks({ videoUrl: url || undefined })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={label}>Texto do botão final (opcional)</label><input value={survey.thanks.linkLabel || ''} onChange={e => setThanks({ linkLabel: e.target.value })} placeholder="Ex.: Falar com nossa equipe" style={input} /></div>
                <div><label style={label}>Link do botão</label><input value={survey.thanks.linkUrl || ''} onChange={e => setThanks({ linkUrl: e.target.value })} placeholder="https://..." style={input} /></div>
              </div>
            </div>
          </div>
        </main>

        {/* Coluna Direita: Painel Rápido de Tema, Cores & Unidade */}
        <aside style={{ borderLeft: '1px solid var(--adm-border)', background: 'var(--adm-bg-card)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <Palette size={15} color={accentColor} />
            <span>Unidade & Aparência</span>
          </div>

          <div>
            <label style={label}>Unidade do Formulário</label>
            <Select
              value={survey.venueId || ''}
              onChange={e => {
                const vId = e.target.value || null;
                const vObj = venues.find(v => v.id === vId);
                const nextTheme = { ...survey.theme };
                if (vObj?.logoUrl && !survey.theme.logoUrl) {
                  nextTheme.logoUrl = vObj.logoUrl;
                }
                patchSurvey({ venueId: vId, theme: nextTheme });
              }}
              style={input}
            >
              <option value="">Todas as unidades</option>
              {venues.filter(v => v.id && v.id !== 'all').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </div>

          <SurveyMediaUpload
            label="Logo fixa no topo (R2)"
            value={survey.theme.logoUrl || ''}
            kind="image"
            folder="surveys/logos"
            onChange={url => patchSurvey({ theme: { ...survey.theme, logoUrl: url || undefined } })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={label}>Destaque</label>
              <input type="color" value={survey.theme.color || '#0284C7'} onChange={e => patchSurvey({ theme: { ...survey.theme, color: e.target.value } })} style={{ width: '100%', height: 34, border: '1px solid var(--adm-border)', borderRadius: 8, background: 'transparent', padding: 2, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={label}>Fundo</label>
              <input type="color" value={survey.theme.backgroundColor || '#F8FAFC'} onChange={e => patchSurvey({ theme: { ...survey.theme, backgroundColor: e.target.value } })} style={{ width: '100%', height: 34, border: '1px solid var(--adm-border)', borderRadius: 8, background: 'transparent', padding: 2, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={label}>Texto</label>
              <input type="color" value={survey.theme.textColor || '#0F172A'} onChange={e => patchSurvey({ theme: { ...survey.theme, textColor: e.target.value } })} style={{ width: '100%', height: 34, border: '1px solid var(--adm-border)', borderRadius: 8, background: 'transparent', padding: 2, cursor: 'pointer' }} />
            </div>
          </div>

          <div>
            <label style={label}>Tipografia</label>
            <Select value={survey.theme.fontFamily || 'Inter'} onChange={e => patchSurvey({ theme: { ...survey.theme, fontFamily: e.target.value as SurveyFontFamily } })} style={input}>
              <option value="Inter">Inter (Moderna)</option>
              <option value="Poppins">Poppins (Geométrica)</option>
              <option value="DM Sans">DM Sans (Clean)</option>
              <option value="Playfair Display">Playfair (Clássica)</option>
            </Select>
          </div>

          <div>
            <label style={label}>Formato dos botões</label>
            <Select value={survey.theme.buttonRadius || 'rounded'} onChange={e => patchSurvey({ theme: { ...survey.theme, buttonRadius: e.target.value as SurveyButtonRadius } })} style={input}>
              <option value="rounded">Arredondados</option>
              <option value="pill">Pílula</option>
              <option value="square">Retos</option>
            </Select>
          </div>

          <SurveyMediaUpload
            label="Imagem de Fundo (R2)"
            value={survey.theme.backgroundImageUrl || ''}
            kind="image"
            folder="surveys/backgrounds"
            onChange={url => patchSurvey({ theme: { ...survey.theme, backgroundImageUrl: url || undefined } })}
          />

          {survey.theme.backgroundImageUrl && (
            <div>
              <label style={label}>Contraste do Fundo ({Math.round((survey.theme.backgroundOverlay ?? 0.55) * 100)}%)</label>
              <input type="range" min={0} max={0.85} step={0.05} value={survey.theme.backgroundOverlay ?? 0.55} onChange={e => patchSurvey({ theme: { ...survey.theme, backgroundOverlay: Number(e.target.value) } })} style={{ width: '100%' }} />
            </div>
          )}
        </aside>
      </div>

      {preview && runnerSurvey && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(15,23,42,0.6)', padding: '3vh 3vw' }}>
          <div style={{ position: 'relative', height: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--adm-border)' }}>
            <SurveyRunner key={JSON.stringify(questions.map(q => q.id)) + survey.title} survey={runnerSurvey} preview onSubmit={async () => undefined} />
            <button type="button" onClick={() => setPreview(false)} style={{ position: 'absolute', top: 12, right: 12, ...ghostBtn, background: '#fff' }}><X size={14} /> Fechar preview</button>
          </div>
        </div>
      )}
    </div>
  );
};
