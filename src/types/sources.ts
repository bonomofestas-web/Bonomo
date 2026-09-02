export type SourceType = 'form' | 'whatsapp_api' | 'referral' | 'tracking_link';

export interface WhatsAppSubSource {
  id: string;
  name: string; // Ex: "Instagram", "Google Ads", "TikTok", "Site Oficial", "Bio do Insta"
  keyword: string; // Ex: "instagram", "insta", "quero orçamento", "festa15"
  funnelId?: string; // Funil de destino específico (se vazio, usa o funil padrão da origem)
  color?: string; // Cor opcional para badge
}

export type FormFieldType = 'text' | 'phone' | 'email' | 'date' | 'number' | 'select' | 'textarea';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
}

export interface SourceConfiguration {
  // WhatsApp API specifics
  instanceName?: string;
  defaultStageId?: string;
  subSources?: WhatsAppSubSource[]; // Sub-origens inteligentes mapeadas por palavra-chave

  // Form specifics
  title?: string;
  description?: string;
  fields?: FormField[];
  themeColor?: string;
  successMessage?: string;
  buttonText?: string;

  // Referral specifics
  systemManaged?: boolean;

  // Legacy Tracking Link specifics (mantido para compatibilidade histórica)
  targetPhone?: string;
  message?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface Source {
  id: string;
  venueId: string; // Casa de Festa obrigatória
  name: string;
  type: SourceType;
  funnelId: string; // 1 único funil de destino obrigatório
  whatsappInstanceId?: string;
  status: 'active' | 'inactive';
  slug?: string;
  configuration: SourceConfiguration;
  createdAt?: string;
  updatedAt?: string;

  // Calculated / Joined metrics for UI
  totalEvents?: number;
  totalViews?: number;
  totalClicks?: number;
  totalSubmits?: number;
  totalLeads?: number;
}

export type SourceEventType = 'link_click' | 'form_view' | 'form_submit' | 'lead_created';

export interface SourceEvent {
  id: string;
  sourceId: string;
  venueId: string;
  eventType: SourceEventType;
  leadId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}
