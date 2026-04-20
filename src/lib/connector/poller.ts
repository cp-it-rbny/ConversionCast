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
  private lastPulledOrderId: number | null = null;

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
          endDate: currentEndDate
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

          // 3. Normalize (Raw -> Normalized)
          const normalized = normalizeTicketOrder(rawOrder);

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
          castToMeta(hashed, options?.credentials).then((result) => {
            signalStore.updateSignal(uiSignal.id, {
              status: result.success ? "cast" : "failed",
              castResult: result,
            });
          });

          processedCount++;
        }

        // --- Backward Sweep Logic ---
        // Inspect the smallest orderId in this batch (last item since API returns desc)
        const smallestItem = rawOrders[rawOrders.length - 1];
        const smallestId = parseInt(smallestItem.orderId, 10);

        if (this.lastPulledOrderId === null) {
          // Initial run: we don't have a reference, so we just process one page and stop
          // to avoid sweeping back to the beginning of time.
          console.log(`ℹ️ [Poller] Initial run complete. Setting reference OrderId to smallest in batch: ${smallestId}`);
          break;
        }

        // If the smallest ID in this page is STILL larger than our last known ID,
        // it means there are more orders between this page and our reference.
        // We adjust the endDate to the date of this smallest item to grab the next batch.
        if (smallestId > this.lastPulledOrderId) {
          console.log(`ℹ️ [Poller] Smallest ID ${smallestId} > Reference ${this.lastPulledOrderId}. Sweeping backward...`);
          currentEndDate = smallestItem.orderDate;
        } else {
          console.log(`ℹ️ [Poller] Smallest ID ${smallestId} <= Reference ${this.lastPulledOrderId}. Sweep caught up!`);
          hasMore = false;
        }
      }

      // Finalize Run - Update state
      if (highestOrderIdInRun > (this.lastPulledOrderId || -1)) {
        this.lastPulledOrderId = highestOrderIdInRun;
        console.log(`✅ [Poller] Updated high-watermark OrderId to: ${this.lastPulledOrderId}`);
      }

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
}

// Singleton instance
export const pollerService = new PollerService();
