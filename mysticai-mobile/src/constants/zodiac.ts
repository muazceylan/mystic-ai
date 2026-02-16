export interface ZodiacInfo {
  name: string;
  symbol: string;
  element: string;
}

export const ZODIAC_TURKISH: Record<string, ZodiacInfo> = {
  ARIES: { name: 'Koç', symbol: '♈', element: 'Ateş' },
  TAURUS: { name: 'Boğa', symbol: '♉', element: 'Toprak' },
  GEMINI: { name: 'İkizler', symbol: '♊', element: 'Hava' },
  CANCER: { name: 'Yengeç', symbol: '♋', element: 'Su' },
  LEO: { name: 'Aslan', symbol: '♌', element: 'Ateş' },
  VIRGO: { name: 'Başak', symbol: '♍', element: 'Toprak' },
  LIBRA: { name: 'Terazi', symbol: '♎', element: 'Hava' },
  SCORPIO: { name: 'Akrep', symbol: '♏', element: 'Su' },
  SAGITTARIUS: { name: 'Yay', symbol: '♐', element: 'Ateş' },
  CAPRICORN: { name: 'Oğlak', symbol: '♑', element: 'Toprak' },
  AQUARIUS: { name: 'Kova', symbol: '♒', element: 'Hava' },
  PISCES: { name: 'Balık', symbol: '♓', element: 'Su' },
};

export const PLANET_TURKISH: Record<string, string> = {
  Sun: 'Güneş',
  Moon: 'Ay',
  Mercury: 'Merkür',
  Venus: 'Venüs',
  Mars: 'Mars',
  Jupiter: 'Jüpiter',
  Saturn: 'Satürn',
  Uranus: 'Uranüs',
  Neptune: 'Neptün',
  Pluto: 'Plüton',
};

export const PLANET_DESCRIPTIONS: Record<string, { governs: string; meaning: string }> = {
  Sun: {
    governs: 'Kimlik, ego, yaşam amacı',
    meaning: 'Güneş burcun, temel karakterini ve yaşam enerjini temsil eder.',
  },
  Moon: {
    governs: 'Duygular, içgüdüler, bilinçaltı',
    meaning: 'Ay burcun, duygusal doğanı ve iç dünyanı yansıtır.',
  },
  Mercury: {
    governs: 'İletişim, düşünce, öğrenme',
    meaning: 'Merkür burcun, düşünce yapını ve iletişim tarzını belirler.',
  },
  Venus: {
    governs: 'Aşk, güzellik, uyum, değerler',
    meaning: 'Venüs burcun, ilişkilerindeki uyumu ve estetik zevklerini ortaya koyar.',
  },
  Mars: {
    governs: 'Enerji, tutku, irade, eylem',
    meaning: 'Mars burcun, eylem gücünü ve motivasyonunu temsil eder.',
  },
  Jupiter: {
    governs: 'Büyüme, şans, felsefe, genişleme',
    meaning: 'Jüpiter burcun, hayata bakış açını ve şansın kaynağını gösterir.',
  },
  Saturn: {
    governs: 'Disiplin, sorumluluk, karmik dersler',
    meaning: 'Satürn burcun, hayatındaki sınırları ve olgunlaşma alanlarını belirler.',
  },
  Uranus: {
    governs: 'Yenilik, özgürlük, devrim',
    meaning: 'Uranüs burcun, bireyselliğini ve alışılmadık yönlerini temsil eder.',
  },
  Neptune: {
    governs: 'Hayal gücü, maneviyat, sezgi',
    meaning: 'Neptün burcun, ruhsal derinliğini ve sezgisel yeteneklerini yansıtır.',
  },
  Pluto: {
    governs: 'Dönüşüm, güç, yeniden doğuş',
    meaning: 'Plüton burcun, derin dönüşümlerin ve gizli güçlerin kaynağını gösterir.',
  },
};

const UNKNOWN_ZODIAC: ZodiacInfo = { name: 'Bilinmiyor', symbol: '?', element: 'Bilinmiyor' };

export function getZodiacInfo(sign: string | null | undefined): ZodiacInfo {
  if (!sign) return UNKNOWN_ZODIAC;
  return ZODIAC_TURKISH[sign.toUpperCase()] ?? UNKNOWN_ZODIAC;
}
