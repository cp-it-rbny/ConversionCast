// ConversionCast — Data Normalizer
// ===================================
// Maps raw ticket provider data to normalized signals.

import type { RawTicketOrder, NormalizedSignal, SignalLane } from "./types";

/**
 * Splits a full name into first and last name components.
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Computes signal strength (1–10) based on the density of available matching data.
 *
 * Scoring:
 *   - Email present: +3
 *   - Phone present: +3
 *   - Name present:  +2
 *   - Location data: +2 (any of city/state/zip)
 *
 * Minimum score is 1, maximum is 10.
 */
export function computeSignalStrength(order: RawTicketOrder): number {
  let score = 0;

  if (order.customerEmail && order.customerEmail.trim()) score += 3;
  if (order.customerPhone && order.customerPhone.trim()) score += 3;
  if (order.customerName && order.customerName.trim()) score += 2;

  // Location data not available in current schema, but ready for future
  // If we had city/state/zip, they'd add +2

  // Minimum strength of 1
  return Math.max(1, Math.min(10, score));
}

/**
 * Determines which data points are present for the signal card tooltip.
 */
export function getDataPoints(order: RawTicketOrder) {
  return {
    email: !!(order.customerEmail && order.customerEmail.trim()),
    phone: !!(order.customerPhone && order.customerPhone.trim()),
    name: !!(order.customerName && order.customerName.trim()),
    location: false, // Not available in current schema
  };
}

/**
 * Normalizes a raw ticket order into a NormalizedSignal.
 *
 * For MVP, all ticket orders map to the "Purchase" lane.
 */
export function normalizeTicketOrder(
  order: RawTicketOrder
): NormalizedSignal {
  const { firstName, lastName } = splitName(order.customerName || "");

  // Parse the price value (coerce to string first — API may return string or number)
  const ticketPrice = parseFloat(
    String(order.ticketPrice ?? "0").replace(/[^0-9.-]/g, "")
  );
  const totalValue = ticketPrice;

  // Determine event lane — all ticket orders are "Purchase" for MVP
  const lane: SignalLane = "Purchase";

  return {
    eventName: "Purchase",
    eventTime: Math.floor(
      order.orderDate ? new Date(order.orderDate).getTime() / 1000 : Date.now() / 1000
    ),
    sourceUrl: "https://sitickets.com/",
    orderId: order.orderId,
    lane,

    // PII fields — will be hashed by the hasher
    email: order.customerEmail || "",
    phone: order.customerPhone || "",
    firstName,
    lastName,
    city: "",
    state: "",
    zipCode: "",
    country: "",

    // Custom data
    currency: "USD",
    value: totalValue,
    channel: order.channel || "",
    productName: order.productName || "",
    paymentMethod: order.paymentMethod || "",

    signalStrength: computeSignalStrength(order),
  };
}

/**
 * Validates that a raw ticket order has the minimum required fields.
 */
export function validateTicketOrder(
  order: Partial<RawTicketOrder>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!order.orderId) errors.push("orderId is required");
  if (!order.customerEmail && !order.customerPhone) {
    errors.push("At least one of customerEmail or customerPhone is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
