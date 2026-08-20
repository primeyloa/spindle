import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Rate Limiting (in-memory, IP-based) ─────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// ── CORS preflight ─────────────────────────────────────────────────────

function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Memory Search ──────────────────────────────────────────────────────

interface MemoryResult {
  id: string;
  content: string;
  source: string;
  similarity?: number;
  created_at: string;
}

async function searchRelevantMemories(
  userId: string,
  query: string
): Promise<MemoryResult[]> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!openAiKey || !supabaseUrl || !supabaseServiceKey) {
    console.warn("Memory search unavailable — missing credentials");
    return [];
  }

  try {
    // Generate embedding for the query
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query.slice(0, 8000), // Truncate to stay within token limits
      }),
    });

    if (!embeddingResponse.ok) {
      console.warn("Embedding API error:", embeddingResponse.status);
      return [];
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data?.[0]?.embedding;
    if (!embedding) return [];

    // Search memories via pgvector
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: memories } = await supabase.rpc("search_memories", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 5,
      user_id_filter: userId,
    });

    return (memories as MemoryResult[]) || [];
  } catch (err) {
    console.warn("Memory search error:", err);
    return [];
  }
}

// ── System Prompt Builder ──────────────────────────────────────────────

function buildSystemMessage(
  onboardingData: Record<string, unknown> | null,
  onboardingComplete: boolean,
  relevantMemories: MemoryResult[]
): string {
  const parts: string[] = [
    `You are Spindle, an AI agent that helps users build AI-powered tools through conversation.`,
    ``,
    `Your role:`,
    `- Guide users step by step through building their tools`,
    `- Be concise, friendly, and match the user's technical level`,
    `- When you want to perform an action (write code, search, modify files), present it as a clear proposal with details and ask for approval`,
    `- Present information in clear, structured formats using markdown`,
    `- Ask clarifying questions when requirements are ambiguous`,
    ``,
    `Response format:`,
    `- Use markdown for formatting (headings, lists, code blocks)`,
    `- Separate distinct sections with line breaks`,
    `- For code blocks, always specify the language`,
    ``,
    `Memory system:`,
    `- You have access to the user's semantic memory. Relevant memories are shown below.`,
    `- Reference these memories when they're relevant to the current conversation.`,
    `- If the user shares preferences, facts, or important information you want to remember for later, mention that you'll remember it. The frontend will handle storing it.`,
    `- Memories include a similarity score (0-1) — higher means more relevant to the current context.`,
  ];

  if (onboardingData) {
    if (onboardingData.goal) {
      parts.push(`\nUser's goal: ${onboardingData.goal}`);
    }
    if (onboardingData.level) {
      parts.push(`User's technical level: ${onboardingData.level}`);
    }
    if (onboardingData.os) {
      parts.push(`Target OS: ${onboardingData.os}`);
    }
    if (onboardingData.preferences) {
      parts.push(`User preferences: ${onboardingData.preferences}`);
    }
  }

  if (!onboardingComplete) {
    parts.push(``);
    parts.push(`The user has NOT completed onboarding yet. If they ask a general question, answer it, but guide them toward describing what tool they want to build.`);
  }

  // Inject relevant memories
  if (relevantMemories.length > 0) {
    parts.push(``);
    parts.push(`Relevant memories:`);
    for (const mem of relevantMemories) {
      const sim = mem.similarity !== undefined
        ? ` (relevance: ${(mem.similarity * 100).toFixed(0)}%)`
        : "";
      parts.push(`- "${mem.content}"${sim}`);
    }
  }

  return parts.join("\n");
}

// ── Main Handler ───────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return corsPreflight();

  // Only accept POST
  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed. Use POST.");
  }

  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return errorResponse(429, "Rate limit exceeded. Please wait before sending another request.");
  }

  // Parse request body
  let body: {
    message?: string;
    userId?: string;
    conversationId?: string;
    onboardingData?: Record<string, unknown> | null;
    onboardingComplete?: boolean;
    messages?: Array<{ role: string; content: string }>;
  };

  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body.");
  }

  const {
    message,
    userId,
    onboardingData,
    onboardingComplete = false,
    messages = [],
  } = body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return errorResponse(400, "Message is required and must be a non-empty string.");
  }

  // Check OpenAI API key
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    return errorResponse(500, "OpenAI API key not configured. Ask the developer to set OPENAI_API_KEY in Supabase secrets.");
  }

  // Search for relevant memories (if userId is provided)
  let relevantMemories: MemoryResult[] = [];
  if (userId) {
    relevantMemories = await searchRelevantMemories(userId, message);
  }

  const systemMessage = buildSystemMessage(
    onboardingData ?? null,
    onboardingComplete,
    relevantMemories
  );

  const chatMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemMessage },
    ...messages.slice(-20), // Keep last 20 messages for context
    { role: "user", content: message },
  ];

  try {
    // Call OpenAI Chat Completions with streaming
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorBody);
      return errorResponse(502, `OpenAI API returned an error (${openaiResponse.status}). Please try again.`);
    }

    const openAiBody = openaiResponse.body;
    if (!openAiBody) {
      return errorResponse(502, "No response stream from OpenAI.");
    }

    // Transform the OpenAI SSE stream into our own SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";

    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = openAiBody.getReader();

        try {
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
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "token", content: delta })}\n\n`)
                  );
                }

                // Check for function/tool calls
                const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
                if (toolCalls) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "tool_call", tool_calls: toolCalls })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }

          // Signal completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`)
          );
        } finally {
          try { reader.releaseLock(); } catch { /* ignore */ }
          controller.close();
        }
      },
    });

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...corsHeaders,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Unhandled error:", message);
    return errorResponse(500, message);
  }
});