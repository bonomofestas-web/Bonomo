import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = process.env.LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY);

const VENUES = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: 'F5 System',
    tagline: 'Unidade Conceito & Casa de Festas Modelo',
    address: 'Av. das Américas, 5000 - Barra da Tijuca, Rio de Janeiro - RJ',
    description: 'Unidade modelo F5 System para eventos inesquecíveis e alta performance.',
    primary_color: '#D4AF37',
    secondary_color: '#1A1A24',
    accent_color: '#F3E5AB',
    glow_color: 'rgba(212, 175, 55, 0.4)',
    years_in_business: 12,
    events_completed: 850,
    guests_delighted: 125000,
    phone: '(21) 98888-7777',
    whatsapp_number: '5521988887777',
    email: 'contato@f5system.com.br'
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'Espaço Realizar',
    tagline: 'Onde seus sonhos se tornam realidade',
    address: 'Estrada do Pau-Ferro, 450 - Freguesia, Rio de Janeiro - RJ',
    description: 'Espaço amplo com área verde integrada, ideal para debutantes e mini-weddings.',
    primary_color: '#3B82F6',
    secondary_color: '#1E293B',
    accent_color: '#60A5FA',
    glow_color: 'rgba(59, 130, 246, 0.4)',
    years_in_business: 8,
    events_completed: 420,
    guests_delighted: 65000,
    phone: '(21) 97777-6666',
    whatsapp_number: '5521977776666',
    email: 'contato@espacorealizar.com.br'
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    name: 'Espaço Rio Lounge',
    tagline: 'Sofisticação e exclusividade na Zona Sul',
    address: 'Rua General Venâncio Flores, 420 - Leblon, Rio de Janeiro - RJ',
    description: 'Lounge moderno e sofisticado para festas exclusivas e baladas.',
    primary_color: '#10B981',
    secondary_color: '#064E3B',
    accent_color: '#34D399',
    glow_color: 'rgba(16, 185, 129, 0.4)',
    years_in_business: 5,
    events_completed: 280,
    guests_delighted: 45000,
    phone: '(21) 96666-5555',
    whatsapp_number: '5521966665555',
    email: 'contato@riolounge.com.br'
  }
];

const FUNNELS = [
  {
    id: '41d857a5-107e-4607-908c-7ebd5ba32cc9',
    name: 'Funil de SDR',
    category: 'Pré-Vendas',
    description: 'Qualificação inicial de leads, triagem de interesse e agendamento de visitas.',
    venue_id: 'a1111111-1111-1111-1111-111111111111',
    badge: 'SDR / Triagem',
    badge_color: '#3B82F6',
    icon: 'target',
    is_primary: false,
    is_post_sale: false,
    order: 0,
    stages_count: 5,
    stages: [
      { id: 'new_lead', name: 'NOVO LEAD', color: '#EF4444', isFixed: true, order: 0 },
      { id: 'in_negotiation', name: 'EM QUALIFICAÇÃO (SDR)', color: '#3B82F6', order: 1 },
      { id: 'scheduled', name: 'VISITA AGENDADA', color: '#EAB308', order: 2 },
      { id: 'decision', name: 'QUALIFICADO P/ CLOSER', color: '#8B5CF6', order: 3 },
      { id: 'deal_closed', name: 'REPASSADO', color: '#10B981', isFixed: true, isWon: true, order: 4 },
      { id: 'lost', name: 'DESQUALIFICADO', color: '#6B7280', isFixed: true, isLoss: true, order: 5 }
    ]
  },
  {
    id: 'b1ab128f-9b0c-480a-8d60-2be1a59fffce',
    name: 'Funil de Closer',
    category: 'Vendas',
    description: 'Apresentação comercial, degustação gastronômica, negociação de valores e fechamento.',
    venue_id: 'a1111111-1111-1111-1111-111111111111',
    badge: 'Closer / Fechamento',
    badge_color: '#10B981',
    icon: 'award',
    is_primary: false,
    is_post_sale: false,
    order: 1,
    stages_count: 5,
    stages: [
      { id: 'new_lead', name: 'RECEBIDO DO SDR', color: '#3B82F6', isFixed: true, order: 0 },
      { id: 'in_negotiation', name: 'PROPOSTA ENVIADA', color: '#F59E0B', order: 1 },
      { id: 'scheduled', name: 'DEGUSTAÇÃO REALIZADA', color: '#8B5CF6', order: 2 },
      { id: 'decision', name: 'CONTRATO EM ANÁLISE', color: '#EC4899', order: 3 },
      { id: 'deal_closed', name: 'CONTRATO FECHADO', color: '#10B981', isFixed: true, isWon: true, order: 4 },
      { id: 'lost', name: 'NÃO FECHOU', color: '#EF4444', isFixed: true, isLoss: true, order: 5 }
    ]
  },
  {
    id: 'f1111111-1111-1111-1111-111111111111',
    name: 'Funil de Indicação de Amigas',
    category: 'Marketing Viral',
    description: 'Captação direta via convidadas das debutantes ativas e indicações externas.',
    venue_id: 'a1111111-1111-1111-1111-111111111111',
    badge: 'Indicação',
    badge_color: '#D4AF37',
    icon: 'sparkles',
    is_primary: true,
    is_post_sale: false,
    order: 2,
    stages_count: 5,
    stages: [
      { id: 'new_lead', name: 'NOVA INDICAÇÃO', color: '#EF4444', isFixed: true, order: 0 },
      { id: 'in_negotiation', name: 'CONTATO INICIADO', color: '#3B82F6', order: 1 },
      { id: 'scheduled', name: 'VISITA AGENDADA', color: '#EAB308', order: 2 },
      { id: 'decision', name: 'DEGUSTAÇÃO / ANÁLISE', color: '#F97316', order: 3 },
      { id: 'deal_closed', name: 'FECHADO (PONTOS VIP)', color: '#10B981', isFixed: true, isWon: true, order: 4 },
      { id: 'lost', name: 'PERDIDO', color: '#6B7280', isFixed: true, isLoss: true, order: 5 }
    ]
  }
];

const CLIENTS = [
  {
    id: '11111111-0001-4000-8000-000000000001',
    code: 'CLI-8F92A1',
    name: 'Fernanda Souza',
    payer_name: 'Carlos Alberto Souza (Pai)',
    payer_relationship: 'pai',
    payer_cpf: '112.334.556-78',
    payer_phone: '(21) 98877-6655',
    payer_email: 'carlos.souza@gmail.com',
    payer_address: 'Av. Lúcio Costa, 3500 - Bloco 2, Apt 401',
    payer_neighborhood: 'Barra da Tijuca',
    payer_city: 'Rio de Janeiro - RJ',
    birthday_person_name: 'Fernanda Souza',
    birthday_person_age: 15,
    birthday_person_birthdate: '2011-10-18',
    event_type: '15_anos',
    event_date: '2026-10-24',
    event_time: '20:00 às 02:00',
    guest_count: 200,
    venue_id: 'a1111111-1111-1111-1111-111111111111',
    venue_name: 'F5 System',
    package_sold: 'Pacote Imperial Diamante (VIP)',
    deal_value: 42000,
    contract_date: '2026-08-15',
    payment_terms: 'Entrada de R$ 7.000 + 10x de R$ 3.500 no boleto bancário',
    payment_status: 'paid_full',
    stage: 'planning',
    assigned_success_manager_name: 'Mariana Sucesso',
    notes: 'Contrato assinado em 15/08. Degustação gastronômica agendada para 10/10.',
    documents: [
      { id: 'doc-001', title: 'Contrato de Prestação de Serviços - Fernanda Souza.pdf', type: 'contract', fileUrl: '#', uploadedAt: '2026-08-15', fileSize: '2.4 MB' }
    ],
    activities: [
      { id: 'act-001', type: 'status_change', description: 'Venda confirmada no CRM Comercial e transferida para a esteira de Pós-Venda.', createdAt: '2026-08-15T17:45:00Z', createdBy: 'Lucas Closer' }
    ]
  },
  {
    id: '11111111-0002-4000-8000-000000000002',
    code: 'CLI-3K7X90',
    name: 'Isabela Bonomo',
    payer_name: 'Patrícia Bonomo (Mãe)',
    payer_relationship: 'mae',
    payer_cpf: '987.654.321-00',
    payer_phone: '(21) 99988-1122',
    payer_email: 'patricia.bonomo@uol.com.br',
    payer_address: 'Rua General Venâncio Flores, 420',
    payer_neighborhood: 'Leblon',
    payer_city: 'Rio de Janeiro - RJ',
    birthday_person_name: 'Isabela Bonomo',
    birthday_person_age: 15,
    birthday_person_birthdate: '2011-12-05',
    event_type: '15_anos',
    event_date: '2026-12-12',
    event_time: '21:00 às 03:00',
    guest_count: 250,
    venue_id: 'a1111111-1111-1111-1111-111111111111',
    venue_name: 'F5 System',
    package_sold: 'Pacote Master All-Inclusive Platinum',
    deal_value: 58000,
    contract_date: '2026-08-18',
    payment_terms: 'Entrada de R$ 10.000 + 12x no cartão de crédito',
    payment_status: 'paid_full',
    stage: 'suppliers',
    assigned_success_manager_name: 'Mariana Sucesso',
    notes: 'Fornecedores de cenografia e iluminação aprovados. Próximo passo: prova dos doces finos.',
    documents: [
      { id: 'doc-003', title: 'Contrato Principal - Isabela Bonomo 15 Anos.pdf', type: 'contract', fileUrl: '#', uploadedAt: '2026-08-18', fileSize: '3.1 MB' }
    ],
    activities: [
      { id: 'act-004', type: 'status_change', description: 'Lead convertido no comercial e cadastrado no Pós-Venda.', createdAt: '2026-08-18T19:05:00Z', createdBy: 'Lucas Closer' }
    ]
  },
  {
    id: '11111111-0003-4000-8000-000000000003',
    code: 'CLI-5M2L84',
    name: 'Camila Martins',
    payer_name: 'Renato Martins (Pai)',
    payer_relationship: 'pai',
    payer_cpf: '223.889.445-12',
    payer_phone: '(21) 97711-2233',
    payer_email: 'renatomartins@globo.com',
    payer_address: 'Estrada do Pau-Ferro, 800',
    payer_neighborhood: 'Freguesia',
    payer_city: 'Rio de Janeiro - RJ',
    birthday_person_name: 'Camila Martins',
    birthday_person_age: 15,
    birthday_person_birthdate: '2011-11-20',
    event_type: '15_anos',
    event_date: '2026-11-28',
    event_time: '19:30 às 01:30',
    guest_count: 180,
    venue_id: 'b2222222-2222-2222-2222-222222222222',
    venue_name: 'Espaço Realizar',
    package_sold: 'Pacote Garden Romance Ouro',
    deal_value: 35000,
    contract_date: '2026-08-22',
    payment_terms: 'Entrada de R$ 5.000 + 10x de R$ 3.000 (PIX mensal programado)',
    payment_status: 'in_progress',
    stage: 'onboarding',
    assigned_success_manager_name: 'Mariana Sucesso',
    notes: 'Cliente acabou de assinar. Enviar mensagem de boas-vindas do time de sucesso.',
    documents: [],
    activities: [
      { id: 'act-006', type: 'status_change', description: 'Contrato assinado no comercial. Inicializado funil de Pós-Venda.', createdAt: '2026-08-22T15:15:00Z', createdBy: 'Juliana Closer' }
    ]
  },
  {
    id: '11111111-0004-4000-8000-000000000004',
    code: 'CLI-9P4W62',
    name: 'Laura Beatriz',
    payer_name: 'Cláudia Beatriz (Mãe)',
    payer_relationship: 'mae',
    payer_cpf: '554.778.990-33',
    payer_phone: '(21) 98123-4567',
    payer_email: 'claudiabeatriz@hotmail.com',
    payer_address: 'Rua Mário Ribeiro, 205',
    payer_neighborhood: 'Gávea',
    payer_city: 'Rio de Janeiro - RJ',
    birthday_person_name: 'Laura Beatriz',
    birthday_person_age: 15,
    birthday_person_birthdate: '2011-09-30',
    event_type: '15_anos',
    event_date: '2026-10-03',
    event_time: '20:00 às 02:00',
    guest_count: 220,
    venue_id: 'a1111111-1111-1111-1111-111111111111',
    venue_name: 'F5 System',
    package_sold: 'Pacote Imperial Premium Plus',
    deal_value: 46000,
    contract_date: '2026-07-10',
    payment_terms: 'Totalmente Quitado (À vista com 5% de desconto)',
    payment_status: 'paid_full',
    stage: 'final_alignment',
    assigned_success_manager_name: 'Mariana Sucesso',
    notes: 'Reta final! Ensaio do cerimonial marcado para 28/09. Lista de convidados em fechamento.',
    documents: [],
    activities: []
  }
];

async function seed() {
  console.log('🌱 Executando seed completo no Supabase Local (Docker)...');

  // 1. Venues
  console.log('🏛️ Inserindo Unidades (Venues)...');
  for (const v of VENUES) {
    const { error } = await supabase.from('venues').upsert(v, { onConflict: 'id' });
    if (error) console.error(`Erro em venue ${v.name}:`, error.message);
    else console.log(`✅ Unidade "${v.name}" pronta.`);
  }

  // 2. Funnels
  console.log('📊 Inserindo Funis Comerciais e de Pós-Venda...');
  for (const f of FUNNELS) {
    const { error } = await supabase.from('commercial_funnels').upsert(f, { onConflict: 'id' });
    if (error) console.error(`Erro em funil ${f.name}:`, error.message);
    else console.log(`✅ Funil "${f.name}" pronto.`);
  }

  // 3. Clients
  console.log('👥 Inserindo Clientes no Pós-Venda...');
  for (const c of CLIENTS) {
    const { error } = await supabase.from('clients').upsert(c, { onConflict: 'id' });
    if (error) console.error(`Erro em cliente ${c.name}:`, error.message);
    else console.log(`✅ Cliente "${c.name}" pronto.`);
  }

  console.log('🎉 Seed completo concluído no Supabase Local!');
}

seed();
