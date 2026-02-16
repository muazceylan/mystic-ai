export interface GlossaryEntry {
  term: string;
  shortDesc: string;
  longDesc: string;
}

export const PLANET_GLOSSARY: Record<string, GlossaryEntry> = {
  Sun: {
    term: 'Güneş',
    shortDesc: 'Kimlik, ego ve yaşam amacı',
    longDesc:
      'Güneş, temel karakterini ve yaşam enerjini temsil eder. Burcundaki konumu, nasıl parladığını ve dünyaya kendini nasıl ifade ettiğini gösterir.',
  },
  Moon: {
    term: 'Ay',
    shortDesc: 'Duygular, içgüdüler ve bilinçaltı',
    longDesc:
      'Ay, duygusal doğanı ve iç dünyanı yansıtır. Güvenlik ihtiyacını, anneyle ilişkiyi ve duygusal tepki kalıplarını belirler.',
  },
  Mercury: {
    term: 'Merkür',
    shortDesc: 'İletişim, düşünce ve öğrenme',
    longDesc:
      'Merkür, düşünce yapını ve iletişim tarzını belirler. Nasıl öğrendiğini, bilgiyi nasıl işlediğini ve çevrene nasıl aktardığını gösterir.',
  },
  Venus: {
    term: 'Venüs',
    shortDesc: 'Aşk, güzellik ve değerler',
    longDesc:
      'Venüs, ilişkilerdeki uyumu, estetik zevklerini ve neye değer verdiğini ortaya koyar. Sevgi dili ve çekim gücünün kaynağıdır.',
  },
  Mars: {
    term: 'Mars',
    shortDesc: 'Enerji, tutku ve irade',
    longDesc:
      'Mars, eylem gücünü, motivasyonunu ve mücadele tarzını temsil eder. Hedeflerine nasıl ulaştığını ve öfkeni nasıl ifade ettiğini gösterir.',
  },
  Jupiter: {
    term: 'Jüpiter',
    shortDesc: 'Büyüme, şans ve felsefe',
    longDesc:
      'Jüpiter, genişleme ve bolluğun gezegenidir. Hayata bakış açını, inançlarını ve şansın hangi alanlarda seni desteklediğini gösterir.',
  },
  Saturn: {
    term: 'Satürn',
    shortDesc: 'Disiplin, sorumluluk ve karmik dersler',
    longDesc:
      'Satürn, hayatındaki sınırları, sorumlulukları ve olgunlaşma alanlarını belirler. Karmik derslerini ve uzun vadeli hedeflerini temsil eder.',
  },
  Uranus: {
    term: 'Uranüs',
    shortDesc: 'Yenilik, özgürlük ve beklenmedik değişimler',
    longDesc:
      'Uranüs, bireyselliğini ve alışılmadık yönlerini temsil eder. Hangi alanlarda gelenekleri yıktığını ve özgün fikirler ürettiğini gösterir.',
  },
  Neptune: {
    term: 'Neptün',
    shortDesc: 'Hayal gücü, maneviyat ve sezgi',
    longDesc:
      'Neptün, ruhsal derinliğini, hayal gücünü ve sezgisel yeteneklerini yansıtır. İlham kaynağını ve manevi yolculuğunu belirler.',
  },
  Pluto: {
    term: 'Plüton',
    shortDesc: 'Dönüşüm, güç ve yeniden doğuş',
    longDesc:
      'Plüton, derin dönüşümlerin ve gizli güçlerin gezegenidir. Hayatında hangi alanlarda köklü değişimler yaşayacağını gösterir.',
  },
};

export const HOUSE_GLOSSARY: Record<number, GlossaryEntry> = {
  1: {
    term: '1. Ev (Yükselen)',
    shortDesc: 'Kendilik, görünüm ve ilk izlenim',
    longDesc:
      'Birinci ev, dış dünyadaki imajını ve insanların seni nasıl gördüğünü belirler. Fiziksel görünümün ve hayata yaklaşım tarzın burada şekillenir.',
  },
  2: {
    term: '2. Ev',
    shortDesc: 'Değerler, para ve maddi güvenlik',
    longDesc:
      'İkinci ev, maddi kaynaklarını, kazanma biçimini ve neye değer verdiğini gösterir. Finansal güvenlik anlayışın burada belirlenir.',
  },
  3: {
    term: '3. Ev',
    shortDesc: 'İletişim, kardeşler ve yakın çevre',
    longDesc:
      'Üçüncü ev, günlük iletişimini, kısa yolculuklarını ve öğrenme tarzını temsil eder. Kardeşlerle ve komşularla ilişkilerin burada şekillenir.',
  },
  4: {
    term: '4. Ev',
    shortDesc: 'Yuva, aile ve kökler',
    longDesc:
      'Dördüncü ev, aile bağlarını, ev yaşamını ve duygusal temellerini gösterir. İç huzurun kaynağı ve çocukluk anıların burada yer alır.',
  },
  5: {
    term: '5. Ev',
    shortDesc: 'Yaratıcılık, aşk ve eğlence',
    longDesc:
      'Beşinci ev, yaratıcı ifadeni, romantik maceralarını ve keyif aldığın aktiviteleri temsil eder. Çocuklarla ilişkin de burada belirlenir.',
  },
  6: {
    term: '6. Ev',
    shortDesc: 'Sağlık, rutin ve hizmet',
    longDesc:
      'Altıncı ev, günlük rutinlerini, sağlık alışkanlıklarını ve iş ortamını gösterir. Başkalarına nasıl hizmet ettiğin burada yansır.',
  },
  7: {
    term: '7. Ev',
    shortDesc: 'Ortaklıklar, evlilik ve ilişkiler',
    longDesc:
      'Yedinci ev, birebir ilişkilerini, evliliğini ve iş ortaklıklarını temsil eder. Partnerinde ne aradığın burada belirlenir.',
  },
  8: {
    term: '8. Ev',
    shortDesc: 'Dönüşüm, gizem ve ortak kaynaklar',
    longDesc:
      'Sekizinci ev, derin dönüşümleri, gizli bilgiyi ve başkalarıyla paylaşılan kaynakları gösterir. Psikolojik derinliğin burada yansır.',
  },
  9: {
    term: '9. Ev',
    shortDesc: 'Felsefe, uzak yolculuklar ve yüksek öğrenim',
    longDesc:
      'Dokuzuncu ev, dünya görüşünü, uzak seyahatlerini ve manevi arayışını temsil eder. Yüksek öğrenim ve öğretmenlik burada yer alır.',
  },
  10: {
    term: '10. Ev (Tepe Noktası)',
    shortDesc: 'Kariyer, toplumsal statü ve amaç',
    longDesc:
      'Onuncu ev, kariyer hedeflerini, toplumsal konumunu ve hayat amacını gösterir. Profesyonel başarıların burada şekillenir.',
  },
  11: {
    term: '11. Ev',
    shortDesc: 'Topluluk, umutlar ve gelecek',
    longDesc:
      'On birinci ev, arkadaş gruplarını, toplumsal idealleri ve gelecek hayallerini temsil eder. Sosyal çevrende nasıl yer aldığın burada belirlenir.',
  },
  12: {
    term: '12. Ev',
    shortDesc: 'Bilinçaltı, maneviyat ve yalnızlık',
    longDesc:
      'On ikinci ev, bilinçaltı kalıplarını, manevi gelişimini ve içsel yolculuğunu gösterir. Gizli yeteneklerin ve karmik borçların burada saklanır.',
  },
};

export const SIGN_GLOSSARY: Record<string, GlossaryEntry> = {
  ARIES: {
    term: 'Koç',
    shortDesc: 'Cesaret, liderlik ve öncülük',
    longDesc:
      'Koç burcu enerjisi cesaret, girişimcilik ve liderlik getirir. Bu konumdaki gezegenler daha atılgan ve doğrudan hareket eder.',
  },
  TAURUS: {
    term: 'Boğa',
    shortDesc: 'Kararlılık, konfor ve sadakat',
    longDesc:
      'Boğa burcu enerjisi sabır, kararlılık ve duyusal zevklere yönelim getirir. Bu konumdaki gezegenler güvenlik ve istikrar arar.',
  },
  GEMINI: {
    term: 'İkizler',
    shortDesc: 'Merak, iletişim ve çok yönlülük',
    longDesc:
      'İkizler burcu enerjisi merak, hızlı düşünce ve sosyal beceri getirir. Bu konumdaki gezegenler çeşitlilik ve entelektüel uyarılma arar.',
  },
  CANCER: {
    term: 'Yengeç',
    shortDesc: 'Şefkat, koruma ve duygusal derinlik',
    longDesc:
      'Yengeç burcu enerjisi duygusal hassasiyet, koruyuculuk ve aileye bağlılık getirir. Bu konumdaki gezegenler güven ve yuva arar.',
  },
  LEO: {
    term: 'Aslan',
    shortDesc: 'Yaratıcılık, gurur ve cömertlik',
    longDesc:
      'Aslan burcu enerjisi yaratıcılık, kendine güven ve sıcaklık getirir. Bu konumdaki gezegenler tanınma ve takdir arar.',
  },
  VIRGO: {
    term: 'Başak',
    shortDesc: 'Analiz, mükemmeliyetçilik ve hizmet',
    longDesc:
      'Başak burcu enerjisi dikkat, analitik düşünce ve pratiklik getirir. Bu konumdaki gezegenler düzen ve işlevsellik arar.',
  },
  LIBRA: {
    term: 'Terazi',
    shortDesc: 'Denge, uyum ve estetik',
    longDesc:
      'Terazi burcu enerjisi uyum arayışı, diplomasi ve estetik duyarlılık getirir. Bu konumdaki gezegenler adalet ve güzellik arar.',
  },
  SCORPIO: {
    term: 'Akrep',
    shortDesc: 'Tutku, gizem ve dönüşüm',
    longDesc:
      'Akrep burcu enerjisi yoğunluk, araştırma ve derin bağlanma getirir. Bu konumdaki gezegenler gerçeğin özünü arar.',
  },
  SAGITTARIUS: {
    term: 'Yay',
    shortDesc: 'Özgürlük, keşif ve iyimserlik',
    longDesc:
      'Yay burcu enerjisi macera, felsefe ve genişleme getirir. Bu konumdaki gezegenler anlam ve özgürlük arar.',
  },
  CAPRICORN: {
    term: 'Oğlak',
    shortDesc: 'Hırs, disiplin ve başarı',
    longDesc:
      'Oğlak burcu enerjisi hırs, sabır ve yapılandırma getirir. Bu konumdaki gezegenler somut başarı ve toplumsal konum arar.',
  },
  AQUARIUS: {
    term: 'Kova',
    shortDesc: 'Yenilikçilik, insancıllık ve bağımsızlık',
    longDesc:
      'Kova burcu enerjisi yenilik, özgünlük ve toplumsal bilinç getirir. Bu konumdaki gezegenler özgürlük ve ilerleme arar.',
  },
  PISCES: {
    term: 'Balık',
    shortDesc: 'Sezgi, empati ve maneviyat',
    longDesc:
      'Balık burcu enerjisi sezgisellik, empati ve hayal gücü getirir. Bu konumdaki gezegenler manevi bağlantı ve şefkat arar.',
  },
};

export const CONCEPT_GLOSSARY: Record<string, GlossaryEntry> = {
  retrograde: {
    term: 'Retro (Rx)',
    shortDesc: 'Gezegenin geriye doğru hareket etmesi',
    longDesc:
      'Retro hareket, gezegenin dünyadan bakıldığında geriye gidiyormuş gibi göründüğü dönemdir. Bu konumdaki gezegenler içe dönük çalışır ve geçmişe dair konuları yeniden değerlendirir.',
  },
  rising: {
    term: 'Yükselen Burç',
    shortDesc: 'Doğum anında ufukta yükselen burç',
    longDesc:
      'Yükselen burcun, dış dünyadaki masken ve insanların seni ilk gördüğündeki izlenimdir. Fiziksel görünümünü ve hayata yaklaşım tarzını belirler.',
  },
  ascendant: {
    term: 'Ascendant',
    shortDesc: 'Yükselen burç ile aynı anlama gelir',
    longDesc:
      'Ascendant, haritanın 1. ev başlangıcıdır ve yükselen burcunla aynı anlama gelir. Kişiliğinin dış yüzünü ve hayat enerjini temsil eder.',
  },
};
