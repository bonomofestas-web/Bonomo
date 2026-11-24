import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { SurveyAnswerValue, SurveyQuestion } from '../../types/survey';
import { SurveyRunner, type RunnerSurvey } from './SurveyRunner';

interface Props { slug: string }

interface PublicPayload {
  survey: { title: string; description?: string | null; welcome: any; thanks: any; theme: any; questions: Array<Omit<SurveyQuestion, 'surveyId' | 'position'>> };
  progress: { status: string; answers: Record<string, SurveyAnswerValue> } | null;
}

const centered: React.CSSProperties = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center', background: '#F8FAFC', color: '#0F172A', fontFamily: "'Inter', system-ui, sans-serif" };

/** Pagina publica da pesquisa (/p/:slug, com ?t=token quando e o link pessoal de um lead). Fala so com /api/survey. */
export const PublicSurveyView: React.FC<Props> = ({ slug }) => {
  const token = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('t') || '') : '';
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'closed' | 'answered' | 'error'>('loading');
  const [data, setData] = useState<PublicPayload | null>(null);
  const [closedTitle, setClosedTitle] = useState('');
  // Resposta anonima: o servidor devolve o id e um segredo para continuar a mesma resposta nos proximos passos
  const session = useRef<{ responseId?: string; resume?: string }>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/survey?slug=${encodeURIComponent(slug)}${token ? `&t=${encodeURIComponent(token)}` : ''}`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 404 || !json.ok) { setState('notfound'); return; }
        if (json.closed) { setClosedTitle(json.survey?.title || ''); setState('closed'); return; }
        if (json.progress?.status === 'completed') { setData(json); setState('answered'); return; }
        setData(json); setState('ready');
      } catch { if (!cancelled) setState('error'); }
    })();
    return () => { cancelled = true; };
  }, [slug, token]);

  const send = async (action: 'save' | 'submit', answers: Record<string, SurveyAnswerValue>) => {
    const res = await fetch('/api/survey', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, token: token || undefined, action, answers, responseId: session.current.responseId, resume: session.current.resume }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || 'Não foi possível salvar. Tente de novo.');
    if (json.responseId && json.resume) session.current = { responseId: json.responseId, resume: json.resume };
    return json;
  };

  if (state === 'loading') return <div style={centered}><Loader2 size={28} className="animate-spin" /></div>;
  if (state === 'notfound') return <div style={centered}><h2 style={{ margin: 0, color: '#0F172A' }}>Pesquisa não encontrada</h2><p style={{ color: '#64748B', margin: 0 }}>Confira o link que você recebeu.</p></div>;
  if (state === 'error') return <div style={centered}><h2 style={{ margin: 0, color: '#0F172A' }}>Não conseguimos abrir a pesquisa</h2><p style={{ color: '#64748B', margin: 0 }}>Verifique sua conexão e tente de novo.</p></div>;
  if (state === 'closed') return <div style={centered}><h2 style={{ margin: 0, color: '#0F172A' }}>{closedTitle || 'Pesquisa'}</h2><p style={{ color: '#64748B', margin: 0 }}>Esta pesquisa já foi encerrada. Obrigado pelo interesse!</p></div>;
  if (state === 'answered') return <div style={centered}><h2 style={{ margin: 0, color: '#0F172A' }}>Você já respondeu</h2><p style={{ color: '#64748B', margin: 0 }}>Obrigado pela sua participação!</p></div>;
  if (!data) return null;

  const survey: RunnerSurvey = {
    title: data.survey.title, description: data.survey.description, welcome: data.survey.welcome || {}, thanks: data.survey.thanks || {}, theme: data.survey.theme || {},
    questions: data.survey.questions.map((q, i) => ({ ...q, surveyId: '', position: i })),
  };
  return (
    <div style={{ height: '100vh' }}>
      <SurveyRunner survey={survey} initialAnswers={data.progress?.answers} onSave={a => send('save', a).then(() => undefined)} onSubmit={a => send('submit', a).then(() => undefined)} />
    </div>
  );
};
