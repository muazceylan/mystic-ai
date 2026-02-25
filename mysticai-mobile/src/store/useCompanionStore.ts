import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserProfile } from './useAuthStore';
import { zustandStorage } from '../utils/storage';
import {
  addSavedPerson,
  deleteSavedPerson,
  getSavedPeople,
  updateSavedPerson,
  type SavedPersonRequest,
  type SavedPersonResponse,
  type RelationshipType,
  type PlanetPosition,
  type HousePlacement,
  type PlanetaryAspect,
} from '../services/synastry.service';

export interface SavedPerson {
  kind: 'saved';
  id: number;
  userId: number;
  name: string;
  birthDate: string;
  birthTime: string | null;
  birthLocation: string;
  lat: number;
  lng: number;
  timezone: string | null;
  gender?: string | null;
  relationshipType: RelationshipType | null;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  createdAt: string;
}

export type Profile = UserProfile | SavedPerson;

interface CompanionState {
  savedPeople: SavedPerson[];
  activeProfile: Profile | null;
  selectedForComparison: Profile[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: number | null;

  syncSavedPeople: (userId: number) => Promise<void>;
  initializeForUser: (user: UserProfile | null) => void;
  setActiveProfile: (profile: Profile | null) => void;
  toggleComparisonProfile: (profile: Profile) => void;
  clearComparisonSelection: () => void;
  savePerson: (req: SavedPersonRequest, personId?: number) => Promise<SavedPerson>;
  deletePerson: (personId: number, userId: number) => Promise<void>;
  clearError: () => void;
  clear: () => void;
}

function mapSavedPerson(res: SavedPersonResponse): SavedPerson {
  return {
    kind: 'saved',
    id: res.id,
    userId: res.userId,
    name: res.name,
    birthDate: res.birthDate,
    birthTime: res.birthTime ?? null,
    birthLocation: res.birthLocation,
    lat: res.latitude,
    lng: res.longitude,
    timezone: res.timezone ?? null,
    gender: res.gender ?? null,
    relationshipType: (res.relationshipType ?? res.relationshipCategory) ?? null,
    sunSign: res.sunSign,
    moonSign: res.moonSign,
    risingSign: res.risingSign,
    planets: res.planets ?? [],
    houses: res.houses ?? [],
    aspects: res.aspects ?? [],
    createdAt: res.createdAt,
  };
}

function isSavedProfile(profile: Profile | null): profile is SavedPerson {
  return !!profile && (profile as SavedPerson).kind === 'saved';
}

function profileKey(profile: Profile | null): string | null {
  if (!profile) return null;
  if (isSavedProfile(profile)) return `saved:${profile.id}`;
  return `user:${profile.id ?? 'self'}`;
}

function reconcileProfile(profile: Profile, savedPeople: SavedPerson[], user: UserProfile | null): Profile | null {
  if (isSavedProfile(profile)) {
    return savedPeople.find((p) => p.id === profile.id) ?? user ?? null;
  }
  return user ?? profile;
}

export const useCompanionStore = create<CompanionState>()(
  persist(
    (set) => ({
      savedPeople: [],
      activeProfile: null,
      selectedForComparison: [],
      isLoading: false,
      error: null,
      lastSyncedAt: null,

      syncSavedPeople: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await getSavedPeople(userId);
          const savedPeople = response.data.map(mapSavedPerson);
          set((state) => {
            const activeProfile = state.activeProfile
              ? reconcileProfile(state.activeProfile, savedPeople, null)
              : state.activeProfile;

            const reconciledSelection = state.selectedForComparison
              .map((p) => reconcileProfile(p, savedPeople, null))
              .filter(Boolean) as Profile[];

            return {
              savedPeople,
              isLoading: false,
              error: null,
              lastSyncedAt: Date.now(),
              activeProfile,
              selectedForComparison: reconciledSelection.slice(0, 2),
            };
          });
        } catch (e: any) {
          set({
            isLoading: false,
            error: e?.message ?? 'Kişiler senkronize edilemedi',
          });
        }
      },

      initializeForUser: (user) => {
        set((state) => {
          if (!user) {
            return {
              activeProfile: null,
              selectedForComparison: [],
            };
          }

          const activeProfile = state.activeProfile
            ? reconcileProfile(state.activeProfile, state.savedPeople, user)
            : user;

          const selectedForComparison = state.selectedForComparison
            .map((p) => reconcileProfile(p, state.savedPeople, user))
            .filter(Boolean) as Profile[];

          return { activeProfile, selectedForComparison: selectedForComparison.slice(0, 2) };
        });
      },

      setActiveProfile: (profile) => set({ activeProfile: profile }),

      toggleComparisonProfile: (profile) =>
        set((state) => {
          const nextKey = profileKey(profile);
          if (!nextKey) return {};

          const existing = state.selectedForComparison ? [...state.selectedForComparison] : [];
          const existingKeys = existing.map(profileKey);
          const foundIndex = existingKeys.findIndex((key) => key === nextKey);

          if (foundIndex >= 0) {
            existing.splice(foundIndex, 1);
          } else if (existing.length < 2) {
            existing.push(profile);
          } else {
            existing.shift();
            existing.push(profile);
          }

          return {
            selectedForComparison: existing.slice(0, 2),
          };
        }),

      clearComparisonSelection: () => set({ selectedForComparison: [] }),

      savePerson: async (req, personId) => {
        const response = personId
          ? await updateSavedPerson(personId, req)
          : await addSavedPerson(req);
        const person = mapSavedPerson(response.data);
        set((state) => {
          const hasExisting = state.savedPeople.some((p) => p.id === person.id);
          const savedPeople = personId
            ? (hasExisting
                ? state.savedPeople.map((p) => (p.id === person.id ? person : p))
                : [person, ...state.savedPeople])
            : [person, ...state.savedPeople];

          const activeProfile = isSavedProfile(state.activeProfile) && state.activeProfile.id === person.id
            ? person
            : state.activeProfile;

          const selectedForComparison = state.selectedForComparison
            .map((p) => (isSavedProfile(p) && p.id === person.id ? person : p));

          return { savedPeople, activeProfile, selectedForComparison };
        });
        return person;
      },

      deletePerson: async (personId, userId) => {
        await deleteSavedPerson(personId, userId);
        set((state) => {
          const savedPeople = state.savedPeople.filter((p) => p.id !== personId);

          const activeProfile = isSavedProfile(state.activeProfile) && state.activeProfile.id === personId
            ? null
            : state.activeProfile;

          const selectedForComparison = state.selectedForComparison
            .filter((p) => !(isSavedProfile(p) && p.id === personId));

          return {
            savedPeople,
            activeProfile,
            selectedForComparison,
          };
        });
      },

      clearError: () => set({ error: null }),

      clear: () =>
        set({
          savedPeople: [],
          activeProfile: null,
          selectedForComparison: [],
          isLoading: false,
          error: null,
          lastSyncedAt: null,
        }),
    }),
    {
      name: 'companion-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        savedPeople: state.savedPeople,
        activeProfile: state.activeProfile,
        selectedForComparison: state.selectedForComparison,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

export function isSavedPersonProfile(profile: Profile | null): profile is SavedPerson {
  return isSavedProfile(profile);
}
