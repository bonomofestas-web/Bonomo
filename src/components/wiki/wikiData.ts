export interface WikiStep {
  stepNumber: number;
  title: string;
  action: string;
  details?: string;
  tips?: string;
}

export interface WikiArticle {
  id: string;
  title: string;
  category: 'overview' | 'crm' | 'debutante' | 'public_links' | 'technical' | 'faq';
  categoryLabel: string;
  targetAudience: ('Todos' | 'Comercial' | 'SDR' | 'Closer' | 'Pós-Venda' | 'Gerência/Master' | 'Debutante' | 'Desenvolvedor')[];
  summary: string;
  howItWorks: string;
  steps?: WikiStep[];
  businessRules?: string[];
  vipTips?: string[];
  tags: string[];
}

export const WIKI_CATEGORIES = [
  { id: 'all', label: 'Todos os Artigos', icon: 'BookOpen' },
  { id: 'overview', label: 'Visão Geral do F5 System', icon: 'Sparkles' },
  { id: 'crm', label: 'CRM & Gestão Comercial', icon: 'Briefcase' },
  { id: 'debutante', label: 'App da Debutante (PWA)', icon: 'Crown' },
  { id: 'public_links', label: 'Links Públicos & Captação', icon: 'Link2' },
  { id: 'technical', label: 'Arquitetura & Infraestrutura', icon: 'Cpu' },
  { id: 'faq', label: 'Dúvidas & Resolução (FAQ)', icon: 'HelpCircle' },
] as const;

export const WIKI_ARTICLES: WikiArticle[] = [
  // ==========================================
  // 1. VISÃO GERAL & ECOSSISTEMA
  // ==========================================
  {
    id: 'visao-geral-ecossistema',
    title: 'Visão Geral do Ecossistema F5 System',
    category: 'overview',
    categoryLabel: 'Visão Geral do F5 System',
    targetAudience: ['Todos', 'Gerência/Master', 'Comercial'],
    summary: 'Apresentação completa de como o F5 System integra o funil de vendas corporativo com o aplicativo da debutante e confirmação de convidados em uma única plataforma.',
    howItWorks: 'O F5 System é uma solução completa para casas de eventos e debutantes. Ele integra 3 frentes operacionais em tempo real: 1) CRM Corporativo para gestão de leads, SDRs, Closers, degustações e fechamentos; 2) Aplicativo Mobile First PWA para a debutante acompanhar sua jornada em 12 ciclos, lista de convidados e indicação de amigas; 3) Módulos de captação com links rastreáveis (/r/), formulários inteligentes (/f/) e convites digitais (/convite). A infraestrutura utiliza banco relacional PostgreSQL Supabase e armazenamento de mídia no Cloudflare R2.',
    steps: [
      {
        stepNumber: 1,
        title: 'Entrada e Qualificação de Leads',
        action: 'O lead é capturado via campanha de tráfego (/r/:slug), formulário web (/f/:slug) ou indicação enviada diretamente pelo app de uma debutante.',
        details: 'O sistema cataloga o contato no funil com pontuação automática (Lead Scoring) e distribui para a equipe de pré-vendas (SDR).',
      },
      {
        stepNumber: 2,
        title: 'Agendamento de Degustação e Fechamento',
        action: 'O time comercial agenda a degustação gastronômica na unidade desejada pelo módulo de compromissos.',
        details: 'Durante o evento presencial, o Closer apresenta a proposta e registra o fechamento do contrato no F5 System.',
      },
      {
        stepNumber: 3,
        title: 'Ativação do Aplicativo da Debutante',
        action: 'A debutante recebe seu acesso VIP e visualiza o vídeo imersivo da casa de festas no primeiro acesso.',
        details: 'Ela instala o app no celular (PWA), gerencia os convidados, personaliza o convite digital e indica amigas para ganhar pontos.',
      },
      {
        stepNumber: 4,
        title: 'Gamificação e Bonificação em Tempo Real',
        action: 'Quando uma amiga indicada é validada pela equipe comercial no CRM, a debutante ganha pontos imediatos.',
        details: 'O app dispara uma notificação sonora celebrando a conquista de pontos para resgate de benefícios exclusivos na festa.',
      }
    ],
    businessRules: [
      'Toda debutante ativa no F5 System possui um identificador (slug) único.',
      'As casas de eventos cadastradas possuem configurações isoladas de lotação, fotos, logotipo e vídeo de boas-vindas.',
      'A sincronização entre o CRM e o App da Debutante ocorre instantaneamente via WebSockets em tempo real.'
    ],
    vipTips: [
      'Consulte os tutoriais nesta Wiki para conhecer os fluxos detalhados de cada módulo do F5 System.'
    ],
    tags: ['f5 system', 'ecossistema', 'arquitetura', 'visão geral', 'pwa', 'crm', 'debutantes', 'fluxo']
  },

  // ==========================================
  // 2. CRM & GESTÃO COMERCIAL
  // ==========================================
  {
    id: 'kanban-crm-funil',
    title: 'Funil de Vendas (Kanban CRM): Operação e Movimentação',
    category: 'crm',
    categoryLabel: 'CRM & Gestão Comercial',
    targetAudience: ['Comercial', 'SDR', 'Closer', 'Gerência/Master'],
    summary: 'Guia de operação diária do Kanban comercial do F5 System, filtros avançados, etapas de qualificação e ações em massa.',
    howItWorks: 'O Kanban organiza as oportunidades comerciais em colunas: Novos Leads, Contato Iniciado, Degustação Agendada, Proposta Apresentada, Negociação, Ganho (Fechado) e Perdido. Os cartões exibem a foto do lead, unidade de interesse, pontuação de perfil (Lead Score), tags personalizadas, origem do tráfego e botão para acionar o WhatsApp.',
    steps: [
      {
        stepNumber: 1,
        title: 'Filtragem de Oportunidades',
        action: 'Selecione a Casa de Festa no topo do painel para focar nos atendimentos daquela unidade ou selecione "Todas as Casas".',
        details: 'Aplique filtros por responsável (SDR/Closer), temperatura do lead (Quente, Morno, Frio) ou pesquise por nome e telefone.',
        tips: 'Pressione Enter na barra de busca para localizar o lead instantaneamente.'
      },
      {
        stepNumber: 2,
        title: 'Cadastro Manual de Lead',
        action: 'Clique no botão "+ Novo Lead" no topo do Kanban.',
        details: 'Preencha o Nome da Debutante, Telefone/WhatsApp, Nome dos Pais, Data prevista do Evento, Unidade e Origem. Clique em "Salvar Lead".',
      },
      {
        stepNumber: 3,
        title: 'Movimentação entre Etapas',
        action: 'Arraste e solte o cartão do lead de uma coluna para a outra conforme o atendimento evolui.',
        details: 'Ao mover para "Ganho", o sistema solicita o valor final do contrato para alimentar os relatórios de faturamento.',
      },
      {
        stepNumber: 4,
        title: 'Atendimento via WhatsApp',
        action: 'Clique no ícone de WhatsApp presente no cartão do lead.',
        details: 'O F5 System abre o aplicativo oficial do WhatsApp com o número já formatado para conversa imediata.',
      }
    ],
    businessRules: [
      'Leads que chegam via indicação de debutantes recebem automaticamente a etiqueta "Indicação Debutante" e o nome da indicadora.',
      'O cancelamento ou perda de um lead exige o preenchimento obrigatório do motivo da perda (ex: Preço, Data Indisponível, Localidade).',
      'Leads fechados podem ser convertidos diretamente em Debutantes Ativas com acesso ao aplicativo da festa.'
    ],
    vipTips: [
      'Priorize os leads com Lead Score alto (acima de 70 pontos): representam famílias com data definida e alto potencial de contratação.'
    ],
    tags: ['kanban', 'funil', 'crm', 'leads', 'vendas', 'whatsapp', 'f5 system']
  },

  {
    id: 'lead-inspector-validacao',
    title: 'Ficha do Lead (Inspector) & Validação de Indicação (+1 Ponto)',
    category: 'crm',
    categoryLabel: 'CRM & Gestão Comercial',
    targetAudience: ['Comercial', 'SDR', 'Closer', 'Gerência/Master'],
    summary: 'Como auditar a ficha completa de um lead, registrar notas de atendimento, atribuir SDR/Closer e validar indicações de debutantes com bonificação em tempo real.',
    howItWorks: 'O Lead Inspector é a central de atendimento 360° de cada oportunidade. Ele reúne dados cadastrais, histórico de interações, agendamentos e notas internas. No topo da aba Principal, há o bloco dedicado de validação de indicações.',
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir o Lead Inspector',
        action: 'Clique sobre qualquer cartão no Kanban comercial.',
        details: 'O painel lateral se expande com o cabeçalho compacto exibindo nome, contatos, unidade e data prevista do evento.',
      },
      {
        stepNumber: 2,
        title: 'Identificar Indicação Pendente',
        action: 'Verifique o card de destaque posicionado logo acima de "1. Responsáveis Comerciais".',
        details: 'Se a oportunidade veio de uma debutante e ainda não foi validada, o botão "Validar Lead (+1 pt para debutante)" estará ativo.',
      },
      {
        stepNumber: 3,
        title: 'Conferir Elegibilidade e Validar',
        action: 'Após verificar que se trata de uma debutante real com interesse em realizar festa, clique em "Validar Lead (+1 pt)".',
        details: 'O sistema grava a validação no banco de dados, bonifica a debutante que indicou com +1 ponto e dispara um alerta sonoro no celular dela.',
        tips: 'O botão é substituído pelo badge verde "Indicação Validada ✓", evitando bonificações duplicadas.'
      },
      {
        stepNumber: 4,
        title: 'Definir SDR e Closer Responsáveis',
        action: 'Selecione os membros da equipe nos campos de responsáveis.',
        details: 'O lead passa a constar nos filtros de produtividade individual de cada colaborador.',
      },
      {
        stepNumber: 5,
        title: 'Registrar Notas de Atendimento',
        action: 'Acesse a aba "Notas & Observações" para adicionar o resumo de conversas e preferências da família.',
        details: 'Cada nota recebe data, hora e assinatura do colaborador para auditoria.',
      }
    ],
    businessRules: [
      'A validação só é exibida para leads gerados por indicação de debutantes.',
      'A pontuação é creditada no ciclo ativo da debutante no momento da validação.',
      'Apenas usuários autorizados podem estornar uma validação concedida.'
    ],
    vipTips: [
      'Valide as indicações o quanto antes: o feedback imediato motiva a debutante a indicar ainda mais amigas da escola e do condomínio!'
    ],
    tags: ['lead inspector', 'validação', 'indicação', 'pontuação', 'sdr', 'closer', 'f5 system']
  },

  {
    id: 'compromissos-degustacoes',
    title: 'Compromissos & Degustações: Agendamento Corporativo e Persistência',
    category: 'crm',
    categoryLabel: 'CRM & Gestão Comercial',
    targetAudience: ['Comercial', 'SDR', 'Closer', 'Pós-Venda', 'Gerência/Master'],
    summary: 'Tutorial completo de agendamento de degustações, reuniões contratuais e visitas aos salões com persistência no Supabase e sincronização em tempo real.',
    howItWorks: 'O módulo de compromissos do F5 System centraliza a agenda de atendimentos presenciais e virtuais. Os compromissos são salvos na tabela public.appointments e contam com filtros por ícones SVG vetoriais (Degustações, Reuniões, Contratos e Visitas Técnicas).',
    steps: [
      {
        stepNumber: 1,
        title: 'Acessar a Agenda de Compromissos',
        action: 'Abra o módulo "Compromissos" no menu lateral do CRM.',
        details: 'A listagem exibe todos os eventos organizados por data, hora e unidade.',
      },
      {
        stepNumber: 2,
        title: 'Criar Novo Agendamento',
        action: 'Clique em "+ Novo Compromisso".',
        details: 'O modal inteligente de agendamento é carregado na tela.',
      },
      {
        stepNumber: 3,
        title: 'Vincular Debutante e Casa de Festa',
        action: 'Pesquise e selecione a debutante atendida.',
        details: 'O card de contexto carrega automaticamente a foto da aniversariante e o salão contratado.',
      },
      {
        stepNumber: 4,
        title: 'Escolher Categoria e Data/Hora',
        action: 'Clique no botão da categoria correspondente (Degustação, Reunião, Contrato ou Visita Técnica).',
        details: 'Defina a data no calendário e os horários de início e término do compromisso.',
      },
      {
        stepNumber: 5,
        title: 'Definir Responsável Corporativo',
        action: 'Selecione o colaborador corporativo que conduzirá a reunião (Gerente, Closer, Pós-Venda ou Master).',
        details: 'O modal exibe o avatar do colaborador, cargo e atalho para WhatsApp.',
      },
      {
        stepNumber: 6,
        title: 'Confirmar e Salvar',
        action: 'Clique em "Confirmar Agendamento".',
        details: 'O compromisso é salvo no banco de dados e refletido em tempo real para toda a equipe.',
      }
    ],
    businessRules: [
      'Status disponíveis: Agendado, Confirmado e Concluído.',
      'Os compromissos ficam salvos permanentemente no banco e não são perdidos ao atualizar a página.',
      'Quando o status é alterado para "Concluído", o compromisso é gravado no histórico da cliente.'
    ],
    vipTips: [
      'Mude o status para "Confirmado" assim que a família confirmar presença por telefone no dia anterior à degustação.'
    ],
    tags: ['compromissos', 'degustação', 'agenda', 'pós-venda', 'reunião', 'f5 system']
  },

  {
    id: 'gestao-debutantes-admin',
    title: 'Gestão de Debutantes: Cadastro, Unidades e Acessos',
    category: 'crm',
    categoryLabel: 'CRM & Gestão Comercial',
    targetAudience: ['Comercial', 'Pós-Venda', 'Gerência/Master'],
    summary: 'Como cadastrar novas debutantes, vincular ao salão de festa, gerenciar o link do aplicativo, ciclo atual e status de ativação.',
    howItWorks: 'O painel de Debutantes reúne todos os contratos ativos do F5 System. Cada debutante possui dados de contato, data da festa, unidade contratada, ciclo gamificado atual (1 a 12), pontuação acumulada e contagem de convidados cadastrados.',
    steps: [
      {
        stepNumber: 1,
        title: 'Cadastrar Nova Debutante',
        action: 'Acesse o menu "Debutantes" e clique em "+ Nova Debutante".',
        details: 'Preencha o Nome Completo, Data da Festa, Unidade Contratada, WhatsApp e E-mail de Contato.',
      },
      {
        stepNumber: 2,
        title: 'Configurar o Identificador (Slug)',
        action: 'O F5 System gera o slug amigável automaticamente (ex: maria-clara-2027).',
        details: 'Você pode editar o slug conforme a preferência da cliente.',
      },
      {
        stepNumber: 3,
        title: 'Compartilhar Link do Aplicativo',
        action: 'Clique em "Copiar Link do App" na linha correspondente à debutante.',
        details: 'Envie o link diretamente para o WhatsApp da aniversariante e de seus responsáveis para iniciarem o uso.',
      },
      {
        stepNumber: 4,
        title: 'Ajuste de Pontos e Ciclos',
        action: 'Caso seja necessário bonificar a debutante manualmente, abra os detalhes e edite o saldo de pontos.',
        details: 'O saldo é atualizado imediatamente no celular da aniversariante.',
      }
    ],
    businessRules: [
      'Debutantes com status "Inativa" não conseguem carregar as funcionalidades do app.',
      'A data cadastrada da festa comanda o cálculo da contagem regressiva no app móvel.',
      'A exclusão de debutantes é restrita a administradores e remove em cascata convidados e compromissos vinculados.'
    ],
    vipTips: [
      'Utilize a opção "Ver como Debutante" no CRM para auditar exatamente como a aniversariante visualiza a jornada no celular dela.'
    ],
    tags: ['debutantes', 'cadastro', 'unidades', 'slug', 'acesso', 'ciclo', 'f5 system']
  },

  {
    id: 'gestao-venues-unidades',
    title: 'Unidades & Salões de Festas (Venues): Configuração e Mídias',
    category: 'crm',
    categoryLabel: 'CRM & Gestão Comercial',
    targetAudience: ['Gerência/Master', 'Desenvolvedor'],
    summary: 'Como configurar as casas de eventos no F5 System, limites de convidados, logotipo e vídeo de boas-vindas do PWA.',
    howItWorks: 'O F5 System opera em modelo multi-unidade. Cada casa de festa possui identidade visual própria, capacidade máxima do salão, vídeo de abertura de onboarding e metas comerciais independentes.',
    steps: [
      {
        stepNumber: 1,
        title: 'Acessar Gestão de Casas de Festas',
        action: 'No menu lateral, clique em "Unidades" (ícone Building2).',
        details: 'A tela lista todas as filiais cadastradas com fotos de capa, endereço e capacidade.',
      },
      {
        stepNumber: 2,
        title: 'Cadastrar ou Editar Unidade',
        action: 'Clique em "Nova Unidade" ou no ícone de lápis para editar um salão existente.',
        details: 'Informe o Nome Oficial, Capacidade Máxima Recomendada de Convidados e Endereço Completo.',
      },
      {
        stepNumber: 3,
        title: 'Upload de Logo e Vídeo de Boas-Vindas',
        action: 'Utilize o campo de upload para enviar a logo em PNG transparente e o vídeo de apresentação em MP4.',
        details: 'As mídias são transmitidas com segurança para o bucket do Cloudflare R2.',
      },
      {
        stepNumber: 4,
        title: 'Salvar Configurações',
        action: 'Clique em "Salvar Unidade".',
        details: 'As definições passam a valer imediatamente para todas as debutantes vinculadas àquela unidade.',
      }
    ],
    businessRules: [
      'A capacidade cadastrada do salão é utilizada para alertar a debutante quando sua lista de convidados ultrapassar o limite.',
      'Se não houver vídeo de boas-vindas cadastrado, a debutante entra diretamente na tela inicial da jornada.'
    ],
    vipTips: [
      'Envie vídeos verticais (9:16) em alta definição mostrando o salão decorado com iluminação cênica para impressionar a debutante no primeiro acesso.'
    ],
    tags: ['unidades', 'venues', 'salão', 'capacidade', 'vídeo', 'logo', 'r2', 'f5 system']
  },

  {
    id: 'equipe-colaboradores-permissoes',
    title: 'Equipe Comercial & Níveis de Permissão (Roles)',
    category: 'crm',
    categoryLabel: 'CRM & Gestão Comercial',
    targetAudience: ['Gerência/Master', 'Desenvolvedor'],
    summary: 'Conheça os papéis de acesso do F5 System (Master, CRM, SDR, Closer, Pós-Venda e Dev) e como gerenciar colaboradores.',
    howItWorks: 'O F5 System aplica controle de acesso baseado em papéis (RBAC). Cada colaborador possui perfil profissional com foto, número de WhatsApp para contato com clientes e permissões específicas.',
    steps: [
      {
        stepNumber: 1,
        title: 'Acessar Colaboradores',
        action: 'No menu lateral do CRM, clique em "Colaboradores".',
        details: 'A tela exibe os membros ativos com foto, cargo, e-mail e telefone.',
      },
      {
        stepNumber: 2,
        title: 'Cadastrar Colaborador',
        action: 'Clique em "+ Novo Colaborador".',
        details: 'Informe Nome, E-mail corporativo, WhatsApp e selecione o Cargo.',
      },
      {
        stepNumber: 3,
        title: 'Definição das Funções',
        action: 'Escolha o papel adequado:',
        details: '• Master: Acesso total a configurações financeiras e operacionais;\n• CRM/Gerente: Gestão da equipe comercial e redistribuição de leads;\n• Closer: Atendimento e fechamento presencial em degustações;\n• SDR: Qualificação inicial de leads e agendamento de degustações;\n• Pós-Venda: Acompanhamento da debutante e reuniões técnicas;\n• Dev: Monitoramento do sistema e recursos técnicos.',
      }
    ],
    businessRules: [
      'Apenas administradores Master podem alterar permissões de outros colaboradores.',
      'O e-mail de acesso deve ser único no sistema.',
      'Colaboradores inativados têm o acesso bloqueado imediatamente.'
    ],
    vipTips: [
      'Mantenha a foto e o WhatsApp dos colaboradores atualizados: esses dados aparecem nos cards de agendamento de degustações.'
    ],
    tags: ['equipe', 'colaboradores', 'permissões', 'roles', 'sdr', 'closer', 'f5 system']
  },

  // ==========================================
  // 3. APP DA DEBUTANTE (PWA)
  // ==========================================
  {
    id: 'onboarding-video-debutante',
    title: 'Onboarding da Debutante & Instalação do App (PWA)',
    category: 'debutante',
    categoryLabel: 'App da Debutante (PWA)',
    targetAudience: ['Debutante', 'Pós-Venda', 'Comercial'],
    summary: 'Como funciona o primeiro acesso da debutante no F5 System, o vídeo de boas-vindas e a instalação do aplicativo no celular.',
    howItWorks: 'Ao abrir o link único fornecido pela equipe, o F5 System detecta se é o primeiro acesso da aniversariante. Se for, é reproduzido o vídeo imersivo da casa de festa onde acontecerá a celebração, com orientações para adicionar o app à tela inicial do smartphone sem necessidade de baixar da loja de aplicativos.',
    steps: [
      {
        stepNumber: 1,
        title: 'Acessar o Link Exclusivo',
        action: 'A debutante abre o link enviado pelo WhatsApp no navegador do celular.',
        details: 'A tela de boas-vindas com o nome dela e o brasão da unidade é carregada.',
      },
      {
        stepNumber: 2,
        title: 'Assistir ao Vídeo de Boas-Vindas',
        action: 'O vídeo de apresentação da casa é exibido em tela cheia.',
        details: 'Ao finalizar o vídeo, o botão "Iniciar Minha Experiência VIP" é liberado.',
      },
      {
        stepNumber: 3,
        title: 'Instalar na Tela Inicial (PWA)',
        action: 'O sistema orienta a fixação do ícone na tela de início do iPhone ou Android.',
        details: 'O ícone gerado traz o brasão dourado da casa de festas, comportando-se como um app nativo.',
      }
    ],
    businessRules: [
      'Após assistido, o status de onboarding é gravado no banco de dados para não repetir.',
      'O app funciona de modo leve e rápido em qualquer aparelho móvel.'
    ],
    vipTips: [
      'Os pais da debutante também podem abrir o mesmo link em seus celulares para acompanhar o planejamento da festa juntos!'
    ],
    tags: ['onboarding', 'vídeo', 'pwa', 'instalação', 'debutante', 'boas-vindas', 'f5 system']
  },

  {
    id: 'trilha-12-ciclos-gamificacao',
    title: 'Trilha Gamificada de 12 Ciclos & Contagem Regressiva',
    category: 'debutante',
    categoryLabel: 'App da Debutante (PWA)',
    targetAudience: ['Debutante', 'Pós-Venda'],
    summary: 'Entenda como funcionam os 12 ciclos da jornada da debutante, a contagem de dias para a festa e como conquistar pontos.',
    howItWorks: 'O F5 System divide o tempo de preparação em 12 ciclos progressivos. No topo da tela, um banner estilizado exibe a contagem regressiva exata de dias para a festa. A debutante ganha pontos ao cumprir tarefas, confirmar convidados e indicar amigas.',
    steps: [
      {
        stepNumber: 1,
        title: 'Acompanhar o Ciclo Atual',
        action: 'Na aba "Jornada", visualize a trilha vertical com os marcos dos 12 ciclos.',
        details: 'O ciclo atual fica destacado com o objetivo de pontuação para o próximo nível.',
      },
      {
        stepNumber: 2,
        title: 'Conquistar Pontos',
        action: 'A debutante ganha pontos ao:',
        details: '• Cadastrar seus primeiros 50 convidados na lista (+1 pt);\n• Compartilhar o convite digital com os amigos (+1 pt);\n• Ter amigos confirmando presença pelo link oficial (+1 pt);\n• Indicar amigas que também vão fazer 15 anos (+1 pt para cada lead validado pelo comercial).',
      },
      {
        stepNumber: 3,
        title: 'Desbloquear Conquistas e Prêmios',
        action: 'Ao atingir os pontos necessários, uma animação com confetes celebra a conquista.',
        details: 'Novos benefícios VIP são liberados no Hub de Benefícios da festa.',
      }
    ],
    businessRules: [
      'A contagem regressiva calcula os dias entre hoje e a data cadastrada do evento.',
      'Os ciclos concluídos ficam salvos permanentemente com check dourado.',
      'Os benefícios conquistados permanecem disponíveis para resgate até o prazo final do evento.'
    ],
    vipTips: [
      'Quanto mais cedo a debutante indicar amigas da escola, mais rápido ela atinge as pontuações máximas para prêmios como Robô de LED ou Cabine de Fotos.'
    ],
    tags: ['ciclos', 'gamificação', 'jornada', 'pontos', 'contagem regressiva', 'prêmios', 'f5 system']
  },

  {
    id: 'gestao-convidados-capacidade',
    title: 'Lista de Convidados, Capacidade do Salão e Filtros',
    category: 'debutante',
    categoryLabel: 'App da Debutante (PWA)',
    targetAudience: ['Debutante', 'Pós-Venda'],
    summary: 'Como organizar a lista de convidados, controlar pagantes/crianças, acompanhar confirmações de presença e respeitar o limite do salão.',
    howItWorks: 'A aba "Convidados" reúne os cartões de controle: Total de Convidados, Confirmados (RSVP Sim), Pendentes e Recusados. A debutante pode filtrar por abas (Todos, Confirmados, Pendentes e Removidos) e acompanhar o medidor de lotação.',
    steps: [
      {
        stepNumber: 1,
        title: 'Adicionar Convidado',
        action: 'Clique em "+ Adicionar Convidado".',
        details: 'Preencha Nome, Categoria (Família, Amigos da Escola, etc.), Telefone e Idade (Adulto ou Criança).',
      },
      {
        stepNumber: 2,
        title: 'Monitorar Capacidade da Casa',
        action: 'Observe o indicador de capacidade no topo da lista.',
        details: 'O indicador sinaliza a quantidade de convidados cadastrados em relação à capacidade máxima do espaço contratado.',
      },
      {
        stepNumber: 3,
        title: 'Confirmar Presença Manualmente',
        action: 'Se alguém confirmar diretamente com os pais, basta alterar o status no card do convidado para "Confirmado".',
        details: 'O contador de confirmados sobe na mesma hora.',
      },
      {
        stepNumber: 4,
        title: 'Remover ou Restaurar Convidado',
        action: 'Convidados removidos vão para a sub-aba "Removidos".',
        details: 'Eles podem ser restaurados a qualquer momento com um toque, sem perda de histórico.',
      }
    ],
    businessRules: [
      'Crianças menores de 5 anos podem ser identificadas como não pagantes conforme contrato.',
      'A lista pode ser baixada para conferência na portaria da festa.',
      'Confirmações enviadas pelo convite digital atualizam o status em tempo real.'
    ],
    vipTips: [
      'Envie os convites com 45 a 60 dias de antecedência para garantir a confirmação completa da lista antes da reunião final do buffet.'
    ],
    tags: ['convidados', 'capacidade', 'rsvp', 'confirmação', 'lista', 'lotação', 'f5 system']
  },

  {
    id: 'convite-digital-landing-page',
    title: 'Convite Digital Interativo & Landing Page de RSVP (/convite)',
    category: 'debutante',
    categoryLabel: 'App da Debutante (PWA)',
    targetAudience: ['Debutante', 'Pós-Venda', 'Todos'],
    summary: 'Como funciona o convite digital interativo com foto personalizada, contagem regressiva, confirmação online e página pública para convidados.',
    howItWorks: 'O convite digital pode ser enviado por link para cada convidado ou compartilhado de forma geral. A página é personalizada com a foto oficial da debutante, mapa interativo do local da festa, contagem regressiva e campo para confirmação de presença e recados.',
    steps: [
      {
        stepNumber: 1,
        title: 'Configurar Foto do Convite',
        action: 'No app da debutante, clique em "Configurar Convite" na aba Convidados.',
        details: 'Envie a foto oficial do ensaio pré-15 anos através do botão de upload conectado ao Cloudflare R2.',
        tips: 'A imagem é otimizada automaticamente para carregamento ultrarrápido.'
      },
      {
        stepNumber: 2,
        title: 'Compartilhar o Link',
        action: 'Copie o link do convite ou toque no atalho de WhatsApp.',
        details: 'Envie para familiares e amigos.',
      },
      {
        stepNumber: 3,
        title: 'Confirmação pelo Convidado',
        action: 'O convidado acessa o link, confere as informações e confirma sua presença informando acompanhantes.',
        details: 'Ele também pode deixar uma mensagem de carinho para a debutante.',
      },
      {
        stepNumber: 4,
        title: 'Notificação para a Aniversariante',
        action: 'O celular da debutante recebe um alerta imediato com o nome do amigo que confirmou!',
        details: 'O convidado passa automaticamente para a lista de Confirmados.',
      }
    ],
    businessRules: [
      'A página exibe dinamicamente o nome real cadastrado da aniversariante.',
      'O prazo limite de confirmação (RSVP) pode ser definido nas configurações do convite.'
    ],
    vipTips: [
      'Utilize uma foto vertical com boa iluminação: ela será a identidade visual do seu convite!'
    ],
    tags: ['convite digital', 'landing page', 'rsvp', 'confirmação pública', 'foto do convite', 'r2', 'f5 system']
  },

  {
    id: 'indicacao-amigas-fluxo',
    title: 'Programa de Indicação de Amigas (10 a 15 anos): Sem Exclusão e com Pontos',
    category: 'debutante',
    categoryLabel: 'App da Debutante (PWA)',
    targetAudience: ['Debutante', 'Comercial', 'Pós-Venda'],
    summary: 'Como funciona a indicação de amigas direto pelo card de convidados (sem removê-las da festa) e como acumular pontos no CRM.',
    howItWorks: 'Toda convidada na faixa etária de 10 a 15 anos exibe o botão "Indicar Amiga ✨". Ao indicar, a amiga PERMANECE normalmente na lista oficial de convidados da festa e é duplicada como um novo lead qualificado no CRM do F5 System.',
    steps: [
      {
        stepNumber: 1,
        title: 'Cadastrar Convidada com Idade',
        action: 'Adicione a amiga e informe a idade (entre 10 e 15 anos).',
        details: 'O card dela exibe o botão de indicação "Indicar Amiga ✨".',
      },
      {
        stepNumber: 2,
        title: 'Efetuar a Indicação',
        action: 'Toque no botão de indicação no card da amiga.',
        details: 'O F5 System confirma os dados e encaminha o lead ao time comercial sem retirar a amiga da lista da festa.',
      },
      {
        stepNumber: 3,
        title: 'Proteção contra Duplicidades (Badge Permanente)',
        action: 'A convidada recebe a marcação is_referred: true.',
        details: 'O botão é travado e exibe o badge "Amiga Indicada ✨", evitando envios repetidos.',
      },
      {
        stepNumber: 4,
        title: 'Acompanhar Status no App',
        action: 'Na aba "Indicações", a debutante visualiza o andamento do atendimento da amiga.',
        details: 'Quando o comercial valida o lead no CRM, a debutante ganha +1 ponto imediatamente.',
      }
    ],
    businessRules: [
      'O botão de indicação rápida é ativado exclusivamente para idades de 10 a 15 anos.',
      'A amiga indicada NUNCA é removida da contagem de convidados do evento.',
      'A debutante também pode indicar amigas que não vão à festa através da aba "Indicações".'
    ],
    vipTips: [
      'Avise a amiga que ela receberá um convite especial para conhecer a casa de festas com degustação de cortesia!'
    ],
    tags: ['indicações', 'amigas', '10 a 15 anos', 'duplicação lead', 'pontos', 'is_referred', 'f5 system']
  },

  {
    id: 'perfil-avatar-debutante',
    title: 'Foto de Perfil da Debutante: Troca Rápida via Cloudflare R2',
    category: 'debutante',
    categoryLabel: 'App da Debutante (PWA)',
    targetAudience: ['Debutante', 'Pós-Venda'],
    summary: 'Como a debutante altera sua foto de perfil tocando no avatar do cabeçalho com upload direto e seguro para o bucket R2.',
    howItWorks: 'O avatar da aniversariante no cabeçalho do app é clicável. Ao tocar nele, o F5 System abre o modal de troca de foto com upload direto para o bucket seguro do Cloudflare R2.',
    steps: [
      {
        stepNumber: 1,
        title: 'Tocar na Foto de Perfil',
        action: 'No topo do app, toque na foto circular da debutante.',
        details: 'O modal "Atualizar Foto de Perfil" é aberto.',
      },
      {
        stepNumber: 2,
        title: 'Escolher Nova Foto',
        action: 'Toque em "Escolher Nova Foto" para selecionar da galeria do celular ou tirar uma foto.',
        details: 'A imagem é comprimida e transmitida ao Cloudflare R2.',
      },
      {
        stepNumber: 3,
        title: 'Salvar Alteração',
        action: 'Toque em "Salvar Foto".',
        details: 'A nova foto passa a ser exibida no cabeçalho do app e na ficha da cliente no CRM.',
      }
    ],
    businessRules: [
      'Formatos aceitos: JPG, PNG, WEBP e HEIC.',
      'A foto é vinculada permanentemente ao registro da debutante.',
      'O avatar no CRM comercial atualiza automaticamente.'
    ],
    vipTips: [
      'Atualize a foto sempre que fizer um novo ensaio fotográfico para deixar o app com a cara oficial da sua festa!'
    ],
    tags: ['perfil', 'avatar', 'foto', 'upload', 'r2', 'cabeçalho', 'f5 system']
  },

  // ==========================================
  // 4. LINKS PÚBLICOS & CAPTAÇÃO
  // ==========================================
  {
    id: 'links-rastreaveis-r-slug',
    title: 'Links Rastreáveis (/r/:slug) & Atribuição de Tráfego',
    category: 'public_links',
    categoryLabel: 'Links Públicos & Captação',
    targetAudience: ['Comercial', 'Gerência/Master', 'Desenvolvedor'],
    summary: 'Como funcionam os links curtos de redirecionamento /r/:slug para campanhas de marketing e atribuição de indicações com parâmetros UTM.',
    howItWorks: 'A rota /r/:slug intercepta o visitante, computa as métricas de clique, lê as tags UTM e redireciona imediatamente para o WhatsApp da equipe comercial ou para a página da unidade.',
    steps: [
      {
        stepNumber: 1,
        title: 'Criar Link de Campanha',
        action: 'No CRM do F5 System, acesse a gestão de fontes de tráfego e gere o slug desejado.',
        details: 'Defina a mensagem de destino para o WhatsApp.',
      },
      {
        stepNumber: 2,
        title: 'Divulgar nas Mídias',
        action: 'Utilize o link em anúncios do Instagram, parcerias ou QR Codes.',
        details: 'O contador de acessos é registrado em tempo real no dashboard.',
      },
      {
        stepNumber: 3,
        title: 'Atribuição Automática',
        action: 'Quando o contato envia mensagem no WhatsApp, a origem da campanha já está identificada.',
        details: 'A equipe comercial sabe de qual anúncio ou canal o cliente veio.',
      }
    ],
    businessRules: [
      'Cada slug é único no sistema.',
      'Slugs inexistentes são redirecionados com segurança para a página principal.'
    ],
    vipTips: [
      'Gere links diferentes para cada rede social para saber qual canal traz mais famílias interessadas.'
    ],
    tags: ['links rastreáveis', 'redirecionamento', 'utm', 'tráfego', 'campanhas', 'marketing', 'f5 system']
  },

  {
    id: 'formulario-publico-f-slug',
    title: 'Formulário Público de Cadastro (/f/:slug)',
    category: 'public_links',
    categoryLabel: 'Links Públicos & Captação',
    targetAudience: ['Comercial', 'Todos'],
    summary: 'Página pública de captura de pré-cadastro para famílias interessadas em orçamentos e informações de 15 anos.',
    howItWorks: 'A rota /f/:slug exibe uma página rápida e focada em conversão para que famílias solicitem orçamentos, informando data desejada, quantidade estimada de convidados e contatos dos pais.',
    steps: [
      {
        stepNumber: 1,
        title: 'Acessar o Formulário',
        action: 'O cliente abre o link em qualquer navegador.',
        details: 'O design é responsivo e otimizado para preenchimento rápido em celulares.',
      },
      {
        stepNumber: 2,
        title: 'Envio dos Dados',
        action: 'A família preenche os campos e clica em enviar.',
        details: 'A validação impede números de telefone incompletos.',
      },
      {
        stepNumber: 3,
        title: 'Entrada Automática no CRM',
        action: 'O lead entra na primeira coluna do Kanban comercial com a etiqueta da campanha.',
        details: 'O SDR é acionado para iniciar o atendimento.',
      }
    ],
    businessRules: [
      'Campos obrigatórios: Nome da debutante e Telefone de contato.',
      'Proteção integrada contra envios automatizados e spam.'
    ],
    vipTips: [
      'Disponibilize o link do formulário em parcerias com colégios e fornecedores de eventos.'
    ],
    tags: ['formulário público', 'captura', 'orçamento', 'leads', 'landing page', 'f5 system']
  },

  // ==========================================
  // 5. ARQUITETURA & INFRAESTRUTURA TÉCNICA
  // ==========================================
  {
    id: 'arquitetura-tecnica-supabase-r2',
    title: 'Arquitetura Técnica: Supabase, Cloudflare R2 e Realtime',
    category: 'technical',
    categoryLabel: 'Arquitetura & Infraestrutura',
    targetAudience: ['Desenvolvedor', 'Gerência/Master'],
    summary: 'Documentação profunda da stack tecnológica: React 18, TypeScript, Supabase PostgreSQL, RLS, WebSockets Realtime e Cloudflare R2.',
    howItWorks: 'O F5 System é construído com React 18 SPA e TypeScript, empacotado via Vite. O backend opera em Supabase PostgreSQL com Row Level Security (RLS) e sincronização via WebSockets Realtime. O armazenamento de mídias (fotos e vídeos) utiliza Cloudflare R2 com CDN global.',
    steps: [
      {
        stepNumber: 1,
        title: 'Estrutura de Tabelas Principais',
        action: 'As principais tabelas do PostgreSQL incluem:',
        details: '• public.debutantes: Perfil, unidade, ciclo, pontos, status;\n• public.appointments: Compromissos, degustações e responsáveis corporativos;\n• public.guests: Lista de convidados, status de RSVP e flag is_referred;\n• public.leads: Pipeline comercial, lead scoring e responsáveis SDR/Closer;\n• public.venues: Casas de festas, capacidade e mídias de apresentação;\n• public.collaborators: Equipe com cargos e permissões de acesso.',
      },
      {
        stepNumber: 2,
        title: 'Sincronização em Tempo Real',
        action: 'O F5 System mantém canais de escuta via WebSockets nas tabelas ativas.',
        details: 'Qualquer alteração feita por um usuário é replicada imediatamente para todos os dispositivos conectados sem necessidade de recarregar a tela.',
      },
      {
        stepNumber: 3,
        title: 'Armazenamento em Nuvem (Cloudflare R2)',
        action: 'Uploads de fotos e vídeos são processados e enviados diretamente ao Cloudflare R2.',
        details: 'Proporciona velocidade máxima de entrega sem custos abusivos de largura de banda.',
      }
    ],
    businessRules: [
      'Chaves de serviço e credenciais restritas nunca são incluídas no código cliente.',
      'O build de produção é auditado contra falhas de tipagem estrita com TypeScript compiler (tsc).'
    ],
    vipTips: [
      'Sempre teste as migrações em ambiente de homologação antes de aplicar no banco de produção.'
    ],
    tags: ['técnico', 'supabase', 'postgresql', 'cloudflare r2', 'realtime', 'react', 'typescript', 'f5 system']
  },

  {
    id: 'variaveis-ambiente-deploy',
    title: 'Variáveis de Ambiente & Procedimento de Deploy',
    category: 'technical',
    categoryLabel: 'Arquitetura & Infraestrutura',
    targetAudience: ['Desenvolvedor'],
    summary: 'Lista de variáveis de ambiente necessárias (.env), comandos de compilação e checklist de deploy em produção.',
    howItWorks: 'O F5 System utiliza variáveis prefixadas com VITE_ para parametrização em tempo de build.',
    steps: [
      {
        stepNumber: 1,
        title: 'Variáveis Essenciais (.env)',
        action: 'Configure no arquivo .env:',
        details: '• VITE_SUPABASE_URL: Endpoint do projeto Supabase;\n• VITE_SUPABASE_ANON_KEY: Chave pública de conexão;\n• VITE_R2_PUBLIC_URL: Domínio público do Cloudflare R2 para mídias.',
      },
      {
        stepNumber: 2,
        title: 'Compilação de Produção',
        action: 'Execute o comando: npm run build',
        details: 'O script compila os tipos TypeScript e empacota os ativos na pasta dist/.',
      },
      {
        stepNumber: 3,
        title: 'Deploy em Produção',
        action: 'Envie as alterações para o branch main no repositório.',
        details: 'A esteira de integração contínua (CI/CD) publica a nova versão em poucos segundos.',
      }
    ],
    businessRules: [
      'Sempre valide o build antes de realizar push para a branch principal.',
      'Senhas e chaves privadas nunca devem ser versionadas no git.'
    ],
    vipTips: [
      'Utilize o comando npm run preview para auditar o bundle final antes da entrega.'
    ],
    tags: ['deploy', 'env', 'variáveis', 'vite', 'build', 'ci/cd', 'f5 system']
  },

  // ==========================================
  // 6. FAQ & RESOLUÇÃO DE PROBLEMAS COMUNS
  // ==========================================
  {
    id: 'faq-recuperacao-senha-acesso',
    title: 'FAQ: Esqueci Minha Senha / Problemas de Acesso',
    category: 'faq',
    categoryLabel: 'Dúvidas & Resolução (FAQ)',
    targetAudience: ['Todos', 'Comercial', 'Gerência/Master'],
    summary: 'Como recuperar a senha de acesso ao portal corporativo ou desbloquear o login de um colaborador no F5 System.',
    howItWorks: 'A autenticação opera através de Supabase Auth com envio de e-mails transacionais seguros para redefinição de credenciais.',
    steps: [
      {
        stepNumber: 1,
        title: 'Solicitar Redefinição de Senha',
        action: 'Na tela de login do portal corporativo, clique em "Esqueci minha senha".',
        details: 'O modal de recuperação de senha será exibido.',
      },
      {
        stepNumber: 2,
        title: 'Informar o E-mail Cadastrado',
        action: 'Digite o e-mail corporativo cadastrado e clique em "Enviar Instruções".',
        details: 'Um link seguro de uso único é enviado para a caixa postal informada.',
      },
      {
        stepNumber: 3,
        title: 'Cadastrar Nova Senha',
        action: 'Abra o link recebido no e-mail e registre a nova senha de no mínimo 6 caracteres.',
        details: 'O acesso ao sistema é restabelecido na mesma hora.',
      }
    ],
    businessRules: [
      'O link temporário de recuperação expira em 1 hora por segurança.',
      'Usuários com perfil Master podem resetar a senha de qualquer colaborador diretamente na gestão da equipe.'
    ],
    vipTips: [
      'Caso o e-mail demore a chegar, cheque as pastas de Lixo Eletrônico ou Spam.'
    ],
    tags: ['faq', 'senha', 'recuperação', 'login', 'acesso', 'suporte', 'f5 system']
  },

  {
    id: 'faq-amiga-indicada-duplicada',
    title: 'FAQ: Como funciona a duplicação ao indicar uma amiga?',
    category: 'faq',
    categoryLabel: 'Dúvidas & Resolução (FAQ)',
    targetAudience: ['Debutante', 'Pós-Venda', 'Comercial'],
    summary: 'Dúvidas sobre o que acontece com a lista de convidados quando a debutante indica uma amiga para a festa de 15 anos.',
    howItWorks: 'No F5 System, indicar uma amiga NUNCA retira a convidada da lista oficial do evento. Ela permanece normalmente na contagem de convidados para o buffet e recepção, enquanto uma duplicata é criada no CRM para atendimento comercial.',
    steps: [
      {
        stepNumber: 1,
        title: 'Indicação sem Perda de Convidada',
        action: 'A debutante toca no botão de indicação no card da amiga.',
        details: 'O sistema grava a indicação e mantém a amiga na lista de convidados.',
      },
      {
        stepNumber: 2,
        title: 'Criação do Lead Comercial',
        action: 'Uma cópia da convidada surge no Kanban comercial como "Indicação Debutante".',
        details: 'A equipe comercial entra em contato com a família da amiga com tratamento VIP.',
      },
      {
        stepNumber: 3,
        title: 'Bloqueio de Duplicidade',
        action: 'O card exibe o badge "Amiga Indicada ✨" e o botão é travado.',
        details: 'Isso assegura que a mesma amiga não seja enviada mais de uma vez.',
      }
    ],
    businessRules: [
      'A amiga indicada recebe atenção prioritária do time comercial.',
      'A debutante ganha pontos imediatos assim que o comercial valida o lead no sistema.'
    ],
    vipTips: [
      'A aniversariante pode avisar a amiga com antecedência para que ela aproveite a oportunidade da degustação especial de cortesia!'
    ],
    tags: ['faq', 'indicação', 'duplicação', 'amiga', 'regras', 'dúvidas', 'f5 system']
  },

  {
    id: 'faq-dias-restantes-nan',
    title: 'FAQ: Contagem Regressiva e Correção de Datas',
    category: 'faq',
    categoryLabel: 'Dúvidas & Resolução (FAQ)',
    targetAudience: ['Comercial', 'Pós-Venda', 'Desenvolvedor'],
    summary: 'Como funciona a contagem regressiva da data da festa e a prevenção de erros de formato.',
    howItWorks: 'O banner de contagem regressiva do F5 System possui mecanismo defensivo contra formatos de data inválidos, convertendo qualquer representação (ISO, AAAA-MM-DD, DD/MM/AAAA) para cálculo exato dos dias restantes até a festa.',
    steps: [
      {
        stepNumber: 1,
        title: 'Conferir Data Cadastrada',
        action: 'Na gestão de debutantes do CRM, verifique o campo "Data do Evento".',
        details: 'A data deve corresponder ao dia oficial contratado para a celebração.',
      },
      {
        stepNumber: 2,
        title: 'Normalização Automática',
        action: 'O F5 System salva a data normalizada no banco de dados.',
        details: 'Elimina divergências causadas por fusos horários locais.',
      },
      {
        stepNumber: 3,
        title: 'Exibição no Aplicativo',
        action: 'O aplicativo da debutante exibe o banner com o número exato de dias restantes para o sonho dos 15 anos.',
        details: 'Exemplo: "Faltam 210 dias para o seu Grande Sonho!".',
      }
    ],
    businessRules: [
      'Caso a data da festa já tenha passado, o banner parabeniza a debutante pela conclusão da jornada.'
    ],
    vipTips: [
      'Sempre cadastre a data correta no fechamento do contrato para ativar o ciclo de contagem da debutante.'
    ],
    tags: ['faq', 'data', 'nan', 'contagem regressiva', 'banner', 'datas', 'f5 system']
  }
];
