// ConversionCast — Test Cast Endpoint
// ======================================
// POST /api/test/cast
// Simulates a ticket purchase webhook for demo/development purposes.

import { NextResponse } from "next/server";

const SAMPLE_NAMES = [
  "Carlos Silva",
  "Maria Santos",
  "João Oliveira",
  "Ana Costa",
  "Pedro Almeida",
  "Fernanda Lima",
  "Lucas Pereira",
  "Juliana Rodrigues",
  "Rafael Souza",
  "Camila Ferreira",
  "Diego Martínez",
  "Isabella García",
  "Mateo López",
  "Valentina Hernández",
  "Santiago Torres",
];

const ORDER_TYPES = [
  "Season Pass",
  "Single Match",
  "VIP Box",
  "General Admission",
  "Student",
  "Family Pack",
];

function generateSampleOrder() {
  const name =
    SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
  const nameParts = name.toLowerCase().split(" ");
  const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const orderType =
    ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)];
  const ticketQuantity = Math.floor(Math.random() * 4) + 1;
  const ticketPrice = (
    Math.floor(Math.random() * 150) + 50
  ).toFixed(2);

  // Randomly omit some fields to vary signal strength
  const hasPhone = Math.random() > 0.3;
  const hasEmail = Math.random() > 0.1;

  return {
    orderId,
    orderDate: new Date().toISOString(),
    memberId: `MEM-${Math.floor(Math.random() * 100000)}`,
    orderType,
    ticketQuantity,
    ticketPrice,
    ticketTax: (parseFloat(ticketPrice) * 0.1).toFixed(2),
    processingFees: "2.50",
    customerName: name,
    customerEmail: hasEmail
      ? `${nameParts.join(".")}@email.com`
      : "",
    customerPhone: hasPhone
      ? `+55${Math.floor(Math.random() * 9000000000 + 1000000000)}`
      : "",
    paymentMethod: Math.random() > 0.5 ? "credit_card" : "pix",
    promoCode: Math.random() > 0.7 ? "MATCHDAY2026" : "",
    salesRepId: Math.floor(Math.random() * 100),
    salesRepName: "Online",
  };
}

export async function POST(request: Request) {
  // Generate sample order(s)
  const url = new URL(request.url);
  const count = Math.min(
    parseInt(url.searchParams.get("count") || "1"),
    10
  );

  const orders = Array.from({ length: count }, () =>
    generateSampleOrder()
  );

  // Forward to the webhook endpoint
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(
      `${baseUrl}/api/webhooks/tickets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: orders }),
      }
    );

    const result = await response.json();

    return NextResponse.json({
      message: `Test cast triggered — ${count} order(s) sent`,
      orders: orders.map((o) => ({
        orderId: o.orderId,
        name: o.customerName,
        type: o.orderType,
        quantity: o.ticketQuantity,
        value: o.ticketPrice,
      })),
      result,
    });
  } catch (error) {
    console.error("[ConversionCast] Test cast error:", error);
    return NextResponse.json(
      { error: "Failed to trigger test cast" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "test/cast",
    description:
      "POST to trigger a test cast with sample ticket data. Use ?count=N for batch (max 10).",
    example: "POST /api/test/cast?count=3",
  });
}
