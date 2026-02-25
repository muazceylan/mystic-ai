import api from './api';

export type StarMateGender = 'WOMAN' | 'MAN' | 'NON_BINARY';
export type StarMateShowMe = 'MEN' | 'WOMEN' | 'EVERYONE';
export type StarMateElement = 'FIRE' | 'EARTH' | 'AIR' | 'WATER';
export type StarMateActionType = 'LIKE' | 'NOPE' | 'SUPERLIKE';
export type StarMateMatchState = 'PENDING' | 'MATCHED';

export interface StarMateProfilePhoto {
  id: string;
  uri: string;
  order: number;
}

export interface StarMateMiniSynastryAspect {
  id: string;
  label: string;
  note: string;
  tone: 'HARMONY' | 'CHALLENGE';
}

export interface StarMateMiniSynastryReport {
  summary: string;
  whyScore: string;
  sparkNote: string;
  cautionNote: string;
  aiInsight: string;
  aspects: StarMateMiniSynastryAspect[];
}

export interface StarMateDetailSet {
  heightCm: number | null;
  exercise: 'LOW' | 'SOMETIMES' | 'REGULAR';
  drinking: 'NO' | 'SOCIAL' | 'OCCASIONAL';
  smoking: 'NO' | 'SOCIAL' | 'YES';
  education: string;
  pets: string;
  languages: string[];
  seeking: string;
}

export interface StarMateProfile {
  id: string;
  userId: number | null;
  displayName: string;
  age: number;
  gender: StarMateGender;
  locationLabel: string;
  distanceKm: number;
  sunSign: string;
  sunSymbol: string;
  element: StarMateElement;
  compatibilityScore: number;
  bio: string;
  tags: string[];
  cosmicAutoTags: string[];
  photos: StarMateProfilePhoto[];
  details: StarMateDetailSet;
  miniSynastryReport: StarMateMiniSynastryReport;
  discoveryEnabled: boolean;
  likesViewer?: boolean;
  premiumSpotlight?: boolean;
}

export interface StarMateProfileDraft {
  displayName: string;
  age: number;
  sunSign: string;
  sunSymbol: string;
  element: StarMateElement;
  bio: string;
  photos: Array<string | null>;
  tags: string[];
  cosmicAutoTags: string[];
  details: StarMateDetailSet;
  previewCompatibilityScore: number;
  previewLocationLabel: string;
}

export interface StarMateDiscoveryFilters {
  discoveryEnabled: boolean;
  locationLabel: string;
  maxDistanceKm: number;
  distanceStrict: boolean;
  ageMin: number;
  ageMax: number;
  ageStrict: boolean;
  showMe: StarMateShowMe;
  notificationsEnabled: boolean;
  minCompatibilityScore: number;
  elementalPreference: 'ANY' | StarMateElement;
}

export interface StarMateFeedRequest {
  userId: number;
  locale?: 'tr' | 'en';
  cursor?: string;
  limit?: number;
  filters: StarMateDiscoveryFilters;
  precalculatedOnly?: boolean;
}

export interface StarMateFeedResponse {
  items: StarMateProfile[];
  nextCursor: string | null;
  queueStatus: 'READY' | 'WARMING' | 'EMPTY';
}

export interface StarMateActionRequest {
  actorUserId: number;
  targetProfileId: string;
  actionType: StarMateActionType;
  clientTimestamp: string;
}

export interface StarMateActionResponse {
  state: StarMateMatchState;
  matchId: string | null;
  targetProfileId: string;
  superLikeDelivered: boolean;
}

export interface StarMateMatch {
  id: string;
  profileId: string;
  displayName: string;
  age: number;
  photoUri: string | null;
  sunSign: string;
  sunSymbol: string;
  compatibilityScore: number;
  matchedAt: string;
  superLikeByMe: boolean;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  icebreaker: string;
}

export interface StarMateChatMessage {
  id: string;
  role: 'self' | 'other' | 'system';
  text: string;
  sentAt: string;
}

export interface StarMateChatThread {
  matchId: string;
  messages: StarMateChatMessage[];
  typing: boolean;
}

export interface StarMateProfileEntity {
  id: string;
  userId: number;
  bio: string;
  photosJson: string;
  tagsJson: string;
  detailsJson: string;
  discoveryPreferencesJson: string;
  discoveryEnabled: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StarMateMatchEntity {
  id: string;
  actorUserId: number;
  targetUserId: number;
  actorAction: 'LIKE' | 'NOPE' | 'SUPERLIKE';
  targetAction: 'LIKE' | 'NOPE' | 'SUPERLIKE' | null;
  matched: boolean;
  synastryScoreSnapshot: number;
  synastrySummarySnapshot: string;
  createdAt: string;
  updatedAt: string;
}

export interface StarMateSynastryQueueJob {
  viewerUserId: number;
  candidateUserId: number;
  filtersSnapshot: StarMateDiscoveryFilters;
  requestedAt: string;
  source: 'APP_OPEN' | 'FILTER_CHANGE' | 'QUEUE_TOPUP';
}

const STAR_MATE_BASE = '/api/v1/star-mate';

export const fetchStarMateFeed = (request: StarMateFeedRequest) =>
  api.post<StarMateFeedResponse>(`${STAR_MATE_BASE}/feed`, request);

export const recordStarMateAction = (request: StarMateActionRequest) =>
  api.post<StarMateActionResponse>(`${STAR_MATE_BASE}/actions`, request);

export const fetchStarMateMatches = (userId: number) =>
  api.get<StarMateMatch[]>(`${STAR_MATE_BASE}/matches`, { params: { userId } });

export const fetchStarMateProfile = (userId: number) =>
  api.get<StarMateProfileDraft>(`${STAR_MATE_BASE}/profile`, { params: { userId } });

export const saveStarMateProfile = (userId: number, profile: StarMateProfileDraft) =>
  api.put<StarMateProfileDraft>(`${STAR_MATE_BASE}/profile`, profile, { params: { userId } });

export const saveStarMateDiscoveryFilters = (userId: number, filters: StarMateDiscoveryFilters) =>
  api.put<StarMateDiscoveryFilters>(`${STAR_MATE_BASE}/filters`, filters, { params: { userId } });

export const enqueueSynastryPrecalculation = (job: StarMateSynastryQueueJob) =>
  api.post(`${STAR_MATE_BASE}/synastry-queue`, job);

const BASE_PHOTOS = [
  'https://picsum.photos/seed/starmate-01/900/1200',
  'https://picsum.photos/seed/starmate-02/900/1200',
  'https://picsum.photos/seed/starmate-03/900/1200',
  'https://picsum.photos/seed/starmate-04/900/1200',
  'https://picsum.photos/seed/starmate-05/900/1200',
  'https://picsum.photos/seed/starmate-06/900/1200',
  'https://picsum.photos/seed/starmate-07/900/1200',
  'https://picsum.photos/seed/starmate-08/900/1200',
  'https://picsum.photos/seed/starmate-09/900/1200',
  'https://picsum.photos/seed/starmate-10/900/1200',
  'https://picsum.photos/seed/starmate-11/900/1200',
  'https://picsum.photos/seed/starmate-12/900/1200',
  'https://picsum.photos/seed/starmate-13/900/1200',
  'https://picsum.photos/seed/starmate-14/900/1200',
];

const SIGN_META: Record<string, { symbol: string; element: StarMateElement }> = {
  Koc: { symbol: '♈', element: 'FIRE' },
  Boga: { symbol: '♉', element: 'EARTH' },
  Ikizler: { symbol: '♊', element: 'AIR' },
  Yengec: { symbol: '♋', element: 'WATER' },
  Aslan: { symbol: '♌', element: 'FIRE' },
  Basak: { symbol: '♍', element: 'EARTH' },
  Terazi: { symbol: '♎', element: 'AIR' },
  Akrep: { symbol: '♏', element: 'WATER' },
  Yay: { symbol: '♐', element: 'FIRE' },
  Oglak: { symbol: '♑', element: 'EARTH' },
  Kova: { symbol: '♒', element: 'AIR' },
  Balik: { symbol: '♓', element: 'WATER' },
};

const AUTO_TAG_MAP: Record<string, string[]> = {
  Koc: ['Ates Baslatan', 'Direkt', 'Macera Cagricisi'],
  Boga: ['Duyusal', 'Sadik', 'Rituel Sever'],
  Ikizler: ['Merakli Zihin', 'Espiri Akisi', 'Sohbet Motoru'],
  Yengec: ['Derin His', 'Sezgisel', 'Yuva Kurucu'],
  Aslan: ['Parlayan Kalp', 'Sahne Enerjisi', 'Cok Cömert'],
  Basak: ['Detay Ustasi', 'Bakim Veren', 'Ritimli'],
  Terazi: ['Estetik Duygu', 'Diplomatik', 'Zarif'],
  Akrep: ['Manyetik', 'Sadakat Derinligi', 'Donusturucu'],
  Yay: ['Kesif Ruh', 'Acik Sozlu', 'Neşeli'],
  Oglak: ['Ambitious', 'Guven Veren', 'Uzun Vade'],
  Kova: ['Orijinal', 'Zihin Acici', 'Ozgun'],
  Balik: ['Deep Feeler', 'Romantik', 'Hayalperest'],
};

function makeId(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

function makePhoto(id: string, order: number, uri: string): StarMateProfilePhoto {
  return { id: `${id}-photo-${order}`, uri, order };
}

function defaultDetails(overrides?: Partial<StarMateDetailSet>): StarMateDetailSet {
  return {
    heightCm: 168,
    exercise: 'SOMETIMES',
    drinking: 'SOCIAL',
    smoking: 'NO',
    education: 'Lisans',
    pets: 'Kedi sever',
    languages: ['Turkce', 'Ingilizce'],
    seeking: 'Ciddi iliski + ruhsal uyum',
    ...overrides,
  };
}

function aspect(id: string, label: string, note: string, tone: 'HARMONY' | 'CHALLENGE'): StarMateMiniSynastryAspect {
  return { id, label, note, tone };
}

function buildProfile(seed: {
  index: number;
  name: string;
  age: number;
  gender: StarMateGender;
  sign: keyof typeof SIGN_META;
  score: number;
  distanceKm: number;
  tags: string[];
  bio: string;
  location: string;
  likesViewer?: boolean;
  premiumSpotlight?: boolean;
  spark: string;
  caution: string;
  why: string;
  insight: string;
  details?: Partial<StarMateDetailSet>;
}): StarMateProfile {
  const meta = SIGN_META[seed.sign];
  const id = makeId('candidate', seed.index);
  const basePhoto = BASE_PHOTOS[(seed.index - 1) % BASE_PHOTOS.length];
  const altPhoto = BASE_PHOTOS[(seed.index + 4) % BASE_PHOTOS.length];
  const thirdPhoto = BASE_PHOTOS[(seed.index + 8) % BASE_PHOTOS.length];

  return {
    id,
    userId: 1000 + seed.index,
    displayName: seed.name,
    age: seed.age,
    gender: seed.gender,
    locationLabel: seed.location,
    distanceKm: seed.distanceKm,
    sunSign: seed.sign,
    sunSymbol: meta.symbol,
    element: meta.element,
    compatibilityScore: seed.score,
    bio: seed.bio,
    tags: seed.tags,
    cosmicAutoTags: AUTO_TAG_MAP[seed.sign].slice(0, 3),
    photos: [
      makePhoto(id, 0, basePhoto),
      makePhoto(id, 1, altPhoto),
      makePhoto(id, 2, thirdPhoto),
    ],
    details: defaultDetails(seed.details),
    miniSynastryReport: {
      summary: `%${seed.score} uyum: cekim ve ritim guclu, uzun vadede iletisim ritmi dengelenmeli.`,
      whyScore: seed.why,
      sparkNote: seed.spark,
      cautionNote: seed.caution,
      aiInsight: seed.insight,
      aspects: [
        aspect(`${id}-a1`, 'Venus △ Mars', 'Romantik ve fiziksel cekim hizli aktive oluyor.', 'HARMONY'),
        aspect(`${id}-a2`, 'Moon △ Moon', 'Duygusal ritim benzer; guven hissi erken olusabilir.', 'HARMONY'),
        aspect(`${id}-a3`, 'Saturn □ Mercury', 'Planlama ve ifade tarzinda sabir gerektiren surtunme olabilir.', 'CHALLENGE'),
      ],
    },
    discoveryEnabled: true,
    likesViewer: seed.likesViewer,
    premiumSpotlight: seed.premiumSpotlight,
  };
}

export function suggestCosmicAutoTags(input: {
  sunSign?: string | null;
  moonSign?: string | null;
  risingSign?: string | null;
}): string[] {
  const tags = new Set<string>();
  const normalized = [input.sunSign, input.moonSign, input.risingSign]
    .filter(Boolean)
    .map((s) => (s ?? '').replace(/ç/gi, 'c').replace(/ğ/gi, 'g').replace(/ı/gi, 'i').replace(/ö/gi, 'o').replace(/ş/gi, 's').replace(/ü/gi, 'u'));

  normalized.forEach((sign) => {
    const title = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase();
    const candidates = AUTO_TAG_MAP[title];
    if (candidates) {
      candidates.forEach((tag) => tags.add(tag));
    }
  });

  if (tags.size === 0) {
    ['Sezgisel', 'Nazik Iletisim', 'Ruhsal Merak'].forEach((tag) => tags.add(tag));
  }

  return Array.from(tags).slice(0, 5);
}

function computeAge(birthDate?: string | null): number {
  if (!birthDate) return 29;
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 29;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const beforeBirthday =
    today.getMonth() < parsed.getMonth() ||
    (today.getMonth() === parsed.getMonth() && today.getDate() < parsed.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(age, 18);
}

export function createDefaultStarMateFilters(): StarMateDiscoveryFilters {
  return {
    discoveryEnabled: true,
    locationLabel: 'Istanbul, TR',
    maxDistanceKm: 68,
    distanceStrict: false,
    ageMin: 24,
    ageMax: 36,
    ageStrict: true,
    showMe: 'EVERYONE',
    notificationsEnabled: true,
    minCompatibilityScore: 65,
    elementalPreference: 'ANY',
  };
}

export function createDefaultStarMateProfileDraft(input?: {
  name?: string | null;
  birthDate?: string | null;
  zodiacSign?: string | null;
  sunSign?: string | null;
  moonSign?: string | null;
  risingSign?: string | null;
}): StarMateProfileDraft {
  const normalizedSign = (input?.sunSign ?? input?.zodiacSign ?? 'Terazi')
    .replace(/ç/gi, 'c')
    .replace(/ğ/gi, 'g')
    .replace(/ı/gi, 'i')
    .replace(/ö/gi, 'o')
    .replace(/ş/gi, 's')
    .replace(/ü/gi, 'u');
  const signKey = (normalizedSign.charAt(0).toUpperCase() + normalizedSign.slice(1).toLowerCase()) as keyof typeof SIGN_META;
  const signMeta = SIGN_META[signKey] ?? SIGN_META.Terazi;
  const displayName = (input?.name ?? 'Sen').trim() || 'Sen';

  return {
    displayName,
    age: computeAge(input?.birthDate),
    sunSign: SIGN_META[signKey] ? signKey : 'Terazi',
    sunSymbol: signMeta.symbol,
    element: signMeta.element,
    bio: 'Ritmi yuksek sohbetleri, sakin kahve bulusmalarini ve birlikte buyumeyi severim.',
    photos: [BASE_PHOTOS[0], BASE_PHOTOS[1], null, null, null, null, null, null, null],
    tags: ['Seyahat', 'Sinema', 'Yuruyus', 'Kahve'],
    cosmicAutoTags: suggestCosmicAutoTags({
      sunSign: input?.sunSign ?? input?.zodiacSign,
      moonSign: input?.moonSign,
      risingSign: input?.risingSign,
    }).slice(0, 3),
    details: defaultDetails({
      heightCm: 170,
      exercise: 'SOMETIMES',
      drinking: 'SOCIAL',
      smoking: 'NO',
      education: 'Yuksek Lisans',
      pets: 'Kopek sever',
      languages: ['Turkce', 'Ingilizce'],
      seeking: 'Anlamli bag + eglenebilecegim biri',
    }),
    previewCompatibilityScore: 88,
    previewLocationLabel: 'Moda / Istanbul',
  };
}

export interface StarMateSeedBundle {
  allCandidates: StarMateProfile[];
  likesYou: StarMateProfile[];
  seededMatches: StarMateMatch[];
  seededChats: Record<string, StarMateChatThread>;
}

function toMatch(profile: StarMateProfile, overrides?: Partial<StarMateMatch>): StarMateMatch {
  const now = new Date().toISOString();
  return {
    id: `match-${profile.id}`,
    profileId: profile.id,
    displayName: profile.displayName,
    age: profile.age,
    photoUri: profile.photos[0]?.uri ?? null,
    sunSign: profile.sunSign,
    sunSymbol: profile.sunSymbol,
    compatibilityScore: profile.compatibilityScore,
    matchedAt: now,
    superLikeByMe: false,
    unreadCount: 0,
    lastMessage: 'Yildizlar fena hizalandi 🌌',
    lastMessageAt: now,
    icebreaker: 'Mercury baglantiniz sosyal. Ondan son zamanlarda en cok neye heyecanlandigini sor.',
    ...overrides,
  };
}

function seedThread(match: StarMateMatch): StarMateChatThread {
  return {
    matchId: match.id,
    typing: false,
    messages: [
      {
        id: `${match.id}-m0`,
        role: 'system',
        text: `AI Icebreaker: ${match.icebreaker}`,
        sentAt: match.matchedAt,
      },
      {
        id: `${match.id}-m1`,
        role: 'other',
        text: 'Selam ✨ Profilindeki seyahat enerjisi cok hos. En son nereye gittin?',
        sentAt: match.matchedAt,
      },
    ],
  };
}

export function seedStarMateBundle(): StarMateSeedBundle {
  const candidates = [
    buildProfile({
      index: 1,
      name: 'Goncagul',
      age: 32,
      gender: 'WOMAN',
      sign: 'Yengec',
      score: 81,
      distanceKm: 14,
      tags: ['Spa', 'Seyahat', 'Spor', 'Alisveris', 'Moda'],
      bio: 'Hafta ici yogun, hafta sonu deniz kenari yuruyus + kahve. Duygusal zekasi yuksek insanlari severim.',
      location: 'Besiktas, Istanbul',
      likesViewer: true,
      premiumSpotlight: true,
      spark: 'Venus-Mars uyumu kimya ve flort akisini hizlandiriyor.',
      caution: 'Saturn-Mercury karesi duygulari ifade ederken zaman zaman duvar yaratabilir.',
      why: 'Venus trine Mars romantik cekimi yukseltiyor; Ay acilari duygusal senkronu destekliyor.',
      insight: 'Ilk bulusmada yumusak ama merakli sorular kullanirsaniz enerji cok hizli isinabilir.',
      details: { heightCm: 166, exercise: 'REGULAR', drinking: 'SOCIAL', education: 'Lisans' },
    }),
    buildProfile({
      index: 2,
      name: 'Alara',
      age: 29,
      gender: 'WOMAN',
      sign: 'Terazi',
      score: 76,
      distanceKm: 22,
      tags: ['Galeri', 'Kahve', 'Pilates', 'Minimalizm'],
      bio: 'Estetik ve denge takintisi var diyebiliriz. Iyi sohbet, iyi mekan, iyi enerji.',
      location: 'Kadikoy, Istanbul',
      likesViewer: false,
      spark: 'Ay-Venus akisi sicaklik ve nezaket yaratir.',
      caution: 'Mars-Saturn surtunmesi tempo farki yaratabilir.',
      why: 'Hava elementi baglantisi iletisimde akicilik veriyor, Venus acilari cekimi canli tutuyor.',
      insight: 'Sanat, tasarim veya sehirde favori rotalar uzerinden baslayan sohbetler hizli bag kurar.',
      details: { heightCm: 171, exercise: 'REGULAR', drinking: 'OCCASIONAL', pets: 'Kedi annesi' },
    }),
    buildProfile({
      index: 3,
      name: 'Mert',
      age: 34,
      gender: 'MAN',
      sign: 'Yay',
      score: 88,
      distanceKm: 9,
      tags: ['Trekking', 'Fotograf', 'Road Trip', 'Kamp'],
      bio: 'Spontane planlari severim. Haritada yeni bir nokta, yeni bir hikaye demek.',
      location: 'Cihangir, Istanbul',
      likesViewer: true,
      spark: 'Jupiter-Venus kontagi birlikte buyume hissi yaratir.',
      caution: 'Ay-Neptun asiri idealizasyon riski tasir.',
      why: 'Jupiter destekli acilar umut ve keyif getiriyor; Mars ritmi fiziksel enerjiyi yukseltiyor.',
      insight: 'Birlikte bir minik rota planlamak bu eslesmede kimyayi hizla gorunur kilar.',
      details: { heightCm: 182, exercise: 'REGULAR', drinking: 'SOCIAL', education: 'Yuksek Lisans', pets: 'Kopek sever' },
    }),
    buildProfile({
      index: 4,
      name: 'Derya',
      age: 31,
      gender: 'WOMAN',
      sign: 'Balik',
      score: 83,
      distanceKm: 31,
      tags: ['Yoga', 'Rituel', 'Muzik', 'Dogada Zaman'],
      bio: 'Muzik listeleri yaparim, sezgilerime guvenirim. Yargisiz sohbetler favorim.',
      location: 'Atasehir, Istanbul',
      likesViewer: false,
      spark: 'Moon-Neptune uyumu romantik ve sezgisel alan aciyor.',
      caution: 'Mercury kareleri beklentiyi netlestirmeyi gerektirir.',
      why: 'Su elementi baglantisi duygusal cekimi arttiriyor; Venus acilari sicaklik veriyor.',
      insight: 'Ilk mesajda bir sarki veya kitap onerisi paylasmak enerjiye iyi gelir.',
      details: { heightCm: 164, exercise: 'SOMETIMES', drinking: 'NO', education: 'Lisans' },
    }),
    buildProfile({
      index: 5,
      name: 'Kerem',
      age: 30,
      gender: 'MAN',
      sign: 'Kova',
      score: 71,
      distanceKm: 54,
      tags: ['Teknoloji', 'Sci-Fi', 'Kahve', 'Bisiklet'],
      bio: 'Zihin acan muhabbet, yaratıcı projeler ve gece surusleri. Rutine mesafeliyim.',
      location: 'Sariyer, Istanbul',
      likesViewer: false,
      spark: 'Mercury-Uranus baglantisi sohbeti elektrikli hale getiriyor.',
      caution: 'Venus-Saturn acisi duygusal hizi yavaslatabilir.',
      why: 'Hava elementi iletisim puanini yukseltiyor ama sabit burc gerginligi sabir istiyor.',
      insight: 'Flort dilinde mizah ve merak sorulari daha iyi calisir; baski hissi yaratmamaya bakin.',
      details: { heightCm: 178, exercise: 'SOMETIMES', drinking: 'SOCIAL', smoking: 'SOCIAL' },
    }),
    buildProfile({
      index: 6,
      name: 'Elif',
      age: 27,
      gender: 'WOMAN',
      sign: 'Aslan',
      score: 93,
      distanceKm: 11,
      tags: ['Dans', 'Konser', 'Moda', 'Brunch'],
      bio: 'Enerjisi yuksek ortamlari seviyorum ama yakin hissettigimde sakinlesmeyi de bilirim.',
      location: 'Nisantasi, Istanbul',
      likesViewer: true,
      premiumSpotlight: true,
      spark: 'Sun-Venus ve Mars trine kombinasyonu kuvvetli cekim ve eglence getiriyor.',
      caution: 'Ego savunmalari acik iletisimi zaman zaman zorlayabilir.',
      why: 'Ates elementi sinerjisi ve Venus-Mars akisi bu skoru yukseltiyor.',
      insight: 'Kendine guvenen ama alan taniyan bir enerji bu eslesmede en iyi sonucu verir.',
      details: { heightCm: 169, exercise: 'REGULAR', drinking: 'SOCIAL', education: 'Lisans' },
    }),
    buildProfile({
      index: 7,
      name: 'Onur',
      age: 35,
      gender: 'MAN',
      sign: 'Oglak',
      score: 67,
      distanceKm: 63,
      tags: ['Isletme', 'Kosu', 'Podcast', 'Sakin Aksam'],
      bio: 'Planli ilerlemeyi severim. Guven ve tutarlilik benim icin cekici.',
      location: 'Levent, Istanbul',
      likesViewer: false,
      spark: 'Saturn destekli acilar uzun vadeli guven hissi verir.',
      caution: 'Ay-Mars sert acilari tempo farki yaratabilir.',
      why: 'Pratik uyum guclu ama romantik hiz orta seviyede oldugu icin skor dengede.',
      insight: 'Netlik ve niyet konusmak bu eslesmede avantaj yaratir.',
      details: { heightCm: 184, exercise: 'REGULAR', drinking: 'OCCASIONAL', smoking: 'NO' },
    }),
    buildProfile({
      index: 8,
      name: 'Sude',
      age: 28,
      gender: 'WOMAN',
      sign: 'Basak',
      score: 79,
      distanceKm: 19,
      tags: ['Kitap', 'Seramik', 'Yuruyus', 'Saglikli Yasam'],
      bio: 'Sadelik, nezaket ve istikrar. Kucuk detaylara cok dikkat ederim.',
      location: 'Acibadem, Istanbul',
      likesViewer: false,
      spark: 'Mercury-Venus baglantisi gundelik hayatta tatli uyum verir.',
      caution: 'Asiri analiz spontanligi azaltabilir.',
      why: 'Toprak-su dengesi ve Mercury odakli uyum bu eslesmeyi guclendiriyor.',
      insight: 'Gundelik rutinler ve sevilen kucuk rituller uzerinden ilerlemek yakinlik kurar.',
      details: { heightCm: 165, exercise: 'REGULAR', drinking: 'NO', smoking: 'NO' },
    }),
    buildProfile({
      index: 9,
      name: 'Cem',
      age: 33,
      gender: 'MAN',
      sign: 'Akrep',
      score: 85,
      distanceKm: 16,
      tags: ['Gizem Roman', 'Gece Yuruyusu', 'Mutfak', 'Derin Sohbet'],
      bio: 'Yuzeyde degil, derinde bulusmayi severim. Guvenince cok sicagimdir.',
      location: 'Uskudar, Istanbul',
      likesViewer: true,
      spark: 'Pluto-Moon baglantisi yogun cekim ve psikolojik yakinlik getirir.',
      caution: 'Guven testleri gereksiz dramatik dongu yaratabilir.',
      why: 'Yogun duygusal acilar ve Venus destegi cekimi yukseltiyor.',
      insight: 'Sınır ve beklentileri nazikce netlestirmek bu eslesmeyi saglikli tutar.',
      details: { heightCm: 180, exercise: 'SOMETIMES', drinking: 'SOCIAL', smoking: 'NO' },
    }),
    buildProfile({
      index: 10,
      name: 'Lara',
      age: 26,
      gender: 'WOMAN',
      sign: 'Ikizler',
      score: 74,
      distanceKm: 42,
      tags: ['Stand-up', 'Dil Ogrenme', 'Podcast', 'Sosyal Etkinlik'],
      bio: 'Yerimde durmam biraz zor :) Zeki espriler ve hizli enerji severim.',
      location: 'Bakirkoy, Istanbul',
      likesViewer: false,
      spark: 'Mercury-Jupiter acisi zihinsel akisi canlandirir.',
      caution: 'Odak dagilimi duygusal derinligi geciktirebilir.',
      why: 'Iletisim cok guclu; duygusal ritim biraz daha zaman istiyor.',
      insight: 'Mini oyun gibi mesajlasmalar ve soru-cevaplar burada etkili.',
      details: { heightCm: 167, exercise: 'LOW', drinking: 'SOCIAL', smoking: 'SOCIAL' },
    }),
    buildProfile({
      index: 11,
      name: 'Bora',
      age: 36,
      gender: 'MAN',
      sign: 'Boga',
      score: 69,
      distanceKm: 73,
      tags: ['Gurme', 'Muzik', 'Kamp', 'Masa Oyunlari'],
      bio: 'Sakin guvenli baglar, iyi yemek ve dogada zaman. Acelem yok ama niyetim net.',
      location: 'Beylikduzu, Istanbul',
      likesViewer: false,
      spark: 'Venus destekli acilar ten ve konfor uyumunu guclendirir.',
      caution: 'Sabit burc inadi kararlari zorlastirabilir.',
      why: 'Konfor ve sadakat temasi guclu, dinamizm orta seviyede.',
      insight: 'Ilk bulusmada rahat bir mekan secmek enerjiyi acabilir.',
      details: { heightCm: 183, exercise: 'SOMETIMES', drinking: 'SOCIAL', smoking: 'NO' },
    }),
    buildProfile({
      index: 12,
      name: 'Nehir',
      age: 30,
      gender: 'WOMAN',
      sign: 'Koc',
      score: 82,
      distanceKm: 26,
      tags: ['Crossfit', 'Girişim', 'Tiyatro', 'Sehir Kacamaklari'],
      bio: 'Netlik severim. Enerji varsa beklemem, yoksa da uzatmam. Samimiyet her sey.',
      location: 'Sisli, Istanbul',
      likesViewer: true,
      spark: 'Mars-Sun trinesi hizli cekim ve motivasyon saglar.',
      caution: 'Mars-Mercury sertligi tartismalari hizlandirabilir.',
      why: 'Ates ve hareket enerjisi yuksek; iletisimde tempoyu dengelemek gerek.',
      insight: 'Dogrudan ama yumusak bir iletisim bu eslesmeyi cok iyi tasir.',
      details: { heightCm: 172, exercise: 'REGULAR', drinking: 'OCCASIONAL', smoking: 'NO' },
    }),
  ];

  const likesYou = candidates.filter((p) => p.likesViewer).slice(0, 6);
  const seededMatchProfiles = [candidates[2], candidates[5]];
  const seededMatches = [
    toMatch(seededMatchProfiles[0], {
      matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      lastMessage: 'Hafta sonu minik bir kahve + sahil yuruyusu?',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      unreadCount: 1,
      icebreaker: 'Jupiter uyumunuz yuksek. Birlikte spontane rota fikrine nasil baktigini sor.',
    }),
    toMatch(seededMatchProfiles[1], {
      matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
      superLikeByMe: true,
      lastMessage: 'Konser onerini bekliyorum 🎶',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      unreadCount: 0,
      icebreaker: 'Ateş elementi baskin. Eglence + yaraticilik uzerinden acilan bir soru iyi calisir.',
    }),
  ];

  const seededChats = seededMatches.reduce<Record<string, StarMateChatThread>>((acc, match) => {
    acc[match.id] = seedThread(match);
    return acc;
  }, {});

  return {
    allCandidates: candidates,
    likesYou,
    seededMatches,
    seededChats,
  };
}

export function scoreLabel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 80) return 'HIGH';
  if (score >= 65) return 'MEDIUM';
  return 'LOW';
}

