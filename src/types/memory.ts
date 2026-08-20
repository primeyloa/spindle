// ── Memory Types ─────────────────────────────────────────────────────────

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  source: "manual" | "document" | "agent" | "chat";
  created_at: string;
  updated_at: string;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  source: string;
  created_at: string;
  updated_at: string;
  similarity?: number;
}

export interface CreateMemoryInput {
  content: string;
  metadata?: Record<string, unknown>;
  source?: "manual" | "document" | "agent" | "chat";
}