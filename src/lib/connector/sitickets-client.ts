import type { RawTicketOrder } from "../types";

const BASE_URL = "https://prod.api.insights.sitickets.com/api/v1/orders";
const API_ROOT  = "https://prod.api.insights.sitickets.com/api/v1";

export class SITicketsClient {
  private apiToken: string;

  constructor() {
    this.apiToken = process.env.API_TOKEN || "";
    if (!this.apiToken) {
      console.warn("⚠️ [SITicketsClient] API_TOKEN is not set in environment variables!");
    }
  }

  /**
   * Fetches a paginated list of recent orders from SItickets.
   * Uses limit and endDate for cursor-based pagination.
   */
  async fetchOrders(options?: {
    limit?: number;
    endDate?: string;
    since?: string;
  }): Promise<{ data: RawTicketOrder[]; count: number; hasMoreRecords: boolean }> {
    try {
      const url = new URL(BASE_URL);
      
      // Default to 100 items per user request unless overridden
      const limit = options?.limit || 100;
      url.searchParams.append("limit", limit.toString());

      if (options?.endDate) {
        url.searchParams.append("endDate", options.endDate);
      }

      if (options?.since) {
        url.searchParams.append("since", options.since);
      }

      console.log(`📡 [SITicketsClient] Fetching: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`SITickets API responded with status: ${response.status} - ${response.statusText}`);
      }

      const body = await response.json();
      
      // Dump raw payload to console explicitly as requested by user
      console.log("\n====== 📥 RAW DATA CAPTURED FROM SITICKETS ======");
      console.log(`Retrieved ${body.data?.length || 0} orders.`);
      if (body.data?.length > 0) {
          console.log("Sample Payload (First item):");
          const safeSample = { ...body.data[0] };
          // Don't log full PII to console in production, but we will for MVP verification
          console.log(JSON.stringify(safeSample, null, 2));
      }
      console.log("==================================================\n");

      return {
        data: body.data || [],
        count: body.count || 0,
        hasMoreRecords: body.hasMoreRecords || false,
      };
    } catch (error) {
      console.error("❌ [SITicketsClient] Failed to fetch orders:", error);
      throw error;
    }
  }

  /**
   * Fetches the full detail for a single order.
   * Endpoint: GET /api/v1/orders/{orderId}
   * Returns the payment object (channel) and line items (for eventId lookup).
   */
  async fetchOrderDetail(orderId: string): Promise<{
    channel?: string;
    paymentMethod?: string;
    lineItems?: Array<{ eventId?: string | number; [key: string]: unknown }>;
  }> {
    try {
      const url = `${API_ROOT}/orders/${orderId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      if (!response.ok) {
        console.warn(`⚠️ [SITicketsClient] fetchOrderDetail ${orderId} → ${response.status}`);
        return {};
      }
      const body = await response.json();
      // The API may wrap the order under a `data` key or return it directly
      const detail = body.data ?? body;
      return {
        channel: detail.payment?.channel ?? detail.channel,
        paymentMethod: detail.payment?.paymentMethod ?? detail.paymentMethod,
        lineItems: detail.lineItems ?? detail.line_items ?? [],
      };
    } catch (err) {
      console.warn(`⚠️ [SITicketsClient] fetchOrderDetail failed for ${orderId}:`, err);
      return {};
    }
  }

  /**
   * Fetches event details by event ID.
   * Endpoint: GET /api/v1/events/{id}
   * Returns the event title to use as product_name.
   */
  async fetchEvent(eventId: string | number): Promise<{ title?: string }> {
    try {
      const url = `${API_ROOT}/events/${eventId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      if (!response.ok) {
        console.warn(`⚠️ [SITicketsClient] fetchEvent ${eventId} → ${response.status}`);
        return {};
      }
      const body = await response.json();
      const detail = body.data ?? body;
      return { title: detail.title ?? detail.name };
    } catch (err) {
      console.warn(`⚠️ [SITicketsClient] fetchEvent failed for ${eventId}:`, err);
      return {};
    }
  }
}

export const siTicketsClient = new SITicketsClient();
