export interface Chat {
  id: string;
  name: string;
  project: string | null;
  is_group: boolean;
  last_message: {
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
  unread_count: number;
  participants: ChatParticipant[];
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  id: string;
  user: string | null;
  user_name: string;
  client: string | null;
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  chat: string;
  sender: string | null;
  sender_name: string;
  content: string;
  file_url: string;
  file_name: string;
  voice_url: string;
  voice_duration: number;
  reply_to: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface UnreadCount {
  total_unread: number;
}
