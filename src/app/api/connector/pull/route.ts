import { NextResponse } from "next/server";
import { pollerService } from "@/lib/connector/poller";

/**
 * Endpoint to trigger the manual/cron polling of ticket orders.
 * Path: GET /api/connector/pull
 */
export async function GET(request: Request) {
  // Simple security check for Cron triggers
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const isAutomatic = searchParams.get("auto") === "true";

  // In production, we would compare secret with process.env.CRON_SECRET
  // For MVP, we'll allow manual triggers from the dashboard

  console.log(`🔵 [API] Pull trigger received (Auto: ${isAutomatic})`);

  const result = await pollerService.pullLatestOrders();

  if (result.success) {
    return NextResponse.json(result, { status: 200 });
  } else {
    return NextResponse.json(result, { status: result.reason === "Busy" ? 429 : 500 });
  }
}

/**
 * POST also supported for webhook-style cron triggers
 */
export async function POST(request: Request) {
  let options = {};
  try {
    options = await request.json();
  } catch (err) {
    // Ignore empty body
  }

  const result = await pollerService.pullLatestOrders(options);
  if (result.success) {
    return NextResponse.json(result, { status: 200 });
  } else {
    return NextResponse.json(result, { status: result.reason === "Busy" ? 429 : 500 });
  }
}
