export interface ChangelogItem {
  id: string;
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'major' | 'feature' | 'improvement' | 'security' | 'fix';
  summary: string;
  badge: string;
  features: {
    name: string;
    description: string;
    status: 'new' | 'improved' | 'deprecated' | 'replaced';
  }[];
}

export const CHANGELOG_DATA: ChangelogItem[] = [
  {
    id: 'deploy-2026-10-30-funnels-split',
    version: 'v2.6.0',
    date: '30 de Outubro de 2026',
    title: 'Acesso Granular a Etapas, Split Sequencial e Blindagem do Funil',
    type: 'major',
    badge: 'Grande Atualização',
    summary: 'Reformulação profunda do motor de controle de acesso a etapas de funis comerciais, nova esteira customizável de distribuição de closers com pesos sequenciais e persistência multiunidades resiliente.',
    features: [
      {
        name: 'Acesso Restrito a Etapas por Colaborador Comercial',
        description: 'Visualização compacta com avatares sobrepostos no topo de cada coluna. Gerentes e Master possuem acesso irrestrito permanente. Apenas operadores comerciais autorizados visualizam etapas específicas.',
        status: 'new',
      },
      {
        name: 'Copiar e Colar Permissões entre Etapas',
        description: 'Ferramenta de replicação instantânea com 1 clique para transferir a configuração de acesso entre múltiplas colunas do pipeline sem trabalho repetitivo.',
        status: 'new',
      },
      {
        name: 'Split de Vendedores com Ordem e Repetição Customizada',
        description: 'Permite montar a fila sequencial de distribuição de closers na ordem exata de atendimento (ex: A, B, B, A), com exibição do cargo executivo real (ex: Closer Sênior) em vez de descrições genéricas.',
        status: 'new',
      },
      {
        name: 'Trava Inteligente de Closer no Lead com Override de Gerência',
        description: 'Com o Split ativo, o campo Closer é bloqueado para operadores de CRM para garantir distribuição justa. Gerentes e Masters mantêm a liberdade de alteração manual para substituição de ausências.',
        status: 'new',
      },
      {
        name: 'Persistência Total de Funis Multiunidades no Supabase',
        description: 'Adequação da constraint de venue_id e sanitização estrita de arrays UUID, garantindo que renomeações, tags e etapas sejam gravadas no banco imediatamente sem falhas.',
        status: 'improved',
      },
    ],
  },
  {
    id: 'deploy-2026-10-29-whatsapp-wysiwyg',
    version: 'v2.5.0',
    date: '29 de Outubro de 2026',
    title: 'Formatação Direta no Chat, Isolamento por Unidade e Novo Catálogo de Mensagens Rápidas',
    type: 'major',
    badge: 'Recursos de WhatsApp',
    summary: 'Aprimoramento da experiência de atendimento via WhatsApp Web integrado com editor de texto formatado em tempo real, isolamento rígido de instâncias por casa e novo modo lista de mensagens rápidas.',
    features: [
      {
        name: 'Editor WYSIWYG Nativo para WhatsApp',
        description: 'A digitação de mensagens agora formata visualmente negrito, itálico e tachado direto na caixa de texto, eliminando caixas de prévia flutuantes e convertendo automaticamente para sintaxe WhatsApp.',
        status: 'new',
      },
      {
        name: 'Isolamento Rígido de Instâncias por Unidade do Lead',
        description: 'Garante que leads cadastrados em uma unidade física só possam ser respondidos através de números de WhatsApp vinculados estritamente àquela unidade, impedindo qualquer vazamento entre casas.',
        status: 'improved',
      },
      {
        name: 'Mensagens Rápidas com Balão WhatsApp e Modo Lista',
        description: 'Suporte a alternância entre modo Cards e modo Lista compacto. Visualização estilizada simulando o balão de chat do WhatsApp com confirmação de leitura.',
        status: 'improved',
      },
      {
        name: 'Menu de Atalhos "/" Simplificado',
        description: 'Busca instantânea indexada com limite de 3 sugestões simultâneas e preenchimento na caixa sem disparos automáticos acidentais.',
        status: 'improved',
      },
    ],
  },
  {
    id: 'deploy-2026-10-28-egress-optimization',
    version: 'v2.4.0',
    date: '28 de Outubro de 2026',
    title: 'Blindagem Definitiva de Egress e Otimização de Realtime',
    type: 'major',
    badge: 'Infraestrutura & Performance',
    summary: 'Redução drástica do consumo mensal de tráfego de saída no Supabase, mantendo a operação dentro da cota gratuita sem degradação na experiência em tempo real.',
    features: [
      {
        name: 'Expurgo de Tabelas de Alto Volume do Realtime',
        description: 'Desativação da publicação em tempo real de tabelas de telemetria bruta e logs pesados (source_events e webhook_logs), eliminando tráfego redundante de background.',
        status: 'improved',
      },
      {
        name: 'Paginação e Janela de Conversas Sob Demanda',
        description: 'Histórico de mensagens do chat estruturado com carregamento progressivo de 3 dias, evitando queries que baixavam conversas completas a cada clique.',
        status: 'improved',
      },
      {
        name: 'Desduplicação de Assinaturas Realtime',
        description: 'Canal único centralizado para sincronização de mensagens, leads e compromissos por master_id escopado.',
        status: 'improved',
      },
    ],
  },
  {
    id: 'deploy-2026-10-25-pos-venda-channels',
    version: 'v2.3.0',
    date: '25 de Outubro de 2026',
    title: 'Canais Setoriais de Pós-Venda e CRM Pós-Contrato',
    type: 'major',
    badge: 'Gestão de Clientes',
    summary: 'Estruturação completa da esteira de pós-venda com canais temáticos (Decoração, Gastronomia, Cerimonial e Alinhamento Final) sincronizados ao aplicativo da debutante.',
    features: [
      {
        name: 'Canais de Atendimento Setoriais no WhatsApp',
        description: 'Permite segregar o atendimento do cliente contratado por setores específicos da casa de festa sem misturar com negociações comerciais ativas.',
        status: 'new',
      },
      {
        name: 'Central de Funis de Pós-Venda Customizáveis',
        description: 'Criação de esteiras com etapas personalizadas para acompanhar a jornada dos 15 anos desde a assinatura do contrato até a realização da festa.',
        status: 'new',
      },
      {
        name: 'Comprovante Comercial Oficial em Linha Única',
        description: 'Geração de comprovante de agendamento de degustação e visita em formato horizontal Retina com foto do anfitrião e dados do compromisso.',
        status: 'improved',
      },
    ],
  },
  {
    id: 'deploy-2026-10-18-agenda-availability',
    version: 'v2.2.0',
    date: '18 de Outubro de 2026',
    title: 'Disponibilidade de Agenda e Anti-Concorrência por Unidade',
    type: 'feature',
    badge: 'Agendamentos',
    summary: 'Configuração flexível de horários de visitas e degustações por casa física, com travas de capacidade simultânea e limites por slot.',
    features: [
      {
        name: 'Regras de Disponibilidade Recorrentes e Bloqueios Pontuais',
        description: 'Definição de dias da semana habilitados, faixas de horário (slots) e datas de bloqueio exclusivo por unidade física.',
        status: 'new',
      },
      {
        name: 'Proteção Anti-Concorrência em Agendamentos',
        description: 'Validação automática que impede agendamentos simultâneos acima da lotação máxima definida para o anfitrião ou espaço.',
        status: 'new',
      },
      {
        name: 'Modo Livre com Justificativa de Exceção',
        description: 'Permite que gerentes autorizados realizem agendamentos fora do padrão mediante justificativa registrada no histórico do lead.',
        status: 'new',
      },
    ],
  },
  {
    id: 'deploy-2026-10-10-multitenant-isolation',
    version: 'v2.1.0',
    date: '10 de Outubro de 2026',
    title: 'Isolamento Rigoroso Multi-Tenant e Multi-Venues (Vazamento Zero)',
    type: 'security',
    badge: 'Segurança & Tenant',
    summary: 'Implementação de travas absolutas de isolamento de dados entre Contas Master, protegendo leads, fontes, instâncias e colaboradores.',
    features: [
      {
        name: 'Escopo Rígido por scopedMasterId',
        description: 'Todas as consultas, gravações e eventos no Supabase passam por validação de master_id do usuário autenticado.',
        status: 'improved',
      },
      {
        name: 'Isolamento de Arquivos e Mídias no Cloudflare R2',
        description: 'Separação estrita de uploads de desenvolvimento (prefixo local_dev/) e proteção de mídias de produção no bucket.',
        status: 'improved',
      },
      {
        name: 'Remoção de Emojis em Toda a Interface',
        description: 'Substituição padronizada de emojis por ícones modernos da biblioteca lucide-react para visual profissional e corporativo.',
        status: 'replaced',
      },
    ],
  },
  {
    id: 'deploy-2026-09-01-initial-crm',
    version: 'v2.0.0',
    date: '01 de Setembro de 2026',
    title: 'Lançamento do F5 System • Central de CRM e Gestão de Redes de Festas',
    type: 'major',
    badge: 'Lançamento Inicial',
    summary: 'Lançamento da plataforma unificada de gestão comercial, financeira e de eventos para donos de redes de casas de festas e suas debutantes.',
    features: [
      {
        name: 'Kanban Comercial com Qualificação MQL',
        description: 'Esteira de conversão de leads com perguntas de qualificação e cálculo de aderência ao perfil ideal de cliente.',
        status: 'new',
      },
      {
        name: 'Integração de WhatsApp Multi-Instâncias',
        description: 'Atendimento centralizado com leitura de QR Code, distribuição de leads e triagem de histórico.',
        status: 'new',
      },
      {
        name: 'Jornada da Debutante e App de Convidados',
        description: 'Aplicativo PWA para as debutantes acompanharem preparativos, lista de convidados, confirmações e programa VIP de benefícios.',
        status: 'new',
      },
    ],
  },
];
