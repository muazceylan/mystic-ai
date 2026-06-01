import type { GlossaryEntry } from './astrology-glossary';
import type { AspectType } from '../services/astrology.service';
import { getPlanetName } from './zodiac';

export const ASPECT_GLOSSARY: Record<AspectType, GlossaryEntry> = {
  CONJUNCTION: {
    term: 'Kavuşum',
    shortDesc: 'Tek güç, yüksek yoğunluk',
    longDesc:
      'Kavuşumda iki gezegen aynı düğmeye basar: ayrı ayrı değil, tek bir güç gibi çalışır. Bu açı kişide yüksek odak, güçlü dürtü ve bazen tek konuya fazla yüklenme yaratır.',
  },
  OPPOSITION: {
    term: 'Karşıt',
    shortDesc: 'İki uç, denge kurma baskısı',
    longDesc:
      'Karşıt açı iki gezegeni aynı eksenin iki ucuna koyar. Kişi bir tarafı seçmek yerine iki ihtiyacı aynı anda yönetmeyi öğrenir; ilişki, karar ve iç denge teması çok görünür olur.',
  },
  TRINE: {
    term: 'Üçgen',
    shortDesc: 'Doğal yetenek, kolay akış',
    longDesc:
      'Üçgen açı iki gezegen arasında sürtünmesiz bir yol açar. Bu yetenek doğal geldiği için kişi bazen fark etmez; bilinçli kullanıldığında destek, akıcılık ve hızlı toparlanma verir.',
  },
  SQUARE: {
    term: 'Kare',
    shortDesc: 'Sürtünme, karar ve gelişim baskısı',
    longDesc:
      'Kare açı iki ihtiyacı birbirine sürter. Rahatsız eder ama hareket üretir: erteleme, çatışma veya baskı hissi doğru yönetilirse en net gelişim kasına dönüşür.',
  },
  SEXTILE: {
    term: 'Altıgen',
    shortDesc: 'Açık kapı, bilinçli fırsat',
    longDesc:
      'Altıgen açı hazır bir fırsat kapısıdır ama kapıdan geçmek gerekir. İki gezegen birbirini destekler; sonuç almak için küçük bir karar, temas veya pratik adım ister.',
  },
  QUINCUNX: {
    term: 'Quincunx',
    shortDesc: 'Uyumsuz ritim, ince ayar',
    longDesc:
      'Quincunx iki gezegenin aynı dili konuşmadığını gösterir. Büyük krizden çok sürekli ayar ihtiyacı verir; alışkanlık, beden ritmi ve karar tarzı düzeltilince rahatlar.',
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

type AspectReadingCopy = {
  cardTone: string;
  cardVerb: string;
  meaning: string;
  dynamic: string;
  personal: string;
  caution: string;
};

export type AspectReading = {
  cardTitle: string;
  cardSummary: string;
  meaning: string;
  dynamic: string;
  personal: string;
  caution: string;
};

export type AspectOrbStrength = {
  label: string;
  detail: string;
};

const PLANET_ROLE_TR: Record<string, string> = {
  Sun: 'kimlik ve yaşam enerjisi',
  Moon: 'duygusal ihtiyaç',
  Mercury: 'zihin ve iletişim',
  Venus: 'ilişki ve değer seçimi',
  Mars: 'istek ve aksiyon',
  Jupiter: 'büyüme ve inanç',
  Saturn: 'sınır ve sorumluluk',
  Uranus: 'özgürlük ve değişim',
  Neptune: 'sezgi ve ideal',
  Pluto: 'güç ve dönüşüm',
  Chiron: 'hassasiyet ve şifa bilgisi',
  NorthNode: 'gelişim yönü',
};

const PLANET_ROLE_EN: Record<string, string> = {
  Sun: 'identity and life force',
  Moon: 'emotional need',
  Mercury: 'mind and communication',
  Venus: 'relationship and values',
  Mars: 'drive and action',
  Jupiter: 'growth and belief',
  Saturn: 'limits and responsibility',
  Uranus: 'freedom and change',
  Neptune: 'intuition and ideals',
  Pluto: 'power and transformation',
  Chiron: 'sensitivity and healing intelligence',
  NorthNode: 'growth direction',
};

const ASPECT_READING_TR: Record<AspectType, AspectReadingCopy> = {
  CONJUNCTION: {
    cardTone: 'Tek güç',
    cardVerb: 'aynı hatta birleşir',
    meaning: 'Kavuşum, iki gezegenin aynı düğmeye basmasıdır. Bu konu haritada yüksek sesle çalışır: net odak verir, fazlası tek kanala sıkışma yaratabilir.',
    dynamic: 'tek bir kanalda yoğunlaştırır. Kişi bu enerjiyi bastıramaz; en sağlıklı kullanım ona bilinçli bir yön vermektir.',
    personal: 'Bu ikili sende birlikte yükselir. Birini bastırmak yerine ikisine ortak bir ifade kanalı açman gerekir.',
    caution: 'Yoğunluk artınca aynı davranışı tekrar etme, takılma veya konuyu büyütme eğilimini izle.',
  },
  OPPOSITION: {
    cardTone: 'Denge baskısı',
    cardVerb: 'iki uç gibi karşılıklı çekilir',
    meaning: 'Karşıt açı, iki ihtiyacın aynı anda görünür olmasıdır. Mesele taraf seçmek değil, iki ucu da yönetebilecek olgun bir denge kurmaktır.',
    dynamic: 'karşı karşıya getirir. Bu yüzden karar, ilişki ve iç denge temaları dış olaylar üzerinden daha görünür hale gelebilir.',
    personal: 'Bu ikili sende “ya o ya bu” hissi yaratabilir. Güç, iki tarafı sırayla değil aynı masada tutunca gelir.',
    caution: 'Bir gezegeni haklı, diğerini sorunlu ilan edersen açı kutuplaşır ve aynı ders tekrar eder.',
  },
  TRINE: {
    cardTone: 'Doğal yetenek',
    cardVerb: 'rahat ve hızlı akar',
    meaning: 'Üçgen, iki gezegen arasında sürtünmesiz bir yol açar. Yetenek doğal geldiği için fark edilmeyebilir; bilinçli kullanılırsa güçlü destek verir.',
    dynamic: 'zahmetsizce bağlar. Bu açı kriz çıkarmadan destek verir; asıl mesele bu kolaylığı bilinçli üretime çevirmektir.',
    personal: 'Bu ikili sende doğal bir refleks gibi çalışır. Üzerine gittiğinde hızlı öğrenir, çabuk toparlanır ve daha az dirençle ilerlersin.',
    caution: 'Kolay geldiği için erteleme veya “zaten yaparım” rehavetine düşme.',
  },
  SQUARE: {
    cardTone: 'Gelişim gerilimi',
    cardVerb: 'birbirini iter ve harekete zorlar',
    meaning: 'Kare, iki ihtiyacın birbirini rahat bırakmamasıdır. Rahatsız eder ama eylem üretir; doğru yönetildiğinde en net gelişim kasına dönüşür.',
    dynamic: 'sürtüştürür. Bu yüzden kişi önce baskı hisseder, sonra karar almak, sınır koymak veya davranış değiştirmek zorunda kalır.',
    personal: 'Bu ikili sende “böyle devam edemem” hissi yaratabilir. Gerilim düşman değil; hangi kası güçlendirmen gerektiğini gösterir.',
    caution: 'Tepkisel karar, savunmaya geçme ve aynı çatışmayı büyütme eğilimini erken yakala.',
  },
  SEXTILE: {
    cardTone: 'Açık kapı',
    cardVerb: 'küçük bir adımla işbirliği kurar',
    meaning: 'Altıgen, hazır bir fırsat kapısıdır. Enerji destekleyicidir ama kendiliğinden mucize yaratmaz; temas, pratik veya karar ister.',
    dynamic: 'işbirliğine açar. Kişi küçük bir hamle yaptığında sonuç büyür; bağlantı kurmak, denemek ve teklif götürmek bu açıyı çalıştırır.',
    personal: 'Bu ikili sende kullanıma hazır bir beceri verir. Fırsatı görmek yetmez; küçük ama net bir aksiyon açıyı görünür kılar.',
    caution: 'Pasif beklersen bu destek arka planda kalır; kapı açık olsa da içeri sen girmelisin.',
  },
  QUINCUNX: {
    cardTone: 'İnce ayar',
    cardVerb: 'aynı dili konuşmakta zorlanır',
    meaning: 'Quincunx, iki gezegenin ritim tutturmakta zorlanmasıdır. Büyük patlamadan çok sürekli ayar ihtiyacı verir.',
    dynamic: 'birbirine alışmaya zorlar. Bu açı alışkanlık, beden ritmi, zamanlama ve beklenti ayarı istediğinde daha rahat çalışır.',
    personal: 'Bu ikili sende adı zor konan bir huzursuzluk yaratabilir. Çözüm büyük hamle değil; düzenli küçük ayardır.',
    caution: 'Belirsiz rahatsızlığı yok sayma; tekrar eden küçük sinyaller nerede ayar gerektiğini söyler.',
  },
};

const ASPECT_READING_EN: Record<AspectType, AspectReadingCopy> = {
  CONJUNCTION: {
    cardTone: 'One force',
    cardVerb: 'merge into one channel',
    meaning: 'A conjunction means two planets press the same button. The topic works loudly in the chart: focused when conscious, consuming when unmanaged.',
    dynamic: 'It blends these two functions into one channel. This energy is hard to ignore; the healthiest use is to give it a clear direction.',
    personal: 'These two functions rise together in you. Rather than suppressing one, give both a shared outlet.',
    caution: 'When intensity rises, watch for fixation, repetition, or making the topic larger than it needs to be.',
  },
  OPPOSITION: {
    cardTone: 'Balance pressure',
    cardVerb: 'pull from opposite ends',
    meaning: 'An opposition makes two needs visible at the same time. The task is not choosing one side, but learning to hold both ends maturely.',
    dynamic: 'It places these two functions face to face. Decisions, relationships, and inner balance can become more visible through outer events.',
    personal: 'This pair can create an either/or feeling. Strength comes when both sides stay at the same table.',
    caution: 'If one planet becomes “right” and the other “the problem,” the aspect polarizes and repeats the lesson.',
  },
  TRINE: {
    cardTone: 'Natural talent',
    cardVerb: 'flow with ease',
    meaning: 'A trine opens a low-friction path between two planets. The gift may feel so natural that you overlook it; used consciously, it becomes strong support.',
    dynamic: 'It lets these two functions cooperate with ease. The key is turning ease into intentional use.',
    personal: 'This pair works like a natural reflex in you. When developed, it learns quickly and moves with less resistance.',
    caution: 'Because it feels easy, avoid postponing it or assuming it will work without attention.',
  },
  SQUARE: {
    cardTone: 'Growth friction',
    cardVerb: 'push against each other',
    meaning: 'A square means two needs do not leave each other alone. It can feel uncomfortable, but it creates movement and growth.',
    dynamic: 'It links these two functions through friction. Pressure appears first, then a decision, boundary, or behavior change becomes necessary.',
    personal: 'This pair may create a “something has to change” feeling. The friction shows which muscle needs training.',
    caution: 'Watch for reactive choices, defensiveness, or escalating the same conflict.',
  },
  SEXTILE: {
    cardTone: 'Open door',
    cardVerb: 'cooperate after a small step',
    meaning: 'A sextile is an available opportunity. The support is real, but it needs contact, practice, or a decision to become visible.',
    dynamic: 'It opens these two functions toward cooperation. A small action can grow into a useful result.',
    personal: 'This pair gives you a ready-to-use skill. Seeing the chance is not enough; a clear small action activates it.',
    caution: 'If you wait passively, the support stays in the background.',
  },
  QUINCUNX: {
    cardTone: 'Fine adjustment',
    cardVerb: 'struggle to speak the same language',
    meaning: 'A quincunx shows two planets having trouble finding a shared rhythm. It asks for adjustment more than dramatic action.',
    dynamic: 'It asks these two functions to recalibrate. Habits, body rhythm, timing, and expectation-setting matter here.',
    personal: 'This pair can create a hard-to-name discomfort. The remedy is repeated small adjustment, not one grand move.',
    caution: 'Do not ignore subtle repeated signals; they show where adjustment is needed.',
  },
};

export function getAspectOrbStrength(orb: number | undefined, locale?: string): AspectOrbStrength {
  const isEnglish = locale?.toLowerCase().startsWith('en');
  if (!Number.isFinite(orb)) {
    return isEnglish
      ? { label: 'Influence unclear', detail: 'The exact strength is not available.' }
      : { label: 'Etki belirsiz', detail: 'Açının yakınlık gücü şu an net görünmüyor.' };
  }

  const safeOrb = Math.max(0, Number(orb));
  if (safeOrb <= 0.8) {
    return isEnglish
      ? { label: 'Very sharp influence', detail: `Orb ${safeOrb.toFixed(1)}°: the aspect is almost exact, so it tends to show up clearly.` }
      : { label: 'Çok keskin etki', detail: `${safeOrb.toFixed(1)}° sapma: açı neredeyse tam, bu yüzden davranışta daha görünür çalışır.` };
  }
  if (safeOrb <= 2) {
    return isEnglish
      ? { label: 'Strong influence', detail: `Orb ${safeOrb.toFixed(1)}°: close enough to be easy to notice.` }
      : { label: 'Güçlü etki', detail: `${safeOrb.toFixed(1)}° sapma: açı yakın, etkisi kolay fark edilir.` };
  }
  if (safeOrb <= 4) {
    return isEnglish
      ? { label: 'Clear influence', detail: `Orb ${safeOrb.toFixed(1)}°: active, but with more flexibility.` }
      : { label: 'Net ama esnek etki', detail: `${safeOrb.toFixed(1)}° sapma: açı aktif, fakat daha esnek çalışır.` };
  }
  return isEnglish
    ? { label: 'Background influence', detail: `Orb ${safeOrb.toFixed(1)}°: present, but subtler and easier to miss.` }
    : { label: 'Arka plan etkisi', detail: `${safeOrb.toFixed(1)}° sapma: etki var ama daha hafif ve kolay gözden kaçar.` };
}

export function getAspectReading(
  planet1: string,
  planet2: string,
  type: AspectType,
  locale?: string,
): AspectReading {
  const isEnglish = locale?.toLowerCase().startsWith('en');
  const copy = (isEnglish ? ASPECT_READING_EN : ASPECT_READING_TR)[type] ?? (isEnglish ? ASPECT_READING_EN.CONJUNCTION : ASPECT_READING_TR.CONJUNCTION);
  const roleMap = isEnglish ? PLANET_ROLE_EN : PLANET_ROLE_TR;
  const p1Name = getPlanetName(planet1, locale);
  const p2Name = getPlanetName(planet2, locale);
  const p1Role = roleMap[planet1] ?? (isEnglish ? 'planetary function' : 'gezegen fonksiyonu');
  const p2Role = roleMap[planet2] ?? (isEnglish ? 'planetary function' : 'gezegen fonksiyonu');
  const connector = isEnglish ? 'and' : 'ile';

  return {
    cardTitle: `${p1Name} + ${p2Name}`,
    cardSummary: `${copy.cardTone}: ${p1Role} ${connector} ${p2Role} ${copy.cardVerb}.`,
    meaning: copy.meaning,
    dynamic: isEnglish
      ? `${p1Name} represents ${p1Role}; ${p2Name} represents ${p2Role}. ${copy.dynamic}`
      : `${p1Name} ${p1Role} alanını, ${p2Name} ${p2Role} alanını temsil eder. Bu açı bu iki alanı ${copy.dynamic}`,
    personal: isEnglish ? `${p1Name} and ${p2Name}: ${copy.personal}` : `${p1Name} ve ${p2Name}: ${copy.personal}`,
    caution: copy.caution,
  };
}

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
  CONJUNCTION: 'Bu iki gezegen aynı hatta birleşir; konu güçlü, yoğun ve kolay görmezden gelinmez hale gelir.',
  OPPOSITION: 'Bu iki güç karşılıklı çekilir; denge kurmadığında dış olaylar bu gerilimi görünür yapar.',
  TRINE: 'Bu iki gezegen rahat akar; doğal yetenek verir ama bilinçli kullanılmazsa arka planda kalabilir.',
  SQUARE: 'Bu iki ihtiyaç birbirini iter; gerilim rahatsız eder ama gelişim için net hareket üretir.',
  SEXTILE: 'Bu iki gezegen açık kapı verir; küçük bir adım attığında fırsat daha hızlı görünür olur.',
  QUINCUNX: 'Bu iki alan aynı dili konuşmaz; tekrar eden küçük ayarlar büyük rahatlama yaratır.',
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
