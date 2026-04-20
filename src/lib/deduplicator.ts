// ConversionCast — Deduplication Engine
// ========================================
// Uses order_id as the deduplication key.
// Bounded in-memory set prevents unbounded growth.

const MAX_DEDUP_ENTRIES = 10000;

/**
 * Simple bounded deduplication set.
 * Uses a FIFO eviction strategy when the set exceeds MAX_DEDUP_ENTRIES.
 */
class DeduplicationEngine {
  private processedIds: Set<string> = new Set();
  private insertionOrder: string[] = [];

  /**
   * Checks if an order ID has already been processed.
   * If not, marks it as processed.
   *
   * @returns true if this is a duplicate (already processed)
   */
  check(orderId: string): { isDuplicate: boolean } {
    if (this.processedIds.has(orderId)) {
      return { isDuplicate: true };
    }

    // Add to the set
    this.processedIds.add(orderId);
    this.insertionOrder.push(orderId);

    // Evict oldest entries if we exceed the limit
    while (this.insertionOrder.length > MAX_DEDUP_ENTRIES) {
      const oldest = this.insertionOrder.shift();
      if (oldest) {
        this.processedIds.delete(oldest);
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Returns the current count of tracked order IDs.
   */
  size(): number {
    return this.processedIds.size;
  }

  /**
   * Clears all tracked order IDs.
   */
  clear(): void {
    this.processedIds.clear();
    this.insertionOrder = [];
  }
}

// Singleton instance
export const deduplicator = new DeduplicationEngine();
