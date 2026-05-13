// ConversionCast — Provider Signal Ingress
// ============================================
// POST /api/v1/signals/:provider
//
// Receives an inbound signal payload from any ticket provider,
// validates the event_id, fetches the associated order to resolve
// the customer's email, normalizes + SHA-256 hashes it, and fires
// a server-side event to the Meta Conversions API via axios.

import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import axios, { AxiosError } from "axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignalPayload {
  event_id: string;
  event_name?: string;
  event_time?: number;
  event_source_url?: string;
  action_source?: string;

  // Browser / click identifiers forwarded by the client
  fbp?: string;
  fbc?: string;

  // Networking
  client_ip_address?: string;
  client_user_agent?: string;

  // Custom data passthrough
  custom_data?: {
    venue?: string;
    ticket_source?: string;
    value?: number;
    currency?: string;
    order_id?: string;
    [key: string]: unknown;
  };
}

interface MetaEventPayload {
  data: Array<{
    event_name: string;
    event_time: number;
    event_id: string;
    event_source_url?: string;
    action_source: string;
    user_data: {
      em?: string[];
      ph?: string[];
      fn?: string[];
      ln?: string[];
      client_ip_address?: string;
      client_user_agent?: string;
      fbp?: string;
      fbc?: string;
    };
    custom_data: Record<string, unknown>;
  }>;
  access_token: string;
  test_event_code?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes an email to Meta spec (lowercase, trimmed) then
 * returns its SHA-256 hex digest.
 */
function hashEmail(raw: string): string {
  const normalized = raw.toLowerCase().trim();
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Fetches a ticket order by orderId (event_id) from the SITickets API
 * and returns the customer email plus any enrichment fields.
 */
async function lookupOrderEmail(eventId: string): Promise<{
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  venue?: string;
  ticketSource?: string;
}> {
  const apiToken = process.env.API_TOKEN;
  const baseUrl =
    process.env.SITICKETS_API_URL ||
    "https://prod.api.insights.sitickets.com/api/v1";

  const url = `${baseUrl}/order/${eventId}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 10_000,
  });

  const detail = response.data?.data ?? response.data;

  // Split name for user_data enrichment
  const fullName: string = detail.customerName || "";
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  return {
    email: detail.customerEmail || "",
    phone: detail.customerPhone || "",
    firstName,
    lastName,
    venue: detail.venueName || detail.venue || "",
    ticketSource: detail.orderType || "",
  };
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // ── 1. Parse body ──────────────────────────────────────────────────────
  let body: SignalPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // ── 2. Validate event_id ───────────────────────────────────────────────
  if (!body.event_id || typeof body.event_id !== "string") {
    return NextResponse.json(
      { success: false, error: "event_id is required and must be a string" },
      { status: 422 }
    );
  }

  // ── 3. Look up order by event_id to resolve email ──────────────────────
  let orderData: Awaited<ReturnType<typeof lookupOrderEmail>>;
  try {
    orderData = await lookupOrderEmail(body.event_id);
  } catch (err) {
    const message =
      err instanceof AxiosError
        ? `Order lookup failed: ${err.response?.status ?? err.code}`
        : "Order lookup failed";
    console.error(`[ConversionCast] /v1/signals/${provider}:`, message, err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }

  if (!orderData.email) {
    return NextResponse.json(
      {
        success: false,
        error: `No email found for event_id "${body.event_id}"`,
      },
      { status: 404 }
    );
  }

  // ── 4. Normalize & SHA-256 hash email ──────────────────────────────────
  const hashedEm = hashEmail(orderData.email);

  // Optionally hash phone / name if present
  const hashIfPresent = (v?: string) =>
    v && v.trim()
      ? createHash("sha256")
          .update(v.toLowerCase().trim())
          .digest("hex")
      : undefined;

  // ── 5. Build Meta Conversions API payload ──────────────────────────────
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    return NextResponse.json(
      { success: false, error: "META_PIXEL_ID and META_ACCESS_TOKEN are required" },
      { status: 503 }
    );
  }

  const eventTime = body.event_time ?? Math.floor(Date.now() / 1000);

  const metaPayload: MetaEventPayload = {
    data: [
      {
        event_name: body.event_name || "Purchase",
        event_time: eventTime,
        event_id: body.event_id,
        event_source_url: body.event_source_url,
        action_source: body.action_source || "system_generated",
        user_data: {
          em: [hashedEm],
          ph: hashIfPresent(orderData.phone)
            ? [hashIfPresent(orderData.phone)!]
            : undefined,
          fn: hashIfPresent(orderData.firstName)
            ? [hashIfPresent(orderData.firstName)!]
            : undefined,
          ln: hashIfPresent(orderData.lastName)
            ? [hashIfPresent(orderData.lastName)!]
            : undefined,
          client_ip_address:
            body.client_ip_address ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            undefined,
          client_user_agent:
            body.client_user_agent ||
            request.headers.get("user-agent") ||
            undefined,
          fbp: body.fbp || undefined,
          fbc: body.fbc || undefined,
        },
        custom_data: {
          value: body.custom_data?.value,
          currency: body.custom_data?.currency || "USD",
          order_id: body.event_id,
          venue: body.custom_data?.venue || orderData.venue || undefined,
          ticket_source:
            body.custom_data?.ticket_source ||
            orderData.ticketSource ||
            provider,
          // Spread any additional custom fields the caller supplied
          ...Object.fromEntries(
            Object.entries(body.custom_data || {}).filter(
              ([k]) =>
                !["value", "currency", "order_id", "venue", "ticket_source"].includes(k)
            )
          ),
        },
      },
    ],
    access_token: accessToken,
  };

  if (testEventCode) {
    metaPayload.test_event_code = testEventCode;
  }

  // ── 6. POST to Meta Graph API via axios ────────────────────────────────
  const graphUrl = `https://graph.facebook.com/v24.0/${pixelId}/events`;
  const mode = testEventCode ? "test" : "live";

  // Retry: 3 attempts w/ exponential backoff
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data: metaResponse } = await axios.post(graphUrl, metaPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15_000,
      });

      console.log(
        `\n🟢 [ConversionCast] /v1/signals/${provider} → Meta CAPI`,
        `\n   Event ID: ${body.event_id}`,
        `\n   Mode: ${mode}`,
        `\n   Attempt: ${attempt}`,
        `\n   Hashed Email: ${hashedEm.slice(0, 8)}…`
      );

      return NextResponse.json(
        {
          success: true,
          provider,
          event_id: body.event_id,
          mode,
          platform: "meta",
          meta_response: metaResponse,
        },
        { status: 202 }
      );
    } catch (err) {
      if (err instanceof AxiosError) {
        lastError = JSON.stringify(err.response?.data ?? err.message);
      } else {
        lastError = err instanceof Error ? err.message : String(err);
      }
      console.warn(
        `⚠️ [ConversionCast] /v1/signals/${provider} attempt ${attempt}/3:`,
        lastError
      );
    }

    // Exponential backoff (1s, 2s, 4s)
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2 ** (attempt - 1) * 1000));
    }
  }

  // All retries exhausted
  console.error(
    `\n🔴 [ConversionCast] /v1/signals/${provider} FAILED`,
    `\n   Event ID: ${body.event_id}`,
    `\n   Error: ${lastError}`
  );

  return NextResponse.json(
    {
      success: false,
      provider,
      event_id: body.event_id,
      error: lastError,
    },
    { status: 502 }
  );
}

// Health check
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return NextResponse.json({
    status: "ok",
    endpoint: `/v1/signals/${provider}`,
    description:
      "POST a signal payload with an event_id to trigger a Meta CAPI cast",
    required_fields: ["event_id"],
    optional_fields: [
      "event_name",
      "event_time",
      "fbp",
      "fbc",
      "client_ip_address",
      "client_user_agent",
      "custom_data.venue",
      "custom_data.ticket_source",
      "custom_data.value",
      "custom_data.currency",
    ],
  });
}

// CORS Preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Signal-Source",
    },
  });
}
