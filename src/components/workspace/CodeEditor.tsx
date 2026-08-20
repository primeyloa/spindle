import { useCallback, useRef, useEffect } from "react";
import { useWorkspaceStore } from "../../lib/workspaceStore";
import { X, FileCode } from "lucide-react";
import type { OpenTab } from "../../types/workspace";

// Static import — Workspace page is already lazy-loaded at route level
import Editor from "@monaco-editor/react";

// ── Language to Monaco ID ────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  json: "json",
  html: "html",
  css: "css",
  python: "python",
  markdown: "markdown",
  yaml: "yaml",
  shell: "shell",
  sql: "sql",
  xml: "xml",
  plaintext: "plaintext",
};

// ── Tab Bar ──────────────────────────────────────────────────────────────

function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeTabId]);

  return (
    <div
      className="flex items-center h-9 bg-background border-b border-border overflow-x-auto shrink-0 scrollbar-none"
      role="tablist"
      aria-label="Open files"
    >
      {tabs.map((tab) => {
        const isActive = tab.fileId === activeTabId;
        return (
          <div
            key={tab.fileId}
            className={`flex items-center gap-1 px-3 h-full border-r border-border shrink-0 group ${
              isActive
                ? "bg-[#0F172A] border-b-2 border-b-accent"
                : "bg-transparent hover:bg-muted/20"
            }`}
            role="tab"
            aria-selected={isActive}
          >
            <button
              ref={isActive ? activeRef : undefined}
              className="flex items-center gap-1.5 text-xs min-w-0 cursor-pointer"
              onClick={() => onSelectTab(tab.fileId)}
              title={tab.path}
            >
              <span
                className={`truncate max-w-[120px] ${
                  isActive ? "text-foreground font-medium" : "text-text-muted"
                }`}
              >
                {tab.name}
              </span>
              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              )}
            </button>
            <button
              className="p-0.5 rounded hover:bg-muted/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.fileId);
              }}
              aria-label={`Close ${tab.name}`}
            >
              <X className="w-3 h-3 text-text-muted" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────

function EditorSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-4 gap-3">
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-4 w-1/2 rounded" />
      <div className="skeleton h-4 w-5/6 rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-4 w-4/5 rounded" />
      <div className="skeleton h-4 w-1/3 rounded" />
    </div>
  );
}

// ── Main CodeEditor Component ────────────────────────────────────────────

export default function CodeEditor() {
  const {
    openTabs,
    activeTabId,
    editorContent,
    setActiveTab,
    closeTab,
    updateFileContent,
    setEditorContent,
  } = useWorkspaceStore();

  const editorRef = useRef<any>(null);

  const activeTab = openTabs.find((t) => t.fileId === activeTabId);
  const language = activeTab ? LANG_MAP[activeTab.language] || "plaintext" : "plaintext";

  const handleEditorMount = useCallback(
    (editor: any, monaco: any) => {
      editorRef.current = editor;

      // Define custom theme
      try {
        monaco.editor.defineTheme("spindle-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "comment", foreground: "6A9955" },
            { token: "keyword", foreground: "569CD6" },
            { token: "string", foreground: "CE9178" },
            { token: "number", foreground: "B5CEA8" },
            { token: "type", foreground: "4EC9B0" },
            { token: "function", foreground: "DCDCAA" },
            { token: "variable", foreground: "9CDCFE" },
          ],
          colors: {
            "editor.background": "#0F172A",
            "editor.foreground": "#F8FAFC",
            "editor.lineHighlightBackground": "#1E293B",
            "editor.selectionBackground": "#334155",
            "editor.inactiveSelectionBackground": "#272F42",
            "editorCursor.foreground": "#22C55E",
            "editorLineNumber.foreground": "#475569",
            "editorLineNumber.activeForeground": "#94A3B8",
            "editor.selectionHighlightBackground": "#22C55E20",
            "editorBracketMatch.background": "#22C55E30",
            "editorBracketMatch.border": "#22C55E",
            "editorGutter.background": "#0F172A",
            "editorWidget.background": "#1E293B",
            "editorWidget.border": "#334155",
          },
        });
      } catch {}

      // Ctrl+S / Cmd+S to save
      editor.addAction({
        id: "save",
        label: "Save",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: (ed: any) => {
          const content = ed.getValue();
          if (activeTabId) {
            updateFileContent(activeTabId, content);
            // Mark tab as not dirty
            const store = useWorkspaceStore.getState();
            const updatedTabs = store.openTabs.map((t) =>
              t.fileId === activeTabId ? { ...t, isDirty: false } : t
            );
            useWorkspaceStore.setState({ openTabs: updatedTabs });
          }
        },
      });

      editor.focus();
    },
    [activeTabId, updateFileContent]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setEditorContent(value);
        if (activeTabId) {
          updateFileContent(activeTabId, value);
        }
      }
    },
    [activeTabId, updateFileContent, setEditorContent]
  );

  // ── Empty State (no open tabs) ─────────────────────────────────────────
  if (openTabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F172A]">
        <div className="text-center p-8 max-w-xs">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-muted/30 flex items-center justify-center">
            <FileCode className="w-6 h-6 text-text-muted/60" />
          </div>
          <p className="text-sm text-text-muted">
            Select a file from the explorer to start editing, or create a new file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0F172A] min-w-0">
      {/* Tab bar */}
      <TabBar
        tabs={openTabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTab}
        onCloseTab={closeTab}
      />

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          key={activeTabId || "empty"}
          height="100%"
          language={language}
          value={editorContent}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme="spindle-dark"
          loading={<EditorSkeleton />}
          options={{
            fontSize: 13,
            fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorStyle: "line",
            cursorWidth: 2,
            smoothScrolling: true,
            padding: { top: 12 },
            tabSize: 2,
            insertSpaces: true,
            bracketPairColorization: { enabled: true },
            autoClosingQuotes: "always",
            autoClosingBrackets: "always",
            formatOnPaste: true,
            wordWrap: "off",
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            folding: true,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}