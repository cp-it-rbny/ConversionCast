"use client";

import { useState } from "react";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddEventModal({ isOpen, onClose }: AddEventModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/tickets`
      : "/api/webhooks/tickets";

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content w-full max-w-lg p-6"
        style={{ animation: "slide-in 0.3s ease forwards" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Add Event Source
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Connect a data source to a signal lane
            </p>
          </div>
          <button
            id="btn-close-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-secondary">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Source Type Selection */}
        <div className="space-y-3 mb-6">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Source Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Active: Ticket Provider */}
            <button
              id="btn-source-ticket"
              className="p-4 rounded-xl text-left transition-all cursor-pointer"
              style={{
                background: "rgba(0, 255, 136, 0.08)",
                border: "1px solid rgba(0, 255, 136, 0.25)",
              }}
            >
              <span className="text-xl mb-2 block">🎟️</span>
              <p className="text-sm font-semibold text-text-primary">
                Ticket Provider
              </p>
              <p className="text-[11px] text-signal-green mt-0.5">
                Active • Webhook
              </p>
            </button>

            {/* Locked: CRM */}
            <div
              className="p-4 rounded-xl opacity-40 cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-xl mb-2 block">📊</span>
              <p className="text-sm font-semibold text-text-primary">CRM</p>
              <p className="text-[11px] text-text-muted mt-0.5">Coming Soon</p>
            </div>

            {/* Locked: CSV Upload */}
            <div
              className="p-4 rounded-xl opacity-40 cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-xl mb-2 block">📁</span>
              <p className="text-sm font-semibold text-text-primary">
                CSV Upload
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Coming Soon</p>
            </div>

            {/* Locked: Open JSON */}
            <div
              className="p-4 rounded-xl opacity-40 cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-xl mb-2 block">🔗</span>
              <p className="text-sm font-semibold text-text-primary">
                Open JSON
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Coming Soon</p>
            </div>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Webhook Endpoint
          </label>
          <div
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <code className="flex-1 text-xs text-signal-green font-mono truncate">
              {webhookUrl}
            </code>
            <button
              id="btn-copy-webhook"
              onClick={handleCopy}
              className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
              style={{
                background: copied
                  ? "rgba(0, 255, 136, 0.2)"
                  : "rgba(255,255,255,0.06)",
                color: copied ? "#00ff88" : "#94a3b8",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-text-muted">
            POST ticket orders to this URL. Supports single orders and batch{" "}
            <code className="text-signal-blue">{"{ data: [...] }"}</code> format.
          </p>
        </div>

        {/* Field Mapping Preview */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Field Mapping (Auto-configured)
          </label>
          <div
            className="rounded-lg overflow-hidden"
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                  <th className="text-left p-2.5 text-text-muted font-medium">
                    Source Field
                  </th>
                  <th className="text-left p-2.5 text-text-muted font-medium">
                    →
                  </th>
                  <th className="text-left p-2.5 text-text-muted font-medium">
                    Meta CAPI
                  </th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <MappingRow source="customerEmail" target="em (SHA-256)" />
                <MappingRow source="customerPhone" target="ph (SHA-256)" />
                <MappingRow source="customerName" target="fn + ln (SHA-256)" />
                <MappingRow source="ticketPrice" target="value" />
                <MappingRow source="orderId" target="event_id" />
                <MappingRow source="orderDate" target="event_time" />
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            id="btn-cancel-modal"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary transition-colors cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
          >
            Cancel
          </button>
          <button
            id="btn-save-mapping"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={{
              background: "rgba(0, 255, 136, 0.15)",
              color: "#00ff88",
              border: "1px solid rgba(0, 255, 136, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 255, 136, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 255, 136, 0.15)";
            }}
          >
            Save Mapping
          </button>
        </div>
      </div>
    </div>
  );
}

function MappingRow({ source, target }: { source: string; target: string }) {
  return (
    <tr style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <td className="p-2.5 font-mono text-signal-blue">{source}</td>
      <td className="p-2.5 text-text-muted">→</td>
      <td className="p-2.5 font-mono text-signal-green">{target}</td>
    </tr>
  );
}
