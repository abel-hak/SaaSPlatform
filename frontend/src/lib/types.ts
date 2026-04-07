export type PlanName = 'free' | 'pro' | 'enterprise';

export interface MeResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: PlanName;
    ai_provider: 'groq' | 'openai' | 'anthropic';
    ai_model: string | null;
    ai_api_key: string | null;
  };
}

export interface UsageMetrics {
  period: string;
  ai_queries_used: number;
  ai_queries_limit: number | null;
  documents_uploaded: number;
  documents_limit: number | null;
  seats_used: number;
  seats_limit: number | null;
  warnings: string[];
}

export interface UsageResponse {
  usage: UsageMetrics;
}

export interface DocumentItem {
  id: string;
  filename: string;
  size_bytes: number;
  status: string;
  chunk_count: number;
  created_at: string;
}

export interface Member {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface MemberListResponse {
  members: Member[];
  seats_used: number;
  seats_limit: number | null;
}

export interface Conversation {
  id: string;
  title: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { filename?: string; chunk_index?: number }[];
}
