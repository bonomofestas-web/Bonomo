/**
 * Tipos e Contratos da API UAZAPI (v2.4.0)
 * Documentação: https://docs.uazapi.com/
 */

export type UazapiInstanceStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'hibernated'
  | 'registering'
  | 'registration_conflict';

export interface UazapiConnectOptions {
  phone?: string; // Número internacional (ex: 5511999999999) para gerar pairing code
  browser?: 'auto' | 'safari' | 'firefox' | 'edge' | 'chrome';
  systemName?: string;
  proxy_managed_country?: string;
  proxy_managed_state?: string;
  proxy_managed_city?: string;
}

export interface UazapiInstance {
  id?: string;
  name?: string;
  token?: string;
  status: UazapiInstanceStatus;
  paircode?: string;
  qrcode?: string;
  owner?: string; // Número do WhatsApp conectado
  profileName?: string;
  profilePicUrl?: string;
  isBusiness?: boolean;
  plataform?: string;
  systemName?: string;
  lastDisconnect?: string;
  lastDisconnectReason?: string;
  current_presence?: 'available' | 'unavailable';
  createdAt?: string;
  updatedAt?: string;
}

export interface UazapiConnectResponse {
  connected?: boolean;
  loggedIn?: boolean;
  jid?: string | null;
  status: UazapiInstanceStatus;
  qrcode?: string; // Base64 ou URL do QR code
  pairingCode?: string; // Código de 8 dígitos para pareamento numérico (ex: 1234-5678)
  instance?: UazapiInstance;
  count?: number;
}

export interface UazapiInstanceStatusResponse {
  instance?: UazapiInstance;
  status?: UazapiInstanceStatus;
  phone?: string;
  profileName?: string;
  profilePictureUrl?: string;
  loggedIn?: boolean;
  connected?: boolean;
}

export interface UazapiSendTextPayload {
  number: string;
  text: string;
  linkPreview?: boolean;
  linkPreviewTitle?: string;
  linkPreviewDescription?: string;
  linkPreviewImage?: string;
  linkPreviewLarge?: boolean;
  delay?: number;
  async?: boolean;
  replyid?: string;
  mentions?: string[] | string;
  readchat?: boolean;
  readmessages?: boolean;
  forward?: boolean;
  track_source?: string;
  track_id?: string;
}

export type UazapiMediaType = 'image' | 'video' | 'audio' | 'myaudio' | 'document' | 'sticker' | 'ptv';

export interface UazapiSendMediaPayload {
  number: string;
  type: UazapiMediaType;
  file: string; // URL pública ou Base64
  caption?: string;
  fileName?: string;
  ptt?: boolean; // Se true e type='audio', envia como mensagem de voz
  delay?: number;
  async?: boolean;
  replyid?: string;
  track_source?: string;
  track_id?: string;
}

export interface UazapiSendMessageResponse {
  id: string;
  messageid?: string;
  status?: 'Sent' | 'Queued' | 'Delivered' | 'Read' | 'Failed';
  async?: boolean;
  queuePosition?: number;
  track_id?: string;
  timestamp?: number | string;
  response?: {
    status?: string;
    message?: string;
  };
}

export interface UazapiDownloadMediaPayload {
  id: string; // ID da mensagem
  transcribe?: boolean; // Se true, transcreve áudio por IA
  generate_mp3?: boolean;
  return_base64?: boolean;
  download_quoted?: boolean;
}

export interface UazapiDownloadMediaResponse {
  fileURL?: string;
  mimetype?: string;
  base64?: string;
  transcription?: string; // Texto transcrito por IA caso transcribe=true
  fileName?: string;
  fileSize?: number;
}

export interface UazapiReactPayload {
  id: string;
  reaction: string; // Emoji de reação (ex: "❤️", "👍", "👏") ou "" para remover
}

export interface UazapiWebhookConfig {
  enabled: boolean;
  url: string;
  events: (
    | 'connection'
    | 'messages'
    | 'messages_update'
    | 'presence'
    | 'contacts'
    | 'chats'
    | 'history'
    | 'labels'
    | 'call'
  )[];
  excludeMessages?: ('wasSentByApi' | 'wasNotSentByApi' | 'fromMeYes' | 'fromMeNo' | 'isGroupYes' | 'isGroupNo')[];
  addUrlEvents?: boolean;
  addUrlTypesMessages?: boolean;
}

export interface UazapiGlobalWebhookConfig {
  url: string;
  events: (
    | 'connection'
    | 'history'
    | 'messages'
    | 'messages_update'
    | 'newsletter_messages'
    | 'call'
    | 'contacts'
    | 'presence'
    | 'groups'
    | 'labels'
    | 'chats'
    | 'chat_labels'
    | 'sender'
    | string
  )[];
  excludeMessages?: (
    | 'wasSentByApi'
    | 'wasNotSentByApi'
    | 'fromMeYes'
    | 'fromMeNo'
    | 'isGroupYes'
    | 'isGroupNo'
    | string
  )[];
  addUrlEvents?: boolean;
  addUrlTypesMessages?: boolean;
}

export interface UazapiWebhookEventPayload {
  EventType: string;
  owner?: string;
  token?: string;
  BaseUrl?: string;
  instanceName?: string;
  message?: {
    id: string;
    from: string;
    to: string;
    isFromMe: boolean;
    timestamp: number;
    text?: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
    mediaUrl?: string;
    mimetype?: string;
    caption?: string;
    status?: string;
  };
  chat?: {
    id: string;
    name?: string;
    unreadCount?: number;
  };
  event?: any;
}
