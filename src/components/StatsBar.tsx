"use client";

import type { DashboardStats } from "@/lib/types";

interface StatsBarProps {
  stats: DashboardStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const metrics = [
    { label: "Total Signals", value: stats.totalSignals.toLocaleString() },
    { label: "Successful Casts", value: stats.successfulCasts.toLocaleString() },
    { label: "Signal Strength", value: `${Math.round(stats.averageStrength * 10)}%` },
    { label: "Signals/Min", value: stats.signalsPerMinute.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {metrics.map((metric) => (
        <div key={metric.label} className="clean-card p-5">
           <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] mb-1">
             {metric.label}
           </p>
           <p className="text-xl font-bold text-text-primary tabular-nums">
             {metric.value}
           </p>
        </div>
      ))}
    </div>
  );
}
