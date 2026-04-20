// ConversionCast — Webhook Ingress Endpoint
// ============================================
// POST /api/webhooks/tickets
// Receives ticket purchase data, processes through the zero-knowledge pipeline,
// and casts to Meta CAPI.

import { NextRequest, NextResponse } from "next/server";
import type { RawTicketOrder, FunnelSignal } from "@/lib/types";
import { validateTicketOrder, normalizeTicketOrder, getDataPoints } from "@/lib/normalizer";
import { hashSignal } from "@/lib/hasher";
import { deduplicator } from "@/lib/deduplicator";
import { signalStore } from "@/lib/signal-store";
import { castToMeta } from "@/lib/meta/capi-sender";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both single order and batch { data: [...] } format
    const orders: RawTicketOrder[] = Array.isArray(body)
      ? body
      : body.data
        ? body.data
        : [body];

    const results = [];

    for (const order of orders) {
      // 1. Validate
      const validation = validateTicketOrder(order);
      if (!validation.valid) {
        results.push({
          orderId: order.orderId || "unknown",
          status: "rejected",
          errors: validation.errors,
        });
        continue;
      }

      // 2. Deduplicate
      const { isDuplicate } = deduplicator.check(order.orderId);
      if (isDuplicate) {
        results.push({
          orderId: order.orderId,
          status: "duplicate",
        });
        continue;
      }

      // 3. Normalize
      const normalizedSignal = normalizeTicketOrder(order);
      const dataPoints = getDataPoints(order);

      // 4. Hash PII (zero-knowledge — raw PII is consumed here)
      const hashedSignal = hashSignal(normalizedSignal);

      // 5. Create UI signal (pending status)
      const funnelSignal: FunnelSignal = {
        id: hashedSignal.eventId,
        lane: hashedSignal.lane,
        eventName: hashedSignal.eventName,
        status: "casting",
        signalStrength: hashedSignal.signalStrength,
        maskedId: hashedSignal.hashedEmail
          ? `••••${hashedSignal.hashedEmail.slice(-4)}`
          : "••••",
        timestamp: Date.now(),
        dataPoints,
      };

      // 6. Add to store (broadcasts to SSE subscribers)
      signalStore.addSignal(funnelSignal);

      // 7. Cast to Meta CAPI (async, don't block response)
      castToMeta(hashedSignal).then((castResult) => {
        signalStore.updateSignal(funnelSignal.id, {
          status: castResult.success ? "cast" : "failed",
          castResult,
        });
      });

      results.push({
        orderId: order.orderId,
        status: "accepted",
        eventId: hashedSignal.eventId,
      });
    }

    return NextResponse.json(
      {
        success: true,
        processed: results.length,
        results,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[ConversionCast] Webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request payload",
      },
      { status: 400 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "webhooks/tickets",
    description: "POST ticket order data to this endpoint",
  });
}
