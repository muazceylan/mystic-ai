import api from './api';
import {
  getSynastry,
  type CrossAspect,
  type SynastryResponse,
} from './synastry.service';
import type {
  CompareThemeSectionDTO,
  ComparisonCardDTO,
  ComparisonResponseDTO,
  Label,
  MiniCategoryScoreDTO,
  RelationshipType,
  TechnicalAspectDTO,
  ThemeGroup,
} from '../types/compare';

const COMPARE_BASE = '/api/v1/match';

const ALLOW_COMPARE_MOCK_FALLBACK =
  (process.env.EXPO_PUBLIC_COMPARE_ALLOW_MOCK_FALLBACK ?? 'true').toLowerCase() !== 'false';

const LABEL_PRIORITY: Record<Label, number> = {
  Dikkat: 0,
  Gelişim: 1,
  Uyumlu: 2,
};

const MAIN_TAB_TERM_REPLACEMENTS: Array<{ term: string; replacement: string }> = [
  { term: 'orb', replacement: 'yakınlık' },
  { term: 'kavuşum', replacement: 'yakın etkileşim' },
  { term: 'üçgen', replacement: 'uyumlu akış' },
  { term: 'kare', replacement: 'gerilim' },
  { term: 'açı', replacement: 'etkileşim' },
  { term: 'ev yerleşimi', replacement: 'yaşam alanı odağı' },
  { term: 'cross', replacement: '' },
  { term: 'dinamiklır', replacement: 'açılır' },
  { term: 'dynamiclir', replacement: 'açılır' },
];

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

const THEME_GROUP_ALIASES: Record<string, ThemeGroup> = {
  ASK: 'Aşk & Çekim',
  ASK_CEKIM: 'Aşk & Çekim',
  LOVE: 'Aşk & Çekim',
  CEKIM: 'Aşk & Çekim',
  ILETISIM: 'İletişim',
  COMMUNICATION: 'İletişim',
  GUVEN: 'Güven',
  TRUST: 'Güven',
  DUYGUSAL_TEMPO: 'Duygusal Tempo',
  EMOTIONAL_TEMPO: 'Duygusal Tempo',
  KARAR_PLAN: 'Karar & Plan',
  DECISION_PLAN: 'Karar & Plan',
  AILE_BAGI: 'Aile Bağı',
  FAMILY_BOND: 'Aile Bağı',
  DESTEK_SADAKAT: 'Destek & Sadakat',
  SUPPORT_LOYALTY: 'Destek & Sadakat',
  IS_BOLUMU: 'İş Bölümü',
  WORK_SPLIT: 'İş Bölümü',
  REKABET_STRATEJI: 'Rekabet & Strateji',
  RIVALRY_STRATEGY: 'Rekabet & Strateji',
  SINIRLAR: 'Sınırlar',
  BOUNDARIES: 'Sınırlar',
  KRIZI_YONETME: 'Krizi Yönetme',
  CRISIS_MANAGEMENT: 'Krizi Yönetme',
};

export const RELATIONSHIP_THEME_ORDER: Record<RelationshipType, ThemeGroup[]> = {
  love: ['Aşk & Çekim', 'İletişim', 'Güven', 'Duygusal Tempo', 'Karar & Plan'],
  work: ['İş Bölümü', 'İletişim', 'Karar & Plan', 'Krizi Yönetme', 'Güven'],
  friend: ['Destek & Sadakat', 'İletişim', 'Duygusal Tempo', 'Sınırlar', 'Güven'],
  family: ['Aile Bağı', 'Güven', 'Sınırlar', 'Duygusal Tempo', 'Karar & Plan'],
  rival: ['Rekabet & Strateji', 'Krizi Yönetme', 'Sınırlar', 'İletişim', 'Güven'],
};

export const RELATIONSHIP_MINI_CATEGORY_CONFIG: Record<
  RelationshipType,
  Array<{ id: string; label: string; themes: ThemeGroup[] }>
> = {
  love: [
    { id: 'love', label: 'Aşk', themes: ['Aşk & Çekim'] },
    { id: 'communication', label: 'İletişim', themes: ['İletişim'] },
    { id: 'trust', label: 'Güven', themes: ['Güven'] },
    { id: 'passion', label: 'Tutku', themes: ['Duygusal Tempo'] },
  ],
  work: [
    { id: 'efficiency', label: 'Verim', themes: ['İş Bölümü'] },
    { id: 'communication', label: 'İletişim', themes: ['İletişim'] },
    { id: 'planning', label: 'Plan', themes: ['Karar & Plan'] },
    { id: 'conflict', label: 'Çatışma', themes: ['Krizi Yönetme'] },
  ],
  friend: [
    { id: 'fun', label: 'Eğlence', themes: ['Duygusal Tempo'] },
    { id: 'support', label: 'Destek', themes: ['Destek & Sadakat'] },
    { id: 'communication', label: 'İletişim', themes: ['İletişim'] },
    { id: 'loyalty', label: 'Sadakat', themes: ['Güven'] },
  ],
  family: [
    { id: 'bond', label: 'Bağ', themes: ['Aile Bağı'] },
    { id: 'sensitivity', label: 'Hassasiyet', themes: ['Duygusal Tempo'] },
    { id: 'responsibility', label: 'Sorumluluk', themes: ['Karar & Plan'] },
    { id: 'boundaries', label: 'Sınırlar', themes: ['Sınırlar'] },
  ],
  rival: [
    { id: 'strategy', label: 'Strateji', themes: ['Rekabet & Strateji'] },
    { id: 'resilience', label: 'Dayanıklılık', themes: ['Krizi Yönetme'] },
    { id: 'trigger', label: 'Tetikleyici', themes: ['İletişim'] },
    { id: 'fairPlay', label: 'Adil Oyun', themes: ['Sınırlar'] },
  ],
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

interface ThemeTemplate {
  titles: string[];
  leftTraits: string[];
  rightTraits: string[];
  moments: string[];
  effects: string[];
  advices: string[];
  technicalAspects: Array<{ aspectName: string; planets: string[]; houses?: string[] }>;
}

interface RelationshipNarrativeProfile {
  headlineOptions: string[];
  summaryActionPhrases: string[];
  labelPlanByTheme: Partial<Record<ThemeGroup, Label[]>>;
}

interface MatchTraitsAxisPayload {
  id: string;
  leftLabel: string;
  rightLabel: string;
  score0to100: number | null;
  note?: string | null;
}

interface MatchTraitsCategoryPayload {
  id: string;
  title: string;
  items: MatchTraitsAxisPayload[];
}

interface MatchTraitsPayload {
  matchId: number;
  compatibilityScore: number | null;
  categories: MatchTraitsCategoryPayload[];
  cardAxes: MatchTraitsAxisPayload[];
  cardSummary?: string | null;
}

const AXIS_TITLE_MAP: Record<string, string> = {
  social_asocial: 'Sosyallik Dengesi',
  calm_energetic: 'Enerji Ritmi',
  direct_indirect: 'İfade Tarzı',
  logic_emotion_tone: 'Mantık ve Duygu Dili',
  expressive_hidden_emotions: 'Duyguyu Gösterme Biçimi',
  romantic_realistic: 'Yakınlık Beklentisi',
  spontaneous_planned: 'Planlama Ritmi',
  risk_cautious: 'Risk Yaklaşımı',
  tidy_relaxed: 'Düzen Esnekliği',
  routine_change: 'Rutin ve Değişim',
  closeness_space: 'Yakınlık ve Alan',
  possessive_freedom: 'Özgürlük Dengesi',
  frugal_spender: 'Kaynak Kullanımı',
  responsible_go_with_flow: 'Sorumluluk Akışı',
  adventure_comfort: 'Konfor ve Macera',
  playful_serious: 'Ciddiyet Dengesi',
};

const CATEGORY_THEME_MAP: Record<RelationshipType, Record<string, ThemeGroup>> = {
  love: {
    communication_style: 'İletişim',
    emotional_world: 'Aşk & Çekim',
    relationship_dynamics: 'Aşk & Çekim',
    decision_risk: 'Karar & Plan',
    social_energy: 'Duygusal Tempo',
    lifestyle_order: 'Karar & Plan',
    money_responsibility: 'Güven',
    fun_adventure: 'Duygusal Tempo',
  },
  work: {
    communication_style: 'İletişim',
    decision_risk: 'Karar & Plan',
    lifestyle_order: 'İş Bölümü',
    money_responsibility: 'İş Bölümü',
    social_energy: 'Krizi Yönetme',
    relationship_dynamics: 'Krizi Yönetme',
    emotional_world: 'Güven',
    fun_adventure: 'Krizi Yönetme',
  },
  friend: {
    communication_style: 'İletişim',
    social_energy: 'Duygusal Tempo',
    emotional_world: 'Destek & Sadakat',
    relationship_dynamics: 'Sınırlar',
    fun_adventure: 'Duygusal Tempo',
    decision_risk: 'Sınırlar',
    lifestyle_order: 'Sınırlar',
    money_responsibility: 'Güven',
  },
  family: {
    communication_style: 'Güven',
    emotional_world: 'Aile Bağı',
    relationship_dynamics: 'Sınırlar',
    decision_risk: 'Karar & Plan',
    lifestyle_order: 'Karar & Plan',
    money_responsibility: 'Karar & Plan',
    social_energy: 'Duygusal Tempo',
    fun_adventure: 'Aile Bağı',
  },
  rival: {
    communication_style: 'İletişim',
    decision_risk: 'Rekabet & Strateji',
    relationship_dynamics: 'Rekabet & Strateji',
    lifestyle_order: 'Krizi Yönetme',
    money_responsibility: 'Rekabet & Strateji',
    social_energy: 'Krizi Yönetme',
    emotional_world: 'Sınırlar',
    fun_adventure: 'Krizi Yönetme',
  },
};

const AXIS_THEME_OVERRIDES: Partial<
  Record<string, Partial<Record<RelationshipType, ThemeGroup>>>
> = {
  direct_indirect: {
    family: 'İletişim',
  },
  logic_emotion_tone: {
    family: 'Duygusal Tempo',
    rival: 'Krizi Yönetme',
  },
  closeness_space: {
    family: 'Sınırlar',
    rival: 'Sınırlar',
  },
  romantic_realistic: {
    work: 'Güven',
    rival: 'Sınırlar',
  },
  playful_serious: {
    work: 'Krizi Yönetme',
    family: 'Aile Bağı',
  },
};

const THEME_TEMPLATES: Record<ThemeGroup, ThemeTemplate> = {
  'Aşk & Çekim': {
    titles: ['Yakınlık Beklentisi', 'Çekim Dili', 'Romantik Akış', 'Şefkat Teması'],
    leftTraits: [
      'yakınlığı sözle güçlendirmek ister',
      'ilgiyi açıkça göstermeyi sever',
      'romantik jestleri hızlı başlatır',
      'duyguyu görünür kılmayı önemser',
    ],
    rightTraits: [
      'yakınlığı sakin anlarda derinleştirir',
      'duyguyu önce içinde toparlar',
      'davranış sürekliliğiyle bağ kurar',
      'alanı koruyarak yakınlaşır',
    ],
    moments: ['yoğun günlerin ardından', 'beklenti konuşmalarında', 'planlar değiştiğinde', 'duygular hızlı yükseldiğinde'],
    effects: ['tempo farkı yaratabilir', 'yakınlık dozunu konuşma ihtiyacı doğurabilir', 'anlaşılmama hissi bırakabilir', 'ritim ayarı gerektirebilir'],
    advices: [
      'Öneri: Güne 5 dakikalık net bir yakınlık check-in’i ile başlayın.',
      'Öneri: Duyguyu söyleyip ardından tek bir beklentiyi netleştirin.',
      'Öneri: Haftada bir kez sadece ikinize ait plansız zaman açın.',
      'Öneri: Yakınlık konuşmalarında “önce duygu, sonra çözüm” sırasını izleyin.',
    ],
    technicalAspects: [
      { aspectName: 'Venüs △ Ay', planets: ['Venüs', 'Ay'], houses: ['5. Ev', '4. Ev'] },
      { aspectName: 'Güneş ☌ Venüs', planets: ['Güneş', 'Venüs'], houses: ['1. Ev', '7. Ev'] },
      { aspectName: 'Mars □ Ay', planets: ['Mars', 'Ay'], houses: ['8. Ev', '4. Ev'] },
      { aspectName: 'Ay ✶ Jüpiter', planets: ['Ay', 'Jüpiter'], houses: ['4. Ev', '9. Ev'] },
    ],
  },
  'İletişim': {
    titles: ['İfade Tarzı', 'Dinleme Dengesi', 'Konu Açma Biçimi', 'Netlik Ritimleri'],
    leftTraits: ['konuyu hızlı netleştirir', 'direkt ve kısa cümle kurar', 'soruyu doğrudan sorar', 'geri bildirimde net olur'],
    rightTraits: ['düşünerek ve katmanlı ifade eder', 'önce dinleyip sonra cevap verir', 'yansıtarak konuşur', 'duyguyu dolaylı anlatır'],
    moments: ['hızlı karar anlarında', 'yanlış anlaşılma yaşandığında', 'telefon mesajlaşmalarında', 'yorgunken iletişim kurulduğunda'],
    effects: ['konuşma temposunu bölebilir', 'aynı cümlenin farklı algılanmasına yol açabilir', 'niyeti kaçırma riski yaratabilir', 'daha fazla netleştirme ihtiyacı doğurabilir'],
    advices: [
      'Öneri: Konuşmaya başlamadan hedefi tek cümleyle belirtin.',
      'Öneri: Kritik konularda “tek soru - tek cevap” turu yapın.',
      'Öneri: Mesajlaşma yerine kısa bir sesli konuşmayı tercih edin.',
      'Öneri: Konuşma sonunda duyduğunuzu bir cümleyle geri yansıtın.',
    ],
    technicalAspects: [
      { aspectName: 'Merkür △ Kiron', planets: ['Merkür', 'Kiron'], houses: ['3. Ev', '11. Ev'] },
      { aspectName: 'Merkür ☍ Ay', planets: ['Merkür', 'Ay'], houses: ['3. Ev', '4. Ev'] },
      { aspectName: 'Merkür □ Mars', planets: ['Merkür', 'Mars'], houses: ['3. Ev', '8. Ev'] },
      { aspectName: 'Merkür ✶ Satürn', planets: ['Merkür', 'Satürn'], houses: ['3. Ev', '10. Ev'] },
    ],
  },
  'Güven': {
    titles: ['Güven Dili', 'Söz-Tutum Uyumu', 'Sadakat Beklentisi', 'Dayanıklılık Çerçevesi'],
    leftTraits: ['açık konuşmayı güven işareti görür', 'sözlerin takip edilmesini önemser', 'net sınırlarla rahat eder', 'belirsizlikte teyit ister'],
    rightTraits: ['davranış devamlılığıyla güvenir', 'sessiz destekle bağ kurar', 'zamanla derinleşen güven kurar', 'baskı hissetmeden açılır'],
    moments: ['belirsizlik dönemlerinde', 'rutin bozulduğunda', 'sözler ertelendiğinde', 'öncelikler değiştiğinde'],
    effects: ['güven dilinde farklı vurgu yaratabilir', 'beklenti hızını ayrıştırabilir', 'teyit ihtiyacını artırabilir', 'zamanlama farkı oluşturabilir'],
    advices: [
      'Öneri: Haftalık iki küçük söz verip mutlaka takip edin.',
      'Öneri: Güveni neyin artırdığını karşılıklı iki maddeyle yazın.',
      'Öneri: Belirsizlikte varsayım yerine net soru sormayı kural yapın.',
      'Öneri: Söz verilen konular için görünür bir mini plan tutun.',
    ],
    technicalAspects: [
      { aspectName: 'Satürn △ Venüs', planets: ['Satürn', 'Venüs'], houses: ['10. Ev', '7. Ev'] },
      { aspectName: 'Ay □ Satürn', planets: ['Ay', 'Satürn'], houses: ['4. Ev', '10. Ev'] },
      { aspectName: 'Güneş ✶ Satürn', planets: ['Güneş', 'Satürn'], houses: ['1. Ev', '10. Ev'] },
      { aspectName: 'Venüs ☍ Satürn', planets: ['Venüs', 'Satürn'], houses: ['7. Ev', '10. Ev'] },
    ],
  },
  'Duygusal Tempo': {
    titles: ['Duygu Hızı', 'Sakinleşme Süresi', 'Paylaşım Zamanı', 'Enerji Geçişi'],
    leftTraits: ['duyguyu anında paylaşır', 'hızlı toparlanmak ister', 'gerilimde konuşarak rahatlar', 'anlık tepki verir'],
    rightTraits: ['duyguyu içerde işlemeyi seçer', 'sakinleşince açılır', 'önce mesafe alıp sonra konuşur', 'geçiş için süre ister'],
    moments: ['tartışma sonrasında', 'yoğun iş günlerinde', 'beklenmedik değişimlerde', 'eşzamanlı talepler arttığında'],
    effects: ['ritim farkını görünür kılabilir', 'yanlış zamanlama hissi doğurabilir', 'duygusal yorgunluğu artırabilir', 'karşılıklı bekleme yaratabilir'],
    advices: [
      'Öneri: Yoğun anda 10 dakikalık sakin alan, sonra 10 dakikalık konuşma deneyin.',
      'Öneri: Duygu yükseldiğinde önce bedensel ritmi yavaşlatın, sonra konuyu açın.',
      'Öneri: Geç saat konuşmalarını ertesi güne kısa notla taşıyın.',
      'Öneri: Tartışma sonrası dönüş zamanı için ortak bir saat belirleyin.',
    ],
    technicalAspects: [
      { aspectName: 'Ay □ Mars', planets: ['Ay', 'Mars'], houses: ['4. Ev', '8. Ev'] },
      { aspectName: 'Ay △ Neptün', planets: ['Ay', 'Neptün'], houses: ['4. Ev', '12. Ev'] },
      { aspectName: 'Mars ☍ Ay', planets: ['Mars', 'Ay'], houses: ['8. Ev', '4. Ev'] },
      { aspectName: 'Ay ✶ Venüs', planets: ['Ay', 'Venüs'], houses: ['4. Ev', '7. Ev'] },
    ],
  },
  'Karar & Plan': {
    titles: ['Karar Ritmi', 'Planlama Tarzı', 'Öncelik Sırası', 'Uygulama Disiplini'],
    leftTraits: ['hızlı karar alır', 'ana resmi önce görür', 'kısa yoldan ilerlemek ister', 'adımı hızlı başlatır'],
    rightTraits: ['alternatifleri tartar', 'detayı adım adım inceler', 'riski azaltarak ilerler', 'zamanlamayı güvenceye alır'],
    moments: ['önemli seçimlerde', 'plan değiştirirken', 'sorumluluk paylaşımında', 'hedef baskısı arttığında'],
    effects: ['karar temposunda sürtünme yaratabilir', 'öncelik tartışmalarını uzatabilir', 'adım sırasını karıştırabilir', 'uygulama hızını ayrıştırabilir'],
    advices: [
      'Öneri: Kararı iki aşamada alın: önce yön, sonra detay.',
      'Öneri: Ortak plan için son tarih ve ilk adımı aynı cümlede netleştirin.',
      'Öneri: Büyük kararı 24 saatlik değerlendirme penceresiyle kapatın.',
      'Öneri: Her kararda bir “vazgeçme kriteri” belirleyin.',
    ],
    technicalAspects: [
      { aspectName: 'Mars △ Satürn', planets: ['Mars', 'Satürn'], houses: ['8. Ev', '10. Ev'] },
      { aspectName: 'Güneş □ Satürn', planets: ['Güneş', 'Satürn'], houses: ['1. Ev', '10. Ev'] },
      { aspectName: 'Merkür ✶ Mars', planets: ['Merkür', 'Mars'], houses: ['3. Ev', '8. Ev'] },
      { aspectName: 'Satürn ☍ Mars', planets: ['Satürn', 'Mars'], houses: ['10. Ev', '8. Ev'] },
    ],
  },
  'Aile Bağı': {
    titles: ['Aile Dili', 'Yakınlık Sınırı', 'Bakım Beklentisi', 'Gelenek ve Esneklik'],
    leftTraits: ['bağ hissini sık temasla güçlendirir', 'aile ritüellerini önemser', 'sorumluluğu hızlı üstlenir', 'yakınlıkta görünür ilgi ister'],
    rightTraits: ['bağı sakin ve sürdürülebilir kurar', 'alan bırakarak yakınlaşır', 'duygusal yükü adım adım taşır', 'güvenli alan oluşunca derinleşir'],
    moments: ['aile kararlarında', 'ziyaret planlarında', 'bakım sorumluluğu paylaşılırken', 'hassas konuşmalarda'],
    effects: ['yakınlık tanımını farklılaştırabilir', 'sorumluluk temposunu ayırabilir', 'gelenek-esneklik dengesini zorlayabilir', 'niyetin tekrar konuşulmasını gerektirebilir'],
    advices: [
      'Öneri: Aile beklentilerini “olmazsa olmaz” ve “esnek” diye ayırın.',
      'Öneri: Haftalık bakım görevlerini görünür biçimde paylaşın.',
      'Öneri: Hassas konuşma öncesi duygusal hazır oluşu teyit edin.',
      'Öneri: Aile planlarında yedek bir B senaryosu belirleyin.',
    ],
    technicalAspects: [
      { aspectName: 'Ay ☌ Ay', planets: ['Ay', 'Ay'], houses: ['4. Ev', '4. Ev'] },
      { aspectName: 'Ay △ Güneş', planets: ['Ay', 'Güneş'], houses: ['4. Ev', '1. Ev'] },
      { aspectName: 'Ay □ Merkür', planets: ['Ay', 'Merkür'], houses: ['4. Ev', '3. Ev'] },
      { aspectName: 'Satürn ✶ Ay', planets: ['Satürn', 'Ay'], houses: ['10. Ev', '4. Ev'] },
    ],
  },
  'Destek & Sadakat': {
    titles: ['Destek Biçimi', 'Yoldaşlık Dili', 'Sadakat Vurgusu', 'Omuz Omuz Ritmi'],
    leftTraits: ['desteği görünür eylemle verir', 'zor zamanda hızla yanında olur', 'sözünü tutarak bağ kurar', 'arkadaşlıkta netlik arar'],
    rightTraits: ['desteği sessiz ama sürekli sunar', 'dinleyerek güç verir', 'sadakati davranışta gösterir', 'alan tanıyarak yanında kalır'],
    moments: ['zor bir günün sonunda', 'yardım istenirken', 'ortak plan aksadığında', 'duygusal dalgalanma sırasında'],
    effects: ['destek dilinde ufak farklar yaratabilir', 'iyi niyeti görünmez kılabilir', 'beklentiyi tekrar tanımlamayı gerektirebilir', 'sadakat ifadesini çeşitlendirebilir'],
    advices: [
      'Öneri: Destek istediğinizde “neye ihtiyacım var” cümlesini açık söyleyin.',
      'Öneri: Haftada bir kısa “nasıl destek olayım?” sorusu sorun.',
      'Öneri: Arkadaşlıkta sınırları iyi niyetle baştan netleştirin.',
      'Öneri: Yapılan desteği görünür biçimde takdir edin.',
    ],
    technicalAspects: [
      { aspectName: 'Jüpiter △ Ay', planets: ['Jüpiter', 'Ay'], houses: ['11. Ev', '4. Ev'] },
      { aspectName: 'Venüs ✶ Jüpiter', planets: ['Venüs', 'Jüpiter'], houses: ['7. Ev', '11. Ev'] },
      { aspectName: 'Merkür □ Ay', planets: ['Merkür', 'Ay'], houses: ['3. Ev', '4. Ev'] },
      { aspectName: 'Satürn △ Merkür', planets: ['Satürn', 'Merkür'], houses: ['10. Ev', '3. Ev'] },
    ],
  },
  'İş Bölümü': {
    titles: ['Görev Paylaşımı', 'Sorumluluk Dağılımı', 'Rol Netliği', 'Operasyon Akışı'],
    leftTraits: ['işi hızla sahiplenir', 'hedef odaklı ilerler', 'kritik görevde kontrol almak ister', 'çözümü çabuk uygular'],
    rightTraits: ['işi planlayarak dağıtır', 'detayı dengeleyerek ilerler', 'riskleri önceden işaretler', 'süreçte kaliteyi korur'],
    moments: ['teslim tarihi yaklaşırken', 'iş yükü artarken', 'rol belirsizliğinde', 'öncelik çakışmasında'],
    effects: ['iş yapış temposunu ayrıştırabilir', 'rol beklentisini yeniden konuşma ihtiyacı doğurabilir', 'öncelik sırasını tartıştırabilir', 'takım içi senkron gerektirebilir'],
    advices: [
      'Öneri: Haftalık iş dağılımını tek ekranda görünür tutun.',
      'Öneri: Sorumlulukları “sahip”, “destek”, “takip” olarak ayırın.',
      'Öneri: Kritik işlerde teslim öncesi 10 dakikalık hizalama yapın.',
      'Öneri: Rol çatışmasında önce hedefi, sonra yöntemi konuşun.',
    ],
    technicalAspects: [
      { aspectName: 'Satürn △ Mars', planets: ['Satürn', 'Mars'], houses: ['10. Ev', '6. Ev'] },
      { aspectName: 'Merkür ✶ Satürn', planets: ['Merkür', 'Satürn'], houses: ['3. Ev', '10. Ev'] },
      { aspectName: 'Mars □ Satürn', planets: ['Mars', 'Satürn'], houses: ['6. Ev', '10. Ev'] },
      { aspectName: 'Güneş ✶ Merkür', planets: ['Güneş', 'Merkür'], houses: ['1. Ev', '3. Ev'] },
    ],
  },
  'Rekabet & Strateji': {
    titles: ['Rekabet Düzlemi', 'Strateji Farkı', 'Güç Kullanımı', 'Hamle Zamanı'],
    leftTraits: ['hamleyi erken yapar', 'rekabette görünür olmayı ister', 'hızlı üstünlük kurmak ister', 'risk alarak öne geçer'],
    rightTraits: ['hamleyi saklayarak planlar', 'uzun oyunu düşünür', 'savunmayı güçlendirerek ilerler', 'denge kurup sonra atak yapar'],
    moments: ['performans karşılaştırmalarında', 'kaynak paylaşımında', 'liderlik çekişmesinde', 'hata sonrası değerlendirmede'],
    effects: ['güç algısında gerilim yaratabilir', 'hamle zamanını tartıştırabilir', 'adil oyun sınırını netleştirme ihtiyacı doğurabilir', 'strateji çatışması doğurabilir'],
    advices: [
      'Öneri: Rekabette önce ortak kural setini yazılı hale getirin.',
      'Öneri: Hamle öncesi tek cümlelik amaç beyanı paylaşın.',
      'Öneri: Kazan-kaybet yerine “hangi metrikte yarışıyoruz”u netleştirin.',
      'Öneri: Tetiklenme anında 60 saniye durup hedefi yeniden söyleyin.',
    ],
    technicalAspects: [
      { aspectName: 'Mars □ Plüton', planets: ['Mars', 'Plüton'], houses: ['1. Ev', '10. Ev'] },
      { aspectName: 'Mars ☍ Satürn', planets: ['Mars', 'Satürn'], houses: ['1. Ev', '10. Ev'] },
      { aspectName: 'Güneş □ Mars', planets: ['Güneş', 'Mars'], houses: ['1. Ev', '6. Ev'] },
      { aspectName: 'Plüton △ Mars', planets: ['Plüton', 'Mars'], houses: ['8. Ev', '1. Ev'] },
    ],
  },
  'Sınırlar': {
    titles: ['Sınır Netliği', 'Alan İhtiyacı', 'Yakınlık Mesafesi', 'Kişisel Çerçeve'],
    leftTraits: ['sınırı baştan net koyar', 'kuralı açık duymak ister', 'yakın iletişimi sık kurar', 'hızlı geri dönüş bekler'],
    rightTraits: ['esnek sınırlarla ilerler', 'alanını koruyarak bağ kurar', 'dönüş için zaman ister', 'ihtiyaç olduğunda içe çekilir'],
    moments: ['yoğun takvim dönemlerinde', 'özel alan konuşmalarında', 'yanıt geciktiğinde', 'roller üst üste bindiğinde'],
    effects: ['mesafe algısını farklılaştırabilir', 'sınır çizgisini yeniden konuşmayı gerektirebilir', 'tempo uyuşmazlığı yaratabilir', 'yanıt beklentisini ayrıştırabilir'],
    advices: [
      'Öneri: Kişisel alan kurallarını kısa ve net üç maddeye indirin.',
      'Öneri: Cevap süresi beklentisini baştan birlikte belirleyin.',
      'Öneri: Sınır ihlali hissinde niyeti suçlamadan ifade edin.',
      'Öneri: Haftalık programda bireysel alan zamanını görünür işaretleyin.',
    ],
    technicalAspects: [
      { aspectName: 'Satürn □ Ay', planets: ['Satürn', 'Ay'], houses: ['10. Ev', '4. Ev'] },
      { aspectName: 'Uranüs ☍ Venüs', planets: ['Uranüs', 'Venüs'], houses: ['11. Ev', '7. Ev'] },
      { aspectName: 'Satürn △ Ay', planets: ['Satürn', 'Ay'], houses: ['10. Ev', '4. Ev'] },
      { aspectName: 'Neptün ✶ Ay', planets: ['Neptün', 'Ay'], houses: ['12. Ev', '4. Ev'] },
    ],
  },
  'Krizi Yönetme': {
    titles: ['Kriz Tepkisi', 'Gerilim Yönetimi', 'Onarım Hızı', 'Çözüm Adımı'],
    leftTraits: ['krizde hızlı aksiyon alır', 'konuyu hemen çözmek ister', 'duyguyu yükselmeden toparlamak ister', 'çatışmayı görünür konuşur'],
    rightTraits: ['krizde sakinleşip sonra konuşur', 'önce tabloyu izler sonra adım atar', 'duygunun yatışmasını bekler', 'çatışmayı daha yumuşak yönetir'],
    moments: ['ani anlaşmazlıklarda', 'yüksek baskı anlarında', 'hata sonrası konuşmada', 'üst üste gelen taleplerde'],
    effects: ['kriz hızını farklılaştırabilir', 'çözüm zamanlamasında ayrışma yaratabilir', 'onarım adımını geciktirebilir', 'gerilimi kişiselleştirme riskini artırabilir'],
    advices: [
      'Öneri: Kriz anında önce “durum, duygu, ihtiyaç” sırasını kullanın.',
      'Öneri: Tartışmayı tek başlıkla sınırlandırıp 15 dakikada kapatın.',
      'Öneri: Onarım için ertesi gün kısa follow-up zamanı açın.',
      'Öneri: Kriz konuşmalarında suçlama yerine etki cümlesi kurun.',
    ],
    technicalAspects: [
      { aspectName: 'Mars □ Ay', planets: ['Mars', 'Ay'], houses: ['8. Ev', '4. Ev'] },
      { aspectName: 'Satürn ☍ Merkür', planets: ['Satürn', 'Merkür'], houses: ['10. Ev', '3. Ev'] },
      { aspectName: 'Mars ✶ Satürn', planets: ['Mars', 'Satürn'], houses: ['8. Ev', '10. Ev'] },
      { aspectName: 'Merkür △ Plüton', planets: ['Merkür', 'Plüton'], houses: ['3. Ev', '8. Ev'] },
    ],
  },
};

const RELATIONSHIP_PROFILES: Record<RelationshipType, RelationshipNarrativeProfile> = {
  love: {
    headlineOptions: [
      'Yakınlık var, ritim ayarıyla daha da güçlenebilir',
      'Çekim güçlü, iletişim temposu yönetildiğinde akış artıyor',
      'Duygusal bağ yüksek; netlik ve alan dengesi belirleyici',
    ],
    summaryActionPhrases: [
      'Birlikte ritim konuştuğunuzda yakınlık kalitesi belirgin biçimde artar.',
      'Özellikle hassas anlarda kısa bir niyet cümlesi ilişkiyi yumuşatır.',
      'Hız farkını kabul etmek, tartışma yerine iş birliğini büyütür.',
    ],
    labelPlanByTheme: {
      'Aşk & Çekim': ['Uyumlu', 'Gelişim', 'Dikkat'],
      'İletişim': ['Gelişim', 'Dikkat', 'Uyumlu'],
      'Güven': ['Gelişim', 'Uyumlu', 'Dikkat'],
      'Duygusal Tempo': ['Dikkat', 'Gelişim', 'Uyumlu'],
      'Karar & Plan': ['Gelişim', 'Dikkat', 'Uyumlu'],
    },
  },
  work: {
    headlineOptions: [
      'İş birliği potansiyeli yüksek, rol netliğiyle daha verimli',
      'Karar temposu farklı ama ortak planla güçlü sonuç üretebilir',
      'Çalışma stili farklılıkları doğru dağılımla avantaja döner',
    ],
    summaryActionPhrases: [
      'Görev sahipliğini netleştirmek, sürtünmeyi ciddi ölçüde azaltır.',
      'Kritik kararları iki aşamalı almak ekip ritmini korur.',
      'Gerilimli başlıklarda ortak metrikte buluşmak verimi yükseltir.',
    ],
    labelPlanByTheme: {
      'İş Bölümü': ['Uyumlu', 'Gelişim', 'Dikkat'],
      'İletişim': ['Gelişim', 'Uyumlu', 'Dikkat'],
      'Karar & Plan': ['Gelişim', 'Dikkat', 'Uyumlu'],
      'Krizi Yönetme': ['Dikkat', 'Gelişim', 'Uyumlu'],
      'Güven': ['Uyumlu', 'Gelişim', 'Dikkat'],
    },
  },
  friend: {
    headlineOptions: [
      'Arkadaşlık zemini güçlü, sınırlar netleştikçe daha rahat',
      'Destek ve paylaşım yüksek; tempo farkı konuşuldukça kolay akıyor',
      'Birbirinizi iyi tamamlıyorsunuz, iletişim düzeni dengeyi güçlendiriyor',
    ],
    summaryActionPhrases: [
      'Destek beklentisini açık söylemek yanlış anlamayı azaltır.',
      'Birlikte eğlenme ve dinlenme temposunu dengelemek bağı korur.',
      'Sınırları iyi niyetle konuşmak arkadaşlığı daha sürdürülebilir yapar.',
    ],
    labelPlanByTheme: {
      'Destek & Sadakat': ['Uyumlu', 'Gelişim', 'Uyumlu'],
      'İletişim': ['Gelişim', 'Uyumlu', 'Dikkat'],
      'Duygusal Tempo': ['Gelişim', 'Uyumlu', 'Dikkat'],
      'Sınırlar': ['Dikkat', 'Gelişim', 'Uyumlu'],
      'Güven': ['Uyumlu', 'Gelişim', 'Dikkat'],
    },
  },
  family: {
    headlineOptions: [
      'Aile bağı güçlü, hassas başlıklarda ortak ritim önemli',
      'Bağ ve sorumluluk dengesi kurulduğunda ilişki rahatlıyor',
      'Yakınlık var; sınırlar konuşuldukça ev içi akış güçleniyor',
    ],
    summaryActionPhrases: [
      'Aile içinde rol ve beklenti netliği gerginliği belirgin azaltır.',
      'Hassas konuşmalarda zamanlama seçimi ilişkinin tonunu değiştirir.',
      'Küçük ama tutarlı adımlar güvenli alanı büyütür.',
    ],
    labelPlanByTheme: {
      'Aile Bağı': ['Uyumlu', 'Gelişim', 'Uyumlu'],
      'Güven': ['Uyumlu', 'Gelişim', 'Dikkat'],
      'Sınırlar': ['Dikkat', 'Gelişim', 'Uyumlu'],
      'Duygusal Tempo': ['Gelişim', 'Dikkat', 'Uyumlu'],
      'Karar & Plan': ['Gelişim', 'Dikkat', 'Uyumlu'],
    },
  },
  rival: {
    headlineOptions: [
      'Rekabet yüksek; adil oyun kurallarıyla denge kurulabilir',
      'Strateji gücü var, tetikleyiciler yönetildiğinde daha etkili',
      'Güçlü bir rekabet var; sınırlar net olursa performans artar',
    ],
    summaryActionPhrases: [
      'Çatışma anında kurala dönmek, kişiselleşmeyi azaltır.',
      'Hedefi ve başarı ölçütünü baştan netlemek oyunu adil tutar.',
      'Tetiklenme anlarında kısa duraklama kararı daha stratejik hale getirir.',
    ],
    labelPlanByTheme: {
      'Rekabet & Strateji': ['Dikkat', 'Gelişim', 'Dikkat'],
      'Krizi Yönetme': ['Dikkat', 'Gelişim', 'Uyumlu'],
      'Sınırlar': ['Dikkat', 'Gelişim', 'Uyumlu'],
      'İletişim': ['Gelişim', 'Dikkat', 'Uyumlu'],
      'Güven': ['Gelişim', 'Dikkat', 'Uyumlu'],
    },
  },
};

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

function clampPercent(value: unknown, fallback = 50): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n), 0, 100);
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceStandaloneWord(source: string, term: string, replacement: string): string {
  const WORD_CHARS = 'A-Za-z0-9ÇĞİÖŞÜçğıöşü';
  const regex = new RegExp(`(^|[^${WORD_CHARS}])(${escapeRegex(term)})(?=[^${WORD_CHARS}]|$)`, 'gi');
  return source.replace(regex, (_, leading: string) => `${leading}${replacement}`);
}

function sanitizeMainCopy(input: string, fallback: string): string {
  let text = asString(input, fallback);
  for (const rule of MAIN_TAB_TERM_REPLACEMENTS) {
    text = replaceStandaloneWord(text, rule.term, rule.replacement);
  }
  return text.replace(/\s{2,}/g, ' ').trim();
}

function normalizeLabel(value: unknown, fallback: Label = 'Gelişim'): Label {
  const text = asString(value, '').toLocaleLowerCase('tr-TR');
  if (text.includes('uyum')) return 'Uyumlu';
  if (text.includes('dikkat') || text.includes('risk')) return 'Dikkat';
  if (text.includes('geli')) return 'Gelişim';
  return fallback;
}

function normalizeThemeGroup(value: unknown, fallback: ThemeGroup): ThemeGroup {
  const direct = asString(value, '');
  if (!direct) return fallback;

  const directMatch = (Object.values(THEME_GROUP_ALIASES) as ThemeGroup[]).find(
    (item) => item.toLocaleLowerCase('tr-TR') === direct.toLocaleLowerCase('tr-TR'),
  );
  if (directMatch) return directMatch;

  const folded = direct
    .toUpperCase()
    .replace(/[ÇĞİÖŞÜ]/g, (char) => {
      if (char === 'Ç') return 'C';
      if (char === 'Ğ') return 'G';
      if (char === 'İ') return 'I';
      if (char === 'Ö') return 'O';
      if (char === 'Ş') return 'S';
      if (char === 'Ü') return 'U';
      return char;
    })
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return THEME_GROUP_ALIASES[folded] ?? fallback;
}

function isMatchTraitsPayload(value: unknown): value is MatchTraitsPayload {
  const obj = asObject(value);
  return Array.isArray(obj.categories) || Array.isArray(obj.cardAxes);
}

function humanizeAxisId(value: string, fallback = 'İlişki Dinamiği'): string {
  const mapped = AXIS_TITLE_MAP[value];
  if (mapped) return mapped;

  const cleaned = value
    .replace(/[_-]+/g, ' ')
    .replace(/\bask\b/giu, 'Aşk')
    .replace(/\biletisim\b/giu, 'İletişim')
    .replace(/\bguven\b/giu, 'Güven')
    .replace(/\bcross\b/giu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleaned) return fallback;

  return cleaned
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function normalizeTraitsAxis(raw: unknown, index: number): MatchTraitsAxisPayload {
  const obj = asObject(raw);
  return {
    id: asString(obj.id, `axis-${index + 1}`),
    leftLabel: sanitizeMainCopy(asString(obj.leftLabel, 'Netlik arar'), 'Netlik arar'),
    rightLabel: sanitizeMainCopy(asString(obj.rightLabel, 'Alan ister'), 'Alan ister'),
    score0to100: clampPercent(obj.score0to100, 50),
    note: sanitizeMainCopy(
      asString(obj.note, ''),
      '',
    ),
  };
}

function normalizeTraitsCategory(raw: unknown, index: number): MatchTraitsCategoryPayload {
  const obj = asObject(raw);
  return {
    id: asString(obj.id, `category-${index + 1}`),
    title: asString(obj.title, `Kategori ${index + 1}`),
    items: asArray(obj.items).map((item, itemIndex) => normalizeTraitsAxis(item, itemIndex)),
  };
}

function resolveThemeFromAxis(
  relationshipType: RelationshipType,
  categoryId: string,
  axisId: string,
): ThemeGroup {
  const normalizedCategory = categoryId.toLowerCase();
  const override = AXIS_THEME_OVERRIDES[axisId]?.[relationshipType];
  if (override) return override;

  const fromCategory = CATEGORY_THEME_MAP[relationshipType][normalizedCategory];
  if (fromCategory) return fromCategory;

  return RELATIONSHIP_THEME_ORDER[relationshipType][0];
}

function labelFromAxisScore(score0to100: number): Label {
  const left = clampPercent(100 - score0to100, 50);
  const right = clampPercent(score0to100, 50);
  const delta = Math.abs(left - right);

  if (delta <= 16) return 'Uyumlu';
  if (delta <= 40) return 'Gelişim';
  return 'Dikkat';
}

function intensityFromAxisScore(score0to100: number, label: Label): number {
  const delta = Math.abs(clampPercent(100 - score0to100, 50) - clampPercent(score0to100, 50));
  const base = label === 'Dikkat' ? 66 : label === 'Gelişim' ? 52 : 36;
  return clamp(base + Math.round(delta * 0.45), 20, 95);
}

function relationshipMomentHint(
  relationshipType: RelationshipType,
  themeGroup: ThemeGroup,
  seed: number,
): string {
  const template = THEME_TEMPLATES[themeGroup];
  if (template?.moments?.length) {
    return pick(template.moments, seed, 4);
  }

  if (relationshipType === 'work') return 'kritik teslim anlarında';
  if (relationshipType === 'friend') return 'destek beklenen zamanlarda';
  if (relationshipType === 'family') return 'hassas aile konuşmalarında';
  if (relationshipType === 'rival') return 'rekabet yükseldiğinde';
  return 'yakınlık beklentisi konuşulurken';
}

function relationshipEffectHint(
  relationshipType: RelationshipType,
  themeGroup: ThemeGroup,
  label: Label,
  seed: number,
): string {
  const template = THEME_TEMPLATES[themeGroup];
  if (template?.effects?.length) {
    return pick(template.effects, seed, 6);
  }

  if (relationshipType === 'rival') {
    return label === 'Dikkat' ? 'gerilim yaratabilir' : 'strateji farkı doğurabilir';
  }
  if (relationshipType === 'work') {
    return label === 'Dikkat' ? 'iş akışını zorlayabilir' : 'tempo farkı doğurabilir';
  }
  return label === 'Dikkat' ? 'ritim farkı yaratabilir' : 'iletişim ayarı gerektirebilir';
}

function normalizeMatchTraitsResponse(
  payload: MatchTraitsPayload,
  input: FetchComparisonInput,
): ComparisonResponseDTO | null {
  const leftName = asString(input.leftName, 'Kişi 1');
  const rightName = asString(input.rightName, 'Kişi 2');
  const relationshipType = input.relationshipType;
  const categories = payload.categories.map((category, index) => normalizeTraitsCategory(category, index));

  const axisCategoryMap = new Map<
    string,
    { categoryId: string; categoryTitle: string }
  >();
  categories.forEach((category) => {
    category.items.forEach((axis) => {
      axisCategoryMap.set(axis.id, {
        categoryId: category.id,
        categoryTitle: category.title,
      });
    });
  });

  const cardAxes = payload.cardAxes.map((axis, index) => normalizeTraitsAxis(axis, index));
  const allAxes = categories.flatMap((category) =>
    category.items.map((axis) => ({
      axis,
      categoryId: category.id,
      categoryTitle: category.title,
    })),
  );

  const selected = cardAxes.length
    ? cardAxes.map((axis) => ({
        axis,
        categoryId: axisCategoryMap.get(axis.id)?.categoryId ?? 'relationship_dynamics',
        categoryTitle: axisCategoryMap.get(axis.id)?.categoryTitle ?? 'İlişki Dinamikleri',
      }))
    : allAxes;

  const merged = [...selected];
  const existingIds = new Set(merged.map((item) => item.axis.id));
  for (const candidate of allAxes) {
    if (existingIds.has(candidate.axis.id)) continue;
    merged.push(candidate);
    existingIds.add(candidate.axis.id);
    if (merged.length >= 18) break;
  }

  const cards = merged.map(({ axis, categoryId, categoryTitle }, index): ComparisonCardDTO => {
    const rightValue = clampPercent(axis.score0to100, 50);
    const leftValue = clampPercent(100 - rightValue, 50);
    const themeGroup = resolveThemeFromAxis(relationshipType, categoryId, axis.id);
    const label = labelFromAxisScore(rightValue);
    const localSeed = hashString(`${relationshipType}-${axis.id}-${index}`);
    const title = humanizeAxisId(axis.id, categoryTitle);
    const advice = pick(THEME_TEMPLATES[themeGroup].advices, localSeed, 5);
    const impact = axis.note && axis.note.trim()
      ? sanitizeMainCopy(axis.note, '')
      : `${leftName} daha ${axis.leftLabel.toLocaleLowerCase('tr-TR')} eğilimli, ${rightName} daha ${axis.rightLabel.toLocaleLowerCase('tr-TR')} eğilimli. Bu fark, ${relationshipMomentHint(relationshipType, themeGroup, localSeed)} ${relationshipEffectHint(relationshipType, themeGroup, label, localSeed)}.`;
    const technical = pick(THEME_TEMPLATES[themeGroup].technicalAspects, localSeed, 9);

    return {
      id: axis.id || `${relationshipType}-axis-${index + 1}`,
      relationshipType,
      themeGroup,
      title: sanitizeMainCopy(title, 'İlişki Dinamiği'),
      leftPerson: {
        name: leftName,
        trait: `${leftName}: ${sanitizeMainCopy(axis.leftLabel, 'netlik arar')}`,
      },
      intersection: {
        plain: sanitizeMainCopy(
          impact,
          `${leftName} ve ${rightName} aynı konuda farklı ritimde ilerleyebilir.`,
        ),
      },
      rightPerson: {
        name: rightName,
        trait: `${rightName}: ${sanitizeMainCopy(axis.rightLabel, 'alan ister')}`,
      },
      label,
      intensity: intensityFromAxisScore(rightValue, label),
      leftValue,
      rightValue,
      advicePlain: sanitizeMainCopy(
        advice,
        'Öneri: Konuya başlamadan önce niyeti bir cümleyle netleştirin.',
      ),
      technical: {
        aspectName: technical.aspectName,
        orb: Number((Math.max(0.6, Math.abs(rightValue - 50) / 12)).toFixed(1)),
        planets: technical.planets,
        houses: technical.houses,
      },
    };
  });

  if (!cards.length) return null;

  const themeScores = computeThemeScores(relationshipType, cards);
  const summaryPlain = {
    headline: buildSummary(
      relationshipType,
      leftName,
      rightName,
      themeScores[0]?.themeGroup ?? RELATIONSHIP_THEME_ORDER[relationshipType][0],
      themeScores[1]?.themeGroup ?? RELATIONSHIP_THEME_ORDER[relationshipType][1],
      hashString(`${leftName}-${rightName}-${relationshipType}-${payload.matchId}`),
    ).headline,
    body: sanitizeMainCopy(
      asString(payload.cardSummary, '').trim() ||
        buildSummary(
          relationshipType,
          leftName,
          rightName,
          themeScores[0]?.themeGroup ?? RELATIONSHIP_THEME_ORDER[relationshipType][0],
          themeScores[1]?.themeGroup ?? RELATIONSHIP_THEME_ORDER[relationshipType][1],
          hashString(`${leftName}-${rightName}-${relationshipType}-${payload.matchId}`),
        ).body,
      `${leftName} ve ${rightName} için karşılaştırma analizi hazırlandı.`,
    ),
  };

  const technicalAspects = buildTechnicalAspects(cards);
  const supportive = technicalAspects.filter((item) => item.type === 'supportive').length;
  const challenging = technicalAspects.filter((item) => item.type === 'challenging').length;

  return {
    relationshipType,
    overallScore: clampPercent(payload.compatibilityScore, computeOverallScore(themeScores)),
    summaryPlain,
    counts: { supportive, challenging },
    themeScores,
    cards,
    technicalAspects,
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
  if (raw === 'TRINE') return symbol || 'Üçgen';
  if (raw === 'SEXTILE') return symbol || 'Altmışlık';
  if (raw === 'SQUARE') return symbol || 'Kare';
  if (raw === 'OPPOSITION') return symbol || 'Karşıt';
  if (raw === 'CONJUNCTION') return symbol || 'Kavuşum';
  return symbol || 'Etkileşim';
}

function inferThemeFromCrossAspect(
  aspect: CrossAspect,
  relationshipType: RelationshipType,
): ThemeGroup {
  const left = localizePlanet(aspect.userPlanet).toLocaleLowerCase('tr-TR');
  const right = localizePlanet(aspect.partnerPlanet).toLocaleLowerCase('tr-TR');
  const haystack = `${left} ${right} ${aspect.aspectType}`.toLocaleLowerCase('tr-TR');

  if (/merkür|merkur|communication/.test(haystack)) return 'İletişim';
  if (/satürn|saturn/.test(haystack)) return relationshipType === 'rival' ? 'Sınırlar' : 'Güven';
  if (/mars|plüton|pluton/.test(haystack)) return relationshipType === 'rival' ? 'Rekabet & Strateji' : 'Krizi Yönetme';
  if (/ay|venüs|venus/.test(haystack)) {
    if (relationshipType === 'family') return 'Aile Bağı';
    if (relationshipType === 'friend') return 'Destek & Sadakat';
    return 'Aşk & Çekim';
  }

  return RELATIONSHIP_THEME_ORDER[relationshipType][0];
}

function enrichWithSynastry(
  base: ComparisonResponseDTO | null,
  synastry: SynastryResponse | null | undefined,
  input: FetchComparisonInput,
): ComparisonResponseDTO | null {
  if (!base && !synastry) return null;

  if (!synastry) return base;

  const leftName = asString(input.leftName, base?.cards[0]?.leftPerson.name ?? synastry.personAName ?? 'Kişi 1');
  const rightName = asString(input.rightName, base?.cards[0]?.rightPerson.name ?? synastry.personBName ?? 'Kişi 2');
  const relationshipType = input.relationshipType;
  const aspects = Array.isArray(synastry.crossAspects) ? synastry.crossAspects : [];

  const technicalFromSynastry: TechnicalAspectDTO[] = aspects.map((aspect, index) => {
    const themeGroup = inferThemeFromCrossAspect(aspect, relationshipType);
    const aspectTitle = `${localizePlanet(aspect.userPlanet)} ${localizeAspectType(aspect.aspectType, aspect.aspectSymbol)} ${localizePlanet(aspect.partnerPlanet)}`;

    return {
      id: `syn-${index + 1}`,
      aspectName: aspectTitle,
      type: aspect.harmonious ? 'supportive' : 'challenging',
      orb: Number((Number.isFinite(aspect.orb) ? aspect.orb : 2.4).toFixed(1)),
      themeGroup,
      plainMeaning: sanitizeMainCopy(
        aspect.harmonious
          ? `${leftName} ve ${rightName} bu etkide daha uyumlu akış yakalayabilir.`
          : `${leftName} ve ${rightName} bu etkide ritim farkı yaşayabilir.`,
        `${leftName} ve ${rightName} bu etkide ritim farkı yaşayabilir.`,
      ),
      advicePlain: sanitizeMainCopy(
        aspect.harmonious
          ? 'Öneri: Bu güçlü akışı haftalık bir ortak ritüele dönüştürün.'
          : 'Öneri: Tetiklenme anında konuşmayı kısa mola sonrası sürdürün.',
        'Öneri: Konuşma öncesi niyeti tek cümleyle netleştirin.',
      ),
      planets: [localizePlanet(aspect.userPlanet), localizePlanet(aspect.partnerPlanet)],
      houses: [],
    };
  });

  let output = base;

  if (!output) {
    const cards = buildCards(relationshipType, leftName, rightName, input.matchId);
    const themeScores = computeThemeScores(relationshipType, cards);
    const summary = buildSummary(
      relationshipType,
      leftName,
      rightName,
      themeScores[0]?.themeGroup ?? RELATIONSHIP_THEME_ORDER[relationshipType][0],
      themeScores[1]?.themeGroup ?? RELATIONSHIP_THEME_ORDER[relationshipType][1],
      hashString(`${leftName}-${rightName}-${input.matchId}`),
    );
    output = {
      relationshipType,
      overallScore: clampPercent(synastry.harmonyScore, computeOverallScore(themeScores)),
      summaryPlain: {
        headline: sanitizeMainCopy(
          summary.headline,
          `${leftName} ve ${rightName} için karşılaştırma özeti`,
        ),
        body: sanitizeMainCopy(
          asString(synastry.harmonyInsight, summary.body),
          summary.body,
        ),
      },
      counts: {
        supportive: technicalFromSynastry.filter((item) => item.type === 'supportive').length,
        challenging: technicalFromSynastry.filter((item) => item.type === 'challenging').length,
      },
      themeScores,
      cards,
      technicalAspects: technicalFromSynastry.length ? technicalFromSynastry : buildTechnicalAspects(cards),
    };
  } else {
    output = {
      ...output,
      overallScore: clampPercent(
        synastry.harmonyScore,
        output.overallScore,
      ),
      summaryPlain: {
        headline: sanitizeMainCopy(
          output.summaryPlain.headline,
          output.summaryPlain.headline,
        ),
        body: sanitizeMainCopy(
          asString(synastry.harmonyInsight, output.summaryPlain.body),
          output.summaryPlain.body,
        ),
      },
      technicalAspects: technicalFromSynastry.length ? technicalFromSynastry : output.technicalAspects,
      counts: {
        supportive: (technicalFromSynastry.length ? technicalFromSynastry : output.technicalAspects).filter(
          (item) => item.type === 'supportive',
        ).length,
        challenging: (technicalFromSynastry.length ? technicalFromSynastry : output.technicalAspects).filter(
          (item) => item.type === 'challenging',
        ).length,
      },
    };
  }

  return output;
}

function hashString(source: string): number {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(list: T[], seed: number, offset: number): T {
  return list[(seed + offset) % list.length];
}

function seededInt(seed: number, min: number, max: number): number {
  const range = max - min + 1;
  return min + (Math.abs(seed) % range);
}

function themeScoreFromCards(cards: ComparisonCardDTO[]): number {
  if (!cards.length) return 0;
  const total = cards.reduce((sum, card) => {
    const base = card.label === 'Uyumlu' ? 65 : card.label === 'Gelişim' ? 52 : 36;
    return sum + clamp(Math.round(base + card.intensity * 0.32), 0, 100);
  }, 0);
  return clamp(Math.round(total / cards.length), 0, 100);
}

function buildSummary(
  relationshipType: RelationshipType,
  leftName: string,
  rightName: string,
  firstTheme: ThemeGroup,
  secondTheme: ThemeGroup,
  seed: number,
): ComparisonResponseDTO['summaryPlain'] {
  const profile = RELATIONSHIP_PROFILES[relationshipType];
  const headline = pick(profile.headlineOptions, seed, 3);
  const action = pick(profile.summaryActionPhrases, seed, 7);

  const body = `${leftName} ve ${rightName} için ${firstTheme} ile ${secondTheme} temalarında belirgin bir ritim farkı var. Bu fark, doğru anlaşıldığında ilişkiye hareket ve derinlik katabilir. ${action}`;

  return {
    headline,
    body,
  };
}

function themeLabelPlan(relationshipType: RelationshipType, themeGroup: ThemeGroup): Label[] {
  const profile = RELATIONSHIP_PROFILES[relationshipType];
  return profile.labelPlanByTheme[themeGroup] ?? ['Gelişim', 'Uyumlu', 'Dikkat'];
}

function intensityByLabel(label: Label, seed: number): number {
  if (label === 'Uyumlu') return seededInt(seed, 34, 63);
  if (label === 'Gelişim') return seededInt(seed, 51, 78);
  return seededInt(seed, 68, 94);
}

function buildCards(
  relationshipType: RelationshipType,
  leftName: string,
  rightName: string,
  matchId: number,
): ComparisonCardDTO[] {
  const seed = hashString(`${relationshipType}-${leftName}-${rightName}-${matchId}`);
  const themeOrder = RELATIONSHIP_THEME_ORDER[relationshipType];

  const cards: ComparisonCardDTO[] = [];

  themeOrder.forEach((themeGroup, themeIndex) => {
    const template = THEME_TEMPLATES[themeGroup];
    const labelPlan = themeLabelPlan(relationshipType, themeGroup);

    for (let index = 0; index < 3; index += 1) {
      const localSeed = seed + themeIndex * 100 + index * 17;
      const title = pick(template.titles, localSeed, 1);
      const leftTrait = pick(template.leftTraits, localSeed, 2);
      const rightTrait = pick(template.rightTraits, localSeed, 3);
      const moment = pick(template.moments, localSeed, 4);
      const effect = pick(template.effects, localSeed, 5);
      const advice = pick(template.advices, localSeed, 6);
      const label = labelPlan[(seed + themeIndex + index) % labelPlan.length];
      const intensity = intensityByLabel(label, localSeed + 9);
      const leftValue = clamp(seededInt(localSeed + 11, 28, 72), 0, 100);
      const rightValue = clamp(100 - leftValue, 0, 100);
      const technical = pick(template.technicalAspects, localSeed, 8);
      const orb = Number((seededInt(localSeed + 14, 7, 59) / 10).toFixed(1));

      cards.push({
        id: `${relationshipType}-${themeIndex + 1}-${index + 1}`,
        relationshipType,
        themeGroup,
        title,
        leftPerson: {
          name: leftName,
          trait: `${leftName}: ${leftTrait}`,
        },
        intersection: {
          plain: `${leftName} ${leftTrait}, ${rightName} ${rightTrait}. Bu fark, ${moment} anlarında ${effect}.`,
        },
        rightPerson: {
          name: rightName,
          trait: `${rightName}: ${rightTrait}`,
        },
        label,
        intensity,
        leftValue,
        rightValue,
        advicePlain: advice,
        technical: {
          aspectName: technical.aspectName,
          orb,
          planets: technical.planets,
          houses: technical.houses,
        },
      });
    }
  });

  return cards;
}

function buildTechnicalAspects(cards: ComparisonCardDTO[]): TechnicalAspectDTO[] {
  return cards.map((card, index) => {
    const type = card.label === 'Uyumlu' ? 'supportive' : 'challenging';
    return {
      id: `tech-${card.id}-${index + 1}`,
      aspectName: card.technical?.aspectName ?? `${card.title} Dinamiği`,
      type,
      orb: Number((card.technical?.orb ?? (card.intensity / 20)).toFixed(1)),
      themeGroup: card.themeGroup,
      plainMeaning: card.intersection.plain,
      advicePlain: card.advicePlain,
      planets: card.technical?.planets,
      houses: card.technical?.houses,
    };
  });
}

function computeThemeScores(
  relationshipType: RelationshipType,
  cards: ComparisonCardDTO[],
): ComparisonResponseDTO['themeScores'] {
  return RELATIONSHIP_THEME_ORDER[relationshipType]
    .map((themeGroup) => {
      const themeCards = cards.filter((card) => card.themeGroup === themeGroup);
      if (!themeCards.length) return null;
      return {
        themeGroup,
        score: themeScoreFromCards(themeCards),
      };
    })
    .filter(Boolean) as ComparisonResponseDTO['themeScores'];
}

function computeOverallScore(themeScores: ComparisonResponseDTO['themeScores']): number {
  if (!themeScores.length) return 0;
  const total = themeScores.reduce((sum, item) => sum + item.score, 0);
  return clamp(Math.round(total / themeScores.length), 0, 100);
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

function normalizeCards(
  rawCards: unknown,
  relationshipType: RelationshipType,
  leftName: string,
  rightName: string,
): ComparisonCardDTO[] {
  const cards = asArray(rawCards)
    .map((item, index) => {
      const obj = asObject(item);
      const fallbackTheme = RELATIONSHIP_THEME_ORDER[relationshipType][index % RELATIONSHIP_THEME_ORDER[relationshipType].length];

      const label = normalizeLabel(obj.label, 'Gelişim');
      const leftTrait = sanitizeMainCopy(
        asString(asObject(obj.leftPerson).trait, `${leftName}: netlik arar`),
        `${leftName}: netlik arar`,
      );
      const rightTrait = sanitizeMainCopy(
        asString(asObject(obj.rightPerson).trait, `${rightName}: alan ister`),
        `${rightName}: alan ister`,
      );
      const impact = sanitizeMainCopy(
        asString(asObject(obj.intersection).plain, `${leftName} ve ${rightName} aynı başlıkta farklı hızda ilerleyebilir.`),
        `${leftName} ve ${rightName} aynı başlıkta farklı hızda ilerleyebilir.`,
      );
      const advice = sanitizeMainCopy(
        asString(obj.advicePlain, 'Öneri: Konuya başlamadan önce niyeti bir cümleyle netleştirin.'),
        'Öneri: Konuya başlamadan önce niyeti bir cümleyle netleştirin.',
      );

      return {
        id: asString(obj.id, `${relationshipType}-${index + 1}`),
        relationshipType,
        themeGroup: normalizeThemeGroup(obj.themeGroup, fallbackTheme),
        title: sanitizeMainCopy(
          asString(obj.title, 'İlişki Dinamiği').replace(/\s+\d+$/g, ''),
          'İlişki Dinamiği',
        ),
        leftPerson: {
          name: asString(asObject(obj.leftPerson).name, leftName),
          trait: leftTrait,
        },
        intersection: {
          plain: impact,
        },
        rightPerson: {
          name: asString(asObject(obj.rightPerson).name, rightName),
          trait: rightTrait,
        },
        label,
        intensity: clampPercent(obj.intensity, label === 'Dikkat' ? 78 : label === 'Uyumlu' ? 48 : 62),
        leftValue: clampPercent(obj.leftValue, 50),
        rightValue: clampPercent(obj.rightValue, 50),
        advicePlain: advice,
        technical: {
          aspectName: asString(asObject(obj.technical).aspectName, asString(obj.title, 'Teknik Dinamik')),
          orb: Number((Number(asObject(obj.technical).orb) || 2.4).toFixed(1)),
          planets: asArray<string>(asObject(obj.technical).planets).filter(Boolean),
          houses: asArray<string>(asObject(obj.technical).houses).filter(Boolean),
        },
      } as ComparisonCardDTO;
    })
    .filter((card) => card.title.length > 0);

  return cards;
}

function buildComparisonFromMock(input: FetchComparisonInput): ComparisonResponseDTO {
  const leftName = asString(input.leftName, 'Kişi 1');
  const rightName = asString(input.rightName, 'Kişi 2');
  const relationshipType = input.relationshipType;

  const cards = buildCards(relationshipType, leftName, rightName, input.matchId);
  const themeScores = computeThemeScores(relationshipType, cards);
  const overallScore = computeOverallScore(themeScores);
  const technicalAspects = buildTechnicalAspects(cards);
  const supportive = technicalAspects.filter((item) => item.type === 'supportive').length;
  const challenging = technicalAspects.filter((item) => item.type === 'challenging').length;
  const summaryPlain = buildSummary(
    relationshipType,
    leftName,
    rightName,
    themeScores[0]?.themeGroup ?? RELATIONSHIP_THEME_ORDER[relationshipType][0],
    themeScores[1]?.themeGroup ?? RELATIONSHIP_THEME_ORDER[relationshipType][1],
    hashString(`${leftName}-${rightName}-${relationshipType}-${input.matchId}`),
  );

  return {
    relationshipType,
    overallScore,
    summaryPlain,
    counts: {
      supportive,
      challenging,
    },
    themeScores,
    cards,
    technicalAspects,
  };
}

function normalizeBackendResponse(
  raw: unknown,
  input: FetchComparisonInput,
): ComparisonResponseDTO | null {
  const obj = asObject(raw);
  if (!Object.keys(obj).length) return null;

  if (isMatchTraitsPayload(obj)) {
    const payload: MatchTraitsPayload = {
      matchId: Number.isFinite(Number(obj.matchId)) ? Number(obj.matchId) : input.matchId,
      compatibilityScore: Number.isFinite(Number(obj.compatibilityScore))
        ? Number(obj.compatibilityScore)
        : null,
      categories: asArray(obj.categories).map((item, index) => normalizeTraitsCategory(item, index)),
      cardAxes: asArray(obj.cardAxes).map((item, index) => normalizeTraitsAxis(item, index)),
      cardSummary: asString(obj.cardSummary, ''),
    };
    return normalizeMatchTraitsResponse(payload, input);
  }

  const relationshipType = normalizeRelationshipType(obj.relationshipType, input.relationshipType);
  const leftName = asString(input.leftName, 'Kişi 1');
  const rightName = asString(input.rightName, 'Kişi 2');

  const cards = normalizeCards(obj.cards, relationshipType, leftName, rightName);
  if (!cards.length) return null;

  const derivedThemeScores = computeThemeScores(relationshipType, cards);
  const themeScores = asArray(obj.themeScores)
    .map((entry, index) => {
      const item = asObject(entry);
      const fallback = derivedThemeScores[index] ?? derivedThemeScores[0];
      if (!fallback) return null;
      return {
        themeGroup: normalizeThemeGroup(item.themeGroup, fallback.themeGroup),
        score: clampPercent(item.score, fallback.score),
      };
    })
    .filter(Boolean) as ComparisonResponseDTO['themeScores'];

  const usableThemeScores = themeScores.length ? themeScores : derivedThemeScores;

  const summary = asObject(obj.summaryPlain);
  const summaryPlain = {
    headline: sanitizeMainCopy(
      asString(summary.headline, `${leftName} ve ${rightName} için güçlü bir karşılaştırma özeti`),
      `${leftName} ve ${rightName} için güçlü bir karşılaştırma özeti`,
    ),
    body: sanitizeMainCopy(
      asString(
        summary.body,
        `${leftName} daha farklı bir tempo isterken ${rightName} daha farklı bir yaklaşım gösterebilir. Bu farkı konuşmak uyumu artırır.`,
      ),
      `${leftName} daha farklı bir tempo isterken ${rightName} daha farklı bir yaklaşım gösterebilir. Bu farkı konuşmak uyumu artırır.`,
    ),
  };

  const technicalAspectsRaw = asArray(obj.technicalAspects);
  const technicalAspects: TechnicalAspectDTO[] = technicalAspectsRaw.length
    ? technicalAspectsRaw
        .map((entry, index): TechnicalAspectDTO => {
          const item = asObject(entry);
          const fallbackCard = cards[index % cards.length];

          return {
            id: asString(item.id, `tech-${index + 1}`),
            aspectName: asString(item.aspectName, fallbackCard.technical?.aspectName ?? fallbackCard.title),
            type: asString(item.type, '').toLowerCase().includes('support') ? 'supportive' : 'challenging',
            orb: Number((Number(item.orb) || fallbackCard.technical?.orb || 2.2).toFixed(1)),
            themeGroup: normalizeThemeGroup(item.themeGroup, fallbackCard.themeGroup),
            plainMeaning: asString(item.plainMeaning, fallbackCard.intersection.plain),
            advicePlain: asString(item.advicePlain, fallbackCard.advicePlain),
            planets: asArray<string>(item.planets).filter(Boolean),
            houses: asArray<string>(item.houses).filter(Boolean),
          };
        })
        .filter((item) => Boolean(item.aspectName))
    : buildTechnicalAspects(cards);

  const supportive = technicalAspects.filter((item) => item.type === 'supportive').length;
  const challenging = technicalAspects.filter((item) => item.type === 'challenging').length;

  return {
    relationshipType,
    overallScore: clampPercent(obj.overallScore, computeOverallScore(usableThemeScores)),
    summaryPlain,
    counts: {
      supportive,
      challenging,
    },
    themeScores: usableThemeScores,
    cards,
    technicalAspects,
  };
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

export function buildMiniCategoryScores(
  relationshipType: RelationshipType,
  themeScores: ComparisonResponseDTO['themeScores'],
): MiniCategoryScoreDTO[] {
  const scoreMap = new Map<ThemeGroup, number>(
    themeScores.map((item) => [item.themeGroup, clampPercent(item.score, 0)]),
  );

  return RELATIONSHIP_MINI_CATEGORY_CONFIG[relationshipType].map((item) => {
    const values = item.themes
      .map((theme) => scoreMap.get(theme))
      .filter((score): score is number => typeof score === 'number');

    const score = values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0;

    return {
      id: item.id,
      label: item.label,
      score,
    };
  });
}

export function groupCardsByTheme(
  cards: ComparisonCardDTO[],
  relationshipType: RelationshipType,
  themeScores: ComparisonResponseDTO['themeScores'],
): CompareThemeSectionDTO[] {
  const order = RELATIONSHIP_THEME_ORDER[relationshipType];
  const scoreMap = new Map<ThemeGroup, number>(themeScores.map((item) => [item.themeGroup, item.score]));

  return order
    .map((themeGroup) => {
      const groupedCards = cards
        .filter((card) => card.relationshipType === relationshipType && card.themeGroup === themeGroup)
        .sort((a, b) => {
          const labelDelta = LABEL_PRIORITY[a.label] - LABEL_PRIORITY[b.label];
          if (labelDelta !== 0) return labelDelta;
          return b.intensity - a.intensity;
        });

      if (!groupedCards.length) return null;

      return {
        themeGroup,
        score: clampPercent(scoreMap.get(themeGroup), themeScoreFromCards(groupedCards)),
        totalCount: groupedCards.length,
        cards: groupedCards,
      } satisfies CompareThemeSectionDTO;
    })
    .filter(Boolean) as CompareThemeSectionDTO[];
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
        mode: 'comparison',
      },
    });

    normalized = normalizeBackendResponse(response.data, input);
  } catch (error) {
    lastError = error;
  }

  try {
    const synastryResponse = await getSynastry(input.matchId);
    normalized = enrichWithSynastry(normalized, synastryResponse.data, input);
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

  if (!ALLOW_COMPARE_MOCK_FALLBACK) {
    if (lastError) {
      throw toUserError(lastError);
    }
    throw new Error('Uyum verisi yüklenemedi.');
  }

  return {
    data: buildComparisonFromMock(input),
    isMock: true,
  };
}
