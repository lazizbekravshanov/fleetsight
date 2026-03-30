import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { deductCredit } from "@/lib/credits";
import { jsonError } from "@/lib/http";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT_BASE = `You are FleetSight AI, an expert assistant specializing in FMCSA carrier intelligence, safety compliance, and freight industry analysis.

Your capabilities include:
- Explaining FMCSA BASIC scores (Unsafe Driving, HOS Compliance, Vehicle Maintenance, Controlled Substances, Crash Indicator, Driver Fitness, Hazmat Compliance)
- Interpreting carrier safety data, OOS (Out-of-Service) rates, and inspection results
- Detecting chameleon carriers (carriers that re-register to shed poor safety records)
- Understanding carrier affiliation networks
- Explaining FMCSA regulations and compliance requirements
- Analyzing freight industry trends

Be concise, accurate, and helpful. When discussing safety metrics, always explain what the numbers mean in practical terms. If you're unsure about specific data, say so rather than guessing.

Format responses with clear structure using paragraphs and bullet points when appropriate. Keep answers focused and actionable.`;

function buildSystemPrompt(dotNumber?: string): string {
  if (!dotNumber) return SYSTEM_PROMPT_BASE;
  return `${SYSTEM_PROMPT_BASE}\n\nThe user is currently viewing carrier DOT# ${dotNumber}. When relevant, relate your answers to this carrier. If they ask about "this carrier" or "this company", they mean DOT# ${dotNumber}.`;
}

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Authentication required", 401);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError("AI service not configured", 503);
  }

  let body: { messages: Array<{ role: string; content: string }>; context?: { dotNumber?: string } };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError("Messages array is required", 400);
  }

  // Rate limit: deduct 1 credit per conversation turn
  const { success, remaining } = await deductCredit(
    session.user.id,
    "ai_chat",
    `chat_${Date.now()}`
  );

  if (!success) {
    return jsonError("Insufficient credits", 402, { remaining });
  }

  const systemPrompt = buildSystemPrompt(body.context?.dotNumber);

  // Normalize messages to Anthropic format
  const messages = body.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Stream response from Anthropic
  const anthropicRes = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.3,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => "Unknown error");
    console.error("[chat] Anthropic API error:", anthropicRes.status, errText);
    return jsonError("AI service error", 502);
  }

  if (!anthropicRes.body) {
    return jsonError("AI service returned no response", 502);
  }

  // Transform Anthropic SSE stream into our own SSE stream
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader();

      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();

            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta"
              ) {
                const ssePayload = JSON.stringify({ text: event.delta.text });
                controller.enqueue(
                  encoder.encode(`data: ${ssePayload}\n\n`)
                );
              }

              if (event.type === "message_stop") {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ done: true, remaining })}\n\n`
                  )
                );
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (err) {
        console.error("[chat] Stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
