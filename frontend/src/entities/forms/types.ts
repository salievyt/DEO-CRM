export type FormFieldType = "text" | "email" | "phone" | "textarea" | "select";

export type FormEntityType = "client" | "employee" | "other";

export type LeadAttribute =
  | "contact_name"
  | "phone"
  | "email"
  | "company_name"
  | "telegram"
  | "budget"
  | "notes";

export const LEAD_ATTRIBUTE_LABELS: Record<LeadAttribute, string> = {
  contact_name: "Контактное имя",
  phone: "Телефон",
  email: "Email",
  company_name: "Компания",
  telegram: "Telegram",
  budget: "Бюджет",
  notes: "Заметки",
};

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  entity_type: FormEntityType;
  entity_type_display: string;
  form_fields: FormField[];
  is_active: boolean;
  create_lead: boolean;
  lead_field_map: Partial<Record<LeadAttribute, string>>;
  created_by_name: string | null;
  link_count: number;
  filled_count: number;
  public_token: string;
  public_url: string | null;
  public_link_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FormInvitationStatus = "sent" | "filled" | "expired";

export interface FormInvitation {
  id: string;
  form: string;
  form_title: string;
  token: string;
  recipient_name: string;
  recipient_email: string;
  entity_type: FormEntityType;
  entity_type_display: string;
  entity_id: string | null;
  status: FormInvitationStatus;
  status_display: string;
  lead_id: string | null;
  lead_contact_name: string | null;
  expires_at: string | null;
  submitted_at: string | null;
  response: Record<string, unknown>;
  answer_url: string | null;
  created_at: string;
}

export interface FormInvitationCreateInput {
  form: string;
  recipient_name?: string;
  recipient_email?: string;
  expires_at?: string | null;
}

export interface FormTemplateCreateInput {
  title: string;
  description?: string;
  entity_type: FormEntityType;
  form_fields: FormField[];
  is_active?: boolean;
  create_lead?: boolean;
  lead_field_map?: Partial<Record<LeadAttribute, string>>;
  link_lifetime?: "1" | "3" | "7" | "forever";
}

export interface PublicFormGetResponse {
  form: FormTemplate;
  invitation: {
    id: string;
    token: string;
    recipient_name: string;
    entity_type: FormEntityType;
    status: FormInvitationStatus;
  };
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
