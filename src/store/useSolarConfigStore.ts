import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SolarConfigState {
  wPeak: number;
  efficiency: number;
  setWPeak: (value: number) => void;
  setEfficiency: (value: number) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useSolarConfigStore = create<SolarConfigState>()(
  persist(
    (set) => ({
      wPeak: 430,
      efficiency: 85,
      setWPeak: (value) =>
        set({
          wPeak: clamp(Number.isFinite(value) ? value : 0, 10, 50_000),
        }),
      setEfficiency: (value) =>
        set({
          efficiency: clamp(Number.isFinite(value) ? value : 0, 0, 100),
        }),
    }),
    {
      name: "solar-prognose-config",
      partialize: (state) => ({
        wPeak: state.wPeak,
        efficiency: state.efficiency,
      }),
    },
  ),
);
