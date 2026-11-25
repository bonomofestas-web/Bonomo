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
  venueName?: string | null;
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

const toEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
};

const renderMediaBlock = (imageUrl?: string, videoUrl?: string, radius = 14, maxHeight = 320): React.ReactNode => {
  if (videoUrl) {
    const embed = toEmbedUrl(videoUrl);
    if (embed) {
      return (
        <div style={{ width: '100%', aspectRatio: '16 / 9', maxHeight, borderRadius: radius, overflow: 'hidden', background: '#000', boxShadow: '0 12px 30px rgba(0,0,0,0.16)' }}>
          <iframe src={embed} title="Vídeo" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      );
    }
    return (
      <video src={videoUrl} controls playsInline style={{ width: '100%', maxHeight, borderRadius: radius, objectFit: 'cover', background: '#000', boxShadow: '0 12px 30px rgba(0,0,0,0.16)', display: 'block' }} />
    );
  }
  if (imageUrl) {
    return (
      <img src={imageUrl} alt="" style={{ width: '100%', maxHeight, borderRadius: radius, objectFit: 'cover', boxShadow: '0 12px 30px rgba(0,0,0,0.14)', display: 'block' }} />
    );
  }
  return null;
};

type Screen = { kind: 'welcome' } | { kind: 'question'; id: string } | { kind: 'thanks' };

/** Pesquisa uma pergunta por vez, no estilo Typeform: capa personalizada, mídia R2, perguntas animadas e atalhos. */
export const SurveyRunner: React.FC<Props> = ({ survey, initialAnswers, preview, onSave, onSubmit }) => {
  const color = survey.theme?.color || '#0284C7';
  const bgColor = survey.theme?.backgroundColor || '#F8FAFC';
  const textColor = survey.theme?.textColor || '#0F172A';
  const mutedColor = `${textColor}99`;
  const fontFam = survey.theme?.fontFamily ? `'${survey.theme.fontFamily}', system-ui, sans-serif` : "'Inter', system-ui, sans-serif";
  const btnRadius = survey.theme?.buttonRadius === 'pill' ? 999 : survey.theme?.buttonRadius === 'square' ? 3 : 10;
  const bgImg = survey.theme?.backgroundImageUrl;
  const bgOverlay = survey.theme?.backgroundOverlay ?? 0.55;
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
  const box: React.CSSProperties = { position: 'relative', zIndex: 2, width: '100%', maxWidth: 680, padding: '0 24px', boxSizing: 'border-box', animation: anim };
  const inputBase: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: `2px solid ${color}55`, background: 'transparent', outline: 'none', fontSize: '1.4rem', padding: '8px 0', color: textColor, fontFamily: 'inherit' };
  const okBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: btnRadius, border: 'none', background: color, color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: `0 6px 18px ${color}33` };

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
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 520, boxSizing: 'border-box', textAlign: 'left', padding: '11px 14px', borderRadius: Math.min(btnRadius, 12),
    border: `1.5px solid ${on ? color : `${color}66`}`, background: on ? `${color}22` : `${color}0f`, color: textColor, fontSize: '1.05rem', fontFamily: 'inherit', cursor: 'pointer',
  });
  const keyBadge = (on: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 5, border: `1px solid ${color}`, background: on ? color : '#fff', color: on ? '#fff' : color, fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 });

  const qIndex = current ? questions.findIndex(q => q.id === current.id) : -1;
  const currentSection = useMemo(() => {
    if (qIndex < 0) return null;
    let title = '';
    let description = '';
    let stageNum = 0;
    for (let i = 0; i <= qIndex; i++) {
      const st = questions[i]?.options?.sectionTitle?.trim();
      if (st) {
        stageNum += 1;
        title = st;
        description = questions[i]?.options?.sectionDescription?.trim() || '';
      }
    }
    if (!title) return null;
    return { stageNum, title, description };
  }, [questions, qIndex]);

  const welcomeLayout = survey.welcome.layout || 'centered';
  const hasWelcomeMedia = Boolean(survey.welcome.coverVideoUrl || survey.welcome.coverImageUrl);
  const isSplitWelcome = screen.kind === 'welcome' && hasWelcomeMedia && (welcomeLayout === 'split_left' || welcomeLayout === 'split_right');
  const isHeroWelcome = screen.kind === 'welcome' && hasWelcomeMedia && welcomeLayout === 'hero_bg';
  const thanksLayout = survey.thanks.layout || 'centered';
  const hasThanksMedia = Boolean(survey.thanks.videoUrl || survey.thanks.imageUrl);
  const isSplitThanks = screen.kind === 'thanks' && hasThanksMedia && (thanksLayout === 'split_left' || thanksLayout === 'split_right');

  return (
    <div style={{ position: 'relative', minHeight: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bgColor, color: textColor, fontFamily: fontFam, overflow: 'auto', padding: '56px 0' }}>
      <style>{KEYFRAMES}</style>

      {/* Fundo global personalizado ou Hero de Capa */}
      {isHeroWelcome ? (
        <>
          {survey.welcome.coverVideoUrl && !toEmbedUrl(survey.welcome.coverVideoUrl) ? (
            <video src={survey.welcome.coverVideoUrl} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
          ) : survey.welcome.coverImageUrl ? (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${survey.welcome.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
          ) : null}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.58)', zIndex: 1 }} />
        </>
      ) : bgImg ? (
        <>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bgImg})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: bgColor, opacity: 1 - (1 - bgOverlay) * 0.6, zIndex: 1 }} />
        </>
      ) : null}

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 5, background: `${color}22`, zIndex: 10 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: color, transition: 'width .35s ease' }} />
      </div>
      {(survey.theme?.logoUrl || survey.venueName) && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: 22,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          borderRadius: 999,
          background: isHeroWelcome ? 'rgba(15,23,42,0.55)' : `${bgColor}dd`,
          backdropFilter: 'blur(8px)',
          border: `1px solid ${isHeroWelcome ? 'rgba(255,255,255,0.2)' : `${textColor}18`}`,
        }}>
          {survey.theme?.logoUrl && (
            <img src={survey.theme.logoUrl} alt="" style={{ height: 28, maxWidth: 120, objectFit: 'contain', borderRadius: 4 }} />
          )}
          {survey.venueName && (
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isHeroWelcome ? '#FFFFFF' : textColor }}>
              {survey.venueName}
            </span>
          )}
        </div>
      )}

      {screen.kind === 'welcome' && (
        <div key="welcome" style={{ ...box, maxWidth: isSplitWelcome ? 980 : 680, color: isHeroWelcome ? '#FFFFFF' : textColor }}>
          <div style={{
            display: isSplitWelcome ? 'grid' : 'flex',
            gridTemplateColumns: isSplitWelcome ? 'repeat(auto-fit, minmax(280px, 1fr))' : undefined,
            flexDirection: 'column',
            gap: isSplitWelcome ? 32 : 20,
            alignItems: isSplitWelcome ? 'center' : (welcomeLayout === 'centered' && !hasWelcomeMedia ? 'flex-start' : 'stretch'),
          }}>
            {hasWelcomeMedia && welcomeLayout === 'split_left' && (
              <div>{renderMediaBlock(survey.welcome.coverImageUrl, survey.welcome.coverVideoUrl, 16, 380)}</div>
            )}
            {hasWelcomeMedia && welcomeLayout === 'centered' && (
              <div>{renderMediaBlock(survey.welcome.coverImageUrl, survey.welcome.coverVideoUrl, 16, 300)}</div>
            )}
            {isHeroWelcome && survey.welcome.coverVideoUrl && toEmbedUrl(survey.welcome.coverVideoUrl) && (
              <div>{renderMediaBlock(undefined, survey.welcome.coverVideoUrl, 16, 300)}</div>
            )}
            <div>
              <h1 style={{ fontSize: '2.2rem', margin: '0 0 12px', lineHeight: 1.18, color: isHeroWelcome ? '#FFFFFF' : textColor }}>{survey.welcome.title || survey.title}</h1>
              {(survey.welcome.text || survey.description) && (
                <p style={{ fontSize: '1.12rem', color: isHeroWelcome ? 'rgba(255,255,255,0.88)' : mutedColor, margin: '0 0 24px', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                  {survey.welcome.text || survey.description}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" data-nav="next" onClick={start} style={okBtn}>{survey.welcome.buttonLabel || 'Começar'}</button>
                <span style={{ fontSize: '0.78rem', color: isHeroWelcome ? 'rgba(255,255,255,0.75)' : mutedColor }}>ou aperte Enter</span>
              </div>
              {survey.welcome.privacyNote && (
                <p style={{ marginTop: 24, fontSize: '0.75rem', color: isHeroWelcome ? 'rgba(255,255,255,0.72)' : mutedColor, maxWidth: 480 }}>
                  {survey.welcome.privacyNote}
                </p>
              )}
            </div>
            {hasWelcomeMedia && welcomeLayout === 'split_right' && (
              <div>{renderMediaBlock(survey.welcome.coverImageUrl, survey.welcome.coverVideoUrl, 16, 380)}</div>
            )}
          </div>
        </div>
      )}

      {current && (
        <div key={current.id} style={box}>
          {currentSection && (
            <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                padding: '4px 11px',
                borderRadius: 999,
                background: `${color}18`,
                border: `1px solid ${color}40`,
                color,
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}>
                <span>Etapa {currentSection.stageNum}</span>
                <span>•</span>
                <span>{currentSection.title}</span>
              </div>
              {currentSection.description && (
                <div style={{ fontSize: '0.8rem', color: mutedColor }}>{currentSection.description}</div>
              )}
            </div>
          )}
          {current.options?.mediaUrl && (
            <div style={{ marginBottom: 18 }}>
              {renderMediaBlock(
                current.options.mediaType === 'video' ? undefined : current.options.mediaUrl,
                current.options.mediaType === 'video' ? current.options.mediaUrl : undefined,
                14,
                260
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
            {current.type !== 'statement' && <span style={{ color, fontWeight: 800, fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{qIndex + 1}<ArrowRight size={14} /></span>}
            <h2 style={{ fontSize: '1.55rem', margin: 0, lineHeight: 1.25, fontWeight: 600, color: textColor }}>{current.title}{current.required && <span style={{ color: '#DC2626' }}> *</span>}</h2>
          </div>
          {current.description && <p style={{ margin: '0 0 18px 0', color: mutedColor, fontSize: '1rem', whiteSpace: 'pre-line' }}>{current.description}</p>}
          <div style={{ marginTop: 22 }}>{renderInput(current)}</div>
          {error && <div style={{ marginTop: 14, color: '#DC2626', fontSize: '0.9rem', fontWeight: 600 }}>{error}</div>}
          <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" data-nav="next" disabled={busy} onClick={() => void goNext()} style={okBtn}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}{current.type === 'statement' ? 'Continuar' : 'OK'}{!busy && <Check size={16} />}
            </button>
            <span style={{ fontSize: '0.78rem', color: mutedColor }}>aperte Enter</span>
            {!current.required && current.type !== 'statement' && !isAnswered(current, value) && <button type="button" onClick={() => void goNext()} style={{ background: 'none', border: 'none', color: mutedColor, cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Pular</button>}
          </div>
        </div>
      )}

      {screen.kind === 'thanks' && (
        <div key="thanks" style={{ ...box, maxWidth: isSplitThanks ? 920 : 680 }}>
          <div style={{
            display: isSplitThanks ? 'grid' : 'flex',
            gridTemplateColumns: isSplitThanks ? 'repeat(auto-fit, minmax(260px, 1fr))' : undefined,
            flexDirection: 'column',
            gap: isSplitThanks ? 32 : 16,
            alignItems: isSplitThanks ? 'center' : 'flex-start',
          }}>
            {hasThanksMedia && thanksLayout === 'split_left' && (
              <div>{renderMediaBlock(survey.thanks.imageUrl, survey.thanks.videoUrl, 16, 360)}</div>
            )}
            {hasThanksMedia && thanksLayout === 'centered' && (
              <div style={{ width: '100%' }}>{renderMediaBlock(survey.thanks.imageUrl, survey.thanks.videoUrl, 16, 280)}</div>
            )}
            <div>
              {survey.thanks.showBadge !== false && (
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: `${color}1c`,
                  border: `1.5px solid ${color}55`,
                  color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <Check size={24} />
                </div>
              )}
              <h1 style={{ fontSize: '2.1rem', margin: '0 0 12px', color: textColor }}>{survey.thanks.title || 'Obrigado!'}</h1>
              <p style={{ fontSize: '1.12rem', color: mutedColor, whiteSpace: 'pre-line', lineHeight: 1.5, margin: 0 }}>{survey.thanks.text || 'Sua resposta foi enviada.'}</p>
              {survey.thanks.linkUrl && (
                <a href={survey.thanks.linkUrl} target="_blank" rel="noreferrer" style={{ ...okBtn, textDecoration: 'none', marginTop: 22 }}>
                  {survey.thanks.linkLabel || 'Saiba mais'}
                </a>
              )}
              {preview && <p style={{ marginTop: 20, fontSize: '0.78rem', color: mutedColor }}>Preview: nada foi salvo.</p>}
            </div>
            {hasThanksMedia && thanksLayout === 'split_right' && (
              <div>{renderMediaBlock(survey.thanks.imageUrl, survey.thanks.videoUrl, 16, 360)}</div>
            )}
          </div>
        </div>
      )}

      {screen.kind !== 'thanks' && (
        <div style={{ position: 'absolute', bottom: 18, right: 22, display: 'flex', gap: 8, zIndex: 5 }}>
          <button type="button" aria-label="Voltar" title="Voltar" onClick={goBack} disabled={screen.kind === 'welcome' || busy} style={{ width: 36, height: 36, borderRadius: btnRadius, border: 'none', background: color, color: '#fff', cursor: 'pointer', opacity: screen.kind === 'welcome' ? 0.35 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={17} /></button>
        </div>
      )}
    </div>
  );
};
