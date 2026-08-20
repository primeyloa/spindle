// ── File System Types ──────────────────────────────────────────────────

export type FileType = "file" | "directory";

export interface FileNode {
  id: string;
  name: string;
  type: FileType;
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
}

// ── Open Tab ─────────────────────────────────────────────────────────────

export interface OpenTab {
  fileId: string;
  path: string;
  name: string;
  language: string;
  isDirty: boolean;
}

// ── Terminal Line ────────────────────────────────────────────────────────

export interface TerminalLine {
  id: string;
  content: string;
  type: "input" | "output" | "error" | "system";
  timestamp: number;
}

// ── Context Menu ─────────────────────────────────────────────────────────

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetNode: FileNode | null;
}