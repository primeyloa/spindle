import { useEffect, useState, useRef, useCallback } from "react";
import { Search, Plus, FileUp, Trash2, Edit2, X, Brain, FileText, MessageSquare, Bot, Clock, Tag } from "lucide-react";
import { useMemoryStore, extractTextFromFile } from "../lib/memoryStore";
import type { Memory } from "../types/memory";

export default function Memory() {
  const {
    memories,
    searchResults,
    isSearching,
    isLoading,
    count,
    fetchMemories,
    searchMemories,
    addMemory,
    updateMemory,
    deleteMemory,
    fetchCount,
  } = useMemoryStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayedMemories = showSearchResults && searchQuery.trim()
    ? searchResults
    : memories;

  useEffect(() => {
    fetchMemories();
    fetchCount();
  }, [fetchMemories, fetchCount]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      await searchMemories(searchQuery);
      setShowSearchResults(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMemories]);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setIsSaving(true);
    await addMemory({ content: newContent.trim(), source: "manual" });
    setNewContent("");
    setIsCreating(false);
    setIsSaving(false);
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    await updateMemory(id, { content: editContent.trim() });
    setEditingId(null);
    setEditContent("");
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMemory(id);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        setUploadError("File appears to be empty.");
        return;
      }
      await addMemory({
        content: text.trim().slice(0, 10000), // Cap at 10k chars
        source: "document",
        metadata: { fileName: file.name, fileSize: file.size },
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "document": return <FileText className="w-3 h-3" />;
      case "agent": return <Bot className="w-3 h-3" />;
      case "chat": return <MessageSquare className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "document": return "Document";
      case "agent": return "Agent";
      case "chat": return "Chat";
      default: return "Manual";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const truncate = (text: string, max = 200) =>
    text.length > max ? text.slice(0, max) + "…" : text;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Brain className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Memory</h1>
            <p className="text-[11px] text-text-muted">
              {count} {count === 1 ? "memory" : "memories"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost px-3 py-1.5 text-xs gap-1.5"
            title="Upload document as memory"
          >
            <FileUp className="w-3.5 h-3.5" />
            Upload
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary px-3 py-1.5 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Memory
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search memories (semantic + keyword)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 pr-3 text-sm"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {showSearchResults && (
          <p className="text-[11px] text-text-muted mt-1.5">
            {searchResults.length > 0
              ? `Found ${searchResults.length} semantic match${searchResults.length > 1 ? "es" : ""}`
              : "No semantic matches found"}
          </p>
        )}
      </div>

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 bg-accent/10 border-2 border-dashed border-accent rounded-lg flex items-center justify-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center gap-2 text-accent">
            <FileUp className="w-8 h-8" />
            <span className="text-sm font-medium">Drop file to create memory</span>
            <span className="text-xs opacity-70">Supports .txt, .md, .pdf</span>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="px-6 py-2">
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <X className="w-3 h-3" />
            {uploadError}
            <button onClick={() => setUploadError(null)} className="ml-auto hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Create new memory form */}
      {isCreating && (
        <div className="px-6 py-3 border-b border-border">
          <div className="card p-3 space-y-2">
            <textarea
              placeholder="What do you want to remember? Anything Spindle should know about you..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="input min-h-[80px] resize-y text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted">⌘+Enter to save</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewContent("");
                  }}
                  className="btn-ghost px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newContent.trim() || isSaving}
                  className="btn-primary px-3 py-1.5 text-xs"
                >
                  {isSaving ? "Saving..." : "Save Memory"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Memory list */}
      <div
        className="flex-1 overflow-y-auto px-6 py-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="h-3 skeleton rounded w-3/4" />
                <div className="h-3 skeleton rounded w-1/2" />
                <div className="flex gap-2 mt-2">
                  <div className="h-3 skeleton rounded w-16" />
                  <div className="h-3 skeleton rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                {searchQuery ? "No memories found" : "Your memory is empty"}
              </h3>
              <p className="text-xs text-text-muted max-w-sm">
                {searchQuery
                  ? "Try a different search term or create a new memory."
                  : "Create memories to help Spindle remember your preferences, facts, and learnings across conversations."}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => setIsCreating(true)}
                className="btn-primary px-4 py-2 text-xs gap-1.5 mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Create your first memory
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedMemories.map((memory, idx) => (
              <div
                key={memory.id}
                className="card p-3.5 hover:border-border/70 transition-all duration-150"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {editingId === memory.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="input min-h-[60px] resize-y text-sm"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                        className="btn-ghost px-2.5 py-1 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEdit(memory.id)}
                        disabled={!editContent.trim() || isSaving}
                        className="btn-primary px-2.5 py-1 text-xs"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {truncate(memory.content)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingId(memory.id);
                            setEditContent(memory.content);
                          }}
                          className="btn-ghost p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(memory.id)}
                          className="btn-ghost p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata footer */}
                    <div className="flex items-center gap-3 mt-2.5 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1">
                        {getSourceIcon(memory.source)}
                        {getSourceLabel(memory.source)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(memory.created_at)}
                      </span>
                      {typeof memory.metadata?.fileName === "string" ? (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <Tag className="w-3 h-3" />
                          {memory.metadata.fileName}
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}