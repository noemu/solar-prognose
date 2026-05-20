import React from "react";

interface InclinationBarProps {
  currentPitch: number; // Aktuelle Neigung (-90 bis 90)
  targetElevation: number; // Zielneigung (0-90)
  headingError: number; // Horizontaler Fehler
  elevationError: number; // Vertikaler Fehler
}

export const InclinationBar: React.FC<InclinationBarProps> = ({
  currentPitch,
  targetElevation,
  headingError,
  elevationError,
}) => {
  // Normalisiere auf -90 bis 90
  const clampedCurrent = Math.max(-90, Math.min(90, currentPitch));
  const clampedTarget = Math.max(0, Math.min(90, targetElevation));

  // Prozentuale Position (0 = unten, 100 = oben)
  const currentPercent = ((clampedCurrent + 90) / 180) * 100;
  const targetPercent = ((clampedTarget + 90) / 180) * 100;

  const barHeight = 300;

  return (
    <div className="flex gap-6 items-stretch">
      {/* Höhenwinkel-Balken */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">
          Höhe
        </h3>
        <div
          className="relative bg-gradient-to-b from-blue-100 to-orange-100 rounded-lg border-2 border-gray-400"
          style={{ height: `${barHeight}px`, width: "60px" }}
        >
          {/* Hintergrundraster */}
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={`line-${i}`}
              className="absolute w-full border-t border-gray-300 opacity-30"
              style={{ top: `${(i * 100) / 8}%` }}
            />
          ))}

          {/* Zielmarker (Sonne gelb) */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 w-full flex items-center justify-center transition-all"
            style={{ bottom: `${targetPercent}%` }}
          >
            <div className="bg-yellow-400 border-2 border-yellow-600 rounded-full p-1 shadow-lg">
              <div className="w-6 h-6 flex items-center justify-center text-xs font-bold">
                ☀️
              </div>
            </div>
          </div>

          {/* Aktueller Wert (blauer Balken) */}
          <div
            className="absolute left-0 right-0 bg-blue-400 transition-all duration-200 rounded border-2 border-blue-600"
            style={{
              height: `${barHeight * 0.08}px`,
              bottom: `${currentPercent}%`,
            }}
          />
        </div>

        {/* Legende */}
        <div className="mt-3 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 border border-blue-600 rounded" />
            <span>Aktuell: {Math.round(clampedCurrent)}°</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 border border-yellow-600 rounded-full text-center text-xs leading-none">
              ☀️
            </div>
            <span>Ziel: {Math.round(clampedTarget)}°</span>
          </div>
        </div>
      </div>

      {/* Horizontaler Fehlerindikator */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">
          Richtung
        </h3>
        <div
          className="relative bg-gradient-to-l from-red-100 via-green-100 to-red-100 rounded-lg border-2 border-gray-400"
          style={{ height: `${barHeight}px`, width: "80px" }}
        >
          {/* Mittellinie */}
          <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-1 bg-green-500" />

          {/* Fehlerwert als Balken */}
          <div
            className={`absolute top-1/2 h-8 transform -translate-y-1/2 transition-all ${
              Math.abs(headingError) < 5
                ? "bg-green-500"
                : Math.abs(headingError) < 15
                  ? "bg-yellow-400"
                  : "bg-red-500"
            } border-2 ${Math.abs(headingError) < 5 ? "border-green-700" : "border-red-700"}`}
            style={{
              left:
                headingError > 0
                  ? "50%"
                  : `calc(50% - ${Math.abs(headingError) * 2}px)`,
              width: `${Math.min(Math.abs(headingError) * 2, 40)}px`,
            }}
          />
        </div>

        {/* Legende */}
        <div className="mt-3 text-xs space-y-1">
          <div className="text-center">
            <span className="font-semibold">
              {headingError > 0 ? "→" : "←"} {Math.abs(headingError)}°
            </span>
          </div>
          <div className="text-center text-gray-500 text-xs">
            {Math.abs(headingError) < 5
              ? "Perfekt!"
              : Math.abs(headingError) < 15
                ? "Fast"
                : "Weiter drehen"}
          </div>
        </div>
      </div>
    </div>
  );
};
