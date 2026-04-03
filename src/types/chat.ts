export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  error?: boolean;
  streaming?: boolean;
  toolCalls?: string[];
}

export interface StreamChunk {
  type: 'delta' | 'tool_call' | 'done' | 'error';
  content: string;
  tool_name?: string | null;
  conversation_id?: string | null;
}
