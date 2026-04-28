import { deduplicator } from "../deduplicator";
import { normalizeTicketOrder, validateTicketOrder } from "../normalizer";
import { hashSignal } from "../hasher";
import { castToMeta } from "../meta/capi-sender";
import { signalStore } from "../signal-store";
import { siTicketsClient } from "./sitickets-client";
import type { HashedSignal, FunnelSignal } from "../types";

/**
 * Service to poll the ticket provider API for new orders.
 * Implements a Backward-Sweep Pagination using orderId as a high-watermark.
 */
class PollerService {
  private isPolling = false;
  private lastPollTime: number | null = null;
  private lastSuccessfulPollTime: number | null = null;
  private lastPulledOrderId: number | null = null;

  /** Cron cadence in ms — keep in sync with vercel.json schedule (currently 1 h) */
  private static readonly CRON_INTERVAL_MS = 60 * 60 * 1000;

  /**
   * Bootstrap timestamp read from env on cold start.
   * Set LAST_POLL_TIME in Vercel env vars to the last order date from the
   * previous deployment so the first run doesn't miss any records.
   * Example value: "2026-04-24T05:24:16.000Z"
   */
  private static readonly BOOTSTRAP_POLL_TIME: number | null = (() => {
    const env = process.env.LAST_POLL_TIME;
    if (!env) return null;
    const ms = new Date(env).getTime();
    if (isNaN(ms)) {
      console.warn("⚠️ [Poller] LAST_POLL_TIME env var is not a valid date, ignoring.");
      return null;
    }
    console.log(`🔖 [Poller] Bootstrap poll time from env: ${env}`);
    return ms;
  })();

  /**
   * Fetches the latest orders from the provider API.
   * Processes them through the zero-knowledge pipeline.
   */
  async pullLatestOrders(options?: { 
    credentials?: { pixelId: string; accessToken: string; },
    resetCache?: boolean 
  }) {
    if (this.isPolling) {
      console.log("🔵 [Poller] Pull already in progress, skipping...");
      return { success: false, reason: "Busy" };
    }

    this.isPolling = true;
    this.lastPollTime = Date.now();
    console.log("🔵 [Poller] Starting SItickets backward sweep pull...");

    if (options?.resetCache) {
      console.log("🟠 [Poller] Resetting deduplicator cache and reference OrderId!");
      deduplicator.clear();
      this.lastPulledOrderId = null;
    }

    let processedCount = 0;
    let duplicateCount = 0;
    
    try {
      // Derive the "since" window — fallback chain:
      //   1. lastSuccessfulPollTime  (warm instance, same deployment)
      //   2. BOOTSTRAP_POLL_TIME     (env var seeded from prior deployment)
      //   3. CRON_INTERVAL_MS ago    (absolute last resort)
      const sinceTimestamp =
        this.lastSuccessfulPollTime ??
        PollerService.BOOTSTRAP_POLL_TIME ??
        Date.now() - PollerService.CRON_INTERVAL_MS;
      const sinceDate = new Date(sinceTimestamp).toISOString();
      console.log(`🕐 [Poller] Fetching orders since: ${sinceDate}`);
      let currentEndDate: string | undefined = undefined;
      let hasMore = true;
      let pageCount = 0;
      const MAX_PAGES = 50; // Production safety breaker to prevent runaway loops
      
      let highestOrderIdInRun = -1;

      while (hasMore && pageCount < MAX_PAGES) {
        pageCount++;
        console.log(`📡 [Poller] Fetching Page ${pageCount}...`);
        
        // Fetch 100 items per user request for production sweeping
        const { data: rawOrders } = await siTicketsClient.fetchOrders({
          limit: 100, 
          endDate: currentEndDate,
          since: sinceDate
        });

        if (!rawOrders || rawOrders.length === 0) {
          console.log("📡 [Poller] No more records found. Ending sweep.");
          break;
        }

        for (const rawOrder of rawOrders) {
          const currentId = parseInt(rawOrder.orderId, 10);
          if (!isNaN(currentId) && currentId > highestOrderIdInRun) {
            highestOrderIdInRun = currentId;
          }

          // 0. Filter by Business Rules (Transaction only, valid payment method)
          const isTransaction = rawOrder.orderType?.toLowerCase() === "transaction";
          const paymentMethod = rawOrder.paymentMethod?.toLowerCase() || "";
          const isValidPayment = paymentMethod !== "comp" && paymentMethod !== "none";

          if (!isTransaction || !isValidPayment) {
            console.log(`ℹ️ [Poller] Skipping order ${rawOrder.orderId}: type=${rawOrder.orderType}, payment=${rawOrder.paymentMethod}`);
            continue;
          }

          // 1. Validate
          const { valid } = validateTicketOrder(rawOrder);
          if (!valid) {
            console.warn(`⚠️ [Poller] Skipping invalid order: ${rawOrder.orderId}`);
            continue;
          }

          // 2. Deduplicate
          const { isDuplicate } = deduplicator.check(rawOrder.orderId);
          if (isDuplicate) {
            duplicateCount++;
            continue; // Skip already casted signals
          }

          // 3. Enrich order with detail + event title, then Normalize (Raw -> Normalized)
          const detail = await siTicketsClient.fetchOrderDetail(rawOrder.orderId);
          const firstEventId = detail.lineItems?.[0]?.eventId;
          const eventInfo = firstEventId
            ? await siTicketsClient.fetchEvent(firstEventId)
            : {};

          const enrichedOrder = {
            ...rawOrder,
            channel: detail.channel ?? rawOrder.channel ?? "",
            paymentMethod: detail.paymentMethod ?? rawOrder.paymentMethod ?? "",
            productName: eventInfo.title ?? "",
          };

          const normalized = normalizeTicketOrder(enrichedOrder);

          // 4. Hash (Normalized -> Hashed)
          const hashed: HashedSignal = hashSignal(normalized);

          // 5. Push to local store for UI visibility
          const uiSignal: FunnelSignal = {
            id: hashed.eventId,
            lane: hashed.lane,
            eventName: hashed.eventName,
            status: "pending",
            signalStrength: hashed.signalStrength,
            maskedId: `••••${hashed.hashedEmail.slice(-4)}`,
            timestamp: Date.now(),
            dataPoints: {
              email: !!normalized.email,
              phone: !!normalized.phone,
              name: !!(normalized.firstName || normalized.lastName),
              location: !!(normalized.city || normalized.zipCode),
            },
          };
          signalStore.addSignal(uiSignal);

          // 6. Cast to Meta CAPI (Egress)
          // Awaiting the cast ensures that Vercel doesn't kill the function before Meta receives the event.
          const result = await castToMeta(hashed, options?.credentials);
          signalStore.updateSignal(uiSignal.id, {
            status: result.success ? "cast" : "failed",
            castResult: result,
          });

          processedCount++;
        }

        // --- Pagination Logic ---
        const smallestItem = rawOrders[rawOrders.length - 1];

        // We use 'since' param, so the API automatically restricts to our time window.
        // If we received exactly the limit (100), there might be more records in this window.
        // So we paginate using endDate.
        if (rawOrders.length === 100) {
          console.log(`ℹ️ [Poller] Fetched limit (100). Paginating backward...`);
          currentEndDate = smallestItem.orderDate;
        } else {
          console.log(`ℹ️ [Poller] Fetched < 100 records. End of time window reached!`);
          hasMore = false;
        }
      }

      // Finalize Run - Update state
      if (highestOrderIdInRun > (this.lastPulledOrderId || -1)) {
        this.lastPulledOrderId = highestOrderIdInRun;
        console.log(`✅ [Poller] Updated high-watermark OrderId to: ${this.lastPulledOrderId}`);
      }

      // Persist successful poll time so the next run knows its since window.
      this.lastSuccessfulPollTime = this.lastPollTime;

      console.log(`✅ [Poller] Sweep complete. Pages: ${pageCount}, Processed: ${processedCount}, Duplicates: ${duplicateCount}`);
      
      return {
        success: true,
        pages: pageCount,
        processed: processedCount,
        duplicates: duplicateCount,
        timestamp: this.lastPollTime
      };

    } catch (error) {
      console.error("❌ [Poller] Pull sweep failed:", error);
      return { success: false, error: String(error) };
    } finally {
      this.isPolling = false;
    }
  }

  getLastPollTime() {
    return this.lastPollTime;
  }

  getLastSuccessfulPollTime() {
    return this.lastSuccessfulPollTime;
  }
}

// Singleton instance
export const pollerService = new PollerService();
