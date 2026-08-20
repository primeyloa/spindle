// ── Message Types ────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export type OnboardingStep = "goal" | "level" | "os" | "preferences" | "plan" | "complete";

export interface OnboardingData {
  goal: string;
  level: "beginner" | "intermediate" | "expert";
  os: "macOS" | "Windows" | "Linux" | "Web";
  preferences: string;
}

export interface ActionCall {
  id: string;
  name: string;
  description: string;
  params: Record<string, unknown>;
  status: "pending" | "approved" | "declined" | "modified" | "executing" | "done" | "failed";
}

export interface PlanStep {
  step: number;
  title: string;
  description: string;
}

export type CardType =
  | { type: "info"; content: string; icon?: string }
  | { type: "onboarding"; step: OnboardingStep; data: Partial<OnboardingData> }
  | { type: "plan"; steps: PlanStep[]; summary: string; model?: string }
  | { type: "approval"; action: ActionCall }
  | { type: "action_result"; action: ActionCall; result: string; success: boolean }
  | { type: "streaming"; content: string };

// ── Message ──────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  card?: CardType;
  timestamp: number;
  isStreaming?: boolean;
}

// ── Conversation ─────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  toolId?: string;
  createdAt: number;
  updatedAt: number;
  onboardingComplete: boolean;
  onboardingData?: Partial<OnboardingData>;
  metadata?: {
    pendingActions: ActionCall[];
  };
}