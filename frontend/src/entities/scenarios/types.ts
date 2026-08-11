export type ScenarioChannel = "all" | "whatsapp" | "telegram";
export type ScenarioMatchMode = "any" | "all";
export type TriggerStatus =
  | "responded"
  | "failed"
  | "skipped_cooldown"
  | "skipped_inactive"
  | "skipped_no_sender";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  channel: ScenarioChannel;
  channel_display: string;
  match_mode: ScenarioMatchMode;
  match_mode_display: string;
  keywords: string[];
  reply_text: string;
  cooldown_minutes: number;
  priority: number;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScenarioTemplate {
  name: string;
  description: string;
  channel: ScenarioChannel;
  match_mode: ScenarioMatchMode;
  keywords: string[];
  reply_text: string;
  cooldown_minutes: number;
}

export interface ScenarioTrigger {
  id: string;
  scenario: string;
  scenario_name: string;
  conversation_id: string;
  client_name: string;
  matched_keyword: string;
  message_preview: string;
  reply_preview: string;
  status: TriggerStatus;
  status_display: string;
  error_message: string;
  created_at: string;
}

export interface ScenarioStats {
  total: number;
  active: number;
  total_triggers: number;
  responded_today: number;
  failed: number;
}

export interface ScenarioTestResult {
  matched: boolean;
  keyword?: string | null;
  reply?: string;
  scenario_name?: string;
  message?: string;
  scenario_id?: string;
  active?: boolean;
}
