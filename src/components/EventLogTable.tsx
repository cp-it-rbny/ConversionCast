"use client";

import { useState } from "react";
import type { FunnelSignal } from "@/lib/types";
import SignalStrength from "./SignalStrength";

interface EventLogTableProps {
  signals: FunnelSignal[];
}

export default function EventLogTable({ signals }: EventLogTableProps) {
  const [selectedPayload, setSelectedPayload] = useState<Record<string, any> | null>(null);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cast":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">Cast</span>;
      case "failed":
        return <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase tracking-wider">Failed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold uppercase tracking-wider animate-pulse">Pending</span>;
    }
  };

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Signal Transmission Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time audit of zero-knowledge signals cast to ad platforms</p>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          Buffer: {signals.length} / 200
        </div>
      </div>

      <div className="clean-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Signal ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Event</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Strength</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] text-right">Meta Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {signals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-slate-300">
                        <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-xs font-medium text-slate-500 italic">Waiting for signals...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                signals.map((signal) => (
                  <tr key={signal.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-[11px] font-medium text-slate-500 tabular-nums">
                      {formatTime(signal.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${signal.status === 'cast' ? 'bg-emerald-400' : signal.status === 'failed' ? 'bg-rose-400' : 'bg-blue-400 animate-pulse'}`} />
                         <span className="text-[11px] font-bold text-slate-900 font-mono tracking-tight">{signal.maskedId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-slate-600">{signal.eventName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(signal.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                      <SignalStrength strength={signal.signalStrength} dataPoints={signal.dataPoints} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {signal.castResult?.requestBody ? (
                        <button 
                          onClick={() => setSelectedPayload(signal.castResult?.requestBody || null)}
                          className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 bg-blue-50/50 px-2.5 py-1.5 rounded border border-blue-100 transition-all active:scale-95"
                        >
                          View Payload
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No Data</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Meta CAPI Payload</h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Application/JSON Data</p>
              </div>
              <button 
                onClick={() => setSelectedPayload(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-900">
              <pre className="text-[11px] font-mono leading-relaxed text-emerald-400">
                {JSON.stringify(selectedPayload, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end">
              <button 
                onClick={() => setSelectedPayload(null)}
                className="btn-primary"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
