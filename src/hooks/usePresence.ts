import { useCallback, useEffect, useRef, useState } from 'react';
import { presenceService, type PresenceEntityType, type PresenceRow } from '../services/presenceService';

/**
 * Presenca ao vivo, sem Realtime.
 * - Publicador (AdminPortal): grava ao mudar de tela/entidade (min. 20 s entre gravacoes) e a cada 90 s
 *   apenas com a aba visivel e atividade recente (para apos 5 min ocioso).
 * - Leitor (tela Time): polling a cada 30 s so enquanto a tela esta aberta e a aba visivel.
 */

interface EntityCtx { type: PresenceEntityType; id?: string | null; label?: string | null }
let currentEntity: EntityCtx = { type: 'none' };
const listeners = new Set<() => void>();

/** Chamado pelas telas que abrem um lead/contrato/tarefa. Limpa ao desmontar. */
export const usePresenceContext = (ctx: EntityCtx | null) => {
  const type = ctx?.type;
  const id = ctx?.id;
  const label = ctx?.label;
  useEffect(() => {
    if (!type || type === 'none') return;
    currentEntity = { type, id, label };
    listeners.forEach(l => l());
    return () => { currentEntity = { type: 'none' }; listeners.forEach(l => l()); };
  }, [type, id, label]);
};

const MIN_GAP_MS = 20_000;
const HEARTBEAT_MS = 90_000;
const IDLE_MS = 5 * 60_000;

export const usePresencePublisher = (opts: {
  enabled: boolean; collaboratorId?: string; masterId?: string; venueId?: string | null; view: string;
}) => {
  const { enabled, collaboratorId, masterId, venueId, view } = opts;
  const lastWrite = useRef(0);
  const lastActivity = useRef(Date.now());
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const send = useCallback(() => {
    if (!enabled || !collaboratorId || !masterId) return;
    if (document.visibilityState !== 'visible') return;
    lastWrite.current = Date.now();
    void presenceService.publish({
      collaboratorId, masterId, venueId, view: viewRef.current,
      entityType: currentEntity.type, entityId: currentEntity.id, entityLabel: currentEntity.label,
    });
  }, [enabled, collaboratorId, masterId, venueId]);

  const sendThrottled = useCallback(() => {
    const wait = MIN_GAP_MS - (Date.now() - lastWrite.current);
    if (wait <= 0) { send(); return; }
    if (pending.current) return;
    pending.current = setTimeout(() => { pending.current = null; send(); }, wait);
  }, [send]);

  useEffect(() => {
    if (!enabled) return;
    const touch = () => { lastActivity.current = Date.now(); };
    const events = ['pointerdown', 'keydown'] as const;
    events.forEach(e => window.addEventListener(e, touch, { passive: true }));
    listeners.add(sendThrottled);
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current < IDLE_MS) send();
    }, HEARTBEAT_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') sendThrottled(); };
    document.addEventListener('visibilitychange', onVisible);
    sendThrottled();
    return () => {
      events.forEach(e => window.removeEventListener(e, touch));
      listeners.delete(sendThrottled);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
      if (pending.current) { clearTimeout(pending.current); pending.current = null; }
    };
  }, [enabled, send, sendThrottled]);

  // troca de tela = nova gravacao (respeitando o intervalo minimo)
  useEffect(() => { if (enabled) sendThrottled(); }, [view, enabled, sendThrottled]);
};

const POLL_MS = 30_000;

export const useTeamPresence = (opts: { enabled: boolean; masterId?: string }): Map<string, PresenceRow> => {
  const { enabled, masterId } = opts;
  const [rows, setRows] = useState<Map<string, PresenceRow>>(new Map());

  useEffect(() => {
    if (!enabled || !masterId) { setRows(new Map()); return; }
    let cancelled = false;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      const list = await presenceService.listOnline(masterId);
      if (!cancelled) setRows(new Map(list.map(r => [r.collaboratorId, r])));
    };
    void load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, masterId]);

  return rows;
};
