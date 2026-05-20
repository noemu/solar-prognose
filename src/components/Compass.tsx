import React from "react";

interface CompassProps {
  currentHeading: number;
  targetAzimuth: number;
  isAccurate: boolean;
}

export const Compass: React.FC<CompassProps> = ({
  currentHeading,
  targetAzimuth,
  isAccurate,
}) => {
  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 20;

  // Berechne Position des Zielzeigers
  const targetAngle = (targetAzimuth * Math.PI) / 180;
  const targetX = center + radius * Math.sin(targetAngle);
  const targetY = center - radius * Math.cos(targetAngle);

  // Berechne Position des aktuellen Zeigers (immer oben)
  const arrowSize = 40;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-lg"
      >
        {/* Hintergrund */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={isAccurate ? "#dcfce7" : "#fef3c7"}
          stroke="#1a1a2e"
          strokeWidth="2"
        />

        {/* Kompass-Kreis */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="3"
        />

        {/* Hauptrichtungen */}
        <text
          x={center}
          y={center - radius + 25}
          textAnchor="middle"
          className="font-bold text-lg fill-red-600"
        >
          N
        </text>
        <text
          x={center + radius - 25}
          y={center + 7}
          textAnchor="middle"
          className="font-bold text-lg fill-gray-600"
        >
          E
        </text>
        <text
          x={center}
          y={center + radius - 5}
          textAnchor="middle"
          className="font-bold text-lg fill-gray-600"
        >
          S
        </text>
        <text
          x={center - radius + 25}
          y={center + 7}
          textAnchor="middle"
          className="font-bold text-lg fill-gray-600"
        >
          W
        </text>

        {/* Gradmarkierungen */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const x1 = center + (radius - 10) * Math.sin(angle);
          const y1 = center - (radius - 10) * Math.cos(angle);
          const x2 = center + radius * Math.sin(angle);
          const y2 = center - radius * Math.cos(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#1a1a2e"
              strokeWidth="1"
            />
          );
        })}

        {/* Zielmarker (Sonne/Target) */}
        <circle
          cx={targetX}
          cy={targetY}
          r="8"
          fill="#fbbf24"
          stroke="#d97706"
          strokeWidth="2"
        />
        <circle
          cx={targetX}
          cy={targetY}
          r="14"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="1"
          opacity="0.5"
        />

        {/* Aktueller Zeiger (oben) - Blau */}
        <g transform={`translate(${center}, ${center - radius + 10})`}>
          <polygon
            points={`0,-${arrowSize / 2} ${arrowSize / 2},${arrowSize / 2} 0,${arrowSize / 4} -${arrowSize / 2},${arrowSize / 2}`}
            fill="#3b82f6"
            stroke="#1e40af"
            strokeWidth="2"
          />
        </g>

        {/* Mittelpunkt */}
        <circle cx={center} cy={center} r="6" fill="#1a1a2e" />
      </svg>

      {/* Infos unter dem Kompass */}
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">
          Aktuelle Richtung: {currentHeading}°
        </div>
        <div className="text-sm text-amber-600 font-semibold">
          Ziel: {targetAzimuth}°
        </div>
        <div
          className={`text-xs mt-1 ${isAccurate ? "text-green-600" : "text-yellow-600"}`}
        >
          {isAccurate ? "✓ Ausrichtung korrekt!" : "Stelle dein Handy aus"}
        </div>
      </div>
    </div>
  );
};
