import type { AspectType, PlanetaryAspect } from '../services/astrology.service';
import { PLANET_TURKISH, ZODIAC_TURKISH } from './zodiac';

export const ASPECT_TYPE_LABEL_MAP: Record<AspectType, { short: string; rich: string; exact: number }> = {
  CONJUNCTION: { short: 'Kavuşum', rich: 'Kavuşum (Güç Birliği)', exact: 0 },
  SEXTILE: { short: 'Altıgen', rich: 'Altıgen (Fırsat Akışı)', exact: 60 },
  SQUARE: { short: 'Kare', rich: 'Kare (Gelişim Gerilimi)', exact: 90 },
  TRINE: { short: 'Üçgen', rich: 'Üçgen (Doğal Akış)', exact: 120 },
  QUINCUNX: { short: 'Yay Açısı', rich: 'Yay Açısı (Süregelen Uyum)', exact: 150 },
  OPPOSITION: { short: 'Karşıt', rich: 'Karşıt (Denge Dersi)', exact: 180 },
};

export const PLANET_LABEL_MAP: Record<string, string> = {
  ...PLANET_TURKISH,
};

export const SIGN_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ZODIAC_TURKISH).map(([key, value]) => [key, `${value.symbol} ${value.name}`]),
) as Record<string, string>;

const PLANET_ALIASES: Record<string, string> = {
  SUN: 'Güneş',
  MOON: 'Ay',
  MERCURY: 'Merkür',
  VENUS: 'Venüs',
  MARS: 'Mars',
  JUPITER: 'Jüpiter',
  SATURN: 'Satürn',
  URANUS: 'Uranüs',
  NEPTUNE: 'Neptün',
  PLUTO: 'Plüton',
  CHIRON: 'Kiron',
  NORTH_NODE: 'Kuzey Düğümü',
  NORTHNODE: 'Kuzey Düğümü',
  SOUTH_NODE: 'Güney Düğümü',
  ASC: 'Yükselen Burç',
  ASCENDANT: 'Yükselen Burç',
  MIDHEAVEN: 'Tepe Noktası (Kariyer)',
  MC: 'Tepe Noktası (Kariyer)',
};

const SECTION_ID_LABELS: Record<string, string> = {
  core_portrait: 'Kozmik Portrenin Özü',
  inner_conflicts: 'İç Çatışmalar ve Güç Merkezleri',
  natural_gifts: 'Doğal Yetenekler ve Armağanlar',
  planetary_placements: 'Gezegen Yerleşimlerinin Hikâyesi',
  career_purpose: 'Kariyer Potansiyeli ve Yaşam Yönü',
  relationship_dynamics: 'İlişki Dinamikleri',
  karmic_tests: 'Kadersel Sınavlar ve Öğrenimler',
  hidden_talents: 'Gizli Yetenekler ve Derin Kaynaklar',
  spiritual_mission: 'Ruhsal Yön ve Kuzey Düğümü',
};

export function labelPlanet(planetKey: string | null | undefined): string {
  if (!planetKey) return 'Gezegen';
  return PLANET_LABEL_MAP[planetKey] ?? planetKey;
}

export function labelAspectType(type: AspectType | string | null | undefined, rich = false): string {
  if (!type) return 'Açı';
  const meta = ASPECT_TYPE_LABEL_MAP[type as AspectType];
  if (meta) return rich ? meta.rich : meta.short;
  return String(type);
}

export function aspectMeaningFromType(type: AspectType): string {
  switch (type) {
    case 'CONJUNCTION':
      return 'enerjiler birleşiyor';
    case 'SEXTILE':
      return 'işbirliği ve fırsat açılıyor';
    case 'SQUARE':
      return 'gelişim için gerilim üretiyor';
    case 'TRINE':
      return 'enerji doğal akışta';
    case 'QUINCUNX':
      return 'süregelen uyum çabası gerektiriyor';
    case 'OPPOSITION':
      return 'denge kurma dersi çalışıyor';
    default:
      return 'açı etkisi aktif';
  }
}

export function formatAspectAngleHuman(aspect: PlanetaryAspect | { angle: number; orb?: number; type?: AspectType }): string {
  const angle = Number(aspect.angle) || 0;
  const orb = typeof aspect.orb === 'number' ? aspect.orb : undefined;
  const type = aspect.type;
  if (!type || !(type in ASPECT_TYPE_LABEL_MAP)) {
    return `${angle.toFixed(1)}°`;
  }

  const exact = ASPECT_TYPE_LABEL_MAP[type].exact;
  const deviation = Math.abs(angle - exact);
  const closeness =
    deviation <= 0.3 ? 'tam isabet' :
    deviation <= 1.0 ? 'çok yakın' :
    deviation <= 2.0 ? 'yakın' : 'geniş orb';
  const orbText = orb != null ? ` • orb ${orb.toFixed(1)}°` : '';
  return `${labelAspectType(type)}: ${closeness} (${angle.toFixed(1)}°)${orbText}`;
}

export function cleanAstroHeading(raw: string | null | undefined): string {
  const input = (raw ?? '').trim();
  if (!input) return '';

  const idKey = input.toLowerCase();
  if (SECTION_ID_LABELS[idKey]) return SECTION_ID_LABELS[idKey];

  const normalized = input.replace(/\s+/g, '_');
  const aspectMatch = normalized.match(/^([A-Z_]+)_(CONJUNCTION|SEXTILE|SQUARE|TRINE|QUINCUNX|OPPOSITION)_([A-Z_]+)$/i);
  if (aspectMatch) {
    const [, leftRaw, aspectRaw, rightRaw] = aspectMatch;
    const left = PLANET_ALIASES[leftRaw.toUpperCase()] ?? toHumanWords(leftRaw);
    const right = PLANET_ALIASES[rightRaw.toUpperCase()] ?? toHumanWords(rightRaw);
    const aspectLabel = labelAspectType(aspectRaw.toUpperCase(), true);
    return `${left} - ${right} ${aspectLabel}`;
  }

  if (/^[A-Z0-9_]+$/.test(input)) {
    const parts = input.split('_').filter(Boolean);
    const mapped = parts.map((p) => {
      const upper = p.toUpperCase();
      if (PLANET_ALIASES[upper]) return PLANET_ALIASES[upper];
      if (ASPECT_TYPE_LABEL_MAP[upper as AspectType]) return labelAspectType(upper as AspectType, true);
      return toHumanWords(p);
    });
    return mapped.join(' · ');
  }

  return translateAstroTermsForUi(input);
}

const RAW_TERM_TRANSLATIONS: Array<[RegExp, string]> = [
  [/\bAscendant\b/gi, 'Yükselen Burç'],
  [/\bASC\b/g, 'Yükselen Burç'],
  [/\bMidheaven\b/gi, 'Tepe Noktası (Kariyer)'],
  [/\bMC\b/g, 'Tepe Noktası (Kariyer)'],
  [/\bAspect Matrix\b/gi, 'Gezegen Etkileşim Tablosu'],
  [/\bAspects?\b/gi, 'Açı'],
  [/\bInterpretation\b/gi, 'Kozmik Yorum'],
  [/\bHouses?\b/gi, 'Ev Konumu'],
  [/\bNatal Chart\b/gi, 'Doğum Haritası'],
  [/\bConjunction\b/gi, 'Kavuşum'],
  [/\bSextile\b/gi, 'Altıgen Açı'],
  [/\bSquare\b/gi, 'Kare Açı'],
  [/\bTrine\b/gi, 'Üçgen'],
  [/\bOpposition\b/gi, 'Karşıt Açı'],
];

// LLM çıktılarında kalan genel İngilizce anlatım kalıntılarını UI öncesi temizler.
// Amaç tam çeviri yapmak değil; kullanıcıya "yarım İngilizce" metin göstermemek.
const RAW_NARRATIVE_TRANSLATIONS: Array<[RegExp, string]> = [
  [/\bfor example\b/gi, 'örneğin'],
  [/\bon the other hand\b/gi, 'öte yandan'],
  [/\bin other words\b/gi, 'başka bir deyişle'],
  [/\bas a result\b/gi, 'sonuç olarak'],
  [/\bin general\b/gi, 'genel olarak'],
  [/\bhowever\b/gi, 'ancak'],
  [/\btherefore\b/gi, 'bu nedenle'],
  [/\bmoreover\b/gi, 'üstelik'],
  [/\badditionally\b/gi, 'ayrıca'],
  [/\bmeanwhile\b/gi, 'bu sırada'],
  [/\binstead\b/gi, 'yerine'],
  [/\bespecially\b/gi, 'özellikle'],
  [/\bgenerally\b/gi, 'genellikle'],
  [/\bsometimes\b/gi, 'bazen'],
  [/\boften\b/gi, 'sık sık'],
  [/\brarely\b/gi, 'nadiren'],
  [/\busually\b/gi, 'genelde'],
  [/\balso\b/gi, 'ayrıca'],
  [/\bsocially\b/gi, 'sosyal olarak'],
  [/\bemotionally\b/gi, 'duygusal olarak'],
  [/\bsensitive\b/gi, 'hassas'],
  [/\bprotective\b/gi, 'koruyucu'],
  [/\bpersonality\b/gi, 'kişilik'],
  [/\bindicates\b/gi, 'işaret eder'],
  [/\bshows\b/gi, 'gösterir'],
  [/\btends to\b/gi, 'eğilimindedir'],
  [/\bhimself\b/gi, 'kendini'],
  [/\bherself\b/gi, 'kendini'],
  [/\bthemselves\b/gi, 'kendilerini'],
  [/\bbut\b/gi, 'ama'],
  [/\band\b/gi, 've'],
  [/\bor\b/gi, 'veya'],
];

const PLANET_NAME_EN_TR: Record<string, string> = {
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
  Chiron: 'Kiron',
  NorthNode: 'Kuzey Düğümü',
  North_Node: 'Kuzey Düğümü',
  SouthNode: 'Güney Düğümü',
  South_Node: 'Güney Düğümü',
};

const ASPECT_NAME_EN_TR: Record<string, string> = {
  conjunction: 'Kavuşum',
  sextile: 'Altıgen Açı',
  square: 'Kare Açı',
  trine: 'Üçgen',
  opposition: 'Karşıt Açı',
};

export function translateAstroTermsForUi(raw: string | null | undefined): string {
  const input = (raw ?? '').trim();
  if (!input) return '';

  let out = input;

  // "Sun trine Moon" -> "Güneş Üçgen Ay"
  out = out.replace(
    /\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|North(?:[_\s]?Node)|South(?:[_\s]?Node))\b\s+(conjunction|sextile|square|trine|opposition)\s+\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|North(?:[_\s]?Node)|South(?:[_\s]?Node))\b/gi,
    (_, left, aspect, right) => {
      const normalizePlanet = (value: string) =>
        PLANET_NAME_EN_TR[value.replace(/\s+/g, '_').replace(/_/g, '').toLowerCase() === 'northnode' ? 'NorthNode'
          : value.replace(/\s+/g, '_').replace(/_/g, '').toLowerCase() === 'southnode' ? 'SouthNode'
          : (value.charAt(0).toUpperCase() + value.slice(1).toLowerCase())] ?? value;

      const leftTr = normalizePlanet(String(left));
      const rightTr = normalizePlanet(String(right));
      const aspectTr = ASPECT_NAME_EN_TR[String(aspect).toLowerCase()] ?? String(aspect);
      return `${leftTr} ${aspectTr} ${rightTr}`;
    },
  );

  Object.entries(PLANET_NAME_EN_TR).forEach(([en, tr]) => {
    out = out.replace(new RegExp(`\\b${en.replace(/_/g, '[_\\\\s]?')}\\b`, 'gi'), tr);
  });

  RAW_TERM_TRANSLATIONS.forEach(([regex, replacement]) => {
    out = out.replace(regex, replacement);
  });

  // LLM bazen Türkçe iyelik eki ile İngilizce kelimeyi boşluksuz birleştiriyor:
  // "Muaz'insometimes", "Kişi'ninhimself" gibi. Önce boşluk ekleyip sonra çevir.
  out = out.replace(
    /([A-Za-zÇĞİÖŞÜçğıöşü]+(?:['’]?(?:in|ın|un|ün|nin|nın|nun|nün)))(?=(?:sometimes|often|rarely|usually|however|also|socially|emotionally|himself|herself|themselves)\b)/gi,
    '$1 ',
  );

  // Gözlenen bozuk çok dilli tokenlar (cache'lenmiş eski yorumları da kurtarmak için UI tarafında tutulur)
  out = out
    .replace(/\bworldsine\b/gi, 'dünyasına')
    .replace(/\bngu[oồốổỗộơờớởỡợuưồn]*[^\s,.!?;:]*ını\b/gi, 'kaynağını')
    .replace(/\bpoççğimiz\b/gi, 'yaklaşımımızla');

  RAW_NARRATIVE_TRANSLATIONS.forEach(([regex, replacement]) => {
    out = out.replace(regex, replacement);
  });

  return out
    .replace(/\bve and\b/gi, 've')
    .replace(/\bama but\b/gi, 'ama')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\bAçı Matrix\b/gi, 'Gezegen Etkileşim Tablosu')
    .trim();
}

function toHumanWords(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
