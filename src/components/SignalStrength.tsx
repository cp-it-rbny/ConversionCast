"use client";

interface SignalStrengthProps {
  strength: number; // 1-10
  dataPoints: {
    email: boolean;
    phone: boolean;
    name: boolean;
    location: boolean;
  };
  showTooltip?: boolean;
}

export default function SignalStrength({
  strength,
  dataPoints,
  showTooltip = true,
}: SignalStrengthProps) {
  const percentage = (strength / 10) * 100;
  const strengthClass =
    strength <= 3
      ? "strength-low"
      : strength <= 6
        ? "strength-med"
        : "strength-high";

  const strengthLabel =
    strength <= 3 ? "Weak" : strength <= 6 ? "Fair" : "Strong";

  return (
    <div className="group relative">
      <div className="flex items-center gap-2">
        <div className="strength-bar flex-1" style={{ minWidth: "60px" }}>
          <div
            className={`strength-fill ${strengthClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span
          className={`text-[10px] font-bold tabular-nums ${
            strength <= 3
              ? "text-signal-red"
              : strength <= 6
                ? "text-signal-amber"
                : "text-signal-green"
          }`}
        >
          {strength}/10
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap"
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
            Signal Strength: {strengthLabel}
          </div>
          <div className="flex flex-col gap-1">
            <DataPointRow label="Email" present={dataPoints.email} />
            <DataPointRow label="Phone" present={dataPoints.phone} />
            <DataPointRow label="Name" present={dataPoints.name} />
            <DataPointRow label="Location" present={dataPoints.location} />
          </div>
        </div>
      )}
    </div>
  );
}

function DataPointRow({
  label,
  present,
}: {
  label: string;
  present: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {present ? (
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-signal-green">
          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-text-muted">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L6.94 8l-1.72 1.72a.75.75 0 101.06 1.06L8 9.06l1.72 1.72a.75.75 0 101.06-1.06L9.06 8l1.72-1.72a.75.75 0 00-1.06-1.06L8 6.94 6.28 5.22z" />
        </svg>
      )}
      <span className={present ? "text-text-primary" : "text-text-muted"}>
        {label}
      </span>
    </div>
  );
}
