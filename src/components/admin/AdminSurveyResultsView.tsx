import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, Pencil, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdminState } from '../../context/AdminStateContext';
import { surveyService } from '../../services/surveyService';
import { answerLabel, isAnswered } from '../../utils/surveyLogic';
import { summarizeSurvey, surveyToCsv, type QuestionSummary } from '../../utils/surveyStats';
import { Switch, DateRangeField } from '../ui';
import { SURVEY_TYPE_LABELS, type Survey, type SurveyQuestion, type SurveyResponse } from '../../types/survey';

interface Props {
  surveyId: string;
  masterId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}

const PALETTE = ['#0284C7', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#6366F1', '#F97316'];
const card: React.CSSProperties = { border: '1px solid var(--adm-border)', borderRadius: 12, background: 'var(--adm-bg-card, #fff)', padding: 16 };
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' };
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-');
const STATUS_LABEL: Record<SurveyResponse['status'], string> = { sent: 'Enviada', started: 'Em andamento', completed: 'Concluída' };

/** Resultados: resumo em graficos (pizza nas escolhas), ficha a ficha de cada pessoa e tabela de respostas com exportacao. */
export const AdminSurveyResultsView: React.FC<Props> = ({ surveyId, masterId, onBack, onEdit }) => {
  const { leads } = useAdminState();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'resumo' | 'ficha' | 'respostas'>('resumo');
  const [onlyCompleted, setOnlyCompleted] = useState(true);
  const [range, setRange] = useState({ start: '', end: '' });
  const [search, setSearch] = useState('');
  const [fichaId, setFichaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([surveyService.get(surveyId, masterId), surveyService.listResponses(surveyId, masterId)]).then(([s, r]) => {
      if (cancelled) return;
      if (s) { setSurvey(s.survey); setQuestions(s.questions); }
      setResponses(r); setLoading(false);
    });
    return () => { cancelled = true; };
  }, [surveyId, masterId]);

  const leadById = useMemo(() => new Map(leads.map(l => [l.id, l])), [leads]);
  const nameOf = (r: SurveyResponse) => (r.leadId ? leadById.get(r.leadId)?.name : undefined) || `Anônimo ${r.id.slice(0, 6)}`;
  const phoneOf = (r: SurveyResponse) => (r.leadId ? leadById.get(r.leadId)?.phone : undefined) || '';

  const answered = useMemo(() => responses.filter(r => r.status !== 'sent'), [responses]);
  const filtered = useMemo(() => answered.filter(r => {
    if (onlyCompleted && r.status !== 'completed') return false;
    const d = (r.completedAt || r.startedAt || r.createdAt || '').slice(0, 10);
    if (range.start && d < range.start) return false;
    if (range.end && d > range.end) return false;
    return true;
  }), [answered, onlyCompleted, range]);
  const summaries = useMemo(() => summarizeSurvey(questions, filtered), [questions, filtered]);

  const sent = responses.filter(r => r.status === 'sent').length;
  const started = answered.filter(r => r.status === 'started').length;
  const completed = answered.filter(r => r.status === 'completed').length;
  const rate = answered.length ? Math.round((completed / answered.length) * 100) : 0;

  const searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    return t ? filtered.filter(r => `${nameOf(r)} ${phoneOf(r)}`.toLowerCase().includes(t)) : filtered;
  }, [filtered, search, leadById]); // eslint-disable-line react-hooks/exhaustive-deps
  const ficha = searched.find(r => r.id === fichaId) || searched[0] || null;
  const fichaIndex = ficha ? searched.findIndex(r => r.id === ficha.id) : -1;

  const exportCsv = () => {
    const csv = surveyToCsv(questions, filtered.map(r => ({ ...r, leadName: nameOf(r), leadPhone: phoneOf(r) })));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${survey?.slug || 'pesquisa'}-respostas.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader2 size={24} className="animate-spin" /></div>;
  if (!survey) return <div style={{ padding: 40 }}>Pesquisa não encontrada. <button type="button" onClick={onBack} style={ghostBtn}>Voltar</button></div>;

  const renderSummary = (q: SurveyQuestion, s: QuestionSummary, i: number) => {
    const empty = s.n === 0;
    return (
      <div key={q.id} style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--adm-text-title)' }}>{i + 1}. {q.title}</h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap' }}>{SURVEY_TYPE_LABELS[q.type]}</span>
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 10px' }}>{s.n} {s.n === 1 ? 'resposta' : 'respostas'}{s.seen > s.n ? ` · ${s.seen} chegaram a ver` : ''}</div>
        {empty && <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Ainda sem respostas.</div>}
        {!empty && s.kind === 'choice' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', gap: 16, alignItems: 'center' }}>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={s.slices.filter(x => x.count > 0)} dataKey="count" nameKey="label" innerRadius={42} outerRadius={90} paddingAngle={2} stroke="none">
                    {s.slices.filter(x => x.count > 0).map(x => <Cell key={x.key} fill={PALETTE[s.slices.indexOf(x) % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} (${p?.payload?.pct}%)`, p?.payload?.label]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.slices.map((x, k) => (
                <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[k % PALETTE.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'var(--adm-text-title)' }}>{x.label}</span>
                  <strong style={{ color: 'var(--adm-text-title)' }}>{x.pct}%</strong>
                  <span style={{ color: 'var(--adm-text-muted)', minWidth: 28, textAlign: 'right' }}>{x.count}</span>
                </div>
              ))}
              {q.type === 'multi_choice' && <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>Cada pessoa pode marcar mais de uma opção: os percentuais são sobre quem respondeu.</div>}
            </div>
          </div>
        )}
        {!empty && s.kind === 'scale' && (
          <div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <div><span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{s.average}</span><span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}> média</span></div>
              {s.nps && <div style={{ padding: '4px 12px', borderRadius: 999, background: s.nps.score >= 50 ? 'rgba(16,185,129,0.15)' : s.nps.score >= 0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: 'var(--adm-text-title)', fontSize: '0.8rem', fontWeight: 800 }}>NPS {s.nps.score} <span style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }}>({s.nps.promoters} promotores, {s.nps.passives} neutros, {s.nps.detractors} detratores)</span></div>}
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.slices}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} (${p?.payload?.pct}%)`, 'Respostas']} />
                  <Bar dataKey="count" fill="#0284C7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {!empty && s.kind === 'number' && s.numberStats && <div style={{ fontSize: '0.86rem', color: 'var(--adm-text-title)' }}>Média <strong>{s.numberStats.average}</strong> · mínimo <strong>{s.numberStats.min}</strong> · máximo <strong>{s.numberStats.max}</strong></div>}
        {!empty && (s.kind === 'text' || (s.kind === 'choice' && s.texts.length > 0)) && (
          <TextList items={s.texts} title={s.kind === 'choice' ? 'Respostas em "Outro"' : undefined} nameOf={id => { const r = responses.find(x => x.id === id); return r ? nameOf(r) : ''; }} />
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--adm-bg-app)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--adm-border)', flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack} style={ghostBtn}><ArrowLeft size={14} /> Pesquisas</button>
        <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--adm-text-title)' }}>{survey.title}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => onEdit(survey.id)} style={ghostBtn}><Pencil size={14} /> Editar</button>
          <button type="button" onClick={exportCsv} disabled={!filtered.length} style={{ ...ghostBtn, opacity: filtered.length ? 1 : 0.5 }}><Download size={14} /> Exportar CSV</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '12px 20px', flexWrap: 'wrap' }}>
        {[['Enviadas', sent], ['Em andamento', started], ['Concluídas', completed], ['Taxa de conclusão', `${rate}%`]].map(([l, v]) => (
          <div key={String(l)} style={{ ...card, padding: '10px 16px', minWidth: 130 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{v}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{l}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Switch checked={onlyCompleted} onChange={e => setOnlyCompleted(e.target.checked)} label="Só concluídas" />
          <DateRangeField className="adm-input" start={range.start} end={range.end} onChange={(a, b) => setRange({ start: a, end: b })} placeholder="Período" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 20px', borderBottom: '1px solid var(--adm-border)' }}>
        {([['resumo', 'Resumo'], ['ficha', 'Ficha a ficha'], ['respostas', 'Respostas']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 800, color: tab === k ? '#0284C7' : 'var(--adm-text-muted)', borderBottom: tab === k ? '2px solid #0284C7' : '2px solid transparent' }}>{l}</button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
        {filtered.length === 0 && <div style={{ ...card, textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.88rem' }}>{answered.length === 0 ? 'Ainda não há respostas.' : 'Nenhuma resposta nesse filtro. Desligue "Só concluídas" ou mude o período.'}</div>}

        {filtered.length > 0 && tab === 'resumo' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
            {questions.map((q, i) => (q.type === 'statement' ? null : renderSummary(q, summaries[i], i)))}
          </div>
        )}

        {filtered.length > 0 && tab === 'ficha' && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={card}>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--adm-text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pessoa" style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 28px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.8rem' }} />
              </div>
              <div style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {searched.map(r => (
                  <button key={r.id} type="button" onClick={() => setFichaId(r.id)} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: `1px solid ${ficha?.id === r.id ? '#0284C7' : 'transparent'}`, background: ficha?.id === r.id ? 'rgba(2,132,199,0.08)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{nameOf(r)}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{STATUS_LABEL[r.status]} · {fmt(r.completedAt || r.startedAt)}</div>
                  </button>
                ))}
              </div>
            </div>
            {ficha && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{nameOf(ficha)}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>{phoneOf(ficha) || 'Sem telefone'} · {STATUS_LABEL[ficha.status]} · enviada {fmt(ficha.sentAt || ficha.createdAt)} · concluída {fmt(ficha.completedAt)}</div>
                  </div>
                  {ficha.leadId && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('admin_switch_tab', { detail: { tab: 'whatsapp', leadId: ficha.leadId } }))} style={ghostBtn}><ExternalLink size={13} /> Abrir lead</button>}
                  <button type="button" aria-label="Anterior" disabled={fichaIndex <= 0} onClick={() => setFichaId(searched[fichaIndex - 1].id)} style={{ ...ghostBtn, padding: 7, opacity: fichaIndex <= 0 ? 0.4 : 1 }}><ChevronLeft size={15} /></button>
                  <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>{fichaIndex + 1} de {searched.length}</span>
                  <button type="button" aria-label="Próxima" disabled={fichaIndex >= searched.length - 1} onClick={() => setFichaId(searched[fichaIndex + 1].id)} style={{ ...ghostBtn, padding: 7, opacity: fichaIndex >= searched.length - 1 ? 0.4 : 1 }}><ChevronRight size={15} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {questions.filter(q => q.type !== 'statement').map((q, i) => {
                    const v = ficha.answers[q.id]; const seen = ficha.path.includes(q.id) || isAnswered(q, v);
                    return (
                      <div key={q.id} style={{ paddingBottom: 10, borderBottom: '1px solid var(--adm-border)' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>{i + 1}. {q.title}</div>
                        <div style={{ fontSize: '0.92rem', color: isAnswered(q, v) ? 'var(--adm-text-title)' : 'var(--adm-text-muted)', whiteSpace: 'pre-wrap' }}>{isAnswered(q, v) ? answerLabel(q, v) : seen ? 'Sem resposta' : 'Não chegou a ver (pulada pela lógica)'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {filtered.length > 0 && tab === 'respostas' && (
          <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ textAlign: 'left', color: 'var(--adm-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                {['Pessoa', 'Situação', 'Concluída em', ...questions.filter(q => q.type !== 'statement').map(q => q.title)].map((h, i) => <th key={i} style={{ padding: '10px 12px', borderBottom: '1px solid var(--adm-border)', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => { setFichaId(r.id); setTab('ficha'); }} style={{ cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--adm-border)', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap' }}>{nameOf(r)}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--adm-border)', whiteSpace: 'nowrap' }}>{STATUS_LABEL[r.status]}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--adm-border)', whiteSpace: 'nowrap' }}>{fmt(r.completedAt)}</td>
                    {questions.filter(q => q.type !== 'statement').map(q => <td key={q.id} style={{ padding: '9px 12px', borderBottom: '1px solid var(--adm-border)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{answerLabel(q, r.answers[q.id])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/** Lista de respostas livres: busca e "ver mais" para nao pesar quando ha centenas */
const TextList: React.FC<{ items: Array<{ responseId: string; text: string }>; title?: string; nameOf: (responseId: string) => string }> = ({ items, title, nameOf }) => {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const list = items.filter(i => i.text.toLowerCase().includes(q.trim().toLowerCase()));
  const shown = all ? list : list.slice(0, 8);
  return (
    <div style={{ marginTop: 6 }}>
      {title && <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)', margin: '10px 0 6px' }}>{title}</div>}
      {items.length > 8 && <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nas respostas" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.8rem' }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shown.map((i, k) => (
          <div key={`${i.responseId}-${k}`} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--adm-bg-surface, rgba(0,0,0,0.03))', fontSize: '0.84rem', color: 'var(--adm-text-title)' }}>
            {i.text}<span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>{nameOf(i.responseId)}</span>
          </div>
        ))}
        {list.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Nada encontrado.</div>}
      </div>
      {list.length > 8 && <button type="button" onClick={() => setAll(v => !v)} style={{ ...ghostBtn, marginTop: 8 }}>{all ? 'Mostrar menos' : `Ver todas (${list.length})`}</button>}
    </div>
  );
};
