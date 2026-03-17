/**
 * Numerology Presentation Layer (View Model)
 *
 * Ham backend verisini kullanıcıya daha anlaşılır Türkçe metinlere dönüştürür.
 * Deterministic: aynı girdi → aynı çıktı.
 * Backend response yapısını bozmaz; sadece UI için türetilmiş alanlar üretir.
 */

import type { NumerologyResponse } from './numerology.service';

// ─── Life Path Number Descriptions ────────────────────────────────────────────

type NumberProfile = { desc: string; shortDesc: string; traits: string[] };

const LIFE_PATH_MAP: Record<number, NumberProfile> = {
  1: {
    desc: 'Öncü, bağımsız ve lider ruhlu. Yeni başlangıçlar ve kendi yolunu çizme bu yapının temel gücüdür.',
    shortDesc: 'Öncü ve lider ruhlu',
    traits: ['Girişimcilik', 'Kararlılık', 'Bağımsızlık'],
  },
  2: {
    desc: 'Uyumlu, hassas ve birlikte çalışmayı seven. İlişkilerde köprü kurma ve denge bu yapının doğal alanıdır.',
    shortDesc: 'Uyumlu ve ortaklık odaklı',
    traits: ['Empati', 'Denge', 'İş birliği'],
  },
  3: {
    desc: 'Yaratıcı, neşeli ve kendini ifade etmeye yatkın. İletişim ve sanatsal yönler bu yapıda öne çıkar.',
    shortDesc: 'Yaratıcı ve ifade gücü güçlü',
    traits: ['Yaratıcılık', 'İletişim', 'Neşe'],
  },
  4: {
    desc: 'Disiplinli, güvenilir ve sağlam temeller kuran. Sistematik düşünme ve azim bu yapının en güçlü yanıdır.',
    shortDesc: 'Disiplinli ve güvenilir',
    traits: ['Disiplin', 'Güvenilirlik', 'Sabır'],
  },
  5: {
    desc: 'Özgür ruhlu, meraklı ve değişimi seven. Yeni deneyimler ve çeşitlilik bu yapı için enerji kaynağıdır.',
    shortDesc: 'Özgür ruhlu ve değişime açık',
    traits: ['Özgürlük', 'Uyum sağlama', 'Macera'],
  },
  6: {
    desc: 'Koruyucu, sorumlu ve ev sıcaklığını taşıyan. Bakım, aile ve sorumluluk bu yapıda anlam bulur.',
    shortDesc: 'Koruyucu ve sorumluluk taşıyan',
    traits: ['Sorumluluk', 'Şefkat', 'Bağlılık'],
  },
  7: {
    desc: 'Bilge, içe dönük ve derin anlam arayan. Sezgi, araştırma ve içgüdü bu yapının güçlü alanlarıdır.',
    shortDesc: 'Bilge ve anlam arayan',
    traits: ['Analiz', 'Sezgi', 'İçgüdü'],
  },
  8: {
    desc: 'Güçlü, hedef odaklı ve liderlik enerjisi taşıyan. Başarı, güç ve sonuç alma bu yapının ana temaları.',
    shortDesc: 'Güçlü ve hedef odaklı',
    traits: ['Liderlik', 'Kararlılık', 'Başarı'],
  },
  9: {
    desc: 'Yardımsever, idealist ve geniş bakış açılı. İnsancıllık ve büyük resmi görme bu yapının doğal erdemi.',
    shortDesc: 'Yardımsever ve idealist',
    traits: ['İnsancıllık', 'Merhamet', 'Vizyon'],
  },
  11: {
    desc: 'Sezgisel, ilham verici ve vizyoner ruhlu. Yüksek hassasiyet ve içsel bilgi bu yapının en güçlü yanı.',
    shortDesc: 'Sezgisel ve vizyoner',
    traits: ['Sezgi', 'İlham', 'Hassasiyet'],
  },
  22: {
    desc: 'Pratik vizyoner ve büyük inşaatçı enerjili. Büyük fikirleri hayata geçirme bu yapının olağanüstü gücüdür.',
    shortDesc: 'Pratik vizyoner',
    traits: ['Vizyon', 'Pratiklik', 'İnşa etme'],
  },
  33: {
    desc: 'Şefkatli öğretmen ve yüksek hizmet ruhu taşıyan. Şifa, öğretme ve insanlığa hizmet bu yapının özüdür.',
    shortDesc: 'Şefkatli ve hizmet odaklı',
    traits: ['Şefkat', 'Öğretme', 'Hizmet'],
  },
};

// ─── Number Type Short Descriptions (for accordion headers) ───────────────────

export const NUMBER_TYPE_DESC: Record<string, string> = {
  lifePath: 'Hayatta ilerleme tarzın',
  birthday: 'Doğal yeteneklerin',
  destiny: 'Dış dünyaya nasıl yansıdığın',
  soulUrge: 'İç motivasyonun',
};

// ─── Personal Year Context ─────────────────────────────────────────────────────

type YearContext = { title: string; desc: string; heroText: string };

const PERSONAL_YEAR_MAP: Record<number, YearContext> = {
  1: {
    title: 'Yeni başlangıçlar yılı',
    desc: 'Bu yıl yeni bir dokuz yıllık döngü başlıyor. Adım atmak, harekete geçmek ve yeni kapılar aralamak destekleniyor.',
    heroText: 'Bu yıl yeni bir döngünün ilk adımını atan biri olarak hareket etmek seni destekliyor.',
  },
  2: {
    title: 'Sabır ve ilişki yılı',
    desc: 'Bu yıl ortaklıklar, bağ kurma ve sabır ön plana çıkıyor. Tek başına değil, birlikte ilerleme zamanı.',
    heroText: 'Bu yıl ilişkiler ve ortaklıklar ön planda. Acele değil, birlikte ilerleme zamanı.',
  },
  3: {
    title: 'Kendini ifade etme yılı',
    desc: 'Bu yıl görünür olmak, kendini daha çok ifade etmek ve yaratıcılığını paylaşmak bekleniyor.',
    heroText: 'Bu yıl kendini daha çok gösterip ifade ettiğin bir dönem. Dikkat çekmek ve görünür olmak bu yılın konusu.',
  },
  4: {
    title: 'Düzen ve temel kurma yılı',
    desc: 'Bu yıl sağlam temeller atmak, yapıları düzenlemek ve uzun vadeli planlar kurmak ön planda.',
    heroText: 'Bu yıl düzen ve sağlam temeller kurma zamanı. Uzun vadeli adımlar bu dönemde anlam kazanıyor.',
  },
  5: {
    title: 'Değişim ve özgürlük yılı',
    desc: 'Bu yıl değişimler hızlanıyor, yeni kapılar açılıyor. Esneklik ve uyum sağlama bu dönemin anahtarı.',
    heroText: 'Bu yıl değişimler ve yeni fırsatlar gündemin üst sıralarına taşınıyor. Akışa açık olmak değer.',
  },
  6: {
    title: 'Sorumluluk ve bakım yılı',
    desc: 'Bu yıl ev, aile, sorumluluk ve bakım temaları güçleniyor. Başkalarına destek verme ve alma dengesi önemli.',
    heroText: 'Bu yıl aile, sorumluluk ve bakım temaları güçleniyor. Vermek ve almak arasındaki denge kritik.',
  },
  7: {
    title: 'İç dönüş ve anlam yılı',
    desc: 'Bu yıl içe bakmak, araştırmak, dinginleşmek ve derin anlam aramak için alan açılıyor.',
    heroText: 'Bu yıl içe bakma ve derin anlam arama zamanı. Sessiz bir güç birikimi fark edilebilir.',
  },
  8: {
    title: 'Güç ve başarı yılı',
    desc: 'Bu yıl hedefler netleşiyor, çabaların somut sonuçlara dönüşme ihtimali yüksek. Güç ve başarı teması güçlü.',
    heroText: 'Bu yıl hedefler netleşiyor ve çabaların karşılık bulma ihtimali yüksek. Güç teması bu yılda baskın.',
  },
  9: {
    title: 'Kapanış ve bırakma yılı',
    desc: 'Bu yıl bir dokuz yıllık döngü tamamlanıyor. Gerekenleri bırakmak ve yeni bir döngüye hazırlanmak önemli.',
    heroText: 'Bu yıl bir döngü kapanıyor. Bırakmak, tamamlamak ve sıfırlanmak bu yılın derin teması.',
  },
};

// ─── Angel / Signal Number Meanings ────────────────────────────────────────────

const SIGNAL_NUMBER_MAP: Record<string, string> = {
  '111': 'Yeni bir düşünce tohumlanıyor. Zihnin net ve olumlu kalsın.',
  '112': 'Yeni başlangıçta denge arıyorsun. Hem harekete geç hem sabır göster.',
  '123': 'Adım adım ilerliyorsun. Sırayı bozma, tempoyu koru.',
  '222': 'Denge ve ortaklık zamanı. Önce dinle, sonra net konuş.',
  '333': 'Yaratıcılık ve ifade güçleniyor. Kendini daha açık dışa vur.',
  '444': 'Destek var. Şu an sağlam bir zemindeyken adım at.',
  '555': 'Değişim kapıda. Akışa karşı direnmek yerine uyum sağla.',
  '666': 'Denge bozulmuş olabilir. İçsel uyumu gözden geçir.',
  '777': 'İçgüdülerine güven. Sezgin seni doğru yöne çekiyor.',
  '888': 'Bolluk ve başarı enerjisi aktif. Hamleni yap.',
  '999': 'Bir şeyi bırakmanın vakti geldi. Kapatman gereken kapılar var.',
  '1111': 'Güçlü bir anlık farkındalık penceresi. Niyetin netleşsin.',
  '1212': 'İlerleme devam ediyor. Her iki tarafı da dengede tut.',
  '1234': 'Temelden yukarıya doğru ilerliyorsun. Sırayı bozma.',
};

// ─── Year Phase Display ────────────────────────────────────────────────────────

export function getPhaseDisplayLabel(yearPhase: string | undefined): string {
  if (!yearPhase) return '';
  const map: Record<string, string> = {
    'Başlangıç Aşaması': 'Başlangıç Aşaması',
    'Opening Phase': 'Başlangıç Aşaması',
    'Derinleşme Aşaması': 'Derinleşme Aşaması',
    'Deepening Phase': 'Derinleşme Aşaması',
    'Tamamlama Aşaması': 'Tamamlama Aşaması',
    'Completion Phase': 'Tamamlama Aşaması',
    'Zirve Aşaması': 'Zirve Aşaması',
    'Peak Phase': 'Zirve Aşaması',
    'Geçiş Aşaması': 'Geçiş Aşaması',
    'Transition Phase': 'Geçiş Aşaması',
  };
  return map[yearPhase] ?? yearPhase;
}

// ─── View Model ────────────────────────────────────────────────────────────────

export type NumerologyViewModel = {
  /** Kısa yaşam yolu açıklaması — sayı orbunun altına gider */
  lifePathShortDesc: string;
  /** Yaşam yolu güçlü özellikler */
  lifePathTraits: string[];
  /** Hero sağ tarafındaki yıl teması başlığı */
  yearThemeTitle: string;
  /** Hero sağ tarafındaki yıl teması açıklaması */
  yearThemeDesc: string;
  /** Hero için daha uzun yıl bağlamı metni */
  yearHeroText: string;
  /** Günün işaret sayısı görünen başlığı */
  displaySignalNumberTitle: string;
  /** Günün işaret sayısı anlamı */
  displaySignalNumberMeaning: string;
  /** Profil intro metni — viewmodel'den türetilmiş birleşik özet */
  profileIntroText: string;
};

export function buildNumerologyViewModel(data: NumerologyResponse | null | undefined): NumerologyViewModel {
  if (!data) {
    return {
      lifePathShortDesc: '',
      lifePathTraits: [],
      yearThemeTitle: '',
      yearThemeDesc: '',
      yearHeroText: '',
      displaySignalNumberTitle: '',
      displaySignalNumberMeaning: '',
      profileIntroText: '',
    };
  }

  // Life path
  const lifePathNumber = data.coreNumbers?.find((n) => n.id === 'lifePath')?.value ?? null;
  const lifePathInfo = lifePathNumber != null ? (LIFE_PATH_MAP[lifePathNumber] ?? null) : null;

  // Personal year
  const personalYear = data.timing?.personalYear ?? null;
  const yearInfo = personalYear != null ? (PERSONAL_YEAR_MAP[personalYear] ?? null) : null;

  // Angel/signal number
  const angelNum = String(data.angelSignal?.angelNumber ?? '');
  const signalMeaning = SIGNAL_NUMBER_MAP[angelNum] ?? data.angelSignal?.meaning ?? '';

  // Profile intro — birleşik bağlam
  let profileIntroText = '';
  if (lifePathInfo && yearInfo) {
    profileIntroText = `${lifePathInfo.shortDesc} yapın var. ${yearInfo.desc}`;
  } else if (lifePathInfo) {
    profileIntroText = lifePathInfo.desc;
  } else {
    profileIntroText = data.profile?.essence ?? data.combinedProfile?.dominantEnergy ?? '';
  }

  return {
    lifePathShortDesc: lifePathInfo?.shortDesc
      ?? data.coreNumbers?.find((n) => n.id === 'lifePath')?.essence?.slice(0, 40)
      ?? '',
    lifePathTraits: lifePathInfo?.traits
      ?? data.coreNumbers?.find((n) => n.id === 'lifePath')?.gifts?.slice(0, 3)
      ?? [],
    yearThemeTitle: yearInfo?.title ?? data.timing?.shortTheme ?? '',
    yearThemeDesc: yearInfo?.desc ?? data.timing?.currentPeriodFocus ?? '',
    yearHeroText: yearInfo?.heroText ?? data.headline ?? '',
    displaySignalNumberTitle: angelNum || '',
    displaySignalNumberMeaning: signalMeaning,
    profileIntroText,
  };
}
