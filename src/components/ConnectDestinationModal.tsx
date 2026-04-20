"use client";

import { useState } from "react";
import type { AdDestination } from "@/lib/types";

interface ConnectDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (destination: AdDestination) => void;
}

type Step = "select" | "configure" | "success";

const PROVIDERS = [
  { id: "Meta", name: "Meta Ads", icon: "f", color: "text-blue-600", active: true },
  { id: "Google", name: "Google Ads", icon: "G", color: "text-slate-400", active: false },
  { id: "TikTok", name: "TikTok Ads", icon: "T", color: "text-slate-400", active: false },
  { id: "Amazon", name: "Amazon Ads", icon: "A", color: "text-slate-400", active: false },
];

export default function ConnectDestinationModal({
  isOpen,
  onClose,
  onConnect,
}: ConnectDestinationModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null);
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (provider: typeof PROVIDERS[0]) => {
    if (!provider.active) return;
    setSelectedProvider(provider);
    setStep("configure");
  };

  const handleConnect = async () => {
    if (!pixelId) return;
    setIsConnecting(true);
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnecting(false);
    setStep("success");
    
    // Notify parent after a short delay so user sees "Success" state
    setTimeout(() => {
      onConnect({
        id: `dest_${Date.now()}`,
        provider: selectedProvider!.id as any,
        pixelId: pixelId,
        accessToken: accessToken,
        status: "connected",
      });
      onClose();
      // Reset for next time
      setTimeout(() => {
        setStep("select");
        setPixelId("");
        setAccessToken("");
      }, 500);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-in">
        <div className="p-8">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {step === "select" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Connect Ad Provider</h2>
                <p className="text-sm text-slate-500 mt-1">Choose a destination for your conversion signals</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleSelect(provider)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                      provider.active 
                        ? "border-slate-200 hover:border-blue-500 hover:bg-slate-50 active:scale-95" 
                        : "border-slate-100 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl font-bold ${provider.color}`}>
                      {provider.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{provider.name}</span>
                    {!provider.active && <span className="text-[9px] text-slate-400 font-bold italic">Soon</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "configure" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                 <button onClick={() => setStep("select")} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                       <path d="M15 19l-7-7 7-7" />
                    </svg>
                 </button>
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedProvider?.name}</h2>
                    <p className="text-sm text-slate-500">Configure your connection settings</p>
                 </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Pixel ID</label>
                  <input
                    type="text"
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    placeholder="Enter your Meta Pixel ID"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5 mt-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Access Token</label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Enter Conversions API Access Token"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!pixelId || !accessToken || isConnecting}
                  className="w-full btn-primary py-3.5 mt-4 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isConnecting ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Connect Account"
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-10 h-10">
                    <path d="M5 13l4 4L19 7" />
                 </svg>
              </div>
              <div>
                 <h2 className="text-2xl font-bold text-slate-900">Connected!</h2>
                 <p className="text-sm text-slate-500 mt-1">Your {selectedProvider?.name} gateway is now active</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
