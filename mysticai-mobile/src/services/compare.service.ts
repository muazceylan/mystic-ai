import api from './api';
import {
  getSynastry,
  type CrossAspect,
  type SynastryResponse,
} from './synastry.service';
import {
  formatFactorsList,
  mapDistributionWarningText,
  normalizeConfidenceLabel,
  normalizeDataQualityLabel,
} from './compare.presentation';
import type {
  CompareDriverDTO,
  CompareExplainabilityDTO,
  CompareMetricCardDTO,
  CompareModuleCode,
  CompareSummaryDTO,
  CompareThemeSectionCardDTO,
  CompareThemeSectionV3DTO,
  ComparisonResponseDTO,
  DistributionWarningKey,
  MetricStatus,
  RelationshipType,
  TechnicalAspectDTO,
  ThemeGroup,
} from '../types/compare';
import {
  MODULE_TO_RELATIONSHIP,
  RELATIONSHIP_TO_MODULE,
} from '../types/compare';

const COMPARE_BASE = '/api/v1/match';

const MODULE_INTRO_TEXTS: Record<CompareModuleCode, string> = {
  LOVE: 'Bu modülde çekim, güven ve yakınlık ritmi birlikte ölçülür.',
  WORK: 'Bu modülde plan, iletişim ve iş tamamlama uyumu birlikte değerlendirilir.',
  FRIEND: 'Bu modülde sohbet, destek ve sınır dengesinin akışı ölçülür.',
  FAMILY: 'Bu modülde aidiyet, hassasiyet ve sorumluluk paylaşımı değerlendirilir.',
  RIVAL: 'Bu modülde strateji, tempo ve baskı altı performans analizi yapılır.',
};

const RELATIONSHIP_TYPE_ALIASES: Record<string, RelationshipType> = {
  LOVE: 'love',
  ASK: 'love',
  BUSINESS: 'work',
  WORK: 'work',
  IS: 'work',
  FRIEND: 'friend',
  FRIENDSHIP: 'friend',
  ARKADAS: 'friend',
  FAMILY: 'family',
  AILE: 'family',
  RIVAL: 'rival',
  RAKIP: 'rival',
};

interface FetchComparisonInput {
  matchId: number;
  relationshipType: RelationshipType;
  leftName?: string;
  rightName?: string;
}

export interface FetchComparisonResult {
  data: ComparisonResponseDTO;
  isMock: boolean;
}

interface MatchTraitsV3Payload {
  module?: string;
  overall?: {
    score?: number;
    levelLabel?: string;
    confidence?: number;
    confidenceLabel?: string;
    percentile?: number;
  };
  summary?: {
    headline?: string;
    shortNarrative?: string;
    dailyLifeHint?: string;
  };
  metricCards?: Array<{
    id?: string;
    title?: string;
    score?: number;
    status?: string;
    insight?: string;
  }>;
  topDrivers?: {
    supportive?: Array<{ title?: string; impact?: number; why?: string; hint?: string }>;
    challenging?: Array<{ title?: string; impact?: number; why?: string; hint?: string }>;
    growth?: Array<{ title?: string; impact?: number; why?: string; hint?: string }>;
  };
  themeSections?: Array<{
    theme?: string;
    score?: number;
    miniInsight?: string;
    cards?: Array<{ title?: string; description?: string; actionHint?: string }>;
  }>;
  explainability?: {
    calculationVersion?: string;
    factorsUsed?: string[];
    dataQuality?: string;
    generatedAt?: string;
    distributionWarning?: DistributionWarningKey;
    missingBirthTimeImpact?: string | null;
    moduleScoringProfile?: string;
  };
}

function parseDistributionWarningKey(value: unknown): DistributionWarningKey {
  const raw = asString(value, '').toLowerCase();
  if (raw === 'scores_clustered') return 'scores_clustered';
  if (raw === 'low_confidence_damped') return 'low_confidence_damped';
  if (raw === 'house_precision_limited') return 'house_precision_limited';
  return null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampPercent(value: unknown, fallback = 60): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n), 0, 100);
}

function clampConfidence(value: unknown, fallback = 0.6): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n * 100) / 100, 0, 1);
}

function normalizeRelationshipType(value: unknown, fallback: RelationshipType = 'love'): RelationshipType {
  const raw = asString(value, '').toUpperCase();
  if (!raw) return fallback;

  if (raw in RELATIONSHIP_TYPE_ALIASES) {
    return RELATIONSHIP_TYPE_ALIASES[raw];
  }

  const folded = raw
    .replace(/[ÇĞİÖŞÜ]/g, (char) => {
      if (char === 'Ç') return 'C';
      if (char === 'Ğ') return 'G';
      if (char === 'İ') return 'I';
      if (char === 'Ö') return 'O';
      if (char === 'Ş') return 'S';
      if (char === 'Ü') return 'U';
      return char;
    })
    .replace(/[^A-Z]/g, '');

  return RELATIONSHIP_TYPE_ALIASES[folded] ?? fallback;
}

function normalizeModule(value: unknown, fallback: RelationshipType): CompareModuleCode {
  const raw = asString(value, '').toUpperCase();
  if (!raw) return RELATIONSHIP_TO_MODULE[fallback];

  if (raw in MODULE_TO_RELATIONSHIP) {
    return raw as CompareModuleCode;
  }

  const relationship = normalizeRelationshipType(raw, fallback);
  return RELATIONSHIP_TO_MODULE[relationship];
}

function normalizeStatus(value: unknown, score: number): MetricStatus {
  const text = asString(value, '').toLowerCase();
  if (text === 'strong' || text === 'balanced' || text === 'watch' || text === 'growth' || text === 'intense') {
    return text;
  }

  if (score >= 80) return 'strong';
  if (score >= 65) return 'balanced';
  if (score >= 50) return 'watch';
  if (score >= 35) return 'growth';
  return 'intense';
}

function normalizeDriver(raw: unknown): CompareDriverDTO {
  const obj = asObject(raw);
  return {
    title: asString(obj.title, 'Belirleyici Başlık'),
    impact: clampPercent(obj.impact, 0),
    why: asString(obj.why, 'Bu alanda belirgin bir etki görülüyor.'),
    hint: asString(obj.hint, 'Küçük bir rutinle denge korunabilir.'),
  };
}

function normalizeThemeCard(raw: unknown): CompareThemeSectionCardDTO {
  const obj = asObject(raw);
  return {
    title: asString(obj.title, 'Tema Kartı'),
    description: asString(obj.description, 'Bu tema başlığında dengeyi korumak ilişki akışını güçlendirir.'),
    actionHint: asString(obj.actionHint, 'Kısa bir check-in rutini belirleyin.'),
  };
}

function normalizeThemeSection(raw: unknown): CompareThemeSectionV3DTO {
  const obj = asObject(raw);
  return {
    theme: asString(obj.theme, 'Tema'),
    score: clampPercent(obj.score, 60),
    miniInsight: asString(obj.miniInsight, 'Bu tema başlığında dengeli bir akış görünüyor.'),
    cards: asArray(obj.cards).map(normalizeThemeCard),
  };
}

function normalizeMetricCard(raw: unknown, index: number): CompareMetricCardDTO {
  const obj = asObject(raw);
  const score = clampPercent(obj.score, 60);
  return {
    id: asString(obj.id, `metric-${index + 1}`),
    title: asString(obj.title, `Metrik ${index + 1}`),
    score,
    status: normalizeStatus(obj.status, score),
    insight: asString(obj.insight, 'Bu alanda dengeyi korumak için karşılıklı netlik faydalı olur.'),
  };
}

function normalizeV3Response(raw: unknown, input: FetchComparisonInput): ComparisonResponseDTO | null {
  const obj = asObject(raw) as MatchTraitsV3Payload;
  if (!Object.keys(obj).length) return null;

  const module = normalizeModule(obj.module, input.relationshipType);
  const relationshipType = MODULE_TO_RELATIONSHIP[module];

  const overallObj = asObject(obj.overall);
  const summaryObj = asObject(obj.summary);
  const explainObj = asObject(obj.explainability);

  const overall = {
    score: clampPercent(overallObj.score, 60),
    levelLabel: asString(overallObj.levelLabel, 'Dengeli Uyum'),
    confidence: clampConfidence(overallObj.confidence, 0.6),
    confidenceLabel: normalizeConfidenceLabel(asString(overallObj.confidenceLabel, ''), clampConfidence(overallObj.confidence, 0.6)),
    percentile: clampPercent(overallObj.percentile, 50),
  };

  const summary: CompareSummaryDTO = {
    headline: asString(summaryObj.headline, 'Dengeli uyum alanı görünür'),
    shortNarrative: asString(
      summaryObj.shortNarrative,
      'Bu modülde genel akış dengeli görünüyor. Günlük hayatta özellikle iletişim tonu ve beklenti netliği sonuç üzerinde belirleyici olabilir. Farklı hızlarda hareket edilen anlarda kısa bir durup niyeti netleştirmek ilişkiyi daha rahat akıtır.',
    ),
    dailyLifeHint: asString(
      summaryObj.dailyLifeHint,
      'Kritik konularda önce beklentiyi, sonra adımı netleştirin.',
    ),
  };

  const metricCards = asArray(obj.metricCards).map(normalizeMetricCard);
  const normalizedMetricCards = metricCards.length
    ? metricCards
    : [
        {
          id: 'fallback-metric',
          title: 'Genel Uyum',
          score: overall.score,
          status: normalizeStatus('balanced', overall.score),
          insight: 'Bu modülde genel denge korunuyor; netlik arttıkça ayrışma görünür olur.',
        },
      ];

  const topDrivers = {
    supportive: asArray(asObject(obj.topDrivers).supportive).map(normalizeDriver),
    challenging: asArray(asObject(obj.topDrivers).challenging).map(normalizeDriver),
    growth: asArray(asObject(obj.topDrivers).growth).map(normalizeDriver),
  };

  const fallbackDriver: CompareDriverDTO = {
    title: 'Denge Alanı',
    impact: 0,
    why: 'Bu alanda daha fazla veriyle netlik artacaktır.',
    hint: 'Kısa rutinlerle davranış kalıbını gözlemleyin.',
  };

  const normalizedTopDrivers = {
    supportive: topDrivers.supportive.length ? topDrivers.supportive : [fallbackDriver],
    challenging: topDrivers.challenging.length ? topDrivers.challenging : [fallbackDriver],
    growth: topDrivers.growth.length ? topDrivers.growth : [fallbackDriver],
  };

  const themeSections = asArray(obj.themeSections)
    .map(normalizeThemeSection)
    .filter((section) => section.cards.length > 0 || section.miniInsight.length > 0);

  const parsedDistributionWarning = parseDistributionWarningKey(explainObj.distributionWarning);
  const normalizedMissingBirthTimeImpact =
    asString(explainObj.missingBirthTimeImpact, '') ||
    (overall.confidenceLabel === 'Sınırlı'
      ? 'Doğum saati belirsizliği bu modülde yorum hassasiyetini sınırlayabilir.'
      : '');

  const explainability: CompareExplainabilityDTO = {
    calculationVersion: asString(explainObj.calculationVersion, 'compare-v3.0.0'),
    factorsUsed: formatFactorsList(asArray<string>(explainObj.factorsUsed).filter(Boolean)),
    dataQuality: normalizeDataQualityLabel(asString(explainObj.dataQuality, 'medium')),
    generatedAt: asString(explainObj.generatedAt, new Date().toISOString()),
    distributionWarning: parsedDistributionWarning,
    missingBirthTimeImpact: normalizedMissingBirthTimeImpact || null,
    moduleScoringProfile: asString(explainObj.moduleScoringProfile, `${module.toLowerCase()}-v3`),
  };

  return {
    module,
    relationshipType,
    overall,
    summary,
    moduleIntro: MODULE_INTRO_TEXTS[module],
    metricCards: normalizedMetricCards,
    topDrivers: normalizedTopDrivers,
    themeSections,
    explainability,
    warningText: mapDistributionWarningText(explainability.distributionWarning),
    technicalAspects: [],
  };
}

function localizePlanet(value: string | undefined): string {
  const planet = asString(value, '').toLocaleUpperCase('tr-TR');
  if (!planet) return 'Gezegen';
  if (planet === 'SUN') return 'Güneş';
  if (planet === 'MOON') return 'Ay';
  if (planet === 'MERCURY') return 'Merkür';
  if (planet === 'VENUS') return 'Venüs';
  if (planet === 'MARS') return 'Mars';
  if (planet === 'JUPITER') return 'Jüpiter';
  if (planet === 'SATURN') return 'Satürn';
  if (planet === 'URANUS') return 'Uranüs';
  if (planet === 'NEPTUNE') return 'Neptün';
  if (planet === 'PLUTO') return 'Plüton';
  if (planet === 'CHIRON') return 'Kiron';
  return value ?? 'Gezegen';
}

function localizeAspectType(value: string | undefined, symbol: string | undefined): string {
  const raw = asString(value, '').toLocaleUpperCase('tr-TR');
  const safeSymbol = asString(symbol, '');
  if (raw === 'TRINE') return safeSymbol || 'Üçgen';
  if (raw === 'SEXTILE') return safeSymbol || 'Altmışlık';
  if (raw === 'SQUARE') return safeSymbol || 'Kare';
  if (raw === 'OPPOSITION') return safeSymbol || 'Karşıt';
  if (raw === 'CONJUNCTION') return safeSymbol || 'Kavuşum';
  return safeSymbol || 'Etkileşim';
}

function inferThemeFromCrossAspect(aspect: CrossAspect, relationshipType: RelationshipType): ThemeGroup {
  const left = localizePlanet(aspect.userPlanet).toLocaleLowerCase('tr-TR');
  const right = localizePlanet(aspect.partnerPlanet).toLocaleLowerCase('tr-TR');
  const stack = `${left} ${right} ${aspect.aspectType}`;

  if (/merkür|merkur/.test(stack)) return 'İletişim';
  if (/satürn|saturn/.test(stack)) return relationshipType === 'rival' ? 'Sınırlar' : 'Güven';
  if (/mars|plüton|pluton/.test(stack)) return relationshipType === 'rival' ? 'Rekabet & Strateji' : 'Krizi Yönetme';
  if (/ay|venüs|venus/.test(stack)) {
    if (relationshipType === 'family') return 'Aile Bağı';
    if (relationshipType === 'friend') return 'Destek & Sadakat';
    return 'Aşk & Çekim';
  }

  if (relationshipType === 'work') return 'İş Bölümü';
  if (relationshipType === 'rival') return 'Rekabet & Strateji';
  if (relationshipType === 'family') return 'Karar & Plan';
  if (relationshipType === 'friend') return 'Duygusal Tempo';
  return 'Aşk & Çekim';
}

type AspectCode = 'TRINE' | 'SEXTILE' | 'SQUARE' | 'OPPOSITION' | 'CONJUNCTION' | 'OTHER';
type PlanetCode =
  | 'SUN'
  | 'MOON'
  | 'MERCURY'
  | 'VENUS'
  | 'MARS'
  | 'JUPITER'
  | 'SATURN'
  | 'URANUS'
  | 'NEPTUNE'
  | 'PLUTO'
  | 'CHIRON'
  | 'OTHER';

interface TechnicalInterpretation {
  shortInterpretation: string;
  comparisonInsight: string;
  practicalMeaning: string;
  technicalKey: string;
  usageHint: string;
  orbLabel: string;
  orbMicrocopy: string;
  orbInsight: string;
}

function normalizePlanetCode(value: string | undefined): PlanetCode {
  const raw = asString(value, '').toLocaleUpperCase('tr-TR');
  if (
    raw === 'SUN' ||
    raw === 'MOON' ||
    raw === 'MERCURY' ||
    raw === 'VENUS' ||
    raw === 'MARS' ||
    raw === 'JUPITER' ||
    raw === 'SATURN' ||
    raw === 'URANUS' ||
    raw === 'NEPTUNE' ||
    raw === 'PLUTO' ||
    raw === 'CHIRON'
  ) {
    return raw;
  }
  return 'OTHER';
}

function normalizeAspectCode(value: string | undefined): AspectCode {
  const raw = asString(value, '').toLocaleUpperCase('tr-TR');
  if (
    raw === 'TRINE' ||
    raw === 'SEXTILE' ||
    raw === 'SQUARE' ||
    raw === 'OPPOSITION' ||
    raw === 'CONJUNCTION'
  ) {
    return raw;
  }
  return 'OTHER';
}

function buildPairKey(leftPlanet: PlanetCode, rightPlanet: PlanetCode): string {
  return [leftPlanet, rightPlanet].sort().join('_');
}

function displayName(name: string, fallback: string): string {
  return asString(name, fallback);
}

function buildOrbLabel(orb: number): string {
  if (orb <= 1.2) return 'Çok yakın';
  if (orb <= 3) return 'Yakın';
  if (orb <= 5.5) return 'Orta';
  return 'Geniş';
}

function buildOrbInsight(orb: number): string {
  if (orb <= 1.2) {
    return 'Orb çok yakın olduğu için bu etki ilişki içinde hızlı, net ve tekrar eden biçimde çalışır.';
  }
  if (orb <= 3) {
    return 'Orb yakın; bu etki özellikle gündelik temas ve tetik anlarında belirgin şekilde hissedilir.';
  }
  if (orb <= 5.5) {
    return 'Orb orta düzeyde; etki vardır fakat çoğu zaman ilişki koşullarına göre güçlenip zayıflar.';
  }
  return 'Orb geniş; bu etki arka planda çalışır ve çoğunlukla belirli şartlar oluştuğunda öne çıkar.';
}

function buildOrbMicrocopy(
  orb: number,
  supportive: boolean,
  relationshipType: RelationshipType,
): string {
  const band = orb <= 1.2 ? 'exact' : orb <= 3 ? 'close' : orb <= 5.5 ? 'medium' : 'wide';

  if (relationshipType === 'love') {
    if (supportive) {
      if (band === 'exact') return 'Orb çok yakın; birbirinize yaklaşma ve kırgınlığı yumuşatma biçiminiz doğal bir uyumla devreye girebilir.';
      if (band === 'close') return 'Bu etki sevgi dili, temas ritmi ve karşılıklı ilgi tarafında kısa sürede cevap üretir.';
      if (band === 'medium') return 'Romantik potansiyel açık; güven ve yakınlık bilinçli kurulduğunda bağ daha rahat derinleşir.';
      return 'Bu etki her gün aynı güçte işlemez; duygusal zemin sağlam olduğunda ilişkiyi toparlayan taraf olur.';
    }

    if (band === 'exact') return 'Orb çok yakın; güven, yakınlık dozu ve ilk tepki aynı anda bozulduğunda gerilim hızlı büyüyebilir.';
    if (band === 'close') return 'Bu sürtünme sevgi dili ve zamanlama farkı büyüdüğünde ilişkiye kısa sürede yansır.';
    if (band === 'medium') return 'Zorlayıcı tarafı var; beklentiler konuşulmadığında kırgınlık sessizce birikebilir.';
    return 'Bu açı sürekli sorun çıkarmaz; çoğu zaman duygusal tempo dağıldığında etkisini belli eder.';
  }

  if (relationshipType === 'work') {
    if (supportive) {
      if (band === 'exact') return 'Orb çok yakın; karar alma ve görev paylaşımında birbirinizin hızına çabuk uyumlanabilirsiniz.';
      if (band === 'close') return 'Bu destek iletişim netliği ve iş akışında kısa sürede verim üretir.';
      if (band === 'medium') return 'Çalışma potansiyeli güçlü; roller netleştikçe işbirliği daha akıcı hale gelir.';
      return 'Bu etki arka planda çalışır; yapı kurulduğunda ekip hissini sessizce güçlendirir.';
    }

    if (band === 'exact') return 'Orb çok yakın; karar anı, eleştiri tonu ve iş yükü paylaşımı aynı anda gerilim yaratabilir.';
    if (band === 'close') return 'Bu sürtünme hız, sorumluluk ve iletişim tarzı ayrıştığında çabuk sertleşir.';
    if (band === 'medium') return 'Zorlayıcı tarafı var; süreç belirsiz kaldığında iyi niyet bile dağınık okunabilir.';
    return 'Bu açı her gün sorun üretmez; baskı arttığında ve roller bulanıklaştığında daha belirginleşir.';
  }

  if (relationshipType === 'friend') {
    if (supportive) {
      if (band === 'exact') return 'Orb çok yakın; sohbet, temas ve karşılıklı destek tarafında kolayca sıcak bir ritim kurabilirsiniz.';
      if (band === 'close') return 'Bu etki birlikte keyif alma, haberleşme ve birbirini kollama tarafında hızlı çalışır.';
      if (band === 'medium') return 'Arkadaşlık potansiyeli açık; sadakat ve iletişim net kaldığında bağ daha rahat oturur.';
      return 'Bu etki sürekli önde durmaz; temas korundukça arkadaşlığın omurgasını sessizce besler.';
    }

    if (band === 'exact') return 'Orb çok yakın; öncelik verme, haberleşme sıklığı ve sadakat tanımı kısa sürede hassas noktaya dönebilir.';
    if (band === 'close') return 'Bu sürtünme biri daha yakın, diğeri daha serbest kalmak istediğinde çabuk hissedilir.';
    if (band === 'medium') return 'Zorlayıcı tarafı var; temas ve beklenti açık konuşulmadığında yanlış okuma artar.';
    return 'Bu açı sürekli baskı yaratmaz; bağın ritmi bozulduğunda kırılgan tarafı daha çabuk açılır.';
  }

  if (relationshipType === 'family') {
    if (supportive) {
      if (band === 'exact') return 'Orb çok yakın; hassasiyet tonu, bakım dili ve yük paylaşımı tarafında birbirinizi çabuk anlayabilirsiniz.';
      if (band === 'close') return 'Bu etki ev içi ritim, anlayış ve duygusal destek tarafında kısa sürede güven toplar.';
      if (band === 'medium') return 'Aile bağı için sağlam bir zemin var; sorumluluklar görünür kaldıkça denge kolay kurulur.';
      return 'Bu destek arka planda çalışır; doğru sınırlar kurulduğunda ilişkiyi sessizce toparlar.';
    }

    if (band === 'exact') return 'Orb çok yakın; yük paylaşımı, hassasiyet tonu ve sessiz beklentiler aynı anda kırılgan hale gelebilir.';
    if (band === 'close') return 'Bu sürtünme biri daha çok taşırken diğeri bunu geç fark ettiğinde hızlıca birikir.';
    if (band === 'medium') return 'Zorlayıcı tarafı var; sorumluluk konuşulmadığında ya da kırgınlık içe atıldığında mesafe yaratabilir.';
    return 'Bu açı sürekli baskı yaratmaz; yük ve duygu paylaşımı dengesizleştiğinde etkisini daha net gösterir.';
  }

  if (supportive) {
    if (band === 'exact') return 'Orb çok yakın; rekabet çizgisi net kaldığında strateji ve tempo tarafında hızlı avantaj üretebilir.';
    if (band === 'close') return 'Bu etki baskı altında soğukkanlı kalma ve doğru hamleyi seçme becerisini çabuk toplar.';
    if (band === 'medium') return 'Rekabet tarafında yapıcı bir potansiyel var; sınırlar net tutulduğunda daha verimli işler.';
    return 'Bu destek her an görünmez; kurallar baştan netse performansı sessizce yukarı taşır.';
  }

  if (band === 'exact') return 'Orb çok yakın; baskı anı, güç kullanımı ve hata toleransı aynı anda sertleşebilir.';
  if (band === 'close') return 'Bu sürtünme tempo, çerçeve ve güç kullanma biçimi ayrıştığında hızlıca yükselir.';
  if (band === 'medium') return 'Zorlayıcı tarafı var; rekabet kişiselleştiğinde ya da sınırlar bulanıklaştığında oyun sertleşir.';
  return 'Bu açı sürekli çatışma üretmez; baskı yükseldiğinde rekabet çizgisini beklenenden hızlı keskinleştirebilir.';
}

function aspectMechanismSentence(aspectCode: AspectCode, supportive: boolean): string {
  if (aspectCode === 'TRINE') {
    return 'Üçgen açı olduğu için taraflar birbirini düzeltmeye çalışmadan da rahatlık bulabilir.';
  }
  if (aspectCode === 'SEXTILE') {
    return 'Altmışlık açı bu bağı kendiliğinden değil, bilinçli kullanıldığında daha verimli çalıştırır.';
  }
  if (aspectCode === 'CONJUNCTION') {
    return supportive
      ? 'Kavuşum etkisi bu temayı tek bir hatta topladığı için yakınlık hızla güç kazanır.'
      : 'Kavuşum etkisi bu temayı tek bir hatta topladığı için gerilim çıktığında yoğunluk bir anda büyüyebilir.';
  }
  if (aspectCode === 'SQUARE') {
    return 'Kare açı aynı konuya iki farklı refleks bindirdiği için sürtünme kolay tetiklenir.';
  }
  if (aspectCode === 'OPPOSITION') {
    return 'Karşıt açı tarafları birbirine çekerken aynı anda karşı kutuplara da yerleştirebilir.';
  }
  return supportive
    ? 'Bu açı, doğru kullanıldığında tarafların birbirini daha rahat tamamlamasını sağlar.'
    : 'Bu açı, aynı konuda farklı baskılar oluşturduğu için yanlış okuma ve sertleşme riskini artırır.';
}

function modulePracticalArea(relationshipType: RelationshipType): string {
  if (relationshipType === 'love') return 'yakınlık, güven ve kırgınlık sonrası toparlanma';
  if (relationshipType === 'work') return 'görev paylaşımı, karar anları ve iletişim tonu';
  if (relationshipType === 'friend') return 'temas sıklığı, sadakat tanımı ve birlikte keyif alma';
  if (relationshipType === 'family') return 'yük paylaşımı, hassasiyet tonu ve ev içi düzen';
  return 'rekabet çizgisi, baskı anları ve güç kullanma biçimi';
}

function planetActionPhrase(planet: PlanetCode): string {
  if (planet === 'SUN') return 'kendini daha görünür ve net ortaya koyduğunda';
  if (planet === 'MOON') return 'duygusal güven arayıp iç ritmine çekildiğinde';
  if (planet === 'MERCURY') return 'konuyu konuşarak açmak istediğinde';
  if (planet === 'VENUS') return 'yakınlığı daha yumuşak ve sıcak göstermeye çalıştığında';
  if (planet === 'MARS') return 'hızlı tepki verip işi harekete dökmek istediğinde';
  if (planet === 'JUPITER') return 'meseleyi büyütüp daha cesur ve iyimser davrandığında';
  if (planet === 'SATURN') return 'çerçeve, sınır ve ciddiyet koyduğunda';
  if (planet === 'URANUS') return 'alan açıp kalıbı bozmak istediğinde';
  if (planet === 'NEPTUNE') return 'sezgiye ve akışa daha çok güvendiğinde';
  if (planet === 'PLUTO') return 'konuya yoğunlaşıp kontrolü elde tutmaya yöneldiğinde';
  if (planet === 'CHIRON') return 'hassas yere temas edip onarmaya çalıştığında';
  return 'konuya kendi tarzıyla yaklaştığında';
}

function positiveReceptionPhrase(planet: PlanetCode): string {
  if (planet === 'SUN') return 'daha net, güçlü ve desteklenmiş hissedebilir';
  if (planet === 'MOON') return 'daha güvende ve anlaşılmış hissedebilir';
  if (planet === 'MERCURY') return 'konuyu daha kolay anlamlandırabilir';
  if (planet === 'VENUS') return 'yakınlığı daha rahat alabilir';
  if (planet === 'MARS') return 'hareket etmek için net bir itki bulabilir';
  if (planet === 'JUPITER') return 'daha umutlu ve açık bir tavır geliştirebilir';
  if (planet === 'SATURN') return 'daha yapılandırılmış ve güvende kalabilir';
  if (planet === 'URANUS') return 'daha serbest ve canlı hissedebilir';
  if (planet === 'NEPTUNE') return 'daha yumuşak ve sezgisel bağ kurabilir';
  if (planet === 'PLUTO') return 'daha derin ve kararlı bağlanabilir';
  if (planet === 'CHIRON') return 'iyileştirici bir temas yakalayabilir';
  return 'bunu daha rahat karşılayabilir';
}

function negativeReceptionPhrase(planet: PlanetCode): string {
  if (planet === 'SUN') return 'kendisine meydan okunuyormuş gibi algılayabilir';
  if (planet === 'MOON') return 'duygusal olarak geri çekilebilir';
  if (planet === 'MERCURY') return 'yanlış anlaşıldığını düşünüp savunmaya geçebilir';
  if (planet === 'VENUS') return 'yakınlığı soğuk ya da uyumsuz bulabilir';
  if (planet === 'MARS') return 'tepkiyi sertleştirip hızlanabilir';
  if (planet === 'JUPITER') return 'konuyu gereğinden fazla büyütebilir';
  if (planet === 'SATURN') return 'daha da katılaşıp mesafe koyabilir';
  if (planet === 'URANUS') return 'ani kopuş ya da soğuma gösterebilir';
  if (planet === 'NEPTUNE') return 'belirsizleşip kaçınmaya yönelebilir';
  if (planet === 'PLUTO') return 'güç mücadelesine çekilebilir';
  if (planet === 'CHIRON') return 'eski incinmeleri yeniden yaşayabilir';
  return 'bunu zorlayıcı okuyabilir';
}

function planetCoreMeaning(planet: PlanetCode): string {
  if (planet === 'SUN') return 'kimlik duygusu, görünür olma biçimi ve yaşam yönü';
  if (planet === 'MOON') return 'duygusal güvenlik ihtiyacı, alışkanlıklar ve iç ritim';
  if (planet === 'MERCURY') return 'iletişim tarzı, zihinsel tempo ve anlam kurma şekli';
  if (planet === 'VENUS') return 'yakınlık dili, beğeni, zevkler ve ilişki estetiği';
  if (planet === 'MARS') return 'hareket tarzı, öfke eşiği, arzu ve tepki hızı';
  if (planet === 'JUPITER') return 'büyüme isteği, umut, cömertlik ve genişleme eğilimi';
  if (planet === 'SATURN') return 'sınırlar, sorumluluk, kontrol ve zamanlama duygusu';
  if (planet === 'URANUS') return 'özgürlük ihtiyacı, sürprizler ve kalıp bozma eğilimi';
  if (planet === 'NEPTUNE') return 'sezgi, idealizasyon, belirsizlik ve çözülme';
  if (planet === 'PLUTO') return 'yoğunluk, güç, kontrol ve derin dönüşüm';
  if (planet === 'CHIRON') return 'hassas nokta, incinme hafızası ve iyileşme ihtiyacı';
  return 'ilişkinin farklı çalışan bir parçası';
}

function planetBehavior(planet: PlanetCode): string {
  if (planet === 'SUN') return 'meseleyi görünür, net ve doğrudan ele almak';
  if (planet === 'MOON') return 'önce duygusal zemini yoklamak ve güven aramak';
  if (planet === 'MERCURY') return 'konuyu konuşarak, analiz ederek ve netleştirerek ilerlemek';
  if (planet === 'VENUS') return 'yumuşaklık, beğeni ve uyum üzerinden bağ kurmak';
  if (planet === 'MARS') return 'hızlı tepki verip harekete geçmek';
  if (planet === 'JUPITER') return 'meseleyi büyüterek, umutla ve geniş pencereden görmek';
  if (planet === 'SATURN') return 'ölçmek, beklemek ve kontrolü korumak';
  if (planet === 'URANUS') return 'özgür alan açmak ve kalıbı bozmak';
  if (planet === 'NEPTUNE') return 'sezgiyle ilerlemek ve sınırları esnetmek';
  if (planet === 'PLUTO') return 'derine inmek ve kontrolü elde tutmak';
  if (planet === 'CHIRON') return 'hassas noktaya temas edip onarmaya çalışmak';
  return 'konuya farklı bir yerden yaklaşmak';
}

function aspectAngleMeaning(aspectCode: AspectCode, supportive: boolean): string {
  if (aspectCode === 'TRINE') {
    return 'Üçgen açı, iki gezegenin birbirini zorlamadan beslediğini ve aynı dili daha doğal konuştuğunu gösterir.';
  }
  if (aspectCode === 'SEXTILE') {
    return 'Altmışlık açı, iyi bir potansiyel sunar; bu potansiyel bilinçli kullanıldığında ilişkiye açık avantaj getirir.';
  }
  if (aspectCode === 'CONJUNCTION') {
    return supportive
      ? 'Kavuşum, iki temayı tek hatta toplar; yakınlık doğru kullanılırsa güçlü bir birlik duygusu yaratır.'
      : 'Kavuşum, iki temayı aynı noktada yoğunlaştırır; bu yüzden etki güçlüdür ve sınır iyi kurulmazsa bunaltıcı hale gelebilir.';
  }
  if (aspectCode === 'SQUARE') {
    return 'Kare açı, iki ihtiyacın aynı anda alan istemesine neden olur; hareket yaratır ama kolayca sürtünmeye dönebilir.';
  }
  if (aspectCode === 'OPPOSITION') {
    return 'Karşıt açı, çekim ile zıtlık duygusunu birlikte taşır; taraflar birbirini tamamlamak isterken kolayca kutuplaşabilir.';
  }
  return supportive
    ? 'Bu açı iki farklı temanın birbirini destekleyecek bir düzen kurabildiğini gösterir.'
    : 'Bu açı iki farklı temanın aynı konuda farklı baskılar ürettiğini gösterir.';
}

function moduleManifestationFrame(relationshipType: RelationshipType, supportive: boolean): string {
  if (relationshipType === 'love') {
    return supportive
      ? 'Bu, yakınlık kurma biçimi, kırgınlık sonrası toparlanma ve sevgi dilinde doğal bir akış sağlayabilir.'
      : 'Bu, yakınlık dozu, güven beklentisi ve kırgınlık ritminde farklı okumalara neden olabilir.';
  }
  if (relationshipType === 'work') {
    return supportive
      ? 'Bu, görev paylaşımı, karar alma ve iletişimde işlevsel bir düzen kurmayı kolaylaştırır.'
      : 'Bu, görev sahipliği, karar hızı ve eleştiri tonu yüzünden işi kişiselleştirme riskini artırır.';
  }
  if (relationshipType === 'friend') {
    return supportive
      ? 'Bu, sohbetin akmasını, birlikte keyif üretmeyi ve destek vermeyi daha rahat hale getirir.'
      : 'Bu, öncelik verme, haberleşme sıklığı ve sadakat tanımında sessiz kırılmalara yol açabilir.';
  }
  if (relationshipType === 'family') {
    return supportive
      ? 'Bu, ev içi ritmi, bakım dilini ve sorumluluk paylaşımını daha yumuşak hale getirir.'
      : 'Bu, hassasiyet tonu, yük paylaşımı ve sessiz beklentilerin birikmesi üzerinden zorlayabilir.';
  }
  return supportive
    ? 'Bu, rekabet çizgisi korunduğunda strateji ve tempoyu birbirini keskinleştiren bir avantaja çevirebilir.'
    : 'Bu, baskı arttığında hata payını, güç mücadelesini ve sertleşen dili daha hızlı büyütebilir.';
}

function moduleAdviceFrame(relationshipType: RelationshipType, supportive: boolean): string {
  if (relationshipType === 'love') {
    return supportive
      ? 'İyi gelen davranışları varsayımda bırakmayıp görünür kılmanız bu uyumu kalıcılaştırır.'
      : 'Tetik anında kimin neye daraldığını isimlendirip sonra çözüm konuşmanız yıpranmayı azaltır.';
  }
  if (relationshipType === 'work') {
    return supportive
      ? 'İşleyen düzeni kısa ve yazılı bir çerçeveye dökmeniz bu avantajı sürdürülebilir kılar.'
      : 'Görev, süre ve karar sahibini baştan ayırmanız gereksiz sertliği belirgin biçimde düşürür.';
  }
  if (relationshipType === 'friend') {
    return supportive
      ? 'Temas sıklığı ve destek beklentisini görünür tutmanız arkadaşlığı daha güvenli hale getirir.'
      : 'Varsayım yerine açık cümle kurmanız küçük kırgınlıkların sessizce büyümesini engeller.';
  }
  if (relationshipType === 'family') {
    return supportive
      ? 'Ev içi ritmi küçük ama düzenli konuşmalarla güncellemeniz sıcaklığı korur.'
      : 'Yük paylaşımını görünür hale getirmeniz sessiz yorgunluk ve kırgınlığı azaltır.';
  }
  return supportive
    ? 'Kuralları baştan netleştirmeniz bu gücü verimli rekabete çevirmeyi kolaylaştırır.'
    : 'Baskı anı için önceden belirlenmiş bir karar protokolü kurmanız hatayı ve sertleşmeyi azaltır.';
}

function buildGenericTechnicalInterpretation(params: {
  leftPlanetCode: PlanetCode;
  rightPlanetCode: PlanetCode;
  leftPlanet: string;
  rightPlanet: string;
  leftDisplay: string;
  rightDisplay: string;
  supportive: boolean;
  relationshipType: RelationshipType;
  aspectCode: AspectCode;
  orb: number;
}): TechnicalInterpretation {
  const {
    leftPlanetCode,
    rightPlanetCode,
    leftPlanet,
    rightPlanet,
    leftDisplay,
    rightDisplay,
    supportive,
    relationshipType,
    aspectCode,
    orb,
  } = params;

  return {
    shortInterpretation: supportive
      ? `Biriniz ${planetActionPhrase(leftPlanetCode)}, diğeriniz bunu daha rahat karşılayabildiği için aradaki temas daha kolay yumuşayabilir.`
      : `Biriniz ${planetActionPhrase(leftPlanetCode)}, diğeriniz bunu daha zorlayıcı okuyabildiği için aradaki gerilim çabuk yükselebilir.`,
    comparisonInsight: supportive
      ? `${leftDisplay} ${planetActionPhrase(leftPlanetCode)}, ${rightDisplay} bunu tehdit değil ilişkiyi taşıyan bir sinyal gibi okuyabilir ve ${positiveReceptionPhrase(rightPlanetCode)}. ${aspectMechanismSentence(aspectCode, true)}`
      : `${leftDisplay} ${planetActionPhrase(leftPlanetCode)}, ${rightDisplay} bunu kolayca ${negativeReceptionPhrase(rightPlanetCode)}. ${aspectMechanismSentence(aspectCode, false)}`,
    practicalMeaning: supportive
      ? `Bu etki özellikle ${modulePracticalArea(relationshipType)} konularında ilişkiye daha az savunma, daha fazla açıklık getirebilir.`
      : `Bu etki özellikle ${modulePracticalArea(relationshipType)} konularında küçük farkların hızlıca yanlış okumaya dönmesine neden olabilir.`,
    technicalKey: supportive
      ? `${leftPlanet} tarafının getirdiği vurgu, ${rightPlanet} tarafının doğal ihtiyacında daha rahat karşılık buluyor.`
      : `${leftPlanet} tarafının baskısı ile ${rightPlanet} tarafının ihtiyacı aynı anda öne çıktığında sürtünme büyüyebiliyor.`,
    usageHint: moduleAdviceFrame(relationshipType, supportive),
    orbLabel: buildOrbLabel(orb),
    orbMicrocopy: buildOrbMicrocopy(orb, supportive, relationshipType),
    orbInsight: buildOrbInsight(orb),
  };
}

function buildSpecificTechnicalInterpretation(params: {
  pairKey: string;
  supportive: boolean;
  relationshipType: RelationshipType;
  leftDisplay: string;
  rightDisplay: string;
  aspectCode: AspectCode;
  orb: number;
}): TechnicalInterpretation | null {
  const { pairKey, supportive, relationshipType, leftDisplay, rightDisplay, aspectCode, orb } = params;
  const orbLabel = buildOrbLabel(orb);
  const orbInsight = buildOrbInsight(orb);
  const mechanism = aspectMechanismSentence(aspectCode, supportive);

  switch (pairKey) {
    case 'MOON_SUN':
      if (supportive) {
        return {
          shortInterpretation:
            'Bir taraf kendini doğal biçimde ifade ettiğinde, diğer taraf bunu duygusal olarak daha rahat kabul edebiliyor.',
          comparisonInsight:
            `${leftDisplay} daha görünür ve net davrandığında ${rightDisplay} bunu tehdit değil, yakınlık kuran bir tavır gibi okuyabilir. ${mechanism}`,
          practicalMeaning:
            'Birlikteyken anlaşılmış hissetmek kolaylaşır; küçük kırılmalar da daha hızlı yumuşayabilir.',
          technicalKey:
            'Kendini ortaya koyma biçimi ile duygusal ihtiyaçlar birbirini daha kolay karşılıyor.',
          usageHint:
            'Bu açının gücü, duyguları ve beklentileri açık konuştuğunuzda daha da belirginleşir.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Bir taraf yön vermek isterken, diğer taraf önce duygusal olarak güvende olup olmadığını tartabilir.',
        comparisonInsight:
          `${leftDisplay} meseleyi daha net ve dışarıdan çözmek isterken ${rightDisplay} önce içeride ne hissettiğine bakabilir. ${mechanism}`,
        practicalMeaning:
          'Karar anları ve hassas konuşmalar biri için netlik, diğeri için baskı gibi yaşanabilir.',
        technicalKey:
          'Yön verme isteği ile duygusal güvenlik arayışı aynı anda yükseldiğinde sürtünme oluşur.',
        usageHint:
          'Önce duygusal zemini yumuşatıp sonra karar konuşmanız bu açının sert tarafını belirgin biçimde azaltır.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'SUN_VENUS':
      if (supportive) {
        return {
          shortInterpretation:
            'Birinizin varlığı ve tavrı, diğerinizde kolayca beğeni ve sıcaklık uyandırabiliyor.',
          comparisonInsight:
            `${leftDisplay} kendini daha görünür ifade ettiğinde ${rightDisplay} bunu takdir ve yakınlık olarak almakta zorlanmaz. ${mechanism}`,
          practicalMeaning:
            'İltifat, küçük jestler ve görünür ilgi bu bağda çoğu zaman karşılıksız kalmaz.',
          technicalKey:
            'Görünür ilgi ile alınan sevgi dili aynı yönde aktığında bağ kurmak kolaylaşır.',
          usageHint:
            'Bu etkiyi büyütmek için takdiri yalnız hissetmekle bırakmayın, görünür hale getirin.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Birinizin görünür olma biçimi, diğerinizin sevgi ve estetik beklentisine tam oturmayabilir.',
        comparisonInsight:
          `${leftDisplay} daha doğrudan ilerlediğinde ${rightDisplay} bunu her zaman yakınlık olarak almayabilir; bazen ölçüsüz ya da kaba bulabilir. ${mechanism}`,
        practicalMeaning:
          'Çekim olsa bile takdir edilmediğini hissetmek veya sevgi dilini kaçırmak küçük kırgınlıkları büyütebilir.',
        technicalKey:
          'Görünür ifade ile alınan sevgi dili tam örtüşmediğinde sıcaklık kolayca yanlış okunur.',
        usageHint:
          'Hangi davranışın sizde sevgi, hangisinin sadece alışkanlık hissi yarattığını açıkça konuşmanız bu açıyı rahatlatır.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MARS_SUN':
      if (supportive) {
        return {
          shortInterpretation:
            'Biriniz yön verdiğinde, diğeriniz bunu harekete çevirmekte zorlanmayabilir.',
          comparisonInsight:
            `${leftDisplay} niyetini ortaya koyduğunda ${rightDisplay} çoğu zaman bunu bekletmeden aksiyona çevirebilir. ${mechanism}`,
          practicalMeaning:
            'Birlikte karar almak, iş başlatmak ve cesaret isteyen adımları atmak daha kolay hale gelebilir.',
          technicalKey:
            'İrade ile hareket enerjisi aynı tarafa baktığında ilişki doğal bir ivme kazanır.',
          usageHint:
            'Bu enerjiyi dağılmadan kullanmak için hedefi kısa ve net tutmanız coşkuyu sonuca çevirir.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Birinizin kendini ortaya koyma biçimi, diğerinizin tepki hızını kolayca tetikleyebilir.',
        comparisonInsight:
          `${leftDisplay} net olmak istediğinde ${rightDisplay} bunu meydan okuma gibi algılayıp sertleşebilir. ${mechanism}`,
        practicalMeaning:
          'Küçük bir fikir ayrılığı bile doğru yönetilmezse hızla güç mücadelesine dönebilir.',
        technicalKey:
          'İrade ve tepki aynı sertlikte buluştuğunda ilişki çok hızlı gerilebilir.',
        usageHint:
          'Bu açıda ilk tepkiyi değil, ikinci cümleyi yönetmek çatışmayı büyümeden tutar.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MOON_VENUS':
      if (supportive) {
        return {
          shortInterpretation:
            'Biriniz duygusal olarak açıldığında, diğeriniz bunu yumuşak ve şefkatli bir dille karşılayabiliyor.',
          comparisonInsight:
            `${leftDisplay} kırılganlığını görünür kıldığında ${rightDisplay} bunu geri çevirmek yerine çoğu zaman özenle karşılayabilir. ${mechanism}`,
          practicalMeaning:
            'Gönül alma, kırgınlık sonrası onarım ve küçük bakım jestleri ilişkide doğal bir yer bulabilir.',
          technicalKey:
            'Duygusal ihtiyaç ile sevgi gösterme biçimi aynı kapıdan geçebildiğinde yakınlık daha kolay kuruluyor.',
          usageHint:
            'Size iyi gelen bakım dilini küçümsemeyin; küçük ama görünür şefkat jestleri bu açının asıl gücüdür.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Birinizin sevgi gösterme biçimi, diğerinizin duygusal ihtiyacını tam karşılamayabilir.',
        comparisonInsight:
          `${leftDisplay} daha çok anlaşılmak isterken ${rightDisplay} durumu güzelleştirerek çözmeye çalışabilir; iyi niyet vardır ama ihtiyaç aynı değildir. ${mechanism}`,
        practicalMeaning:
          'Biri teselli beklerken diğeri jest sunabilir; bu da sevginin eksik değil, yanlış yerden geldiği hissini yaratabilir.',
        technicalKey:
          'Sevgi gösterme biçimi ile duygusal rahatlama ihtiyacı farklı çalıştığında sıcaklık boşa gidebilir.',
        usageHint:
          'Kimin teselli, kimin çözüm, kimin yalnız yakınlık istediğini konuşmanız bu açının sürtünmesini azaltır.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MARS_MOON':
      if (supportive) {
        return {
          shortInterpretation:
            'Biriniz duygusunu açtığında, diğeriniz bunu harekete geçmek için net bir işaret olarak alabiliyor.',
          comparisonInsight:
            `${leftDisplay} içten tepki verdiğinde ${rightDisplay} bunu bastırmak yerine cevaplanması gereken canlı bir sinyal gibi okuyabilir. ${mechanism}`,
          practicalMeaning:
            'İlişkide hisler bekletilmeden konuşulabilir, temas daha canlı kurulabilir ve enerji kolay düşmeyebilir.',
          technicalKey:
            'Duygusal tepki ile hareket etme dürtüsü birbirini hızlandırdığı için ilişki çabuk canlanır.',
          usageHint:
            'Bu hızlı bağı korurken yoğun anlarda kısa bir nefes aralığı bırakmanız gereksiz taşmayı önler.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Biriniz incindiğinde, diğerinizin tepki hızı durumu yatıştırmak yerine kolayca büyütebilir.',
        comparisonInsight:
          `${leftDisplay} kendini güvende hissetmediğinde geri çekilebilir; ${rightDisplay} ise bunu beklemeyip hemen tepkiyle karşılayabilir. ${mechanism}`,
        practicalMeaning:
          'Küçük bir kırgınlık hız, sertlik veya savunma yüzünden gereğinden büyük bir tartışmaya dönebilir.',
        technicalKey:
          'Kırılganlık ile tepki hızı aynı anda yükseldiğinde ilişki çabuk alev alır.',
        usageHint:
          'Önce duyguyu, sonra tepkiyi ayırmanız bu açının kavgaya açık tarafını belirgin biçimde yavaşlatır.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MERCURY_MERCURY':
      if (supportive) {
        return {
          shortInterpretation:
            'İki tarafın düşünme ve konuşma temposu birbirini yakalamakta zorlanmıyor.',
          comparisonInsight:
            `${leftDisplay} ile ${rightDisplay} aynı konuyu konuşurken birbirinin nereye varmak istediğini daha hızlı çözebilir. ${mechanism}`,
          practicalMeaning:
            'Yanlış anlaşılma tamamen bitmese de toparlanması kolaylaşır; açıklama ihtiyacı daha kısa sürede karşılık bulur.',
          technicalKey:
            'Zihinsel tempo ve anlam kurma biçimi benzeştiğinde iletişim daha az enerji harcar.',
          usageHint:
            'Önemli konuşmalarda kısa özet cümleler kullanmanız bu avantajı daha da görünür kılar.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Aynı konu konuşulsa bile iki taraf aynı cümleden farklı anlam çıkarabilir.',
        comparisonInsight:
          `${leftDisplay} daha hızlı sonuca gitmek isterken ${rightDisplay} daha fazla bağlam arayabilir; niyet doğru olsa da mesaj kayabilir. ${mechanism}`,
        practicalMeaning:
          'Tartışma çoğu zaman iletişimsizlikten değil, aynı kelimelere farklı anlam yüklenmesinden büyür.',
        technicalKey:
          'Kelimeler ortak görünse de zihinsel çerçeve farklı kaldığında iletişim yorulur.',
        usageHint:
          'Önemli başlıklarda “bundan ne anlıyorum” cümlesini açıkça kurmanız boşa giden konuşmayı ciddi biçimde azaltır.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MARS_MERCURY':
      if (supportive) {
        return {
          shortInterpretation:
            'Fikir ile eylem arasındaki geçiş hızlı olduğu için konuşmalar sonuç üretebilir.',
          comparisonInsight:
            `${leftDisplay} bir fikri ortaya koyduğunda ${rightDisplay} bunu yalnız yorumlamakla kalmayıp uygulamaya da taşıyabilir. ${mechanism}`,
          practicalMeaning:
            'Karar alıp ilerlemek kolaylaşır; konuşmaların havada kalma ihtimali azalır.',
          technicalKey:
            'Düşünce hızı ile harekete geçme dürtüsü aynı hatta buluştuğunda verim artar.',
          usageHint:
            'Bu hızın dağılmaması için önce hedefi, sonra yöntemi ayırmanız en iyi sonucu verir.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Konuşma sertleştiğinde söz ile tepki aynı anda yükselip gerilimi hızla büyütebilir.',
        comparisonInsight:
          `${leftDisplay} meseleyi daha keskin cümlelerle kurduğunda ${rightDisplay} bunu kişisel baskı gibi algılayıp sert karşılık verebilir. ${mechanism}`,
        practicalMeaning:
          'Haklı çıkma isteği konuşmanın önüne geçtiğinde tartışma çözüm üretmek yerine güç denemesine dönebilir.',
        technicalKey:
          'Düşünce ile tepki aynı sertlikte buluştuğunda iletişim hızla aşınır.',
        usageHint:
          'Ton yükseldiğinde önce konuyu daraltmanız, sonra tek cümlelik netlikle ilerlemeniz bu açıyı daha yönetilebilir kılar.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MERCURY_SATURN':
      if (supportive) {
        return {
          shortInterpretation:
            'Konuşmalar daha ölçülü, ciddi ve taşıyıcı bir çerçeveye oturabilir.',
          comparisonInsight:
            `${leftDisplay} yapı ve netlik getirdiğinde ${rightDisplay} bunu baskı değil, güven veren bir düzen olarak alabilir. ${mechanism}`,
          practicalMeaning:
            'Plan yapmak, sözünde durmak ve uzun vadeli kararları netleştirmek daha kolay olabilir.',
          technicalKey:
            'Zihinsel tempo yapı ve sorumlulukla desteklendiğinde ilişki daha sağlam bir omurga kazanır.',
          usageHint:
            'Kurulan düzeni ara ara gözden geçirmeniz, ciddiyetin soğukluğa dönüşmesini engeller.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Bir tarafın ciddiyeti, diğer taraf için eleştiri ya da baskı gibi duyulabilir.',
        comparisonInsight:
          `${leftDisplay} meseleyi daha kontrollü ve ölçülü konuşmak isterken ${rightDisplay} bunu mesafe, yargı veya geciktirme gibi okuyabilir. ${mechanism}`,
        practicalMeaning:
          'İyi niyetle kurulan sınır bile ton ağırlaştığında ilişkiye soğuma ve yetersizlik duygusu getirebilir.',
        technicalKey:
          'Netlik arayışı ile yargılanma hissi aynı anda yükseldiğinde iletişim ağırlaşır.',
        usageHint:
          'Haklı çıkmak yerine neyin net, neyin henüz taslak olduğunu ayırmanız bu açının baskısını azaltır.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MARS_VENUS':
      if (supportive) {
        return {
          shortInterpretation:
            'Çekim ile arzu hızlı karşılık bulduğu için ilişki kolay ısınabilir.',
          comparisonInsight:
            `${leftDisplay} daha çekici ve davetkar bir çizgi açtığında ${rightDisplay} buna canlı ve istekli biçimde cevap verebilir. ${mechanism}`,
          practicalMeaning:
            'Flört, oyun, tensel yakınlık ve karşılıklı merak daha doğal bir yer bulabilir.',
          technicalKey:
            'Beğeni ile istek aynı yönde yükseldiğinde ilişki güçlü bir kimya üretir.',
          usageHint:
            'Bu çekimi yalnız yoğun anlara bırakmayın; küçük oyunlar ve görünür takdir bağı daha canlı tutar.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Bir tarafın yakınlaşma hızı, diğer tarafın ilişki ritmine fazla hızlı gelebilir.',
        comparisonInsight:
          `${leftDisplay} daha hızlı ve doğrudan yakınlaşmak isterken ${rightDisplay} zamanlama, estetik ya da güven duygusuna daha fazla önem verebilir. ${mechanism}`,
        practicalMeaning:
          'Çekim yüksek olsa bile doz ve zamanlama konuşulmazsa biri baskı, diğeri reddedilme hissi yaşayabilir.',
        technicalKey:
          'Arzu temposu ile yakınlık ritmi aynı hızda işlemediğinde çekim kolayca sürtünmeye döner.',
        usageHint:
          'Yakınlıkta hız değil rıza ve ritim konuşmanız bu açının çekimini koruyup gerilimini azaltır.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'SATURN_VENUS':
      if (supportive) {
        return {
          shortInterpretation:
            'Yakınlık ile sadakat duygusu aynı anda güçlenebildiği için bağ daha dayanıklı kurulabilir.',
          comparisonInsight:
            `${leftDisplay} ilişkiyi daha ciddi ve sorumlu taşıdığında ${rightDisplay} bunu soğukluk yerine önemsenmek olarak okuyabilir. ${mechanism}`,
          practicalMeaning:
            'İlişkide kalıcılık, sözünde durma ve bağa sahip çıkma tarafı daha görünür hale gelebilir.',
          technicalKey:
            'Sevgi ile sorumluluk aynı yönde çalıştığında ilişki yalnız sıcak değil, dayanıklı da olur.',
          usageHint:
            'Ciddiyeti duygusuzluğa çevirmemek için sevgi dilini görünür tutmanız bu açının en önemli dengesidir.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Yakınlık isteği ile korunma refleksi aynı anda yükseldiğinde araya mesafe girebilir.',
        comparisonInsight:
          `${leftDisplay} daha fazla yakınlık teyidi ararken ${rightDisplay} zamanı ve kontrolü bırakmak istemeyebilir. ${mechanism}`,
        practicalMeaning:
          'Sevgi eksik olmasa da akış ağırlaştığında bir taraf geri çekilmeyi, diğeri ise daha çok güvence aramayı seçebilir.',
        technicalKey:
          'Yakınlık ihtiyacı ile korunma refleksi çatıştığında ilişki ağır ama kırılgan bir tona girer.',
        usageHint:
          'Gecikmeyi reddedilme gibi okumadan önce güveni neyin kurduğunu konuşmanız bu açının yükünü hafifletir.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MOON_SATURN':
      if (supportive) {
        return {
          shortInterpretation:
            'Duygular taşmadan tutulabildiği için ilişki zor zamanda bile omurga bulabilir.',
          comparisonInsight:
            `${leftDisplay} daha kırılgan hissettiğinde ${rightDisplay} bunu taşımak için sakin ve güven veren bir çerçeve sunabilir. ${mechanism}`,
          practicalMeaning:
            'Kriz anlarında panik yerine toparlayıcı tavır almak ve yükü birlikte taşımak daha kolay olabilir.',
          technicalKey:
            'Duygusal ihtiyaç yapı ve dayanıklılıkla karşılandığında ilişki güven veren bir omurga kazanır.',
          usageHint:
            'Dayanıklılığı duyguyu bastırmaya çevirmemek için hisleri yalnız kriz anında değil, sakin zamanda da konuşun.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Bir tarafın duygusal ihtiyacı, diğer taraf için yük ya da baskı gibi hissedilebilir.',
        comparisonInsight:
          `${leftDisplay} daha fazla duygusal karşılık ararken ${rightDisplay} sessizleşip yükü tek başına taşımayı seçebilir. ${mechanism}`,
        practicalMeaning:
          'Biri anlaşılmak isterken diğeri kontrolü kaybetmemek için geri çekildiğinde sessiz kırgınlık birikebilir.',
        technicalKey:
          'Duygusal ihtiyaç ile kontrol duygusu aynı anda yükseldiğinde ilişki ağırlaşır.',
        usageHint:
          'Sessiz dayanıklılığı sevgi kanıtı saymak yerine ihtiyaçları görünür kılmanız bu açıyı daha güvenli hale getirir.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MARS_SATURN':
      if (supportive) {
        return {
          shortInterpretation:
            'Hız ile disiplin doğru birleştiğinde ilişki hem güçlü hem de sürdürülebilir sonuç üretebilir.',
          comparisonInsight:
            `${leftDisplay} harekete geçmek istediğinde ${rightDisplay} buna tempo, süre ve çerçeve kazandırabilir. ${mechanism}`,
          practicalMeaning:
            'Hedef koymak, birlikte dayanmak ve uzun soluklu işleri yürütmek daha verimli olabilir.',
          technicalKey:
            'Hareket gücü ile sabır aynı plana bağlandığında ilişki dağılmadan ilerler.',
          usageHint:
            'Kısa hedefler ve net sorumluluk dağılımı bu açının en verimli çalışma biçimidir.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Bir taraf hızlanırken diğer taraf yavaşlatmak istediği için sabırsızlık ve blokaj hissi büyüyebilir.',
        comparisonInsight:
          `${leftDisplay} ilerlemek istediğinde ${rightDisplay} önce riski ölçmek, yavaşlatmak ya da durdurmak isteyebilir. ${mechanism}`,
        practicalMeaning:
          'İlişkide biri gaz verirken diğeri fren yaptığında konu içerikten çok tempo savaşına dönüşebilir.',
        technicalKey:
          'Hız ile kontrol aynı anda devreye girdiğinde ilişki gaz-fren çatışmasına girer.',
        usageHint:
          'Önce hız sınırını, sonra hedefi konuşmanız bu açının blokaj hissini daha işlevsel hale getirir.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'MARS_PLUTO':
      if (supportive) {
        return {
          shortInterpretation:
            'Yoğun enerji doğru yönlendirildiğinde ilişki güçlü bir dayanıklılık ve strateji üretebilir.',
          comparisonInsight:
            `${leftDisplay} ile ${rightDisplay} baskı altında kolay dağılmaz; zorlu koşullarda daha odaklı ve keskin bir mücadele gücü açabilir. ${mechanism}`,
          practicalMeaning:
            'Kriz anlarında geri adım atmamak, zor işleri taşımak ve stratejik kalmak daha kolay olabilir.',
          technicalKey:
            'Yoğunluk ve mücadele dürtüsü ortak hedefe bağlandığında ilişki yüksek dayanıklılık gösterir.',
          usageHint:
            'Bu yoğunluğu güç savaşına çevirmemek için hedefi ve sınırı baştan netleştirmeniz kritik önem taşır.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Güç, kontrol ve tepki aynı anda yükseldiğinde ilişki hızlıca sertleşebilir.',
        comparisonInsight:
          `${leftDisplay} ile ${rightDisplay} arasındaki gerilim bazen tek bir konu olmaktan çıkıp kimin geri adım atacağı meselesine dönebilir. ${mechanism}`,
        practicalMeaning:
          'Küçük bir sürtünme bile doğru yönetilmezse güç mücadelesi, inat ve kontrol savaşına dönüşebilir.',
        technicalKey:
          'Mücadele dürtüsü ile kontrol ihtiyacı birleştiğinde ilişki kolayca güç savaşına kayar.',
        usageHint:
          'Mesele ile egoyu erken ayırmanız bu açının yıpratıcı tarafını belirgin biçimde düşürür.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    case 'JUPITER_SUN':
      if (supportive) {
        return {
          shortInterpretation:
            'Bir tarafın yön duygusu, diğer tarafın umut ve geniş bakışıyla kolayca büyüyebilir.',
          comparisonInsight:
            `${leftDisplay} bir adım attığında ${rightDisplay} bunu küçültmek yerine cesaretlendiren ve alan açan tarafta kalabilir. ${mechanism}`,
          practicalMeaning:
            'Birbirinizi motive etmek, birlikte daha büyük düşünmek ve özgüveni artırmak daha doğal hale gelebilir.',
          technicalKey:
            'Görünür irade ile büyüme isteği aynı yönde ilerlediğinde ilişki birbirini cesaretlendirir.',
          usageHint:
            'İyimserliği korurken ölçüyü kaçırmamak için büyük hedefleri küçük adımlara bölmeniz bu açıyı daha verimli kullanır.',
          orbLabel,
          orbMicrocopy: buildOrbMicrocopy(orb, true, relationshipType),
          orbInsight,
        };
      }
      return {
        shortInterpretation:
          'Bir tarafın özgüveni ya da büyük bakışı, diğer taraf için abartı veya baskı gibi gelebilir.',
        comparisonInsight:
          `${leftDisplay} daha büyük, daha iddialı veya daha görünür davrandığında ${rightDisplay} bunu destek değil, ölçüsüzlük gibi okuyabilir. ${mechanism}`,
        practicalMeaning:
          'İyi niyetle yapılan teşvik bile zaman zaman sınır aşımı, kibir ya da abartı hissi yaratabilir.',
        technicalKey:
          'İrade ile büyüme isteği ölçüsüz birleştiğinde ilişki kolayca abartıya kayabilir.',
        usageHint:
          'Cesaret verirken sınırı, özgüveni yükseltirken gerçekliği korumanız bu açının taşmasını önler.',
        orbLabel,
        orbMicrocopy: buildOrbMicrocopy(orb, false, relationshipType),
        orbInsight,
      };
    default:
      return null;
  }
}

function buildTechnicalInterpretation(params: {
  aspect: CrossAspect;
  relationshipType: RelationshipType;
  leftName: string;
  rightName: string;
}): TechnicalInterpretation {
  const { aspect, relationshipType, leftName, rightName } = params;
  const leftPlanetCode = normalizePlanetCode(aspect.userPlanet);
  const rightPlanetCode = normalizePlanetCode(aspect.partnerPlanet);
  const leftPlanet = localizePlanet(aspect.userPlanet);
  const rightPlanet = localizePlanet(aspect.partnerPlanet);
  const supportive = Boolean(aspect.harmonious);
  const aspectCode = normalizeAspectCode(aspect.aspectType);
  const orb = Number((Number.isFinite(aspect.orb) ? aspect.orb : 2.4).toFixed(1));
  const leftDisplay = displayName(leftName, 'Bir taraf');
  const rightDisplay = displayName(rightName, 'diğer taraf');
  const pairKey = buildPairKey(leftPlanetCode, rightPlanetCode);

  return (
    buildSpecificTechnicalInterpretation({
      pairKey,
      supportive,
      relationshipType,
      leftDisplay,
      rightDisplay,
      aspectCode,
      orb,
    }) ??
    buildGenericTechnicalInterpretation({
      leftPlanetCode,
      rightPlanetCode,
      leftPlanet,
      rightPlanet,
      leftDisplay,
      rightDisplay,
      supportive,
      relationshipType,
      aspectCode,
      orb,
    })
  );
}

function mapSynastryToTechnicalAspects(
  synastry: SynastryResponse,
  relationshipType: RelationshipType,
  leftName: string,
  rightName: string,
): TechnicalAspectDTO[] {
  const aspects = Array.isArray(synastry.crossAspects) ? synastry.crossAspects : [];

  return aspects.slice(0, 20).map((aspect, index) => {
    const leftPlanet = localizePlanet(aspect.userPlanet);
    const rightPlanet = localizePlanet(aspect.partnerPlanet);
    const aspectName = `${leftPlanet} ${localizeAspectType(aspect.aspectType, aspect.aspectSymbol)} ${rightPlanet}`;
    const supportive = Boolean(aspect.harmonious);
    const interpretation = buildTechnicalInterpretation({
      aspect,
      relationshipType,
      leftName,
      rightName,
    });

    return {
      id: `tech-${index + 1}`,
      aspectName,
      type: supportive ? 'supportive' : 'challenging',
      orb: Number((Number.isFinite(aspect.orb) ? aspect.orb : 2.4).toFixed(1)),
      orbLabel: interpretation.orbLabel,
      orbMicrocopy: interpretation.orbMicrocopy,
      orbInsight: interpretation.orbInsight,
      themeGroup: inferThemeFromCrossAspect(aspect, relationshipType),
      shortInterpretation: interpretation.shortInterpretation,
      comparisonInsight: interpretation.comparisonInsight,
      practicalMeaning: interpretation.practicalMeaning,
      technicalKey: interpretation.technicalKey,
      usageHint: interpretation.usageHint,
      planets: [leftPlanet, rightPlanet],
      houses: [],
    };
  });
}

function toUserError(error: unknown): Error {
  const obj = asObject(error);
  const response = asObject(obj.response);
  const responseData = asObject(response.data);
  const message = asString(
    responseData.message,
    asString(obj.message, 'Uyum verisi yüklenemedi.'),
  );
  return new Error(message);
}

export function parseRelationshipTypeParam(
  value: string | string[] | undefined,
  fallback: RelationshipType = 'love',
): RelationshipType {
  const raw = Array.isArray(value) ? value[0] : value;
  return normalizeRelationshipType(raw, fallback);
}

export async function fetchComparison(
  input: FetchComparisonInput,
): Promise<FetchComparisonResult> {
  let normalized: ComparisonResponseDTO | null = null;
  let lastError: unknown = null;

  try {
    const response = await api.get<unknown>(`${COMPARE_BASE}/${input.matchId}/traits`, {
      params: {
        relationshipType: input.relationshipType.toUpperCase(),
        mode: 'comparison-v3',
      },
    });

    normalized = normalizeV3Response(response.data, input);
  } catch (error) {
    lastError = error;
  }

  try {
    const synastryResponse = await getSynastry(input.matchId);
    if (normalized) {
      const leftName = input.leftName || synastryResponse.data.personAName || '';
      const rightName = input.rightName || synastryResponse.data.personBName || '';
      normalized = {
        ...normalized,
        technicalAspects: mapSynastryToTechnicalAspects(
          synastryResponse.data,
          normalized.relationshipType,
          leftName,
          rightName,
        ),
      };
    }
  } catch (synastryError) {
    if (!normalized) {
      lastError = synastryError;
    }
  }

  if (normalized) {
    return {
      data: normalized,
      isMock: false,
    };
  }

  if (lastError) {
    throw toUserError(lastError);
  }

  throw new Error('Uyum verisi yüklenemedi.');
}
