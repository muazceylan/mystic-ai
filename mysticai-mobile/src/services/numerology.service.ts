import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '../store/useAuthStore';
import { envConfig } from '../config/env';
import api from './api';

export type NumerologyGuidancePeriod = 'day' | 'week';
export type NumerologyEmptyVariant = 'none' | 'name_missing' | 'birth_date_missing' | 'both_missing';
export type NumerologyCacheStatus = 'fresh' | 'stale' | 'none';
export type NumerologyPartialSection =
  | 'timing'
  | 'coreNumbers'
  | 'combinedProfile'
  | 'profile'
  | 'miniGuidance'
  | 'shareCardPayload'
  | 'calculationMeta';

export interface NumerologyCoreNumber {
  id: 'lifePath' | 'birthday' | 'destiny' | 'soulUrge' | string;
  value: number;
  title: string;
  archetype: string;
  essence: string;
  gifts: string[];
  watchouts: string[];
  tryThisToday: string;
  isMasterNumber: boolean;
}

export interface NumerologyTiming {
  personalYear: number;
  universalYear: number;
  cycleProgress: number;
  yearPhase: string;
  currentPeriodFocus: string;
  shortTheme: string;
}

export interface NumerologyProfile {
  essence: string;
  strengths: string[];
  growthEdges: string[];
  reflectionPrompt: string;
}

export interface NumerologyCombinedProfile {
  dominantNumberId: string;
  dominantNumber: number;
  dominantEnergy: string;
  innerConflict: string;
  naturalStyle: string;
  decisionStyle: string;
  relationshipStyle: string;
  growthArc: string;
  compatibilityTeaser: string;
}

export interface NumerologyMiniGuidance {
  dailyFocus: string;
  miniGuidance: string;
  reflectionPromptOfTheDay: string;
  validFor: string;
}

export interface NumerologyShareCardPayload {
  name: string;
  mainNumber: number;
  headline: string;
  personalYear: number;
  shortTheme: string;
  payloadVersion: string;
  generatedAt: string;
  brandMark?: string | null;
}

export interface NumerologyCalculationMeta {
  personalYearMethod: string;
  masterNumberPolicy: string;
  normalizationNotes: string[];
  formulaSummary: string[];
}

export interface NumerologySectionLockState {
  freeSections: string[];
  premiumSections: string[];
  previewSections: string[];
}

export interface NumerologyResponse {
  name: string;
  birthDate: string;
  headline: string;
  coreNumbers: NumerologyCoreNumber[];
  timing: NumerologyTiming | null;
  profile: NumerologyProfile | null;
  combinedProfile: NumerologyCombinedProfile | null;
  miniGuidance: NumerologyMiniGuidance | null;
  shareCardPayload: NumerologyShareCardPayload | null;
  calculationMeta: NumerologyCalculationMeta | null;
  sectionLockState: NumerologySectionLockState | null;
  summary: string;
  generatedAt: string;
  version: string;
  contentVersion: string;
  calculationVersion: string;
  locale: string;
  lastCalculatedAt: string;
  annualSnapshotKey: string;
}

export interface FetchNumerologyParams {
  name: string;
  birthDate: string;
  effectiveDate?: string;
  locale?: string;
  guidancePeriod?: NumerologyGuidancePeriod;
}

export interface NumerologyProfileStatus {
  fullName: string;
  birthDate: string;
  hasName: boolean;
  hasBirthDate: boolean;
  emptyVariant: NumerologyEmptyVariant;
  missingFields: Array<'name' | 'birthDate'>;
}

export interface SavedNumerologySnapshot {
  snapshotId: string;
  annualSnapshotKey: string;
  savedAt: string;
  generatedAt: string;
  lastCalculatedAt: string;
  contentVersion: string;
  calculationVersion: string;
  locale: string;
  name: string;
  headline: string;
  personalYear: number | null;
  mainNumber: number | null;
  payload: NumerologyResponse;
}

const NUMEROLOGY_BASE = '/api/numerology';
const NUMEROLOGY_SNAPSHOT_PREFIX = 'numerology:snapshot';

export function normalizeBirthDateInput(value?: string | null): string {
  return (value ?? '').split('T')[0]?.trim() ?? '';
}

export function buildProfileName(
  user?: Pick<UserProfile, 'firstName' | 'lastName' | 'name'> | null,
): string {
  const fullName = [user?.firstName, user?.lastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  if (fullName) {
    return fullName;
  }

  return (user?.name ?? '').trim();
}

export function getNumerologyProfileStatus(
  user?: Pick<UserProfile, 'firstName' | 'lastName' | 'name' | 'birthDate'> | null,
): NumerologyProfileStatus {
  const fullName = buildProfileName(user);
  const birthDate = normalizeBirthDateInput(user?.birthDate);
  const hasName = Boolean(fullName);
  const hasBirthDate = Boolean(birthDate);

  const emptyVariant: NumerologyEmptyVariant = !hasName && !hasBirthDate
    ? 'both_missing'
    : !hasName
      ? 'name_missing'
      : !hasBirthDate
        ? 'birth_date_missing'
        : 'none';

  const missingFields: Array<'name' | 'birthDate'> = [];
  if (!hasName) missingFields.push('name');
  if (!hasBirthDate) missingFields.push('birthDate');

  return {
    fullName,
    birthDate,
    hasName,
    hasBirthDate,
    emptyVariant,
    missingFields,
  };
}

export function normalizeLocale(locale?: string | null): string {
  if (!locale) {
    return 'tr';
  }
  return locale.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

export function normalizeGuidancePeriod(period?: string | null): NumerologyGuidancePeriod {
  if (!period) {
    return 'day';
  }
  return period.toLowerCase().startsWith('week') ? 'week' : 'day';
}

export async function fetchNumerology(params: FetchNumerologyParams): Promise<NumerologyResponse> {
  const query = new URLSearchParams({
    name: params.name,
    birthDate: params.birthDate,
    locale: normalizeLocale(params.locale),
    guidancePeriod: normalizeGuidancePeriod(params.guidancePeriod),
  });

  if (params.effectiveDate) {
    query.set('effectiveDate', params.effectiveDate);
  }

  const res = await api.get<NumerologyResponse>(`${NUMEROLOGY_BASE}/calculate?${query.toString()}`);
  return res.data;
}

export function isPremiumUser(roles?: string[]): boolean {
  return roles?.some((role) => role === 'PREMIUM' || role === 'ROLE_PREMIUM') ?? false;
}

function dedupeSections(...groups: Array<string[] | undefined>): string[] {
  return Array.from(
    new Set(
      groups
        .flatMap((group) => group ?? [])
        .filter(Boolean),
    ),
  );
}

export function getEffectiveSectionLockState(
  lockState: NumerologySectionLockState | null | undefined,
  premium: boolean,
): NumerologySectionLockState {
  const forceUnlockAll = envConfig.features.numerologyForceUnlockAllSections;
  if (forceUnlockAll || premium) {
    const allKnownSections = dedupeSections(
      lockState?.freeSections,
      lockState?.premiumSections,
      lockState?.previewSections,
    );
    return {
      freeSections: allKnownSections,
      premiumSections: [],
      previewSections: [],
    };
  }

  return {
    freeSections: lockState?.freeSections ?? [],
    premiumSections: lockState?.premiumSections ?? [],
    previewSections: lockState?.previewSections ?? [],
  };
}

export function getLockedSections(
  lockState: NumerologySectionLockState | null | undefined,
  premium: boolean,
): string[] {
  return getEffectiveSectionLockState(lockState, premium).premiumSections;
}

export function isLockedSection(
  lockState: NumerologySectionLockState | null | undefined,
  sectionId: string,
  premium: boolean,
): boolean {
  const effective = getEffectiveSectionLockState(lockState, premium);
  return effective.premiumSections.includes(sectionId);
}

export function isPreviewSection(
  lockState: NumerologySectionLockState | null | undefined,
  sectionId: string,
  premium = false,
): boolean {
  const effective = getEffectiveSectionLockState(lockState, premium);
  return effective.previewSections.includes(sectionId);
}

export function findCoreNumber(
  data: NumerologyResponse | null | undefined,
  id: NumerologyCoreNumber['id'],
): NumerologyCoreNumber | null {
  return data?.coreNumbers?.find((item) => item.id === id) ?? null;
}

export function getDominantNumber(
  data: NumerologyResponse | null | undefined,
): number | null {
  return data?.combinedProfile?.dominantNumber
    ?? data?.shareCardPayload?.mainNumber
    ?? findCoreNumber(data, 'lifePath')?.value
    ?? null;
}

export function isNumerologyResponseFresh(
  data: NumerologyResponse | null | undefined,
  effectiveDate: string,
  guidancePeriod: NumerologyGuidancePeriod,
): boolean {
  if (!data) {
    return false;
  }

  if (guidancePeriod === 'week') {
    const generatedDay = data.generatedAt?.slice(0, 10) ?? '';
    return generatedDay === effectiveDate;
  }

  return data.miniGuidance?.validFor === effectiveDate;
}

export function detectPartialSections(data: NumerologyResponse | null | undefined): NumerologyPartialSection[] {
  if (!data) {
    return [];
  }

  const sections: NumerologyPartialSection[] = [];

  if (!data.timing?.shortTheme || !data.timing?.currentPeriodFocus) {
    sections.push('timing');
  }
  if (!data.coreNumbers?.length || data.coreNumbers.length < 4) {
    sections.push('coreNumbers');
  }
  if (!data.combinedProfile?.dominantEnergy || !data.combinedProfile?.naturalStyle) {
    sections.push('combinedProfile');
  }
  if (!data.profile?.essence || !data.profile?.strengths?.length) {
    sections.push('profile');
  }
  if (!data.miniGuidance?.miniGuidance || !data.miniGuidance?.reflectionPromptOfTheDay) {
    sections.push('miniGuidance');
  }
  if (!data.shareCardPayload?.headline || !data.shareCardPayload?.payloadVersion) {
    sections.push('shareCardPayload');
  }
  if (!data.calculationMeta?.formulaSummary?.length || !data.calculationMeta?.normalizationNotes?.length) {
    sections.push('calculationMeta');
  }

  return sections;
}

function buildSnapshotStorageKey(userId: number | string, annualSnapshotKey: string): string {
  return `${NUMEROLOGY_SNAPSHOT_PREFIX}:${String(userId)}:${annualSnapshotKey}`;
}

export interface NumerologySnapshotRepository {
  save(params: {
    userId: number | string;
    response: NumerologyResponse;
  }): Promise<SavedNumerologySnapshot>;
  get(userId: number | string, annualSnapshotKey: string): Promise<SavedNumerologySnapshot | null>;
}

class LocalNumerologySnapshotRepository implements NumerologySnapshotRepository {
  async save(params: {
    userId: number | string;
    response: NumerologyResponse;
  }): Promise<SavedNumerologySnapshot> {
    const snapshotId = buildSnapshotStorageKey(params.userId, params.response.annualSnapshotKey);
    const savedAt = new Date().toISOString();
    const snapshot: SavedNumerologySnapshot = {
      snapshotId,
      annualSnapshotKey: params.response.annualSnapshotKey,
      savedAt,
      generatedAt: params.response.generatedAt,
      lastCalculatedAt: params.response.lastCalculatedAt,
      contentVersion: params.response.contentVersion,
      calculationVersion: params.response.calculationVersion,
      locale: params.response.locale,
      name: params.response.name,
      headline: params.response.headline,
      personalYear: params.response.timing?.personalYear ?? null,
      mainNumber: params.response.shareCardPayload?.mainNumber ?? null,
      payload: params.response,
    };

    await AsyncStorage.setItem(snapshotId, JSON.stringify(snapshot));
    return snapshot;
  }

  async get(
    userId: number | string,
    annualSnapshotKey: string,
  ): Promise<SavedNumerologySnapshot | null> {
    const raw = await AsyncStorage.getItem(buildSnapshotStorageKey(userId, annualSnapshotKey));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SavedNumerologySnapshot;
    } catch {
      return null;
    }
  }
}

class RemoteNumerologySnapshotRepositoryStub implements NumerologySnapshotRepository {
  private readonly localFallback = new LocalNumerologySnapshotRepository();

  async save(params: {
    userId: number | string;
    response: NumerologyResponse;
  }): Promise<SavedNumerologySnapshot> {
    // Remote persistence is intentionally not active yet.
    return this.localFallback.save(params);
  }

  async get(
    userId: number | string,
    annualSnapshotKey: string,
  ): Promise<SavedNumerologySnapshot | null> {
    // Remote persistence is intentionally not active yet.
    return this.localFallback.get(userId, annualSnapshotKey);
  }
}

export function createNumerologySnapshotRepository(mode: 'local' | 'remote' = 'local'): NumerologySnapshotRepository {
  if (mode === 'remote') {
    return new RemoteNumerologySnapshotRepositoryStub();
  }
  return new LocalNumerologySnapshotRepository();
}

const snapshotRepository = createNumerologySnapshotRepository('local');

export async function saveNumerologySnapshot(params: {
  userId: number | string;
  response: NumerologyResponse;
}): Promise<SavedNumerologySnapshot> {
  return snapshotRepository.save(params);
}

export async function getNumerologySnapshot(
  userId: number | string,
  annualSnapshotKey: string,
): Promise<SavedNumerologySnapshot | null> {
  return snapshotRepository.get(userId, annualSnapshotKey);
}
