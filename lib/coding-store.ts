import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SpecialistId =
  | "rex" | "nova" | "sage" | "luma" | "felix"
  | "kai" | "atlas" | "orion" | "pixel" | "vex";

export type ProjectTeam = "coding" | "general" | "research";

export interface ActiveProject {
  id: string;
  name: string;
  description?: string | null;
}

export interface CodingState {
  activeProjects: Record<ProjectTeam, ActiveProject | null>;
  selectedSpecialist: SpecialistId | null;
  setActiveProject: (team: ProjectTeam, id: string, name: string, description?: string | null) => void;
  clearActiveProject: (team: ProjectTeam) => void;
  setSelectedSpecialist: (id: SpecialistId | null) => void;
}

export const useCodingStore = create<CodingState>()(
  persist(
    (set) => ({
      activeProjects: { coding: null, general: null, research: null },
      selectedSpecialist: null,
      setActiveProject: (team, id, name, description) =>
        set((s) => ({
          activeProjects: { ...s.activeProjects, [team]: { id, name, description: description ?? null } },
        })),
      clearActiveProject: (team) =>
        set((s) => ({
          activeProjects: { ...s.activeProjects, [team]: null },
        })),
      setSelectedSpecialist: (id) => set({ selectedSpecialist: id }),
    }),
    {
      name: "coding-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
