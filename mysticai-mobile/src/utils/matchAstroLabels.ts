import type { AspectType } from '../services/astrology.service';
import { ASPECT_TYPE_LABEL_MAP, translateAstroTermsForUi } from '../constants/astroLabelMap';
import { PLANET_TURKISH, ZODIAC_TURKISH } from '../constants/zodiac';

export type ParsedSignLabel = {
  icon: string;
  label: string;
};

const SIGN_NAME_TO_KEY: Record<string, keyof typeof ZODIAC_TURKISH> = {
  aries: 'ARIES',
  koc: 'ARIES',
  taurus: 'TAURUS',
  boga: 'TAURUS',
  gemini: 'GEMINI',
  ikizler: 'GEMINI',
  cancer: 'CANCER',
  yengec: 'CANCER',
  leo: 'LEO',
  aslan: 'LEO',
  virgo: 'VIRGO',
  basak: 'VIRGO',
  libra: 'LIBRA',
  terazi: 'LIBRA',
  scorpio: 'SCORPIO',
  akrep: 'SCORPIO',
  sagittarius: 'SAGITTARIUS',
  yay: 'SAGITTARIUS',
  capricorn: 'CAPRICORN',
  oglak: 'CAPRICORN',
  aquarius: 'AQUARIUS',
  kova: 'AQUARIUS',
  pisces: 'PISCES',
  balik: 'PISCES',
};

const ENGLISH_SIGN_TO_KEY: Record<string, keyof typeof ZODIAC_TURKISH> = {
  Aries: 'ARIES',
  Taurus: 'TAURUS',
  Gemini: 'GEMINI',
  Cancer: 'CANCER',
  Leo: 'LEO',
  Virgo: 'VIRGO',
  Libra: 'LIBRA',
  Scorpio: 'SCORPIO',
  Sagittarius: 'SAGITTARIUS',
  Capricorn: 'CAPRICORN',
  Aquarius: 'AQUARIUS',
  Pisces: 'PISCES',
};

const PLANET_ALIAS_MAP: Record<string, string> = {
  sun: PLANET_TURKISH.Sun,
  moon: PLANET_TURKISH.Moon,
  mercury: PLANET_TURKISH.Mercury,
  venus: PLANET_TURKISH.Venus,
  mars: PLANET_TURKISH.Mars,
  jupiter: PLANET_TURKISH.Jupiter,
  saturn: PLANET_TURKISH.Saturn,
  uranus: PLANET_TURKISH.Uranus,
  neptune: PLANET_TURKISH.Neptune,
  pluto: PLANET_TURKISH.Pluto,
  chiron: PLANET_TURKISH.Chiron,
  northnode: 'Kuzey Düğümü',
  north_node: 'Kuzey Düğümü',
  southnode: 'Güney Düğümü',
  south_node: 'Güney Düğümü',
};

const PLANET_POSSESSIVE_MAP: Record<string, string> = {
  Güneş: 'Güneşi',
  Ay: 'Ayı',
  Merkür: 'Merkürü',
  Venüs: 'Venüsü',
  Mars: 'Marsı',
  Jüpiter: 'Jüpiteri',
  Satürn: 'Satürnü',
  Uranüs: 'Uranüsü',
  Neptün: 'Neptünü',
  Plüton: 'Plütonu',
  Kiron: 'Kironu',
  'Kuzey Düğümü': 'Kuzey Düğümü',
  'Güney Düğümü': 'Güney Düğümü',
};

function normalizeSpaces(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function fold(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u');
}

function replaceAspectTypeTokens(value: string) {
  let output = value;
  (Object.keys(ASPECT_TYPE_LABEL_MAP) as AspectType[]).forEach((key) => {
    output = output.replace(new RegExp(`\\b${key}\\b`, 'gi'), ASPECT_TYPE_LABEL_MAP[key].short);
  });
  return output;
}

function replaceZodiacTokens(value: string) {
  let output = value;
  Object.entries(ENGLISH_SIGN_TO_KEY).forEach(([english, key]) => {
    output = output.replace(new RegExp(`\\b${english}\\b`, 'gi'), ZODIAC_TURKISH[key].name);
  });
  return output;
}

function resolveSignKey(value: string): keyof typeof ZODIAC_TURKISH | null {
  const compact = fold(value).replace(/[^a-z0-9]/g, '');
  if (SIGN_NAME_TO_KEY[compact]) return SIGN_NAME_TO_KEY[compact];

  const tokens = fold(value).split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    if (SIGN_NAME_TO_KEY[token]) {
      return SIGN_NAME_TO_KEY[token];
    }
  }
  return null;
}

function resolvePlanetByToken(value: string): string | null {
  const compact = fold(value).replace(/[^a-z0-9_]/g, '');
  if (PLANET_ALIAS_MAP[compact]) return PLANET_ALIAS_MAP[compact];

  const tokens = fold(value).split(/[^a-z0-9_]+/).filter(Boolean);
  for (const token of tokens) {
    if (PLANET_ALIAS_MAP[token]) return PLANET_ALIAS_MAP[token];
  }
  return null;
}

function isSymbolToken(value: string) {
  return /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(value);
}

function findLastVowel(value: string) {
  const chars = [...value];
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const char = chars[index].toLocaleLowerCase('tr-TR');
    if (/[aeıioöuü]/.test(char)) return char;
  }
  return '';
}

function getPossessiveSuffix(name: string) {
  const normalized = name.trim().toLocaleLowerCase('tr-TR');
  if (!normalized) return 'ın';

  const lastVowel = findLastVowel(normalized);
  const endsWithVowel = /[aeıioöuü]$/i.test(normalized);

  let suffix = 'ın';
  if (/[eéi]/.test(lastVowel)) suffix = 'in';
  else if (/[oou]/.test(lastVowel)) suffix = 'un';
  else if (/[öü]/.test(lastVowel)) suffix = 'ün';

  return endsWithVowel ? `n${suffix}` : suffix;
}

export function localizeAstroText(raw: string | null | undefined, fallback = ''): string {
  const input = normalizeSpaces(String(raw ?? ''));
  if (!input) return fallback;

  let translated = replaceZodiacTokens(replaceAspectTypeTokens(translateAstroTermsForUi(input)));
  translated = translated
    .replace(/\btakdirle\s+dinamikl[ıi]r\b/giu, 'takdir gördüğünde açılır')
    .replace(/\bgüvende\s+olunca\s+dinamikl[ıi]r\b/giu, 'güvende olunca açılır')
    .replace(/\bdinamikl[ıi]r\b/giu, 'açılır');

  return translated || fallback;
}

export function localizeSignName(raw: string | null | undefined, fallback = 'Burç'): string {
  const normalized = normalizeSpaces(String(raw ?? ''));
  if (!normalized) return fallback;

  const resolved = resolveSignKey(normalized) ?? resolveSignKey(localizeAstroText(normalized, fallback));
  if (resolved) return ZODIAC_TURKISH[resolved].name;

  return localizeAstroText(normalized, fallback);
}

export function parseLocalizedSignLabel(value: string | undefined, fallback = 'Burç'): ParsedSignLabel {
  const raw = normalizeSpaces(value ?? '');
  if (!raw) {
    const fallbackKey = resolveSignKey(fallback);
    return {
      icon: fallbackKey ? ZODIAC_TURKISH[fallbackKey].symbol : '✦',
      label: localizeSignName(fallback, fallback),
    };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  const hasPrefixIcon = parts.length > 1 && isSymbolToken(parts[0]);
  const icon = hasPrefixIcon ? parts[0] : '✦';
  const signText = hasPrefixIcon ? parts.slice(1).join(' ') : raw;
  const signKey = resolveSignKey(signText);

  return {
    icon: hasPrefixIcon ? icon : (signKey ? ZODIAC_TURKISH[signKey].symbol : icon),
    label: localizeSignName(signText, fallback),
  };
}

export function localizePlanetName(raw: string | null | undefined, fallback = 'Gezegen'): string {
  const input = normalizeSpaces(String(raw ?? ''));
  if (!input) return fallback;

  const byAlias = resolvePlanetByToken(input);
  if (byAlias) return byAlias;

  return localizeAstroText(input, fallback);
}

export function localizeAspectType(raw: string | null | undefined): string | undefined {
  const input = normalizeSpaces(String(raw ?? ''));
  if (!input) return undefined;

  const directKey = input.toUpperCase().replace(/\s+/g, '_') as AspectType;
  if (ASPECT_TYPE_LABEL_MAP[directKey]) {
    return ASPECT_TYPE_LABEL_MAP[directKey].short;
  }

  return localizeAstroText(input, input);
}

export function localizeAspectName(raw: string | null | undefined, fallback = 'Dinamik'): string {
  const input = normalizeSpaces(String(raw ?? ''));
  if (!input) return fallback;
  return localizeAstroText(input, fallback);
}

export function formatPersonPlanetLabel(personName: string, planetRaw: string): string {
  const name = normalizeSpaces(personName || 'Kişi') || 'Kişi';
  const suffix = getPossessiveSuffix(name);
  const planet = localizePlanetName(planetRaw);
  const possessivePlanet = PLANET_POSSESSIVE_MAP[planet] ?? planet;
  return `${name}’${suffix} ${possessivePlanet}`;
}
