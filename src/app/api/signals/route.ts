// ConversionCast — Signals REST Endpoint
// =========================================
// GET /api/signals
// Returns the current signal buffer for initial hydration.

import { NextResponse } from "next/server";
import { signalStore } from "@/lib/signal-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const signals = signalStore.getSignals();
  const stats = signalStore.getStats();

  return NextResponse.json({
    signals,
    stats,
    count: signals.length,
    subscribers: signalStore.getSubscriberCount(),
  });
}
