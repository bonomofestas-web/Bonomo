import { normalizeEventKind, type EventKind } from './contractTitle';

/**
 * Pessoas do evento por tipo (mapa unico). Cada vaga vira um contato do card com o papel indicado
 * (role do LeadContact); o WhatsApp de cada pessoa pode ser vinculado e vira aba de conversa.
 */
export interface EventPersonSlot {
  /** role gravado em LeadContact.role */
  role: string;
  label: string;
  placeholder: string;
  /** vaga opcional (ex.: segundo noivo quando o contratante ja e um deles) */
  optional?: boolean;
}

export interface EventPeopleConfig {
  heading: string;
  slots: EventPersonSlot[];
}

const CONFIG: Record<EventKind, EventPeopleConfig> = {
  quinze_anos: {
    heading: 'Debutante',
    slots: [{ role: 'debutante', label: 'Debutante', placeholder: 'Nome da debutante' }],
  },
  casamento: {
    heading: 'Noivos',
    slots: [
      { role: 'noivo', label: 'Noiva / Noivo', placeholder: 'Nome do(a) noivo(a)' },
      { role: 'noivo', label: 'Noiva / Noivo', placeholder: 'Nome do(a) segundo(a) noivo(a)', optional: true },
    ],
  },
  infantil: {
    heading: 'Aniversariante',
    slots: [{ role: 'aniversariante', label: 'Criança', placeholder: 'Nome da criança' }],
  },
  corporativo: {
    heading: 'Empresa responsável',
    slots: [{ role: 'empresa', label: 'Empresa', placeholder: 'Nome da empresa' }],
  },
  outro: {
    heading: 'Homenageado',
    slots: [{ role: 'aniversariante', label: 'Homenageado', placeholder: 'Nome do homenageado' }],
  },
};

export const eventPeopleConfig = (eventType?: string | null): EventPeopleConfig => CONFIG[normalizeEventKind(eventType)];
