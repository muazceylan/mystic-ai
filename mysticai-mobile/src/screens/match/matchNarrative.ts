export type NarrativeThemeKey = 'ASK' | 'ILETISIM' | 'GUVEN' | 'TUTKU';
export type NarrativeTone = 'DESTEKLEYICI' | 'ZORLAYICI' | 'DENGELI' | 'NOTR';

export interface DetailNarrativeInput {
  theme: NarrativeThemeKey;
  tone: NarrativeTone;
  leftName?: string;
  rightName?: string;
  aspectName: string;
  leftPlanet?: string;
  rightPlanet?: string;
  orb?: number;
}

export interface GrowthNarrativeInput {
  seed: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  tone?: string | null;
}

export interface GrowthNarrativeResult {
  trigger: string;
  protocol: [string, string, string];
  habitLabel: string;
}

function safeName(value: string | undefined, fallback: string) {
  const text = (value ?? '').trim();
  return text.length ? text : fallback;
}

function safePlanet(value: string | undefined, fallback: string) {
  const text = (value ?? '').trim();
  return text.length ? text : fallback;
}

function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickUnique<T>(items: T[], seed: string, count: number): T[] {
  if (!items.length || count <= 0) return [];
  const pool = [...items];
  const selected: T[] = [];
  let state = hashSeed(seed);
  while (pool.length && selected.length < count) {
    const index = state % pool.length;
    selected.push(pool.splice(index, 1)[0]);
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  }
  return selected;
}

function normalizeTone(value: string | null | undefined): NarrativeTone {
  const upper = (value ?? '').toUpperCase();
  if (upper.includes('ZOR')) return 'ZORLAYICI';
  if (upper.includes('DESTEK')) return 'DESTEKLEYICI';
  if (upper.includes('DENG')) return 'DENGELI';
  return 'NOTR';
}

function inferThemeFromText(value: string): NarrativeThemeKey {
  const haystack = value.toLocaleLowerCase('tr-TR');
  if (/merkür|merkur|mercury|iletişim|ifade|söz/.test(haystack)) return 'ILETISIM';
  if (/güven|guven|satürn|saturn|sınır|sinir|sadakat/.test(haystack)) return 'GUVEN';
  if (/mars|plüton|pluton|tutku|enerji|çekim|cekim/.test(haystack)) return 'TUTKU';
  return 'ASK';
}

function buildContext(input: DetailNarrativeInput) {
  return {
    ...input,
    leftName: safeName(input.leftName, 'Bir taraf'),
    rightName: safeName(input.rightName, 'Diğer taraf'),
    leftPlanet: safePlanet(input.leftPlanet, 'gezegeni'),
    rightPlanet: safePlanet(input.rightPlanet, 'gezegeni'),
    orbText: Number.isFinite(input.orb as number) ? `${Number(input.orb).toFixed(1)}°` : '',
  };
}

type DetailTemplate = (input: ReturnType<typeof buildContext>) => string;

const supportiveMeaningPool: Record<NarrativeThemeKey, DetailTemplate[]> = {
  ASK: [
    (c) => `${c.leftName} ile ${c.rightName} birlikte keyif üreten alanları daha hızlı bulabilir.`,
    (c) => `${c.leftPlanet} ve ${c.rightPlanet} hattı yakınlık dilini yumuşatıp sıcaklığı artırabilir.`,
    (c) => `Günlük temasta küçük jestler bu bağın olumlu etkisini görünür kılar.`,
    () => 'Beraber eğlenme ve paylaşma isteği ilişkiyi besleyen bir ritim oluşturur.',
    () => 'Gerilim yükselmeden konuşabilmek, yakınlık hissinin devam etmesini kolaylaştırır.',
    (c) => `Bu etkileşimde ritim uyumu yakalandığında kırgınlık yerine iş birliği öne çıkar.`,
  ],
  ILETISIM: [
    (c) => `${c.leftName} ve ${c.rightName} niyeti açık söylediğinde yanlış anlaşılma hızla azalır.`,
    (c) => `${c.leftPlanet}–${c.rightPlanet} teması duygu ve mantığı tek konuşmada buluşturabilir.`,
    () => 'Soru-cevap ritmi dengelendiğinde konuşmalar daha kısa sürede netleşir.',
    () => 'Aynı konuda farklı bakış olsa da ortak dil kurma kapasitesi güçlü görünür.',
    () => 'Geri bildirim verirken savunmaya geçmeden dinlemek ilişkinin kalitesini artırır.',
    (c) => `Orb ${c.orbText || 'yakın'} seviyesindeyken konuşma akışı daha doğal ilerleyebilir.`,
  ],
  GUVEN: [
    (c) => `${c.leftName} ile ${c.rightName} tutarlı adımlar attığında güven duygusu hızla büyür.`,
    () => 'Belirsizlik anlarında sakin kalabilmek ilişkide dayanıklılığı güçlendirir.',
    () => 'Söz ve davranışın aynı çizgide kalması, kırılma riskini belirgin şekilde azaltır.',
    (c) => `${c.leftPlanet} ve ${c.rightPlanet} etkisi sınırları netleştirmeyi kolaylaştırabilir.`,
    () => 'Kriz anında suçlama yerine açıklık seçmek güven alanını korur.',
    () => 'Ortak karar öncesi kısa doğrulama cümlesi kullanmak ilişkiye emniyet hissi verir.',
  ],
  TUTKU: [
    (c) => `${c.leftName} ve ${c.rightName} birlikte hareket ettiğinde motivasyon birbirini yükseltir.`,
    () => 'Enerji doğru kanala aktığında ilişki canlı ve üretken bir akış yakalar.',
    (c) => `${c.leftPlanet}–${c.rightPlanet} hattı çekim gücünü ve harekete geçme isteğini artırabilir.`,
    () => 'Kararları küçük adımlara bölmek, yüksek enerjiyi sürdürülebilir hale getirir.',
    () => 'Ortak aktivite planlamak tutku ve yakınlık dengesini destekler.',
    () => 'Hız ve istikrar dengelendiğinde gerilim yerine heyecan öne çıkabilir.',
  ],
};

const challengingMeaningPool: Record<NarrativeThemeKey, DetailTemplate[]> = {
  ASK: [
    (c) => `${c.leftName} ile ${c.rightName} yakınlık temposunu aynı anda açamayınca kısa mesafe hissi oluşabilir.`,
    () => 'Beklenti konuşulmadan varsayım yapılırsa kırgınlık döngüsü hızlanabilir.',
    () => 'Duygusal ihtiyaçlar farklı anda yükseldiğinde biri yakınlaşırken diğeri alan isteyebilir.',
    () => 'Yorgunluk anında yapılan konuşmalar, niyetten farklı bir tonda algılanabilir.',
    () => 'Eski meseleler yeni konuşmaya taşındığında mevcut konu geri planda kalabilir.',
    (c) => `${c.orbText ? `Orb ${c.orbText} olduğu için ` : ''}duygusal tetiklenme anlarında tempo farkı daha görünür olabilir.`,
  ],
  ILETISIM: [
    (c) => `Konuşma hızında fark olduğunda ${c.leftName} hızlanıp ${c.rightName} geri çekilebilir.`,
    () => 'Aynı cümle farklı tonda algılanabildiği için niyet kolayca kaybolabilir.',
    () => 'Soru-cvp dengesi bozulduğunda bir taraf baskı, diğer taraf savunma hissedebilir.',
    (c) => `${c.leftPlanet} ve ${c.rightPlanet} hattında netlik geciktiğinde konu uzayabilir.`,
    () => 'Tetikli anlarda açıklama yerine yorum yapmak yanlış anlaşılmayı artırır.',
    () => 'Kısa mesajlarda bağlam eksik kaldığında gereksiz gerilim doğabilir.',
  ],
  GUVEN: [
    () => 'Güven dili farklı çalıştığında biri kanıt ararken diğeri niyete odaklanabilir.',
    () => 'Belirsiz kalan sözler ilişki içinde gereksiz alarm hissi yaratabilir.',
    () => 'Sınırlar konuşulmadığında iyi niyetli davranış bile yanlış okunabilir.',
    (c) => `${c.leftName} ile ${c.rightName} beklentiyi aynı cümlede netleştirmediğinde mesafe artabilir.`,
    () => 'Kriz anında susmak ya da sertleşmek, güven duygusunu eş zamanlı zayıflatabilir.',
    (c) => `${c.leftPlanet}–${c.rightPlanet} teması sabırla yönetilmediğinde gelgit hissi yaratabilir.`,
  ],
  TUTKU: [
    () => 'Hız ve sabır ritmi ayrıştığında enerji kolayca sürtünmeye dönebilir.',
    (c) => `${c.leftName} hızlı aksiyon isterken ${c.rightName} beklemeyi seçebilir.`,
    () => 'Yoğun tepki anında duygu yerine haklılık konuşulursa gerilim büyüyebilir.',
    () => 'Yüksek enerji doğru yönlendirilmezse yakınlık yerine yorgunluk üretebilir.',
    (c) => `${c.leftPlanet} ile ${c.rightPlanet} arasındaki baskı, karar anlarında sertlik yaratabilir.`,
    () => 'Tempo düşürmeden alınan kararlar sonradan pişmanlık döngüsü oluşturabilir.',
  ],
};

const supportiveStepPool: Record<NarrativeThemeKey, DetailTemplate[]> = {
  ASK: [
    (c) => `${c.leftName} ve ${c.rightName} haftada bir “keyif saati” planlasın.`,
    () => 'Konuşmaya “sende sevdiğim şey…” cümlesiyle başlayın.',
    () => 'Günün sonunda tek bir teşekkür cümlesi paylaşın.',
    () => 'Aynı anda tek bir beklentiyi netleştirip diğerini erteleyin.',
    () => 'Ortak mini hedefi yazıp 3 gün sonra birlikte kontrol edin.',
    () => 'Yakınlık dilinizi kelimeler yerine örnek davranışla tanımlayın.',
  ],
  ILETISIM: [
    () => 'Konuşmayı “duygu + ihtiyaç” formatıyla açın.',
    () => 'Aynı anda tek başlık konuşup konu atlamayın.',
    () => 'Her tur sonunda “senden bunu duydum…” diye özetleyin.',
    (c) => `${c.leftName} konuşurken ${c.rightName} yalnızca açıklayıcı soru sorsun.`,
    () => 'Mesajlaşma yerine kritik konuları yüz yüze tamamlayın.',
    () => 'Konuşma sonunda tek bir karar cümlesi yazın.',
  ],
  GUVEN: [
    () => 'Beklentiyi yoruma bırakmadan somut cümleyle belirtin.',
    () => 'Haftalık kısa check-in ile sözleştiğiniz noktaları gözden geçirin.',
    () => 'Belirsizlik oluştuğunda 24 saat içinde netleştirme konuşması yapın.',
    () => 'Sınır cümlelerini suçlayıcı olmayan dille kurun.',
    (c) => `${c.leftName} ve ${c.rightName} kriz anında önce sakinleşme molası versin.`,
    () => 'Takdir cümlesini görünür bir ritüele dönüştürün.',
  ],
  TUTKU: [
    () => 'Yüksek enerjiyi ortak aktiviteye yönlendirin.',
    () => 'Kararları büyük paket yerine mikro adımlara bölün.',
    () => 'Gerilimde önce 10 dakika tempo düşürüp sonra konuşun.',
    (c) => `${c.leftName} hızlandığında ${c.rightName} net mola sinyali versin.`,
    () => 'Hızlı tepki yerine “şimdi mi, biraz sonra mı?” sorusunu kullanın.',
    () => 'Birlikte hareket gerektiren haftalık plan ekleyin.',
  ],
};

const challengingStepPool: Record<NarrativeThemeKey, DetailTemplate[]> = {
  ASK: [
    () => 'Önce duyguyu, sonra beklentiyi tek cümleyle söyleyin.',
    () => 'Tetiklenme anında 10 dakika ara verip geri dönün.',
    () => 'Kırgınlık konuşmasını geçmiş yerine bugüne sabitleyin.',
    () => 'Aynı konuşmada birden fazla hesabı açmayın.',
    () => 'Ertesi gün 5 dakikalık follow-up ile netleştirin.',
    () => 'Yakınlık ihtiyacını “hemen” yerine “zaman penceresi” ile konuşun.',
  ],
  ILETISIM: [
    () => 'İlk cümleyi suçlama yerine niyet cümlesiyle kurun.',
    () => 'Tek soru–tek cevap ritminde ilerleyin.',
    () => 'Yorum yerine “doğru mu anladım?” kontrolü yapın.',
    () => 'Söz kesildiğinde tartışmayı durdurup tekrar başlatın.',
    () => 'Mesajla büyüyen konuyu sesli konuşmaya taşıyın.',
    () => 'Kapanışta net bir aksiyon cümlesi belirleyin.',
  ],
  GUVEN: [
    () => 'Belirsizlik oluştuğunda niyet doğrulaması isteyin.',
    () => 'Kanıt arayan taraf soruyu açık ve kısa sorsun.',
    () => 'Sezgisel taraf varsayımı değil somut örneği anlatsın.',
    () => 'Sınır ihlali hissinde aynı gün kısa konuşma planlayın.',
    () => 'Geçmiş dosyayı açmadan bugünkü olayı konuşun.',
    () => 'Krizi çözmeden yeni karar almayın.',
  ],
  TUTKU: [
    () => 'Hız farkı olduğunda karar için ortak saat belirleyin.',
    () => 'Tepki yükseldiğinde bedeni sakinleştirip sonra konuşun.',
    () => 'Büyük kararları iki aşamada netleştirin.',
    () => 'Haklılık yerine ihtiyacı merkeze alın.',
    () => 'Acele anında “duraklat” kelimesini birlikte kullanın.',
    () => 'Yoğun enerjiyi tartışmaya değil üretime yönlendirin.',
  ],
};

const riskSolutionPool: Record<NarrativeThemeKey, DetailTemplate[]> = {
  ASK: [
    () => 'Öneri: Önce duyguyu söyleyin, ardından tek bir beklenti belirleyin.',
    () => 'Öneri: Yakınlık temposunu konuşup iki taraf için ortak bir zaman penceresi seçin.',
    () => 'Öneri: Kırgınlık anında savunma yerine “şu an neye ihtiyacım var?” cümlesi kurun.',
  ],
  ILETISIM: [
    () => 'Öneri: Konuşmaya tek niyet cümlesiyle başlayın, sonra tek soruda kalın.',
    () => 'Öneri: Yanıt vermeden önce duyduğunuzu bir cümleyle tekrar edin.',
    () => 'Öneri: Gerilimde mesajlaşmayı bırakıp kısa sesli konuşmaya geçin.',
  ],
  GUVEN: [
    () => 'Öneri: Varsayım yerine doğrudan doğrulama sorusu sorun.',
    () => 'Öneri: Belirsiz kalan noktayı aynı gün kısa bir netleştirme ile kapatın.',
    () => 'Öneri: Sınır cümlelerini yargısız ve somut davranış diliyle kurun.',
  ],
  TUTKU: [
    () => 'Öneri: Hız farkı yükseldiğinde 10 dakikalık mola verip sonra tek konuda kalın.',
    () => 'Öneri: Tepki anında karar almayın; önce ritmi düşürün.',
    () => 'Öneri: Yüksek enerjiyi ortak hedefe yönlendirip tartışma süresini sınırlayın.',
  ],
};

const positiveFlowPool: Record<NarrativeThemeKey, DetailTemplate[]> = {
  ASK: [
    (c) => `${c.leftName} ve ${c.rightName} bu etkileşimde sıcaklığı doğal biçimde büyütebilir.`,
    () => 'Bu bağda olumlu akış yüksek; küçük ritüeller etkisini katlayabilir.',
    () => 'Yakınlık tarafında doğru tempo korunursa ilişkinin keyif alanı hızla genişleyebilir.',
  ],
  ILETISIM: [
    () => 'Bu etkileşimde anlaşma kapasitesi güçlü; net cümleler avantajı büyütür.',
    (c) => `${c.leftName} ile ${c.rightName} doğru özet ritmiyle iletişim kazalarını azaltabilir.`,
    () => 'Konuşma akışı destekleyici görünüyor; kısa kapanış cümleleri kalıcılık sağlar.',
  ],
  GUVEN: [
    () => 'Güven tarafında destekleyici zemin var; tutarlı adımlar bunu kalıcı yapar.',
    (c) => `${c.leftName} ve ${c.rightName} söz-davranış uyumunu koruduğunda bağ hızla güçlenir.`,
    () => 'Belirsizliği erken konuşmak bu olumlu akışı uzun vadede korur.',
  ],
  TUTKU: [
    () => 'Enerji hattı canlı; doğru yönlendirme ile ilişkinin motivasyonu artar.',
    (c) => `${c.leftName} ile ${c.rightName} ortak aksiyon planı kurduğunda akış güçlenir.`,
    () => 'Tutku alanında destekleyici ritim var; hız ve denge birlikte korunmalı.',
  ],
};

const pairLinePool: Record<NarrativeThemeKey, DetailTemplate[]> = {
  ASK: [
    (c) => `${c.leftName}: Yakınlık ister   ↔   ${c.rightName}: Alanla dengeler`,
    (c) => `${c.leftName}: Hızlı temas kurar   ↔   ${c.rightName}: Ritmi yavaşlatır`,
    (c) => `${c.leftName}: Duyguyu açar   ↔   ${c.rightName}: Zamanla derinleşir`,
  ],
  ILETISIM: [
    (c) => `${c.leftName}: Netleştirmek ister   ↔   ${c.rightName}: Düşünüp yanıtlar`,
    (c) => `${c.leftName}: Hızlı konuşur   ↔   ${c.rightName}: Tartıp söyler`,
    (c) => `${c.leftName}: Konuyu açar   ↔   ${c.rightName}: Çerçeveyi toplar`,
  ],
  GUVEN: [
    (c) => `${c.leftName}: Kanıt arar   ↔   ${c.rightName}: Niyete bakar`,
    (c) => `${c.leftName}: Sınırı net çizer   ↔   ${c.rightName}: Esneklik arar`,
    (c) => `${c.leftName}: Plan ister   ↔   ${c.rightName}: Akışla ilerler`,
  ],
  TUTKU: [
    (c) => `${c.leftName}: Hızlı aksiyon alır   ↔   ${c.rightName}: Zamana yayar`,
    (c) => `${c.leftName}: Yüksek tempo ister   ↔   ${c.rightName}: Dengeli ilerler`,
    (c) => `${c.leftName}: Hemen karar verir   ↔   ${c.rightName}: Düşünerek seçer`,
  ],
};

function sampleDetails(
  input: DetailNarrativeInput,
  pool: Record<NarrativeThemeKey, DetailTemplate[]>,
  count: number,
  variantKey: string,
) {
  const context = buildContext(input);
  const items = pool[input.theme] ?? pool.ASK;
  return pickUnique(items, `${variantKey}|${input.aspectName}|${input.leftName}|${input.rightName}|${input.orb ?? ''}`, count).map((fn) =>
    fn(context),
  );
}

export function buildMeaningBullets(input: DetailNarrativeInput): string[] {
  if (input.tone === 'ZORLAYICI') return sampleDetails(input, challengingMeaningPool, 3, 'meaning-risk');
  return sampleDetails(input, supportiveMeaningPool, 3, 'meaning-ok');
}

export function buildUsageSteps(input: DetailNarrativeInput): string[] {
  if (input.tone === 'ZORLAYICI') return sampleDetails(input, challengingStepPool, 3, 'steps-risk');
  return sampleDetails(input, supportiveStepPool, 3, 'steps-ok');
}

export function buildPairLine(input: DetailNarrativeInput): string {
  return sampleDetails(input, pairLinePool, 1, 'pair')[0];
}

export function buildRiskSolution(input: DetailNarrativeInput): string {
  return sampleDetails(input, riskSolutionPool, 1, 'solution')[0];
}

export function buildPositiveFlowLine(input: DetailNarrativeInput): string {
  return sampleDetails(input, positiveFlowPool, 1, 'flow')[0];
}

export function buildGrowthNarrative(input: GrowthNarrativeInput): GrowthNarrativeResult {
  const tone = normalizeTone(input.tone);
  const area = inferThemeFromText(`${input.title} ${input.subtitle ?? ''} ${input.summary ?? ''}`);
  const detailInput: DetailNarrativeInput = {
    theme: area,
    tone: tone === 'ZORLAYICI' ? 'ZORLAYICI' : 'DESTEKLEYICI',
    aspectName: input.title,
  };

  const dynamicTriggerPool: Record<NarrativeThemeKey, string[]> = {
    ASK: [
      'Yakınlık ritmi farklılaştığında',
      'Beklenti konuşulmadan varsayım oluştuğunda',
      'Günün sonunda duygular biriktiğinde',
    ],
    ILETISIM: [
      'Aynı konu uzamaya başladığında',
      'Söz kesme veya yanlış anlaşılma hissi olduğunda',
      'Mesajlaşma tonu gerildiğinde',
    ],
    GUVEN: [
      'Belirsizlik hissi yükseldiğinde',
      'Sınırların bulanıklaştığı anlarda',
      'Tutarlılık beklentisi konuşulmadığında',
    ],
    TUTKU: [
      'Karar temposu ayrıştığında',
      'Enerji yükselip sabır düştüğünde',
      'Tepkiler hızlandığında',
    ],
  };

  const habitPool: Record<NarrativeThemeKey, string[]> = {
    ASK: [
      'Bu hafta dene: gün sonunda tek teşekkür cümlesi paylaşın',
      'Bu hafta dene: birlikte 20 dakikalık keyif saati ayırın',
      'Bu hafta dene: beklentiyi tek cümlede netleştirin',
    ],
    ILETISIM: [
      'Bu hafta dene: tek konu–tek karar formatı kullanın',
      'Bu hafta dene: her konuşma sonunda 1 cümle özet yapın',
      'Bu hafta dene: tetiklenmede 10 dakika ara verin',
    ],
    GUVEN: [
      'Bu hafta dene: belirsiz noktayı aynı gün netleştirin',
      'Bu hafta dene: sınır cümlesini yargısız dille kurun',
      'Bu hafta dene: haftalık 5 dakikalık check-in yapın',
    ],
    TUTKU: [
      'Bu hafta dene: kararları iki aşamada netleştirin',
      'Bu hafta dene: yüksek enerjiyi ortak aktiviteye yönlendirin',
      'Bu hafta dene: hız yükseldiğinde mola sinyali kullanın',
    ],
  };

  const triggerOptions = dynamicTriggerPool[area];
  const trigger = (input.subtitle ?? '').trim() || pickUnique(triggerOptions, `${input.seed}|trigger`, 1)[0];
  const protocol = toProtocolTuple(
    buildUsageSteps({
      ...detailInput,
      tone: tone === 'ZORLAYICI' ? 'ZORLAYICI' : 'DESTEKLEYICI',
    }),
  );
  const habitLabel = pickUnique(habitPool[area], `${input.seed}|habit`, 1)[0];

  return {
    trigger,
    protocol,
    habitLabel,
  };
}

function toProtocolTuple(steps: string[]): [string, string, string] {
  const fallback = [
    'Konuşmaya niyet cümlesiyle başlayın.',
    'Aynı anda tek bir konuya odaklanın.',
    'Konuşmayı tek bir net adımla kapatın.',
  ];
  const merged = [...steps];
  while (merged.length < 3) {
    merged.push(fallback[merged.length]);
  }
  return [merged[0], merged[1], merged[2]];
}
