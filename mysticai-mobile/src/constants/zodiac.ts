export type ElementKey = 'fire' | 'water' | 'earth' | 'air';
export type ModalityKey = 'cardinal' | 'fixed' | 'mutable';

export interface ZodiacInfo {
  name: string;
  symbol: string;
  element: string;
  elementKey: ElementKey;
}

export const ZODIAC_TURKISH: Record<string, ZodiacInfo> = {
  ARIES:       { name: 'Koç',     symbol: '♈', element: 'Ateş',   elementKey: 'fire'  },
  TAURUS:      { name: 'Boğa',    symbol: '♉', element: 'Toprak', elementKey: 'earth' },
  GEMINI:      { name: 'İkizler', symbol: '♊', element: 'Hava',   elementKey: 'air'   },
  CANCER:      { name: 'Yengeç',  symbol: '♋', element: 'Su',     elementKey: 'water' },
  LEO:         { name: 'Aslan',   symbol: '♌', element: 'Ateş',   elementKey: 'fire'  },
  VIRGO:       { name: 'Başak',   symbol: '♍', element: 'Toprak', elementKey: 'earth' },
  LIBRA:       { name: 'Terazi',  symbol: '♎', element: 'Hava',   elementKey: 'air'   },
  SCORPIO:     { name: 'Akrep',   symbol: '♏', element: 'Su',     elementKey: 'water' },
  SAGITTARIUS: { name: 'Yay',     symbol: '♐', element: 'Ateş',   elementKey: 'fire'  },
  CAPRICORN:   { name: 'Oğlak',   symbol: '♑', element: 'Toprak', elementKey: 'earth' },
  AQUARIUS:    { name: 'Kova',    symbol: '♒', element: 'Hava',   elementKey: 'air'   },
  PISCES:      { name: 'Balık',   symbol: '♓', element: 'Su',     elementKey: 'water' },
};

export const ZODIAC_ENGLISH: Record<string, ZodiacInfo> = {
  ARIES:       { name: 'Aries',       symbol: '♈', element: 'Fire',  elementKey: 'fire'  },
  TAURUS:      { name: 'Taurus',      symbol: '♉', element: 'Earth', elementKey: 'earth' },
  GEMINI:      { name: 'Gemini',      symbol: '♊', element: 'Air',   elementKey: 'air'   },
  CANCER:      { name: 'Cancer',      symbol: '♋', element: 'Water', elementKey: 'water' },
  LEO:         { name: 'Leo',         symbol: '♌', element: 'Fire',  elementKey: 'fire'  },
  VIRGO:       { name: 'Virgo',       symbol: '♍', element: 'Earth', elementKey: 'earth' },
  LIBRA:       { name: 'Libra',       symbol: '♎', element: 'Air',   elementKey: 'air'   },
  SCORPIO:     { name: 'Scorpio',     symbol: '♏', element: 'Water', elementKey: 'water' },
  SAGITTARIUS: { name: 'Sagittarius', symbol: '♐', element: 'Fire',  elementKey: 'fire'  },
  CAPRICORN:   { name: 'Capricorn',   symbol: '♑', element: 'Earth', elementKey: 'earth' },
  AQUARIUS:    { name: 'Aquarius',    symbol: '♒', element: 'Air',   elementKey: 'air'   },
  PISCES:      { name: 'Pisces',      symbol: '♓', element: 'Water', elementKey: 'water' },
};

export const SIGN_MODALITY_KEY: Record<string, ModalityKey> = {
  ARIES: 'cardinal', CANCER: 'cardinal', LIBRA: 'cardinal', CAPRICORN: 'cardinal',
  TAURUS: 'fixed', LEO: 'fixed', SCORPIO: 'fixed', AQUARIUS: 'fixed',
  GEMINI: 'mutable', VIRGO: 'mutable', SAGITTARIUS: 'mutable', PISCES: 'mutable',
};

export const PLANET_TURKISH: Record<string, string> = {
  Sun: 'Güneş', Moon: 'Ay', Mercury: 'Merkür', Venus: 'Venüs',
  Mars: 'Mars', Jupiter: 'Jüpiter', Saturn: 'Satürn', Uranus: 'Uranüs',
  Neptune: 'Neptün', Pluto: 'Plüton', Chiron: 'Kiron', NorthNode: 'Kuzey Düğümü',
};

export const PLANET_ENGLISH: Record<string, string> = {
  Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus',
  Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus',
  Neptune: 'Neptune', Pluto: 'Pluto', Chiron: 'Chiron', NorthNode: 'North Node',
};

export const PLANET_DESCRIPTIONS: Record<string, { governs: string; meaning: string }> = {
  Sun:       { governs: 'Kimlik, ego, yaşam amacı',                    meaning: 'Güneş burcun, temel karakterini ve yaşam enerjini temsil eder.' },
  Moon:      { governs: 'Duygular, içgüdüler, bilinçaltı',             meaning: 'Ay burcun, duygusal doğanı ve iç dünyanı yansıtır.' },
  Mercury:   { governs: 'İletişim, düşünce, öğrenme',                  meaning: 'Merkür burcun, düşünce yapını ve iletişim tarzını belirler.' },
  Venus:     { governs: 'Aşk, güzellik, uyum, değerler',               meaning: 'Venüs burcun, ilişkilerindeki uyumu ve estetik zevklerini ortaya koyar.' },
  Mars:      { governs: 'Enerji, tutku, irade, eylem',                 meaning: 'Mars burcun, eylem gücünü ve motivasyonunu temsil eder.' },
  Jupiter:   { governs: 'Büyüme, şans, felsefe, genişleme',            meaning: 'Jüpiter burcun, hayata bakış açını ve şansın kaynağını gösterir.' },
  Saturn:    { governs: 'Disiplin, sorumluluk, karmik dersler',        meaning: 'Satürn burcun, hayatındaki sınırları ve olgunlaşma alanlarını belirler.' },
  Uranus:    { governs: 'Yenilik, özgürlük, devrim',                   meaning: 'Uranüs burcun, bireyselliğini ve alışılmadık yönlerini temsil eder.' },
  Neptune:   { governs: 'Hayal gücü, maneviyat, sezgi',                meaning: 'Neptün burcun, ruhsal derinliğini ve sezgisel yeteneklerini yansıtır.' },
  Pluto:     { governs: 'Dönüşüm, güç, yeniden doğuş',                meaning: 'Plüton burcun, derin dönüşümlerin ve gizli güçlerin kaynağını gösterir.' },
  Chiron:    { governs: 'Yaralı şifacı, şifa, öğretmenlik',           meaning: 'Kiron burcun, en derin yaranı ve başkalarına şifa verme potansiyelini gösterir.' },
  NorthNode: { governs: 'Kader, ruhsal evrim, yaşam dersi',            meaning: 'Kuzey Düğümü burcun, bu yaşamda öğrenmen gereken dersi ve kadersel yönelimini belirler.' },
};

export const PLANET_DESCRIPTIONS_EN: Record<string, { governs: string; meaning: string }> = {
  Sun:       { governs: 'Identity, ego, life purpose',               meaning: 'Your Sun sign represents your core character and life energy.' },
  Moon:      { governs: 'Emotions, instincts, subconscious',         meaning: 'Your Moon sign reflects your emotional nature and inner world.' },
  Mercury:   { governs: 'Communication, thought, learning',          meaning: 'Your Mercury sign shapes your thinking style and communication.' },
  Venus:     { governs: 'Love, beauty, harmony, values',             meaning: 'Your Venus sign reveals harmony in relationships and aesthetic tastes.' },
  Mars:      { governs: 'Energy, passion, will, action',             meaning: 'Your Mars sign represents your drive and motivational force.' },
  Jupiter:   { governs: 'Growth, luck, philosophy, expansion',       meaning: 'Your Jupiter sign shows your worldview and where luck supports you.' },
  Saturn:    { governs: 'Discipline, responsibility, karmic lessons', meaning: 'Your Saturn sign defines boundaries and areas of maturation.' },
  Uranus:    { governs: 'Innovation, freedom, revolution',           meaning: 'Your Uranus sign reflects your individuality and unconventional side.' },
  Neptune:   { governs: 'Imagination, spirituality, intuition',      meaning: 'Your Neptune sign mirrors your spiritual depth and intuitive gifts.' },
  Pluto:     { governs: 'Transformation, power, rebirth',            meaning: 'Your Pluto sign shows the source of deep transformation and hidden powers.' },
  Chiron:    { governs: 'Wounded healer, healing, teaching',         meaning: 'Your Chiron sign reveals your deepest wound and healing potential.' },
  NorthNode: { governs: 'Destiny, spiritual evolution, life lesson', meaning: 'Your North Node sign defines the lesson to learn and karmic direction in this life.' },
};

const UNKNOWN_ZODIAC_TR: ZodiacInfo = { name: 'Bilinmiyor', symbol: '?', element: 'Bilinmiyor', elementKey: 'fire' };
const UNKNOWN_ZODIAC_EN: ZodiacInfo = { name: 'Unknown',    symbol: '?', element: 'Unknown',    elementKey: 'fire' };

export function getZodiacInfo(sign: string | null | undefined, locale?: string): ZodiacInfo {
  if (!sign) return locale?.startsWith('en') ? UNKNOWN_ZODIAC_EN : UNKNOWN_ZODIAC_TR;
  const key = sign.toUpperCase();
  if (locale?.startsWith('en')) return ZODIAC_ENGLISH[key] ?? UNKNOWN_ZODIAC_EN;
  return ZODIAC_TURKISH[key] ?? UNKNOWN_ZODIAC_TR;
}

export function getPlanetName(planet: string, locale?: string): string {
  if (locale?.startsWith('en')) return PLANET_ENGLISH[planet] ?? planet;
  return PLANET_TURKISH[planet] ?? planet;
}

export function getPlanetDescription(planet: string, locale?: string) {
  if (locale?.startsWith('en')) return PLANET_DESCRIPTIONS_EN[planet] ?? null;
  return PLANET_DESCRIPTIONS[planet] ?? null;
}
