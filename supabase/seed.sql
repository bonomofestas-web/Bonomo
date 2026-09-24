-- ============================================================================
-- F5 SYSTEM • SEED DATA (MULTI-TENANT ISOLADO: DEV MASTER vs CLIENT MASTER)
-- ============================================================================

-- 1. Unidades / Casas de Festas (Venues)
INSERT INTO public.venues (
    id, name, tagline, address, description, experience_text, logo_url, banner_image_url, ballroom_image_url,
    primary_color, secondary_color, accent_color, glow_color, font_family, default_dress_code,
    years_in_business, events_completed, guests_delighted, phone, whatsapp_number, email, master_id
) VALUES 
-- Casas do Tenant Dev Master (Patrick Couto)
(
    'a1111111-1111-1111-1111-111111111111',
    'F5 System',
    'Unidade Conceito & Casa de Festas Modelo',
    'Av. das Américas, 5000 - Barra da Tijuca, Rio de Janeiro - RJ, 22640-102',
    'Casa de festas conceito de alto padrão da F5 System. Estrutura completa para realização de 15 anos, casamentos e eventos sociais com buffet nobre, cenografia personalizada, pista de dança com efeitos especiais, cerimonial dedicado e tecnologia de gestão de ponta.',
    'Mais de 15 anos proporcionando experiências inesquecíveis, conectando tecnologia e alta gastronomia para celebrar seus momentos mais especiais.',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/brand/f5_logo.png',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/venues/1789528038335_ftu11z.png',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/venues/1789528052319_i8eqf1.png',
    '#D4AF37', '#1A1A24', '#F3E5AB', 'rgba(212, 175, 55, 0.4)', 'Montserrat', 'Esporte Fino / Gala',
    15, 1850, 250000, '(21) 98888-7777', '(21) 98888-7777', 'contato@f5system.com.br',
    'd0000000-0000-0000-0000-000000000001'
),
(
    '4194834f-feb7-4369-bc3e-4500d5714b9c',
    'Minha house',
    'Ambiente aconchegante para eventos intimistas',
    'Rua das Palmeiras, 100 - Recreio, Rio de Janeiro - RJ',
    'Ambiente aconchegante para recepções intimistas.',
    'Mais de 10 anos realizando sonhos e recepções exclusivas.',
    NULL,
    NULL,
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80',
    '#8B5CF6', '#2E1065', '#A78BFA', 'rgba(139, 92, 246, 0.4)', 'Montserrat', 'Traje Passeio Completo / Gala',
    3, 120, 18000, '(21) 95555-4444', '(21) 95555-4444', 'contato@minhahouse.com.br',
    'd0000000-0000-0000-0000-000000000001'
),
-- Casas do Tenant Master Cliente (Yuri Bonomo)
(
    'b2222222-2222-2222-2222-222222222222',
    'Espaço Realizar',
    'Onde seus sonhos se tornam realidade',
    'Estr. do Rio Grande, 4374 - Taquara, Rio de Janeiro - RJ, 22723-002',
    'Mansão clássica com jardins iluminados e salão nobre.',
    'Mais de 20 anos transformando celebrações em momentos inesquecíveis.',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/venues/1789528019431_bftjw4.png',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/venues/1789528038335_ftu11z.png',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/venues/1789528052319_i8eqf1.png',
    '#8B5CF6', '#6D28D9', '#C4B5FD', 'rgba(212,175,55,0.4)', 'Montserrat', 'Esporte Fino / Gala',
    20, 2200, 300000, '(21) 97989-5727', '(21) 97989-5727', 'contato@espacorealizar.com.br',
    'a0000000-0000-0000-0000-000000000001'
),
(
    'c3333333-3333-3333-3333-333333333333',
    'Espaço Rio Lounge',
    'O espaço aonde sonhos viram momentos inesquecíveis',
    'Estr. dos Três Rios, 1571 - Freguesia (Jacarepaguá), Rio de Janeiro - RJ, 22745-004',
    'Casa de festas na Zona Oeste do Rio de Janeiro, localizada em Jacarepaguá, especializada na realização de festas de 15 anos, casamentos, formaturas. Estrutura completa para eventos, com buffet, decoração personalizada, confeitaria, cerimonial, camarim, fotografia, filmagem, drinks e DJ.',
    'Há mais de 14 anos transformando celebrações em experiências únicas, com atendimento personalizado e cuidado em cada detalhe. Agende uma visita e conheça o Espaço Rio Lounge.',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/venues/1789527546221_cqk1rv.png',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/venues/1789527570619_zb8iy8.png',
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/venues/1789527626319_dxauin.png',
    '#D4AF37', '#AA7C11', '#F3E5AB', 'rgba(212,175,55,0.4)', 'Montserrat', 'Esporte Fino / Gala',
    20, 2200, 300000, '2139554428', '2139554428', 'contato@espacoriolounge.com.br',
    'a0000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    address = EXCLUDED.address,
    description = EXCLUDED.description,
    experience_text = EXCLUDED.experience_text,
    logo_url = EXCLUDED.logo_url,
    banner_image_url = EXCLUDED.banner_image_url,
    ballroom_image_url = EXCLUDED.ballroom_image_url,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    accent_color = EXCLUDED.accent_color,
    glow_color = EXCLUDED.glow_color,
    font_family = EXCLUDED.font_family,
    default_dress_code = EXCLUDED.default_dress_code,
    years_in_business = EXCLUDED.years_in_business,
    events_completed = EXCLUDED.events_completed,
    guests_delighted = EXCLUDED.guests_delighted,
    phone = EXCLUDED.phone,
    whatsapp_number = EXCLUDED.whatsapp_number,
    email = EXCLUDED.email,
    master_id = EXCLUDED.master_id;

-- 2. Colaboradores e Equipe (Collaborators)
INSERT INTO public.collaborators (
    id, email, name, role, is_dev, venue_id, venue_ids, avatar_url, phone, active, theme, password, master_id, is_first_access
) VALUES
-- Conta 1: Desenvolvedor (Master com is_dev = true) - Senha: 123456
(
    'd0000000-0000-0000-0000-000000000001',
    'patrickcouto.oficial@gmail.com',
    'Patrick Couto',
    'master',
    true,
    'a1111111-1111-1111-1111-111111111111',
    ARRAY['a1111111-1111-1111-1111-111111111111', '4194834f-feb7-4369-bc3e-4500d5714b9c']::uuid[],
    '/f5_mark.png',
    '(21) 99544-8840',
    true,
    'light',
    '123456',
    null,
    false
),
-- Conta 2: Master Cliente (Yuri Bonomo) - Senha: 123456
(
    'a0000000-0000-0000-0000-000000000001',
    'bonomo1989@gmail.com',
    'Yuri Bonomo',
    'master',
    false,
    'c3333333-3333-3333-3333-333333333333',
    ARRAY['b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333']::uuid[],
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/avatars/1789527451708_d3rcmv.webp',
    '(21) 99700-6525',
    true,
    'light',
    '123456',
    null,
    false
),
-- Colaborador Subordinado ao Master Yuri: Patrick Couto (Equipe)
(
    '0c65bc75-58fb-4d49-b587-78794333b66b',
    'pcspike3@gmail.com',
    'Patrick Couto',
    'admin',
    false,
    'b2222222-2222-2222-2222-222222222222',
    ARRAY['b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333']::uuid[],
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/avatars/1788550884774_hvqkr3.webp',
    '(21) 99544-8840',
    true,
    'light',
    '123456',
    'a0000000-0000-0000-0000-000000000001',
    false
),
-- Colaborador Subordinado ao Master Yuri: Luiza Bonomo
(
    '1d3316b5-3454-49a5-b7af-7e59e46397de',
    'annaluizarocha132719@gmail.com',
    'LUIZA BONOMO',
    'admin',
    false,
    'c3333333-3333-3333-3333-333333333333',
    ARRAY['b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333']::uuid[],
    'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/avatars/1789530060445_sijcfl.webp',
    '(21) 98050-3184',
    true,
    'dark',
    '123456',
    'a0000000-0000-0000-0000-000000000001',
    false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    is_dev = EXCLUDED.is_dev,
    master_id = EXCLUDED.master_id,
    venue_id = EXCLUDED.venue_id,
    venue_ids = EXCLUDED.venue_ids,
    password = EXCLUDED.password;

-- 3. Funis Comerciais e de Pós-Venda (Commercial Funnels)
INSERT INTO public.commercial_funnels (
    id, name, category, description, venue_id, badge, badge_color, icon, is_primary, is_pinned, is_post_sale, "order", stages_count, stages
) VALUES
-- Funis do Tenant Dev Master (F5 System)
(
    '41d857a5-107e-4607-908c-7ebd5ba32cc9',
    'SDR',
    'Pré-Vendas',
    'Qualificação inicial de leads, triagem de interesse e agendamento de visitas.',
    'a1111111-1111-1111-1111-111111111111',
    'SDR',
    '#3B82F6',
    'target',
    true,
    true,
    false,
    0,
    6,
    '[{"id":"new_lead","name":"NOVO LEAD","color":"#EF4444","isFixed":true,"order":0},{"id":"in_negotiation","name":"EM QUALIFICAÇÃO","color":"#3B82F6","order":1},{"id":"scheduled","name":"VISITA AGENDADA","color":"#EAB308","order":2},{"id":"decision","name":"QUALIFICADO P/ CLOSER","color":"#8B5CF6","order":3},{"id":"deal_closed","name":"REPASSADO","color":"#10B981","isFixed":true,"isWon":true,"order":4},{"id":"lost","name":"DESQUALIFICADO","color":"#6B7280","isFixed":true,"isLoss":true,"order":5}]'::jsonb
),
(
    'b1ab128f-9b0c-480a-8d60-2be1a59fffce',
    'CLOSER',
    'Vendas & Negociação',
    'Apresentação comercial, degustação gastronômica, negociação de valores e fechamento.',
    'a1111111-1111-1111-1111-111111111111',
    'CLOSER',
    '#10B981',
    'award',
    false,
    true,
    false,
    1,
    6,
    '[{"id":"new_lead","name":"RECEBIDO DO SDR","color":"#3B82F6","isFixed":true,"order":0},{"id":"in_negotiation","name":"PROPOSTA ENVIADA","color":"#F59E0B","order":1},{"id":"scheduled","name":"DEGUSTAÇÃO REALIZADA","color":"#8B5CF6","order":2},{"id":"decision","name":"CONTRATO EM ANÁLISE","color":"#EC4899","order":3},{"id":"deal_closed","name":"CONTRATO FECHADO","color":"#10B981","isFixed":true,"isWon":true,"order":4},{"id":"lost","name":"NÃO FECHOU","color":"#EF4444","isFixed":true,"isLoss":true,"order":5}]'::jsonb
),
-- Funis do Tenant Yuri Bonomo (Espaço Realizar / Rio Lounge)
(
    'f1111111-1111-1111-1111-111111111111',
    'Funil de Indicação de Amigas',
    'Marketing Viral',
    'Captação direta via convidadas das debutantes ativas e indicações externas.',
    'c3333333-3333-3333-3333-333333333333',
    'Indicação',
    '#D4AF37',
    'sparkles',
    true,
    true,
    false,
    0,
    5,
    '[{"id":"new_lead","name":"NOVA INDICAÇÃO","color":"#EF4444","isFixed":true,"order":0},{"id":"in_negotiation","name":"CONTATO INICIADO","color":"#3B82F6","order":1},{"id":"scheduled","name":"VISITA AGENDADA","color":"#EAB308","order":2},{"id":"decision","name":"DEGUSTAÇÃO / ANÁLISE","color":"#F97316","order":3},{"id":"deal_closed","name":"FECHADO (PONTOS VIP)","color":"#10B981","isFixed":true,"isWon":true,"order":4},{"id":"lost","name":"PERDIDO","color":"#6B7280","isFixed":true,"isLoss":true,"order":5}]'::jsonb
),
(
    'f2222222-2222-2222-2222-222222222222',
    'Funil de Tráfego Pago & Meta Ads',
    'Marketing Digital',
    'Captação via campanhas no Instagram e Facebook Ads.',
    'b2222222-2222-2222-2222-222222222222',
    'Tráfego Pago',
    '#3B82F6',
    'megaphone',
    false,
    false,
    false,
    1,
    5,
    '[{"id":"new_lead","name":"NOVO LEAD (ADS)","color":"#EF4444","isFixed":true,"order":0},{"id":"in_negotiation","name":"EM CONTATO","color":"#3B82F6","order":1},{"id":"scheduled","name":"VISITA AGENDADA","color":"#EAB308","order":2},{"id":"decision","name":"PROPOSTA ENVIADA","color":"#F97316","order":3},{"id":"deal_closed","name":"CONTRATO FECHADO","color":"#10B981","isFixed":true,"isWon":true,"order":4},{"id":"lost","name":"SEM INTERESSE","color":"#6B7280","isFixed":true,"isLoss":true,"order":5}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    badge = EXCLUDED.badge,
    badge_color = EXCLUDED.badge_color,
    icon = EXCLUDED.icon,
    is_primary = EXCLUDED.is_primary,
    is_pinned = EXCLUDED.is_pinned,
    is_post_sale = EXCLUDED.is_post_sale,
    stages = EXCLUDED.stages,
    stages_count = EXCLUDED.stages_count;

-- 4. Clientes no Pós-Venda (Clients)
INSERT INTO public.clients (
    id, code, name, payer_name, payer_relationship, payer_cpf, payer_phone, payer_email,
    payer_address, payer_neighborhood, payer_city, birthday_person_name, birthday_person_age,
    birthday_person_birthdate, event_type, event_date, event_time, guest_count, venue_id,
    venue_name, package_sold, deal_value, contract_date, payment_terms, payment_status,
    stage, assigned_success_manager_name, notes
) VALUES
-- Clientes do Tenant Dev Master (F5 System)
(
    '11111111-0001-4000-8000-000000000001',
    'CLI-8F92A1',
    'Fernanda Souza',
    'Carlos Alberto Souza (Pai)',
    'pai',
    '112.334.556-78',
    '(21) 98877-6655',
    'carlos.souza@gmail.com',
    'Av. Lúcio Costa, 3500 - Bloco 2, Apt 401',
    'Barra da Tijuca',
    'Rio de Janeiro - RJ',
    'Fernanda Souza',
    15,
    '2011-10-18',
    '15_anos',
    '2026-10-24',
    '20:00 às 02:00',
    200,
    'a1111111-1111-1111-1111-111111111111',
    'F5 System',
    'Pacote Imperial Diamante (VIP)',
    42000,
    '2026-08-15',
    'Entrada de R$ 7.000 + 10x de R$ 3.500 no boleto bancário',
    'paid_full',
    'planning',
    'Mariana Sucesso',
    'Contrato assinado em 15/08. Degustação gastronômica agendada para 10/10.'
),
(
    '11111111-0002-4000-8000-000000000002',
    'CLI-3K7X90',
    'Isabela Bonomo',
    'Patrícia Bonomo (Mãe)',
    'mae',
    '987.654.321-00',
    '(21) 99988-1122',
    'patricia.bonomo@uol.com.br',
    'Rua General Venâncio Flores, 420',
    'Leblon',
    'Rio de Janeiro - RJ',
    'Isabela Bonomo',
    15,
    '2011-12-05',
    '15_anos',
    '2026-12-12',
    '21:00 às 03:00',
    250,
    'a1111111-1111-1111-1111-111111111111',
    'F5 System',
    'Pacote Master All-Inclusive Platinum',
    58000,
    '2026-08-18',
    'Entrada de R$ 10.000 + 12x no cartão de crédito',
    'paid_full',
    'suppliers',
    'Mariana Sucesso',
    'Fornecedores de cenografia e iluminação aprovados. Próximo passo: prova dos doces finos.'
),
(
    '11111111-0004-4000-8000-000000000004',
    'CLI-9P4W62',
    'Laura Beatriz',
    'Cláudia Beatriz (Mãe)',
    'mae',
    '554.778.990-33',
    '(21) 98123-4567',
    'claudiabeatriz@hotmail.com',
    'Rua Mário Ribeiro, 205',
    'Gávea',
    'Rio de Janeiro - RJ',
    'Laura Beatriz',
    15,
    '2011-09-30',
    '15_anos',
    '2026-10-03',
    '20:00 às 02:00',
    220,
    'a1111111-1111-1111-1111-111111111111',
    'F5 System',
    'Pacote Imperial Premium Plus',
    46000,
    '2026-07-10',
    'Totalmente Quitado (À vista com 5% de desconto)',
    'paid_full',
    'final_alignment',
    'Mariana Sucesso',
    'Reta final! Ensaio do cerimonial marcado para 28/09. Lista de convidados em fechamento.'
),
-- Cliente do Tenant Yuri Bonomo (Espaço Realizar)
(
    '11111111-0003-4000-8000-000000000003',
    'CLI-5M2L84',
    'Camila Martins',
    'Renato Martins (Pai)',
    'pai',
    '223.889.445-12',
    '(21) 97711-2233',
    'renatomartins@globo.com',
    'Estrada do Pau-Ferro, 800',
    'Freguesia',
    'Rio de Janeiro - RJ',
    'Camila Martins',
    15,
    '2011-11-20',
    '15_anos',
    '2026-11-28',
    '19:30 às 01:30',
    180,
    'b2222222-2222-2222-2222-222222222222',
    'Espaço Realizar',
    'Pacote Garden Romance Ouro',
    35000,
    '2026-08-22',
    'Entrada de R$ 5.000 + 10x de R$ 3.000 (PIX mensal programado)',
    'in_progress',
    'onboarding',
    'Mariana Sucesso',
    'Cliente acabou de assinar. Enviar mensagem de boas-vindas do time de sucesso.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    stage = EXCLUDED.stage,
    deal_value = EXCLUDED.deal_value;

-- 5. Leads Comerciais (Leads)
INSERT INTO public.leads (
    id, funnel_id, venue_id, name, phone, email, stage, deal_value, estimated_budget,
    event_type, event_date, temperature, code, master_id, is_validated, points_granted, contacts
) VALUES
-- Leads do Funil SDR (F5 System)
(
    '86eb65bd-686f-4bc5-acbe-998e4e7cdb2f',
    '41d857a5-107e-4607-908c-7ebd5ba32cc9',
    'a1111111-1111-1111-1111-111111111111',
    'Gabriela Vasconcellos',
    '(21) 99887-1122',
    'gabriela.vasconcellos@gmail.com',
    'new_lead',
    48000,
    48000,
    '15 Anos',
    '2026-11-14',
    'hot',
    'LEAD-GAB98',
    'd0000000-0000-0000-0000-000000000001',
    true,
    1,
    '[{"name": "Patrícia (Mãe)", "phone": "(21) 99887-1122", "role": "mae", "is_primary": true}]'::jsonb
),
(
    '460a7d9b-52da-4aca-b2e5-f9ac6ce71354',
    '41d857a5-107e-4607-908c-7ebd5ba32cc9',
    'a1111111-1111-1111-1111-111111111111',
    'Beatriz Guimarães',
    '(21) 98765-4321',
    'beatriz.guimaraes@uol.com.br',
    'in_negotiation',
    52000,
    52000,
    '15 Anos',
    '2026-12-05',
    'warm',
    'LEAD-BEA52',
    'd0000000-0000-0000-0000-000000000001',
    true,
    1,
    '[{"name": "Carlos (Pai)", "phone": "(21) 98765-4321", "role": "pai", "is_primary": true}]'::jsonb
),
-- Leads do Funil CLOSER (F5 System)
(
    'dab9995b-5024-435b-bc20-f74339eae594',
    'b1ab128f-9b0c-480a-8d60-2be1a59fffce',
    'a1111111-1111-1111-1111-111111111111',
    'Mariana Medeiros',
    '(21) 99554-3322',
    'mariana.medeiros@gmail.com',
    'new_lead',
    65000,
    65000,
    '15 Anos',
    '2027-01-20',
    'hot',
    'LEAD-MAR65',
    'd0000000-0000-0000-0000-000000000001',
    true,
    1,
    '[{"name": "Helena (Mãe)", "phone": "(21) 99554-3322", "role": "mae", "is_primary": true}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    stage = EXCLUDED.stage,
    deal_value = EXCLUDED.deal_value,
    funnel_id = EXCLUDED.funnel_id;

