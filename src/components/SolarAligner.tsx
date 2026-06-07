import React, { useEffect, useRef, useState } from "react";
import { LiveAlignmentPreview } from "./LiveAlignmentPreview";
import { ForecastChart } from "./ForecastChart";
import { useSensorData } from "../hooks/useSensorData";
import {
  fetchSolarForecast,
  toOpenMeteoAzimuth,
  toPanelTilt,
  type SolarForecastResult,
} from "../utils/openMeteoForecast";

const normalizeHeading = (angle: number) => ((angle % 360) + 360) % 360;

const numberFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

const formatNumber = (value: number, suffix: string) =>
  `${numberFormatter.format(value)} ${suffix}`;

const toStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return toStartOfDay(next);
};

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const PANEL_HEADING_OFFSET = 180;
const OPEN_METEO_MAX_PAST_DAYS = 92;
const OPEN_METEO_MAX_FUTURE_DAYS = 15;

const StatCard: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      {label}
    </div>
    <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
  </div>
);

export const SolarAligner: React.FC = () => {
  const { sensorData, requestOrientationPermission, permissionRequired } =
    useSensorData();
  const [wPeak, setWPeak] = useState(430);
  const [efficiency, setEfficiency] = useState(85);
  const [wPeakInput, setWPeakInput] = useState(() => `${wPeak}`);
  const [efficiencyInput, setEfficiencyInput] = useState(() => `${efficiency}`);
  const [forecastsByDate, setForecastsByDate] = useState<
    Record<string, SolarForecastResult>
  >({});
  const [loadedDateKeys, setLoadedDateKeys] = useState<string[]>([]);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [headingOffset, setHeadingOffset] = useState<number | null>(null);
  const forecastSectionRef = useRef<HTMLElement | null>(null);
  const pendingForecastScrollRef = useRef(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    toStartOfDay(new Date()),
  );

  const calibrationBaseHeading = sensorData.magneticHeading;
  const canCalibrate = calibrationBaseHeading !== null;
  const deviceHeading = normalizeHeading(
    headingOffset === null || calibrationBaseHeading === null
      ? sensorData.heading
      : calibrationBaseHeading - headingOffset,
  );
  const effectiveHeading = normalizeHeading(
    deviceHeading + PANEL_HEADING_OFFSET,
  );
  const currentTilt = toPanelTilt(sensorData.pitch);
  const apiAzimuth = toOpenMeteoAzimuth(effectiveHeading);
  const minAvailableDate = addDays(new Date(), -OPEN_METEO_MAX_PAST_DAYS);
  const maxAvailableDate = addDays(new Date(), OPEN_METEO_MAX_FUTURE_DAYS);
  const selectedDateKey = formatDateForApi(selectedDate);
  const currentForecast = forecastsByDate[selectedDateKey] ?? null;
  const selectedLoadedIndex = loadedDateKeys.indexOf(selectedDateKey);
  const canGoPreviousDate = selectedLoadedIndex > 0;
  const canGoNextDate =
    selectedLoadedIndex >= 0 && selectedLoadedIndex < loadedDateKeys.length - 1;

  useEffect(() => {
    if (!pendingForecastScrollRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      forecastSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    if (!isLoadingForecast) {
      pendingForecastScrollRef.current = false;
    }
  }, [forecastError, currentForecast, isLoadingForecast]);

  const handleCalibrate = () => {
    if (!canCalibrate || calibrationBaseHeading === null) {
      return;
    }

    setHeadingOffset(calibrationBaseHeading);
  };

  const handleResetCalibration = () => {
    setHeadingOffset(null);
  };

  const handleLoadForecast = async () => {
    pendingForecastScrollRef.current = true;

    if (sensorData.latitude === null || sensorData.longitude === null) {
      setForecastError("GPS-Position ist noch nicht verfuegbar.");
      return;
    }

    setIsLoadingForecast(true);
    setForecastError(null);

    try {
      const datesToLoad = [0, 1, 2].map((offset) =>
        addDays(selectedDate, offset),
      );
      const results = await Promise.all(
        datesToLoad.map(async (date) => {
          const dateKey = formatDateForApi(date);
          const result = await fetchSolarForecast({
            latitude: sensorData.latitude as number,
            longitude: sensorData.longitude as number,
            tilt: currentTilt,
            azimuth: apiAzimuth,
            wPeak,
            efficiency,
            date: dateKey,
          });
          return {
            dateKey,
            result,
          };
        }),
      );

      setForecastsByDate((prev) => {
        const next = { ...prev };
        results.forEach(({ dateKey, result }) => {
          next[dateKey] = result;
        });
        return next;
      });
      setLoadedDateKeys(results.map(({ dateKey }) => dateKey));
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Solar-Prognose konnte nicht geladen werden.";
      setForecastError(message);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  const updateNumericValue = (
    rawValue: string,
    setter: (value: number) => void,
    inputSetter: (value: string) => void,
  ) => {
    inputSetter(rawValue);

    if (rawValue === "") {
      return;
    }

    const nextValue = Number(rawValue);
    if (!Number.isFinite(nextValue)) {
      return;
    }

    setter(nextValue);
  };

  const commitNumericValue = (
    rawValue: string,
    fallbackValue: number,
    setter: (value: number) => void,
    inputSetter: (value: string) => void,
  ) => {
    if (rawValue === "") {
      inputSetter(`${fallbackValue}`);
      return;
    }

    const nextValue = Number(rawValue);
    if (!Number.isFinite(nextValue)) {
      inputSetter(`${fallbackValue}`);
      return;
    }

    setter(nextValue);
  };

  const handlePreviousDate = () => {
    if (!canGoPreviousDate || selectedLoadedIndex <= 0) {
      return;
    }
    const previousKey = loadedDateKeys[selectedLoadedIndex - 1];
    if (!previousKey) {
      return;
    }
    setSelectedDate(toStartOfDay(new Date(previousKey)));
  };

  const handleNextDate = () => {
    if (!canGoNextDate || selectedLoadedIndex < 0) {
      return;
    }
    const nextKey = loadedDateKeys[selectedLoadedIndex + 1];
    if (!nextKey) {
      return;
    }
    setSelectedDate(toStartOfDay(new Date(nextKey)));
  };

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.45),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_48%,#fefce8_100%)] px-4 py-5 text-slate-900"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)",
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Anlagenwerte
              </h2>
              <p className="text-sm text-slate-600">
                Diese Werte werden lokal mit Zustand gespeichert.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              WPeak
              <input
                type="number"
                min="10"
                step="10"
                value={wPeakInput}
                onChange={(event) =>
                  updateNumericValue(
                    event.target.value,
                    setWPeak,
                    setWPeakInput,
                  )
                }
                onBlur={() =>
                  commitNumericValue(wPeakInput, wPeak, setWPeak, setWPeakInput)
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Wirkungsgrad (%)
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={efficiencyInput}
                onChange={(event) =>
                  updateNumericValue(
                    event.target.value,
                    setEfficiency,
                    setEfficiencyInput,
                  )
                }
                onBlur={() =>
                  commitNumericValue(
                    efficiencyInput,
                    efficiency,
                    setEfficiency,
                    setEfficiencyInput,
                  )
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Live-Ausrichtung
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Die Visualisierung zeigt die aktuell erfasste Richtung und
                Neigung des Geraets.
              </p>

              <LiveAlignmentPreview
                currentPitch={sensorData.pitch}
                currentHeading={deviceHeading}
                isAccurate={false}
                headingSuffix="deg"
                pitchSuffix="deg"
              />

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCalibrate}
                  disabled={!canCalibrate}
                  className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Kompass kalibrieren
                </button>
                <button
                  type="button"
                  onClick={handleResetCalibration}
                  disabled={headingOffset === null}
                  className="rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Kalibrierung loeschen
                </button>
                {permissionRequired && (
                  <button
                    type="button"
                    onClick={() => void requestOrientationPermission()}
                    className="rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                  >
                    Sensoren aktivieren
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoadForecast}
              disabled={
                isLoadingForecast ||
                selectedDate < minAvailableDate ||
                selectedDate > maxAvailableDate ||
                sensorData.latitude === null ||
                sensorData.longitude === null
              }
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoadingForecast
                ? "Prognose wird geladen..."
                : "Prognose berechnen (3 Tage)"}
            </button>
          </div>

          <section
            ref={forecastSectionRef}
            className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Forecast
                </h2>
              </div>
              {currentForecast && (
                <div className="text-xs font-medium text-slate-500">
                  Zeitzone: {currentForecast.timezone}
                </div>
              )}
            </div>

            {forecastError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {forecastError}
              </div>
            )}

            {!currentForecast && !forecastError && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                Starte die Prognose, um den Verlauf fuer den gewaehlten Tag und
                die naechsten zwei Tage zu laden.
              </div>
            )}

            {currentForecast && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <StatCard
                    label="Aktuelle Leistung"
                    value={formatNumber(currentForecast.currentPowerW, "W")}
                  />
                  <StatCard
                    label="Tagesenergie"
                    value={formatNumber(currentForecast.totalEnergyWh, "Wh")}
                  />
                  <StatCard
                    label="Peak Leistung"
                    value={formatNumber(currentForecast.peakPowerW, "W")}
                  />
                  <StatCard
                    label="Peak GTI"
                    value={formatNumber(currentForecast.peakGti, "W/m2")}
                  />
                </div>

                <ForecastChart points={currentForecast.points} />

                <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
                  <button
                    type="button"
                    onClick={handlePreviousDate}
                    disabled={!canGoPreviousDate}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ◀
                  </button>
                  <span>{formatDateLabel(selectedDate)}</span>
                  <button
                    type="button"
                    onClick={handleNextDate}
                    disabled={!canGoNextDate}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ▶
                  </button>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
};
