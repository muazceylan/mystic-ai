import { ZodiacSign, ZodiacSignData } from '../types/horoscope.types';

export const ZODIAC_SIGNS: ZodiacSignData[] = [
  { id: 'aries', emoji: '\u2648', nameTr: 'Koc\u0327', nameEn: 'Aries', dateRange: 'Mar 21 - Apr 19', dateRangeTr: '21 Mar - 19 Nis', element: 'fire', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
  { id: 'taurus', emoji: '\u2649', nameTr: 'Bog\u030Ca', nameEn: 'Taurus', dateRange: 'Apr 20 - May 20', dateRangeTr: '20 Nis - 20 May', element: 'earth', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  { id: 'gemini', emoji: '\u264A', nameTr: '\u0130kizler', nameEn: 'Gemini', dateRange: 'May 21 - Jun 20', dateRangeTr: '21 May - 20 Haz', element: 'air', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
  { id: 'cancer', emoji: '\u264B', nameTr: 'Yengec\u0327', nameEn: 'Cancer', dateRange: 'Jun 21 - Jul 22', dateRangeTr: '21 Haz - 22 Tem', element: 'water', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
  { id: 'leo', emoji: '\u264C', nameTr: 'Aslan', nameEn: 'Leo', dateRange: 'Jul 23 - Aug 22', dateRangeTr: '23 Tem - 22 Ag\u030Cu', element: 'fire', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
  { id: 'virgo', emoji: '\u264D', nameTr: 'Bas\u0327ak', nameEn: 'Virgo', dateRange: 'Aug 23 - Sep 22', dateRangeTr: '23 Ag\u030Cu - 22 Eyl', element: 'earth', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
  { id: 'libra', emoji: '\u264E', nameTr: 'Terazi', nameEn: 'Libra', dateRange: 'Sep 23 - Oct 22', dateRangeTr: '23 Eyl - 22 Eki', element: 'air', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
  { id: 'scorpio', emoji: '\u264F', nameTr: 'Akrep', nameEn: 'Scorpio', dateRange: 'Oct 23 - Nov 21', dateRangeTr: '23 Eki - 21 Kas', element: 'water', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
  { id: 'sagittarius', emoji: '\u2650', nameTr: 'Yay', nameEn: 'Sagittarius', dateRange: 'Nov 22 - Dec 21', dateRangeTr: '22 Kas - 21 Ara', element: 'fire', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
  { id: 'capricorn', emoji: '\u2651', nameTr: 'Og\u030Clak', nameEn: 'Capricorn', dateRange: 'Dec 22 - Jan 19', dateRangeTr: '22 Ara - 19 Oca', element: 'earth', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
  { id: 'aquarius', emoji: '\u2652', nameTr: 'Kova', nameEn: 'Aquarius', dateRange: 'Jan 20 - Feb 18', dateRangeTr: '20 Oca - 18 S\u0327ub', element: 'air', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
  { id: 'pisces', emoji: '\u2653', nameTr: 'Bal\u0131k', nameEn: 'Pisces', dateRange: 'Feb 19 - Mar 20', dateRangeTr: '19 S\u0327ub - 20 Mar', element: 'water', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
];

export const ZODIAC_MAP = new Map<ZodiacSign, ZodiacSignData>(
  ZODIAC_SIGNS.map((s) => [s.id, s]),
);

const ZODIAC_ALIAS_MAP: Record<string, ZodiacSign> = {
  aries: 'aries',
  koc: 'aries',
  taurus: 'taurus',
  boga: 'taurus',
  gemini: 'gemini',
  ikizler: 'gemini',
  cancer: 'cancer',
  yengec: 'cancer',
  leo: 'leo',
  aslan: 'leo',
  virgo: 'virgo',
  basak: 'virgo',
  libra: 'libra',
  terazi: 'libra',
  scorpio: 'scorpio',
  akrep: 'scorpio',
  sagittarius: 'sagittarius',
  yay: 'sagittarius',
  capricorn: 'capricorn',
  oglak: 'capricorn',
  aquarius: 'aquarius',
  kova: 'aquarius',
  pisces: 'pisces',
  balik: 'pisces',
};

function normalizeZodiacToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[♈-♓]/g, ' ')
    .replace(/[^a-z\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveZodiacSign(value: string | null | undefined): ZodiacSign | null {
  if (!value) return null;

  const normalized = normalizeZodiacToken(value);
  if (!normalized) return null;

  const direct = ZODIAC_ALIAS_MAP[normalized];
  if (direct) return direct;

  const compact = normalized.replace(/\s+/g, '');
  if (compact && ZODIAC_ALIAS_MAP[compact]) {
    return ZODIAC_ALIAS_MAP[compact];
  }

  const parts = normalized.split(' ').reverse();
  for (const part of parts) {
    const resolved = ZODIAC_ALIAS_MAP[part];
    if (resolved) return resolved;
  }

  return null;
}

export function getSignFromBirthDate(dateStr: string): ZodiacSign | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const day = d.getDate();

  for (const sign of ZODIAC_SIGNS) {
    if (sign.id === 'capricorn') {
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return sign.id;
    } else {
      if (
        (month === sign.startMonth && day >= sign.startDay) ||
        (month === sign.endMonth && day <= sign.endDay)
      ) {
        return sign.id;
      }
    }
  }
  return null;
}

export function getSignName(sign: ZodiacSign, lang: string): string {
  const data = ZODIAC_MAP.get(sign);
  if (!data) return sign;
  return lang.startsWith('en') ? data.nameEn : data.nameTr;
}

export function getSignEmoji(sign: ZodiacSign): string {
  return ZODIAC_MAP.get(sign)?.emoji ?? '\u2728';
}
