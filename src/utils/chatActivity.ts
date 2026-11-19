/**
 * Classificacao das atividades de conversa (lead_activities) para medir tempo de resposta.
 * Mesmos criterios do selo de SLA (`getLeadPendingWaitingTime` em leadSorting.ts):
 * o titulo da atividade carrega a direcao ("recebida" = cliente, "enviada" = equipe)
 * e "Conversa Encerrada" classifica a ultima mensagem como respondida.
 */
export type ChatActivityKind = 'client' | 'team' | 'bot' | 'session_end' | 'ignore';

export interface ChatActivityLike {
  type?: string | null;
  title?: string | null;
  text?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  metadata?: Record<string, any> | null;
}

const BOT_WORDS = ['bot', 'robô', 'robo', 'roleta', 'automação', 'automacao', 'sistema'];

export const classifyChatActivity = (act: ChatActivityLike, collaboratorIds?: Set<string>): ChatActivityKind => {
  const type = (act.type || '').toLowerCase();
  const title = (act.title || '').toLowerCase();
  const text = (act.text || '').toLowerCase();
  const authorId = (act.authorId || '').toLowerCase();
  const authorName = (act.authorName || '').toLowerCase();
  const meta = act.metadata || {};

  // Visualizacao nunca conta como mensagem nem como resposta
  if (type === 'view' || title.includes('visualizou') || title.includes('visualizada') || text.includes('visualizou esta mensagem') || meta.isViewAudit === true) {
    return 'ignore';
  }

  // "Encerrar conversa": marca a ultima mensagem do cliente como respondida
  if (meta.isSessionEnd === true || title.includes('conversa encerrada') || title.includes('atendimento finalizado') || title.includes('sessão encerrada')) {
    return 'session_end';
  }

  const isChatType = type === 'contact' || type === 'whatsapp';
  const isCapture = type === 'creation' && (title.includes('captado via whatsapp') || title.includes('recebid'));
  if (!isChatType && !isCapture) return 'ignore';

  if (isCapture) return 'client'; // lead que chegou pelo WhatsApp: primeira mensagem do cliente

  if (meta.fromMe === true || title.includes('enviad') || title.includes('outbound') || authorId === 'whatsapp_mobile') {
    return authorId === 'system_bot' || BOT_WORDS.some(w => authorName.includes(w)) ? 'bot' : 'team';
  }
  if (meta.fromMe === false || title.includes('recebid') || title.includes('inbound') || authorId === 'lead') return 'client';

  if (authorId === 'system_bot' || BOT_WORDS.some(w => authorName.includes(w))) return 'bot';
  if (collaboratorIds && authorId && collaboratorIds.has(authorId)) return 'team';
  return authorName.includes('lead') || authorName.includes('cliente') ? 'client' : 'ignore';
};
