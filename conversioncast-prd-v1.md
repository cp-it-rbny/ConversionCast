# Product Requirements Document (PRD): ConversionCast

## 1. Executive Summary
**ConversionCast** is a "Plumbing-as-a-Service" platform for digital marketing teams. It connects data silos (CRMs, Ticketing Systems, Data Warehouses) directly to Ad Platform Conversion APIs (CAPI). The core mission is to provide "Peace of Mind" by ensuring ad distribution is optimized with 100% of real-world conversion data, bypassing browser-side signal loss.

## 2. MVP Scope (Phase 1)
* **Connector A (Ingress):** Soccer Venue Ticket Provider (Webhook/API).
* **Connector B (Egress):** Meta Conversion API (Server-side).
* **Core Logic:** Automated PII hashing (SHA-256), data normalization, and deduplication.

## 3. The "Funnel Board" UI
The user interface is a visual Kanban board consisting of five "Signal Lanes":
1.  **Page View**
2.  **Content View**
3.  **Lead**
4.  **Checkout**
5.  **Purchase** (Active for MVP)

### UI Features:
* **Add Event:** Manual mapping of a data source to a lane.
* **The Pulse:** A visual green glow on event cards indicating a successful "cast" (server-side push).
* **Signal Strength:** A 1-10 score based on the density of matching data (Email, Phone, IP).

## 4. Technical Architecture
* **Frontend:** Next.js / Tailwind CSS.
* **Backend:** Node.js (Serverless).
* **Security Protocol:**
    * **Zero-Knowledge:** Raw PII is hashed in memory and never stored.
    * **Encryption:** TLS 1.3 in-transit.
    * **Deduplication:** Use of `order_id` as `event_id` to prevent double-counting.

## 5. User Stories
* **Marketing Manager:** Connect ticket provider to recover "lost" conversion data and *cast* it to Meta.
* **Privacy Officer:** Ensure data is hashed locally and never stored raw.
* **Performance Marketer:** Verify "Pulse" to confirm Meta AI is receiving signals.

## 6. Future Roadmap
* **Connector Marketplace:** Open SDK for niche SaaS providers to build their own "Cast" points.
* **Universal Ingress:** CSV Hot-Drop and Open JSON Endpoint.
* **Certifications:** SOC 2 Type II and GDPR/CCPA validation.