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

  // 10. SDR Responsável
  if (!lead.sdrId?.trim() && !lead.assignedTo?.trim()) {
    missing.push('SDR Responsável');
  }

  // 11. Closer Responsável
  if (!lead.closerId?.trim()) {
    missing.push('Closer Responsável');
  }

  // 12. Valor de Entrada
  if (lead.downPayment === undefined || lead.downPayment === null) {
    missing.push('Valor de Entrada (R$)');
  }

  // 13. Parcelas
  const hasInstallments = Boolean((lead.installments && lead.installments > 0) || (lead.installmentValue && lead.installmentValue > 0));
  if (!hasInstallments) {
    missing.push('Número de Parcelas');
  }

  // 14. Cartão de Crédito (Sim ou Não)
  if (lead.hasCreditCard === undefined || lead.hasCreditCard === null) {
    missing.push('Cartão de Crédito (Sim ou Não)');
  }

  // 15. E-mail do Contato
  const hasEmail = Boolean(lead.email?.trim() || lead.contacts?.some(c => c.email?.trim()));
  if (!hasEmail) {
    missing.push('E-mail do Contato');
  }

  // 16. CPF
  const hasCpf = Boolean(lead.cpf?.trim() || lead.contacts?.some(c => c.cpf?.trim()));
  if (!hasCpf) {
    missing.push('CPF do Contratante / Responsável');
  }

  // 17. Bairro
  const hasNeighborhood = Boolean(lead.neighborhood?.trim() || lead.contacts?.some(c => c.neighborhood?.trim()));
  if (!hasNeighborhood) {
    missing.push('Bairro');
  }

  // 18. Endereço
  const hasAddress = Boolean(lead.address?.trim() || lead.contacts?.some(c => c.address?.trim()));
  if (!hasAddress) {
    missing.push('Endereço Completo');
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

  // 10. SDR
  if (!lead.sdrId?.trim() && !lead.assignedTo?.trim()) {
    missing.add('sdrId');
  }

  // 11. Closer
  if (!lead.closerId?.trim()) {
    missing.add('closerId');
  }

  // 12. Entrada
  if (lead.downPayment === undefined || lead.downPayment === null) {
    missing.add('downPayment');
  }

  // 13. Parcelas
  const hasInstallments = Boolean((lead.installments && lead.installments > 0) || (lead.installmentValue && lead.installmentValue > 0));
  if (!hasInstallments) {
    missing.add('installments');
  }

  // 14. Cartão de Crédito
  if (lead.hasCreditCard === undefined || lead.hasCreditCard === null) {
    missing.add('hasCreditCard');
  }

  // 15. E-mail
  const hasEmail = Boolean(lead.email?.trim() || lead.contacts?.some(c => c.email?.trim()));
  if (!hasEmail) {
    missing.add('email');
  }

  // 16. CPF
  const hasCpf = Boolean(lead.cpf?.trim() || lead.contacts?.some(c => c.cpf?.trim()));
  if (!hasCpf) {
    missing.add('cpf');
  }

  // 17. Bairro
  const hasNeighborhood = Boolean(lead.neighborhood?.trim() || lead.contacts?.some(c => c.neighborhood?.trim()));
  if (!hasNeighborhood) {
    missing.add('neighborhood');
  }

  // 18. Endereço
  const hasAddress = Boolean(lead.address?.trim() || lead.contacts?.some(c => c.address?.trim()));
  if (!hasAddress) {
    missing.add('address');
  }

  return missing;
}
