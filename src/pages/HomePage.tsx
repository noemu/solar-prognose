import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePlantStore } from "../store/usePlantStore";
import {
  fetchSolarForecast,
  toOpenMeteoAzimuth,
} from "../utils/openMeteoForecast";
import { ForecastChart } from "../components/ForecastChart";
import { SolarForecastResult } from "../utils/openMeteoForecast";

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const numberFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

const formatValue = (value: number, suffix: string) =>
  `${numberFormatter.format(value)} ${suffix}`;

export const HomePage: React.FC = () => {
  const plants = usePlantStore((state) => state.plants);
  const deletePlant = usePlantStore((state) => state.deletePlant);

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(
    plants[0]?.id ?? null,
  );
  const [forecast, setForecast] = useState<SolarForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastForecastRequest = useRef<string | null>(null);

  const selectedPlant = useMemo(
    () => plants.find((plant) => plant.id === selectedPlantId) ?? null,
    [plants, selectedPlantId],
  );

  const selectedDateKey = formatDateForApi(new Date());

  useEffect(() => {
    if (!selectedPlant) {
      setForecast(null);
      setError(null);
      lastForecastRequest.current = null;
      return;
    }

    const forecastLatitude = selectedPlant.latitude;
    const forecastLongitude = selectedPlant.longitude;

    if (forecastLatitude === null || forecastLongitude === null) {
      setError("Die Anlage hat keine GPS-Koordinaten.");
      setForecast(null);
      return;
    }

    const requestKey = JSON.stringify({
      id: selectedPlant.id,
      date: selectedDateKey,
      latitude: forecastLatitude,
      longitude: forecastLongitude,
      tilt: selectedPlant.tilt,
      azimuth: selectedPlant.azimuth,
      wPeak: selectedPlant.wPeak,
      efficiency: selectedPlant.efficiency,
    });

    if (requestKey === lastForecastRequest.current) {
      return;
    }

    lastForecastRequest.current = requestKey;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchSolarForecast({
          latitude: forecastLatitude,
          longitude: forecastLongitude,
          tilt: selectedPlant.tilt,
          azimuth: toOpenMeteoAzimuth(selectedPlant.azimuth),
          wPeak: selectedPlant.wPeak,
          efficiency: selectedPlant.efficiency,
          date: selectedDateKey,
        });
        setForecast(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Forecast konnte nicht geladen werden.",
        );
        setForecast(null);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [selectedPlant, selectedDateKey]);

  const handleDeletePlant = () => {
    if (!selectedPlant) {
      return;
    }

    deletePlant(selectedPlant.id);
    setForecast(null);
  };

  useEffect(() => {
    if (!selectedPlant && plants.length > 0) {
      setSelectedPlantId(plants[0].id);
    }
  }, [plants, selectedPlant]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
              Solar Prognose
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Anlagenübersicht
            </h1>
          </div>
          <Link
            to="/anlage/neue-anlage"
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            + Anlage hinzufügen
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-sm font-semibold">Neigung</th>
                <th className="px-4 py-3 text-sm font-semibold">Ausrichtung</th>
                <th className="px-4 py-3 text-sm font-semibold">Peak (W)</th>
                <th className="px-4 py-3 text-sm font-semibold">
                  Wirkungsgrad
                </th>
              </tr>
            </thead>
            <tbody>
              {plants.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-sm text-slate-500">
                    Keine Anlagen angelegt. Bitte oben auf "+ Anlage hinzufügen"
                    klicken.
                  </td>
                </tr>
              ) : (
                plants.map((plant) => (
                  <tr
                    key={plant.id}
                    onClick={() => setSelectedPlantId(plant.id)}
                    className={`cursor-pointer border-t border-slate-200 transition hover:bg-slate-100 ${
                      plant.id === selectedPlantId ? "bg-slate-100" : ""
                    }`}
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                      {plant.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatValue(plant.tilt, "°")}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatValue(plant.azimuth, "°")}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatValue(plant.wPeak, "W")}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatValue(plant.efficiency, "%")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Forecast</h2>
              <p className="mt-1 text-sm text-slate-500">
                Klicken Sie auf eine Anlage, um den aktuellen Forecast
                anzuzeigen.
              </p>
            </div>
            {selectedPlant && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  {selectedPlant.name}
                </div>
                <button
                  type="button"
                  onClick={handleDeletePlant}
                  className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Löschen
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
              Forecast wird geladen...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
              {error}
            </div>
          ) : selectedPlant && forecast ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <ForecastChart points={forecast.points} />
              </div>
              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Aktuelle Leistung
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-900">
                    {formatValue(forecast.currentPowerW, "W")}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Spitzenleistung
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-900">
                    {formatValue(forecast.peakPowerW, "W")}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Tagesenergie
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-900">
                    {formatValue(forecast.totalEnergyWh, "Wh")}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
              Wählen Sie eine Anlage aus der Tabelle, um die Forecast-Grafik
              anzuzeigen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
