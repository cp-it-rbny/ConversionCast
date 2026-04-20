"use client";

import { useEffect, useState } from "react";
import type { FunnelSignal } from "@/lib/types";
import SignalStrength from "./SignalStrength";

interface SignalCardProps {
  signal: FunnelSignal;
  isNew?: boolean;
}

export default function SignalCard({ signal, isNew = false }: SignalCardProps) {
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (signal.status === "cast" || isNew) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [signal.status, isNew]);

  const statusBadge = {
    pending: { class: "badge-pending", label: "Pending" },
    casting: { class: "badge-casting", label: "Casting..." },
    cast: { class: "badge-cast", label: "Cast ✓" },
    failed: { class: "badge-failed", label: "Failed" },
  }[signal.status];

  const timeAgo = formatTimeAgo(signal.timestamp);

  return (
    <div
      id={`signal-${signal.id}`}
      className={`glass-card-elevated p-3.5 ${isNew ? "signal-card-enter" : ""} ${
        showPulse && signal.status === "cast" ? "signal-pulse" : ""
      }`}
      style={{
        borderColor:
          showPulse && signal.status === "cast"
            ? "rgba(0, 255, 136, 0.4)"
            : undefined,
      }}
    >
      {/* Top Row: Masked ID + Status */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {/* Signal icon */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background:
                signal.status === "cast"
                  ? "rgba(0, 255, 136, 0.1)"
                  : signal.status === "failed"
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(59, 130, 246, 0.1)",
            }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              className={`w-3.5 h-3.5 ${
                signal.status === "cast"
                  ? "text-signal-green"
                  : signal.status === "failed"
                    ? "text-signal-red"
                    : "text-signal-blue"
              }`}
            >
              <path d="M3.75 2a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V2.75A.75.75 0 013.75 2zm4 2a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0v-6.5A.75.75 0 017.75 4zm4-1a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5a.75.75 0 01.75-.75z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-primary font-mono">
              {signal.maskedId}
            </p>
            <p className="text-[10px] text-text-muted">{timeAgo}</p>
          </div>
        </div>
        <span className={`badge ${statusBadge.class}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Event Name */}
      <p className="text-[11px] text-text-secondary mb-2.5 font-medium">
        {signal.eventName}
      </p>

      {/* Signal Strength */}
      <SignalStrength
        strength={signal.signalStrength}
        dataPoints={signal.dataPoints}
      />
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
