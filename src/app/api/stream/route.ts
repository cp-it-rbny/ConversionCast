// ConversionCast — SSE Stream Endpoint
// =======================================
// GET /api/stream
// Server-Sent Events stream for real-time signal updates.

import { signalStore } from "@/lib/signal-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial stats
      const stats = signalStore.getStats();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "stats", data: stats })}\n\n`
        )
      );

      // Subscribe to new signals
      const subId = signalStore.subscribe((payload) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // Client disconnected
          signalStore.unsubscribe(subId);
        }
      });

      // Keepalive ping every 30 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "keepalive", data: null })}\n\n`
            )
          );
        } catch {
          clearInterval(keepalive);
          signalStore.unsubscribe(subId);
        }
      }, 30000);

      // Cleanup on close — use a polling approach since ReadableStream
      // doesn't have a direct 'close' event in all environments
      const checkClosed = setInterval(() => {
        try {
          // Try to enqueue an empty comment (SSE comment format)
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(checkClosed);
          clearInterval(keepalive);
          signalStore.unsubscribe(subId);
        }
      }, 60000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
