/**
 * Pausa geral de mensagens do WhatsApp (entrada e saida), controlada pela chave remota `whatsapp_messaging`
 * (tabela system_feature_flags). `disabled` = pausado. Fora do React para os servicos poderem consultar.
 *
 * - O AdminStateContext chama `setMessagingPausedFromFlag` quando as chaves mudam (Realtime).
 * - `ensureMessagingEnabled()` e a barreira dos envios: se o cache estiver velho, rele a chave no banco para nao
 *   deixar uma janela de envio logo depois de abrir o app.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const MESSAGING_FLAG_ID = 'whatsapp_messaging';
export const MESSAGING_PAUSED_TEXT = 'Função desabilitada temporariamente';
export const MESSAGING_PAUSED_BANNER_DEFAULT = 'O envio e o recebimento de mensagens estão desativados temporariamente.';
const STALE_MS = 20_000;

export class MessagingPausedError extends Error {
  constructor(message: string = MESSAGING_PAUSED_TEXT) {
    super(message);
    this.name = 'MessagingPausedError';
  }
}

type Listener = (paused: boolean) => void;

let paused = false;
let checkedAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<Listener>();

const isPausedStatus = (status?: string | null) => status === 'disabled' || status === 'coming_soon';

function apply(next: boolean, fromDatabase = false) {
  if (fromDatabase) checkedAt = Date.now();
  if (next === paused) return;
  paused = next;
  listeners.forEach(fn => { try { fn(paused); } catch { /* noop */ } });
}

export function isMessagingPaused(): boolean {
  return paused;
}

/** Chamado pelo contexto com o status da chave (ou undefined quando ainda nao existe no banco = ativo). */
export function setMessagingPausedFromFlag(status?: string | null): void {
  apply(isPausedStatus(status)); // nao conta como leitura do banco: o proximo envio ainda confirma
}

export function onMessagingPauseChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function refreshMessagingPause(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('system_feature_flags')
        .select('status')
        .eq('feature_id', MESSAGING_FLAG_ID)
        .maybeSingle();
      if (!error) apply(isPausedStatus(data?.status), true);
    } catch { /* sem rede: mantem o ultimo estado conhecido */ }
    finally { inflight = null; }
  })();
  return inflight;
}

/** Barreira dos envios/ingestoes: lanca MessagingPausedError se a mensagem estiver pausada. */
export async function ensureMessagingEnabled(): Promise<void> {
  if (!paused && Date.now() - checkedAt > STALE_MS) await refreshMessagingPause();
  if (paused) throw new MessagingPausedError();
}

/** Versao sincrona (sem consultar o banco), para guardas de interface. */
export function assertMessagingEnabledSync(): void {
  if (paused) throw new MessagingPausedError();
}

export function isMessagingPausedError(err: unknown): err is MessagingPausedError {
  return err instanceof MessagingPausedError || (err as any)?.name === 'MessagingPausedError';
}
