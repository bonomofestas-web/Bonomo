// Rotulos em portugues para papeis de contato e tipos de evento (os valores gravados no banco podem vir em ingles ou cru).

const norm = (v?: string | null): string =>
  (v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\s-]+/g, ' ').trim();

/** father/mother/guardian/self/other (e variantes em portugues) -> rotulo PT-BR. */
export function relationshipLabel(role?: string | null, fallback = 'Responsável'): string {
  switch (norm(role)) {
    case 'father': case 'pai': return 'Pai';
    case 'mother': case 'mae': return 'Mãe';
    case 'guardian': case 'responsavel': case 'responsible': return 'Responsável';
    case 'self': case 'proprio': return 'Próprio';
    case 'copayer': case 'copagante': return 'Copagante';
    case 'dependent': case 'dependente': return 'Dependente';
    case 'payer': case 'contractor': case 'contratante': case 'pagante': return 'Contratante';
    case 'other': case 'outro': return 'Contato';
    case '': return fallback;
    default: return role as string;
  }
}

export type EventKind = 'debutante' | 'casamento' | 'aniversario';

export interface EventTypeLabels {
  kind: EventKind;
  tag: string;          // chip do tipo de evento
  personLabel: string;  // rotulo do campo do(a) homenageado(a)
  personPlaceholder: string;
  personTitle: string;
}

/** Tipo de evento (ex: '15 Anos', '15_anos', 'Casamento') -> rotulos. Sem tipo informado, assume Debutante (produto principal). */
export function eventTypeLabels(eventType?: string | null): EventTypeLabels {
  const n = norm(eventType);
  if (n.includes('casamento') || n.includes('noiv')) {
    return { kind: 'casamento', tag: 'Casamento', personLabel: 'Noivos:', personPlaceholder: 'Nome dos noivos...', personTitle: 'Clique para editar o nome dos noivos' };
  }
  if (n.includes('infantil') || n.includes('aniversario') || n.includes('bday') || n.includes('birthday')) {
    return { kind: 'aniversario', tag: 'Aniversário', personLabel: 'Aniversariante:', personPlaceholder: 'Nome do(a) aniversariante...', personTitle: 'Clique para editar o nome do(a) aniversariante' };
  }
  return { kind: 'debutante', tag: 'Debutante', personLabel: 'Debutante:', personPlaceholder: 'Nome da debutante...', personTitle: 'Clique para editar o nome da debutante' };
}
