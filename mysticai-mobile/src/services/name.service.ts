import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export type NameGender = 'MALE' | 'FEMALE' | 'UNISEX' | 'UNKNOWN';
export type NameStatus = 'ACTIVE' | 'PENDING_REVIEW' | 'HIDDEN' | 'REJECTED';

export interface NameTag {
  id: number;
  tagGroup: 'STYLE' | 'VIBE' | 'THEME' | 'CULTURE' | 'RELIGION' | 'USAGE' | null;
  tagValue: string;
  source?: 'MANUAL' | 'RULE' | 'AI' | 'AUTO';
  confidence?: number;
}

export interface NameAlias {
  id: number;
  aliasName: string;
  aliasType: string;
}

export interface NameListItem {
  id: number;
  name: string;
  normalizedName: string;
  gender: NameGender | null;
  origin: string | null;
  meaningShort: string | null;
  quranFlag: boolean | null;
  status: NameStatus;
  tags?: NameTag[];
}

export interface NameDetail extends NameListItem {
  meaningLong: string | null;
  characterTraitsText: string | null;
  letterAnalysisText: string | null;
  aliases: NameAlias[];
  tags: NameTag[];
  updatedAt: string;
}

export interface NameSearchParams {
  q?: string;
  gender?: NameGender | '';
  origin?: string;
  quranFlag?: boolean;
  startsWith?: string;
  status?: NameStatus;
  page?: number;
  size?: number;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const NAMES_BASE = '/api/numerology/names';
const FAVORITES_KEY = 'name-module:favorites:v1';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBooleanOrNull(value: unknown): boolean | null {
  if (value === true || value === false) {
    return value;
  }
  return null;
}

function asGender(value: unknown): NameGender | null {
  if (value === 'MALE' || value === 'FEMALE' || value === 'UNISEX' || value === 'UNKNOWN') {
    return value;
  }
  return null;
}

function asStatus(value: unknown): NameStatus {
  if (value === 'ACTIVE' || value === 'PENDING_REVIEW' || value === 'HIDDEN' || value === 'REJECTED') {
    return value;
  }
  return 'ACTIVE';
}

function mapTag(raw: Record<string, unknown>): NameTag {
  const group = raw.tagGroup ?? raw.tag_group;
  const source = raw.source;
  return {
    id: asNumber(raw.id),
    tagGroup:
      group === 'STYLE' || group === 'VIBE' || group === 'THEME' || group === 'CULTURE' || group === 'RELIGION' || group === 'USAGE'
        ? group
        : null,
    tagValue: asString(raw.tagValue ?? raw.tag_value ?? raw.tag),
    source:
      source === 'MANUAL' || source === 'RULE' || source === 'AI' || source === 'AUTO'
        ? source
        : undefined,
    confidence: raw.confidence == null ? undefined : asNumber(raw.confidence),
  };
}

function mapAlias(raw: Record<string, unknown>): NameAlias {
  return {
    id: asNumber(raw.id),
    aliasName: asString(raw.aliasName ?? raw.alias_name),
    aliasType: asString(raw.aliasType ?? raw.alias_type),
  };
}

function mapNameListItem(raw: Record<string, unknown>): NameListItem {
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
  return {
    id: asNumber(raw.id),
    name: asString(raw.name),
    normalizedName: asString(raw.normalizedName ?? raw.normalized_name),
    gender: asGender(raw.gender),
    origin: asNullableString(raw.origin),
    meaningShort: asNullableString(raw.meaningShort ?? raw.meaning_short),
    quranFlag: asBooleanOrNull(raw.quranFlag ?? raw.quran_flag),
    status: asStatus(raw.status),
    tags: tagsRaw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(mapTag),
  };
}

function mapNameDetail(raw: Record<string, unknown>): NameDetail {
  const aliasesRaw = Array.isArray(raw.aliases) ? raw.aliases : [];
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
  return {
    ...mapNameListItem(raw),
    meaningLong: asNullableString(raw.meaningLong ?? raw.meaning_long),
    characterTraitsText: asNullableString(raw.characterTraitsText ?? raw.character_traits_text),
    letterAnalysisText: asNullableString(raw.letterAnalysisText ?? raw.letter_analysis_text),
    aliases: aliasesRaw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(mapAlias),
    tags: tagsRaw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(mapTag),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at),
  };
}

function mapPage<T>(raw: Record<string, unknown>, mapper: (item: Record<string, unknown>) => T): PageResult<T> {
  const content = Array.isArray(raw.content) ? raw.content : [];
  return {
    content: content
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(mapper),
    totalElements: asNumber(raw.totalElements ?? raw.total_elements),
    totalPages: asNumber(raw.totalPages ?? raw.total_pages),
    number: asNumber(raw.number),
    size: asNumber(raw.size),
  };
}

export async function searchNames(params: NameSearchParams): Promise<PageResult<NameListItem>> {
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const normalizedQuery = params.q?.trim();

  const query: Record<string, unknown> = { page, size };

  if (normalizedQuery) query.q = normalizedQuery;
  if (params.gender) query.gender = params.gender;
  if (params.origin?.trim()) query.origin = params.origin.trim();
  if (params.quranFlag !== undefined) query.quranFlag = params.quranFlag;

  const response = await api.get(NAMES_BASE, { params: query });

  const pageResult = mapPage(response.data as Record<string, unknown>, mapNameListItem);
  if (!params.startsWith?.trim()) {
    return pageResult;
  }

  const startsWith = params.startsWith.trim().toLocaleLowerCase('tr-TR');
  return {
    ...pageResult,
    content: pageResult.content.filter((item) =>
      item.name.toLocaleLowerCase('tr-TR').startsWith(startsWith)
    ),
  };
}

export async function getNameDetail(nameId: number): Promise<NameDetail> {
  const response = await api.get(`${NAMES_BASE}/${nameId}`);
  return mapNameDetail(response.data as Record<string, unknown>);
}

export async function getSimilarNames(base: NameDetail, limit = 10): Promise<NameListItem[]> {
  const firstPage = await searchNames({
    status: 'ACTIVE',
    gender: base.gender ?? '',
    origin: base.origin ?? undefined,
    page: 0,
    size: 30,
  });
  return firstPage.content
    .filter((item) => item.id !== base.id)
    .slice(0, limit);
}

export async function listFavoriteNames(): Promise<NameListItem[]> {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(mapNameListItem);
  } catch {
    return [];
  }
}

async function persistFavorites(items: NameListItem[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}

export async function toggleFavoriteName(item: NameListItem): Promise<NameListItem[]> {
  const current = await listFavoriteNames();
  const exists = current.some((entry) => entry.id === item.id);
  const next = exists
    ? current.filter((entry) => entry.id !== item.id)
    : [item, ...current];
  await persistFavorites(next);
  return next;
}

export async function removeFavoriteName(nameId: number): Promise<NameListItem[]> {
  const current = await listFavoriteNames();
  const next = current.filter((entry) => entry.id !== nameId);
  await persistFavorites(next);
  return next;
}
