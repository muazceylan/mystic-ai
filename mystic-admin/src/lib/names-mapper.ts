import type {
  AdminNameAlias,
  AdminNameCanonicalInfo,
  AdminNameDetail,
  AdminNameListItem,
  AdminNameTag,
  NameGender,
  NameStatus,
  Page,
} from '@/types';

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function asNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
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

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    const parsedYear = asNumber(year, 1970);
    const parsedMonth = asNumber(month, 1);
    const parsedDay = asNumber(day, 1);
    const parsedHour = asNumber(hour, 0);
    const parsedMinute = asNumber(minute, 0);
    const parsedSecond = asNumber(second, 0);
    return new Date(parsedYear, parsedMonth - 1, parsedDay, parsedHour, parsedMinute, parsedSecond).toISOString();
  }
  return '';
}

function mapNameItem(raw: Record<string, unknown>): AdminNameListItem {
  const tagsRaw = raw.tagSummary ?? raw.tag_summary;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((tag) => asString(tag)).filter((tag) => !!tag)
    : [];

  return {
    id: asNumber(raw.id),
    name: asString(raw.name),
    normalizedName: asString(raw.normalizedName ?? raw.normalized_name),
    gender: asGender(raw.gender),
    origin: asNullableString(raw.origin),
    meaningShort: asNullableString(raw.meaningShort ?? raw.meaning_short),
    status: asStatus(raw.status),
    quranFlag: typeof raw.quranFlag === 'boolean'
      ? raw.quranFlag
      : (typeof raw.quran_flag === 'boolean' ? raw.quran_flag : null),
    dataQualityScore: raw.dataQualityScore == null && raw.data_quality_score == null
      ? null
      : asNumber(raw.dataQualityScore ?? raw.data_quality_score),
    tagSummary: tags,
    hasAliases: asBoolean(raw.hasAliases ?? raw.has_aliases),
    aliasCount: asNumber(raw.aliasCount ?? raw.alias_count),
    createdAt: normalizeDate(raw.createdAt ?? raw.created_at),
    updatedAt: normalizeDate(raw.updatedAt ?? raw.updated_at),
  };
}

function mapAlias(raw: Record<string, unknown>): AdminNameAlias {
  return {
    id: asNumber(raw.id),
    canonicalNameId: asNumber(raw.canonicalNameId ?? raw.canonical_name_id),
    canonicalName: asString(raw.canonicalName ?? raw.canonical_name),
    canonicalNormalizedName: asString(raw.canonicalNormalizedName ?? raw.canonical_normalized_name),
    aliasName: asString(raw.aliasName ?? raw.alias_name),
    normalizedAliasName: asString(raw.normalizedAliasName ?? raw.normalized_alias_name),
    aliasType: asString(raw.aliasType ?? raw.alias_type),
    confidence: asNumber(raw.confidence),
    isManual: asBoolean(raw.isManual ?? raw.is_manual),
    createdAt: normalizeDate(raw.createdAt ?? raw.created_at),
    updatedAt: normalizeDate(raw.updatedAt ?? raw.updated_at),
  };
}

function mapTag(raw: Record<string, unknown>): AdminNameTag {
  const sourceRaw = typeof raw.source === 'string' ? raw.source : 'MANUAL';
  const source = (sourceRaw === 'RULE' || sourceRaw === 'AI' || sourceRaw === 'AUTO' || sourceRaw === 'MANUAL')
    ? sourceRaw
    : 'MANUAL';
  const groupRaw = typeof raw.tagGroup === 'string'
    ? raw.tagGroup
    : (typeof raw.tag_group === 'string' ? raw.tag_group : null);
  const group = (groupRaw === 'STYLE'
    || groupRaw === 'VIBE'
    || groupRaw === 'THEME'
    || groupRaw === 'CULTURE'
    || groupRaw === 'RELIGION'
    || groupRaw === 'USAGE')
    ? groupRaw
    : null;

  return {
    id: asNumber(raw.id),
    nameId: asNumber(raw.nameId ?? raw.name_id),
    tagGroup: group,
    tagValue: asString(raw.tagValue ?? raw.tag_value ?? raw.tag),
    normalizedTag: asString(raw.normalizedTag ?? raw.normalized_tag),
    source,
    confidence: asNumber(raw.confidence, 1),
    evidence: asNullableString(raw.evidence),
    enrichmentVersion: raw.enrichmentVersion == null && raw.enrichment_version == null
      ? null
      : asNumber(raw.enrichmentVersion ?? raw.enrichment_version),
    createdAt: normalizeDate(raw.createdAt ?? raw.created_at),
    updatedAt: normalizeDate(raw.updatedAt ?? raw.updated_at),
  };
}

function mapCanonicalInfo(raw: Record<string, unknown>, fallback: { id: number; name: string; normalizedName: string }): AdminNameCanonicalInfo {
  return {
    id: asNumber(raw.id, fallback.id),
    name: asString(raw.name, fallback.name),
    normalizedName: asString(raw.normalizedName ?? raw.normalized_name, fallback.normalizedName),
  };
}

export function mapAdminNamesPage(payload: unknown): Page<AdminNameListItem> {
  const raw = payload as Record<string, unknown>;
  const rawContent = Array.isArray(raw?.content) ? raw.content : [];

  return {
    content: rawContent
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(mapNameItem),
    totalElements: asNumber(raw?.totalElements ?? raw?.total_elements),
    totalPages: asNumber(raw?.totalPages ?? raw?.total_pages),
    number: asNumber(raw?.number),
    size: asNumber(raw?.size),
  };
}

export function mapAdminNameDetail(payload: unknown): AdminNameDetail {
  const raw = payload as Record<string, unknown>;
  const tagsRaw = raw.tagSummary ?? raw.tag_summary;
  const tagSummary = Array.isArray(tagsRaw)
    ? tagsRaw.map((tag) => asString(tag)).filter((tag) => !!tag)
    : [];

  const aliases = Array.isArray(raw.aliases)
    ? raw.aliases
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(mapAlias)
    : [];

  const tags = Array.isArray(raw.tags)
    ? raw.tags
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(mapTag)
    : [];

  const fallbackCanonical = {
    id: asNumber(raw.id),
    name: asString(raw.name),
    normalizedName: asString(raw.normalizedName ?? raw.normalized_name),
  };

  const canonicalInfoRaw = raw.canonicalInfo ?? raw.canonical_info;
  const canonicalInfo = canonicalInfoRaw && typeof canonicalInfoRaw === 'object'
    ? mapCanonicalInfo(canonicalInfoRaw as Record<string, unknown>, fallbackCanonical)
    : fallbackCanonical;

  return {
    id: fallbackCanonical.id,
    name: fallbackCanonical.name,
    normalizedName: fallbackCanonical.normalizedName,
    gender: asGender(raw.gender),
    origin: asNullableString(raw.origin),
    meaningShort: asNullableString(raw.meaningShort ?? raw.meaning_short),
    meaningLong: asNullableString(raw.meaningLong ?? raw.meaning_long),
    characterTraitsText: asNullableString(raw.characterTraitsText ?? raw.character_traits_text),
    letterAnalysisText: asNullableString(raw.letterAnalysisText ?? raw.letter_analysis_text),
    quranFlag: typeof raw.quranFlag === 'boolean'
      ? raw.quranFlag
      : (typeof raw.quran_flag === 'boolean' ? raw.quran_flag : null),
    status: asStatus(raw.status),
    dataQualityScore: raw.dataQualityScore == null && raw.data_quality_score == null
      ? null
      : asNumber(raw.dataQualityScore ?? raw.data_quality_score),
    tagSummary,
    canonicalInfo,
    aliases,
    tags,
    createdAt: normalizeDate(raw.createdAt ?? raw.created_at),
    updatedAt: normalizeDate(raw.updatedAt ?? raw.updated_at),
  };
}
