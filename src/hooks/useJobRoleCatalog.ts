import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { jobRoleService } from '../services/jobRoleService';
import { jobRoleLabel, type CustomJobRole, type JobRoleAliases } from '../utils/jobRoles';
import type { Collaborator } from '../types/admin';

/**
 * Catalogo de cargos do Master (personalizados + nomes de exibicao), compartilhado entre as telas.
 * Uma leitura por Master (tabelas minusculas) e recarga so quando a configuracao de cargos muda.
 */
interface State { masterId: string; custom: CustomJobRole[]; aliases: JobRoleAliases; loaded: boolean }
let state: State = { masterId: '', custom: [], aliases: {}, loaded: false };
let loading: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

const load = async (masterId: string, force = false) => {
  if (!masterId || loading === masterId) return;
  if (!force && state.loaded && state.masterId === masterId) return;
  loading = masterId;
  try {
    const [custom, aliases] = await Promise.all([jobRoleService.list(masterId), jobRoleService.listLabels(masterId)]);
    state = { masterId, custom, aliases, loaded: true };
    emit();
  } finally {
    loading = null;
  }
};

export const useJobRoleCatalog = (masterId?: string) => {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => { if (masterId) void load(masterId); }, [masterId]);
  const reload = useCallback(() => (masterId ? load(masterId, true) : Promise.resolve()), [masterId]);
  const label = useCallback((id: string) => jobRoleLabel(id, snap.custom, snap.aliases), [snap]);
  /** Titulo mostrado da pessoa: primeiro cargo com o nome de exibicao; sem cargo, cai no titulo antigo. */
  const titleOf = useCallback((c: Pick<Collaborator, 'jobRoles' | 'customJobTitle'>): string => {
    const first = (c.jobRoles || [])[0];
    if (first) return jobRoleLabel(first, snap.custom, snap.aliases);
    return (c.customJobTitle || '').trim();
  }, [snap]);
  return { custom: snap.custom, aliases: snap.aliases, label, titleOf, reload };
};
