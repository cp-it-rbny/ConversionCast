"use client";

import type { Connector, AdDestination } from "@/lib/types";
import ConnectorCard from "./ConnectorCard";

interface FunnelBoardProps {
  connectors: Connector[];
  destinations: AdDestination[];
  pulsingConnectorIds: Set<string>;
  onAddSource: () => void;
  onConnectDest: () => void;
  onRefreshSource?: (id: string) => void;
  isRefreshingSource?: string | null;
}

export default function FunnelBoard({
  connectors,
  destinations,
  pulsingConnectorIds,
  onAddSource,
  onConnectDest,
  onRefreshSource,
  isRefreshingSource,
}: FunnelBoardProps) {
  const connectedDest = destinations.find(d => d.status === "connected");

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col md:flex-row gap-8 items-stretch">
        
        {/* Sources Lane */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Data Sources
            </h3>
            <button onClick={onAddSource} className="text-[10px] font-bold text-blue-600 hover:underline">
              Add New
            </button>
          </div>
          <div className="space-y-4">
            {connectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                isPulsing={pulsingConnectorIds.has(connector.id)}
                onRefresh={connector.type === "Pull" ? () => onRefreshSource?.(connector.id) : undefined}
                isRefreshing={isRefreshingSource === connector.id}
              />
            ))}
            {connectors.length === 0 && (
              <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-xs text-text-muted">No sources connected</p>
              </div>
            )}
          </div>
        </div>

        {/* The Pipeline (Visual Connector) */}
        <div className="hidden md:flex flex-col items-center justify-center gap-4 px-4">
           <div className="w-10 h-10 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center text-slate-300 shadow-sm">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
               <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
             </svg>
           </div>
           <div className="h-full w-px bg-gradient-to-b from-blue-100 via-emerald-100 to-emerald-100 opacity-50" />
        </div>

        {/* Destinations Lane */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ad Destinations
            </h3>
          </div>
          <div className="space-y-4">
            {connectedDest ? (
              <div className="clean-card p-5 border-emerald-100 bg-emerald-50/10 animate-slide-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 flex items-center justify-center shadow-sm">
                      <span className="text-blue-600 font-bold">f</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{connectedDest.provider} Ads</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Connected</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] tabular-nums text-text-secondary font-medium px-2 py-0.5 bg-white rounded border border-emerald-50 shadow-sm">
                    ID: {connectedDest.pixelId}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-emerald-50">
                  <span className="text-[10px] text-text-muted italic">Casting signals live...</span>
                  <button className="text-[10px] font-bold text-text-secondary hover:text-text-primary">Configure</button>
                </div>
              </div>
            ) : (
              <div className="clean-card p-8 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-center">
                 <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-slate-300">
                      <path d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                 </div>
                 <div>
                    <p className="text-sm font-semibold text-text-primary">No Ad Destinations Linked</p>
                    <p className="text-xs text-text-muted mt-1">Connect Meta or Google to start broadcasting</p>
                 </div>
                 <button onClick={onConnectDest} className="btn-primary mt-2">
                    Connect Ad Provider
                 </button>
              </div>
            )}

            {!connectedDest && (
              <div className="opacity-40 grayscale pointer-events-none transition-all">
                 <div className="clean-card p-5 border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">G</div>
                       <h4 className="text-sm font-semibold text-text-primary">Google Ads</h4>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Global Dashboard Tip */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-4 animate-slide-in">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 animate-pulse">
          💡
        </div>
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          <strong>Tip:</strong> You are currently using a <strong>Pull-based ingestion</strong>. 
          The gateway will automatically poll your ticket provider every 15 minutes to recover missing signals.
        </p>
      </div>
    </div>
  );
}
