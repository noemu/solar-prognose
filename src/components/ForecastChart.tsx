import React, { useEffect, useMemo, useState } from "react";

import type { ForecastPoint } from "../utils/openMeteoForecast";

interface ForecastChartProps {
  points: ForecastPoint[];
}

const SVG_WIDTH = 820;
const SVG_HEIGHT = 470;
const PADDING = { top: 24, right: 58, bottom: 46, left: 52 };

const formatAxisValue = (value: number) => `${Math.round(value)}`;

const toTimestamp = (time: string) => {
  const parsed = new Date(time).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const formatTimeLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

const buildLine = (
  points: ForecastPoint[],
  maxValue: number,
  getValue: (point: ForecastPoint) => number,
) => {
  const innerWidth = SVG_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  return points
    .map((point, index) => {
      const x =
        PADDING.left + (index / Math.max(points.length - 1, 1)) * innerWidth;
      const y =
        PADDING.top + innerHeight - (getValue(point) / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

const buildArea = (points: ForecastPoint[], maxValue: number) => {
  const innerWidth = SVG_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;
  const baseY = PADDING.top + innerHeight;
  const line = buildLine(points, maxValue, (point) => point.powerW);
  const endX = PADDING.left + innerWidth;
  return `${line} L${endX.toFixed(1)},${baseY.toFixed(1)} L${PADDING.left},${baseY.toFixed(1)} Z`;
};

const buildEnergyLine = (
  pointsCount: number,
  values: number[],
  maxValue: number,
  innerHeight: number,
) => {
  return values
    .map((value, index) => {
      const x =
        PADDING.left +
        (index / Math.max(pointsCount - 1, 1)) *
          (SVG_WIDTH - PADDING.left - PADDING.right);
      const y = PADDING.top + innerHeight - (value / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

export const ForecastChart: React.FC<ForecastChartProps> = ({ points }) => {
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30_000);

    return () => window.clearInterval(timerId);
  }, []);

  if (points.length === 0) {
    return null;
  }

  const powerMaxValue = Math.max(1, ...points.map((point) => point.powerW));
  const innerWidth = SVG_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;
  const xLabels = points.filter(
    (_, index) => index % 12 === 0 || index === points.length - 1,
  );
  const nowState = useMemo(() => {
    const firstTimestamp = toTimestamp(points[0]?.time ?? "");
    const lastTimestamp = toTimestamp(points[points.length - 1]?.time ?? "");

    if (
      firstTimestamp === null ||
      lastTimestamp === null ||
      lastTimestamp <= firstTimestamp ||
      nowTimestamp < firstTimestamp ||
      nowTimestamp > lastTimestamp
    ) {
      return null;
    }

    const nowPointIndex = points.reduce((bestIndex, point, index) => {
      const timestamp = toTimestamp(point.time);
      if (timestamp === null) {
        return bestIndex;
      }
      if (timestamp <= nowTimestamp) {
        return index;
      }
      return bestIndex;
    }, 0);

    const timeProgress =
      (nowTimestamp - firstTimestamp) / (lastTimestamp - firstTimestamp);
    const x = PADDING.left + timeProgress * innerWidth;

    return {
      x,
      label: formatTimeLabel(nowTimestamp),
      nowPointIndex,
      baselineEnergyWh: points[nowPointIndex]?.cumulativeEnergyWh ?? 0,
    };
  }, [innerWidth, nowTimestamp, points]);
  const energyValues = useMemo(() => {
    if (nowState === null) {
      return points.map((point) => point.cumulativeEnergyWh);
    }

    return points.map((point, index) => {
      if (index <= nowState.nowPointIndex) {
        return 0;
      }

      return Math.max(0, point.cumulativeEnergyWh - nowState.baselineEnergyWh);
    });
  }, [nowState, points]);
  const energyMaxValue = Math.max(1, ...energyValues);
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const powerValue = (powerMaxValue / 4) * index;
    const energyValue = (energyMaxValue / 4) * index;
    const y =
      PADDING.top + innerHeight - (powerValue / powerMaxValue) * innerHeight;
    return {
      powerValue,
      energyValue,
      y,
    };
  });
  const selectedState = useMemo(() => {
    if (
      selectedIndex === null ||
      selectedIndex < 0 ||
      selectedIndex >= points.length
    ) {
      return null;
    }

    const selectedPoint = points[selectedIndex];
    const x =
      PADDING.left +
      (selectedIndex / Math.max(points.length - 1, 1)) * innerWidth;
    const powerValue = selectedPoint.powerW;
    const energyValue = energyValues[selectedIndex] ?? 0;
    const powerY =
      PADDING.top + innerHeight - (powerValue / powerMaxValue) * innerHeight;
    const energyY =
      PADDING.top + innerHeight - (energyValue / energyMaxValue) * innerHeight;

    return {
      x,
      label: selectedPoint.label,
      powerValue,
      energyValue,
      powerY,
      energyY,
    };
  }, [
    energyMaxValue,
    energyValues,
    innerHeight,
    innerWidth,
    points,
    powerMaxValue,
    selectedIndex,
  ]);

  const handleChartClick: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const relativeX = ((event.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const clampedX = Math.max(
      PADDING.left,
      Math.min(SVG_WIDTH - PADDING.right, relativeX),
    );
    const progress = (clampedX - PADDING.left) / Math.max(innerWidth, 1);
    const nextIndex = Math.round(progress * Math.max(points.length - 1, 0));
    setSelectedIndex(nextIndex);
  };

  const clampLabelY = (value: number) =>
    Math.max(PADDING.top + 10, Math.min(PADDING.top + innerHeight - 4, value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-4 text-base font-semibold text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Leistung (W)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
          Energie (Wh)
        </span>
      </div>

      <div className="pb-2">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="h-auto w-full"
          preserveAspectRatio="none"
          onClick={handleChartClick}
          role="button"
          tabIndex={0}
          aria-label="Forecast-Diagramm mit auswählbaren Werten"
        >
          <defs>
            <linearGradient id="forecast-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={PADDING.left}
                y1={tick.y}
                x2={SVG_WIDTH - PADDING.right}
                y2={tick.y}
                stroke="#cbd5e1"
                strokeDasharray="4 4"
              />
              <text
                x={PADDING.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[15px]"
              >
                {formatAxisValue(tick.powerValue)}
              </text>
              <text
                x={SVG_WIDTH - PADDING.right + 10}
                y={tick.y + 4}
                textAnchor="start"
                className="fill-slate-500 text-[15px]"
              >
                {formatAxisValue(tick.energyValue)}
              </text>
            </g>
          ))}

          <text
            x={18}
            y={18}
            textAnchor="start"
            className="fill-slate-500 text-[16px] font-semibold"
          >
            W
          </text>
          <text
            x={SVG_WIDTH - 10}
            y={18}
            textAnchor="end"
            className="fill-slate-500 text-[16px] font-semibold"
          >
            Wh
          </text>

          <path
            d={buildArea(points, powerMaxValue)}
            fill="url(#forecast-area)"
          />
          <path
            d={buildLine(points, powerMaxValue, (point) => point.powerW)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={buildEnergyLine(
              points.length,
              energyValues,
              energyMaxValue,
              innerHeight,
            )}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight}
            x2={SVG_WIDTH - PADDING.right}
            y2={PADDING.top + innerHeight}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {nowState && (
            <>
              <line
                x1={nowState.x}
                y1={PADDING.top}
                x2={nowState.x}
                y2={PADDING.top + innerHeight}
                stroke="#dc2626"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
              <text
                x={nowState.x}
                y={PADDING.top - 6}
                textAnchor="middle"
                className="fill-rose-600 text-[15px] font-semibold"
              >
                Jetzt {nowState.label}
              </text>
            </>
          )}

          {selectedState && (
            <>
              <line
                x1={selectedState.x}
                y1={PADDING.top}
                x2={selectedState.x}
                y2={PADDING.top + innerHeight}
                stroke="#0f172a"
                strokeWidth="2"
              />
              <text
                x={selectedState.x}
                y={PADDING.top + innerHeight + 24}
                textAnchor="middle"
                className="fill-slate-800 text-[16px] font-semibold"
              >
                {selectedState.label}
              </text>

              <circle
                cx={selectedState.x}
                cy={selectedState.powerY}
                r="4.5"
                fill="#f59e0b"
                stroke="#92400e"
                strokeWidth="1"
              />
              <circle
                cx={selectedState.x}
                cy={selectedState.energyY}
                r="4.5"
                fill="#0284c7"
                stroke="#075985"
                strokeWidth="1"
              />

              <rect
                x={4}
                y={clampLabelY(selectedState.powerY) - 10}
                width={42}
                height={18}
                rx={4}
                fill="#fff7ed"
                stroke="#f59e0b"
              />
              <text
                x={25}
                y={clampLabelY(selectedState.powerY) + 3}
                textAnchor="middle"
                className="fill-amber-700 text-[15px] font-semibold"
              >
                {formatAxisValue(selectedState.powerValue)}
              </text>

              <rect
                x={SVG_WIDTH - 48}
                y={clampLabelY(selectedState.energyY) - 10}
                width={44}
                height={18}
                rx={4}
                fill="#eff6ff"
                stroke="#0284c7"
              />
              <text
                x={SVG_WIDTH - 26}
                y={clampLabelY(selectedState.energyY) + 3}
                textAnchor="middle"
                className="fill-sky-700 text-[15px] font-semibold"
              >
                {formatAxisValue(selectedState.energyValue)}
              </text>
            </>
          )}

          {xLabels.map((point) => {
            const index = points.indexOf(point);
            const x =
              PADDING.left +
              (index / Math.max(points.length - 1, 1)) * innerWidth;

            return (
              <g key={point.time}>
                <line
                  x1={x}
                  y1={PADDING.top + innerHeight}
                  x2={x}
                  y2={PADDING.top + innerHeight + 6}
                  stroke="#475569"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={SVG_HEIGHT - 16}
                  textAnchor="middle"
                  className="fill-slate-500 text-[15px]"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
