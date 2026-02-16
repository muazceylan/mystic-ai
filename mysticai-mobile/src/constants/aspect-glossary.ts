import type { GlossaryEntry } from './astrology-glossary';
import type { AspectType } from '../services/astrology.service';
import { PLANET_TURKISH } from './zodiac';

export const ASPECT_GLOSSARY: Record<AspectType, GlossaryEntry> = {
  CONJUNCTION: {
    term: 'Kavusum',
    shortDesc: 'Birlesim ve yogunlasma',
    longDesc:
      'Kavusum, iki gezegenin ayni derecede bulusmasi demektir. Bu karsilasma, her iki gezegenin enerjisini tek bir noktada yogunlastirir. ' +
      'Kavusumdaki gezegenler birbirinden ayrilamaz hale gelir ve birlikte calisarak guclu bir etki olusturur. ' +
      'Bu aci, hem buyuk bir potansiyel hem de yogun bir enerji konsantrasyonu tasir.',
  },
  OPPOSITION: {
    term: 'Karsit',
    shortDesc: 'Kutuplasma ve denge arayisi',
    longDesc:
      'Karsitlik, iki gezegenin birbirinden 180 derece uzakta olmasi durumudur. Bu aci, hayatinda iki zit guc arasindaki gerilimi temsil eder. ' +
      'Karsit gezegenler seni bir taraftan digerine ceker ve denge bulmani gerektirir. ' +
      'Zorlu gorunse de, bu aci buyuk farkindalik ve olgunluk getirir cunku her iki perspektifi de gormeni saglar.',
  },
  TRINE: {
    term: 'Ucgen',
    shortDesc: 'Uyum ve dogal akis',
    longDesc:
      'Ucgen acisi, iki gezegenin birbirinden 120 derece uzakta olmasi durumudur. Bu, astrolojideki en uyumlu acidir. ' +
      'Ucgendeki gezegenler dogal bir isbirligi icerisindedir ve enerjileri zahmetsizce akar. ' +
      'Bu aci, dogal yeteneklerini ve sans alanlarini gosterir; ancak kolay geldigi icin bazen bu potansiyeli kullanmamak riski de vardir.',
  },
  SQUARE: {
    term: 'Kare',
    shortDesc: 'Gerilim ve buyume motivasyonu',
    longDesc:
      'Kare acisi, iki gezegenin birbirinden 90 derece uzakta olmasi durumudur. Bu aci, ic catisma ve gerilim yaratir. ' +
      'Kare acisindaki gezegenler birbirleriyle surekli bir mucadele halindedir ve seni harekete gecmeye zorlar. ' +
      'Zorlayici olsa da, kare acilari hayattaki en buyuk buyume ve gelisim kaynaklarindan biridir.',
  },
};

// ── Hook Text Helpers ──────────────────────────────────────────────────────

type PlanetPairKey = string;

const SPECIFIC_HOOKS: Record<PlanetPairKey, Record<string, string>> = {
  'Moon-Sun': {
    CONJUNCTION: 'Duygu dünyan ve kimligin tek bir noktada bulusuyor — icin ve disin tamamen uyumlu.',
    OPPOSITION: 'Ic dünyan ve dis dünyan arasinda bir denge oyunu yasiyorsun.',
    TRINE: 'Duyguların ve kimligin dogal bir uyum icerisinde akiyor.',
    SQUARE: 'Hissettiklerin ve gösterdiklerin arasindaki gerilim seni güclendiriyor.',
  },
  'Mars-Venus': {
    CONJUNCTION: 'Ask ve tutku, sende tek bir alev olarak yaniyor.',
    OPPOSITION: 'Arzu ve uyum arasinda surekli bir dans var — bu seni cezbedici kiliyor.',
    TRINE: 'Romantik enerjin ve tutku dogal bir armoniyle akiyor.',
    SQUARE: 'Ask ve irade arasindaki catisma, iliskilerinde buyuk bir dinamizm yaratiyor.',
  },
  'Jupiter-Saturn': {
    CONJUNCTION: 'Genisleme ve sinir, sende dengeli bir hirs olarak birlesiyor.',
    OPPOSITION: 'Özgürlük ve sorumluluk arasinda ruhsal bir denge ariyorsun.',
    TRINE: 'Sans ve disiplin el ele — uzun vadeli basarinin anahtari sende.',
    SQUARE: 'Buyume arzun ve gercekcilik arasindaki gerilim seni olgunlastiriyor.',
  },
  'Mercury-Neptune': {
    CONJUNCTION: 'Zihinsel dünyan ve sezgilerin birleserek yaratici bir vizyon olusturuyor.',
    TRINE: 'Mantiksal düsünce ve sezgisel algi, sende dogal bir uyum icerisinde.',
    SQUARE: 'Hayal gücün bazen gerçekleri bulaniklastirabilir — sezgi ile mantik arasinda denge kur.',
  },
};

const GENERIC_HOOKS: Record<AspectType, string> = {
  CONJUNCTION: 'Bu iki gezegen enerjisi sende güclü bir sekilde birlesip yogunlasiyor.',
  OPPOSITION: 'Bu iki guc arasindaki denge arayisi, sana derin bir farkindalik kazandiriyor.',
  TRINE: 'Bu dogal uyum, senin icin kolay ve akici bir enerji kaynagi olusturuyor.',
  SQUARE: 'Bu gerilim seni surekli gelistiren guclu bir motivasyon kaynagi.',
};

function makePairKey(p1: string, p2: string): PlanetPairKey {
  return [p1, p2].sort().join('-');
}

export function getAspectHookText(
  planet1: string,
  planet2: string,
  type: AspectType,
): string {
  const key = makePairKey(planet1, planet2);
  const specific = SPECIFIC_HOOKS[key]?.[type];
  if (specific) return specific;

  const p1Tr = PLANET_TURKISH[planet1] ?? planet1;
  const p2Tr = PLANET_TURKISH[planet2] ?? planet2;
  return `${p1Tr} ve ${p2Tr}: ${GENERIC_HOOKS[type]}`;
}

export function isHarmoniousAspect(type: AspectType): boolean {
  return type === 'TRINE' || type === 'CONJUNCTION';
}
