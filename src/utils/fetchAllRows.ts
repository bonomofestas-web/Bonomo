/**
 * O Supabase/PostgREST devolve no máximo 1.000 linhas por consulta, sem avisar. Para listas que precisam trazer
 * TODOS os registros do banco, pagina até acabar. `build` recebe o intervalo e devolve a consulta já ordenada
 * (ordene por uma coluna única no final, ex.: id, para a paginação não repetir nem pular linhas).
 */
export async function fetchAllRows<T = any>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) return { data: all, error };
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return { data: all, error: null };
}
