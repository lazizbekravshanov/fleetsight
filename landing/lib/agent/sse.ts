/**
 * Tiny SSE helper. Mirrors the named-event pattern in
 * /api/alerts/stream/route.ts so the wire format stays consistent.
 *
 * Format per event:
 *   event: <name>\ndata: <json>\n\n
 */

const encoder = new TextEncoder();

export type SseSender = (event: string, data: unknown) => void;

export function createSseSender(
  controller: ReadableStreamDefaultController<Uint8Array>
): SseSender {
  return (event: string, data: unknown) => {
    try {
      controller.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
    } catch {
      // Controller already closed (client disconnected). Swallow.
    }
  };
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no", // disable nginx buffering
} as const;
