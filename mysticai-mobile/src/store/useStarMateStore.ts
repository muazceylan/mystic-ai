import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import {
  createDefaultStarMateFilters,
  createDefaultStarMateProfileDraft,
  seedStarMateBundle,
  scoreLabel,
  type StarMateActionType,
  type StarMateChatMessage,
  type StarMateChatThread,
  type StarMateDiscoveryFilters,
  type StarMateElement,
  type StarMateMatch,
  type StarMateProfile,
  type StarMateProfileDraft,
} from '../services/starMate.service';

export type StarMateSection = 'DISCOVER' | 'MATCHES' | 'PROFILE' | 'SETTINGS';
export type StarMateMatchesTab = 'LIKES_YOU' | 'MATCHES';
export type StarMateProfileTab = 'EDIT' | 'PREVIEW';

interface DeckHistoryEntry {
  profile: StarMateProfile;
  action: StarMateActionType;
  at: string;
  createdMatchId: string | null;
  wasInLikesYou: boolean;
}

interface InitializePayload {
  name?: string | null;
  birthDate?: string | null;
  zodiacSign?: string | null;
  sunSign?: string | null;
  moonSign?: string | null;
  risingSign?: string | null;
}

interface StarMateState {
  initialized: boolean;
  activeSection: StarMateSection;
  matchesTab: StarMateMatchesTab;
  profileTab: StarMateProfileTab;
  filters: StarMateDiscoveryFilters;
  allCandidates: StarMateProfile[];
  deck: StarMateProfile[];
  history: DeckHistoryEntry[];
  likesYou: StarMateProfile[];
  matches: StarMateMatch[];
  chats: Record<string, StarMateChatThread>;
  activeChatMatchId: string | null;
  chatComposer: string;
  insightProfileId: string | null;
  myProfileDraft: StarMateProfileDraft;
  lastSavedAt: string | null;
  showMatchCelebration: boolean;
  lastMatchCelebration: StarMateMatch | null;
  isPremium: boolean;
  likesPreviewUnlocked: boolean;
  profileEditHint: string | null;

  initialize: (payload?: InitializePayload) => void;
  setSection: (section: StarMateSection) => void;
  setMatchesTab: (tab: StarMateMatchesTab) => void;
  setProfileTab: (tab: StarMateProfileTab) => void;
  updateFilters: (patch: Partial<StarMateDiscoveryFilters>) => void;
  actOnTopCard: (action: StarMateActionType) => StarMateMatch | null;
  rewindLastAction: () => void;
  openInsight: (profileId: string | null) => void;
  closeInsight: () => void;
  dismissMatchCelebration: () => void;
  openChat: (matchId: string) => void;
  closeChat: () => void;
  setChatComposer: (value: string) => void;
  sendChatMessage: () => void;
  updateProfileDraft: (patch: Partial<StarMateProfileDraft>) => void;
  updateProfileDetails: (patch: Partial<StarMateProfileDraft['details']>) => void;
  toggleInterestTag: (tag: string) => void;
  toggleCosmicAutoTag: (tag: string) => void;
  setCosmicAutoTags: (tags: string[]) => void;
  cyclePhotoSlot: (index: number) => void;
  removePhotoSlot: (index: number) => void;
  swapPhotoSlots: (sourceIndex: number, targetIndex: number) => void;
  saveProfileDraftLocal: () => void;
  unlockLikesPreview: () => void;
  setPremium: (premium: boolean) => void;
}

function uniqueById(items: StarMateProfile[]): StarMateProfile[] {
  const seen = new Set<string>();
  const out: StarMateProfile[] = [];
  items.forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  });
  return out;
}

function matchesShowMe(profile: StarMateProfile, showMe: StarMateDiscoveryFilters['showMe']) {
  if (showMe === 'EVERYONE') return true;
  if (showMe === 'WOMEN') return profile.gender === 'WOMAN';
  return profile.gender === 'MAN';
}

function passesFilters(profile: StarMateProfile, filters: StarMateDiscoveryFilters): boolean {
  if (!filters.discoveryEnabled) return false;
  if (!profile.discoveryEnabled) return false;
  if (filters.distanceStrict && profile.distanceKm > filters.maxDistanceKm) return false;
  if (filters.ageStrict && (profile.age < filters.ageMin || profile.age > filters.ageMax)) return false;
  if (!matchesShowMe(profile, filters.showMe)) return false;
  if (profile.compatibilityScore < filters.minCompatibilityScore) return false;
  if (filters.elementalPreference !== 'ANY' && profile.element !== filters.elementalPreference) return false;
  return true;
}

function buildDeck(
  allCandidates: StarMateProfile[],
  history: DeckHistoryEntry[],
  filters: StarMateDiscoveryFilters,
): StarMateProfile[] {
  const actionedIds = new Set(history.map((h) => h.profile.id));
  return allCandidates
    .filter((profile) => !actionedIds.has(profile.id))
    .filter((profile) => passesFilters(profile, filters))
    .sort((a, b) => {
      if (b.compatibilityScore !== a.compatibilityScore) return b.compatibilityScore - a.compatibilityScore;
      return a.distanceKm - b.distanceKm;
    });
}

function formatMatchIcebreaker(profile: StarMateProfile): string {
  const label = scoreLabel(profile.compatibilityScore);
  if (label === 'HIGH') {
    return 'Venus-Mars uyumu yuksek. Flortoz ama samimi bir soru ile baslamak iyi calisir.';
  }
  if (label === 'MEDIUM') {
    return 'Mercury ritmini yakalamak icin ortak ilgi alanlarindan giris yap.';
  }
  return 'Yuksek merak, dusuk beklenti. Kisa ve net bir selamlasma en dogrusu.';
}

function createMatchFromProfile(profile: StarMateProfile, action: StarMateActionType): StarMateMatch {
  const now = new Date().toISOString();
  return {
    id: `match-${profile.id}`,
    profileId: profile.id,
    displayName: profile.displayName,
    age: profile.age,
    photoUri: profile.photos[0]?.uri ?? null,
    sunSign: profile.sunSign,
    sunSymbol: profile.sunSymbol,
    compatibilityScore: profile.compatibilityScore,
    matchedAt: now,
    superLikeByMe: action === 'SUPERLIKE',
    unreadCount: 0,
    lastMessage: 'Yildizlariniz uyumlu gorunuyor ✨',
    lastMessageAt: now,
    icebreaker: formatMatchIcebreaker(profile),
  };
}

function createChatThread(match: StarMateMatch): StarMateChatThread {
  return {
    matchId: match.id,
    typing: false,
    messages: [
      {
        id: `${match.id}-system`,
        role: 'system',
        text: `Cosmic Icebreaker: ${match.icebreaker}`,
        sentAt: match.matchedAt,
      },
    ],
  };
}

function createMessage(role: StarMateChatMessage['role'], text: string): StarMateChatMessage {
  const now = new Date();
  return {
    id: `msg-${now.getTime()}-${Math.floor(Math.random() * 10000)}`,
    role,
    text,
    sentAt: now.toISOString(),
  };
}

const PHOTO_POOL = [
  'https://picsum.photos/seed/starmate-self-01/900/1200',
  'https://picsum.photos/seed/starmate-self-02/900/1200',
  'https://picsum.photos/seed/starmate-self-03/900/1200',
  'https://picsum.photos/seed/starmate-self-04/900/1200',
  'https://picsum.photos/seed/starmate-self-05/900/1200',
  'https://picsum.photos/seed/starmate-self-06/900/1200',
];

function rollbackMatch(state: StarMateState, historyEntry: DeckHistoryEntry): Pick<StarMateState, 'matches' | 'chats' | 'likesYou' | 'lastMatchCelebration' | 'showMatchCelebration'> {
  let matches = state.matches;
  let chats = state.chats;
  let likesYou = state.likesYou;

  if (historyEntry.createdMatchId) {
    matches = state.matches.filter((match) => match.id !== historyEntry.createdMatchId);
    chats = { ...state.chats };
    delete chats[historyEntry.createdMatchId];
  }

  if (historyEntry.wasInLikesYou) {
    likesYou = uniqueById([historyEntry.profile, ...likesYou]);
  }

  return {
    matches,
    chats,
    likesYou,
    lastMatchCelebration: null,
    showMatchCelebration: false,
  };
}

export const useStarMateStore = create<StarMateState>()(
  persist(
    (set, get) => ({
      initialized: false,
      activeSection: 'DISCOVER',
      matchesTab: 'MATCHES',
      profileTab: 'EDIT',
      filters: createDefaultStarMateFilters(),
      allCandidates: [],
      deck: [],
      history: [],
      likesYou: [],
      matches: [],
      chats: {},
      activeChatMatchId: null,
      chatComposer: '',
      insightProfileId: null,
      myProfileDraft: createDefaultStarMateProfileDraft(),
      lastSavedAt: null,
      showMatchCelebration: false,
      lastMatchCelebration: null,
      isPremium: false,
      likesPreviewUnlocked: false,
      profileEditHint: null,

      initialize: (payload) => {
        set((state) => {
          if (state.initialized) {
            if (!payload) return state;
            const refreshedDraft = createDefaultStarMateProfileDraft(payload);
            const nextDraft: StarMateProfileDraft = {
              ...state.myProfileDraft,
              displayName: state.myProfileDraft.displayName || refreshedDraft.displayName,
              age: state.myProfileDraft.age || refreshedDraft.age,
              sunSign: refreshedDraft.sunSign,
              sunSymbol: refreshedDraft.sunSymbol,
              element: refreshedDraft.element,
              cosmicAutoTags: state.myProfileDraft.cosmicAutoTags.length
                ? state.myProfileDraft.cosmicAutoTags
                : refreshedDraft.cosmicAutoTags,
            };
            return {
              ...state,
              myProfileDraft: nextDraft,
            };
          }

          const seeded = seedStarMateBundle();
          const filters = state.filters ?? createDefaultStarMateFilters();
          const myProfileDraft = createDefaultStarMateProfileDraft(payload);
          const seededMatchProfileIds = new Set(seeded.seededMatches.map((match) => match.profileId));
          const allCandidates = seeded.allCandidates.filter((profile) => !seededMatchProfileIds.has(profile.id));
          const likesYou = seeded.likesYou.filter((profile) => !seededMatchProfileIds.has(profile.id));
          const deck = buildDeck(allCandidates, [], filters);

          return {
            ...state,
            initialized: true,
            allCandidates,
            likesYou,
            matches: seeded.seededMatches.sort((a, b) => b.matchedAt.localeCompare(a.matchedAt)),
            chats: seeded.seededChats,
            myProfileDraft,
            deck,
            activeSection: 'DISCOVER',
          };
        });
      },

      setSection: (section) => set({ activeSection: section }),
      setMatchesTab: (tab) => set({ matchesTab: tab }),
      setProfileTab: (tab) => set({ profileTab: tab }),

      updateFilters: (patch) =>
        set((state) => {
          const filters = {
            ...state.filters,
            ...patch,
          };
          if (filters.ageMin > filters.ageMax) {
            const tmp = filters.ageMin;
            filters.ageMin = filters.ageMax;
            filters.ageMax = tmp;
          }
          const deck = buildDeck(state.allCandidates, state.history, filters);
          return { filters, deck };
        }),

      actOnTopCard: (action) => {
        const state = get();
        const topCard = state.deck[0];
        if (!topCard) return null;

        const now = new Date().toISOString();
        const likesYouHadProfile = state.likesYou.some((p) => p.id === topCard.id);
        let createdMatch: StarMateMatch | null = null;
        let newlyCreatedMatch: StarMateMatch | null = null;

        if ((action === 'LIKE' || action === 'SUPERLIKE') && topCard.likesViewer) {
          const existing = state.matches.find((m) => m.profileId === topCard.id);
          if (existing) {
            createdMatch = existing;
          } else {
            newlyCreatedMatch = createMatchFromProfile(topCard, action);
            createdMatch = newlyCreatedMatch;
          }
        }

        const historyEntry: DeckHistoryEntry = {
          profile: topCard,
          action,
          at: now,
          createdMatchId: newlyCreatedMatch ? newlyCreatedMatch.id : null,
          wasInLikesYou: likesYouHadProfile,
        };

        set((current) => {
          const history = [...current.history, historyEntry];
          const likesYou = current.likesYou.filter((p) => p.id !== topCard.id);

          let matches = current.matches;
          let chats = current.chats;
          let showMatchCelebration = false;
          let lastMatchCelebration = current.lastMatchCelebration;

          if (createdMatch) {
            const exists = current.matches.some((m) => m.id === createdMatch?.id);
            matches = exists
              ? current.matches.map((m) => (m.id === createdMatch.id ? { ...m, superLikeByMe: m.superLikeByMe || action === 'SUPERLIKE' } : m))
              : [createdMatch, ...current.matches].sort((a, b) => b.matchedAt.localeCompare(a.matchedAt));

            if (!current.chats[createdMatch.id]) {
              chats = {
                ...current.chats,
                [createdMatch.id]: createChatThread(createdMatch),
              };
            }

            if (newlyCreatedMatch) {
              showMatchCelebration = true;
              lastMatchCelebration = createdMatch;
            }
          }

          const deck = buildDeck(current.allCandidates, history, current.filters);

          return {
            history,
            likesYou,
            matches,
            chats,
            deck,
            showMatchCelebration,
            lastMatchCelebration,
          };
        });

        return createdMatch;
      },

      rewindLastAction: () =>
        set((state) => {
          const history = [...state.history];
          const last = history.pop();
          if (!last) return state;

          const rollback = rollbackMatch(state, last);
          const deck = buildDeck(state.allCandidates, history, state.filters);

          return {
            history,
            deck,
            ...rollback,
          };
        }),

      openInsight: (profileId) => set({ insightProfileId: profileId }),
      closeInsight: () => set({ insightProfileId: null }),
      dismissMatchCelebration: () => set({ showMatchCelebration: false, lastMatchCelebration: null }),

      openChat: (matchId) => set({ activeChatMatchId: matchId, activeSection: 'MATCHES', matchesTab: 'MATCHES' }),
      closeChat: () => set({ activeChatMatchId: null, chatComposer: '' }),
      setChatComposer: (value) => set({ chatComposer: value }),

      sendChatMessage: () =>
        set((state) => {
          const text = state.chatComposer.trim();
          const activeMatchId = state.activeChatMatchId;
          if (!text || !activeMatchId) return state;

          const thread = state.chats[activeMatchId] ?? { matchId: activeMatchId, messages: [], typing: false };
          const selfMessage = createMessage('self', text);
          const autoReply = createMessage('other', 'Bu enerji hosuma gitti ✨ Biraz daha anlatir misin?');
          const messages = [...thread.messages, selfMessage, autoReply];

          const chats = {
            ...state.chats,
            [activeMatchId]: {
              ...thread,
              typing: false,
              messages,
            },
          };

          const matches = state.matches.map((match) =>
            match.id === activeMatchId
              ? {
                  ...match,
                  lastMessage: autoReply.text,
                  lastMessageAt: autoReply.sentAt,
                  unreadCount: 0,
                }
              : match,
          );

          return {
            chats,
            matches,
            chatComposer: '',
          };
        }),

      updateProfileDraft: (patch) =>
        set((state) => ({
          myProfileDraft: {
            ...state.myProfileDraft,
            ...patch,
          },
          profileEditHint: null,
        })),

      updateProfileDetails: (patch) =>
        set((state) => ({
          myProfileDraft: {
            ...state.myProfileDraft,
            details: {
              ...state.myProfileDraft.details,
              ...patch,
            },
          },
          profileEditHint: null,
        })),

      toggleInterestTag: (tag) =>
        set((state) => {
          const exists = state.myProfileDraft.tags.includes(tag);
          const nextTags = exists
            ? state.myProfileDraft.tags.filter((item) => item !== tag)
            : [...state.myProfileDraft.tags, tag].slice(0, 10);
          return {
            myProfileDraft: {
              ...state.myProfileDraft,
              tags: nextTags,
            },
            profileEditHint: exists ? null : 'Etiket eklendi',
          };
        }),

      toggleCosmicAutoTag: (tag) =>
        set((state) => {
          const exists = state.myProfileDraft.cosmicAutoTags.includes(tag);
          const next = exists
            ? state.myProfileDraft.cosmicAutoTags.filter((item) => item !== tag)
            : [...state.myProfileDraft.cosmicAutoTags, tag].slice(0, 5);
          return {
            myProfileDraft: {
              ...state.myProfileDraft,
              cosmicAutoTags: next,
            },
          };
        }),

      setCosmicAutoTags: (tags) =>
        set((state) => ({
          myProfileDraft: {
            ...state.myProfileDraft,
            cosmicAutoTags: Array.from(new Set(tags)).slice(0, 5),
          },
        })),

      cyclePhotoSlot: (index) =>
        set((state) => {
          if (index < 0 || index >= state.myProfileDraft.photos.length) return state;
          const photos = [...state.myProfileDraft.photos];
          const current = photos[index];
          const currentPoolIndex = current ? PHOTO_POOL.indexOf(current) : -1;
          const nextPoolIndex = currentPoolIndex >= 0 ? (currentPoolIndex + 1) % PHOTO_POOL.length : index % PHOTO_POOL.length;
          photos[index] = PHOTO_POOL[nextPoolIndex];
          return {
            myProfileDraft: {
              ...state.myProfileDraft,
              photos,
            },
            profileEditHint: 'Foto slot guncellendi',
          };
        }),

      removePhotoSlot: (index) =>
        set((state) => {
          if (index < 0 || index >= state.myProfileDraft.photos.length) return state;
          const photos = [...state.myProfileDraft.photos];
          photos[index] = null;
          return {
            myProfileDraft: {
              ...state.myProfileDraft,
              photos,
            },
            profileEditHint: 'Foto kaldirildi',
          };
        }),

      swapPhotoSlots: (sourceIndex, targetIndex) =>
        set((state) => {
          const len = state.myProfileDraft.photos.length;
          if (sourceIndex < 0 || targetIndex < 0 || sourceIndex >= len || targetIndex >= len || sourceIndex === targetIndex) {
            return state;
          }
          const photos = [...state.myProfileDraft.photos];
          const temp = photos[sourceIndex];
          photos[sourceIndex] = photos[targetIndex];
          photos[targetIndex] = temp;
          return {
            myProfileDraft: {
              ...state.myProfileDraft,
              photos,
            },
            profileEditHint: 'Foto sirasi degisti',
          };
        }),

      saveProfileDraftLocal: () =>
        set(() => ({
          lastSavedAt: new Date().toISOString(),
          profileEditHint: 'Profil taslagi kaydedildi',
        })),

      unlockLikesPreview: () => set({ likesPreviewUnlocked: true, isPremium: true }),
      setPremium: (premium) => set({ isPremium: premium, likesPreviewUnlocked: premium }),
    }),
    {
      name: 'star-mate-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        initialized: state.initialized,
        activeSection: state.activeSection,
        matchesTab: state.matchesTab,
        profileTab: state.profileTab,
        filters: state.filters,
        allCandidates: state.allCandidates,
        deck: state.deck,
        history: state.history,
        likesYou: state.likesYou,
        matches: state.matches,
        chats: state.chats,
        myProfileDraft: state.myProfileDraft,
        lastSavedAt: state.lastSavedAt,
        isPremium: state.isPremium,
        likesPreviewUnlocked: state.likesPreviewUnlocked,
      }),
    },
  ),
);
