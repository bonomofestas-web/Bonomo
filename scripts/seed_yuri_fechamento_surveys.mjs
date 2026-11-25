import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';

const parseEnv = (path) => {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf-8')
      .split(/\r?\n/)
      .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
  );
};

const env = parseEnv('.env');
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Falta VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env/.env.local');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const buildQuestions = (surveyId, venueName) => {
  const ch = (labels) => labels.map((label) => ({ id: randomUUID(), label }));

  const q1Id = randomUUID();
  const q2Id = randomUUID();
  const q3Id = randomUUID();
  const q4Id = randomUUID();
  const q5Id = randomUUID();
  const q6Id = randomUUID();
  const q7Id = randomUUID();
  const q8Id = randomUUID();
  const q9Id = randomUUID();
  const q10Id = randomUUID();
  const q11Id = randomUUID();

  const q12Id = randomUUID();
  const q13Id = randomUUID();
  const q14Id = randomUUID();
  const q15Id = randomUUID();
  const q16Id = randomUUID();
  const q17Id = randomUUID();
  const q18Id = randomUUID();
  const q19Id = randomUUID();

  const q20Id = randomUUID();
  const q21Id = randomUUID();
  const q22Id = randomUUID();
  const q23Id = randomUUID();
  const q24Id = randomUUID();
  const q25Id = randomUUID();
  const q26Id = randomUUID();
  const q27Id = randomUUID();
  const q28Id = randomUUID();

  const q11Choices = [
    { id: 'ainda_vai_acontecer', label: 'Ainda vai acontecer (estou nos preparativos)' },
    { id: 'ja_aconteceu', label: 'Já aconteceu (já realizamos a festa)' },
  ];

  const list = [
    // ── SESSÃO 1: SOBRE VOCÊ E SUA FESTA (Q1–Q11) ──
    {
      id: q1Id,
      type: 'short_text',
      title: 'Qual é o seu nome completo?',
      required: true,
      options: {
        sectionTitle: 'Sobre Você e Sua Festa',
        sectionDescription: 'Dados básicos e perfil da sua celebração',
        placeholder: 'Digite seu nome completo...',
      },
      logic: [],
    },
    {
      id: q2Id,
      type: 'phone',
      title: 'Qual é o seu WhatsApp com DDD?',
      required: true,
      options: { placeholder: '(21) 99999-9999' },
      logic: [],
    },
    {
      id: q3Id,
      type: 'date',
      title: 'Qual é a data prevista ou realizada do seu evento?',
      required: true,
      options: {},
      logic: [],
    },
    {
      id: q4Id,
      type: 'short_text',
      title: 'Em qual bairro e cidade você mora atualmente?',
      required: true,
      options: { placeholder: 'Ex.: Taquara, Jacarepaguá - Rio de Janeiro' },
      logic: [],
    },
    {
      id: q5Id,
      type: 'single_choice',
      title: `Qual tipo de evento você fechou no ${venueName}?`,
      required: true,
      options: {
        choices: ch([
          'Festa de 15 Anos / Debutante',
          'Casamento',
          'Aniversário (Infantil ou Adulto)',
          'Bodas / Formatura / Evento Corporativo',
        ]),
      },
      logic: [],
    },
    {
      id: q6Id,
      type: 'single_choice',
      title: 'Quem participou da decisão desse momento especial?',
      required: true,
      options: {
        choices: ch([
          'Somente a mãe',
          'Pai e mãe juntos',
          'Pai, mãe e a(o) própria(o) homenageada(o) (debutante/aniversariante)',
          'Os noivos / casal',
          'Contou também com outros familiares (avós, tios, padrinhos)',
          'Decidi sozinho(a)',
        ]),
      },
      logic: [],
    },
    {
      id: q7Id,
      type: 'single_choice',
      title: 'Quantos convidados estão previstos (ou estiveram presentes) no contrato?',
      required: true,
      options: {
        choices: ch([
          'Até 80 convidados',
          'De 81 a 100 convidados',
          'De 101 a 130 convidados',
          'De 131 a 160 convidados',
          'Acima de 160 convidados',
        ]),
      },
      logic: [],
    },
    {
      id: q8Id,
      type: 'single_choice',
      title: `Quantos eventos você já realizou no ${venueName} (incluindo este, se já aconteceu)?`,
      required: true,
      options: {
        choices: ch([
          'Este é o meu primeiro evento na casa',
          'Já realizei 2 eventos na casa',
          'Já realizei 3 ou mais eventos na casa',
        ]),
      },
      logic: [],
    },
    {
      id: q9Id,
      type: 'single_choice',
      title: 'Você faria outros eventos futuros conosco?',
      required: true,
      options: {
        choices: ch([
          'Com certeza!',
          'Talvez, dependendo do tipo de evento',
          'Provavelmente não',
        ]),
      },
      logic: [],
    },
    {
      id: q10Id,
      type: 'scale',
      title: 'De 0 a 10, que nota você dá para o atendimento da nossa equipe?',
      required: true,
      options: { scaleMin: 0, scaleMax: 10, minLabel: 'Precisa melhorar', maxLabel: 'Atendimento nota 10' },
      logic: [],
    },
    {
      id: q11Id,
      type: 'single_choice',
      title: 'A sua festa já aconteceu ou ainda vai acontecer?',
      description: 'As próximas perguntas serão personalizadas de acordo com o momento da sua festa.',
      required: true,
      options: { choices: q11Choices },
      logic: [{ op: 'is', value: 'ja_aconteceu', goto: q20Id }],
    },

    // ── SESSÃO 2 (RAMO A): ANTES DE FECHAR & EXPECTATIVAS (Q12–Q19) ──
    {
      id: q12Id,
      type: 'single_choice',
      title: 'Com quanto tempo de antecedência você fechou a festa?',
      required: true,
      options: {
        sectionTitle: 'Antes de Fechar & Expectativas',
        sectionDescription: 'Queremos entender o que te motivou a escolher a nossa casa e o que você espera do grande dia',
        choices: ch([
          'Menos de 6 meses antes',
          'De 6 meses a 1 ano antes',
          'De 1 a 2 anos antes',
          'Mais de 2 anos antes',
        ]),
      },
      logic: [],
    },
    {
      id: q13Id,
      type: 'multi_choice',
      title: 'Antes de fechar conosco, qual era a sua MAIOR dor ou preocupação ao procurar uma casa de festas?',
      description: 'Escolha até 3 opções.',
      required: true,
      options: {
        maxSelections: 3,
        allowOther: true,
        choices: ch([
          'Medo da comida/buffet não ser farta ou não agradar os convidados',
          'Cansaço e preocupação de ter que contratar tudo separado e ficar sobrecarregada',
          'Receio de estourar o orçamento ou não conseguir boas condições de pagamento',
          'Medo do espaço parecer simples demais ou não comportar bem os convidados',
          'Insegurança de contratar uma empresa que não entregasse o prometido no dia',
          'Falta de atenção, demora ou pouca clareza no atendimento de outros lugares',
        ]),
      },
      logic: [],
    },
    {
      id: q14Id,
      type: 'single_choice',
      title: 'Em algum momento você ficou em dúvida antes de assinar? Qual foi a principal objeção que você precisou vencer?',
      required: true,
      options: {
        choices: ch([
          'Valor total / ajuste no orçamento da família',
          'Condições de entrada e formato de parcelamento',
          'Comparação com outras casas de festa que visitei',
          'Disponibilidade de data ou antecedência da festa',
          'Alinhamento com marido/esposa ou familiares sobre o investimento',
          'Não tive dúvidas: decidi assim que conheci a casa',
        ]),
      },
      logic: [],
    },
    {
      id: q15Id,
      type: 'multi_choice',
      title: 'O que foi DECISIVO para você escolher fechar com a gente e não com outra casa?',
      description: 'Escolha até 3 diferenciais.',
      required: true,
      options: {
        maxSelections: 3,
        allowOther: true,
        choices: ch([
          'A degustação presencial (sabor, qualidade e apresentação)',
          'O atendimento, acolhimento e segurança passados pela consultora',
          'A beleza, estrutura física e localização do salão',
          'O custo-benefício do pacote completo (tudo no mesmo lugar)',
          'A flexibilidade nas condições de pagamento',
          'Confiança na marca, indicação ou avaliações positivas',
        ]),
      },
      logic: [],
    },
    {
      id: q16Id,
      type: 'multi_choice',
      title: 'Pensando nas suas EXPECTATIVAS para o grande dia, o que NÃO pode faltar na sua festa?',
      description: 'Escolha até 3 prioridades.',
      required: true,
      options: {
        maxSelections: 3,
        allowOther: true,
        choices: ch([
          'Gastronomia elogiada e buffet farto do início ao fim',
          'Decoração marcante, bonita e do jeito que sonhamos',
          'Tranquilidade total: equipe cuidando de tudo para a família só curtir',
          'Pista de dança animada, som e iluminação de alto nível',
          'Momentos emocionantes e cerimonial bem conduzido (entrada, valsa, homenagens)',
          'Localização prática e fácil acesso para a família e convidados',
        ]),
      },
      logic: [],
    },
    {
      id: q17Id,
      type: 'single_choice',
      title: 'Por onde você conheceu ou entrou em contato com a gente pela primeira vez?',
      required: true,
      options: {
        choices: ch([
          'Instagram ou Facebook (anúncio ou perfil)',
          'Indicação de amigo(a) ou familiar',
          'Pesquisa no Google',
          'Já fui convidado(a) em uma festa na casa',
          'WhatsApp / Passando em frente / Outro',
        ]),
      },
      logic: [],
    },
    {
      id: q18Id,
      type: 'long_text',
      title: 'Com suas próprias palavras: o que a nossa equipe falou ou fez antes de fechar que mais te deu confiança para assinar?',
      required: true,
      options: { placeholder: 'Conte o que fez a diferença no nosso atendimento ou degustação...' },
      logic: [],
    },
    {
      id: q19Id,
      type: 'long_text',
      title: 'Quais são suas maiores expectativas e desejos para o dia da festa?',
      required: false,
      options: { placeholder: 'Compartilhe o que você mais sonha em viver nesse dia...' },
      logic: [{ op: 'is_not', value: '__never__', goto: 'end' }],
    },

    // ── SESSÃO 3 (RAMO B): EXPERIÊNCIA PÓS-FESTA (Q20–Q28) ──
    {
      id: q20Id,
      type: 'scale',
      title: 'De 0 a 10, que nota você dá para o seu evento no geral?',
      required: true,
      options: {
        sectionTitle: 'Sua Experiência Pós-Festa',
        sectionDescription: 'Queremos ouvir como foi do antes de fechar até o grande dia da sua festa',
        scaleMin: 0,
        scaleMax: 10,
        minLabel: 'Abaixo do esperado',
        maxLabel: 'Inesquecível',
      },
      logic: [],
    },
    {
      id: q21Id,
      type: 'single_choice',
      title: 'ANTES de fechar o contrato, qual era a sua maior expectativa ou receio ao escolher a casa?',
      required: true,
      options: {
        choices: ch([
          'Que a comida/buffet fosse realmente farta e elogiada',
          'Que a equipe entregasse tudo conforme prometido, sem dor de cabeça',
          'Que o espaço e a decoração encantassem os convidados',
          'Que o investimento valesse a pena dentro do orçamento da família',
          'Já cheguei confiante por indicação ou por conhecer a casa',
        ]),
      },
      logic: [],
    },
    {
      id: q22Id,
      type: 'single_choice',
      title: 'O que foi DECISIVO para você ter fechado conosco lá atrás?',
      required: true,
      options: {
        choices: ch([
          'A degustação presencial e qualidade da gastronomia',
          'O atendimento e a segurança passados pela consultora',
          'A praticidade do pacote completo (tudo no mesmo lugar)',
          'O padrão do espaço e localização',
          'Condições de pagamento e custo-benefício',
        ]),
      },
      logic: [],
    },
    {
      id: q23Id,
      type: 'single_choice',
      title: 'DURANTE OS PREPARATIVOS (do fechamento até a semana da festa), como foi o acompanhamento com a nossa equipe?',
      required: true,
      options: {
        choices: ch([
          'Excelente — equipe presente, organizada e me deixou super tranquila(o)',
          'Muito bom — alinhamos todos os detalhes com clareza',
          'Bom — mas senti falta de mais agilidade ou contato em alguns momentos',
          'Regular — tive dúvidas ou imprevistos que poderiam ter sido evitados',
        ]),
      },
      logic: [],
    },
    {
      id: q24Id,
      type: 'multi_choice',
      title: 'DURANTE O EVENTO, o que mais superou as suas expectativas no dia da festa?',
      description: 'Escolha até 3 opções.',
      required: true,
      options: {
        maxSelections: 3,
        allowOther: true,
        choices: ch([
          'Qualidade, sabor e fartura do buffet / gastronomia',
          'Atendimento dos garçons, equipe de salão e cerimonial',
          'Beleza da decoração e ambientação do espaço',
          'Animação da pista, DJ, som e iluminação',
          'Tranquilidade para a família aproveitar sem se preocupar com nada',
          'Pontualidade e cumprimento de tudo que foi combinado no contrato',
        ]),
      },
      logic: [],
    },
    {
      id: q25Id,
      type: 'single_choice',
      title: 'Como seus convidados comentaram sobre o evento (comida, bebida, espaço e atendimento)?',
      required: true,
      options: {
        choices: ch([
          'Só elogios — disseram que foi uma das melhores festas que já foram',
          'Muito positivo — elogiaram bastante o buffet e a equipe',
          'Bom — gostaram no geral, com pequenos pontos de melhoria',
          'Regular / Abaixo do esperado',
        ]),
      },
      logic: [],
    },
    {
      id: q26Id,
      type: 'single_choice',
      title: 'Houve algum ponto nos preparativos ou no dia do evento que poderia ter sido melhor?',
      required: true,
      options: {
        choices: ch([
          'Não, foi tudo perfeito do início ao fim',
          'Comunicação ou alinhamento durante os preparativos',
          'Tempo de serviço / reposição de comida ou bebida no dia',
          'Som, iluminação ou condução do cronograma',
          'Outro detalhe pontual',
        ]),
      },
      logic: [],
    },
    {
      id: q27Id,
      type: 'long_text',
      title: 'Com suas próprias palavras: como você resume a sua experiência do antes, durante os preparativos e no dia da festa?',
      required: true,
      options: { placeholder: 'Conte pra gente como foi viver essa jornada com a nossa equipe...' },
      logic: [],
    },
    {
      id: q28Id,
      type: 'long_text',
      title: 'Se uma mãe ou noiva estivesse em dúvida hoje sobre fechar conosco, o que você diria para ela?',
      required: false,
      options: { placeholder: 'Seu depoimento ajuda outras famílias a realizarem esse sonho...' },
      logic: [],
    },
  ];

  return list.map((q, position) => ({
    id: q.id,
    master_id: MASTER_ID,
    survey_id: surveyId,
    position,
    type: q.type,
    title: q.title,
    description: q.description || null,
    required: q.required,
    options: q.options,
    logic: q.logic,
  }));
};

async function main() {
  const { data: venues, error: vErr } = await sb
    .from('venues')
    .select('id, name, logo_url')
    .eq('master_id', MASTER_ID)
    .order('name', { ascending: true });

  if (vErr) {
    console.error('Erro ao buscar unidades:', vErr.message);
    process.exit(1);
  }

  const activeVenues = venues || [];
  console.log('Unidades encontradas:', activeVenues.map((v) => `${v.name} (${v.id})`).join(' | '));

  for (const venue of activeVenues) {
    const slug = `pesquisa-fechamento-${slugify(venue.name)}`;
    const title = `Pesquisa de Experiência & Fechamento — ${venue.name}`;

    const { data: existing } = await sb
      .from('surveys')
      .select('id')
      .eq('master_id', MASTER_ID)
      .eq('slug', slug)
      .maybeSingle();

    const payload = {
      master_id: MASTER_ID,
      venue_id: venue.id,
      slug,
      title,
      description: `Queremos entender o que fez você escolher o ${venue.name} e como está sendo a sua experiência conosco.`,
      status: 'published',
      welcome: {
        title: `Conte a sua experiência com o ${venue.name}`,
        text: 'Leva menos de 3 minutinhos. Suas respostas nos ajudam a tornar cada festa ainda mais especial.',
        buttonLabel: 'Começar',
        privacyNote: 'Suas respostas são confidenciais e usadas exclusivamente para melhorar nosso atendimento.',
        layout: 'centered',
      },
      thanks: {
        title: `Muito obrigado por escolher o ${venue.name}!`,
        text: 'Sua resposta foi registrada com sucesso. Nossa equipe fica muito feliz em fazer parte desse momento tão especial da sua família.',
        layout: 'centered',
        showBadge: true,
      },
      theme: {
        color: '#0284C7',
        backgroundColor: '#F8FAFC',
        textColor: '#0F172A',
        fontFamily: 'Inter',
        buttonRadius: 'rounded',
        ...(venue.logo_url ? { logoUrl: venue.logo_url } : {}),
      },
      created_by_name: 'Sistema F5',
      updated_at: new Date().toISOString(),
    };

    let surveyId = existing?.id;
    if (surveyId) {
      const { error: uErr } = await sb.from('surveys').update(payload).eq('id', surveyId).eq('master_id', MASTER_ID);
      if (uErr) throw uErr;
      await sb.from('survey_questions').delete().eq('survey_id', surveyId).eq('master_id', MASTER_ID);
    } else {
      const { data: inserted, error: iErr } = await sb.from('surveys').insert(payload).select('id').single();
      if (iErr) throw iErr;
      surveyId = inserted.id;
    }

    const qRows = buildQuestions(surveyId, venue.name);
    const { error: qErr } = await sb.from('survey_questions').insert(qRows);
    if (qErr) throw qErr;

    console.log(`✅ Publicada: ${title} | slug: ${slug} | perguntas: ${qRows.length}`);
  }
}

main().catch((err) => {
  console.error('Falha ao criar pesquisas:', err?.message || err);
  process.exit(1);
});
