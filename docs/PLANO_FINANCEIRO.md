# Plano do Setor Financeiro (F5 System)

Documento de referência do módulo financeiro. Decisões já aprovadas; quando algo mudar, atualize aqui.
Plano técnico completo e ordem das fases: ver seção "Fases". Este documento é o contrato entre negócio e código.

## 1. Ideia central
O vendedor descreve **como o cliente vai pagar** na hora da venda. O contrato chega pronto ao financeiro, que **aprova ou reprova**. Só na aprovação nascem as parcelas. Nada cai direto nas tabelas do financeiro.

Caminho do contrato: vendedor fecha (com plano de pagamento) → gerente comercial homologa (como hoje) → o contrato vai **em paralelo** ao pós-venda e ao financeiro → financeiro aprova (nascem as parcelas) ou reprova (volta ao Closer com motivo, mesmo mecanismo de `contractService.rejectContract`).

## 2. Glossário simples
- **Contas a receber (recebíveis):** parcelas que o cliente deve pagar (sinal, entrada, parcelas, saldo).
- **Contas a pagar:** o que a casa deve pagar (fornecedor, aluguel, folha, impostos).
- **Competência:** a data a que a receita ou o gasto pertence (aqui, a receita é a **data da festa**).
- **Caixa:** a data em que o dinheiro realmente entra ou sai. O DRE usa competência; o fluxo de caixa usa caixa.
- **Custo variável do evento:** muda a cada festa (buffet, bebida, equipe do evento, decoração).
- **Despesa fixa:** existe mesmo sem festa (aluguel, folha fixa, energia).
- **Margem de contribuição:** receita líquida menos custos variáveis dos eventos. É o que sobra para pagar as despesas fixas.
- **EBITDA (resultado operacional):** o resultado da operação antes de taxas financeiras.
- **Bruto, taxa e líquido (cartão):** o cliente paga o bruto; a maquininha desconta a taxa; entra o líquido.
- **Distrato:** cancelamento da festa, com ou sem multa retida.
- **Rateio:** dividir um custo entre mais de uma festa.

## 3. Regras de negócio aprovadas
1. **Plano de pagamento estruturado** em `contracts.payment_terms` (jsonb, `version: 1`), combinando modalidades: `sinal`/`entrada` (valor, data, meio), `parcelas` PIX/boleto (quantidade, valor, dia, 1ª data), `cartao` (bruto, parcelas, maquininha) e `pos_evento` (valor e regra `event_date + N dias`). A soma tem que bater com o total (tolerância R$ 0,01); se não bater, **bloqueia o envio**.
2. **Cartão:** a baixa quita o cliente pelo **bruto**; a taxa da maquininha vira despesa financeira automática (Resultado Financeiro); o **líquido** é o que se concilia no extrato. `fin_card_settlements` guarda o calendário de liquidação (10x = 10 depósitos).
3. **Distrato:** estorna o saldo futuro, remove a receita do evento do DRE futuro, a **devolução é saída de caixa (não é despesa)** e a **multa retida vira receita na data do cancelamento**. Exemplo de teste: pagou R$ 5.000, multa R$ 2.000, devolve R$ 3.000. Adiamento só move a competência e recalcula vencimentos relativos à festa.
4. **Rateio por evento:** custo de uma festa só = 100% nela; compra ou diária que atende 2 ou 3 festas é rateada (igual, por convidados ou manual; soma 100%). Sem rateio = despesa geral da casa. A margem por festa usa só os rateios.
5. **Contrato aprovado é imutável.** Renegociação, desconto, adiamento e distrato são eventos financeiros com histórico, nunca edição do contrato.
6. **Etapa do funil financeiro automática** pelas parcelas: Aguardando aprovação, Em dia, A vencer, Inadimplente, Quitado. **Negociação** e **Acordo** são manuais e travam o card.
7. **Legado:** os 218 contratos históricos entram com parcelas **pendentes**; o financeiro dá baixa com os comprovantes. A importação (2B) corre em paralelo e **não trava** a operação nova.
8. **Dashboard comercial:** faturamento passa a usar a **data de fechamento** (`closed_at`) e ganha a métrica **Entrada no mês** (entradas e sinais pagos, valor líquido em caixa); antes das baixas existirem, mostra a entrada contratada com outro rótulo.
9. **Acesso:** master, gerência e setor `financeiro`. Comercial não vê.

## 4. Categorias padrão (editáveis)
- **Receita:** festas (por tipo), multas e distratos, outras receitas.
- **Deduções:** DAS/impostos sobre vendas, estornos e devoluções.
- **Custos variáveis dos eventos:** buffet, bebidas, equipe do evento, decoração, DJ/som, cerimonial, fotógrafo/filmagem, bolo e doces, segurança e limpeza do evento.
- **Despesas operacionais fixas:** aluguel, folha fixa, pró-labore, energia, água, internet, manutenção, contador, seguros.
- **Despesas operacionais variáveis:** comissões, marketing e anúncios, material de escritório, deslocamento.
- **Resultado financeiro:** taxas de cartão e antecipação, tarifas bancárias, juros pagos e recebidos.

## 5. DRE: cascata e exportação
(+) Receita Operacional Bruta → (-) Deduções → **(=) Receita Operacional Líquida** → (-) Custos Variáveis dos Eventos → **(=) Margem de Contribuição** → (-) Despesas Operacionais → **(=) Resultado Operacional (EBITDA)** → (+/-) Resultado Financeiro → **(=) Lucro/Prejuízo Líquido**.
Cada linha exporta Código Contábil (`fin_categories.accounting_code`, opcional), Descrição, Valor, **% AV** (sobre a Receita Líquida) e **% AH** (contra o período anterior). Exportação em **PDF executivo** e **Excel com fórmulas reais** (`=SUM`).

## 6. Segurança (achado da Fase 0)
- **Todas as tabelas do sistema têm policy aberta** (`USING (true)` para `anon` e `authenticated`). O isolamento entre Masters é feito **na aplicação** (filtro por `master_id` nos serviços).
- O login é próprio (senha na tabela `collaborators`) e a sessão do Supabase Auth é paralela; hoje **só 1 de 17 colaboradores** existe em `auth.users`. Por isso o banco **não consegue saber quem é o usuário**, e uma policy restritiva por usuário quebraria o app.
- **Decisão desta etapa:** as tabelas `fin_*` seguem o mesmo padrão (RLS ligada, policy igual às demais), **sempre com `master_id`**, e toda leitura e gravação passa por `financeService` com checagem de permissão (`canAccessFinance`). **Risco conhecido:** quem tiver a chave pública do Supabase consegue ler o financeiro direto pela API. Proteção de verdade exige migrar todos os colaboradores para o Supabase Auth e trocar as policies por `auth.uid()`: projeto separado, recomendado antes de dados financeiros reais irem para produção.

## 7. Fases
0. Definições e segurança (este documento).
1. Banco e permissões (migrations `fin_*`, `canAccessFinance`, menu e rota).
2A. Venda estruturada e aprovação financeira (operação nova).
2C. `closed_at`, métrica Entrada no mês e correção do faturamento.
3. Funil financeiro e modal de detalhe com WhatsApp.
3B. Renegociação, adiamento e distrato.
4. Contas a pagar, recorrência, rateio.
2B. Legado dos 218 contratos (paralela).
5. Relatórios e exportação (fluxo de caixa, aging, DRE, orçado × realizado, margem por festa, ponto de equilíbrio).
6. Conciliação bancária e comissões.
7. Automação de cobrança.

## 8. Riscos
- Sem formação contábil no time: classificação fixo/variável e DRE precisam de validação do contador.
- 81 contratos históricos com cronograma que não fecha e 81 sem assinatura digital identificada.
- Data de fechamento extraída de PDF pode falhar em escaneados e manuscritos.
- Número de WhatsApp do financeiro depende das regras de números × funis.
- Segurança do banco (seção 6).
