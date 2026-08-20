import { useCallback, useRef } from "react";
import { useChatStore } from "../lib/chatStore";
import { supabase } from "../lib/supabase";

const EDGE_FUNCTION_URL =
  "https://jkislfdfitxhmgadnvlh.supabase.co/functions/v1/spindle-agent";

export function useChat() {
  const {
    activeConversation,
    isSending,
    isStreaming,
    streamingContent,
    addMessage,
    updateMessage,
    setSending,
    setStreaming,
    updateStreamingContent,
    clearStreaming,
  } = useChatStore();

  // Ref to abort streaming
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversation || isSending || isStreaming) return;

      // Add user message
      addMessage({ role: "user", content });

      // Add a placeholder assistant message for streaming
      const assistantMsgId = addMessage({
        role: "assistant",
        content: "",
        isStreaming: true,
      });

      setSending(true);
      setStreaming(true);
      clearStreaming();

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch(EDGE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            message: content,
            conversationId: activeConversation.id,
            onboardingData: activeConversation.onboardingData,
            onboardingComplete: activeConversation.onboardingComplete,
            messages: activeConversation.messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-20)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          let errorText = `Request failed (${response.status})`;
          try {
            const errBody = await response.json();
            errorText = errBody.error || errorText;
          } catch {
            errorText = await response.text().catch(() => errorText);
          }
          throw new Error(errorText);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              if (event.type === "token") {
                fullContent += event.content;
                updateStreamingContent(fullContent);
              } else if (event.type === "done") {
                // Streaming complete — update the message
                updateMessage(assistantMsgId, {
                  content: fullContent,
                  isStreaming: false,
                });
              } else if (event.type === "error") {
                throw new Error(event.error || "Stream error");
              }
            } catch {
              // Skip malformed events
            }
          }
        }

        // Ensure message is marked complete
        updateMessage(assistantMsgId, {
          content: fullContent,
          isStreaming: false,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — keep what we have
          updateMessage(assistantMsgId, {
            content: streamingContent || "(stopped)",
            isStreaming: false,
          });
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "Something went wrong";
          updateMessage(assistantMsgId, {
            content: errorMessage,
            isStreaming: false,
          });
        }
      } finally {
        setSending(false);
        setStreaming(false);
        clearStreaming();
        abortRef.current = null;
      }
    },
    [
      activeConversation,
      isSending,
      isStreaming,
      streamingContent,
      addMessage,
      updateMessage,
      setSending,
      setStreaming,
      updateStreamingContent,
      clearStreaming,
    ]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    clearStreaming();
  }, [setStreaming, clearStreaming]);

  return {
    sendMessage,
    stopStreaming,
    isSending,
    isStreaming,
    streamingContent,
  };
}