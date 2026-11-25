import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Copy, ExternalLink, Link2, Loader2, Pencil, Plus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../context/AdminStateContext';
import { surveyPublicUrl, surveyService, type SurveyListItem } from '../../services/surveyService';
import { HeaderActions, headerPrimaryButtonStyle } from './HeaderActions';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminSurveyBuilderView } from './AdminSurveyBuilderView';
import { AdminSurveyResultsView } from './AdminSurveyResultsView';
import { DropdownMenu } from '../ui';

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: '#D97706' },
  published: { label: 'Publicada', color: '#059669' },
  closed: { label: 'Encerrada', color: '#64748B' },
};

type Mode = { kind: 'list' } | { kind: 'edit'; id: string } | { kind: 'results'; id: string };

/** Pesquisa (Gerencia): lista de pesquisas; abre o editor (perguntas, logica, telas) e os resultados (graficos e fichas). */
export const AdminSurveysView: React.FC = () => {
  const { scopedMasterId, currentUser } = useAdminState();
  const masterId = scopedMasterId || '';
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [items, setItems] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [toDelete, setToDelete] = useState<SurveyListItem | null>(null);

  const load = useCallback(async () => {
    if (!masterId) return;
    setItems(await surveyService.list(masterId));
    setLoading(false);
  }, [masterId]);
  useEffect(() => { void load(); }, [load, mode.kind]);

  const create = async () => {
    const title = newTitle.trim();
    if (!title) { toast.warning('Dê um nome à pesquisa.'); return; }
    try {
      const s = await surveyService.create({ masterId, title, createdByName: currentUser?.name, createdById: currentUser?.id });
      setCreating(false); setNewTitle('');
      setMode({ kind: 'edit', id: s.id });
    } catch (e: any) { toast.error(e?.message || 'Não foi possível criar.'); }
  };

  if (mode.kind === 'edit') return <AdminSurveyBuilderView surveyId={mode.id} masterId={masterId} onBack={() => setMode({ kind: 'list' })} onOpenResults={id => setMode({ kind: 'results', id })} />;
  if (mode.kind === 'results') return <AdminSurveyResultsView surveyId={mode.id} masterId={masterId} onBack={() => setMode({ kind: 'list' })} onEdit={id => setMode({ kind: 'edit', id })} />;

  return (
    <div style={{ padding: '20px 24px', height: '100%', overflowY: 'auto', background: 'var(--adm-bg-app)' }}>
      <HeaderActions>
        <button type="button" onClick={() => setCreating(true)} style={headerPrimaryButtonStyle}><Plus size={15} /> Nova pesquisa</button>
      </HeaderActions>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Pesquisa</h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--adm-text-muted)', maxWidth: 680, lineHeight: 1.45 }}>
          Crie pesquisas interativas (uma pergunta por tela) com capa personalizada, imagens e vídeos no R2, compartilhe o link público direto e acompanhe gráficos de pizza, barra e evolução das respostas.
        </p>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" /></div> : items.length === 0 ? (
        <div style={{ border: '1px dashed var(--adm-border)', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
          <ClipboardList size={36} style={{ opacity: 0.6 }} />
          <p style={{ margin: '10px 0 14px', fontSize: '0.9rem' }}>Nenhuma pesquisa ainda.</p>
          <button type="button" onClick={() => setCreating(true)} style={headerPrimaryButtonStyle}><Plus size={15} /> Criar a primeira pesquisa</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {items.map(s => {
            const st = STATUS[s.status] || STATUS.draft;
            const rate = s.totalResponses ? Math.round((s.completed / s.totalResponses) * 100) : 0;
            return (
              <div key={s.id} style={{ border: '1px solid var(--adm-border)', borderRadius: 14, padding: 16, background: 'var(--adm-bg-card, #fff)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: '0.66rem', fontWeight: 800, padding: '2px 9px', borderRadius: 999, color: '#fff', background: st.color }}>{st.label}</span>
                  </div>
                  <DropdownMenu
                    aria-label="Mais ações"
                    items={[
                      { id: 'dup', label: 'Duplicar', onSelect: async () => { try { await surveyService.duplicate(s.id, masterId, { id: currentUser?.id, name: currentUser?.name }); toast.success('Pesquisa duplicada.'); void load(); } catch (e: any) { toast.error(e?.message || 'Falha ao duplicar.'); } } },
                      { id: 'del', label: 'Excluir', danger: true, separatorBefore: true, onSelect: () => setToDelete(s) },
                    ]}
                  />
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                  <span><strong style={{ color: 'var(--adm-text-title)', fontSize: '1.05rem' }}>{s.completed}</strong> concluídas</span>
                  <span><strong style={{ color: 'var(--adm-text-title)', fontSize: '1.05rem' }}>{s.questionCount}</strong> perguntas</span>
                  {s.totalResponses > 0 && <span><strong style={{ color: 'var(--adm-text-title)', fontSize: '1.05rem' }}>{rate}%</strong> de conclusão</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                  <button type="button" onClick={() => setMode({ kind: 'results', id: s.id })} style={btn}><BarChart3 size={13} /> Resultados</button>
                  <button type="button" onClick={() => setMode({ kind: 'edit', id: s.id })} style={btn}><Pencil size={13} /> Editar</button>
                  {s.status === 'published' && (
                    <>
                      <button type="button" onClick={() => { void navigator.clipboard?.writeText(surveyPublicUrl(s.slug)); toast.success('Link público copiado.'); }} style={btn}><Link2 size={13} /> <Copy size={11} /> Copiar link</button>
                      <a href={surveyPublicUrl(s.slug)} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: 'none' }}><ExternalLink size={13} /> Abrir</a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onMouseDown={e => { if (e.target === e.currentTarget) setCreating(false); }}>
          <div style={{ width: '100%', maxWidth: 420, borderRadius: 14, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: 'var(--adm-text-title)' }}>Nova pesquisa</h3>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Nome</label>
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void create(); }} placeholder="Ex.: Como foi a sua visita?" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.9rem' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setCreating(false)} style={btn}>Cancelar</button>
              <button type="button" onClick={() => void create()} style={{ ...btn, background: '#0284C7', color: '#fff', border: 'none' }}>Criar e editar</button>
            </div>
          </div>
        </div>
      )}

      <AdminConfirmModal
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Excluir pesquisa"
        message="A pesquisa, as perguntas e todas as respostas serão apagadas. Isso não pode ser desfeito."
        itemName={toDelete?.title}
        onConfirm={async () => { if (!toDelete) return; try { await surveyService.remove(toDelete.id, masterId); toast.success('Pesquisa excluída.'); setToDelete(null); void load(); } catch (e: any) { toast.error(e?.message || 'Não foi possível excluir.'); } }}
      />
    </div>
  );
};

const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' };
