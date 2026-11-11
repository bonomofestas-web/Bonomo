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
    id: 'deploy-2026-11-11-venue-events-split-upsell-r2-docs',
    version: 'v2.8.0',
    date: '11 de Novembro de 2026',
    title: 'Agenda de Eventos com Trava de Unidade, Split Ordenado com Envio Automático, Métricas de Upsell e Upload Direto de Documentos',
    type: 'major',
    badge: 'Grande Atualização',
    summary: 'Grande atualização estrutural para operação comercial e pós-venda: lançamento da Agenda de Eventos da Unidade com bloqueio automático de visitas, split ordenado de agendamentos com disparo via WhatsApp para closers, métricas de vendas internas por horário e vendedor, upload direto de documentos no R2, foto do closer no comprovante de visita e isolamento completo de funis de pós-venda.',
    features: [
      {
        name: 'Agenda de Eventos da Unidade & Trava Automática de Datas',
        description: 'Novo módulo administrativo gerenciado pelo Pós-Venda com visualização em modo leitura para o Comercial. Permite criar eventos vinculados ou não a clientes e travar o dia da unidade, bloqueando automaticamente novos agendamentos comerciais naquela data e exibindo os eventos vinculados dentro da ficha do cliente.',
        status: 'new',
      },
      {
        name: 'Split Ordenado de Agendamentos & Notificação Automática no WhatsApp',
        description: 'Motor de rodízio de closers remodelado no padrão exato do split de funis: lista ordenada com reordenação, peso por repetição, indicador de próximo da fila e persistência do ponteiro no Supabase, além de notificação automática via WhatsApp para o colaborador atribuído.',
        status: 'new',
      },
      {
        name: 'Upload Direto de Documentos no Pós-Venda (Cloudflare R2)',
        description: 'Substituição do cadastro por link manual por upload direto de PDFs e imagens no modal de documentos do cliente (no inspetor completo e no modo WhatsApp), armazenados em segurança no Cloudflare R2.',
        status: 'replaced',
      },
      {
        name: 'Métricas de Vendas Internas (Upsells) por Horário e Vendedor',
        description: 'Captura de horário e colaborador responsável em cada venda interna registrada no Pós-Venda, alimentando painéis de ranking por vendedor e distribuição por horário no Dashboard.',
        status: 'new',
      },
      {
        name: 'Isolamento de Funis de Pós-Venda no Modo Kanban e WhatsApp',
        description: 'Correção definitiva na duplicação e criação de funis de pós-venda para garantir separação estrita dos clientes por funil e visibilidade consistente entre a visão Kanban e o workspace de WhatsApp.',
        status: 'improved',
      },
      {
        name: 'Foto do Closer no Comprovante de Visita / Degustação',
        description: 'Inclusão da rota de proxy de imagem em produção e pré-conversão segura para Base64 antes da exportação, garantindo que a foto de perfil do closer sempre acompanhe o comprovante compartilhado.',
        status: 'improved',
      },
    ],
  },
  {
    id: 'deploy-2026-11-06-deal-closed-persistence-subcontacts-fluid',
    version: 'v2.7.1',
    date: '06 de Novembro de 2026',
    title: 'Fixação de Lead em Ganho, Transferência Integral de Dados ao Pós-Venda, Digitação Fluida e Contraste Contratual',
    type: 'major',
    badge: 'Grande Atualização',
    summary: 'Correção crítica na esteira de vendas: garantia de fixação definitiva do lead na etapa de ganho do funil comercial, persistência blindada de valores e dados contratuais (sinal, parcelas, cartão, pagante e debutante) para o pós-venda, digitação ultra-fluida nos contatos vinculados sem latência no banco e ajuste de contraste nos formulários de cadastro.',
    features: [
      {
        name: 'Fixação Definitiva na Etapa de Ganho / Venda Fechada',
        description: 'Ao arrastar o lead para ganho, o status e a etapa exata de fechamento (targetStageId) são fixados e persistidos no banco de dados, eliminando o retorno indesejado do lead para a etapa anterior e sincronizando a duplicata no pós-venda.',
        status: 'improved',
      },
      {
        name: 'Transferência Integral de Dados Contratuais & Decisor',
        description: 'Repasse completo dos dados do contratante pagante (nome, WhatsApp, e-mail, CPF, bairro, endereço), dados da aniversariante/debutante (telefone e data de nascimento) e termos de negociação para o cadastro de cliente pós-venda.',
        status: 'improved',
      },
      {
        name: 'Gestão Blindada de Sucesso e Valores Financeiros',
        description: 'Valor base, valor de entrada (sinal), contagem de parcelas, posse de cartão de crédito e termos de pagamento agora possuem dupla camada de persistência (colunas diretas e commercial_history em JSONB), blindando contra perda de dados.',
        status: 'improved',
      },
      {
        name: 'Digitação Rápida e Modo Rascunho nos Contatos Vinculados',
        description: 'Edição de subcontatos refatorada para modo rascunho com persistência exclusiva no desfoque (onBlur) ou Enter, eliminando travamentos de interface e chamadas síncronas repetitivas a cada caractere.',
        status: 'improved',
      },
      {
        name: 'Contraste e Legibilidade no Cadastro Manual de Clientes',
        description: 'Ajuste definitivo nas cores e contraste dos campos da seção de Dados Contratuais & Casa de Festas no modal de novo cliente, assegurando texto nítido e legível sobre fundo claro.',
        status: 'improved',
      },
    ],
  },
  {
    id: 'deploy-2026-11-06-whatsapp-reply-pdf-sync',
    version: 'v2.7.0',
    date: '06 de Novembro de 2026',
    title: 'Citação e Resposta de Mensagens, Preview de PDF, Sincronização por Número e Purga de Instâncias',
    type: 'major',
    badge: 'Grande Atualização',
    summary: 'Lançamento do recurso de resposta com citação (Quote / Reply) no WhatsApp, visualização refinada de documentos PDF com capa e metadados, sincronização de histórico por número com direcionamento obrigatório para o funil da origem, purga automática de instâncias na API, padronização visual e estrutural do funil de pós-venda, migração em massa entre Lead e Cliente com novos códigos oficiais e login direto.',
    features: [
      {
        name: 'Resposta com Citação (Quote / Reply) no WhatsApp',
        description: 'Opção Responder em qualquer mensagem recebida ou enviada (e via duplo clique no balão). Barra suspensa de citação acima do campo de digitação com barra lateral verde, remetente, snippet de áudio/mídia/texto e botão de cancelar. Sincronização oficial via replyid na API do WhatsApp, balão com citação aninhada e rolagem suave com animação destacada piscante ao clicar na resposta.',
        status: 'new',
      },
      {
        name: 'Preview e Card Elegante de Documentos PDF',
        description: 'Visualização de documentos PDF estilo WhatsApp oficial com banner de capa superior, badge vermelho de identificação, nome do arquivo completo e contagem de páginas e tamanho. Preservação estrita dos nomes de arquivos e diferenciação entre mídias embedadas e documentos.',
        status: 'new',
      },
      {
        name: 'Padronização do Funil de Pós-Venda & Visual Clean',
        description: 'Alinhamento visual e estrutural do funil de pós-venda à referência do funil comercial, adotando a barra de métricas ultra-compacta (Total, Em Andamento, Realizadas) e eliminando sombras pesadas nos cabeçalhos das etapas para um design moderno e polido.',
        status: 'improved',
      },
      {
        name: 'Migração Atômica em Massa (Mover para Cliente / Mover para Lead)',
        description: 'Ação em lote no Kanban e na visualização de lista para transferir contatos entre funis comerciais e de pós-venda. O código anterior morre e um novo identificador oficial é emitido (CLI-XXXXXX ou LEAD-XXXXXX), preservando 100% das conversas de WhatsApp, anotações, tarefas e histórico sem qualquer perda.',
        status: 'new',
      },
      {
        name: 'Regras de Automação Dedicadas por Tipo de Funil',
        description: 'Gatilhos de agendamento automático de visita blindados exclusivamente para o funil comercial, sendo ocultados e desabilitados automaticamente nas configurações de funis de pós-venda.',
        status: 'improved',
      },
      {
        name: 'Sincronização de Conversas por Número & Funil Dedicado',
        description: 'Abertura rápida da sincronização de histórico com 1 clique no card do número em Origens. Suporte aos períodos de 7, 30, 40, 60, 90 dias ou Personalizado, com triagem visual (Novo Lead vs Lead Existente) e direcionamento automático e obrigatório para o funil dedicado da origem.',
        status: 'new',
      },
      {
        name: 'Idempotência e Ordenação Temporal Milimétrica',
        description: 'Armazenamento do identificador único (messageId / wamid) nas atividades do lead e ordenação estrita por milissegundos, impedindo duplicação de mensagens e corrigindo a ordem de chegada das conversas.',
        status: 'improved',
      },
      {
        name: 'Exclusão Automática de Instâncias na API do WhatsApp',
        description: 'Ao excluir uma origem de WhatsApp no F5 System, sua respectiva instância é purgada imediatamente na API do WhatsApp, liberando slots de conexão e evitando instâncias mortas.',
        status: 'improved',
      },
      {
        name: 'Login Direto e Descontinuação de Tutoriais Obstrutivos',
        description: 'Remoção da obrigatoriedade de etapas burocráticas de primeiro acesso (preenchimento compulsório de foto e WhatsApp) e descontinuação do tutorial mobile. O acesso agora é imediato via e-mail e senha cadastrados.',
        status: 'improved',
      },
    ],
  },
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

