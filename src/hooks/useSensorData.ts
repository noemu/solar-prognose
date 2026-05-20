import { useEffect, useState } from "react";

interface SensorData {
  heading: number; // 0-360 Grad Kompass
  pitch: number; // -90 bis 90 (Neigung nach vorn/hinten)
  roll: number; // -180 bis 180 (Neigung links/rechts)
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

interface SensorError {
  type: "permission" | "not-supported" | "location" | "orientation";
  message: string;
}

export const useSensorData = () => {
  const [sensorData, setSensorData] = useState<SensorData>({
    heading: 0,
    pitch: 0,
    roll: 0,
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const [error, setError] = useState<SensorError | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Device Orientation (Kompass + Neigung)
  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined") {
      setError({
        type: "not-supported",
        message: "Device Orientation nicht unterstützt",
      });
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setSensorData((prev) => ({
        ...prev,
        heading: Math.round(event.alpha || 0), // 0-360
        pitch: Math.round(event.beta || 0), // -90 bis 90
        roll: Math.round(event.gamma || 0), // -180 bis 180
      }));
    };

    // Check permission (iOS 13+)
    if (
      typeof (DeviceOrientationEvent as any)?.requestPermission === "function"
    ) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permission: string) => {
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          } else {
            setError({
              type: "permission",
              message: "Geräte-Orientierungsberechtigung verweigert",
            });
          }
        })
        .catch(() => {
          setError({
            type: "permission",
            message: "Konnte Berechtigung nicht anfordern",
          });
        });
    } else {
      // Android oder andere Browser
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  // Geolocation (GPS)
  useEffect(() => {
    if (!navigator.geolocation) {
      setError({
        type: "not-supported",
        message: "Geolocation nicht unterstützt",
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setSensorData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }));
        setIsReady(true);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError({
          type: "location",
          message: `GPS-Fehler: ${err.message}`,
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { sensorData, error, isReady };
};
