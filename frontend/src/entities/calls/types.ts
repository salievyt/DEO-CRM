export type CallDirection = "incoming" | "outgoing";
export type CallRecordStatus =
  | "answered"
  | "missed"
  | "busy"
  | "failed"
  | "canceled"
  | "voicemail";
export type CallRecordType = "internal" | "external";
export type PBXProvider = "asterisk" | "mikopbx" | "yeastar" | "grandstream" | "other";
export type PBXConnectionStatus = "connected" | "disabled" | "error";

export interface CallRecord {
  id: string;
  connection: string | null;
  external_call_id: string;
  direction: CallDirection;
  status: CallRecordStatus;
  call_type: CallRecordType;
  phone_number: string;
  client: string | null;
  client_name: string;
  employee: string | null;
  employee_name: string;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface CallStats {
  total: number;
  incoming: number;
  outgoing: number;
  missed: number;
  answered: number;
  total_duration_seconds: number;
}

export interface PBXConnection {
  id: string;
  name: string;
  provider: PBXProvider;
  api_url: string;
  ami_host: string;
  ami_port: number;
  ami_user: string;
  ws_url: string;
  sip_domain: string;
  status: PBXConnectionStatus;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SipAccount {
  id: string;
  connection: string | null;
  extension: string;
  name: string;
  user: string | null;
  is_active: boolean;
  created_at: string;
}
