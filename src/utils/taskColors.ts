import React from 'react';
import { Phone, Calendar, Utensils, Users, RotateCw } from 'lucide-react';

export type TaskCategoryType = 'followup' | 'visit' | 'tasting' | 'appointment' | 'general';

export interface TaskTypeTheme {
  category: TaskCategoryType;
  primaryColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  label: string;
}

export function getTaskTypeTheme(task: { type?: string; customType?: string; title?: string }): TaskTypeTheme {
  const customStr = (task.customType || '').toLowerCase();
  const typeStr = (task.type || '').toLowerCase();
  const titleStr = (task.title || '').toLowerCase();
  const combined = `${customStr} ${typeStr} ${titleStr}`;

  // 1. Degustação
  if (combined.includes('degust') || combined.includes('jantar') || combined.includes('tasting')) {
    return {
      category: 'tasting',
      primaryColor: '#D97706',
      badgeBg: '#FEF3C7',
      badgeBorder: '#FDE68A',
      badgeText: '#B45309',
      label: task.customType || 'Degustação',
    };
  }

  // 2. Compromisso do Pós-Venda / Debutante (inclui Visita Técnica, Maquiagem, Decoração, Reunião, Ensaio, Cerimonial, etc)
  if (
    combined.includes('visita técnica') || 
    combined.includes('maquiagem') || 
    combined.includes('decora') || 
    combined.includes('ensaio') || 
    combined.includes('cerimonial') || 
    combined.includes('vestido') || 
    combined.includes('foto') || 
    combined.includes('reuni') || 
    combined.includes('compromisso') || 
    combined.includes('alinhamento') || 
    typeStr === 'meeting' || 
    typeStr === 'appointment'
  ) {
    return {
      category: 'appointment',
      primaryColor: '#7C3AED',
      badgeBg: '#EDE9FE',
      badgeBorder: '#DDD6FE',
      badgeText: '#6D28D9',
      label: task.customType || 'Compromisso',
    };
  }

  // 3. Visita Comercial / Pós-Venda padrão
  if (combined.includes('visita') || typeStr === 'visit') {
    return {
      category: 'visit',
      primaryColor: '#059669',
      badgeBg: '#ECFDF5',
      badgeBorder: '#A7F3D0',
      badgeText: '#047857',
      label: task.customType || 'Visita',
    };
  }

  // 4. Follow-up Comercial
  if (
    combined.includes('follow') || 
    combined.includes('lig') || 
    combined.includes('contato') || 
    combined.includes('whatsapp') || 
    combined.includes('proposta') || 
    combined.includes('orçamento') || 
    combined.includes('negocia') || 
    combined.includes('fechamento') || 
    typeStr === 'followup' || 
    typeStr === 'call'
  ) {
    return {
      category: 'followup',
      primaryColor: '#0284C7',
      badgeBg: '#E0F2FE',
      badgeBorder: '#BAE6FD',
      badgeText: '#0369A1',
      label: task.customType || 'Follow-up',
    };
  }

  // 5. Geral / Operacional
  return {
    category: 'general',
    primaryColor: '#475569',
    badgeBg: '#F1F5F9',
    badgeBorder: '#E2E8F0',
    badgeText: '#334155',
    label: task.customType || 'Geral / Operacional',
  };
}

export function renderTaskTypeIcon(category: TaskCategoryType, size = 13, colorOverride?: string): React.ReactElement {
  switch (category) {
    case 'visit':
      return React.createElement(Calendar, { size, color: colorOverride || '#059669' });
    case 'tasting':
      return React.createElement(Utensils, { size, color: colorOverride || '#D97706' });
    case 'followup':
      return React.createElement(Phone, { size, color: colorOverride || '#0284C7' });
    case 'appointment':
      return React.createElement(Users, { size, color: colorOverride || '#7C3AED' });
    default:
      return React.createElement(RotateCw, { size, color: colorOverride || '#475569' });
  }
}
