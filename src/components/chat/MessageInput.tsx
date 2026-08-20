import { useState, useRef, useCallback, KeyboardEvent, useEffect } from "react";
import { Send, StopCircle } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  isSending: boolean;
  placeholder?: string;
}

export default function MessageInput({
  onSend,
  onStop,
  isStreaming,
  isSending,
  placeholder = "Describe what you'd like to build...",
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [value]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isSending || isStreaming) return;
    onSend(trimmed);
    setValue("");
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isSending, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const isDisabled = isSending || isStreaming;

  return (
    <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-all duration-200 focus-within:border-accent/40 focus-within:shadow-accent/5">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-text-muted outline-none leading-relaxed max-h-[160px]"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            rows={1}
            aria-label="Message input"
          />

          {isStreaming ? (
            <button
              className="btn-ghost h-9 w-9 shrink-0 rounded-lg p-0 flex items-center justify-center text-destructive hover:bg-destructive/10"
              onClick={onStop}
              aria-label="Stop streaming"
              title="Stop"
            >
              <StopCircle className="h-5 w-5" />
            </button>
          ) : (
            <button
              className="btn-primary h-9 w-9 shrink-0 rounded-lg p-0 flex items-center justify-center"
              onClick={handleSend}
              disabled={!value.trim() || isDisabled}
              aria-label="Send message"
              title="Send"
            >
              {isSending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <p className="mt-1.5 text-center text-[10px] text-text-muted">
          {isStreaming
            ? "Spindle is responding..."
            : "Spindle agent responds with cards and streaming text. Press Enter to send, Shift+Enter for new line."}
        </p>
      </div>
    </div>
  );
}