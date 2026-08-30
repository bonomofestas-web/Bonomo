export type SourceType = 'whatsapp_api' | 'tracking_link' | 'form' | 'referral';

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
  // Tracking Link specifics
  targetPhone?: string;
  message?: string;

  // Form specifics
  title?: string;
  description?: string;
  fields?: FormField[];
  themeColor?: string;
  successMessage?: string;
  buttonText?: string;

  // WhatsApp API specifics (Desacoplado)
  instanceName?: string;
  defaultStageId?: string;

  // Referral specifics
  systemManaged?: boolean;
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
