/**
 * Shared Anthropic helper for one-shot calls (no tools, no streaming).
 *
 * Used by lib/ai/anomaly-explainer, risk-narrative, and search-translator —
 * the existing pre-agent narrative generators. The new agent runtime in
 * lib/agent/runtime.ts uses the official @anthropic-ai/sdk directly with
 * tool-use; this helper exists only for the legacy Haiku one-shot callers.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function callClaude(
  systemPrompt: string,
  messages: Message[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const textBlock = data?.content?.find(
      (b: { type: string }) => b.type === "text"
    );
    return textBlock?.text ?? null;
  } catch {
    return null;
  }
}
