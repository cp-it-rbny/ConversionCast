// ConversionCast — Shared Types
// ================================

/**
 * Raw order data from the ticket provider API.
 * Endpoint: GET /api/v1/orders
 */
export interface RawTicketOrder {
  orderId: string;
  orderDate: string;
  memberId: string;
  orderType: string;
  ticketQuantity: number;
  ticketPrice: string;
  ticketTax: string;
  processingFees: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  promoCode: string;
  salesRepId: number;
  salesRepName: string;
}

/**
 * The five Funnel Board signal lanes.
 */
export type SignalLane =
  | "PageView"
  | "ContentView"
  | "Lead"
  | "Checkout"
  | "Purchase";

/**
 * Post-normalization, pre-hash signal.
 * Contains raw PII — NEVER store or log this.
 */
export interface NormalizedSignal {
  eventName: string;
  eventTime: number; // Unix timestamp (seconds)
  sourceUrl: string;
  orderId: string;
  lane: SignalLane;

  // PII — will be hashed before storage/transmission
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;

  // Custom data
  currency: string;
  value: number;
  contentName: string;
  contentCategory: string;
  numItems: number;

  // Metadata
  signalStrength: number; // 1-10
}

/**
 * Post-hash signal — safe to store and transmit.
 * All PII fields are SHA-256 hashed.
 */
export interface HashedSignal {
  eventName: string;
  eventTime: number;
  sourceUrl: string;
  eventId: string; // orderId used as event_id for dedup

  // Hashed PII
  hashedEmail: string;
  hashedPhone: string;
  hashedFirstName: string;
  hashedLastName: string;
  hashedCity: string;
  hashedState: string;
  hashedZipCode: string;
  hashedCountry: string;

  // Custom data (not PII, no hashing needed)
  currency: string;
  value: number;
  contentName: string;
  contentCategory: string;
  numItems: number;

  // Metadata
  signalStrength: number;
  lane: SignalLane;
}

/**
 * Result from casting a signal to Meta CAPI.
 */
export interface CastResult {
  success: boolean;
  eventId: string;
  platform: "meta";
  mode: "live" | "dry-run" | "test";
  timestamp: number;
  response?: Record<string, unknown>;
  error?: string;
}

/**
 * The signal status in the Funnel Board lifecycle.
 */
export type SignalStatus = "pending" | "casting" | "cast" | "failed";

/**
 * UI-facing signal displayed on the Funnel Board.
 */
export interface FunnelSignal {
  id: string;
  lane: SignalLane;
  eventName: string;
  status: SignalStatus;
  signalStrength: number;
  maskedId: string; // Last 4 chars of hashed email for display
  timestamp: number; // Unix ms
  castResult?: CastResult;
  dataPoints: {
    email: boolean;
    phone: boolean;
    name: boolean;
    location: boolean;
  };
}

/**
 * Represents a mapped data source (Connector) in a lane.
 */
export interface Connector {
  id: string;
  name: string;
  type: string;
  lane: SignalLane;
  status: "active" | "error" | "paused";
  totalCasts: number;
  avgStrength: number;
  lastSignal?: {
    id: string;
    maskedId: string;
    timestamp: number;
  };
}

export interface AdDestination {
  id: string;
  provider: "Meta" | "Google" | "TikTok" | "Amazon";
  pixelId?: string;
  accessToken?: string;
  status: "connected" | "disconnected" | "configuring";
  lastCastTime?: number;
}

/**
 * SSE event payload sent to connected clients.
 */
export interface SSEPayload {
  type: "signal" | "stats" | "connector_update" | "destination_update" | "keepalive";
  data: FunnelSignal | DashboardStats | Connector | AdDestination | null;
}

/**
 * Aggregated dashboard statistics.
 */
export interface DashboardStats {
  totalSignals: number;
  successfulCasts: number;
  failedCasts: number;
  averageStrength: number;
  signalsPerMinute: number;
  lastCastTime: number | null;
}
