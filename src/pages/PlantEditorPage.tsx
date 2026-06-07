import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LiveAlignmentPreview } from "../components/LiveAlignmentPreview";
import { useSensorData } from "../hooks/useSensorData";
import { usePlantStore } from "../store/usePlantStore";
import {
  fetchSolarForecast,
  toOpenMeteoAzimuth,
  toPanelTilt,
  type SolarForecastResult,
} from "../utils/openMeteoForecast";

const normalizeHeading = (angle: number) => ((angle % 360) + 360) % 360;

const formatNumber = (value: number, suffix: string) =>
  `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(
    value,
  )} ${suffix}`;

export const PlantEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { plantId } = useParams();
  const plants = usePlantStore((state) => state.plants);
  const addPlant = usePlantStore((state) => state.addPlant);
  const updatePlant = usePlantStore((state) => state.updatePlant);
  const { sensorData, requestOrientationPermission, permissionRequired } =
    useSensorData();
  const { heading, pitch, latitude, longitude } = sensorData;

  const plant = useMemo(
    () => plants.find((item) => item.id === plantId) ?? null,
    [plants, plantId],
  );
  const isEditing = plant !== null;

  const [name, setName] = useState(plant?.name ?? "");
  const [tiltInput, setTiltInput] = useState<string>(
    plant?.tilt?.toString() ?? "30",
  );
  const [azimuthInput, setAzimuthInput] = useState<string>(
    plant?.azimuth?.toString() ?? "180",
  );
  const [wPeakInput, setWPeakInput] = useState<string>(
    plant?.wPeak?.toString() ?? "430",
  );
  const [efficiencyInput, setEfficiencyInput] = useState<string>(
    plant?.efficiency?.toString() ?? "85",
  );
  const [latitudeValue, setLatitudeValue] = useState<number | null>(
    plant?.latitude ?? latitude,
  );
  const [longitudeValue, setLongitudeValue] = useState<number | null>(
    plant?.longitude ?? longitude,
  );
  const [currentForecast, setCurrentForecast] =
    useState<SolarForecastResult | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const liveDeviceHeading = normalizeHeading(heading);
  const livePanelHeading = normalizeHeading(liveDeviceHeading + 180);
  const liveTilt = toPanelTilt(pitch);
  const currentTilt = toPanelTilt(pitch);
  const deviceHeading = heading;

  useEffect(() => {
    if (plant) {
      setName(plant.name);
      setTiltInput(plant.tilt.toString());
      setAzimuthInput(plant.azimuth.toString());
      setWPeakInput(plant.wPeak.toString());
      setEfficiencyInput(plant.efficiency.toString());
      setLatitudeValue(plant.latitude);
      setLongitudeValue(plant.longitude);
      return;
    }

    setTiltInput("30");
    setAzimuthInput("180");
    setWPeakInput("430");
    setEfficiencyInput("85");
    setLatitudeValue(latitude);
    setLongitudeValue(longitude);
  }, [plant, latitude, longitude]);

  const parseNumberValue = (value: string, fallback: number) => {
    if (value.trim() === "") {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const handleAdoptLiveValues = () => {
    setTiltInput(liveTilt.toString());
    setAzimuthInput(livePanelHeading.toString());
  };

  const handleCalculatePower = async () => {
    if (latitude === null || longitude === null) {
      setForecastError("GPS-Position ist noch nicht verfügbar.");
      return;
    }

    const parsedTilt = Number(
      tiltInput.trim() === "" ? NaN : Number(tiltInput),
    );
    const parsedAzimuth = Number(
      azimuthInput.trim() === "" ? NaN : Number(azimuthInput),
    );
    const parsedWPeak = Number(
      wPeakInput.trim() === "" ? NaN : Number(wPeakInput),
    );
    const parsedEfficiency = Number(
      efficiencyInput.trim() === "" ? NaN : Number(efficiencyInput),
    );

    if (
      !Number.isFinite(parsedTilt) ||
      !Number.isFinite(parsedAzimuth) ||
      !Number.isFinite(parsedWPeak) ||
      !Number.isFinite(parsedEfficiency)
    ) {
      setForecastError("Bitte füllen Sie alle numerischen Felder korrekt aus.");
      return;
    }

    setIsCalculating(true);
    setForecastError(null);

    try {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const result = await fetchSolarForecast({
        latitude,
        longitude,
        tilt: parsedTilt,
        azimuth: toOpenMeteoAzimuth(parsedAzimuth),
        wPeak: parsedWPeak,
        efficiency: parsedEfficiency,
        date: dateKey,
      });
      setCurrentForecast(result);
    } catch (err) {
      setForecastError(
        err instanceof Error
          ? err.message
          : "Forecast konnte nicht geladen werden.",
      );
      setCurrentForecast(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim() || "Neue Anlage";
    const plantLatitude = latitudeValue ?? latitude ?? null;
    const plantLongitude = longitudeValue ?? longitude ?? null;

    const fallbackTilt = plant?.tilt ?? 30;
    const fallbackAzimuth = plant?.azimuth ?? 180;
    const fallbackWPeak = plant?.wPeak ?? 430;
    const fallbackEfficiency = plant?.efficiency ?? 85;

    const savedTilt = parseNumberValue(tiltInput, fallbackTilt);
    const savedAzimuth = parseNumberValue(azimuthInput, fallbackAzimuth);
    const savedWPeak = parseNumberValue(wPeakInput, fallbackWPeak);
    const savedEfficiency = parseNumberValue(
      efficiencyInput,
      fallbackEfficiency,
    );

    if (isEditing && plant) {
      updatePlant(plant.id, {
        name: trimmedName,
        tilt: savedTilt,
        azimuth: savedAzimuth,
        wPeak: savedWPeak,
        efficiency: savedEfficiency,
        latitude: plantLatitude,
        longitude: plantLongitude,
      });
    } else {
      addPlant({
        name: trimmedName,
        tilt: savedTilt,
        azimuth: savedAzimuth,
        wPeak: savedWPeak,
        efficiency: savedEfficiency,
        latitude: plantLatitude,
        longitude: plantLongitude,
      });
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              {isEditing ? "Anlage bearbeiten" : "Neue Anlage hinzufügen"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Hier können Sie Anlagenwerte eintragen und die aktuelle Leistung
              berechnen.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Zurück zur Übersicht
          </Link>
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium text-slate-700">
            Name der Anlage
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            placeholder="z. B. Dach Süd"
          />
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Live-Ausrichtung
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Die Visualisierung zeigt die aktuell erfasste Richtung und Neigung
              des Geräts.
            </p>

            <LiveAlignmentPreview
              currentPitch={currentTilt}
              currentHeading={deviceHeading}
              isAccurate={true}
            />

            <div className="mt-5 flex flex-wrap items-center gap-3">
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

            <button
              type="button"
              onClick={handleAdoptLiveValues}
              className="mt-5 w-full rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Werte übernehmen
            </button>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm uppercase tracking-[0.16em] text-slate-500">
                Einstellungen
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600">
                  Neigung (°)
                  <input
                    type="number"
                    value={tiltInput}
                    onChange={(event) => setTiltInput(event.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-600">
                  Ausrichtung (°)
                  <input
                    type="number"
                    value={azimuthInput}
                    onChange={(event) => setAzimuthInput(event.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm uppercase tracking-[0.16em] text-slate-500">
                Solar-Konfiguration
              </div>
              <p className="text-sm text-slate-500">
                Diese Werte gehören zur allgemeinen SolarConfig und werden
                global gespeichert.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600">
                  Max. Leistung (W)
                  <input
                    type="number"
                    value={wPeakInput}
                    onChange={(event) => setWPeakInput(event.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-600">
                  Wirkungsgrad (%)
                  <input
                    type="number"
                    value={efficiencyInput}
                    onChange={(event) => setEfficiencyInput(event.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm uppercase tracking-[0.16em] text-slate-500">
                Standort
              </div>
              <p className="text-sm text-slate-500">
                Die GPS-Koordinaten werden mit der Anlage gespeichert. Sie
                können die aktuelle Position Ihres Geräts übernehmen.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600">
                  Breitengrad
                  <input
                    type="number"
                    value={latitudeValue ?? ""}
                    onChange={(event) =>
                      setLatitudeValue(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    placeholder="z. B. 48.7758"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-600">
                  Längengrad
                  <input
                    type="number"
                    value={longitudeValue ?? ""}
                    onChange={(event) =>
                      setLongitudeValue(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    placeholder="z. B. 9.1829"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLatitudeValue(latitude);
                  setLongitudeValue(longitude);
                }}
                disabled={latitude === null || longitude === null}
                className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Aktuelle GPS übernehmen
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">
                Aktuelle Leistung berechnen
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Berechne die heutige Leistung basierend auf den aktuellen
                Einstellungen.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCalculatePower}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Berechnen
            </button>
          </div>

          {isCalculating ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
              Berechnung läuft...
            </div>
          ) : forecastError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
              {forecastError}
            </div>
          ) : currentForecast ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Leistung jetzt
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(currentForecast.currentPowerW, "W")}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Spitzenleistung
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(currentForecast.peakPowerW, "W")}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Tagesenergie
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(currentForecast.totalEnergyWh, "Wh")}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
              Drücken Sie auf "Berechnen", um die aktuelle Forecast-Leistung zu
              sehen.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};
