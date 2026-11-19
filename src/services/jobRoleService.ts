import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { customRoleId, slugifyRole, type CustomJobRole, type JobSector } from '../utils/jobRoles';

export type JobRoleResult = { ok: true; role: CustomJobRole } | { ok: false; reason: 'invalid' | 'exists' | 'forbidden' | 'missing_table' | 'error' };

const COLUMNS = 'id, sector, name, slug';

const failure = (error: { code?: string; message?: string }): 'exists' | 'forbidden' | 'missing_table' | 'error' => {
  if (error.code === '23505') return 'exists';
  if (error.code === '42501' || /row-level security/i.test(error.message || '')) return 'forbidden';
  if (error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(error.message || '')) return 'missing_table';
  return 'error';
};

/** Cargos personalizados ("Outro") por setor, isolados por Master. */
export const jobRoleService = {
  async list(masterId: string): Promise<CustomJobRole[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    const { data, error } = await supabase.from('job_roles').select(COLUMNS).eq('master_id', masterId).order('name');
    if (error) {
      console.error('[jobRoleService.list]', error.message);
      return [];
    }
    return (data || []).map(r => ({ id: customRoleId(r.sector as JobSector, r.slug as string), sector: r.sector as JobSector, name: r.name as string, slug: r.slug as string }));
  },

  /** Cria o cargo digitado. Repetido no mesmo setor devolve o ja existente (sem erro para quem digitou de novo). */
  async create(masterId: string, sector: JobSector, rawName: string, actor?: { id?: string; name?: string }): Promise<JobRoleResult> {
    const name = rawName.trim().replace(/\s+/g, ' ');
    const slug = slugifyRole(name);
    if (!isSupabaseConfigured || !masterId) return { ok: false, reason: 'error' };
    if (name.length < 2 || name.length > 60 || !slug) return { ok: false, reason: 'invalid' };
    const { error } = await supabase.from('job_roles').insert({
      master_id: masterId, sector, name, slug, created_by_id: actor?.id || null, created_by_name: actor?.name || null,
    });
    if (error) {
      const reason = failure(error);
      if (reason !== 'exists') {
        console.error('[jobRoleService.create]', error.message);
        return { ok: false, reason };
      }
    }
    return { ok: true, role: { id: customRoleId(sector, slug), sector, name, slug } };
  },

  /** Nomes de exibicao dos cargos (role_id -> nome). */
  async listLabels(masterId: string): Promise<Record<string, string>> {
    if (!isSupabaseConfigured || !masterId) return {};
    const { data, error } = await supabase.from('job_role_labels').select('role_id, display_name').eq('master_id', masterId);
    if (error) {
      console.error('[jobRoleService.listLabels]', error.message);
      return {};
    }
    const out: Record<string, string> = {};
    (data || []).forEach(r => { out[r.role_id as string] = r.display_name as string; });
    return out;
  },

  /** Define (ou, com nome vazio, remove) o nome de exibicao de um cargo. */
  async setLabel(masterId: string, roleId: string, displayName: string): Promise<'ok' | 'invalid' | 'forbidden' | 'missing_table' | 'error'> {
    if (!isSupabaseConfigured || !masterId) return 'error';
    const name = displayName.trim().replace(/\s+/g, ' ');
    if (!name) {
      const { error } = await supabase.from('job_role_labels').delete().eq('master_id', masterId).eq('role_id', roleId);
      return error ? failure(error) as 'forbidden' | 'missing_table' | 'error' : 'ok';
    }
    if (name.length < 2 || name.length > 60) return 'invalid';
    const { error } = await supabase.from('job_role_labels').upsert(
      { master_id: masterId, role_id: roleId, display_name: name, updated_at: new Date().toISOString() },
      { onConflict: 'master_id,role_id' },
    );
    if (error) {
      console.error('[jobRoleService.setLabel]', error.message);
      return failure(error) as 'forbidden' | 'missing_table' | 'error';
    }
    return 'ok';
  },

  /** Ordem hierarquica dos cargos (role_id -> posicao). */
  async listOrder(masterId: string): Promise<Record<string, number>> {
    if (!isSupabaseConfigured || !masterId) return {};
    const { data, error } = await supabase.from('job_role_order').select('role_id, position').eq('master_id', masterId);
    if (error) { console.warn('[jobRoleService.listOrder]', error.message); return {}; }
    const out: Record<string, number> = {};
    (data || []).forEach(r => { out[r.role_id as string] = Number(r.position); });
    return out;
  },

  /** Grava a ordem de TODOS os cargos de um setor (posicoes 0..n-1). */
  async saveOrder(masterId: string, sector: JobSector, orderedIds: string[]): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId || orderedIds.length === 0) return false;
    const now = new Date().toISOString();
    const { error } = await supabase.from('job_role_order').upsert(
      orderedIds.map((role_id, position) => ({ master_id: masterId, sector, role_id, position, updated_at: now })),
      { onConflict: 'master_id,role_id' },
    );
    if (error) { console.error('[jobRoleService.saveOrder]', error.message); return false; }
    return true;
  },

  async remove(masterId: string, sector: JobSector, slug: string): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId) return false;
    const { error } = await supabase.from('job_roles').delete().eq('master_id', masterId).eq('sector', sector).eq('slug', slug);
    if (error) console.error('[jobRoleService.remove]', error.message);
    return !error;
  },
};
