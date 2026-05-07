import type { GlossaryEntry } from './astrology-glossary';
import type { AspectType } from '../services/astrology.service';
import { getPlanetName } from './zodiac';

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
  SEXTILE: {
    term: 'Altigen',
    shortDesc: 'Firsat ve isbirligi',
    longDesc:
      'Altigen acisi, iki gezegenin birbirinden 60 derece uzakta olmasi durumudur. Bu aci, firsatlar ve olumlu isbirlikleri temsil eder. ' +
      'Ucgen kadar zahmetsiz olmasa da, biraz caba ile harika sonuclar dogurabilen bir enerji tasir. ' +
      'Altigen acisi, hayatinda yeni kapilar acan ve sosyal baglantilari guclendiren uyumlu bir acidir.',
  },
  QUINCUNX: {
    term: 'Quincunx',
    shortDesc: 'Uyumsuz ayar ve ince dengeleme',
    longDesc:
      'Quincunx acisi, iki gezegenin birbirinden 150 derece uzakta olmasi durumudur. Bu aci ilk bakista net bir uyum vermez; bunun yerine seni ayar yapmaya, ince denge kurmaya ve farkli ritimleri uzlastirmaya davet eder. ' +
      'Quincunx etkisi, hayatinda tam olarak adini koyamadigin huzursuzluklari fark etmeni ve daha rafine secimler yapmani saglar.',
  },
};

export const ASPECT_GLOSSARY_EN: Record<AspectType, GlossaryEntry> = {
  CONJUNCTION: {
    term: 'Conjunction',
    shortDesc: 'Union and concentration',
    longDesc:
      'A conjunction means two planets meeting at the same degree. This encounter concentrates both planetary energies into a single point. ' +
      'Planets in conjunction become difficult to separate and work together to create a strong effect. ' +
      'This aspect carries both great potential and a very focused energetic intensity.',
  },
  OPPOSITION: {
    term: 'Opposition',
    shortDesc: 'Polarity and balance seeking',
    longDesc:
      'An opposition occurs when two planets stand 180 degrees apart. This aspect represents tension between two opposite forces in your life. ' +
      'Opposing planets pull you from one side to the other and ask you to find balance. ' +
      'Even when challenging, this aspect brings strong awareness and maturity because it helps you see both perspectives.',
  },
  TRINE: {
    term: 'Trine',
    shortDesc: 'Harmony and natural flow',
    longDesc:
      'A trine occurs when two planets are 120 degrees apart. In astrology this is one of the most harmonious aspects. ' +
      'Planets in trine cooperate naturally and their energies flow with ease. ' +
      'This aspect points to natural talent and supportive openings, though its ease can sometimes make the potential easy to overlook.',
  },
  SQUARE: {
    term: 'Square',
    shortDesc: 'Tension and growth motivation',
    longDesc:
      'A square occurs when two planets are 90 degrees apart. This aspect creates inner friction and productive tension. ' +
      'Planets in square remain in active struggle with one another and push you toward movement. ' +
      'While demanding, squares can become some of the strongest sources of growth and development in life.',
  },
  SEXTILE: {
    term: 'Sextile',
    shortDesc: 'Opportunity and cooperation',
    longDesc:
      'A sextile occurs when two planets are 60 degrees apart. This aspect represents openings, support, and constructive collaboration. ' +
      'It may not be as effortless as a trine, but with a little conscious participation it can produce very rewarding results. ' +
      'A sextile often supports new doors opening and smoother relational exchange.',
  },
  QUINCUNX: {
    term: 'Quincunx',
    shortDesc: 'Awkward adjustment and fine-tuning',
    longDesc:
      'A quincunx occurs when two planets are 150 degrees apart. At first glance it does not offer a simple harmony; instead it invites adjustment, refinement, and subtle recalibration. ' +
      'Its influence can help you notice hard-to-name discomforts and make more nuanced choices over time.',
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
  SEXTILE: 'Bu firsat acisi, biraz cabayla harika sonuclar doguracak bir enerji tasiyor.',
  QUINCUNX: 'Bu aci ince ayar ister; farkli ihtiyaclari uyumlu hale getirdikce buyuk fark yaratilabilir.',
};

const SPECIFIC_HOOKS_EN: Record<PlanetPairKey, Record<string, string>> = {
  'Moon-Sun': {
    CONJUNCTION: 'Your emotional world and identity meet in one place, creating a strong inner and outer alignment.',
    OPPOSITION: 'You may live through an ongoing balancing act between your inner world and outer expression.',
    TRINE: 'Your emotions and identity tend to flow together with natural ease.',
    SQUARE: 'The friction between what you feel and what you show can become a powerful growth engine.',
  },
  'Mars-Venus': {
    CONJUNCTION: 'Love and desire merge into one vivid flame in your system.',
    OPPOSITION: 'There is a constant dance between desire and harmony, which can make you especially magnetic.',
    TRINE: 'Your romantic energy and passion tend to move together in natural harmony.',
    SQUARE: 'The tension between affection and willpower creates strong relational dynamism.',
  },
  'Jupiter-Saturn': {
    CONJUNCTION: 'Expansion and structure combine as a balanced ambition within you.',
    OPPOSITION: 'You may be learning how to balance freedom with responsibility at a deep level.',
    TRINE: 'Luck and discipline work together here, supporting long-range success.',
    SQUARE: 'The pull between growth and realism becomes a force that matures you over time.',
  },
  'Mercury-Neptune': {
    CONJUNCTION: 'Mind and intuition join together to form a creative inner vision.',
    TRINE: 'Logical thinking and intuitive perception cooperate with unusual ease here.',
    SQUARE: 'Imagination can sometimes blur facts, so balance between intuition and clarity matters.',
  },
};

const GENERIC_HOOKS_EN: Record<AspectType, string> = {
  CONJUNCTION: 'These two planetary energies unite and intensify strongly within you.',
  OPPOSITION: 'Seeking balance between these two forces can deepen your awareness.',
  TRINE: 'This natural harmony becomes an easy-flowing source of support in your chart.',
  SQUARE: 'This tension can act as a powerful motivation for growth and movement.',
  SEXTILE: 'This opportunity aspect carries supportive energy that responds well to conscious effort.',
  QUINCUNX: 'This aspect asks for fine-tuning; integrating different needs can make a meaningful difference.',
};

function makePairKey(p1: string, p2: string): PlanetPairKey {
  return [p1, p2].sort().join('-');
}

export function getAspectHookText(
  planet1: string,
  planet2: string,
  type: AspectType,
  locale?: string,
): string {
  const isEnglish = locale?.toLowerCase().startsWith('en');
  const key = makePairKey(planet1, planet2);
  const specific = (isEnglish ? SPECIFIC_HOOKS_EN : SPECIFIC_HOOKS)[key]?.[type];
  if (specific) return specific;

  const p1Name = getPlanetName(planet1, locale);
  const p2Name = getPlanetName(planet2, locale);
  const joiner = isEnglish ? 'and' : 've';
  const generic = isEnglish ? GENERIC_HOOKS_EN[type] : GENERIC_HOOKS[type];
  return `${p1Name} ${joiner} ${p2Name}: ${generic}`;
}

export function isHarmoniousAspect(type: AspectType): boolean {
  return type === 'TRINE' || type === 'CONJUNCTION' || type === 'SEXTILE';
}

export function getAspectGlossary(type: AspectType, locale?: string): GlossaryEntry {
  if (locale?.toLowerCase().startsWith('en')) {
    return ASPECT_GLOSSARY_EN[type];
  }
  return ASPECT_GLOSSARY[type];
}
