import type { Lead } from '../types/admin';

/**
 * Validação de ficha completa para envio de Lead para Ganho (Fechamento Comercial).
 * Regra: Ficha estritamente completa com informações prioritárias.
 * A ÚNICA exceção (NÃO obrigatória) é a Data do Evento / Festa, conforme diretriz do cliente.
 */
export function validateLeadForWon(lead: Lead): string[] {
  const missing: string[] = [];

  // 1. Pelo menos 1 Contato Vinculado (com Nome e Telefone/WhatsApp válido com pelo menos 8 dígitos)
  const validContacts = (lead.contacts || []).filter(c => c.name?.trim() && c.phone?.trim() && c.phone.replace(/\D/g, '').length >= 8);
  const mainPhoneClean = (lead.phone || '').replace(/\D/g, '');
  if (validContacts.length === 0 && mainPhoneClean.length < 8) {
    missing.push('Pelo menos 1 Contato Vinculado (com Nome e Telefone/WhatsApp)');
  }

  // 2. Tipo de Evento
  if (!lead.eventType?.trim()) {
    missing.push('Tipo do Evento');
  }

  // 3. Nome do(a) Aniversariante / Debutante
  const personName = (lead as any).birthdayPersonName?.trim() || lead.debutanteName?.trim() || lead.name?.trim();
  if (!personName) {
    missing.push('Nome do(a) Aniversariante / Debutante');
  }

  // 4. Data de Aniversário do(a) Aniversariante
  const birthDate = lead.debutanteBirthDate || lead.birthday;
  if (!birthDate) {
    missing.push('Data de Aniversário do(a) Aniversariante');
  }

  // 5. Quantidade Estimada de Convidados (> 0)
  if (!lead.estimatedGuests || lead.estimatedGuests <= 0) {
    missing.push('Quantidade Estimada de Convidados');
  }

  // 6. Período Desejado
  const hasPeriod = Boolean(lead.desiredPeriod?.trim() || lead.eventYear || lead.eventDate || lead.partyDate);
  if (!hasPeriod) {
    missing.push('Período Desejado');
  }

  // 7. Valor da Venda / Orçamento (> 0)
  const hasValue = (lead.dealValue && lead.dealValue > 0) || (lead.estimatedBudget && lead.estimatedBudget > 0);
  if (!hasValue) {
    missing.push('Valor da Venda / Orçamento');
  }

  // 8. Pacote Vendido / Interesse
  const hasPackage = Boolean(lead.packageSold?.trim() || lead.interestService?.trim());
  if (!hasPackage) {
    missing.push('Pacote de Interesse / Vendido');
  }

  // 9. Formato de Pagamento
  if (!lead.paymentMethod?.trim()) {
    missing.push('Formato de Pagamento');
  }

  // NOTA CRÍTICA: Data do Evento / Festa NÃO É OBRIGATÓRIA (definida posteriormente com o pós-venda)

  return missing;
}

/**
 * Retorna as chaves de campos que estão faltantes para destacar visualmente em vermelho na ficha.
 */
export function getMissingLeadFieldKeys(lead: Lead): Set<string> {
  const missing = new Set<string>();

  // 1. Contato / Telefone
  const validContacts = (lead.contacts || []).filter(c => c.name?.trim() && c.phone?.trim() && c.phone.replace(/\D/g, '').length >= 8);
  const mainPhoneClean = (lead.phone || '').replace(/\D/g, '');
  if (validContacts.length === 0 && mainPhoneClean.length < 8) {
    missing.add('phone');
    missing.add('contacts');
  }

  // 2. Tipo do Evento
  if (!lead.eventType?.trim()) {
    missing.add('eventType');
  }

  // 3. Nome do(a) Aniversariante
  const personName = (lead as any).birthdayPersonName?.trim() || lead.debutanteName?.trim() || lead.name?.trim();
  if (!personName) {
    missing.add('birthdayPersonName');
  }

  // 4. Data de Aniversário
  const birthDate = lead.debutanteBirthDate || lead.birthday;
  if (!birthDate) {
    missing.add('debutanteBirthDate');
    missing.add('birthday');
  }

  // 5. Convidados
  if (!lead.estimatedGuests || lead.estimatedGuests <= 0) {
    missing.add('estimatedGuests');
  }

  // 6. Período Desejado
  const hasPeriod = Boolean(lead.desiredPeriod?.trim() || lead.eventYear || lead.eventDate || lead.partyDate);
  if (!hasPeriod) {
    missing.add('desiredPeriod');
  }

  // 7. Valor da Venda / Orçamento
  const hasValue = (lead.dealValue && lead.dealValue > 0) || (lead.estimatedBudget && lead.estimatedBudget > 0);
  if (!hasValue) {
    missing.add('dealValue');
    missing.add('estimatedBudget');
  }

  // 8. Pacote
  const hasPackage = Boolean(lead.packageSold?.trim() || lead.interestService?.trim());
  if (!hasPackage) {
    missing.add('packageSold');
    missing.add('interestService');
  }

  // 9. Forma de Pagamento
  if (!lead.paymentMethod?.trim()) {
    missing.add('paymentMethod');
  }

  return missing;
}
