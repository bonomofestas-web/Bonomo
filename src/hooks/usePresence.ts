import { useCallback, useEffect, useRef, useState } from 'react';
import { PRESENCE_ENABLED, presenceService, type PresenceEntityType, type PresenceRow } from '../services/presenceService';

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
  const { collaboratorId, masterId, venueId, view } = opts;
  const enabled = opts.enabled && PRESENCE_ENABLED; // recurso na gaveta: sem timers nem listeners
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

const POLL_ONLINE_MS = 30_000;
const POLL_OFFLINE_MS = 60_000;

/**
 * Presenca ao vivo de UMA pessoa, so enquanto o perfil dela esta aberto (e a aba visivel).
 * Online: atualiza a cada 30 s. Offline: so confere a cada 60 s se ela voltou (sem carregar atividade).
 * Fora do perfil nao ha leitura nenhuma.
 */
export const useCollaboratorPresence = (opts: { enabled: boolean; masterId?: string; collaboratorId?: string | null }): PresenceRow | null => {
  const { masterId, collaboratorId } = opts;
  const enabled = opts.enabled && PRESENCE_ENABLED;
  const [row, setRow] = useState<PresenceRow | null>(null);

  useEffect(() => {
    setRow(null);
    if (!enabled || !masterId || !collaboratorId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (online: boolean) => {
      if (cancelled) return;
      timer = setTimeout(load, online ? POLL_ONLINE_MS : POLL_OFFLINE_MS);
    };
    async function load() {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') { schedule(false); return; }
      const r = await presenceService.getOne(masterId as string, collaboratorId as string);
      if (cancelled) return;
      const online = Boolean(r && Date.now() - r.lastSeenAt < presenceService.ONLINE_WINDOW_MS);
      setRow(online ? r : null);
      schedule(online);
    }
    void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') { if (timer) clearTimeout(timer); void load(); }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, masterId, collaboratorId]);

  return row;
};
