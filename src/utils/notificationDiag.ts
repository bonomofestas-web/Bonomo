import { useSyncExternalStore } from 'react';

// Registro em memoria (ultimas 30 etapas) para saber exatamente onde uma notificacao parou.
// Nao persiste nada e nao envia dados para fora.

export interface NotifDiagEntry {
  at: string;       // ISO
  stage: string;    // ex: canal, gerar, gravar, exibir, teste
  detail: string;
  ok: boolean;
}

interface Snapshot { entries: NotifDiagEntry[]; channelStatus: string }

let snapshot: Snapshot = { entries: [], channelStatus: 'não iniciado' };
const listeners = new Set<() => void>();
const publish = (next: Snapshot) => { snapshot = next; listeners.forEach(l => l()); };

export const logNotif = (stage: string, detail: string, ok = true) => {
  const entry: NotifDiagEntry = { at: new Date().toISOString(), stage, detail, ok };
  publish({ ...snapshot, entries: [entry, ...snapshot.entries].slice(0, 30) });
  if (!ok) console.warn(`[notifications] ${stage}: ${detail}`);
};

export const setNotifChannelStatus = (status: string) => {
  if (status === snapshot.channelStatus) return;
  publish({ ...snapshot, channelStatus: status });
};

export const useNotifDiag = (): Snapshot =>
  useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => snapshot,
  );
