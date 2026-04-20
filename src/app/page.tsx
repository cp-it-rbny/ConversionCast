"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Connector, AdDestination, DashboardStats, SSEPayload, FunnelSignal } from "@/lib/types";
import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import FunnelBoard from "@/components/FunnelBoard";
import ConnectDestinationModal from "@/components/ConnectDestinationModal";
import EventLogTable from "@/components/EventLogTable";

const DEFAULT_STATS: DashboardStats = {
  totalSignals: 0,
  successfulCasts: 0,
  failedCasts: 0,
  averageStrength: 0,
  signalsPerMinute: 0,
  lastCastTime: null,
};

const INITIAL_CONNECTORS: Connector[] = [
  {
    id: "conn_tickets_001",
    name: "Ticket Provider API",
    type: "Pull", // Changed to Pull for explicit polling context
    lane: "Purchase",
    status: "active",
    totalCasts: 0,
    avgStrength: 0,
  },
];

export default function Dashboard() {
  const [connectors, setConnectors] = useState<Connector[]>(INITIAL_CONNECTORS);
  const [destinations, setDestinations] = useState<AdDestination[]>([]);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [isConnected, setIsConnected] = useState(false);
  const [pulsingConnectorIds, setPulsingConnectorIds] = useState<Set<string>>(new Set());
  const [isDestModalOpen, setIsDestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingId, setIsRefreshingId] = useState<string | null>(null);
  const [signals, setSignals] = useState<FunnelSignal[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Sync initial data
  useEffect(() => {
    fetch("/api/signals")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        if (data.signals) setSignals(data.signals);
        setConnectors(prev => prev.map(c => ({
          ...c,
          totalCasts: data.stats.successfulCasts || 0,
          avgStrength: data.stats.averageStrength || 0
        })));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // SSE connection
  useEffect(() => {
    const connect = () => {
      const es = new EventSource("/api/stream");
      eventSourceRef.current = es;

      es.onopen = () => setIsConnected(true);

      es.onmessage = (event) => {
        try {
          const payload: SSEPayload = JSON.parse(event.data);
          if (payload.type === "signal" && payload.data) {
            const signal = payload.data as FunnelSignal;
            
            // Update signals list logic:
            // 1. If signal exists (status update), update in place
            // 2. If new signal, unshift to front
            let isNew = false;
            setSignals(current => {
              const index = current.findIndex(s => s.id === signal.id);
              if (index !== -1) {
                const next = [...current];
                next[index] = signal;
                return next;
              }
              isNew = true;
              return [signal, ...current].slice(0, 200); // Buffer limit
            });

            // Update stats
            setStats(prev => ({
              ...prev,
              totalSignals: isNew ? prev.totalSignals + 1 : prev.totalSignals,
              successfulCasts: prev.successfulCasts + (signal.status === "cast" ? 1 : 0),
              averageStrength: signal.signalStrength,
              lastCastTime: Date.now()
            }));

            // Pulse the connector
            const connId = "conn_tickets_001";
            setConnectors(current => current.map(c => c.id === connId ? {
              ...c,
              totalCasts: c.totalCasts + (signal.status === "cast" ? 1 : 0),
              lastSignal: { id: signal.id, maskedId: signal.maskedId, timestamp: Date.now() }
            } : c));

            setPulsingConnectorIds(prev => new Set(prev).add(connId));
            setTimeout(() => setPulsingConnectorIds(prev => {
              const next = new Set(prev);
              next.delete(connId);
              return next;
            }), 3000);
          }
        } catch { /* Ignore */ }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => eventSourceRef.current?.close();
  }, []);

  // Handler for manual pull/refresh
  const handleRefreshSource = useCallback(async (id: string, resetCache: boolean = false) => {
    setIsRefreshingId(id);
    try {
      const activeMetaDest = destinations.find(d => d.provider === "Meta" && d.status === "connected");
      
      const payload: any = {};
      
      if (activeMetaDest?.pixelId && activeMetaDest?.accessToken) {
        payload.credentials = {
          pixelId: activeMetaDest.pixelId,
          accessToken: activeMetaDest.accessToken
        };
      }
      
      if (resetCache) {
        payload.resetCache = true;
      }

      const res = await fetch("/api/connector/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
      });
      const result = await res.json();
      console.log("🔵 [Dashboard] Pull result:", result);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      // Small delay for visual impact of the spinning icon
      setTimeout(() => setIsRefreshingId(null), 1000);
    }
  }, [destinations]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading Pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-inter">
      <Header isConnected={isConnected} signalCount={stats.totalSignals} />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-10">
           <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Signal Control</h2>
              <p className="text-sm text-slate-500 mt-1">Status of your zero-knowledge conversion pipeline</p>
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                onClick={() => handleRefreshSource("conn_tickets_001", true)}
                className="text-[10px] font-bold tracking-widest text-emerald-600 hover:text-emerald-700 uppercase px-3 py-1.5 bg-emerald-50 rounded border border-emerald-100 transition-colors"
                title="Clears deduplication cache and re-polls test data"
              >
                Reset Signals Cache
              </button>
              <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase px-2 py-1.5 bg-slate-100 rounded border border-slate-200">
                Poll Interval: 15m
              </span>
           </div>
        </div>

        <StatsBar stats={stats} />

        <FunnelBoard
          connectors={connectors}
          destinations={destinations}
          pulsingConnectorIds={pulsingConnectorIds}
          onAddSource={() => {}}
          onConnectDest={() => setIsDestModalOpen(true)}
          onRefreshSource={handleRefreshSource}
          isRefreshingSource={isRefreshingId}
        />

        <EventLogTable signals={signals} />
      </main>

      <footer className="py-10 px-6 border-t border-slate-200 bg-white">
         <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 ConversionCast v0.1.0 
               </p>
               <div className="h-3 w-px bg-slate-200" />
               <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">
                 Secure Pull Flow
               </p>
            </div>
            <div className="flex items-center gap-6">
               <a href="#" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Setup Cron</a>
               <a href="#" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">API Logs</a>
            </div>
         </div>
      </footer>

      <ConnectDestinationModal 
        isOpen={isDestModalOpen} 
        onClose={() => setIsDestModalOpen(false)} 
        onConnect={(dest) => setDestinations(prev => [...prev, dest])}
      />
    </div>
  );
}
