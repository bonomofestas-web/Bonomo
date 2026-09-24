import type { Lead } from '../types/admin';

/**
 * Utilitário Centralizado de Ordenação e Cálculo de Tempo de Espera de Leads
 */

/**
 * Calcula o tempo de espera pendente (em milissegundos) que o cliente está aguardando resposta da equipe:
 * - Retorna -1 se não houver mensagens ou se a última mensagem foi enviada pela equipe/atendente (já respondido).
 * - Retorna -1 se a última mensagem foi enviada por automação / bot.
 * - Retorna > 0 (Date.now() - timestamp) se e somente se o lead tem mensagem do cliente pendente de resposta.
 */
export function getLeadPendingWaitingTime(lead: Lead, collaboratorIdSet?: Set<string>): number {
  const acts = lead.activities || [];
  if (acts.length === 0) return -1;

  // Filtra apenas atividades de mensagens reais no WhatsApp (exclui notas internas 'note' e eventos de sistema)
  const chatActivities = acts.filter(act => {
    if (act.type === 'contact') {
      return Boolean(act.text?.trim() || act.mediaUrl || act.mediaType);
    }
    if (act.type === 'creation' && act.text?.trim()) {
      const titleLower = (act.title || '').toLowerCase();
      return titleLower.includes('whatsapp') || titleLower.includes('mensagem') || titleLower.includes('recebid');
    }
    return false;
  });

  if (chatActivities.length === 0) {
    return -1;
  }

  // Ordena as atividades cronologicamente por timestamp para pegar a última mensagem real
  const sortedChat = [...chatActivities].sort(
    (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );
  const lastMsg = sortedChat[sortedChat.length - 1];

  const authorId = (lastMsg.authorId || '').toLowerCase();
  const authorName = (lastMsg.authorName || '').toLowerCase();
  const title = (lastMsg.title || '').toLowerCase();
  const metadata = (lastMsg as any).metadata;

  // 1. Verificação se a última mensagem foi enviada pela EQUIPE / ATENDENTE ou se a conversa foi ENCERRADA:
  const isSessionEnd = 
    metadata?.isSessionEnd === true ||
    title.includes('conversa encerrada') ||
    title.includes('atendimento finalizado') ||
    title.includes('sessão encerrada');

  const isFromTeam = 
    isSessionEnd ||
    title.includes('enviad') ||
    title.includes('outbound') ||
    authorId === 'whatsapp_mobile' ||
    metadata?.fromMe === true ||
    (collaboratorIdSet && lastMsg.authorId && collaboratorIdSet.has(lastMsg.authorId)) ||
    authorName.includes('equipe') ||
    authorName.includes('comercial') ||
    authorName.includes('gestor') ||
    authorName.includes('atendente') ||
    authorName.includes('closer') ||
    authorName.includes('sdr');

  if (isFromTeam) {
    return -1;
  }

  // 2. Verificação se foi automação / bot da plataforma:
  const isBot = 
    authorId === 'system_bot' ||
    authorName.includes('bot') ||
    authorName.includes('robô') ||
    authorName.includes('roleta') ||
    authorName.includes('automação') ||
    authorName.includes('sistema');

  if (isBot) {
    return -1;
  }

  // 3. Verificação de mensagem recebida do CLIENTE / LEAD:
  const isFromClient = 
    authorId === 'lead' ||
    metadata?.fromMe === false ||
    title.includes('recebid') ||
    title.includes('inbound') ||
    authorName.includes('lead') ||
    authorName.includes('cliente') ||
    (!isFromTeam && !isBot);

  if (isFromClient) {
    const msgTime = new Date(lastMsg.timestamp || 0).getTime();
    if (msgTime > 0) {
      return Math.max(1, Date.now() - msgTime);
    }
    return 1;
  }

  return -1;
}

/**
 * Retorna o timestamp da última atividade/mensagem relevante do lead
 */
export function getLastLeadMessageTime(l: Lead): number {
  const contactActs = (l.activities || []).filter(a => a.type === 'contact' || a.type === 'note');
  if (contactActs.length > 0) {
    return new Date(contactActs[contactActs.length - 1].timestamp || 0).getTime();
  }
  return new Date(l.updatedAt || l.createdAt || 0).getTime();
}

/**
 * Função Universal de Ordenação de Leads para CRM, Funil Kanban, Inbox e Lista
 */
export function sortLeadsByCriteria(
  leads: Lead[],
  sortBy: string = 'waiting_time',
  collaboratorIdSet?: Set<string>
): Lead[] {
  return [...leads].sort((a, b) => {
    // 1. Padrão Absoluto: Tempo de Espera (Prioridade Máxima)
    if (sortBy === 'waiting_time' || !sortBy) {
      const waitA = getLeadPendingWaitingTime(a, collaboratorIdSet);
      const waitB = getLeadPendingWaitingTime(b, collaboratorIdSet);

      const hasPendingA = waitA > 0;
      const hasPendingB = waitB > 0;

      // Leads com mensagem pendente do cliente ficam no topo absoluto (quem espera há mais tempo primeiro)
      if (hasPendingA && hasPendingB) {
        return waitB - waitA;
      }
      if (hasPendingA && !hasPendingB) return -1;
      if (!hasPendingA && hasPendingB) return 1;

      // Leads SEM pendência: ordenados pela mensagem/atividade mais recente
      return getLastLeadMessageTime(b) - getLastLeadMessageTime(a);
    }

    if (sortBy === 'recent') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    if (sortBy === 'message_recent') {
      return getLastLeadMessageTime(b) - getLastLeadMessageTime(a);
    }
    if (sortBy === 'message_oldest') {
      return getLastLeadMessageTime(a) - getLastLeadMessageTime(b);
    }
    if (sortBy === 'name_asc' || sortBy === 'alphabetical') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'name_desc') {
      return (b.name || '').localeCompare(a.name || '');
    }
    if (sortBy === 'highest_value') {
      return (b.dealValue || 0) - (a.dealValue || 0);
    }
    if (sortBy === 'party_date') {
      const timeA = (a.partyDate || a.eventDate) ? new Date((a.partyDate || a.eventDate) + 'T12:00:00').getTime() : 9999999999999;
      const timeB = (b.partyDate || b.eventDate) ? new Date((b.partyDate || b.eventDate) + 'T12:00:00').getTime() : 9999999999999;
      return timeA - timeB;
    }

    // Fallback para mais recente
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

/**
 * Formata milissegundos em tempo de espera amigável (ex: '8m', '1h 15m', '2d 4h')
 */
export function formatWaitTime(ms: number): string {
  if (ms <= 0) return '';
  const mins = Math.floor(ms / (1000 * 60));
  if (mins < 1) return '< 1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) {
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export interface WaitTimeSla {
  level: 'none' | 'recent' | 'yellow' | 'orange' | 'red';
  label: string;
  formattedTime: string;
  color: string;
  bg: string;
  border: string;
  cardBg: string;
  cardBorder: string;
}

/**
 * Retorna as propriedades visuais de SLA (Amarelo > 10m, Laranja > 1h, Vermelho > 2h)
 */
export function getLeadWaitTimeSla(pendingWaitMs: number): WaitTimeSla {
  if (pendingWaitMs <= 0) {
    return {
      level: 'none',
      label: 'Respondido',
      formattedTime: '',
      color: '#64748B',
      bg: 'rgba(100, 116, 139, 0.08)',
      border: 'rgba(100, 116, 139, 0.20)',
      cardBg: 'transparent',
      cardBorder: 'transparent',
    };
  }

  const formattedTime = formatWaitTime(pendingWaitMs);
  const tenMinutesMs = 10 * 60 * 1000;
  const oneHourMs = 60 * 60 * 1000;
  const twoHoursMs = 120 * 60 * 1000;

  // Nível 3: Vermelho (Crítico / Atraso grave > 2 horas)
  if (pendingWaitMs >= twoHoursMs) {
    return {
      level: 'red',
      label: 'Espera Crítica (> 2h)',
      formattedTime,
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.14)',
      border: 'rgba(239, 68, 68, 0.40)',
      cardBg: 'rgba(239, 68, 68, 0.06)',
      cardBorder: 'rgba(239, 68, 68, 0.50)',
    };
  }

  // Nível 2: Laranja (Alerta moderado > 1 hora)
  if (pendingWaitMs >= oneHourMs) {
    return {
      level: 'orange',
      label: 'Alerta de Espera (> 1h)',
      formattedTime,
      color: '#F97316',
      bg: 'rgba(249, 115, 22, 0.12)',
      border: 'rgba(249, 115, 22, 0.38)',
      cardBg: 'rgba(249, 115, 22, 0.05)',
      cardBorder: 'rgba(249, 115, 22, 0.45)',
    };
  }

  // Nível 1: Amarelo (Atenção > 10 minutos)
  if (pendingWaitMs >= tenMinutesMs) {
    return {
      level: 'yellow',
      label: 'Aguardando (> 10m)',
      formattedTime,
      color: '#EAB308',
      bg: 'rgba(234, 179, 8, 0.12)',
      border: 'rgba(234, 179, 8, 0.35)',
      cardBg: 'rgba(234, 179, 8, 0.04)',
      cardBorder: 'rgba(234, 179, 8, 0.40)',
    };
  }

  // Nível 0: Recente (< 10 minutos)
  return {
    level: 'recent',
    label: 'Aguardando (< 10m)',
    formattedTime,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.10)',
    border: 'rgba(16, 185, 129, 0.28)',
    cardBg: 'transparent',
    cardBorder: 'transparent',
  };
}

export interface LeadResponseMetrics {
  averageResponseTimeMs: number;
  averageResponseTimeMinutes: number;
  responseCount: number;
  lastResponseTimeMs: number;
  lastResponseTimeMinutes: number;
}

/**
 * Calcula os tempos de resposta históricos de um lead,
 * considerando cada resposta do atendente ou encerramento de conversa como resolução de ciclo.
 */
export function calculateLeadResponseMetrics(lead: Lead, collaboratorIdSet?: Set<string>): LeadResponseMetrics {
  const acts = (lead.activities || []).filter(act => {
    if (act.type === 'contact') return Boolean(act.text?.trim() || act.mediaUrl || act.mediaType || (act as any).metadata?.isSessionEnd);
    if (act.type === 'creation' && act.text?.trim()) {
      const titleLower = (act.title || '').toLowerCase();
      return titleLower.includes('whatsapp') || titleLower.includes('mensagem') || titleLower.includes('recebid');
    }
    return false;
  }).sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

  if (acts.length < 2) {
    return {
      averageResponseTimeMs: 0,
      averageResponseTimeMinutes: 0,
      responseCount: 0,
      lastResponseTimeMs: 0,
      lastResponseTimeMinutes: 0,
    };
  }

  const responseDurationsMs: number[] = [];
  let pendingClientMsgTime: number | null = null;

  for (const act of acts) {
    const authorId = (act.authorId || '').toLowerCase();
    const authorName = (act.authorName || '').toLowerCase();
    const title = (act.title || '').toLowerCase();
    const metadata = (act as any).metadata;
    const isBot = authorId === 'system_bot' || authorName.includes('bot') || authorName.includes('robô') || authorName.includes('sistema');
    if (isBot) continue;

    const isFromTeam = 
      metadata?.isSessionEnd === true ||
      title.includes('conversa encerrada') ||
      title.includes('atendimento finalizado') ||
      title.includes('sessão encerrada') ||
      title.includes('enviad') ||
      title.includes('outbound') ||
      authorId === 'whatsapp_mobile' ||
      metadata?.fromMe === true ||
      (collaboratorIdSet && act.authorId && collaboratorIdSet.has(act.authorId)) ||
      authorName.includes('equipe') ||
      authorName.includes('comercial') ||
      authorName.includes('gestor') ||
      authorName.includes('atendente') ||
      authorName.includes('closer') ||
      authorName.includes('sdr');

    const msgTime = new Date(act.timestamp || 0).getTime();
    if (!msgTime) continue;

    if (!isFromTeam) {
      if (pendingClientMsgTime === null) {
        pendingClientMsgTime = msgTime;
      }
    } else {
      if (pendingClientMsgTime !== null) {
        const diff = Math.max(0, msgTime - pendingClientMsgTime);
        responseDurationsMs.push(diff);
        pendingClientMsgTime = null;
      }
    }
  }

  if (responseDurationsMs.length === 0) {
    return {
      averageResponseTimeMs: 0,
      averageResponseTimeMinutes: 0,
      responseCount: 0,
      lastResponseTimeMs: 0,
      lastResponseTimeMinutes: 0,
    };
  }

  const sum = responseDurationsMs.reduce((acc, val) => acc + val, 0);
  const avg = Math.round(sum / responseDurationsMs.length);
  const last = responseDurationsMs[responseDurationsMs.length - 1];

  return {
    averageResponseTimeMs: avg,
    averageResponseTimeMinutes: Math.round(avg / 60000),
    responseCount: responseDurationsMs.length,
    lastResponseTimeMs: last,
    lastResponseTimeMinutes: Math.round(last / 60000),
  };
}

/**
 * Calcula o Tempo Médio de Atendimento (TMA) da equipe ou de uma lista de leads.
 */
export function calculateTeamAverageResponseTimeMinutes(leads: Lead[], collaboratorIdSet?: Set<string>): number {
  const allDurations: number[] = [];
  for (const lead of leads) {
    const metrics = calculateLeadResponseMetrics(lead, collaboratorIdSet);
    if (metrics.responseCount > 0) {
      allDurations.push(metrics.averageResponseTimeMs);
    }
  }
  if (allDurations.length === 0) return 0;
  const total = allDurations.reduce((a, b) => a + b, 0);
  return Math.round((total / allDurations.length) / 60000);
}


