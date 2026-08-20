import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, Sparkles, ArrowDown, Plus, Trash2 } from "lucide-react";
import { useChatStore } from "../lib/chatStore";
import { useChat } from "../hooks/useChat";
import { useOnboarding } from "../hooks/useOnboarding";
import ChatMessage from "../components/chat/ChatMessage";
import MessageInput from "../components/chat/MessageInput";
import type { Message } from "../types/chat";

export default function Chat() {
  const {
    activeConversation,
    conversations,
    createConversation,
    setActiveConversation,
    deleteConversation,
    isStreaming,
    streamingContent,
  } = useChatStore();

  const { sendMessage, stopStreaming, isSending } = useChat();
  const {
    startOnboarding,
    handleOnboardingNext,
    handleOnboardingComplete,
    handlePlanApprove,
    handlePlanDecline,
    handlePlanModify,
  } = useOnboarding();

  const [showHistory, setShowHistory] = useState(false);
  const [celebration, setCelebration] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initialisedRef = useRef(false);

  // Create conversation on first mount
  useEffect(() => {
    if (!initialisedRef.current && conversations.length === 0) {
      initialisedRef.current = true;
      createConversation("New Tool Idea");
      setTimeout(() => startOnboarding(), 50);
    }
  }, [conversations.length, createConversation, startOnboarding]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, streamingContent]);

  // Celebration timeout
  useEffect(() => {
    if (celebration) {
      const timer = setTimeout(() => setCelebration(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [celebration]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage]
  );

  const handleNewChat = useCallback(() => {
    createConversation("New Tool Idea");
    setTimeout(() => startOnboarding(), 50);
    setShowHistory(false);
  }, [createConversation, startOnboarding]);

  const handleWrappedPlanApprove = useCallback(() => {
    handlePlanApprove();
    setCelebration(true);
  }, [handlePlanApprove]);

  // ── Empty State ──────────────────────────────────────────────────────
  if (!activeConversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
          <Sparkles className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Welcome to Spindle</h2>
        <p className="max-w-md text-center text-sm text-text-muted">
          Start a conversation with Spindle's AI agent to design and build your tools.
          Describe what you want to build, and Spindle will guide you through the process.
        </p>
        <button
          className="btn-primary"
          onClick={handleNewChat}
        >
          <Sparkles className="h-4 w-4" />
          Start Building
        </button>

        {/* Existing conversations */}
        {conversations.length > 0 && (
          <div className="mt-6 w-full max-w-sm space-y-2">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider text-center">
              Recent Conversations
            </p>
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-foreground hover:bg-muted/40 transition-colors text-left"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const messages: Message[] = activeConversation.messages;

  return (
    <div className="flex h-full flex-col relative">
      {/* Celebration overlay */}
      {celebration && <Celebration />}

      {/* Top bar with conversation title and actions */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-ghost p-1.5 rounded-lg"
            aria-label="Toggle conversation history"
            title="Conversation history"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground truncate">
            {activeConversation.title}
          </h2>
          {activeConversation.onboardingComplete && (
            <span className="badge-accent text-[10px]">Ready</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="btn-ghost p-1.5 rounded-lg"
            aria-label="New conversation"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && conversations.length > 1 && (
        <div className="shrink-0 border-b border-border/50 bg-muted/20 max-h-48 overflow-y-auto">
          <div className="px-3 py-2 space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors group ${
                  conv.id === activeConversation.id
                    ? "bg-accent/10 text-accent"
                    : "text-text-muted hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <button
                  className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  onClick={() => { setActiveConversation(conv.id); setShowHistory(false); }}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                  <span className="text-[10px] text-text-muted ml-auto shrink-0">
                    {conv.messages.length} msg
                  </span>
                </button>
                {conversations.length > 1 && (
                  <button
                    onClick={() => deleteConversation(conv.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-text-muted hover:text-destructive transition-all"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Welcome message when no messages yet */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                <MessageSquare className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">New Conversation</h3>
              <p className="max-w-sm text-sm text-text-muted">
                Describe the AI tool you want to build, and Spindle will guide you step by step.
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((message, idx) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLast={idx === messages.length - 1}
              streamingContent={streamingContent}
              onOnboardingNext={(step, data) => handleOnboardingNext(step, data)}
              onOnboardingComplete={(data) => handleOnboardingComplete(data)}
              onPlanApprove={handleWrappedPlanApprove}
              onPlanDecline={handlePlanDecline}
              onPlanModify={(feedback) => handlePlanModify(feedback)}
            />
          ))}

          {/* Inline thinking indicator when no streaming message yet */}
          {isSending && !isStreaming && (
            <div className="flex items-center gap-3 animate-[fadeSlideIn_0.2s_ease-out]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-muted/50 px-4 py-2.5">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
                </div>
                <span className="text-xs text-text-muted ml-1">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <FloatingScrollButton
        containerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        isSending={isSending}
      />
    </div>
  );
}

// ── Celebration ──────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "oklch(0.7227 0.192 149.58)",  // accent green
  "oklch(0.6368 0.2078 25.33)",  // red
  "oklch(0.666 0.179 58.32)",    // yellow/amber
  "oklch(0.527 0.154 150.07)",   // success green
  "oklch(0.6 0.2 260)",          // blue
  "oklch(0.6 0.18 330)",         // pink
  "oklch(0.98 0.05 90)",         // white-ish
];

function Celebration() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: `${6 + Math.random() * 6}px`,
    duration: `${2 + Math.random() * 2}s`,
    delay: `${Math.random() * 0.8}s`,
  }));

  return (
    <div className="celebration-container" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ── Floating Scroll-to-Bottom ──────────────────────────────────────────

function FloatingScrollButton({
  containerRef,
  messagesEndRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 200;
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setShowButton(!isNearBottom);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  if (!showButton) return null;

  return (
    <button
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 btn-secondary h-8 w-8 rounded-full p-0 shadow-lg"
      onClick={() =>
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="h-4 w-4" />
    </button>
  );
}