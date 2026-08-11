export type InboxChannel = "whatsapp" | "telegram" | "email";
export type ConversationStatus = "open" | "pending" | "closed";
export type MessageDirection = "incoming" | "outgoing";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type MessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "video"
  | "template"
  | "location"
  | "sticker"
  | "contact"
  | "system";

export interface InboxConversation {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  company_name?: string;
  channel: InboxChannel;
  status: ConversationStatus;
  assigned_user: string | null;
  assigned_user_name: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
}

export interface InboxMessage {
  id: string;
  conversation: string;
  contact: string | null;
  contact_name?: string;
  channel: InboxChannel;
  direction: MessageDirection;
  type: MessageType;
  text: string;
  media_url: string;
  media_name: string;
  external_message_id: string;
  status: MessageStatus;
  sender: string | null;
  sender_name: string;
  error_code: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppAccount {
  id: string;
  name: string;
  business_account_id: string;
  phone_number_id: string;
  display_phone_number: string;
  status: string;
  is_default: boolean;
  created_at: string;
}

export interface TelegramAccount {
  id: string;
  name: string;
  bot_username: string;
  bot_name: string;
  status: string;
  is_default: boolean;
  created_at: string;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  body_text: string;
  parameter_count: number;
  header: { type: string; text?: string } | null;
  buttons: { type: string; text: string }[];
  updated_at: string;
}

export interface SendError {
  code: string;
  message: string;
  template_required?: boolean;
  templates?: WhatsAppTemplate[];
}

export interface SendResult {
  message: InboxMessage;
  sent: boolean;
  error: SendError | null;
}
