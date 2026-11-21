/**
 * Cache local das conversas do WhatsApp no navegador (IndexedDB), no mesmo espírito do WhatsApp Web:
 * a tela abre na hora com o que já foi visto e o sistema busca no banco só o que mudou (delta).
 *
 * - Fonte da verdade continua sendo o banco; isto é só uma cópia para ganhar velocidade.
 * - Leitura SÍNCRONA a partir de um espelho em memória (o SLA e a ordenação consultam o cache de forma síncrona);
 *   a gravação no IndexedDB é assíncrona e em lote (debounce).
 * - Escopo por Master + usuário; apagado no logout e na troca de usuário.
 * - Guarda só texto e metadados das ~60 conversas mais recentes (até 120 mensagens cada). NUNCA guarda mídia
 *   (apenas as URLs), senhas ou tokens.
 * - Qualquer falha (IndexedDB bloqueado, aba anônima, cota) cai em "somente memória" sem quebrar nada.
 */
import type { LeadActivity } from '../types/admin';

const DB_PREFIX = 'f5-chat-cache-v4-';
const STORE = 'conversations';
const MAX_LEADS = 60;
const MAX_PER_LEAD = 120;
const FLUSH_DELAY_MS = 800;
const LEGACY_LS_PREFIX = 'f5_lead_chat_';

interface Entry {
  leadId: string;
  acts: LeadActivity[];
  /** Quando esta conversa foi sincronizada com o banco pela última vez (ms) */
  syncedAt: number;
  /** Último acesso (ms) — base do descarte LRU */
  touched: number;
}

let enabled = true;
let scopeKey = '';
let dbName = '';
let db: IDBDatabase | null = null;
let initPromise: Promise<void> | null = null;
const mem = new Map<string, Entry>();
const dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const hasIdb = () => typeof indexedDB !== 'undefined';

function openDb(name: string): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (!hasIdb()) return resolve(null);
    try {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'leadId' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readAll(database: IDBDatabase): Promise<Entry[]> {
  return new Promise(resolve => {
    try {
      const req = database.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as Entry[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function removeLegacyLocalStorage() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LEGACY_LS_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* noop */ }
}

/** Reduz uma atividade ao essencial (sem payloads brutos grandes). */
function slim(a: LeadActivity): LeadActivity {
  const meta: any = a.metadata ? { ...(a.metadata as any) } : undefined;
  if (meta) { delete meta.rawPayload; delete meta.raw; }
  return {
    id: a.id,
    leadId: a.leadId,
    timestamp: a.timestamp,
    type: a.type,
    title: a.title,
    text: a.text,
    authorName: a.authorName,
    authorId: a.authorId,
    authorAvatarUrl: a.authorAvatarUrl,
    mediaUrl: a.mediaUrl,
    mediaType: a.mediaType,
    status: a.status,
    messageId: (a as any).messageId,
    quotedMessage: (a as any).quotedMessage,
    metadata: meta,
  } as LeadActivity;
}

function scheduleFlush() {
  if (!enabled || !db) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { void flushNow(); }, FLUSH_DELAY_MS);
}

async function flushNow(): Promise<void> {
  flushTimer = null;
  if (!enabled || !db || dirty.size === 0) return;
  const ids = Array.from(dirty);
  dirty.clear();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    ids.forEach(id => {
      const e = mem.get(id);
      if (e) store.put(e);
      else store.delete(id);
    });
  } catch { /* falha de gravação: segue só com a memória */ }
}

function evictIfNeeded() {
  if (mem.size <= MAX_LEADS) return;
  const sorted = Array.from(mem.values()).sort((a, b) => a.touched - b.touched);
  for (const e of sorted.slice(0, mem.size - MAX_LEADS)) {
    mem.delete(e.leadId);
    dirty.add(e.leadId);
  }
}

export const chatCache = {
  /** Liga/desliga (chave remota chat_local_cache). Desligar apaga o que estiver guardado. */
  setEnabled(next: boolean): void {
    if (next === enabled) return;
    enabled = next;
    if (!next) void this.clearAll();
  },

  isEnabled(): boolean { return enabled; },

  /** Abre o cache do usuário (Master + usuário) e carrega para a memória. Seguro chamar várias vezes. */
  async init(scope: string): Promise<void> {
    if (!enabled || !scope) return;
    if (scope === scopeKey && initPromise) return initPromise;
    // Troca de usuário/Master: descarta tudo do escopo anterior
    if (scopeKey && scope !== scopeKey) await this.clearAll();
    scopeKey = scope;
    dbName = DB_PREFIX + scope.replace(/[^A-Za-z0-9_-]/g, '_');
    const work = (async () => {
      removeLegacyLocalStorage();
      try {
        if (typeof indexedDB !== 'undefined' && (indexedDB as any).databases) {
          const dbs = await (indexedDB as any).databases();
          (dbs || []).forEach((d: any) => {
            if (d?.name && (String(d.name).startsWith('f5-chat-cache-v1-') || String(d.name).startsWith('f5-chat-cache-v2-'))) {
              try { indexedDB.deleteDatabase(d.name); } catch {}
            }
          });
        }
      } catch {}
      db = await openDb(dbName);
      if (!db) return;
      const rows = await readAll(db);
      rows.forEach(r => { if (r?.leadId && Array.isArray(r.acts)) mem.set(r.leadId, r); });
    })();
    // Nunca prende a carga da tela: se o IndexedDB nao responder em 2,5 s, segue sem cache
    initPromise = Promise.race([work, new Promise<void>(resolve => setTimeout(resolve, 2500))]);
    return initPromise;
  },

  /** Leitura síncrona a partir da memória (nunca bloqueia). */
  get(leadId: string): LeadActivity[] {
    const e = mem.get(leadId);
    if (!e) return [];
    e.touched = Date.now();
    return e.acts;
  },

  has(leadId: string): boolean { return mem.has(leadId); },

  /** Quando a conversa foi sincronizada pela última vez com o banco (ms); 0 se não está no cache. */
  syncedAt(leadId: string): number { return mem.get(leadId)?.syncedAt || 0; },

  /** Guarda/atualiza uma conversa (últimas 120 mensagens) e marca como sincronizada agora (ou em `syncedAt`). */
  save(leadId: string, acts: LeadActivity[], syncedAt: number = Date.now()): void {
    if (!enabled || !leadId) return;
    const trimmed = (acts || []).slice(-MAX_PER_LEAD).map(slim);
    mem.set(leadId, { leadId, acts: trimmed, syncedAt, touched: Date.now() });
    dirty.add(leadId);
    evictIfNeeded();
    scheduleFlush();
  },

  /** Remove do cache conversas que não existem mais no banco (lead apagado). */
  prune(validLeadIds: Set<string>): void {
    if (!enabled) return;
    let changed = false;
    for (const id of Array.from(mem.keys())) {
      if (!validLeadIds.has(id)) { mem.delete(id); dirty.add(id); changed = true; }
    }
    if (changed) scheduleFlush();
  },

  /** Grava já (ex.: ao fechar/ocultar a aba). */
  flush(): void { void flushNow(); },

  /** Apaga tudo (logout, troca de usuário, chave desligada). */
  async clearAll(): Promise<void> {
    mem.clear();
    dirty.clear();
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    try { db?.close(); } catch { /* noop */ }
    db = null;
    initPromise = null;
    const names = new Set<string>();
    if (dbName) names.add(dbName);
    try {
      const list = await (indexedDB as any)?.databases?.();
      (list || []).forEach((d: any) => { if (d?.name && String(d.name).startsWith(DB_PREFIX)) names.add(d.name); });
    } catch { /* navegador sem indexedDB.databases() */ }
    await Promise.all(Array.from(names).map(n => new Promise<void>(resolve => {
      try {
        const req = indexedDB.deleteDatabase(n);
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      } catch { resolve(); }
    })));
    scopeKey = '';
    dbName = '';
    removeLegacyLocalStorage();
  },
};
