import { create } from "zustand";
import { supabase, supabaseUrl } from "./supabase";
import type { Memory, MemorySearchResult, CreateMemoryInput } from "../types/memory";

interface MemoryState {
  memories: Memory[];
  searchResults: MemorySearchResult[];
  isSearching: boolean;
  isLoading: boolean;
  count: number;

  // Actions
  fetchMemories: () => Promise<void>;
  searchMemories: (query: string) => Promise<MemorySearchResult[]>;
  addMemory: (input: CreateMemoryInput) => Promise<Memory | null>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  fetchCount: () => Promise<void>;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  searchResults: [],
  isSearching: false,
  isLoading: false,
  count: 0,

  fetchMemories: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ memories: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from("memories")
        .select("id, user_id, content, metadata, source, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      set({ memories: (data as Memory[]) || [], count: data?.length || 0 });
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  searchMemories: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return [];
    }

    set({ isSearching: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isSearching: false });
        return [];
      }

      // Call the memory-search edge function
      const response = await fetch(
        `${supabaseUrl}/functions/v1/memory-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
          },
          body: JSON.stringify({ userId: user.id, query: query.trim(), limit: 20 }),
        }
      );

      if (!response.ok) {
        console.warn("Semantic search failed, falling back to keyword search");
        // Fall back to keyword search (ILIKE)
        const { data, error } = await supabase
          .from("memories")
          .select("id, user_id, content, metadata, source, created_at, updated_at")
          .eq("user_id", user.id)
          .ilike("content", `%${query.trim()}%`)
          .limit(20);

        if (error) throw error;
        set({ searchResults: (data as MemorySearchResult[]) || [], isSearching: false });
        return (data as MemorySearchResult[]) || [];
      }

      const result = await response.json();
      const results = result.memories || [];
      set({ searchResults: results, isSearching: false });
      return results;
    } catch (err) {
      console.error("Search failed:", err);
      set({ isSearching: false });
      return [];
    }
  },

  addMemory: async (input: CreateMemoryInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // For anonymous users, store in localStorage as fallback
        const localMemory: Memory = {
          id: generateId(),
          user_id: "anonymous",
          content: input.content,
          metadata: input.metadata || {},
          source: input.source || "manual",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          memories: [localMemory, ...state.memories],
          count: state.count + 1,
        }));
        return localMemory;
      }

      const { data, error } = await supabase
        .from("memories")
        .insert({
          user_id: user.id,
          content: input.content,
          metadata: input.metadata || {},
          source: input.source || "manual",
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh count
      await get().fetchCount();

      // Refresh list
      await get().fetchMemories();

      return data as Memory;
    } catch (err) {
      console.error("Failed to add memory:", err);
      return null;
    }
  },

  updateMemory: async (id: string, updates: Partial<Memory>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Update in local state for anonymous
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
          ),
        }));
        return;
      }

      const { error } = await supabase
        .from("memories")
        .update({
          content: updates.content,
          metadata: updates.metadata,
          ...(updates.content ? {} : {}), // embedding auto-generated by webhook
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      set((state) => ({
        memories: state.memories.map((m) =>
          m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
        ),
      }));
    } catch (err) {
      console.error("Failed to update memory:", err);
    }
  },

  deleteMemory: async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Delete from local state
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
          count: Math.max(0, state.count - 1),
        }));
        return;
      }

      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      set((state) => ({
        memories: state.memories.filter((m) => m.id !== id),
        count: Math.max(0, state.count - 1),
      }));
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  },

  fetchCount: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ count: get().memories.length });
        return;
      }

      const { count, error } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      set({ count: count ?? 0 });
    } catch (err) {
      console.error("Failed to fetch memory count:", err);
    }
  },
}));

// Helper to extract text from uploaded files
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt" || ext === "md") {
    return await file.text();
  }

  if (ext === "pdf") {
    // For PDFs, we'd use pdf.js — fallback to readme for now
    throw new Error("PDF extraction requires pdf.js. Please paste the text directly.");
  }

  throw new Error(`Unsupported file type: .${ext}. Supported: .txt, .md`);
}