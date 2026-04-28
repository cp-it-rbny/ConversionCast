// ConversionCast — Zero-Knowledge PII Hasher
// =============================================
// CRITICAL: Raw PII never leaves this module.
// No logging, no storage, no side effects.

import { createHash } from "crypto";
import type { NormalizedSignal, HashedSignal } from "./types";

/**
 * Normalizes a string for consistent hashing:
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 */
function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Normalizes a phone number for consistent hashing:
 * - Strip all non-digit characters
 * - Ensure only digits remain
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Hashes a single value using SHA-256.
 * Returns empty string if input is empty/null.
 */
function sha256(value: string): string {
  if (!value || value.trim() === "") return "";
  return createHash("sha256").update(normalize(value)).digest("hex");
}

/**
 * Hashes a phone number using SHA-256 after phone-specific normalization.
 */
function sha256Phone(phone: string): string {
  if (!phone || phone.trim() === "") return "";
  const normalized = normalizePhone(phone);
  if (!normalized) return "";
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Hashes all PII fields in a NormalizedSignal, producing a HashedSignal.
 *
 * Zero-Knowledge Contract:
 * - Raw PII is consumed by this function and never stored
 * - Only SHA-256 hashes leave this function
 * - No logging of input values occurs
 */
export function hashSignal(signal: NormalizedSignal): HashedSignal {
  return {
    eventName: signal.eventName,
    eventTime: signal.eventTime,
    sourceUrl: signal.sourceUrl,
    eventId: signal.orderId,

    // Hash all PII fields
    hashedEmail: sha256(signal.email),
    hashedPhone: sha256Phone(signal.phone),
    hashedFirstName: sha256(signal.firstName),
    hashedLastName: sha256(signal.lastName),
    hashedCity: sha256(signal.city),
    hashedState: sha256(signal.state),
    hashedZipCode: sha256(signal.zipCode),
    hashedCountry: sha256(signal.country),

    // Non-PII fields pass through
    currency: signal.currency,
    value: signal.value,
    channel: signal.channel,
    productName: signal.productName,
    paymentMethod: signal.paymentMethod,

    signalStrength: signal.signalStrength,
    lane: signal.lane,
  };
}
