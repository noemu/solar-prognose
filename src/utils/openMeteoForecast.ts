export interface ForecastPoint {
  time: string;
  label: string;
  gti: number;
  powerW: number;
  energyWh: number;
  cumulativeEnergyWh: number;
}

export interface SolarForecastResult {
  timezone: string;
  points: ForecastPoint[];
  totalEnergyWh: number;
  peakPowerW: number;
  peakGti: number;
  currentPowerW: number;
  currentCumulativeEnergyWh: number;
}

interface FetchSolarForecastParams {
  latitude: number;
  longitude: number;
  tilt: number;
  azimuth: number;
  wPeak: number;
  efficiency: number;
  date: string;
}

interface OpenMeteoResponse {
  error?: boolean;
  reason?: string;
  timezone?: string;
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
  minutely_15?: {
    time?: string[];
    global_tilted_irradiance?: number[];
  };
}

const QUARTER_HOUR_IN_HOURS = 0.25;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits: number = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const toTimeLabel = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value.slice(11, 16);
  }

  return parsedDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toTimestamp = (value: string | undefined) => {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const isSameLocalDay = (left: Date, right: Date) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const normalizeSignedAngle = (angle: number) => {
  const normalized = ((((angle + 180) % 360) + 360) % 360) - 180;
  return normalized === -180 ? 180 : normalized;
};

const toPowerW = (gti: number, wPeak: number, efficiency: number) => {
  const safeGti = Math.max(0, gti);
  const efficiencyFactor = clamp(efficiency, 0, 100) / 100;
  return safeGti * (wPeak / 1000) * efficiencyFactor;
};

export const toOpenMeteoAzimuth = (heading: number) => {
  return normalizeSignedAngle(heading - 180);
};

export const toPanelTilt = (pitch: number) => {
  return clamp(Math.abs(pitch), 0, 90);
};

export const fetchSolarForecast = async ({
  latitude,
  longitude,
  tilt,
  azimuth,
  wPeak,
  efficiency,
  date,
}: FetchSolarForecastParams): Promise<SolarForecastResult> => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    minutely_15: "global_tilted_irradiance",
    daily: "sunrise,sunset",
    start_date: date,
    end_date: date,
    timezone: "auto",
    tilt: round(tilt, 1).toString(),
    azimuth: round(azimuth, 1).toString(),
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  );

  let payload: OpenMeteoResponse;
  try {
    payload = (await response.json()) as OpenMeteoResponse;
  } catch {
    throw new Error("Open-Meteo hat keine gueltige JSON-Antwort geliefert.");
  }

  if (!response.ok || payload.error) {
    throw new Error(payload.reason ?? "Open-Meteo Anfrage fehlgeschlagen.");
  }

  const times = payload.minutely_15?.time;
  const irradianceValues = payload.minutely_15?.global_tilted_irradiance;

  if (
    !Array.isArray(times) ||
    !Array.isArray(irradianceValues) ||
    times.length !== irradianceValues.length ||
    times.length === 0
  ) {
    throw new Error("Open-Meteo hat keine GTI-Zeitreihe fuer heute geliefert.");
  }

  const sunriseTimestamp = toTimestamp(payload.daily?.sunrise?.[0]);
  const sunsetTimestamp = toTimestamp(payload.daily?.sunset?.[0]);
  const rawPoints = times.map((time, index) => {
    const gti = Number.isFinite(irradianceValues[index])
      ? irradianceValues[index]
      : 0;
    const powerW = toPowerW(gti, wPeak, efficiency);
    const energyWh = powerW * QUARTER_HOUR_IN_HOURS;

    return {
      time,
      gti: round(gti, 1),
      powerW: round(powerW, 1),
      energyWh: round(energyWh, 1),
    };
  });

  const daylightPoints =
    sunriseTimestamp !== null &&
    sunsetTimestamp !== null &&
    sunsetTimestamp > sunriseTimestamp
      ? rawPoints.filter((point) => {
          const timestamp = toTimestamp(point.time);
          return (
            timestamp !== null &&
            timestamp >= sunriseTimestamp &&
            timestamp <= sunsetTimestamp
          );
        })
      : rawPoints;

  const pointsSource = daylightPoints.length > 1 ? daylightPoints : rawPoints;
  let cumulativeEnergyWh = 0;
  const points = pointsSource.map((point) => {
    cumulativeEnergyWh += point.energyWh;

    return {
      ...point,
      label: toTimeLabel(point.time),
      cumulativeEnergyWh: round(cumulativeEnergyWh, 1),
    };
  });

  const now = new Date();
  const currentIndex = points.reduce((bestIndex, point, index) => {
    const pointTime = new Date(point.time);
    if (Number.isNaN(pointTime.getTime())) {
      return bestIndex;
    }

    if (pointTime.getTime() <= now.getTime()) {
      return index;
    }

    return bestIndex;
  }, 0);
  const currentPoint = points[currentIndex] ?? points[0];
  const isTodayForecast = points.some((point) => {
    const pointTime = new Date(point.time);
    return !Number.isNaN(pointTime.getTime()) && isSameLocalDay(pointTime, now);
  });
  const energyPoints = isTodayForecast
    ? points.filter((point) => {
        const pointTime = new Date(point.time);
        return (
          !Number.isNaN(pointTime.getTime()) &&
          pointTime.getTime() >= now.getTime()
        );
      })
    : points;

  return {
    timezone: payload.timezone ?? "auto",
    points,
    totalEnergyWh: round(
      energyPoints.reduce((sum, point) => sum + point.energyWh, 0),
      1,
    ),
    peakPowerW: round(
      points.reduce((peak, point) => Math.max(peak, point.powerW), 0),
      1,
    ),
    peakGti: round(
      points.reduce((peak, point) => Math.max(peak, point.gti), 0),
      1,
    ),
    currentPowerW: currentPoint.powerW,
    currentCumulativeEnergyWh: currentPoint.cumulativeEnergyWh,
  };
};
