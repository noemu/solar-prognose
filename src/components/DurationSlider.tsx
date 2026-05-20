import React from "react";

interface DurationSliderProps {
  duration: number; // in Stunden
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export const DurationSlider: React.FC<DurationSliderProps> = ({
  duration,
  onChange,
  min = 0.5,
  max = 12,
}) => {
  const getDurationLabel = (hours: number): string => {
    const mins = Math.round((hours % 1) * 60);
    const hrs = Math.floor(hours);

    if (hrs === 0) {
      return `${mins}min`;
    }
    if (mins === 0) {
      return `${hrs}h`;
    }
    return `${hrs}h ${mins}min`;
  };

  const getRecommendation = (hours: number): string => {
    if (hours < 1) return "Kurze Ausrichtung";
    if (hours < 3) return "Halber Tag";
    if (hours < 6) return "Ein Drittel Tag";
    if (hours < 9) return "Halber Tag";
    return "Ganzer Tag";
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <label className="text-lg font-bold text-gray-800">
          Ausrichtungsdauer
        </label>
        <div className="text-2xl font-bold text-blue-600">
          {getDurationLabel(duration)}
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        {getRecommendation(duration)}
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={0.25}
        value={duration}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />

      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{getDurationLabel(min)}</span>
        <span>{getDurationLabel(max)}</span>
      </div>

      {/* Tipps */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-2 font-semibold">💡 Tipps:</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            • <strong>Kurz (&lt;2h):</strong> Mobile Anwendungen, Tests
          </li>
          <li>
            • <strong>Mittel (2-6h):</strong> Typischer Sonnenlauf-Teile
          </li>
          <li>
            • <strong>Lang (&gt;6h):</strong> Ganztägige Optimierung
          </li>
        </ul>
      </div>
    </div>
  );
};
