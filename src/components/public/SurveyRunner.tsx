import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Star } from 'lucide-react';
import type { SurveyAnswerValue, SurveyQuestion, SurveyThanks, SurveyTheme, SurveyWelcome } from '../../types/survey';
import { OTHER_PREFIX, buildPath, isAnswered, nextQuestionId, validateAnswer } from '../../utils/surveyLogic';

export interface RunnerSurvey {
  title: string;
  description?: string | null;
  welcome: SurveyWelcome;
  thanks: SurveyThanks;
  theme: SurveyTheme;
  questions: SurveyQuestion[];
}

interface Props {
  survey: RunnerSurvey;
  initialAnswers?: Record<string, SurveyAnswerValue>;
  /** Preview do editor: nao grava nada e mostra a tela "fim" no lugar do envio */
  preview?: boolean;
  /** Grava o progresso a cada passo (link pessoal retoma de onde parou) */
  onSave?: (answers: Record<string, SurveyAnswerValue>) => Promise<void> | void;
  onSubmit: (answers: Record<string, SurveyAnswerValue>) => Promise<void>;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYFRAMES = `@keyframes f5SurveyIn{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes f5SurveyBack{from{opacity:0;transform:translateY(-28px)}to{opacity:1;transform:translateY(0)}}`;

type Screen = { kind: 'welcome' } | { kind: 'question'; id: string } | { kind: 'thanks' };

/** Pesquisa uma pergunta por vez, no estilo Typeform: tela de boas-vindas, perguntas animadas, atalhos de teclado e agradecimento. */
export const SurveyRunner: React.FC<Props> = ({ survey, initialAnswers, preview, onSave, onSubmit }) => {
  const color = survey.theme?.color || '#0284C7';
  const questions = survey.questions;
  const [screen, setScreen] = useState<Screen>({ kind: 'welcome' });
  const [answers, setAnswers] = useState<Record<string, SurveyAnswerValue>>(initialAnswers || {});
  const [history, setHistory] = useState<string[]>([]);
  const [dir, setDir] = useState<'in' | 'back'>('in');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const advanceTimer = useRef<number | null>(null);

  const current = screen.kind === 'question' ? questions.find(q => q.id === screen.id) || null : null;
  const value = current ? answers[current.id] : undefined;

  const estimated = useMemo(() => buildPath(questions, answers).length || 1, [questions, answers]);
  const done = screen.kind === 'thanks' ? estimated : history.length;
  const progress = screen.kind === 'welcome' ? 0 : Math.min(100, Math.round((done / estimated) * 100));

  useEffect(() => () => { if (advanceTimer.current) window.clearTimeout(advanceTimer.current); }, []);

  const setAnswer = useCallback((q: SurveyQuestion, v: SurveyAnswerValue | undefined) => {
    setError('');
    setAnswers(prev => {
      const next = { ...prev };
      if (v === undefined || (typeof v === 'string' && v === '') || (Array.isArray(v) && v.length === 0)) delete next[q.id]; else next[q.id] = v;
      return next;
    });
  }, []);

  const goNext = useCallback(async (override?: SurveyAnswerValue) => {
    if (!current || busy) return;
    const v = override !== undefined ? override : answers[current.id];
    const err = validateAnswer(current, v);
    if (err) { setError(err); return; }
    const merged = override !== undefined ? { ...answers, [current.id]: override } : answers;
    const next = nextQuestionId(current, merged[current.id], questions);
    setDir('in'); setError('');
    if (next) {
      setHistory(h => [...h, current.id]);
      setScreen({ kind: 'question', id: next });
      if (!preview && onSave) void Promise.resolve(onSave(merged)).catch(() => undefined);
      return;
    }
    setBusy(true);
    try {
      if (!preview) await onSubmit(merged);
      setHistory(h => [...h, current.id]);
      setScreen({ kind: 'thanks' });
    } catch (e: any) {
      setError(e?.message || 'Não foi possível enviar. Tente de novo.');
    } finally { setBusy(false); }
  }, [current, busy, answers, questions, preview, onSave, onSubmit]);

  const goBack = () => {
    if (!history.length) { setScreen({ kind: 'welcome' }); return; }
    const prev = history[history.length - 1];
    setDir('back'); setError('');
    setHistory(h => h.slice(0, -1));
    setScreen({ kind: 'question', id: prev });
  };

  const start = () => {
    if (!questions.length) { setScreen({ kind: 'thanks' }); return; }
    setDir('in'); setHistory([]); setScreen({ kind: 'question', id: questions[0].id });
  };

  /** Escolha com avanço automatico (como no Typeform) */
  const pickAndAdvance = (q: SurveyQuestion, v: SurveyAnswerValue) => {
    setAnswer(q, v);
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => { void goNext(v); }, 280);
  };

  // Atalhos de teclado: Enter avanca, letras escolhem, y/n no sim/nao
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (screen.kind === 'welcome' && e.key === 'Enter') { e.preventDefault(); start(); return; }
      if (!current) return;
      if (e.key === 'Enter') {
        if (target?.tagName === 'TEXTAREA' && e.shiftKey) return;
        if (e.target instanceof HTMLButtonElement && e.target.dataset.nav !== 'next') return;
        e.preventDefault(); void goNext(); return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (current.type === 'yes_no') { if (k === 'y' || k === 's') pickAndAdvance(current, 'yes'); else if (k === 'n') pickAndAdvance(current, 'no'); return; }
      if (current.type === 'single_choice') {
        const idx = LETTERS.toLowerCase().indexOf(k); const c = (current.options.choices || [])[idx];
        if (idx >= 0 && c) pickAndAdvance(current, c.id);
      }
      if (current.type === 'multi_choice') {
        const idx = LETTERS.toLowerCase().indexOf(k); const c = (current.options.choices || [])[idx];
        if (idx >= 0 && c) toggleMulti(current, c.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleMulti = (q: SurveyQuestion, id: string) => {
    const list = Array.isArray(answers[q.id]) ? [...(answers[q.id] as string[])] : [];
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else { if (q.options.maxSelections && list.length >= q.options.maxSelections) { setError(`Escolha no máximo ${q.options.maxSelections}.`); return; } list.push(id); }
    setAnswer(q, list);
  };

  const anim = `${dir === 'back' ? 'f5SurveyBack' : 'f5SurveyIn'} .38s ease-out`;
  const box: React.CSSProperties = { width: '100%', maxWidth: 640, padding: '0 24px', boxSizing: 'border-box', animation: anim };
  const inputBase: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: `2px solid ${color}55`, background: 'transparent', outline: 'none', fontSize: '1.4rem', padding: '8px 0', color: '#0F172A', fontFamily: 'inherit' };
  const okBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 8, border: 'none', background: color, color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' };

  const renderInput = (q: SurveyQuestion) => {
    const opts = q.options || {};
    const v = answers[q.id];
    switch (q.type) {
      case 'short_text': case 'email': case 'phone': case 'number':
        return <input autoFocus key={q.id} type={q.type === 'email' ? 'email' : q.type === 'number' ? 'number' : q.type === 'phone' ? 'tel' : 'text'} inputMode={q.type === 'number' ? 'decimal' : q.type === 'phone' ? 'tel' : undefined}
          value={v === undefined ? '' : String(v)} placeholder={opts.placeholder || 'Digite sua resposta aqui...'}
          onChange={e => setAnswer(q, q.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} style={inputBase} />;
      case 'long_text':
        return <textarea autoFocus key={q.id} rows={3} value={v === undefined ? '' : String(v)} placeholder={opts.placeholder || 'Digite sua resposta aqui...'}
          onChange={e => setAnswer(q, e.target.value)} style={{ ...inputBase, resize: 'none', borderBottom: `2px solid ${color}55` }} />;
      case 'date':
        return <input autoFocus key={q.id} type="date" value={v === undefined ? '' : String(v)} onChange={e => setAnswer(q, e.target.value)} style={{ ...inputBase, colorScheme: 'light' }} />;
      case 'yes_no':
        return (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {([['yes', 'Sim', 'Y'], ['no', 'Não', 'N']] as const).map(([id, label, key]) => (
              <button key={id} type="button" onClick={() => pickAndAdvance(q, id)} style={choiceStyle(v === id)}>
                <span style={keyBadge(v === id)}>{key}</span>{label}{v === id && <Check size={16} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        );
      case 'single_choice': case 'multi_choice': {
        const multi = q.type === 'multi_choice';
        const selected = multi ? (Array.isArray(v) ? v : []) : (v !== undefined ? [String(v)] : []);
        const otherSel = selected.find(s => s.startsWith(OTHER_PREFIX));
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {multi && <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{opts.maxSelections ? `Escolha até ${opts.maxSelections}` : 'Escolha quantas quiser'}</div>}
            {(opts.choices || []).map((c, i) => {
              const on = selected.includes(c.id);
              return (
                <button key={c.id} type="button" onClick={() => (multi ? toggleMulti(q, c.id) : pickAndAdvance(q, c.id))} style={choiceStyle(on)}>
                  <span style={keyBadge(on)}>{LETTERS[i]}</span>{c.label}{on && <Check size={16} style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
            {opts.allowOther && (
              <div style={{ ...choiceStyle(Boolean(otherSel)), cursor: 'text' }}>
                <span style={keyBadge(Boolean(otherSel))}>+</span>
                <input value={otherSel ? otherSel.slice(OTHER_PREFIX.length) : ''} placeholder="Outro..."
                  onFocus={() => { if (!otherSel && !multi) setAnswer(q, `${OTHER_PREFIX} `); }}
                  onChange={e => {
                    const t = e.target.value; const tagged = `${OTHER_PREFIX}${t}`;
                    if (multi) { const rest = selected.filter(s => !s.startsWith(OTHER_PREFIX)); setAnswer(q, t ? [...rest, tagged] : rest); } else setAnswer(q, t ? tagged : undefined);
                  }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '1rem', fontFamily: 'inherit', color: '#0F172A' }} />
              </div>
            )}
          </div>
        );
      }
      case 'dropdown':
        return (
          <select key={q.id} autoFocus value={v === undefined ? '' : String(v)} onChange={e => setAnswer(q, e.target.value || undefined)} style={{ ...inputBase, fontSize: '1.2rem' }}>
            <option value="">Escolha uma opção</option>
            {(opts.choices || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        );
      case 'scale': case 'rating': {
        const min = opts.scaleMin ?? (q.type === 'scale' ? 0 : 1); const max = opts.scaleMax ?? (q.type === 'scale' ? 10 : 5);
        const list = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {list.map(n => q.type === 'rating'
                ? <button key={n} type="button" aria-label={`${n} estrelas`} onClick={() => pickAndAdvance(q, n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Star size={42} color={color} fill={typeof v === 'number' && n <= v ? color : 'none'} />
                </button>
                : <button key={n} type="button" onClick={() => pickAndAdvance(q, n)} style={{ width: 52, height: 52, borderRadius: 10, border: `1.5px solid ${color}`, background: v === n ? color : `${color}12`, color: v === n ? '#fff' : color, fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer' }}>{n}</button>)}
            </div>
            {(opts.minLabel || opts.maxLabel) && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.8rem', color: '#64748B' }}><span>{opts.minLabel}</span><span>{opts.maxLabel}</span></div>}
          </div>
        );
      }
      default: return null;
    }
  };

  const choiceStyle = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 520, boxSizing: 'border-box', textAlign: 'left', padding: '11px 14px', borderRadius: 8,
    border: `1.5px solid ${on ? color : `${color}66`}`, background: on ? `${color}1f` : `${color}0d`, color: '#0F172A', fontSize: '1.05rem', fontFamily: 'inherit', cursor: 'pointer',
  });
  const keyBadge = (on: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 5, border: `1px solid ${color}`, background: on ? color : '#fff', color: on ? '#fff' : color, fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 });

  const qIndex = current ? questions.findIndex(q => q.id === current.id) : -1;

  return (
    <div style={{ position: 'relative', minHeight: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', color: '#0F172A', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>
      <style>{KEYFRAMES}</style>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `${color}22` }}>
        <div style={{ height: '100%', width: `${progress}%`, background: color, transition: 'width .35s ease' }} />
      </div>
      {survey.theme?.logoUrl && <img src={survey.theme.logoUrl} alt="" style={{ position: 'absolute', top: 18, left: 22, height: 34, maxWidth: 160, objectFit: 'contain' }} />}

      {screen.kind === 'welcome' && (
        <div key="welcome" style={box}>
          <h1 style={{ fontSize: '2.1rem', margin: '0 0 12px', lineHeight: 1.2, color: '#0F172A' }}>{survey.welcome.title || survey.title}</h1>
          {(survey.welcome.text || survey.description) && <p style={{ fontSize: '1.15rem', color: '#475569', margin: '0 0 24px', whiteSpace: 'pre-line' }}>{survey.welcome.text || survey.description}</p>}
          <button type="button" data-nav="next" onClick={start} style={okBtn}>{survey.welcome.buttonLabel || 'Começar'}</button>
          <span style={{ marginLeft: 12, fontSize: '0.78rem', color: '#64748B' }}>ou aperte Enter</span>
          {survey.welcome.privacyNote && <p style={{ marginTop: 28, fontSize: '0.75rem', color: '#64748B', maxWidth: 480 }}>{survey.welcome.privacyNote}</p>}
        </div>
      )}

      {current && (
        <div key={current.id} style={box}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
            {current.type !== 'statement' && <span style={{ color, fontWeight: 800, fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{qIndex + 1}<ArrowRight size={14} /></span>}
            <h2 style={{ fontSize: '1.55rem', margin: 0, lineHeight: 1.25, fontWeight: 600, color: '#0F172A' }}>{current.title}{current.required && <span style={{ color: '#DC2626' }}> *</span>}</h2>
          </div>
          {current.description && <p style={{ margin: '0 0 18px 0', color: '#64748B', fontSize: '1rem', whiteSpace: 'pre-line' }}>{current.description}</p>}
          <div style={{ marginTop: 22 }}>{renderInput(current)}</div>
          {error && <div style={{ marginTop: 14, color: '#DC2626', fontSize: '0.9rem', fontWeight: 600 }}>{error}</div>}
          <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" data-nav="next" disabled={busy} onClick={() => void goNext()} style={okBtn}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}{current.type === 'statement' ? 'Continuar' : 'OK'}{!busy && <Check size={16} />}
            </button>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>aperte Enter</span>
            {!current.required && current.type !== 'statement' && !isAnswered(current, value) && <button type="button" onClick={() => void goNext()} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Pular</button>}
          </div>
        </div>
      )}

      {screen.kind === 'thanks' && (
        <div key="thanks" style={box}>
          <h1 style={{ fontSize: '2.1rem', margin: '0 0 12px', color: '#0F172A' }}>{survey.thanks.title || 'Obrigado!'}</h1>
          <p style={{ fontSize: '1.15rem', color: '#475569', whiteSpace: 'pre-line' }}>{survey.thanks.text || 'Sua resposta foi enviada.'}</p>
          {survey.thanks.linkUrl && <a href={survey.thanks.linkUrl} target="_blank" rel="noreferrer" style={{ ...okBtn, textDecoration: 'none', marginTop: 12 }}>{survey.thanks.linkLabel || 'Saiba mais'}</a>}
          {preview && <p style={{ marginTop: 20, fontSize: '0.78rem', color: '#64748B' }}>Preview: nada foi salvo.</p>}
        </div>
      )}

      {screen.kind !== 'thanks' && (
        <div style={{ position: 'absolute', bottom: 18, right: 22, display: 'flex', gap: 8 }}>
          <button type="button" aria-label="Voltar" title="Voltar" onClick={goBack} disabled={screen.kind === 'welcome' || busy} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: color, color: '#fff', cursor: 'pointer', opacity: screen.kind === 'welcome' ? 0.35 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={17} /></button>
        </div>
      )}
    </div>
  );
};
