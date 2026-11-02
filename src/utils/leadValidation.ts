import type { Lead } from '../types/admin';

/**
 * Validação de ficha completa para envio de Lead para Ganho (Fechamento Comercial).
 * Regra: Ficha estritamente completa com informações prioritárias.
 * A ÚNICA exceção (NÃO obrigatória) é a Data do Evento / Festa, conforme diretriz do cliente.
 */
export function validateLeadForWon(lead: Lead): string[] {
  const missing: string[] = [];

  // 1. Obrigatoriedade de ter Aniversariante / Debutante vinculado na lista
  const hasBirthdayPersonRole = lead.primaryContactRole === 'debutante' || 
    lead.primaryContactRole === 'aniversariante' || 
    (lead.contacts || []).some(c => c.role === 'debutante' || c.role === 'aniversariante');
  
  if (!hasBirthdayPersonRole) {
    missing.push('Adicione um(a) Aniversariante ou Debutante vinculado(a) à ficha');
  }

  // 2. Obrigatoriedade do Decisor Legal e seus Dados Contratuais (E-mail, CPF, Endereço)
  const designatedDecisor = (lead.contacts || []).find(c => c.isPrimaryDecisionMaker && c.role !== 'debutante');
  const mainIsDecisor = !designatedDecisor && lead.primaryContactRole !== 'debutante';
  const effectiveDecisor = designatedDecisor || (mainIsDecisor ? {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    cpf: lead.cpf,
    address: lead.address,
    neighborhood: lead.neighborhood,
    role: lead.primaryContactRole,
  } : null);

  if (!effectiveDecisor) {
    missing.push('Defina um Decisor Legal para o contrato (Debutante não pode ser decisora)');
  } else {
    if (!effectiveDecisor.name?.trim()) missing.push('Nome do Decisor do Contrato');
    const cleanPhone = (effectiveDecisor.phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 8) missing.push('Telefone válido do Decisor');
    if (!effectiveDecisor.email?.trim()) missing.push('E-mail do Decisor do Contrato');
    if (!effectiveDecisor.cpf?.trim()) missing.push('CPF do Decisor do Contrato');
    if (!effectiveDecisor.address?.trim() && !effectiveDecisor.neighborhood?.trim()) {
      missing.push('Endereço ou Bairro do Decisor');
    }
  }

  // 3. Tipo de Evento
  if (!lead.eventType?.trim()) {
    missing.push('Tipo do Evento');
  }

  // 4. Nome do(a) Aniversariante / Debutante
  const personName = (lead as any).birthdayPersonName?.trim() || 
    (lead.contacts || []).find(c => c.role === 'debutante' || c.role === 'aniversariante')?.name?.trim() ||
    (lead.primaryContactRole === 'debutante' || lead.primaryContactRole === 'aniversariante' ? lead.name?.trim() : undefined) ||
    lead.debutanteName?.trim();
  if (!personName || personName === 'Indicação Externa') {
    missing.push('Nome do(a) Aniversariante / Debutante');
  }

  // 5. Data de Aniversário do(a) Aniversariante
  const birthdayContact = (lead.contacts || []).find(c => c.role === 'debutante' || c.role === 'aniversariante');
  const birthDate = birthdayContact?.birthday || lead.debutanteBirthDate || lead.birthday;
  if (!birthDate) {
    missing.push('Data de Aniversário do(a) Aniversariante');
  }

  // 6. Quantidade Estimada de Convidados (> 0)
  if (!lead.estimatedGuests || lead.estimatedGuests <= 0) {
    missing.push('Quantidade Estimada de Convidados');
  }

  // 7. Período Desejado
  const hasPeriod = Boolean(lead.desiredPeriod?.trim() || lead.eventYear || lead.eventDate || lead.partyDate);
  if (!hasPeriod) {
    missing.push('Período Desejado');
  }

  // 8. Valor da Venda / Orçamento (> 0)
  const hasValue = (lead.dealValue && lead.dealValue > 0) || (lead.estimatedBudget && lead.estimatedBudget > 0);
  if (!hasValue) {
    missing.push('Valor da Venda / Orçamento');
  }

  // 9. Pacote Vendido / Interesse
  const hasPackage = Boolean(lead.packageSold?.trim() || lead.interestService?.trim());
  if (!hasPackage) {
    missing.push('Pacote de Interesse / Vendido');
  }

  // 10. Formato de Pagamento
  if (!lead.paymentMethod?.trim()) {
    missing.push('Formato de Pagamento');
  }

  // 11. SDR Responsável
  if (!lead.sdrId?.trim() && !lead.assignedTo?.trim()) {
    missing.push('SDR Responsável');
  }

  // 12. Closer Responsável
  if (!lead.closerId?.trim()) {
    missing.push('Closer Responsável');
  }

  // 13. Valor de Entrada
  if (lead.downPayment === undefined || lead.downPayment === null) {
    missing.push('Valor de Entrada (R$)');
  }

  // 14. Parcelas
  const hasInstallments = Boolean((lead.installments && lead.installments > 0) || (lead.installmentValue && lead.installmentValue > 0));
  if (!hasInstallments) {
    missing.push('Número de Parcelas');
  }

  // 15. Cartão de Crédito (Sim ou Não)
  if (lead.hasCreditCard === undefined || lead.hasCreditCard === null) {
    missing.push('Cartão de Crédito (Sim ou Não)');
  }

  // NOTA: Data do Evento NÃO É OBRIGATÓRIA (definida posteriormente com o pós-venda)

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
