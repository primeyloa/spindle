import { useEffect, useState, useCallback } from "react";
import { useWorkspaceStore } from "../lib/workspaceStore";
import FileTree from "../components/workspace/FileTree";
import CodeEditor from "../components/workspace/CodeEditor";
import TerminalPanel from "../components/workspace/Terminal";
import {
  Download,
  Loader2,
  Cloud,
  CloudOff,
  CheckCircle2,
  Save,
} from "lucide-react";

export default function Workspace() {
  const {
    fileTree,
    loadWorkspace,
    isLoading,
    addTerminalLine,
    saveStatus,
    saveToStorage,
  } = useWorkspaceStore();
  const [isZipping, setIsZipping] = useState(false);

  // Load demo workspace on mount
  useEffect(() => {
    if (fileTree.length === 0) {
      loadWorkspace();
    }
  }, [fileTree.length, loadWorkspace]);

  // ── ZIP Download ──────────────────────────────────────────────────────

  const handleDownloadZip = useCallback(async () => {
    if (isZipping) return;
    setIsZipping(true);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Recursively add files
      function addFilesToZip(nodes: typeof fileTree, parentPath: string) {
        for (const node of nodes) {
          const fullPath = parentPath
            ? `${parentPath}/${node.name}`
            : node.name;
          if (node.type === "directory") {
            const folder = zip.folder(fullPath);
            if (folder && node.children) {
              addFilesToZip(node.children, fullPath);
            }
          } else {
            zip.file(fullPath, node.content || "");
          }
        }
      }

      addFilesToZip(fileTree, "");

      const blob = await zip.generateAsync({ type: "blob" });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spindle-workspace.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addTerminalLine({
        content: "✅ Workspace downloaded as spindle-workspace.zip",
        type: "system",
      });
    } catch (err) {
      console.error("ZIP error:", err);
      addTerminalLine({
        content: `❌ Failed to create ZIP: ${err instanceof Error ? err.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      setIsZipping(false);
    }
  }, [fileTree, isZipping, addTerminalLine]);

  // ── Loading State ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
        <span className="text-sm text-text-muted">Loading workspace...</span>
      </div>
    );
  }

  // ── Empty State ───────────────────────────────────────────────────────

  if (fileTree.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center p-8 max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-text-muted/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Workspace
          </h3>
          <p className="text-sm text-text-muted mb-6">
            Build an AI tool through the chat interface, and your workspace will
            appear here with all the generated files.
          </p>
          <div className="flex flex-col gap-2">
            <button
              className="btn-primary text-xs"
              onClick={() => loadWorkspace()}
            >
              Load Demo Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Workspace Layout ─────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Workspace toolbar */}
      <div className="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border bg-background/80">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-foreground">
            Workspace
          </span>
          {/* Save status indicator */}
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-accent" />
                Saving...
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Saved
              </>
            )}
            {saveStatus === "error" && (
              <>
                <CloudOff className="w-3 h-3 text-destructive" />
                Save failed
              </>
            )}
            {saveStatus === "idle" && (
              <>
                <Cloud className="w-3 h-3 text-text-muted/60" />
                Auto-save
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-xs px-2 py-1 gap-1"
            onClick={() => saveToStorage()}
            disabled={saveStatus === "saving"}
            title="Save workspace"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
          <button
            className="btn-secondary text-xs px-2.5 py-1 gap-1.5"
            onClick={handleDownloadZip}
            disabled={isZipping}
          >
            {isZipping ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download ZIP
          </button>
        </div>
      </div>

      {/* Main content: FileTree + Editor + Terminal */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-1 min-h-0">
          {/* File Tree sidebar */}
          <aside
            aria-label="File explorer"
            className="w-52 shrink-0 border-r border-border bg-background/50 overflow-y-auto hidden md:block"
          >
            <FileTree />
          </aside>

          {/* Code Editor */}
          <section className="flex-1 flex flex-col min-w-0">
            <CodeEditor />
          </section>
        </div>

        {/* Terminal */}
        <TerminalPanel />
      </div>
    </div>
  );
}