import React from "react";

interface InclinationBarProps {
  currentPitch: number; // Aktuelle Neigung (-90 bis 90)
}

export const InclinationBar: React.FC<InclinationBarProps> = ({
  currentPitch,
}) => {
  // Für PV ist nur 0..90° relevant.
  const clampedCurrent = Math.max(0, Math.min(90, Math.abs(currentPitch)));

  // 0° unten, 90° oben
  const currentPercent = (clampedCurrent / 90) * 100;
  const currentPercentInBox = Math.max(2, Math.min(98, currentPercent));

  return (
    <div className="h-full w-full flex items-stretch gap-2">
      <div className="h-full min-h-0 flex flex-col justify-between text-[10px] text-slate-700 py-1 font-semibold">
        <span>90°</span>
        <span>60°</span>
        <span>30°</span>
        <span>0°</span>
      </div>

      <div className="relative w-21 h-full min-h-0 rounded-2xl border-2 border-slate-700 bg-slate-50 shadow-inner overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={`line-${i}`}
            className="absolute left-0 right-0 border-t border-slate-300"
            style={{ top: `${(i * 100) / 9}%` }}
          />
        ))}

        <div
          className="absolute left-1 right-1 transition-[bottom] duration-75"
          style={{ bottom: `${currentPercentInBox}%` }}
        >
          <div className="flex items-center">
            <div className="w-0 h-0 border-y-6 border-y-transparent border-r-10 border-r-blue-700" />
            <div className="h-1 flex-1 bg-blue-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
