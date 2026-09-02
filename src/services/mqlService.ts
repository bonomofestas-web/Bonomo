import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MqlQuestion, Venue } from '../types/admin';

export const createDefaultMqlQuestionsForVenue = (venueId: string): MqlQuestion[] => [
  {
    id: `mql_q1_${venueId}`,
    venueId,
    title: 'Data Prevista & Urgência da Festa',
    description: 'Avalia a maturidade de decisão em relação à data da celebração.',
    weight: 1,
    order: 0,
    options: [
      { id: 'mql_q1_opt1', label: 'Data Fixa Definida (Próximos 3 a 12 meses)', points: 100 },
      { id: 'mql_q1_opt2', label: 'Mês ou Semestre Previsto (Planejamento Ativo)', points: 75 },
      { id: 'mql_q1_opt3', label: 'Data Aberta / Apenas Pesquisando Valores', points: 30 },
      { id: 'mql_q1_opt4', label: 'Sem data definida / Indeciso', points: 0 },
    ],
  },
  {
    id: `mql_q2_${venueId}`,
    venueId,
    title: 'Estimativa de Convidados',
    description: 'Capacidade e alinhamento com a estrutura da casa de festas.',
    weight: 1,
    order: 1,
    options: [
      { id: 'mql_q2_opt1', label: '150 a 250+ Convidados (Porte Ideal / Grande)', points: 100 },
      { id: 'mql_q2_opt2', label: '100 a 150 Convidados (Porte Padrão)', points: 80 },
      { id: 'mql_q2_opt3', label: '50 a 100 Convidados (Mini Evento)', points: 50 },
      { id: 'mql_q2_opt4', label: 'Abaixo de 50 Convidados', points: 20 },
    ],
  },
  {
    id: `mql_q3_${venueId}`,
    venueId,
    title: 'Alinhamento Orçamentário / Pacote',
    description: 'Verifica a expectativa de investimento do cliente.',
    weight: 1,
    order: 2,
    options: [
      { id: 'mql_q3_opt1', label: 'Pacote Completo VIP / Luxo (Decisão Imediata)', points: 100 },
      { id: 'mql_q3_opt2', label: 'Pacote Intermediário com Adicionais', points: 80 },
      { id: 'mql_q3_opt3', label: 'Pacote Essencial / Orçamento Justo', points: 50 },
      { id: 'mql_q3_opt4', label: 'Buscando Menor Preço / Fora do Perfil', points: 0 },
    ],
  },
  {
    id: `mql_q4_${venueId}`,
    venueId,
    title: 'Poder de Decisão & Presença',
    description: 'Identifica se os responsáveis financeiros estão participando.',
    weight: 1,
    order: 3,
    options: [
      { id: 'mql_q4_opt1', label: 'Pais / Pagantes presentes no atendimento', points: 100 },
      { id: 'mql_q4_opt2', label: 'Aniversariante com apoio financeiro confirmado', points: 80 },
      { id: 'mql_q4_opt3', label: 'Terceiro / Assessoria consultando preliminarmente', points: 40 },
      { id: 'mql_q4_opt4', label: 'Apenas curioso / Sem decisor envolvido', points: 0 },
    ],
  },
];

export const mqlService = {
  async getAll(): Promise<MqlQuestion[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('mql_questions')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Erro ao buscar perguntas de MQL do Supabase:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        venueId: row.venue_id || 'all',
        title: row.title,
        description: row.description || '',
        weight: row.weight ?? 1,
        order: row.order_index ?? 0,
        options: Array.isArray(row.options) ? row.options : [],
      }));
    } catch (err) {
      console.error('Falha em mqlService.getAll:', err);
      return [];
    }
  },

  async upsert(question: MqlQuestion): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const isUuidVenue = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(question.venueId);

      const payload = {
        id: question.id,
        venue_id: isUuidVenue ? question.venueId : null,
        title: question.title,
        description: question.description || null,
        weight: question.weight ?? 1,
        order_index: question.order ?? 0,
        options: question.options || [],
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('mql_questions')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar pergunta MQL no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em mqlService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('mql_questions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar pergunta MQL:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em mqlService.delete:', err);
      return false;
    }
  },

  async ensureDefaultQuestions(_venues: Venue[]): Promise<MqlQuestion[]> {
    return [];
  },
};
