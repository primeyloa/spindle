import { supabase } from "./supabase";
import { useAuthStore } from "./store";
import type { FileNode } from "../types/workspace";

// ── Constants ──────────────────────────────────────────────────────────────

const BUCKET = "workspace";
const WORKSPACE_FILE = "workspace.json";
const LOCAL_STORAGE_KEY = "spindle-workspace";

// ── Helpers ────────────────────────────────────────────────────────────────

function getStoragePath(toolId: string): string | null {
  const { user, isAnonymous } = useAuthStore.getState();
  const userId = user?.id ?? (isAnonymous ? "anonymous" : null);
  if (!userId) return null;
  return `${userId}/${toolId}/${WORKSPACE_FILE}`;
}

function flattenTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  function walk(items: FileNode[]) {
    for (const item of items) {
      result.push(item);
      if (item.children) walk(item.children);
    }
  }
  walk(nodes);
  return result;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Save workspace file tree to Supabase Storage (authenticated users)
 * or localStorage (anonymous).
 */
export async function saveWorkspace(
  fileTree: FileNode[],
  toolId: string = "default"
): Promise<boolean> {
  try {
    const { user, isAnonymous } = useAuthStore.getState();

    // Anonymous fallback — localStorage
    if (!user || isAnonymous) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fileTree));
      } catch {
        // localStorage might be full
      }
      return true;
    }

    // Authenticated — Supabase Storage
    const path = getStoragePath(toolId);
    if (!path) return false;

    const blob = new Blob([JSON.stringify(fileTree, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true });

    if (error) {
      console.error("Failed to save workspace to storage:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("saveWorkspace error:", err);
    return false;
  }
}

/**
 * Load workspace file tree from Supabase Storage (authenticated users)
 * or localStorage (anonymous).
 */
export async function loadWorkspace(
  toolId: string = "default"
): Promise<FileNode[] | null> {
  try {
    const { user, isAnonymous } = useAuthStore.getState();

    // Anonymous fallback — localStorage
    if (!user || isAnonymous) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as FileNode[];
          // Ensure all files have IDs (migrate old data)
          return ensureIds(parsed);
        }
      } catch {
        // Invalid JSON or other error
      }
      return null;
    }

    // Authenticated — Supabase Storage
    const path = getStoragePath(toolId);
    if (!path) return null;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(path);

    if (error) {
      if (!error.message.includes("not found")) {
        console.error("Failed to load workspace from storage:", error.message);
      }
      return null;
    }

    const text = await data.text();
    const parsed = JSON.parse(text) as FileNode[];
    return ensureIds(parsed);
  } catch (err) {
    console.error("loadWorkspace error:", err);
    return null;
  }
}

/**
 * Delete a workspace from storage.
 */
export async function deleteWorkspace(
  toolId: string = "default"
): Promise<boolean> {
  try {
    const { user, isAnonymous } = useAuthStore.getState();

    if (!user || isAnonymous) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return true;
    }

    const path = getStoragePath(toolId);
    if (!path) return false;

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      console.error("Failed to delete workspace:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("deleteWorkspace error:", err);
    return false;
  }
}

/**
 * List all saved tool workspaces for the current user.
 */
export async function listWorkspaces(): Promise<string[]> {
  try {
    const { user, isAnonymous } = useAuthStore.getState();
    if (!user || isAnonymous) return [];

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(`${user.id}/`, { limit: 100 });

    if (error) {
      console.error("Failed to list workspaces:", error.message);
      return [];
    }

    return (data || [])
      .filter((item) => item.id && item.metadata) // files only
      .map((item) => item.name!.replace(".json", ""));
  } catch (err) {
    console.error("listWorkspaces error:", err);
    return [];
  }
}

/**
 * Export the workspace file tree as a plain object (for ZIP, etc.).
 */
export function exportWorkspaceJson(fileTree: FileNode[]): string {
  return JSON.stringify(fileTree, null, 2);
}

// ── Internal Helpers ────────────────────────────────────────────────────────

let _nextId = 1;
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ws-${Date.now()}-${_nextId++}`;
}

/**
 * Ensure every node in the tree has an `id` field (migrate legacy data).
 */
function ensureIds(nodes: FileNode[]): FileNode[] {
  return nodes.map((n) => ({
    ...n,
    id: n.id || generateId(),
    children: n.children ? ensureIds(n.children) : undefined,
  }));
}

/**
 * Generate a simple snapshot of file metadata (for terminal `ls`).
 */
export function getFileList(nodes: FileNode[]): string[] {
  const flat = flattenTree(nodes);
  return flat.map((n) => {
    const icon = n.type === "directory" ? "📁" : "📄";
    const size = n.content ? `${n.content.length}B` : "";
    return `${icon} ${n.path}${size ? ` (${size})` : ""}`;
  });
}