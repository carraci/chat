export type ChatMode = 'gemini' | 'auto-responder' | 'echo';

export interface ChatMessage {
  id: number;
  sender: 'user' | 'bot' | 'system';
  text: string;
  file_name?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  timestamp: string;
  edited?: boolean;
  edited_at?: string | null;
  mode?: ChatMode;
}

export interface ServerStatus {
  status: string;
  hasGeminiKey: boolean;
  recommendedModel: string;
  totalMessages: number;
  timestamp: string;
}
