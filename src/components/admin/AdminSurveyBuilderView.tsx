import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, ChevronDown, ChevronUp, Copy, ExternalLink, Eye, FileText, Layout, Link2, Loader2, Palette, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../context/AdminStateContext';
import { surveyPublicUrl, surveyService } from '../../services/surveyService';
import { generateUuid } from '../../utils/uuid';
import { Select, Switch } from '../ui';
import { SurveyRunner } from '../public/SurveyRunner';
import { SurveyMediaUpload } from './surveys/SurveyMediaUpload';
import { LOGIC_TYPES, SURVEY_TYPE_LABELS, type Survey, type SurveyButtonRadius, type SurveyCoverLayout, type SurveyFontFamily, type SurveyLogicOp, type SurveyLogicRule, type SurveyQuestion, type SurveyQuestionType } from '../../types/survey';

interface Props {
  surveyId: string;
  masterId: string;
  onBack: () => void;
  onOpenResults: (id: string) => void;
}

const label: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--adm-border, #CBD5E1)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.84rem', fontFamily: 'inherit' };
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' };
const iconBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-muted)', cursor: 'pointer' };

const TYPE_ORDER: SurveyQuestionType[] = ['short_text', 'long_text', 'single_choice', 'multi_choice', 'dropdown', 'yes_no', 'scale', 'rating', 'number', 'email', 'phone', 'date', 'statement'];

const blankQuestion = (surveyId: string, type: SurveyQuestionType, position: number): SurveyQuestion => {
  const withChoices = type === 'single_choice' || type === 'multi_choice' || type === 'dropdown';
  return {
    id: generateUuid(), surveyId, position, type, title: type === 'statement' ? 'Texto informativo' : 'Nova pergunta', description: '', required: false,
    options: withChoices ? { choices: [{ id: generateUuid(), label: 'Opção 1' }, { id: generateUuid(), label: 'Opção 2' }] }
      : type === 'scale' ? { scaleMin: 0, scaleMax: 10, minLabel: 'Nada provável', maxLabel: 'Muito provável' }
      : type === 'rating' ? { scaleMin: 1, scaleMax: 5 } : {},
    logic: [],
  };
};

/** Editor da pesquisa: lista de perguntas, editor por tipo, logica condicional, ajustes das telas e preview igual ao que o lead ve. */
export const AdminSurveyBuilderView: React.FC<Props> = ({ surveyId, masterId, onBack, onOpenResults }) => {
  const { venues } = useAdminState();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'capa' | 'perguntas' | 'ajustes'>('perguntas');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [addMenu, setAddMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    surveyService.get(surveyId, masterId).then(res => {
      if (cancelled) return;
      if (res) { setSurvey(res.survey); setQuestions(res.questions); setSelectedId(res.questions[0]?.id || null); }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [surveyId, masterId]);

  // Avisa antes de sair da pagina com alteracoes nao salvas
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const patchSurvey = useCallback((p: Partial<Survey>) => { setSurvey(s => (s ? { ...s, ...p } : s)); setDirty(true); }, []);
  const updateQuestion = useCallback((id: string, p: Partial<SurveyQuestion>) => { setQuestions(qs => qs.map(q => (q.id === id ? { ...q, ...p } : q))); setDirty(true); }, []);
  const selected = questions.find(q => q.id === selectedId) || null;
  const selectedIndex = selected ? questions.findIndex(q => q.id === selected.id) : -1;

  const addQuestion = (type: SurveyQuestionType) => {
    const q = blankQuestion(surveyId, type, questions.length);
    setQuestions(qs => [...qs, q]); setSelectedId(q.id); setDirty(true); setAddMenu(false); setTab('perguntas');
  };
  const move = (id: string, delta: number) => {
    setQuestions(qs => {
      const i = qs.findIndex(q => q.id === id); const j = i + delta;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const next = [...qs]; [next[i], next[j]] = [next[j], next[i]];
      // regras que agora apontariam para tras deixam de valer: remove-as para nao confundir
      const order = new Map(next.map((q, k) => [q.id, k]));
      return next.map((q, k) => ({ ...q, logic: q.logic.filter(r => r.goto === 'end' || (order.get(r.goto) ?? -1) > k) }));
    });
    setDirty(true);
  };
  const duplicate = (q: SurveyQuestion) => {
    const copy: SurveyQuestion = { ...q, id: generateUuid(), title: `${q.title} (cópia)`, logic: [], options: { ...q.options, choices: q.options.choices?.map(c => ({ ...c, id: generateUuid() })) } };
    setQuestions(qs => { const i = qs.findIndex(x => x.id === q.id); const next = [...qs]; next.splice(i + 1, 0, copy); return next; });
    setSelectedId(copy.id); setDirty(true);
  };
  const remove = (id: string) => {
    setQuestions(qs => qs.filter(q => q.id !== id).map(q => ({ ...q, logic: q.logic.filter(r => r.goto !== id) })));
    setSelectedId(prev => (prev === id ? null : prev)); setDirty(true);
  };

  const save = async (): Promise<boolean> => {
    if (!survey) return false;
    if (!survey.title.trim()) { toast.warning('Dê um nome à pesquisa.'); return false; }
    const empty = questions.find(q => !q.title.trim());
    if (empty) { toast.warning('Há pergunta sem título.'); setSelectedId(empty.id); return false; }
    const noChoices = questions.find(q => (q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'dropdown') && (q.options.choices || []).filter(c => c.label.trim()).length < 2);
    if (noChoices) { toast.warning('Perguntas de escolha precisam de pelo menos 2 opções.'); setSelectedId(noChoices.id); return false; }
    setSaving(true);
    try {
      const cleaned = questions.map(q => ({ ...q, options: { ...q.options, choices: q.options.choices?.filter(c => c.label.trim()) } }));
      await surveyService.update(survey.id, masterId, { title: survey.title.trim(), description: survey.description, venueId: survey.venueId, welcome: survey.welcome, thanks: survey.thanks, theme: survey.theme });
      await surveyService.saveQuestions(survey.id, masterId, cleaned);
      setQuestions(cleaned); setDirty(false);
      toast.success('Pesquisa salva.');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar.');
      return false;
    } finally { setSaving(false); }
  };

  const toggleStatus = async () => {
    if (!survey) return;
    if (survey.status !== 'published' && questions.filter(q => q.type !== 'statement').length === 0) { toast.warning('Adicione pelo menos uma pergunta antes de publicar.'); return; }
    if (dirty && !(await save())) return;
    const next = survey.status === 'published' ? 'closed' : 'published';
    try { await surveyService.update(survey.id, masterId, { status: next }); setSurvey({ ...survey, status: next }); toast.success(next === 'published' ? 'Pesquisa publicada. O link já funciona.' : 'Pesquisa encerrada. O link não recebe mais respostas.'); }
    catch (e: any) { toast.error(e?.message || 'Não foi possível mudar o status.'); }
  };

  const link = survey ? surveyPublicUrl(survey.slug) : '';
  const runnerSurvey = useMemo(() => survey ? { title: survey.title, description: survey.description, welcome: survey.welcome, thanks: survey.thanks, theme: survey.theme, questions } : null, [survey, questions]);

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader2 size={24} className="animate-spin" /></div>;
  if (!survey) return <div style={{ padding: 40 }}>Pesquisa não encontrada. <button type="button" onClick={onBack} style={ghostBtn}>Voltar</button></div>;

  const published = survey.status === 'published';
  const sel = selected;

  const renderLogic = (q: SurveyQuestion, idx: number) => {
    const later = questions.slice(idx + 1);
    const numeric = q.type === 'scale' || q.type === 'rating' || q.type === 'number';
    const ops: Array<{ v: SurveyLogicOp; l: string }> = numeric
      ? [{ v: 'is', l: 'for igual a' }, { v: 'gt', l: 'for maior que' }, { v: 'lt', l: 'for menor que' }, { v: 'between', l: 'estiver entre' }]
      : [{ v: 'is', l: 'for' }, { v: 'is_not', l: 'não for' }];
    const setRule = (i: number, p: Partial<SurveyLogicRule>) => updateQuestion(q.id, { logic: q.logic.map((r, k) => (k === i ? { ...r, ...p } : r)) });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.logic.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: 8, borderRadius: 8, border: '1px solid var(--adm-border)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Se a resposta</span>
            <div style={{ width: 150 }}><Select value={r.op} onChange={e => setRule(i, { op: e.target.value as SurveyLogicOp })} style={input}>{ops.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></div>
            {numeric ? (
              <>
                <input type="number" value={r.value === undefined ? '' : String(r.value)} onChange={e => setRule(i, { value: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ ...input, width: 70 }} />
                {r.op === 'between' && <><span style={{ fontSize: '0.78rem' }}>e</span><input type="number" value={r.value2 ?? ''} onChange={e => setRule(i, { value2: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ ...input, width: 70 }} /></>}
              </>
            ) : (
              <div style={{ width: 170 }}>
                <Select value={String(r.value ?? '')} onChange={e => setRule(i, { value: e.target.value })} style={input}>
                  <option value="">Escolha</option>
                  {q.type === 'yes_no' ? <><option value="yes">Sim</option><option value="no">Não</option></> : (q.options.choices || []).map(c => <option key={c.id} value={c.id}>{c.label || '(sem texto)'}</option>)}
                </Select>
              </div>
            )}
            <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>ir para</span>
            <div style={{ width: 200 }}>
              <Select value={r.goto} onChange={e => setRule(i, { goto: e.target.value })} style={input}>
                <option value="end">Finalizar a pesquisa</option>
                {later.map((x, k) => <option key={x.id} value={x.id}>{idx + k + 2}. {x.title.slice(0, 40)}</option>)}
              </Select>
            </div>
            <button type="button" aria-label="Remover regra" onClick={() => updateQuestion(q.id, { logic: q.logic.filter((_, k) => k !== i) })} style={iconBtn}><X size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => updateQuestion(q.id, { logic: [...q.logic, { op: 'is', goto: later[0]?.id || 'end' }] })} style={{ ...ghostBtn, alignSelf: 'flex-start' }}><Plus size={13} /> Adicionar regra</button>
        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>As regras valem em ordem. Se nenhuma bater, a pesquisa segue para a próxima pergunta. Só é possível pular para perguntas mais adiante.</div>
      </div>
    );
  };

  const renderEditor = (q: SurveyQuestion, idx: number) => {
    const opts = q.options;
    const setOpts = (p: Partial<typeof opts>) => updateQuestion(q.id, { options: { ...opts, ...p } });
    const hasChoices = q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'dropdown';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={label}>Tipo da pergunta</label>
          <div style={{ maxWidth: 260 }}>
            <Select value={q.type} onChange={e => {
              const type = e.target.value as SurveyQuestionType; const fresh = blankQuestion(surveyId, type, q.position);
              updateQuestion(q.id, { type, options: fresh.options, logic: LOGIC_TYPES.includes(type) ? q.logic.filter(() => false) : [] });
            }} style={input}>
              {TYPE_ORDER.map(t => <option key={t} value={t}>{SURVEY_TYPE_LABELS[t]}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <label style={label}>{q.type === 'statement' ? 'Texto' : 'Pergunta'}</label>
          <input value={q.title} onChange={e => updateQuestion(q.id, { title: e.target.value })} style={{ ...input, fontSize: '1rem', fontWeight: 700 }} />
        </div>
        <div>
          <label style={label}>Descrição (opcional)</label>
          <textarea value={q.description || ''} onChange={e => updateQuestion(q.id, { description: e.target.value })} rows={2} style={{ ...input, resize: 'vertical' }} />
        </div>
        <SurveyMediaUpload
          label="Imagem ou vídeo da pergunta (opcional)"
          value={opts.mediaUrl || ''}
          kind="any"
          folder="surveys/questions"
          onChange={url => {
            const isVid = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url) || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
            setOpts({ mediaUrl: url || undefined, mediaType: url ? (isVid ? 'video' : 'image') : undefined });
          }}
        />
        {q.type !== 'statement' && <Switch checked={q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} label="Resposta obrigatória" />}

        {hasChoices && (
          <div>
            <label style={label}>Opções</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(opts.choices || []).map((c, i) => (
                <div key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ width: 22, fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>{String.fromCharCode(65 + i)}</span>
                  <input value={c.label} onChange={e => setOpts({ choices: (opts.choices || []).map(x => (x.id === c.id ? { ...x, label: e.target.value } : x)) })} style={input} />
                  <button type="button" aria-label="Remover opção" onClick={() => setOpts({ choices: (opts.choices || []).filter(x => x.id !== c.id) })} style={iconBtn}><Trash2 size={13} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setOpts({ choices: [...(opts.choices || []), { id: generateUuid(), label: `Opção ${(opts.choices || []).length + 1}` }] })} style={{ ...ghostBtn, alignSelf: 'flex-start' }}><Plus size={13} /> Adicionar opção</button>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Switch checked={Boolean(opts.allowOther)} onChange={e => setOpts({ allowOther: e.target.checked })} label='Permitir "Outro"' />
              {q.type === 'multi_choice' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--adm-text-title)' }}>Máximo de escolhas
                  <input type="number" min={1} value={opts.maxSelections ?? ''} placeholder="sem limite" onChange={e => setOpts({ maxSelections: e.target.value === '' ? undefined : Math.max(1, Number(e.target.value)) })} style={{ ...input, width: 90 }} />
                </label>
              )}
            </div>
          </div>
        )}
        {(q.type === 'scale' || q.type === 'rating') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={label}>Rótulo do menor valor</label><input value={opts.minLabel || ''} onChange={e => setOpts({ minLabel: e.target.value })} style={input} /></div>
            <div><label style={label}>Rótulo do maior valor</label><input value={opts.maxLabel || ''} onChange={e => setOpts({ maxLabel: e.target.value })} style={input} /></div>
            <div style={{ gridColumn: '1 / -1', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{q.type === 'scale' ? 'A escala vai de 0 a 10 e o resultado calcula o NPS.' : 'A avaliação vai de 1 a 5 estrelas.'}</div>
          </div>
        )}
        {(q.type === 'short_text' || q.type === 'long_text' || q.type === 'number') && (
          <div style={{ maxWidth: 360 }}><label style={label}>Texto de exemplo no campo</label><input value={opts.placeholder || ''} onChange={e => setOpts({ placeholder: e.target.value })} style={input} /></div>
        )}
        {LOGIC_TYPES.includes(q.type) && (
          <div>
            <label style={label}>Lógica condicional</label>
            {idx === questions.length - 1 ? <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Esta é a última pergunta: a pesquisa termina depois dela.</div> : renderLogic(q, idx)}
          </div>
        )}
      </div>
    );
  };

  const setWelcome = (p: Partial<Survey['welcome']>) => patchSurvey({ welcome: { ...survey.welcome, ...p } });
  const setThanks = (p: Partial<Survey['thanks']>) => patchSurvey({ thanks: { ...survey.thanks, ...p } });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--adm-bg-app)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--adm-border)', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { if (!dirty || window.confirm('Há alterações não salvas. Sair mesmo assim?')) onBack(); }} style={ghostBtn}><ArrowLeft size={14} /> Pesquisas</button>
        <input value={survey.title} onChange={e => patchSurvey({ title: e.target.value })} style={{ ...input, flex: 1, minWidth: 200, maxWidth: 420, fontWeight: 800, fontSize: '0.95rem' }} aria-label="Nome da pesquisa" />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: '#fff', background: published ? '#059669' : survey.status === 'closed' ? '#64748B' : '#D97706' }}>{published ? 'Publicada' : survey.status === 'closed' ? 'Encerrada' : 'Rascunho'}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setPreview(true)} style={ghostBtn}><Eye size={14} /> Pré-visualizar</button>
          <button type="button" onClick={() => onOpenResults(survey.id)} style={ghostBtn}><BarChart3 size={14} /> Resultados</button>
          <button type="button" onClick={() => void save()} disabled={saving || !dirty} style={{ ...ghostBtn, opacity: dirty ? 1 : 0.55 }}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {dirty ? 'Salvar' : 'Salvo'}</button>
          <button type="button" onClick={() => void toggleStatus()} style={{ ...ghostBtn, background: published ? 'transparent' : '#0284C7', color: published ? 'var(--adm-text-title)' : '#fff', border: published ? '1px solid var(--adm-border)' : 'none' }}>{published ? 'Encerrar' : survey.status === 'closed' ? 'Publicar de novo' : 'Publicar'}</button>
        </div>
      </div>
      {published && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', fontSize: '0.78rem', background: 'rgba(5,150,105,0.08)', borderBottom: '1px solid var(--adm-border)', flexWrap: 'wrap' }}>
          <Link2 size={14} color="#059669" /> <span style={{ color: 'var(--adm-text-muted)' }}>Link público direto:</span> <strong style={{ color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</strong>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(link); toast.success('Link copiado.'); }} style={{ ...ghostBtn, padding: '3px 9px' }}><Copy size={12} /> Copiar</button>
          <a href={link} target="_blank" rel="noreferrer" style={{ ...ghostBtn, padding: '3px 9px', textDecoration: 'none' }}><ExternalLink size={12} /> Abrir</a>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '310px 1fr' }}>
        <aside style={{ borderRight: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--adm-border)' }}>
            {([['capa', 'Capa', Layout], ['perguntas', 'Perguntas', FileText], ['ajustes', 'Visual & Fim', Palette]] as const).map(([k, l, Icon]) => (
              <button key={k} type="button" onClick={() => setTab(k)} style={{ flex: 1, padding: '10px 4px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 800, color: tab === k ? '#0284C7' : 'var(--adm-text-muted)', borderBottom: tab === k ? '2px solid #0284C7' : '2px solid transparent', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}><Icon size={13} />{l}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tab === 'perguntas' && questions.map((q, i) => (
              <div key={q.id} onClick={() => setSelectedId(q.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${q.id === selectedId ? '#0284C7' : 'var(--adm-border)'}`, background: q.id === selectedId ? 'rgba(2,132,199,0.08)' : 'transparent' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', width: 18 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title || '(sem título)'}</div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{SURVEY_TYPE_LABELS[q.type]}{q.logic.length ? ` · ${q.logic.length} regra(s)` : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                  <button type="button" aria-label="Subir" onClick={() => move(q.id, -1)} disabled={i === 0} style={{ ...iconBtn, width: 20, height: 16, border: 'none', opacity: i === 0 ? 0.3 : 1 }}><ChevronUp size={13} /></button>
                  <button type="button" aria-label="Descer" onClick={() => move(q.id, 1)} disabled={i === questions.length - 1} style={{ ...iconBtn, width: 20, height: 16, border: 'none', opacity: i === questions.length - 1 ? 0.3 : 1 }}><ChevronDown size={13} /></button>
                </div>
              </div>
            ))}
            {tab === 'perguntas' && questions.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', padding: 8 }}>Nenhuma pergunta ainda. Adicione a primeira abaixo.</div>}
            {tab === 'capa' && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', padding: 6, lineHeight: 1.5 }}>Personalize a capa principal no painel ao lado: título, descrição, imagem, vídeo (armazenados no R2) e o layout de abertura.</div>}
            {tab === 'ajustes' && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', padding: 6, lineHeight: 1.5 }}>Configure a identidade visual (logo no R2, cores, fundo, fonte), a unidade e a tela final de agradecimento.</div>}
          </div>
          {tab === 'perguntas' && (
            <div style={{ padding: 10, borderTop: '1px solid var(--adm-border)', position: 'relative' }}>
              <button type="button" onClick={() => setAddMenu(v => !v)} style={{ ...ghostBtn, width: '100%', justifyContent: 'center', background: '#0284C7', color: '#fff', border: 'none' }}><Plus size={14} /> Adicionar pergunta</button>
              {addMenu && (
                <div style={{ position: 'absolute', left: 10, right: 10, bottom: 54, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 10, boxShadow: '0 12px 30px rgba(0,0,0,0.2)', padding: 6, maxHeight: 340, overflowY: 'auto', zIndex: 5 }}>
                  {TYPE_ORDER.map(t => <button key={t} type="button" onClick={() => addQuestion(t)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', color: 'var(--adm-text-title)', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 6 }}>{SURVEY_TYPE_LABELS[t]}</button>)}
                </div>
              )}
            </div>
          )}
        </aside>

        <main style={{ overflowY: 'auto', padding: 24 }}>
          {tab === 'capa' ? (
            <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--adm-text-title)' }}>Capa Principal (Boas-vindas)</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Primeira tela exibida quando a pessoa abre o link público da pesquisa.</p>
              </div>
              <div>
                <label style={label}>Layout da Capa</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
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
                          padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                          border: `1.5px solid ${active ? '#0284C7' : 'var(--adm-border)'}`,
                          background: active ? 'rgba(2,132,199,0.10)' : 'transparent',
                          color: active ? '#0284C7' : 'var(--adm-text-title)',
                        }}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div><label style={label}>Título da Capa</label><input value={survey.welcome.title || ''} onChange={e => setWelcome({ title: e.target.value })} placeholder={survey.title} style={{ ...input, fontSize: '1rem', fontWeight: 700 }} /></div>
              <div><label style={label}>Descrição / Chamada</label><textarea rows={3} value={survey.welcome.text || ''} onChange={e => setWelcome({ text: e.target.value })} placeholder="Conte rapidamente sobre a pesquisa e quanto tempo leva..." style={{ ...input, resize: 'vertical' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <SurveyMediaUpload
                  label="Imagem de Capa (R2)"
                  value={survey.welcome.coverImageUrl || ''}
                  kind="image"
                  folder="surveys/covers"
                  onChange={url => setWelcome({ coverImageUrl: url || undefined })}
                />
                <SurveyMediaUpload
                  label="Vídeo de Capa (R2 ou YouTube/Vimeo)"
                  value={survey.welcome.coverVideoUrl || ''}
                  kind="video"
                  folder="surveys/videos"
                  hint="Se preencher vídeo e imagem, o vídeo será exibido como destaque na capa."
                  onChange={url => setWelcome({ coverVideoUrl: url || undefined })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14 }}>
                <div><label style={label}>Texto do botão</label><input value={survey.welcome.buttonLabel || ''} onChange={e => setWelcome({ buttonLabel: e.target.value })} placeholder="Começar" style={input} /></div>
                <div><label style={label}>Aviso de privacidade (opcional)</label><input value={survey.welcome.privacyNote || ''} onChange={e => setWelcome({ privacyNote: e.target.value })} placeholder="Ex.: Suas respostas são confidenciais." style={input} /></div>
              </div>
            </div>
          ) : tab === 'perguntas' ? (sel ? (
            <div style={{ maxWidth: 720 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>PERGUNTA {selectedIndex + 1} DE {questions.length}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => duplicate(sel)} style={ghostBtn}><Copy size={13} /> Duplicar</button>
                  <button type="button" onClick={() => remove(sel.id)} style={{ ...ghostBtn, color: '#DC2626' }}><Trash2 size={13} /> Excluir</button>
                </div>
              </div>
              {renderEditor(sel, selectedIndex)}
            </div>
          ) : <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.88rem' }}>Escolha uma pergunta na lista ou adicione uma nova.</div>) : (
            <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--adm-text-title)' }}>Identidade Visual & Fundo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <SurveyMediaUpload
                  label="Logo da Marca (R2)"
                  value={survey.theme.logoUrl || ''}
                  kind="image"
                  folder="surveys/logos"
                  onChange={url => patchSurvey({ theme: { ...survey.theme, logoUrl: url || undefined } })}
                />
                <SurveyMediaUpload
                  label="Imagem de Fundo (R2)"
                  value={survey.theme.backgroundImageUrl || ''}
                  kind="image"
                  folder="surveys/backgrounds"
                  onChange={url => patchSurvey({ theme: { ...survey.theme, backgroundImageUrl: url || undefined } })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                <div><label style={label}>Cor de Destaque</label><input type="color" value={survey.theme.color || '#0284C7'} onChange={e => patchSurvey({ theme: { ...survey.theme, color: e.target.value } })} style={{ width: '100%', height: 36, border: '1px solid var(--adm-border)', borderRadius: 8, background: 'transparent', padding: 2, cursor: 'pointer' }} /></div>
                <div><label style={label}>Cor de Fundo</label><input type="color" value={survey.theme.backgroundColor || '#F8FAFC'} onChange={e => patchSurvey({ theme: { ...survey.theme, backgroundColor: e.target.value } })} style={{ width: '100%', height: 36, border: '1px solid var(--adm-border)', borderRadius: 8, background: 'transparent', padding: 2, cursor: 'pointer' }} /></div>
                <div><label style={label}>Cor do Texto</label><input type="color" value={survey.theme.textColor || '#0F172A'} onChange={e => patchSurvey({ theme: { ...survey.theme, textColor: e.target.value } })} style={{ width: '100%', height: 36, border: '1px solid var(--adm-border)', borderRadius: 8, background: 'transparent', padding: 2, cursor: 'pointer' }} /></div>
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
                  <label style={label}>Botões</label>
                  <Select value={survey.theme.buttonRadius || 'rounded'} onChange={e => patchSurvey({ theme: { ...survey.theme, buttonRadius: e.target.value as SurveyButtonRadius } })} style={input}>
                    <option value="rounded">Arredondados</option>
                    <option value="pill">Pílula</option>
                    <option value="square">Retos</option>
                  </Select>
                </div>
              </div>
              {survey.theme.backgroundImageUrl && (
                <div style={{ maxWidth: 320 }}>
                  <label style={label}>Escurecimento / Contraste do Fundo ({Math.round((survey.theme.backgroundOverlay ?? 0.55) * 100)}%)</label>
                  <input type="range" min={0} max={0.85} step={0.05} value={survey.theme.backgroundOverlay ?? 0.55} onChange={e => patchSurvey({ theme: { ...survey.theme, backgroundOverlay: Number(e.target.value) } })} style={{ width: '100%' }} />
                </div>
              )}
              <div style={{ maxWidth: 280 }}>
                <label style={label}>Unidade vinculada (opcional)</label>
                <Select value={survey.venueId || ''} onChange={e => patchSurvey({ venueId: e.target.value || null })} style={input}>
                  <option value="">Todas as unidades</option>
                  {venues.filter(v => v.id && v.id !== 'all').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--adm-border)', margin: '4px 0' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--adm-text-title)' }}>Tela de Agradecimento</h3>
              <div><label style={label}>Título</label><input value={survey.thanks.title || ''} onChange={e => setThanks({ title: e.target.value })} style={input} /></div>
              <div><label style={label}>Texto</label><textarea rows={3} value={survey.thanks.text || ''} onChange={e => setThanks({ text: e.target.value })} style={{ ...input, resize: 'vertical' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <SurveyMediaUpload
                  label="Imagem de Agradecimento (R2)"
                  value={survey.thanks.imageUrl || ''}
                  kind="image"
                  folder="surveys/thanks"
                  onChange={url => setThanks({ imageUrl: url || undefined })}
                />
                <SurveyMediaUpload
                  label="Vídeo de Agradecimento (R2)"
                  value={survey.thanks.videoUrl || ''}
                  kind="video"
                  folder="surveys/videos"
                  onChange={url => setThanks({ videoUrl: url || undefined })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={label}>Botão com link (opcional)</label><input value={survey.thanks.linkLabel || ''} onChange={e => setThanks({ linkLabel: e.target.value })} placeholder="Ex.: Ver nosso Instagram" style={input} /></div>
                <div><label style={label}>Endereço do link</label><input value={survey.thanks.linkUrl || ''} onChange={e => setThanks({ linkUrl: e.target.value })} placeholder="https://..." style={input} /></div>
              </div>
            </div>
          )}
        </main>
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
