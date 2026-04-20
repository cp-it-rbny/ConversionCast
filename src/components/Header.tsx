"use client";

interface HeaderProps {
  isConnected: boolean;
  signalCount: number;
}

export default function Header({ isConnected, signalCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm overflow-hidden">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                 <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
               </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">ConversionCast</h1>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
            Signal Gateway
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {isConnected ? "Gateway Online" : "Connecting..."}
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">
            {signalCount} Buffered
          </p>
        </div>
      </div>
    </header>
  );
}
