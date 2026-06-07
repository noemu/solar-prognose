import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SolarPlant {
  id: string;
  name: string;
  tilt: number;
  azimuth: number;
  wPeak: number;
  efficiency: number;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

interface PlantStoreState {
  plants: SolarPlant[];
  addPlant: (plant: Omit<SolarPlant, "id" | "createdAt">) => string;
  updatePlant: (
    id: string,
    updated: Partial<Omit<SolarPlant, "id" | "createdAt">>,
  ) => void;
  deletePlant: (id: string) => void;
}

const createId = () =>
  `plant-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;

export const usePlantStore = create<PlantStoreState>()(
  persist(
    (set, get) => ({
      plants: [],
      addPlant: (plant) => {
        const id = createId();
        const createdAt = new Date().toISOString();
        set({ plants: [...get().plants, { id, createdAt, ...plant }] });
        return id;
      },
      updatePlant: (id, updated) => {
        set({
          plants: get().plants.map((plant) =>
            plant.id === id ? { ...plant, ...updated } : plant,
          ),
        });
      },
      deletePlant: (id) => {
        set({
          plants: get().plants.filter((plant) => plant.id !== id),
        });
      },
    }),
    {
      name: "solar-prognose-plants",
      partialize: (state) => ({ plants: state.plants }),
    },
  ),
);
