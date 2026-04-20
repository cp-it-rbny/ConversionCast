// ConversionCast — Signal Store
// ================================
// In-memory signal store with SSE pub/sub broadcasting.
// Maintains a circular buffer of the last N signals.

import type { FunnelSignal, DashboardStats, SSEPayload } from "./types";

const MAX_SIGNALS = 200;

type Subscriber = (payload: SSEPayload) => void;

class SignalStore {
  private signals: FunnelSignal[] = [];
  private subscribers: Map<string, Subscriber> = new Map();
  private subscriberCounter = 0;

  // Stats tracking
  private totalSignals = 0;
  private successfulCasts = 0;
  private failedCasts = 0;
  private recentTimestamps: number[] = []; // for signals/min calculation
  private lastCastTime: number | null = null;

  /**
   * Adds a signal to the store and broadcasts to all subscribers.
   */
  addSignal(signal: FunnelSignal): void {
    // Add to the front (newest first)
    this.signals.unshift(signal);

    // Trim to max size
    if (this.signals.length > MAX_SIGNALS) {
      this.signals = this.signals.slice(0, MAX_SIGNALS);
    }

    // Update stats
    this.totalSignals++;
    if (signal.status === "cast") {
      this.successfulCasts++;
      this.lastCastTime = Date.now();
    } else if (signal.status === "failed") {
      this.failedCasts++;
    }

    // Track timestamp for rate calculation
    this.recentTimestamps.push(Date.now());
    // Keep only last 5 minutes of timestamps
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    this.recentTimestamps = this.recentTimestamps.filter((t) => t > fiveMinAgo);

    // Broadcast to all subscribers
    this.broadcast({ type: "signal", data: signal });
  }

  /**
   * Updates an existing signal's status (e.g., pending → cast).
   */
  updateSignal(id: string, updates: Partial<FunnelSignal>): void {
    const index = this.signals.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.signals[index] = { ...this.signals[index], ...updates };

      // Update stats if status changed to cast/failed
      if (updates.status === "cast") {
        this.successfulCasts++;
        this.lastCastTime = Date.now();
      } else if (updates.status === "failed") {
        this.failedCasts++;
      }

      this.broadcast({ type: "signal", data: this.signals[index] });
    }
  }

  /**
   * Returns all signals currently in the buffer.
   */
  getSignals(): FunnelSignal[] {
    return [...this.signals];
  }

  /**
   * Computes current dashboard statistics.
   */
  getStats(): DashboardStats {
    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const signalsLastMinute = this.recentTimestamps.filter(
      (t) => t > oneMinAgo
    ).length;

    const totalStrength = this.signals.reduce(
      (sum, s) => sum + s.signalStrength,
      0
    );
    const avgStrength =
      this.signals.length > 0 ? totalStrength / this.signals.length : 0;

    return {
      totalSignals: this.totalSignals,
      successfulCasts: this.successfulCasts,
      failedCasts: this.failedCasts,
      averageStrength: Math.round(avgStrength * 10) / 10,
      signalsPerMinute: signalsLastMinute,
      lastCastTime: this.lastCastTime,
    };
  }

  /**
   * Subscribes to real-time signal updates.
   * Returns a subscriber ID for later unsubscription.
   */
  subscribe(callback: Subscriber): string {
    const id = `sub_${++this.subscriberCounter}`;
    this.subscribers.set(id, callback);
    return id;
  }

  /**
   * Unsubscribes a subscriber.
   */
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Returns the number of active subscribers.
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Broadcasts a payload to all subscribers.
   */
  private broadcast(payload: SSEPayload): void {
    for (const [, callback] of this.subscribers) {
      try {
        callback(payload);
      } catch {
        // Subscriber may have disconnected; ignore
      }
    }
  }
}

// Singleton — survives across API route invocations in dev
// Use globalThis to survive Next.js hot reloads
const globalForStore = globalThis as typeof globalThis & {
  __signalStore?: SignalStore;
};

export const signalStore =
  globalForStore.__signalStore ?? new SignalStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__signalStore = signalStore;
}
