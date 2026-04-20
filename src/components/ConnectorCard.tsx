"use client";

import { useEffect, useState } from "react";
import type { Connector } from "@/lib/types";

interface ConnectorCardProps {
  connector: Connector;
  isPulsing?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function ConnectorCard({
  connector,
  isPulsing = false,
  onRefresh,
  isRefreshing = false,
}: ConnectorCardProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isPulsing) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPulsing]);

  return (
    <div
      className={`clean-card p-4 flex flex-col gap-3 ${
        pulse ? "signal-pulse-subtle border-emerald-200" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-lg">
            🎟️
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {connector.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connector.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
                {connector.status}
              </span>
            </div>
          </div>
        </div>

        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50"
            title="Pull latest orders"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth={2} 
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Casts</p>
          <p className="text-base font-semibold text-text-primary mt-0.5 tabular-nums">
            {connector.totalCasts.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Type</p>
          <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100 inline-block">
            {connector.type}
          </p>
        </div>
      </div>

      <div className="pt-1">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Recent Activity</p>
        {connector.lastSignal ? (
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {connector.lastSignal.maskedId}
            </span>
            <span className="text-text-secondary">
              {new Date(connector.lastSignal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-text-muted italic">Waiting for signal...</p>
        )}
      </div>
    </div>
  );
}
