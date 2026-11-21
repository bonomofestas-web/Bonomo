import { useSyncExternalStore } from 'react';

/**
 * Busca da barra do topo aplicada A TELA ABERTA. Enquanto a pessoa digita (e depois do Enter, quando o texto vira uma tag
 * com configuracao), cada tela le este estado e filtra a si mesma: Contatos, Contratos, listas, Kanban e Mensagens.
 */
export interface ScreenSearchState {
  /** Texto efetivo (tag confirmada + o que esta sendo digitado) */
  query: string;
  /** Unidade escolhida na configuracao da tag ('all' = todas) */
  venueId: string;
  collaboratorId: string;
  tag: string;
}

const EMPTY: ScreenSearchState = { query: '', venueId: 'all', collaboratorId: 'all', tag: 'all' };
let state: ScreenSearchState = EMPTY;
const listeners = new Set<() => void>();

export const getScreenSearch = (): ScreenSearchState => state;

export const setScreenSearch = (patch: Partial<ScreenSearchState>) => {
  const next = { ...state, ...patch };
  if (next.query === state.query && next.venueId === state.venueId && next.collaboratorId === state.collaboratorId && next.tag === state.tag) return;
  state = next;
  listeners.forEach(l => l());
};

export const clearScreenSearch = () => setScreenSearch(EMPTY);

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Estado atual da busca do topo; a tela re-renderiza a cada mudanca. */
export const useScreenSearch = (): ScreenSearchState => useSyncExternalStore(subscribe, getScreenSearch, getScreenSearch);

/** Texto util para filtrar (ignora 1 caractere so). */
export const screenQueryTerm = (s: ScreenSearchState): string => (s.query.trim().length >= 2 ? s.query.trim() : '');
