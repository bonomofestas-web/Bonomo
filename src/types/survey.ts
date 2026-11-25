/** Pesquisa (formulario estilo Typeform): uma pergunta por tela, respostas viram graficos. */

export type SurveyStatus = 'draft' | 'published' | 'closed';

export type SurveyQuestionType =
  | 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'dropdown' | 'yes_no'
  | 'scale' | 'rating' | 'number' | 'email' | 'phone' | 'date' | 'statement';

export interface SurveyChoice { id: string; label: string }

export interface SurveyQuestionOptions {
  choices?: SurveyChoice[];
  /** Permite a pessoa escrever uma opcao propria ("Outro") */
  allowOther?: boolean;
  /** Maximo de escolhas na multipla selecao (vazio = sem limite) */
  maxSelections?: number;
  /** Escala de opiniao: 0 a 10 por padrao (calcula NPS); estrelas: 1 a 5 */
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  /** Midia anexada na pergunta (URL no R2 ou link de video) */
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  /** Topico / Secao estilo Google Forms (definido na primeira pergunta do topico) */
  sectionTitle?: string;
  sectionDescription?: string;
}

/** Operadores da logica condicional (a regra olha a resposta da propria pergunta) */
export type SurveyLogicOp = 'is' | 'is_not' | 'any_of' | 'gt' | 'lt' | 'between';

export interface SurveyLogicRule {
  op: SurveyLogicOp;
  /** Escolha (id), 'yes'/'no' ou numero, conforme o tipo */
  value?: string | number | string[];
  /** Limite superior do 'between' */
  value2?: number;
  /** Id de uma pergunta POSTERIOR ou 'end' (finaliza) */
  goto: string;
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  position: number;
  type: SurveyQuestionType;
  title: string;
  description?: string | null;
  required: boolean;
  options: SurveyQuestionOptions;
  logic: SurveyLogicRule[];
}

export type SurveyCoverLayout = 'centered' | 'split_left' | 'split_right' | 'hero_bg';
export type SurveyFontFamily = 'Inter' | 'Poppins' | 'DM Sans' | 'Playfair Display';
export type SurveyButtonRadius = 'rounded' | 'pill' | 'square';

export interface SurveyWelcome {
  title?: string;
  text?: string;
  buttonLabel?: string;
  privacyNote?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  layout?: SurveyCoverLayout;
}

export interface SurveyThanks {
  title?: string;
  text?: string;
  linkLabel?: string;
  linkUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  layout?: 'centered' | 'split_left' | 'split_right';
  showBadge?: boolean;
}

export interface SurveyTheme {
  color?: string;
  backgroundColor?: string;
  textColor?: string;
  logoUrl?: string;
  backgroundImageUrl?: string;
  backgroundOverlay?: number;
  fontFamily?: SurveyFontFamily;
  buttonRadius?: SurveyButtonRadius;
}

export interface Survey {
  id: string;
  masterId: string;
  venueId?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  status: SurveyStatus;
  welcome: SurveyWelcome;
  thanks: SurveyThanks;
  theme: SurveyTheme;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Valor de uma resposta: texto, numero, id de escolha ("other:texto" para Outro), lista de ids ou 'yes'/'no' */
export type SurveyAnswerValue = string | number | string[];

export type SurveyResponseStatus = 'sent' | 'started' | 'completed';

export interface SurveyResponse {
  id: string;
  masterId: string;
  surveyId: string;
  token?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  status: SurveyResponseStatus;
  answers: Record<string, SurveyAnswerValue>;
  path: string[];
  sentByName?: string | null;
  sentAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export const SURVEY_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  single_choice: 'Escolha única',
  multi_choice: 'Múltipla seleção',
  dropdown: 'Lista suspensa',
  yes_no: 'Sim ou não',
  scale: 'Escala de 0 a 10',
  rating: 'Estrelas',
  number: 'Número',
  email: 'E-mail',
  phone: 'Telefone',
  date: 'Data',
  statement: 'Texto informativo',
};

/** Tipos que viram grafico no resumo */
export const CHART_TYPES: SurveyQuestionType[] = ['single_choice', 'multi_choice', 'dropdown', 'yes_no', 'scale', 'rating', 'date', 'number'];
/** Tipos em que a logica condicional faz sentido */
export const LOGIC_TYPES: SurveyQuestionType[] = ['single_choice', 'dropdown', 'yes_no', 'scale', 'rating', 'number'];
