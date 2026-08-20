import { useState, useCallback, useEffect, useRef } from "react";
import { useWorkspaceStore } from "../../lib/workspaceStore";
import type { FileNode, ContextMenuState } from "../../types/workspace";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  FileCode,
  FileJson,
  FileText,
  Image,
} from "lucide-react";

// ── File icon by extension ───────────────────────────────────────────────

function FileIcon({
  node,
  className = "w-3.5 h-3.5",
}: {
  node: FileNode;
  className?: string;
}) {
  if (node.type === "directory") {
    return null; // handled by the expand arrow + folder icon in TreeNode
  }

  const ext = node.name.includes(".")
    ? node.name.split(".").pop()?.toLowerCase() ?? ""
    : "";

  const iconClass = `${className} shrink-0`;

  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return <FileCode className={`${iconClass} text-blue-400`} />;
    case "json":
      return <FileJson className={`${iconClass} text-yellow-400`} />;
    case "html":
      return <FileCode className={`${iconClass} text-orange-400`} />;
    case "css":
      return <FileCode className={`${iconClass} text-pink-400`} />;
    case "md":
      return <FileText className={`${iconClass} text-text-muted`} />;
    case "svg":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
      return <Image className={`${iconClass} text-purple-400`} />;
    case "py":
      return <FileCode className={`${iconClass} text-green-400`} />;
    case "yaml":
    case "yml":
      return <FileCode className={`${iconClass} text-red-400`} />;
    default:
      return <File className={`${iconClass} text-text-muted`} />;
  }
}

// ── Single Tree Node ─────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  selectedFileId,
  onSelect,
  onContextMenu,
}: {
  node: FileNode;
  depth: number;
  selectedFileId: string | null;
  onSelect: (node: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isDirectory = node.type === "directory";
  const isSelected = selectedFileId === node.id;

  const handleClick = useCallback(() => {
    if (isDirectory) {
      setExpanded((e) => !e);
    } else {
      onSelect(node);
    }
  }, [isDirectory, node, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded-md text-xs transition-all duration-150 ${
          isSelected
            ? "bg-primary/20 text-foreground font-medium"
            : "text-text-muted hover:text-foreground hover:bg-muted/30"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => onContextMenu(e, node)}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={isDirectory ? expanded : undefined}
        tabIndex={0}
      >
        {/* Expand arrow for directories */}
        {isDirectory ? (
          <span className="shrink-0 w-4 flex justify-center">
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-text-muted" />
            ) : (
              <ChevronRight className="w-3 h-3 text-text-muted" />
            )}
          </span>
        ) : (
          <span className="shrink-0 w-4" />
        )}

        {/* Folder or file icon */}
        {isDirectory ? (
          expanded ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-yellow-500" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0 text-yellow-500" />
          )
        ) : (
          <FileIcon node={node} />
        )}

        {/* Name */}
        <span className="truncate flex-1 min-w-0">{node.name}</span>
      </div>

      {/* Children */}
      {isDirectory && expanded && node.children && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFileId={selectedFileId}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Context Menu ─────────────────────────────────────────────────────────

function ContextMenu({
  contextMenu,
  onClose,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu.isOpen, onClose]);

  if (!contextMenu.isOpen || !contextMenu.targetNode) return null;

  const node = contextMenu.targetNode;
  const parentPath = node.type === "directory" ? node.path : node.path.split("/").slice(0, -1).join("/") || "/";

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-44 py-1 rounded-lg border border-border bg-background shadow-xl"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      role="menu"
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted/40 transition-colors"
        onClick={() => {
          onCreateFile(parentPath);
          onClose();
        }}
        role="menuitem"
      >
        <Plus className="w-3 h-3" />
        New File
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted/40 transition-colors"
        onClick={() => {
          onCreateFolder(parentPath);
          onClose();
        }}
        role="menuitem"
      >
        <Plus className="w-3 h-3" />
        New Folder
      </button>
      <div className="border-t border-border my-1" />
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted/40 transition-colors"
        onClick={() => {
          onRename(node);
          onClose();
        }}
        role="menuitem"
      >
        <Pencil className="w-3 h-3" />
        Rename
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-muted/40 transition-colors"
        onClick={() => {
          onDelete(node);
          onClose();
        }}
        role="menuitem"
      >
        <Trash2 className="w-3 h-3" />
        Delete
      </button>
    </div>
  );
}

// ── Inline Rename Input ──────────────────────────────────────────────────

function RenameInput({
  initialValue,
  onConfirm,
  onCancel,
}: {
  initialValue: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) onConfirm(value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      className="w-full rounded border border-accent bg-background px-1 py-0.5 text-xs text-foreground outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => value.trim() && onConfirm(value.trim())}
    />
  );
}

// ── Main FileTree Component ──────────────────────────────────────────────

export default function FileTree() {
  const {
    fileTree,
    selectedFileId,
    openFile,
    contextMenu,
    openContextMenu,
    closeContextMenu,
    createFile,
    deleteNode,
    renameNode,
    addTerminalLine,
  } = useWorkspaceStore();

  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);

  const handleSelect = useCallback(
    (node: FileNode) => {
      if (node.type === "file") {
        openFile(node.id);
      }
    },
    [openFile]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
      e.stopPropagation();
      openContextMenu(e.clientX, e.clientY, node);
    },
    [openContextMenu]
  );

  const handleCreateFile = useCallback(
    (parentPath: string) => {
      createFile(parentPath, "new-file.ts");
      addTerminalLine({ content: `Created new file in ${parentPath}`, type: "system" });
    },
    [createFile, addTerminalLine]
  );

  const handleCreateFolder = useCallback(
    (parentPath: string) => {
      createFile(parentPath, "new-folder", true);
      addTerminalLine({ content: `Created new folder in ${parentPath}`, type: "system" });
    },
    [createFile, addTerminalLine]
  );

  const handleRename = useCallback(
    (node: FileNode) => {
      setRenamingNodeId(node.id);
    },
    []
  );

  const handleRenameConfirm = useCallback(
    (nodeId: string, newName: string) => {
      renameNode(nodeId, newName);
      setRenamingNodeId(null);
    },
    [renameNode]
  );

  const handleDelete = useCallback(
    (node: FileNode) => {
      if (
        window.confirm(`Delete "${node.name}"? This action cannot be undone.`)
      ) {
        deleteNode(node.id);
        addTerminalLine({ content: `Deleted ${node.type}: ${node.path}`, type: "system" });
      }
    },
    [deleteNode, addTerminalLine]
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu.isOpen) return;
    const handleClick = () => closeContextMenu();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu.isOpen, closeContextMenu]);

  if (fileTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Folder className="w-8 h-8 text-text-muted/40 mb-2" />
        <p className="text-xs text-text-muted">No files yet</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-medium text-foreground uppercase tracking-wider">
          Files
        </span>
        <button
          className="p-1 rounded hover:bg-muted/40 transition-colors"
          onClick={() => handleCreateFile("/")}
          aria-label="New file"
          title="New file"
        >
          <Plus className="w-3.5 h-3.5 text-text-muted" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1" role="tree" aria-label="File explorer">
        {fileTree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedFileId={renamingNodeId ?? selectedFileId}
            onSelect={handleSelect}
            onContextMenu={handleContextMenu}
          />
        ))}

        {/* Inline rename input (rendered at root level on top) */}
        {renamingNodeId && (
          <div className="px-2 pt-1">
            <RenameInput
              initialValue={
                fileTree.find((n) => n.id === renamingNodeId)?.name ?? ""
              }
              onConfirm={(name) => handleRenameConfirm(renamingNodeId, name)}
              onCancel={() => setRenamingNodeId(null)}
            />
          </div>
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </div>
  );
}