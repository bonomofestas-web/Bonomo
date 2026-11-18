import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  RotateCcw, CheckCircle2, AlertCircle, X, Minimize2, Maximize2, Loader2, Circle,
  Smartphone, Search, GitCompare, ListChecks, DatabaseZap, Image as ImageIcon,
  UserPlus, RefreshCw, MessageSquare, Download, Ban, History,
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { uazapiService } from '../../services/uazapiService';
import {
  buildSyncPlan,
  applySyncPlan,
  recoverQueuedMedia,
  deepenFromPhone,
  SYNC_LIMITS,
  type ChatCoverage,
  type SyncPlan,
  type SyncApplyResult,
  type MediaPhaseResult,
  type RecoveredMessage,
} from '../../services/whatsappSyncService';
import { formatMediaBytes } from '../../utils/mediaStoragePolicy';
import type { Source } from '../../types/sources';

export interface WhatsAppSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
}

type Phase = 'config' | 'running' | 'review' | 'applying' | 'done' | 'error';
type StepId = 'check' | 'fetch' | 'phone' | 'compare' | 'review' | 'apply' | 'media';
type StepStatus = 'pending' | 'active' | 'done' | 'error' | 'skipped';

interface StepState {
  status: StepStatus;
  detail: string;
  done: number;
  total: number;
}

const STEP_META: Array<{ id: StepId; label: string; hint: string; icon: React.ReactNode }> = [
  { id: 'check', label: 'Verificar o chip', hint: 'Confere se o WhatsApp está conectado', icon: <Smartphone size={16} /> },
  { id: 'fetch', label: 'Buscar conversas', hint: 'Lê as conversas e mensagens do período', icon: <Search size={16} /> },
  { id: 'phone', label: 'Buscar no celular', hint: 'Períodos acima de 7 dias: pede ao celular as mensagens mais antigas', icon: <History size={16} /> },
  { id: 'compare', label: 'Comparar com o sistema', hint: 'Separa o que já existe do que falta', icon: <GitCompare size={16} /> },
  { id: 'review', label: 'Revisar', hint: 'Você confirma só o que será feito', icon: <ListChecks size={16} /> },
  { id: 'apply', label: 'Gravar', hint: 'Cria leads e grava as mensagens novas', icon: <DatabaseZap size={16} /> },
  { id: 'media', label: 'Recuperar mídias', hint: 'API primeiro; se faltar, pede ao celular', icon: <ImageIcon size={16} /> },
];

const freshSteps = (): Record<StepId, StepState> => ({
  check: { status: 'pending', detail: '', done: 0, total: 0 },
  fetch: { status: 'pending', detail: '', done: 0, total: 0 },
  phone: { status: 'pending', detail: '', done: 0, total: 0 },
  compare: { status: 'pending', detail: '', done: 0, total: 0 },
  review: { status: 'pending', detail: '', done: 0, total: 0 },
  apply: { status: 'pending', detail: '', done: 0, total: 0 },
  media: { status: 'pending', detail: '', done: 0, total: 0 },
});

const PERIODS: Array<{ id: string; label: string }> = [
  { id: '1', label: 'Hoje (24 h)' },
  { id: '3', label: '3 dias' },
  { id: '7', label: '7 dias' },
  { id: '15', label: '15 dias' },
  { id: '30', label: '30 dias (máximo)' },
  { id: 'custom', label: 'Personalizado' },
];

const REVIEW_PAGE = 100;

export const AdminWhatsAppSyncModal: React.FC<WhatsAppSyncModalProps> = ({ isOpen, onClose, source }) => {
  const { currentUser, venues, funnels, activeVenueId, leads, createLeadFromWhatsApp, refreshAllData } = useAdminState();
  const scopedMasterId = currentUser?.masterId || currentUser?.id || '';

  // Configuração
  const [period, setPeriod] = useState('7');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [saveMedia, setSaveMedia] = useState(true);
  const [askPhone, setAskPhone] = useState(true);

  // Execução
  const [phase, setPhase] = useState<Phase>('config');
  const [steps, setSteps] = useState<Record<StepId, StepState>>(freshSteps());
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Dados das fases
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCount, setShowCount] = useState({ create: REVIEW_PAGE, update: REVIEW_PAGE });
  const [applyResult, setApplyResult] = useState<SyncApplyResult | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaPhaseResult | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [phoneNote, setPhoneNote] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const planPeriodStartRef = useRef<string>('');

  const running = phase === 'running' || phase === 'applying';

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [logs]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running, startedAt]);

  const addLog = (line: string) => setLogs(prev => [...prev.slice(-80), line]);
  const patchStep = (id: StepId, patch: Partial<StepState>) =>
    setSteps(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const instanceToken = (
    source?.whatsappInstanceId ||
    (source?.configuration as any)?.token ||
    (source?.configuration as any)?.instanceToken ||
    ''
  ).trim();

  const periodRange = () => {
    const now = Date.now();
    const floor = now - SYNC_LIMITS.maxDays * 86400000; // trava de segurança: nunca mais que 30 dias
    if (period === 'custom') {
      const start = customStart ? new Date(`${customStart}T00:00:00`).getTime() : now - 7 * 86400000;
      return {
        start: Math.max(start, floor),
        end: customEnd ? Math.min(new Date(`${customEnd}T23:59:59`).getTime(), now) : now,
      };
    }
    return { start: Math.max(now - Number(period) * 86400000, floor), end: now };
  };

  const targetVenueId = source?.venueId || activeVenueId || venues[0]?.id;
  const targetFunnel = useMemo(
    () => funnels.find(f => f.id === source?.funnelId)
      || funnels.find(f => f.venueId === source?.venueId && !f.isPostSale)
      || funnels[0],
    [funnels, source]
  );

  const resetAll = () => {
    setPhase('config');
    setSteps(freshSteps());
    setLogs([]);
    setErrorMsg('');
    setPlan(null);
    setSelected(new Set());
    setApplyResult(null);
    setMediaResult(null);
    setCancelled(false);
    setPhoneNote('');
    setElapsed(0);
  };

  const handleClose = () => {
    if (running) { setIsMinimized(true); return; }
    onClose();
    setIsMinimized(false);
    if (phase === 'done' || phase === 'error' || phase === 'review') resetAll();
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setCancelled(true);
    addLog('Cancelando... o que já foi gravado será mantido.');
  };

  // ───────── FASES 1-3: verificar, buscar, comparar ─────────
  const handleStart = async () => {
    if (!instanceToken) { setErrorMsg('Instância do WhatsApp não configurada nesta origem.'); setPhase('error'); return; }
    if (!scopedMasterId) { setErrorMsg('Não foi possível identificar a conta Master do usuário.'); setPhase('error'); return; }

    const controller = new AbortController();
    abortRef.current = controller;
    setSteps(freshSteps());
    setLogs([]);
    setErrorMsg('');
    setCancelled(false);
    setPlan(null);
    setApplyResult(null);
    setMediaResult(null);
    setPhoneNote('');
    setStartedAt(Date.now());
    setElapsed(0);
    setPhase('running');

    try {
      // 1. Verificar o chip
      patchStep('check', { status: 'active', detail: 'Consultando o status da instância...' });
      addLog('Verificando se o chip está conectado...');
      const st = await uazapiService.getInstanceStatus(instanceToken);
      if (!st.connected) {
        patchStep('check', { status: 'error', detail: 'O chip está desconectado' });
        throw new Error('O chip desta origem está desconectado. Reconecte o WhatsApp (QR Code) e tente novamente.');
      }
      patchStep('check', { status: 'done', detail: 'Conectado' });

      // 2. Buscar conversas e mensagens
      const { start, end } = periodRange();
      planPeriodStartRef.current = new Date(start).toISOString();
      patchStep('fetch', { status: 'active', detail: 'Listando conversas...' });
      addLog('Buscando conversas do chip...');
      let recovered = await uazapiService.recoverMessagesInInterval(instanceToken, {
        startTimestamp: start,
        endTimestamp: end,
        limitPerChat: 400,
        maxChats: 1000,
        signal: controller.signal,
        onProgress: (p) => {
          if (p.phase === 'chats') patchStep('fetch', { detail: `${p.done} conversas encontradas...`, done: 0, total: 0 });
          else patchStep('fetch', { done: p.done, total: p.total, detail: p.name ? `Lendo: ${p.name}` : 'Lendo mensagens...' });
        },
      }) as unknown as RecoveredMessage[];
      if (controller.signal.aborted) throw new Error('__cancelled__');
      patchStep('fetch', { status: 'done', detail: `${recovered.length} mensagens lidas`, done: 1, total: 1 });
      addLog(`${recovered.length} mensagem(ns) lida(s) da UAZAPI no período.`);

      // 3. Buscar no celular: períodos acima da janela da UAZAPI (7 dias) SEMPRE pedem o histórico ao aparelho
      let coverage: Map<string, ChatCoverage> | undefined;
      if (Date.now() - start > SYNC_LIMITS.apiWindowDays * 86400000 && recovered.length > 0) {
        patchStep('phone', { status: 'active', detail: 'Pedindo ao celular as mensagens mais antigas...' });
        addLog('Período maior que 7 dias: pedindo o histórico ao celular, conversa por conversa...');
        const deep = await deepenFromPhone({
          token: instanceToken,
          recovered,
          startTimestamp: start,
          endTimestamp: end,
          signal: controller.signal,
          onLog: addLog,
          onProgress: (p) => patchStep('phone', { done: p.done, total: p.total, detail: p.detail || `Conversa ${p.done} de ${p.total}` }),
        });
        if (controller.signal.aborted) throw new Error('__cancelled__');
        recovered = deep.messages;
        coverage = deep.coverage;
        const partial = Array.from(deep.coverage.values()).filter(c => c.status === 'partial').length;
        if (deep.phoneUnreachable) {
          setPhoneNote(`O celular do chip ${source?.name || ''} não respondeu. Abra o WhatsApp no aparelho, deixe-o ativo e sincronize de novo para completar o período.`);
        }
        patchStep('phone', {
          status: deep.phoneUnreachable ? 'error' : 'done',
          detail: `${deep.requests} pedido(s) ao celular${partial ? `, ${partial} conversa(s) parcial(is)` : ''}`,
          done: 1, total: 1,
        });
      } else {
        patchStep('phone', { status: 'skipped', detail: recovered.length === 0 ? 'Sem mensagens' : 'Não precisa: a UAZAPI cobre este período' });
      }

      // 4. Comparar com o sistema
      patchStep('compare', { status: 'active', detail: 'Comparando com os leads e o histórico do sistema...' });
      const built = await buildSyncPlan({
        recovered,
        leads,
        sinceIso: planPeriodStartRef.current,
        signal: controller.signal,
        coverage,
        onProgress: (p) => patchStep('compare', { done: p.done, total: p.total, detail: p.detail || `Conversa ${p.done} de ${p.total}` }),
      });
      if (controller.signal.aborted) throw new Error('__cancelled__');
      patchStep('compare', {
        status: 'done',
        detail: `${built.chats.length} com novidades, ${built.upToDate} já em dia`,
        done: built.fetchedChats,
        total: built.fetchedChats,
      });
      addLog(`${built.chats.length} conversa(s) precisam de ação; ${built.upToDate} já estão em dia.`);

      setPlan(built);
      setSelected(new Set(built.chats.map(c => c.key)));
      setShowCount({ create: REVIEW_PAGE, update: REVIEW_PAGE });

      if (built.chats.length === 0) {
        patchStep('review', { status: 'skipped', detail: 'Nada a revisar' });
        patchStep('apply', { status: 'skipped', detail: 'Nada a gravar' });
        patchStep('media', { status: 'skipped', detail: 'Nada a recuperar' });
        setPhase('done');
        return;
      }
      patchStep('review', { status: 'active', detail: 'Aguardando sua confirmação' });
      setPhase('review');
    } catch (err: any) {
      if (err?.message === '__cancelled__' || controller.signal.aborted) {
        addLog('Sincronização cancelada.');
        setPhase('done');
        setCancelled(true);
        return;
      }
      console.error('[Sync] erro:', err);
      setErrorMsg(err?.message || 'Falha durante a sincronização.');
      setSteps(prev => {
        const next = { ...prev };
        (Object.keys(next) as StepId[]).forEach(k => { if (next[k].status === 'active') next[k] = { ...next[k], status: 'error' }; });
        return next;
      });
      setPhase('error');
    }
  };

  // ───────── FASES 5-6: gravar e recuperar mídias ─────────
  const handleApply = async () => {
    if (!plan) return;
    const chosen = plan.chats.filter(c => selected.has(c.key));
    if (chosen.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setCancelled(false);
    setStartedAt(Date.now());
    setElapsed(0);
    setPhase('applying');
    patchStep('review', { status: 'done', detail: `${chosen.length} conversa(s) confirmada(s)` });
    patchStep('apply', { status: 'active', detail: 'Gravando...', done: 0, total: chosen.length });
    addLog(`Gravando ${chosen.length} conversa(s)...`);

    try {
      const result = await applySyncPlan({
        chats: chosen,
        source,
        masterId: scopedMasterId,
        venueId: targetVenueId,
        funnelId: targetFunnel?.id,
        createLeadFromWhatsApp,
        signal: controller.signal,
        onLog: addLog,
        onProgress: (p) => patchStep('apply', {
          done: p.done,
          total: p.total,
          detail: `${p.created} criado(s), ${p.updated} atualizado(s), ${p.messages} mensagem(ns)${p.name ? ` - ${p.name}` : ''}`,
        }),
      });
      setApplyResult(result);
      patchStep('apply', {
        status: result.failed.length > 0 ? 'error' : 'done',
        detail: `${result.created} lead(s) criado(s), ${result.updated} atualizado(s), ${result.messagesSaved} mensagem(ns)`,
      });

      // Mídias
      if (result.mediaQueue.length > 0 && saveMedia && !result.cancelled) {
        patchStep('media', { status: 'active', detail: 'Baixando pela API...', done: 0, total: result.mediaQueue.length });
        addLog(`Recuperando ${result.mediaQueue.length} mídia(s)...`);
        const media = await recoverQueuedMedia({
          queue: result.mediaQueue,
          source,
          masterId: scopedMasterId,
          venueId: targetVenueId,
          instanceToken,
          askPhone,
          phoneBudget: 10,
          signal: controller.signal,
          onProgress: (p) => patchStep('media', {
            done: p.done,
            total: p.total,
            detail: p.stage === 'phone' ? `Pedindo ao celular: ${p.detail || ''}` : `Baixando pela API: ${p.detail || ''}`,
          }),
        });
        setMediaResult(media);
        patchStep('media', {
          status: 'done',
          detail: `${media.stored} salva(s), ${media.pending.length} pendente(s)${media.askedPhone ? `, ${media.askedPhone} pedida(s) ao celular` : ''}`,
        });
      } else {
        patchStep('media', {
          status: 'skipped',
          detail: result.mediaQueue.length === 0 ? 'Nenhuma mídia nova' : 'Ficaram pendentes para salvar depois',
        });
      }

      if (result.cancelled || controller.signal.aborted) {
        setCancelled(true);
        addLog('Cancelado. O que já foi gravado foi mantido.');
      }
      addLog('Atualizando a lista de conversas...');
      await refreshAllData().catch(() => {});
      setPhase('done');
    } catch (err: any) {
      console.error('[Sync] erro ao gravar:', err);
      setErrorMsg(err?.message || 'Falha ao gravar a sincronização.');
      patchStep('apply', { status: 'error' });
      setPhase('error');
    }
  };

  // ───────── Revisão: seleção ─────────
  const toCreate = plan?.chats.filter(c => c.action === 'create') || [];
  const toUpdate = plan?.chats.filter(c => c.action === 'update') || [];
  const selectedCount = plan ? plan.chats.filter(c => selected.has(c.key)).length : 0;
  const selectedMessages = plan ? plan.chats.filter(c => selected.has(c.key)).reduce((s, c) => s + c.newMessages.length, 0) : 0;
  const selectedMedia = plan ? plan.chats.filter(c => selected.has(c.key)).reduce((s, c) => s + c.mediaCount, 0) : 0;

  const toggleGroup = (chats: typeof toCreate, on: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      chats.forEach(c => (on ? next.add(c.key) : next.delete(c.key)));
      return next;
    });
  };
  const toggleOne = (key: string) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  // ───────── Relatório (CSV de exceções) ─────────
  const downloadExceptions = () => {
    const rows: string[][] = [['tipo', 'contato', 'detalhe']];
    applyResult?.failed.forEach(f => rows.push(['falha ao gravar', f.name || f.phone, f.error]));
    plan?.chats.filter(c => c.coverage?.status === 'partial').forEach(c => rows.push(['historico parcial', c.name || c.phone, c.coverage?.reason || '']));
    mediaResult?.pending.forEach(p => rows.push([`midia pendente (${p.mediaType})`, p.leadName, `${p.sizeBytes ? formatMediaBytes(p.sizeBytes) + ' - ' : ''}${p.reason}`]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sincronizacao-excecoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen && !running) return null;

  // ───────── Estilos compartilhados ─────────
  const card: React.CSSProperties = {
    background: 'var(--adm-bg-input, rgba(255,255,255,0.04))',
    border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
    borderRadius: '10px',
  };
  const muted: React.CSSProperties = { color: 'var(--adm-text-muted, #94A3B8)' };
  const title: React.CSSProperties = { color: 'var(--adm-text-title, #F8FAFC)' };
  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px',
    background: 'var(--adm-accent, #14A9D7)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
  };
  const ghostBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px',
    background: 'transparent', color: 'var(--adm-text-title, #F8FAFC)', border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const stepColor = (s: StepStatus) =>
    s === 'done' ? '#10B981' : s === 'error' ? '#EF4444' : s === 'active' ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-text-muted, #64748B)';

  const activeStepId = (Object.keys(steps) as StepId[]).find(k => steps[k].status === 'active');
  const activeStep = activeStepId ? steps[activeStepId] : null;
  const overallPct = (() => {
    const order: StepId[] = ['check', 'fetch', 'phone', 'compare', 'review', 'apply', 'media'];
    const weights = [3, 17, 30, 8, 0, 29, 13];
    let pct = 0;
    order.forEach((id, i) => {
      const s = steps[id];
      if (s.status === 'done' || s.status === 'skipped') pct += weights[i];
      else if (s.status === 'active' && s.total > 0) pct += weights[i] * Math.min(1, s.done / s.total);
    });
    return Math.round(pct);
  })();

  // ───────── Renderização das partes ─────────
  const renderStepper = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {STEP_META.map((meta, idx) => {
        const s = steps[meta.id];
        const pct = s.total > 0 ? Math.min(100, Math.round((s.done / s.total) * 100)) : 0;
        return (
          <div key={meta.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', position: 'relative' }}>
            {idx < STEP_META.length - 1 && (
              <div style={{ position: 'absolute', left: '13px', top: '38px', bottom: '-8px', width: '2px',
                background: s.status === 'done' ? '#10B981' : 'var(--adm-border, rgba(255,255,255,0.1))' }} />
            )}
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${stepColor(s.status)}`, color: stepColor(s.status),
              background: s.status === 'done' ? 'rgba(16,185,129,0.12)' : s.status === 'active' ? 'rgba(20,169,215,0.12)' : 'transparent',
            }}>
              {s.status === 'done' ? <CheckCircle2 size={16} />
                : s.status === 'error' ? <AlertCircle size={16} />
                : s.status === 'active' ? <Loader2 size={16} className="animate-spin" />
                : s.status === 'skipped' ? <Circle size={12} />
                : meta.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: s.status === 'pending' ? 'var(--adm-text-muted, #94A3B8)' : 'var(--adm-text-title, #F8FAFC)' }}>
                {idx + 1}. {meta.label}
              </div>
              <div style={{ fontSize: '0.72rem', color: s.status === 'error' ? '#EF4444' : 'var(--adm-text-muted, #94A3B8)', marginTop: '2px', wordBreak: 'break-word' }}>
                {s.detail || meta.hint}
              </div>
              {s.status === 'active' && s.total > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ height: '5px', borderRadius: '4px', background: 'var(--adm-border, rgba(255,255,255,0.1))', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--adm-accent, #14A9D7)', transition: 'width 0.25s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.68rem', marginTop: '3px', ...muted }}>{s.done} de {s.total}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderConfig = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', ...title }}>Período a sincronizar</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {PERIODS.map(p => (
            <button key={p.id} type="button" onClick={() => setPeriod(p.id)} style={{
              padding: '8px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${period === p.id ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-border, rgba(255,255,255,0.15))'}`,
              background: period === p.id ? 'rgba(20,169,215,0.14)' : 'transparent',
              color: period === p.id ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-text-title, #F8FAFC)',
            }}>{p.label}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ ...card, padding: '8px 10px', color: 'inherit' }} />
            <span style={muted}>até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ ...card, padding: '8px 10px', color: 'inherit' }} />
          </div>
        )}
        <div style={{ fontSize: '0.72rem', marginTop: '10px', lineHeight: 1.5, ...muted }}>
          Até 7 dias a UAZAPI cobre sozinha. Acima disso o celular é sempre pedido, conversa por conversa, de 100 em 100 mensagens até chegar na data escolhida: deixe o WhatsApp do chip aberto. O período máximo é de {SYNC_LIMITS.maxDays} dias e períodos longos podem demorar.
        </div>
      </div>

      <div style={{ ...card, padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" checked={saveMedia} onChange={e => setSaveMedia(e.target.checked)} style={{ marginTop: '3px' }} />
          <span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, ...title }}>Salvar mídias leves automaticamente</span>
            <span style={{ display: 'block', fontSize: '0.72rem', ...muted }}>
              Fotos até 2 MB, vídeos até 10 MB, documentos até 5 MB e áudios. Arquivos maiores ficam pendentes, com o peso, para você decidir.
            </span>
          </span>
        </label>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: saveMedia ? 'pointer' : 'not-allowed', opacity: saveMedia ? 1 : 0.5 }}>
          <input type="checkbox" checked={askPhone && saveMedia} disabled={!saveMedia} onChange={e => setAskPhone(e.target.checked)} style={{ marginTop: '3px' }} />
          <span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, ...title }}>Pedir ao celular o que a API não encontrar</span>
            <span style={{ display: 'block', fontSize: '0.72rem', ...muted }}>
              Até 10 mídias por rodada. O WhatsApp do chip precisa estar aberto (ou em segundo plano) e com internet.
            </span>
          </span>
        </label>
      </div>

      <div style={{ fontSize: '0.76rem', ...muted }}>
        Destino dos leads novos: <strong style={title}>{venues.find(v => v.id === targetVenueId)?.name || 'casa da origem'}</strong>
        {targetFunnel ? <> / funil <strong style={title}>{targetFunnel.name}</strong></> : null}.
        Nada é gravado antes da sua confirmação na revisão.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleStart} style={primaryBtn}>
          <RefreshCw size={16} /> Iniciar sincronização
        </button>
      </div>
    </div>
  );

  const renderRunning = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...card, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, ...title, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--adm-accent, #14A9D7)' }} />
            {activeStepId ? STEP_META.find(m => m.id === activeStepId)?.label : 'Preparando...'}
          </div>
          <div style={{ fontSize: '0.74rem', ...muted }}>{fmtTime(elapsed)}</div>
        </div>
        <div style={{ height: '8px', borderRadius: '6px', background: 'var(--adm-border, rgba(255,255,255,0.1))', overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(3, overallPct)}%`, height: '100%', background: 'linear-gradient(90deg, #14A9D7, #10B981)', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: '0.76rem', marginTop: '8px', ...muted }}>
          {activeStep?.detail || 'Iniciando...'}
          {activeStep && activeStep.total > 0 ? ` (${activeStep.done}/${activeStep.total})` : ''}
        </div>
      </div>
      <div style={{ ...card, padding: '10px 12px', maxHeight: '180px', overflowY: 'auto', fontSize: '0.74rem', lineHeight: 1.55, ...muted }}>
        {logs.length === 0 ? 'Aguardando...' : logs.map((l, i) => <div key={i}>{l}</div>)}
        <div ref={logsEndRef} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', ...muted }}>Você pode minimizar esta janela; a sincronização continua.</span>
        <button type="button" onClick={handleCancel} disabled={cancelled} style={{ ...ghostBtn, color: '#EF4444', borderColor: 'rgba(239,68,68,0.4)' }}>
          <Ban size={15} /> {cancelled ? 'Cancelando...' : 'Cancelar'}
        </button>
      </div>
    </div>
  );

  const renderReviewGroup = (label: string, icon: React.ReactNode, chats: typeof toCreate, key: 'create' | 'update') => {
    if (chats.length === 0) return null;
    const allOn = chats.every(c => selected.has(c.key));
    const visible = chats.slice(0, showCount[key]);
    return (
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.08))' }}>
          <input type="checkbox" checked={allOn} onChange={e => toggleGroup(chats, e.target.checked)} />
          <span style={{ color: 'var(--adm-accent, #14A9D7)', display: 'flex' }}>{icon}</span>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, ...title }}>{label}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.74rem', ...muted }}>{chats.length}</span>
        </div>
        <div style={{ maxHeight: '230px', overflowY: 'auto' }}>
          {visible.map(c => (
            <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggleOne(c.key)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, ...title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.lead?.name || c.name}
                </div>
                <div style={{ fontSize: '0.7rem', ...muted }}>
                  +{c.phone}
                  {c.coverage?.status === 'complete' && <span style={{ marginLeft: '8px', color: '#10B981' }}>histórico completo</span>}
                  {c.coverage?.status === 'partial' && <span style={{ marginLeft: '8px', color: '#F59E0B' }}>parcial: {c.coverage.reason}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.72rem', ...muted, flexShrink: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={12} /> {c.newMessages.length}</span>
                {c.mediaCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '10px' }}><ImageIcon size={12} /> {c.mediaCount}</span>}
              </div>
            </label>
          ))}
          {chats.length > visible.length && (
            <button type="button" onClick={() => setShowCount(p => ({ ...p, [key]: p[key] + REVIEW_PAGE }))}
              style={{ ...ghostBtn, margin: '10px 14px', padding: '6px 12px', fontSize: '0.74rem' }}>
              Mostrar mais ({chats.length - visible.length})
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...card, padding: '14px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: '1.3rem', fontWeight: 800, ...title }}>{selectedCount}</div><div style={{ fontSize: '0.72rem', ...muted }}>conversas selecionadas</div></div>
        <div><div style={{ fontSize: '1.3rem', fontWeight: 800, ...title }}>{selectedMessages}</div><div style={{ fontSize: '0.72rem', ...muted }}>mensagens novas</div></div>
        <div><div style={{ fontSize: '1.3rem', fontWeight: 800, ...title }}>{selectedMedia}</div><div style={{ fontSize: '0.72rem', ...muted }}>mídias a recuperar</div></div>
        <div style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.72rem', ...muted, maxWidth: '210px' }}>
          {plan?.upToDate ? `${plan.upToDate} conversa(s) já estão em dia e não aparecem aqui.` : 'Tudo o que aparece abaixo será feito.'}
        </div>
      </div>
      {phoneNote && (
        <div style={{ ...card, padding: '10px 14px', borderColor: 'rgba(245,158,11,0.5)', fontSize: '0.76rem', color: '#F59E0B' }}>{phoneNote}</div>
      )}
      {renderReviewGroup('Leads a criar', <UserPlus size={16} />, toCreate, 'create')}
      {renderReviewGroup('Leads a atualizar com mensagens novas', <RefreshCw size={16} />, toUpdate, 'update')}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { resetAll(); }} style={ghostBtn}>Voltar</button>
        <button type="button" onClick={handleApply} disabled={selectedCount === 0} style={{ ...primaryBtn, opacity: selectedCount === 0 ? 0.5 : 1, cursor: selectedCount === 0 ? 'not-allowed' : 'pointer' }}>
          <DatabaseZap size={16} /> Gravar {selectedCount} conversa(s)
        </button>
      </div>
    </div>
  );

  const renderDone = () => {
    const nothing = (plan?.chats.length || 0) === 0 && !cancelled;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ ...card, padding: '18px', textAlign: 'center' }}>
          {cancelled
            ? <Ban size={34} style={{ color: '#F59E0B' }} />
            : <CheckCircle2 size={34} style={{ color: '#10B981' }} />}
          <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '8px', ...title }}>
            {cancelled ? 'Sincronização cancelada' : nothing ? 'Tudo já estava em dia' : 'Sincronização concluída'}
          </div>
          <div style={{ fontSize: '0.78rem', marginTop: '4px', ...muted }}>
            {cancelled ? 'O que já foi gravado foi mantido.'
              : nothing ? `${plan?.upToDate || 0} conversa(s) conferida(s) e nenhuma mensagem faltando.`
              : 'Rodar de novo só fará o que ainda faltar.'}
          </div>
        </div>
        {applyResult && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
            {[
              ['Leads criados', applyResult.created],
              ['Leads atualizados', applyResult.updated],
              ['Mensagens gravadas', applyResult.messagesSaved],
              ['Mídias salvas', mediaResult?.stored ?? 0],
              ['Mídias pendentes', mediaResult?.pending.length ?? 0],
              ['Falhas', applyResult.failed.length],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ ...card, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, ...title }}>{val as number}</div>
                <div style={{ fontSize: '0.7rem', ...muted }}>{label as string}</div>
              </div>
            ))}
          </div>
        )}
        {(mediaResult?.pending.length || 0) > 0 && (
          <div style={{ ...card, padding: '12px 14px', fontSize: '0.76rem', lineHeight: 1.55, ...muted }}>
            <strong style={title}>Mídias pendentes:</strong> ficam marcadas no chat com o peso e o motivo. Abra a conversa e toque em baixar:
            o sistema tenta a API e, se faltar, pede ao celular automaticamente.
          </div>
        )}
        {(applyResult?.failed.length || 0) > 0 && (
          <div style={{ ...card, padding: '12px 14px', fontSize: '0.76rem', color: '#EF4444' }}>
            {applyResult!.failed.slice(0, 5).map((f, i) => <div key={i}>{f.name || f.phone}: {f.error}</div>)}
            {applyResult!.failed.length > 5 && <div>... e mais {applyResult!.failed.length - 5}.</div>}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          {((applyResult?.failed.length || 0) + (mediaResult?.pending.length || 0)) > 0
            ? <button type="button" onClick={downloadExceptions} style={ghostBtn}><Download size={15} /> Baixar lista de exceções</button>
            : <span />}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={resetAll} style={ghostBtn}><RotateCcw size={15} /> Nova sincronização</button>
            <button type="button" onClick={handleClose} style={primaryBtn}>Concluir</button>
          </div>
        </div>
      </div>
    );
  };

  const renderError = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...card, padding: '18px', borderColor: 'rgba(239,68,68,0.4)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertCircle size={22} style={{ color: '#EF4444', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, ...title }}>A sincronização não pôde continuar</div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#EF4444' }}>{errorMsg}</div>
            <div style={{ fontSize: '0.74rem', marginTop: '6px', ...muted }}>Nada foi apagado. Você pode tentar novamente: só será feito o que ainda faltar.</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button type="button" onClick={resetAll} style={ghostBtn}>Voltar</button>
        <button type="button" onClick={handleStart} style={primaryBtn}><RefreshCw size={15} /> Tentar novamente</button>
      </div>
    </div>
  );

  const rightPanel =
    phase === 'config' ? renderConfig()
    : phase === 'running' || phase === 'applying' ? renderRunning()
    : phase === 'review' ? renderReview()
    : phase === 'done' ? renderDone()
    : renderError();

  return (
    <>
      {isOpen && !isMinimized && (
        <div
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '20px', backdropFilter: 'blur(3px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--adm-card-bg, #111C2E)', border: '1px solid var(--adm-border, rgba(255,255,255,0.12))',
              borderRadius: '14px', width: '100%', maxWidth: '900px', maxHeight: '92vh', display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.65)',
            }}
          >
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <RotateCcw size={18} className={running ? 'animate-spin' : ''} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, ...title }}>Sincronização do WhatsApp</h2>
                  <div style={{ fontSize: '0.74rem', ...muted }}>{source?.name || 'Origem'}{running ? ` - ${fmtTime(elapsed)}` : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {running && (
                  <button type="button" onClick={() => setIsMinimized(true)} title="Minimizar" style={{ ...ghostBtn, padding: '6px 8px' }}><Minimize2 size={16} /></button>
                )}
                <button type="button" onClick={handleClose} title={running ? 'Minimizar' : 'Fechar'} style={{ ...ghostBtn, padding: '6px 8px' }}><X size={16} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 270px', maxWidth: '100%', padding: '14px 20px', borderRight: '1px solid var(--adm-border, rgba(255,255,255,0.08))', overflowY: 'auto' }}>
                {renderStepper()}
              </div>
              <div style={{ flex: '1 1 380px', padding: '18px 22px', overflowY: 'auto', minWidth: 0 }}>
                {rightPanel}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pílula persistente enquanto minimizado */}
      {running && isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          style={{
            position: 'fixed', right: '20px', bottom: '20px', zIndex: 9998, cursor: 'pointer', width: '300px',
            backgroundColor: 'var(--adm-card-bg, #111C2E)', border: '1px solid var(--adm-accent, #14A9D7)', borderRadius: '12px',
            padding: '12px 14px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, ...title }}>
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--adm-accent, #14A9D7)' }} />
            Sincronizando... {overallPct}%
            <Maximize2 size={13} style={{ marginLeft: 'auto', ...muted }} />
          </div>
          <div style={{ height: '5px', borderRadius: '4px', background: 'var(--adm-border, rgba(255,255,255,0.1))', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(3, overallPct)}%`, height: '100%', background: 'var(--adm-accent, #14A9D7)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: '6px', ...muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeStep?.detail || 'Em andamento'}
          </div>
        </div>
      )}
    </>
  );
};
