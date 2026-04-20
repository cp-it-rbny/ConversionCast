// ConversionCast — Meta CAPI Sender (Dry-Run Mode)
// ====================================================
// Sends hashed conversion events to Meta's Conversions API.
// Falls back to dry-run mode when META_ACCESS_TOKEN is not set.

import type { HashedSignal, CastResult } from "../types";

/**
 * Builds the Meta CAPI payload from a HashedSignal.
 * This structure matches the Meta Graph API format.
 */
function buildMetaPayload(signal: HashedSignal) {
  return {
    data: [
      {
        event_name: signal.eventName,
        event_time: signal.eventTime,
        event_id: signal.eventId,
        event_source_url: signal.sourceUrl,
        action_source: "system_generated",
        user_data: {
          em: signal.hashedEmail ? [signal.hashedEmail] : undefined,
          ph: signal.hashedPhone ? [signal.hashedPhone] : undefined,
          fn: signal.hashedFirstName ? [signal.hashedFirstName] : undefined,
          ln: signal.hashedLastName ? [signal.hashedLastName] : undefined,
          ct: signal.hashedCity ? [signal.hashedCity] : undefined,
          st: signal.hashedState ? [signal.hashedState] : undefined,
          zp: signal.hashedZipCode ? [signal.hashedZipCode] : undefined,
          country: signal.hashedCountry
            ? [signal.hashedCountry]
            : undefined,
        },
        custom_data: {
          currency: signal.currency,
          value: signal.value,
          content_name: signal.contentName,
          content_category: signal.contentCategory,
          num_items: signal.numItems,
        },
      },
    ],
  };
}

/**
 * Sends a hashed signal to Meta's Conversions API.
 *
 * Modes:
 * - live: Sends to Meta Graph API (requires META_PIXEL_ID + META_ACCESS_TOKEN)
 * - dry-run: Logs the payload to console (when credentials are missing)
 * - test: Sends with a test_event_code for Events Manager verification
 */
export async function castToMeta(
  signal: HashedSignal,
  credentials?: { pixelId: string; accessToken: string; }
): Promise<CastResult> {
  const pixelId = credentials?.pixelId || process.env.META_PIXEL_ID;
  const accessToken = credentials?.accessToken || process.env.META_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  const payload = buildMetaPayload(signal);

  // Determine mode
  const isDryRun = !pixelId || !accessToken;
  const isTest = !!testEventCode && !isDryRun;
  const mode = isDryRun ? "dry-run" : isTest ? "test" : "live";

  if (isDryRun) {
    // Dry-run mode: log the payload
    console.log(
      `\n🔵 [ConversionCast] DRY-RUN Cast → Meta CAPI`,
      `\n   Event: ${signal.eventName}`,
      `\n   Event ID: ${signal.eventId}`,
      `\n   Signal Strength: ${signal.signalStrength}/10`,
      `\n   Value: ${signal.currency.toUpperCase()} ${signal.value}`,
      `\n   Payload:`,
      JSON.stringify(payload, null, 2)
    );

    return {
      success: true,
      eventId: signal.eventId,
      platform: "meta",
      mode: "dry-run",
      timestamp: Date.now(),
      response: { message: "Dry-run mode — payload logged to console" },
      requestBody: payload,
    };
  }

  // Live/Test mode: send to Meta Graph API
  const url = `https://graph.facebook.com/v24.0/${pixelId}/events`;
  const body: Record<string, unknown> = {
    ...payload,
    access_token: accessToken,
  };

  if (isTest && testEventCode) {
    body.test_event_code = testEventCode;
  }

  // Retry logic: 3 attempts with exponential backoff
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log(
          `\n🟢 [ConversionCast] Cast SUCCESS → Meta CAPI`,
          `\n   Event: ${signal.eventName}`,
          `\n   Event ID: ${signal.eventId}`,
          `\n   Mode: ${mode}`,
          `\n   Attempt: ${attempt}`
        );

        return {
          success: true,
          eventId: signal.eventId,
          platform: "meta",
          mode,
          timestamp: Date.now(),
          response: responseData as Record<string, unknown>,
          requestBody: payload,
        };
      }

      lastError = JSON.stringify(responseData);
      console.warn(
        `⚠️ [ConversionCast] Cast attempt ${attempt}/3 failed:`,
        lastError
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `⚠️ [ConversionCast] Cast attempt ${attempt}/3 error:`,
        lastError
      );
    }

    // Exponential backoff (1s, 2s, 4s)
    if (attempt < 3) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      );
    }
  }

  console.error(
    `\n🔴 [ConversionCast] Cast FAILED → Meta CAPI`,
    `\n   Event ID: ${signal.eventId}`,
    `\n   Error: ${lastError}`
  );

  return {
    success: false,
    eventId: signal.eventId,
    platform: "meta",
    mode,
    timestamp: Date.now(),
    error: lastError,
    requestBody: payload,
  };
}
