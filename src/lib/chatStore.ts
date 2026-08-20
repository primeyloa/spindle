import { create } from "zustand";
import type { Message, Conversation, OnboardingData, ActionCall } from "../types/chat";

interface ChatState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  
  // Active conversation helpers
  activeConversation: Conversation | null;
  
  // Loading states
  isSending: boolean;
  isStreaming: boolean;
  streamingContent: string;

  // Actions
  createConversation: (title?: string) => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string) => void;
  
  addMessage: (message: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  updateStreamingContent: (content: string) => void;
  
  setConversationTitle: (id: string, title: string) => void;
  setOnboardingData: (id: string, data: Partial<OnboardingData>) => void;
  setOnboardingComplete: (id: string, complete: boolean) => void;
  
  setSending: (sending: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  clearStreaming: () => void;
  
  addActionToConversation: (conversationId: string, action: ActionCall) => void;
  updateAction: (conversationId: string, actionId: string, updates: Partial<ActionCall>) => void;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  isSending: false,
  isStreaming: false,
  streamingContent: "",

  createConversation: (title = "New Conversation") => {
    const id = generateId();
    const conversation: Conversation = {
      id,
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      onboardingComplete: false,
      onboardingData: {},
    };
    set((state) => ({
      conversations: [...state.conversations, conversation],
      activeConversationId: id,
      activeConversation: conversation,
    }));
    return id;
  },

  deleteConversation: (id) => {
    set((state) => {
      const remaining = state.conversations.filter((c) => c.id !== id);
      return {
        conversations: remaining,
        activeConversationId:
          state.activeConversationId === id
            ? remaining[0]?.id ?? null
            : state.activeConversationId,
        activeConversation:
          state.activeConversationId === id
            ? remaining[0] ?? null
            : state.activeConversation,
      };
    });
  },

  setActiveConversation: (id) => {
    const conv = get().conversations.find((c) => c.id === id) ?? null;
    set({ activeConversationId: id, activeConversation: conv });
  },

  addMessage: (message) => {
    const id = generateId();
    const msg: Message = {
      ...message,
      id,
      timestamp: Date.now(),
    };
    set((state) => {
      const updated = state.conversations.map((c) => {
        if (c.id !== state.activeConversationId) return c;
        return {
          ...c,
          messages: [...c.messages, msg],
          updatedAt: Date.now(),
        };
      });
      const active = updated.find((c) => c.id === state.activeConversationId) ?? null;
      return { conversations: updated, activeConversation: active };
    });
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => {
      const updated = state.conversations.map((c) => {
        if (c.id !== state.activeConversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
          updatedAt: Date.now(),
        };
      });
      const active = updated.find((c) => c.id === state.activeConversationId) ?? null;
      return { conversations: updated, activeConversation: active };
    });
  },

  updateStreamingContent: (content) => {
    set({ streamingContent: content });
  },

  setConversationTitle: (id, title) => {
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      );
      const active = updated.find((c) => c.id === state.activeConversationId) ?? null;
      return { conversations: updated, activeConversation: active };
    });
  },

  setOnboardingData: (id, data) => {
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === id
          ? { ...c, onboardingData: { ...c.onboardingData, ...data } }
          : c
      );
      const active = updated.find((c) => c.id === state.activeConversationId) ?? null;
      return { conversations: updated, activeConversation: active };
    });
  },

  setOnboardingComplete: (id, complete) => {
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === id ? { ...c, onboardingComplete: complete } : c
      );
      const active = updated.find((c) => c.id === state.activeConversationId) ?? null;
      return { conversations: updated, activeConversation: active };
    });
  },

  setSending: (isSending) => set({ isSending }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  clearStreaming: () => set({ streamingContent: "" }),

  addActionToConversation: (conversationId, action) => {
    set((state) => {
      const updated = state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          metadata: { ...c.metadata, pendingActions: [...(c.metadata?.pendingActions ?? []), action] },
        };
      });
      const active = updated.find((c) => c.id === state.activeConversationId) ?? null;
      return { conversations: updated, activeConversation: active };
    });
  },

  updateAction: (conversationId, actionId, updates) => {
    set((state) => {
      const updated = state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const actions: ActionCall[] = c.metadata?.pendingActions ?? [];
        return {
          ...c,
          metadata: {
            ...c.metadata,
            pendingActions: actions.map((a) =>
              a.id === actionId ? { ...a, ...updates } : a
            ),
          },
        };
      });
      const active = updated.find((c) => c.id === state.activeConversationId) ?? null;
      return { conversations: updated, activeConversation: active };
    });
  },
}));