import { create } from "zustand";
import type { FileNode, OpenTab, TerminalLine, ContextMenuState } from "../types/workspace";
import { saveWorkspace, loadWorkspace } from "./workspaceStorage";

// ── Language detection by extension ──────────────────────────────────────

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  html: "html",
  css: "css",
  py: "python",
  md: "markdown",
  yaml: "yaml",
  yml: "yaml",
  sh: "shell",
  bash: "shell",
  sql: "sql",
  xml: "xml",
  svg: "xml",
  txt: "plaintext",
  env: "plaintext",
  gitignore: "plaintext",
  dockerignore: "plaintext",
};

function detectLanguage(fileName: string): string {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase() ?? ""
    : "";
  return EXTENSION_LANGUAGE_MAP[ext] || "plaintext";
}

// ── ID Generator ─────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ── Demo workspace files ─────────────────────────────────────────────────

function createDemoFiles(): FileNode[] {
  return [
    {
      id: "dir-src",
      name: "src",
      type: "directory",
      path: "/src",
      children: [
        {
          id: "file-index",
          name: "index.ts",
          type: "file",
          path: "/src/index.ts",
          content: `import { createTool } from "./core";\n\nconst tool = createTool({\n  name: "My AI Tool",\n  version: "1.0.0",\n});\n\ntool.run();\n`,
          language: "typescript",
        },
        {
          id: "file-core",
          name: "core.ts",
          type: "file",
          path: "/src/core.ts",
          content: `export interface ToolConfig {\n  name: string;\n  version: string;\n}\n\nexport function createTool(config: ToolConfig) {\n  return {\n    name: config.name,\n    version: config.version,\n    run() {\n      console.log(\`Running \${config.name} v\${config.version}\`);\n    },\n  };\n}\n`,
          language: "typescript",
        },
        {
          id: "file-utils",
          name: "utils.ts",
          type: "file",
          path: "/src/utils.ts",
          content: `export function greet(name: string): string {\n  return \`Hello, \${name}! Welcome to Spindle.\`;\n}\n\nexport function sleep(ms: number): Promise<void> {\n  return new Promise((resolve) => setTimeout(resolve, ms));\n}\n`,
          language: "typescript",
        },
      ],
    },
    {
      id: "dir-public",
      name: "public",
      type: "directory",
      path: "/public",
      children: [
        {
          id: "file-index-html",
          name: "index.html",
          type: "file",
          path: "/public/index.html",
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My AI Tool</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script src="../src/index.ts" type="module"></script>\n</body>\n</html>\n`,
          language: "html",
        },
      ],
    },
    {
      id: "file-package",
      name: "package.json",
      type: "file",
      path: "/package.json",
      content: JSON.stringify(
        {
          name: "my-ai-tool",
          version: "1.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
          },
          dependencies: {},
        },
        null,
        2
      ),
      language: "json",
    },
    {
      id: "file-readme",
      name: "README.md",
      type: "file",
      path: "/README.md",
      content: `# My AI Tool\n\nBuilt with Spindle.\n\n## Usage\n\n\`\`\`bash\nnpm run dev\n\`\`\`\n`,
      language: "markdown",
    },
  ];
}

// ── Debounce helper (for auto-save) ──────────────────────────────────────

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, ms);
  };
  return debounced as unknown as T;
}

// ── Workspace Store ──────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface WorkspaceState {
  // File tree
  fileTree: FileNode[];
  selectedFileId: string | null;

  // Tabs
  openTabs: OpenTab[];
  activeTabId: string | null;

  // Editor content
  editorContent: string;

  // Terminal
  terminalLines: TerminalLine[];

  // Context menu
  contextMenu: ContextMenuState;

  // Loading & save
  isLoading: boolean;
  saveStatus: SaveStatus;
  currentToolId: string;

  // Actions
  setFileTree: (tree: FileNode[]) => void;
  selectFile: (fileId: string) => void;
  openFile: (fileId: string) => void;
  closeTab: (fileId: string) => void;
  setActiveTab: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  setEditorContent: (content: string) => void;

  // File CRUD
  createFile: (parentPath: string, name: string, isDirectory?: boolean) => void;
  deleteNode: (nodeId: string) => void;
  renameNode: (nodeId: string, newName: string) => void;

  // Context menu
  openContextMenu: (x: number, y: number, node: FileNode) => void;
  closeContextMenu: () => void;

  // Terminal
  addTerminalLine: (line: Omit<TerminalLine, "id" | "timestamp">) => void;
  clearTerminal: () => void;

  // Workspace setup
  loadWorkspace: (toolId?: string) => Promise<void>;
  resetWorkspace: () => void;

  // Persistence
  saveToStorage: () => Promise<boolean>;
  loadFromStorage: (toolId?: string) => Promise<boolean>;
  setCurrentToolId: (toolId: string) => void;

  // Helpers
  getFileById: (id: string, nodes?: FileNode[]) => FileNode | null;
  getFileTreeForZip: () => FileNode[];
}

// ── Debounced auto-save ───────────────────────────────────────────────────

const _autoSave = debounce(async (toolId: string) => {
  const state = useWorkspaceStore.getState();
  if (state.fileTree.length === 0) return;

  useWorkspaceStore.setState({ saveStatus: "saving" });
  const ok = await saveWorkspace(state.fileTree, toolId);
  useWorkspaceStore.setState({ saveStatus: ok ? "saved" : "error" });

  // Reset "saved" back to "idle" after 2s
  setTimeout(() => {
    const current = useWorkspaceStore.getState().saveStatus;
    if (current === "saved") useWorkspaceStore.setState({ saveStatus: "idle" });
  }, 2000);
}, 1500);

function triggerAutoSave() {
  const { currentToolId, fileTree } = useWorkspaceStore.getState();
  if (fileTree.length === 0) return;
  _autoSave(currentToolId);
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  fileTree: [],
  selectedFileId: null,
  openTabs: [],
  activeTabId: null,
  editorContent: "",
  terminalLines: [],
  contextMenu: { isOpen: false, x: 0, y: 0, targetNode: null },
  isLoading: false,
  saveStatus: "idle",
  currentToolId: "default",

  // ── File Operations ──────────────────────────────────────────────────

  setFileTree: (fileTree) => {
    set({ fileTree });
    triggerAutoSave();
  },

  selectFile: (fileId) => set({ selectedFileId: fileId }),

  openFile: (fileId) => {
    const file = get().getFileById(fileId);
    if (!file || file.type !== "file") return;

    const existingTab = get().openTabs.find((t) => t.fileId === fileId);
    if (!existingTab) {
      const newTab: OpenTab = {
        fileId: file.id,
        path: file.path,
        name: file.name,
        language: file.language || detectLanguage(file.name),
        isDirty: false,
      };
      set((state) => ({
        openTabs: [...state.openTabs, newTab],
        activeTabId: fileId,
        selectedFileId: fileId,
        editorContent: file.content || "",
      }));
    } else {
      set({
        activeTabId: fileId,
        selectedFileId: fileId,
        editorContent: file.content || "",
      });
    }
  },

  closeTab: (fileId) => {
    set((state) => {
      const remaining = state.openTabs.filter((t) => t.fileId !== fileId);
      let nextActive = state.activeTabId;
      if (state.activeTabId === fileId) {
        const idx = state.openTabs.findIndex((t) => t.fileId === fileId);
        nextActive = remaining[Math.min(idx, remaining.length - 1)]?.fileId ?? null;
      }
      return {
        openTabs: remaining,
        activeTabId: nextActive,
        editorContent: nextActive
          ? get().getFileById(nextActive)?.content || ""
          : "",
      };
    });
  },

  setActiveTab: (fileId) => {
    const file = get().getFileById(fileId);
    set({
      activeTabId: fileId,
      selectedFileId: fileId,
      editorContent: file?.content || "",
    });
  },

  updateFileContent: (fileId, content) => {
    set((state) => {
      const updateNode = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) => {
          if (n.id === fileId && n.type === "file") {
            return { ...n, content };
          }
          if (n.children) return { ...n, children: updateNode(n.children) };
          return n;
        });

      const updatedTabs = state.openTabs.map((t) =>
        t.fileId === fileId ? { ...t, isDirty: true } : t
      );

      return {
        fileTree: updateNode(state.fileTree),
        openTabs: updatedTabs,
        editorContent: content,
      };
    });
    triggerAutoSave();
  },

  setEditorContent: (content) => set({ editorContent: content }),

  // ── File CRUD ────────────────────────────────────────────────────────

  createFile: (parentPath, name, isDirectory = false) => {
    const id = generateId();
    const newPath = `${parentPath}/${name}`.replace(/\/+/g, "/");
    const newNode: FileNode = {
      id,
      name,
      type: isDirectory ? "directory" : "file",
      path: newPath,
      content: isDirectory ? undefined : "",
      children: isDirectory ? [] : undefined,
      language: isDirectory ? undefined : detectLanguage(name),
    };

    set((state) => {
      const addToParent = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) => {
          if (n.type === "directory" && n.path === parentPath) {
            return { ...n, children: [...(n.children || []), newNode] };
          }
          if (n.children) return { ...n, children: addToParent(n.children) };
          return n;
        });

      return { fileTree: addToParent(state.fileTree) };
    });

    // If it's a file, auto-open it
    if (!isDirectory) {
      get().openFile(id);
    }
    triggerAutoSave();
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const removeFromTree = (nodes: FileNode[]): FileNode[] =>
        nodes
          .filter((n) => n.id !== nodeId)
          .map((n) =>
            n.children ? { ...n, children: removeFromTree(n.children) } : n
          );

      const newTree = removeFromTree(state.fileTree);

      // Close any tabs for this file
      const newTabs = state.openTabs.filter((t) => t.fileId !== nodeId);
      let newActive = state.activeTabId;
      if (state.activeTabId === nodeId) {
        newActive = newTabs[newTabs.length - 1]?.fileId ?? null;
      }

      return {
        fileTree: newTree,
        openTabs: newTabs,
        activeTabId: newActive,
        selectedFileId: state.selectedFileId === nodeId ? null : state.selectedFileId,
        editorContent:
          state.activeTabId === nodeId
            ? newActive
              ? get().getFileById(newActive)?.content || ""
              : ""
            : state.editorContent,
      };
    });
    triggerAutoSave();
  },

  renameNode: (nodeId, newName) => {
    set((state) => {
      const renameInTree = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) => {
          if (n.id === nodeId) {
            const parts = n.path.split("/");
            parts[parts.length - 1] = newName;
            return {
              ...n,
              name: newName,
              path: parts.join("/"),
              language: n.type === "file" ? detectLanguage(newName) : n.language,
            };
          }
          if (n.children) return { ...n, children: renameInTree(n.children) };
          return n;
        });

      const newTree = renameInTree(state.fileTree);
      const renamed = get().getFileById(nodeId, newTree);

      // Update tabs
      const newTabs = state.openTabs.map((t) =>
        t.fileId === nodeId && renamed && renamed.type === "file"
          ? {
              ...t,
              name: renamed.name,
              path: renamed.path,
              language: detectLanguage(renamed.name),
            }
          : t
      );

      return { fileTree: newTree, openTabs: newTabs };
    });
    triggerAutoSave();
  },

  // ── Context Menu ─────────────────────────────────────────────────────

  openContextMenu: (x, y, node) =>
    set({ contextMenu: { isOpen: true, x, y, targetNode: node } }),

  closeContextMenu: () =>
    set({ contextMenu: { isOpen: false, x: 0, y: 0, targetNode: null } }),

  // ── Terminal ─────────────────────────────────────────────────────────

  addTerminalLine: (line) => {
    const entry: TerminalLine = {
      ...line,
      id: generateId(),
      timestamp: Date.now(),
    };
    set((state) => ({
      terminalLines: [...state.terminalLines, entry],
    }));
  },

  clearTerminal: () => set({ terminalLines: [] }),

  // ── Workspace Setup ──────────────────────────────────────────────────

  loadWorkspace: async (toolId?: string) => {
    const tid = toolId || "default";
    set({ isLoading: true, currentToolId: tid });

    // Try loading from storage first
    const stored = await loadWorkspace(tid);
    if (stored && stored.length > 0) {
      set({ fileTree: stored as FileNode[], isLoading: false });

      // Auto-open the first file
      const firstFile = (stored as FileNode[])[0];
      if (firstFile) {
        const fileToOpen =
          firstFile.type === "file"
            ? firstFile
            : firstFile.children?.[0];
        if (fileToOpen) {
          get().openFile(fileToOpen.id);
        }
      }
      return;
    }

    // Fall back to demo workspace
    const files = createDemoFiles();
    set({
      fileTree: files,
      openTabs: [],
      activeTabId: null,
      selectedFileId: null,
      editorContent: "",
      terminalLines: [],
      isLoading: false,
    });

    const firstFile = files[0]?.children?.[0];
    if (firstFile) {
      get().openFile(firstFile.id);
    }
  },

  resetWorkspace: () => {
    set({
      fileTree: [],
      selectedFileId: null,
      openTabs: [],
      activeTabId: null,
      editorContent: "",
      terminalLines: [],
      contextMenu: { isOpen: false, x: 0, y: 0, targetNode: null },
      saveStatus: "idle",
      currentToolId: "default",
    });
  },

  // ── Persistence ──────────────────────────────────────────────────────

  saveToStorage: async () => {
    const { fileTree, currentToolId } = get();
    if (fileTree.length === 0) return false;

    set({ saveStatus: "saving" });
    const ok = await saveWorkspace(fileTree, currentToolId);
    set({ saveStatus: ok ? "saved" : "error" });

    if (ok) {
      setTimeout(() => {
        const current = useWorkspaceStore.getState().saveStatus;
        if (current === "saved") set({ saveStatus: "idle" });
      }, 2000);
    }
    return ok;
  },

  loadFromStorage: async (toolId?: string) => {
    const tid = toolId || get().currentToolId;
    set({ isLoading: true });

    const stored = await loadWorkspace(tid);
    if (stored && stored.length > 0) {
      set({
        fileTree: stored as FileNode[],
        currentToolId: tid,
        isLoading: false,
        openTabs: [],
        activeTabId: null,
        selectedFileId: null,
        editorContent: "",
      });

      const firstFile = (stored as FileNode[])[0];
      if (firstFile) {
        const fileToOpen =
          firstFile.type === "file"
            ? firstFile
            : firstFile.children?.[0];
        if (fileToOpen) {
          get().openFile(fileToOpen.id);
        }
      }
      return true;
    }

    set({ isLoading: false });
    return false;
  },

  setCurrentToolId: (toolId) => set({ currentToolId: toolId }),

  // ── Helpers ──────────────────────────────────────────────────────────

  getFileById: (id, nodes) => {
    const search = (items: FileNode[]): FileNode | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = search(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return search(nodes || get().fileTree);
  },

  getFileTreeForZip: () => get().fileTree,
}));