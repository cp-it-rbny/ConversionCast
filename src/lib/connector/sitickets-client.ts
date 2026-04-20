import type { RawTicketOrder } from "../types";

const BASE_URL = "https://prod.api.insights.sitickets.com/api/v1/orders";

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
  }): Promise<{ data: RawTicketOrder[]; count: number; hasMoreRecords: boolean }> {
    try {
      const url = new URL(BASE_URL);
      
      // Default to 100 items per user request unless overridden
      const limit = options?.limit || 100;
      url.searchParams.append("limit", limit.toString());

      if (options?.endDate) {
        url.searchParams.append("endDate", options.endDate);
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
}

export const siTicketsClient = new SITicketsClient();
