import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, Share2, Sparkles } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AccessibleText, AppHeader, HeaderRightIcons, SafeScreen } from '../../../components/ui';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { getRelationshipPalette } from '../../../constants/compareDesignTokens';
import type { CompareDriverDTO, CompareThemeSectionDTO, ComparisonCardDTO, Label, RelationshipType, ThemeGroup } from '../../../types/compare';
import { RELATIONSHIP_TYPE_LABELS } from '../../../types/compare';
import { parseLocalizedSignLabel } from '../../../utils/matchAstroLabels';
import { parseRelationshipTypeParam } from '../../../services/compare.service';
import { trackEvent } from '../../../services/analytics';
import useComparison from '../../../hooks/useComparison';
import { useInnerHeaderSpacing } from '../../../hooks/useInnerHeaderSpacing';

import CompareModuleTabs from '../../../components/compare/CompareModuleTabs';
import CompareTechnicalDrawer from '../../../components/compare/CompareTechnicalDrawer';
import LoadingSkeletonByModule from '../../../components/compare/LoadingSkeletonByModule';
import ThemeSectionHeader from '../../../components/ThemeSectionHeader';
import PersonAvatar from '../../../components/match/PersonAvatar';
import MatchCircularScore from '../../../components/match/MatchCircularScore';
import ComparisonCard from '../../../components/ComparisonCard';
import { useTranslation } from 'react-i18next';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = firstParam(value);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function moduleTitle(type: RelationshipType): string {
  return `${RELATIONSHIP_TYPE_LABELS[type]} Uyum Haritası`;
}

function mapScoreLabel(score: number): Label {
  if (score >= 75) return 'Uyumlu';
  if (score <= 54) return 'Dikkat';
  return 'Gelişim';
}

function clampPercent(value: number, fallback = 50): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compactText(value: string | null | undefined, fallback: string, maxLen?: number | null): string {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ');
  const source = normalized || fallback;
  if (maxLen == null || maxLen <= 0) return source;
  if (source.length <= maxLen) return source;
  return `${source.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

type OverviewPanelTemplate = {
  id: string;
  themeGroup: ThemeGroup;
  title: string;
  keywords: string[];
  fallbackSummary: string;
  fallbackHint: string;
};

type OverviewSource = {
  id: string;
  kind: 'theme' | 'theme-card' | 'metric' | 'driver';
  title: string;
  score: number;
  summary: string;
  advice: string;
  themeGroup: ThemeGroup;
  search: string;
};

function normalizeSearch(value: string | null | undefined): string {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9çğıöşü\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapThemeGroup(theme: string, relationshipType: RelationshipType): ThemeGroup {
  const haystack = normalizeSearch(theme);

  if (relationshipType === 'love') {
    if (/sevgi|ilgi dili|sevgi dili/.test(haystack)) return 'Sevgi Dili';
    if (/duygusal|bag|sefkat|hassasiyet/.test(haystack)) return 'Duygusal Bağ';
    if (/tutku|cekim|kimya|kivilcim/.test(haystack)) return 'Tutku';
    if (/romantik|flort|akis/.test(haystack)) return 'Romantik Akış';
    if (/guven|sadakat|baglilik|tutarlilik/.test(haystack)) return 'Güven';
    if (/yakinlik dengesi|yakinlik|alan|mesafe|tempo|ritim/.test(haystack)) return 'Yakınlık Dengesi';
    if (/iletisim|konus|soz/.test(haystack)) return 'İletişim';
  }

  if (relationshipType === 'work') {
    if (/ortak hedef|hedef|vizyon|plan uyumu|plan/.test(haystack)) return 'Plan Uyumu';
    if (/iletisim|karar|netlik|ifade/.test(haystack)) return 'İletişim';
    if (/rol|gorev|is bolumu|icra|takip/.test(haystack)) return 'Görev Uyumu';
    if (/hiz|tempo|karar hizi/.test(haystack)) return 'Karar Hızı';
    if (/guven|sorumluluk|taahhut|istikrar/.test(haystack)) return 'Güven';
    if (/catisma|kriz|gerilim|uyumsuzluk|baski/.test(haystack)) return 'Krizi Yönetme';
  }

  if (relationshipType === 'friend') {
    if (/sohbet|iletisim|mesaj|muhabbet/.test(haystack)) return 'Sohbet Akışı';
    if (/eglence|keyif|spontane|aktivite/.test(haystack)) return 'Eğlence';
    if (/destek|sadakat|yaninda|sefk?at/.test(haystack)) return 'Destek & Sadakat';
    if (/guven|sir|mahrem/.test(haystack)) return 'Güven';
    if (/sinir|alan|ozgurluk|mesafe/.test(haystack)) return 'Sınırlar';
    if (/ritim|tempo|temas/.test(haystack)) return 'Duygusal Tempo';
  }

  if (relationshipType === 'family') {
    if (/aidiyet|baglilik|aile bagi/.test(haystack)) return 'Bağlılık';
    if (/sefkat|bakim|ilgi/.test(haystack)) return 'Şefkat';
    if (/duygu|iletisim|konus|hassasiyet/.test(haystack)) return 'İletişim';
    if (/ev ici|ritim|gundelik|tempo/.test(haystack)) return 'Duygusal Tempo';
    if (/dayanisma|sorumluluk|yuk|paylasim/.test(haystack)) return 'Sorumluluk';
    if (/onarim|kirginlik|toparlanma/.test(haystack)) return 'Onarım';
    if (/sinir|mesafe|alan/.test(haystack)) return 'Sınırlar';
  }

  if (relationshipType === 'rival') {
    if (/rekabet dili|yaris|rekabet/.test(haystack)) return 'Rekabet Dili';
    if (/strateji|zihinsel|okuma|hamle/.test(haystack)) return 'Strateji';
    if (/gerilim|tetik|kontrol|ofke/.test(haystack)) return 'Gerilim';
    if (/baski|performans|dayaniklilik|tempo/.test(haystack)) return 'Baskı Altı Performans';
    if (/kural|adil|fair|etik/.test(haystack)) return 'Güven';
  }

  if (relationshipType !== 'rival' && /ritim|tempo|yakınlık dengesi|yakinlik dengesi|alan ihtiyacı|alan ihtiyaci|ev içi|ev ici/.test(haystack)) {
    return 'Duygusal Tempo';
  }
  if (/hedef|vizyon|yön|yon|plan|strateji|kazanma/.test(haystack)) return 'Karar & Plan';
  if (/çatışma|catisma|kriz|gerilim|tetik|baskı|baski/.test(haystack)) return 'Krizi Yönetme';
  if (/sınır saygısı|sinir saygisi|sınırlar|sinirlar|alan|mesafe|özgürlük|ozgurluk/.test(haystack)) return 'Sınırlar';
  if (/iletişim|iletisim|konuş|konus|mesaj|söz/.test(haystack)) return 'İletişim';
  if (/güven|guven|sadakat|sınır|sinir/.test(haystack)) return 'Güven';
  if (/tutku|çekim|cekim|kimya|romantik|aşk|ask/.test(haystack)) return relationshipType === 'love' ? 'Tutku' : 'Aşk & Çekim';
  if (/iş|is|plan|görev|gorev|karar/.test(haystack)) return 'İş Bölümü';
  if (/rekabet|strateji|baskı|baski|tempo|tetik/.test(haystack)) return 'Rekabet & Strateji';
  if (/aile|aidiyet|sorumluluk/.test(haystack)) return 'Aile Bağı';
  if (relationshipType === 'work') return 'İş Bölümü';
  if (relationshipType === 'rival') return 'Rekabet & Strateji';
  if (relationshipType === 'family') return 'Aile Bağı';
  if (relationshipType === 'friend') return 'Destek & Sadakat';
  return 'Aşk & Çekim';
}

function relationPanelTemplates(relationshipType: RelationshipType): OverviewPanelTemplate[] {
  if (relationshipType === 'love') {
    return [
      {
        id: 'love-sevgi-dili',
        themeGroup: 'Sevgi Dili',
        title: 'Sevgi Dili',
        keywords: ['sevgi', 'şefkat', 'ilgi', 'duygusal bağ', 'yakınlık'],
        fallbackSummary: 'Biri sevgiyi daha görünür duymak isterken diğeri bunu daha doğal akışta gösterebilir.',
        fallbackHint: 'İlgi beklentinizi yalnız kırgınlık anında değil, sakin bir zamanda da konuşun.',
      },
      {
        id: 'love-duygusal-bag',
        themeGroup: 'Duygusal Bağ',
        title: 'Duygusal Bağ',
        keywords: ['duygusal', 'bağ', 'hassasiyet', 'yakınlık', 'şefkat'],
        fallbackSummary: 'Duygusal açıklık aynı hızda gelmediğinde biri daha yakın, diğeri daha temkinli görünebilir.',
        fallbackHint: 'Önce ne hissettiğinizi söylemek, sonra çözümü konuşmak yanlış okumaları azaltır.',
      },
      {
        id: 'love-cekim-tutku',
        themeGroup: 'Tutku',
        title: 'Çekim & Tutku',
        keywords: ['çekim', 'tutku', 'kimya', 'romantik', 'kıvılcım'],
        fallbackSummary: 'Çekim güçlü olsa da biri yakınlaşmayı hızla büyütürken diğeri ritmi yavaşlatmak isteyebilir.',
        fallbackHint: 'Kıvılcımı korumak için yalnız spontane değil, bilinçli yakınlık anları da yaratın.',
      },
      {
        id: 'love-guven-baglilik',
        themeGroup: 'Güven',
        title: 'Güven & Bağlılık',
        keywords: ['güven', 'sadakat', 'istikrar', 'bağlılık', 'tutarlılık'],
        fallbackSummary: 'Güven biri için sözde, diğeri için davranışta ölçüldüğünde beklenti farkı büyüyebilir.',
        fallbackHint: 'Küçük sözleri zamanında tutmak, uzun açıklamalardan daha hızlı güven verir.',
      },
      {
        id: 'love-romantik-akis',
        themeGroup: 'Romantik Akış',
        title: 'Romantik Akış',
        keywords: ['romantik', 'yakınlaşma', 'flört', 'ritüel', 'akıș'],
        fallbackSummary: 'Romantik jestlerin ritmi farklıysa biri ilişkinin sıcak kaldığını, diğeri eksik kaldığını düşünebilir.',
        fallbackHint: 'Romantik beklentiyi sadece özel günlere değil, küçük gündelik anlara da yayın.',
      },
      {
        id: 'love-yakinlik-ritmi',
        themeGroup: 'Yakınlık Dengesi',
        title: 'Yakınlık Ritmi',
        keywords: ['yakınlık dengesi', 'ritim', 'tempo', 'alan', 'yakınlık'],
        fallbackSummary: 'Temas dozu aynı olmadığında biri geri çekilmiş, diğeri fazla yüklenmiş gibi hissedebilir.',
        fallbackHint: 'Yakınlık ve alan ihtiyacını yalnız gerilimde değil, sakin günde de netleştirin.',
      },
      {
        id: 'love-iletisim-ritmi',
        themeGroup: 'İletişim',
        title: 'İletişim Ritmi',
        keywords: ['iletişim', 'konuşma', 'mesaj', 'ifade', 'netlik'],
        fallbackSummary: 'Biri hislerini daha erken konuşmak isterken diğeri duygusunu sindirdikten sonra açılabilir.',
        fallbackHint: 'Önce ne konuşulacağını, sonra ne hissedildiğini ayırmak iletişim baskısını azaltır.',
      },
      {
        id: 'love-onarim',
        themeGroup: 'Onarım',
        title: 'Kırgınlık Sonrası',
        keywords: ['onarım', 'kırgınlık', 'barışma', 'toparlanma', 'af'],
        fallbackSummary: 'Kırgınlık sonrası biri hızlıca toparlanmak, diğeri önce mesafesini korumak isteyebilir.',
        fallbackHint: 'Özür, açıklama ve temasın sırasını iyi ayarlamak onarımı hızlandırır.',
      },
    ];
  }

  if (relationshipType === 'work') {
    return [
      {
        id: 'work-ortak-hedef',
        themeGroup: 'Plan Uyumu',
        title: 'Ortak Hedef',
        keywords: ['hedef', 'plan', 'vizyon', 'yön', 'strateji'],
        fallbackSummary: 'Biri resmi erken görmek isterken diğeri adımları yürürken netleştirmeyi seçebilir.',
        fallbackHint: 'İşe başlamadan önce tek cümlelik başarı tanımı belirlemek sürtünmeyi azaltır.',
      },
      {
        id: 'work-karar-iletisim',
        themeGroup: 'İletişim',
        title: 'Karar & İletişim',
        keywords: ['karar', 'iletişim', 'netlik', 'konuşma', 'ifade'],
        fallbackSummary: 'Karar alma hızı farklıysa biri gecikme, diğeri acelecilik hissedebilir.',
        fallbackHint: 'Karar gerektiren konularda son tarih ve karar sahibi baştan belli olsun.',
      },
      {
        id: 'work-rol-dagilimi',
        themeGroup: 'Görev Uyumu',
        title: 'Rol Dağılımı',
        keywords: ['rol', 'görev', 'iş bölümü', 'sorumluluk', 'icra'],
        fallbackSummary: 'İş paylaşımı görünür değilse biri yük taşıdığını, diğeri müdahale edildiğini düşünebilir.',
        fallbackHint: 'Kim başlayacak, kim tamamlayacak sorusunu işin başında netleştirin.',
      },
      {
        id: 'work-guven-sorumluluk',
        themeGroup: 'Güven',
        title: 'Güven & Sorumluluk',
        keywords: ['güven', 'sorumluluk', 'istikrar', 'takip', 'taahhüt'],
        fallbackSummary: 'Tutarlılık beklentisi karşılanmadığında iş ilişkisi hızla kişisel gerilime dönebilir.',
        fallbackHint: 'Söz verilen işlerde durum güncellemesi yapmak güveni sessizce büyütür.',
      },
      {
        id: 'work-karar-hizi',
        themeGroup: 'Karar Hızı',
        title: 'Karar Hızı',
        keywords: ['karar hızı', 'tempo', 'hız', 'karar', 'zamanlama'],
        fallbackSummary: 'Biri hızlı karar alıp ilerlemek isterken diğeri seçenekleri biraz daha tartmak isteyebilir.',
        fallbackHint: 'Küçük kararlarda hız, büyük kararlarda kontrol kuralı belirlemek işleri rahatlatır.',
      },
      {
        id: 'work-catisma-yonetimi',
        themeGroup: 'Krizi Yönetme',
        title: 'Çatışma Yönetimi',
        keywords: ['çatışma', 'kriz', 'gerilim', 'uyumsuzluk', 'denge'],
        fallbackSummary: 'Baskı anında biri çözümü hızla iterken diğeri önce tonu düşürmek isteyebilir.',
        fallbackHint: 'Gerilim yükseldiğinde önce sorunu, sonra kişisel yorumu ayırın.',
      },
      {
        id: 'work-is-takibi',
        themeGroup: 'İş Bölümü',
        title: 'İş Takibi',
        keywords: ['takip', 'deadline', 'tamamlama', 'kontrol', 'teslim'],
        fallbackSummary: 'Takip biçimi farklıysa biri yalnız bırakıldığını, diğeri fazla kontrol edildiğini hissedebilir.',
        fallbackHint: 'İş takibini insan üzerinden değil, ortak görünür liste üzerinden yürütün.',
      },
    ];
  }

  if (relationshipType === 'friend') {
    return [
      {
        id: 'friend-ortak-ilgi',
        themeGroup: 'Destek & Sadakat',
        title: 'Ortak İlgi',
        keywords: ['ortak ilgi', 'merak', 'paylaşım', 'keyif', 'bağ'],
        fallbackSummary: 'Ortak zevkler canlı olduğunda bağ kolay derinleşir; ritim düşünce temas da seyrekleşebilir.',
        fallbackHint: 'İkinizi de besleyen küçük ortak rutinler arkadaşlığı sıcak tutar.',
      },
      {
        id: 'friend-sohbet-akisi',
        themeGroup: 'Sohbet Akışı',
        title: 'Sohbet Akışı',
        keywords: ['sohbet', 'muhabbet', 'iletişim', 'mesaj', 'konuşma'],
        fallbackSummary: 'Biri daha sık temasla canlı kalırken diğeri uzun ama seyrek konuşmalarla yetinebilir.',
        fallbackHint: 'Temas sıklığı beklentisini isimlendirmek arkadaşlıkta sessiz kırılmaları azaltır.',
      },
      {
        id: 'friend-eglence-tarzi',
        themeGroup: 'Eğlence',
        title: 'Eğlence Tarzı',
        keywords: ['eğlence', 'tempo', 'ritim', 'spontane', 'sohbet'],
        fallbackSummary: 'Biri planlı buluşmayı, diğeri spontane akışı sevdiğinde keyif aynı olsa da tempo ayrışabilir.',
        fallbackHint: 'Bazen planlı, bazen spontane buluşmak dengeyi korur.',
      },
      {
        id: 'friend-guven-sirlar',
        themeGroup: 'Güven',
        title: 'Güven & Sırlar',
        keywords: ['güven', 'sadakat', 'sır', 'mahrem', 'tutarlılık'],
        fallbackSummary: 'Biri güveni açık sahiplenmede ararken diğeri bunu zaten hissettirdiğini varsayabilir.',
        fallbackHint: 'Destek verdiğinizi düşündüğünüz anda bunu görünür kılmanız bağı güçlendirir.',
      },
      {
        id: 'friend-destek-sefkat',
        themeGroup: 'Destek & Sadakat',
        title: 'Destek & Şefkat',
        keywords: ['destek', 'şefkat', 'yanında olmak', 'empati', 'sadakat'],
        fallbackSummary: 'İyi niyet ortak olsa da desteğin dili farklı olduğunda biri eksik ilgi hissedebilir.',
        fallbackHint: 'Zor günlerde “Ne yapmam iyi gelir?” sorusu varsayımdan daha çok işe yarar.',
      },
      {
        id: 'friend-sadakat',
        themeGroup: 'Güven',
        title: 'Sadakat Dili',
        keywords: ['sadakat', 'arkada durmak', 'sahiplenme', 'güven', 'istikrar'],
        fallbackSummary: 'Biri dostluğu daha görünür sahiplenirken diğeri bunun zaten bilindiğini düşünebilir.',
        fallbackHint: 'Zor anda görünür biçimde yanında durmak, niyeti tahmin etmeye bırakmaktan daha etkilidir.',
      },
      {
        id: 'friend-sinir-saygisi',
        themeGroup: 'Sınırlar',
        title: 'Sınır Saygısı',
        keywords: ['sınır', 'alan', 'özgürlük', 'mesafe', 'denge'],
        fallbackSummary: 'Yakınlık isteği ile alan ihtiyacı aynı anda çalışmadığında küçük kırılmalar birikebilir.',
        fallbackHint: 'Sessizlik ihtiyacı ile uzaklaşma duygusunu birbirine karıştırmamaya çalışın.',
      },
      {
        id: 'friend-temas-ritmi',
        themeGroup: 'Duygusal Tempo',
        title: 'Temas Ritmi',
        keywords: ['temas', 'ritim', 'tempo', 'buluşma', 'yakınlık'],
        fallbackSummary: 'Aynı sıcaklık olsa da temas ritmi farklıysa biri daha bağlı, diğeri daha gevşek sanılabilir.',
        fallbackHint: 'Birbirinizi yalnız müsait olduğunuzda değil, değer verdiğiniz için aradığınızı görünür kılın.',
      },
    ];
  }

  if (relationshipType === 'family') {
    return [
      {
        id: 'family-sefkat-dili',
        themeGroup: 'Şefkat',
        title: 'Şefkat Dili',
        keywords: ['şefkat', 'bakım', 'yakınlık', 'aidiyet', 'duygu'],
        fallbackSummary: 'Biri ilgiyi daha görünür isterken diğeri sevgisini görev üzerinden göstermeye eğilimli olabilir.',
        fallbackHint: 'Aile içinde bakımın ne zaman duygu, ne zaman sorumluluk olarak yaşandığını açık konuşun.',
      },
      {
        id: 'family-aidiyet',
        themeGroup: 'Bağlılık',
        title: 'Aidiyet',
        keywords: ['aidiyet', 'bağlılık', 'aile bağı', 'birlik', 'yakınlık'],
        fallbackSummary: 'Biri aile bağını daha sık temasla, diğeri sessiz sorumlulukla yaşatıyor olabilir.',
        fallbackHint: 'Yakınlık beklentisini görev paylaşımıyla karıştırmamak aidiyet hissini güçlendirir.',
      },
      {
        id: 'family-ev-ici-ritim',
        themeGroup: 'Duygusal Tempo',
        title: 'Ev İçi Ritim',
        keywords: ['ev', 'ritim', 'tempo', 'günlük düzen', 'yakınlık'],
        fallbackSummary: 'Günlük düzen beklentisi farklıysa biri düzensizlik, diğeri baskı hissedebilir.',
        fallbackHint: 'Küçük rutinleri birlikte belirlemek ev içi tansiyonu belirgin biçimde düşürür.',
      },
      {
        id: 'family-duygu-iletisim',
        themeGroup: 'İletişim',
        title: 'Duygu & İletişim',
        keywords: ['duygu', 'iletişim', 'ifade', 'konuşma', 'hassasiyet'],
        fallbackSummary: 'Biri meseleyi hemen konuşmak isterken diğeri önce içine çekilip toparlanmayı seçebilir.',
        fallbackHint: 'Hassas konuları aynı gün çözmek zorunda hissetmeden ama ertelemeden konuşun.',
      },
      {
        id: 'family-dayanisma',
        themeGroup: 'Aile Bağı',
        title: 'Dayanışma',
        keywords: ['dayanışma', 'yardım', 'destek', 'birlik', 'paylaşım'],
        fallbackSummary: 'Yardım etme isteği ortak olsa da yardımın zamanı ve biçimi farklı algılanabilir.',
        fallbackHint: 'Destek verirken önce ihtiyaç sorusu sormak yanlış anlaşılmayı azaltır.',
      },
      {
        id: 'family-sorumluluk-sinir',
        themeGroup: 'Sorumluluk',
        title: 'Sınırlar & Sorumluluk',
        keywords: ['sınır', 'sorumluluk', 'güven', 'yük', 'denge'],
        fallbackSummary: 'Yük paylaşımı açık değilse biri fazla sorumluluk, diğeri fazla müdahale hissedebilir.',
        fallbackHint: 'Kimin neyi üstlendiğini görünür kılmak kırgınlık birikimini azaltır.',
      },
      {
        id: 'family-hassasiyet',
        themeGroup: 'İletişim',
        title: 'Hassasiyet Yönetimi',
        keywords: ['hassasiyet', 'duygu', 'kırılganlık', 'iletişim', 'ton'],
        fallbackSummary: 'Aynı sözü farklı tonda duymak, aile içinde beklenenden daha büyük kırılmalara yol açabilir.',
        fallbackHint: 'Haklı olmaya değil, duyulmaya odaklanan cümleler aile içi tansiyonu ciddi biçimde düşürür.',
      },
      {
        id: 'family-onarim',
        themeGroup: 'Onarım',
        title: 'Kırgınlık Sonrası',
        keywords: ['onarım', 'barışma', 'toparlanma', 'özür', 'yaklaşma'],
        fallbackSummary: 'Biri barışmayı hızla isterken diğeri duygusu yatışmadan yakınlaşmaya hazır olmayabilir.',
        fallbackHint: 'Önce temas, sonra açıklama değil; önce anlaşıldığını hissettirmek onarımı hızlandırır.',
      },
    ];
  }

  return [
    {
      id: 'rival-rekabet-dili',
      themeGroup: 'Rekabet Dili',
      title: 'Rekabet Dili',
      keywords: ['rekabet', 'tempo', 'atak', 'kazanma', 'yarış'],
      fallbackSummary: 'Biri oyunu açık oynamayı, diğeri doğru anı bekleyerek ilerlemeyi seçebilir.',
      fallbackHint: 'Kural ve hedef net olduğunda rekabet daha temiz ve öğretici çalışır.',
    },
    {
      id: 'rival-zihinsel-oyun',
      themeGroup: 'Strateji',
      title: 'Zihinsel Oyun',
      keywords: ['strateji', 'zihinsel', 'hamle', 'okuma', 'karar'],
      fallbackSummary: 'Okuma biçiminiz farklıysa biri erken hamle, diğeri sabırlı kurgu ile ilerleyebilir.',
      fallbackHint: 'Rakibi okumak kadar kendi açıklarınızı tanımak da fark yaratır.',
    },
    {
      id: 'rival-hamle-zamanlamasi',
      themeGroup: 'Strateji',
      title: 'Hamle Zamanlaması',
      keywords: ['hamle', 'zamanlama', 'atak', 'karar', 'tempo'],
      fallbackSummary: 'Biri ilk fırsatta ilerlemeyi, diğeri daha geç ama daha temiz vuruş yapmayı seçebilir.',
      fallbackHint: 'Hamlenin doğru anı kadar, neden şimdi geldiği de oyunun psikolojisini belirler.',
    },
    {
      id: 'rival-gerilim-noktasi',
      themeGroup: 'Gerilim',
      title: 'Gerilim Noktası',
      keywords: ['gerilim', 'tetiklenme', 'baskı', 'kontrol', 'öfke'],
      fallbackSummary: 'Baskı yükseldiğinde biri sertleşirken diğeri sessizleşebilir; bu fark gerilimi uzatır.',
      fallbackHint: 'Gerilim anında tepki değil kural konuşmak daha hızlı denge sağlar.',
    },
    {
      id: 'rival-adil-oyun',
      themeGroup: 'Güven',
      title: 'Adil Oyun',
      keywords: ['adil', 'etik', 'kural', 'dürüstlük', 'fair'],
      fallbackSummary: 'Sınırlar net değilse rekabet kolayca kişiselleşebilir ve performansı gölgeleyebilir.',
      fallbackHint: 'Kuralları önceden konuşmak, sonradan niyet tartışmaktan çok daha sağlıklıdır.',
    },
    {
      id: 'rival-kazanma-stratejisi',
      themeGroup: 'Strateji',
      title: 'Kazanma Stratejisi',
      keywords: ['kazanma', 'strateji', 'plan', 'uygulama', 'sonuç'],
      fallbackSummary: 'Biri hızla sonuca gitmek isterken diğeri oyunu zamana yaymayı daha güçlü kullanabilir.',
      fallbackHint: 'Güçlü yanınızı rakibin zayıf anına değil, kendi net planınıza bağlayın.',
    },
    {
      id: 'rival-baski-alti-tempo',
      themeGroup: 'Baskı Altı Performans',
      title: 'Baskı Altı Tempo',
      keywords: ['tempo', 'dayanıklılık', 'baskı', 'dayanım', 'ritim'],
      fallbackSummary: 'Yıpratıcı süreçlerde biri hızı artırır, diğeri kontrolü kaybetmemek için yavaşlar.',
      fallbackHint: 'Uzayan rekabette ritim korumak, kısa süreli hırs patlamalarından daha etkilidir.',
    },
    {
      id: 'rival-tetiklenme-kontrolu',
      themeGroup: 'Krizi Yönetme',
      title: 'Tetiklenme Kontrolü',
      keywords: ['tetiklenme', 'öfke', 'reaksiyon', 'kontrol', 'kriz'],
      fallbackSummary: 'Psikolojik baskı altında biri daha görünür tepki verirken diğeri oyunu içerden kurmaya devam edebilir.',
      fallbackHint: 'Rakibin hamlesine değil, kendi ritim kaybınıza odaklanmanız avantaj sağlar.',
    },
  ];
}

function derivePanelTraits(
  relationshipType: RelationshipType,
  themeTitle: string,
  leftName: string,
  rightName: string,
  tFn: (key: string, opts?: Record<string, string>) => string = (k) => k,
): { leftTrait: string; rightTrait: string } {
  const theme = normalizeSearch(themeTitle);

  if (relationshipType === 'love') {
    if (/sevgi dili/.test(theme)) {
      return {
        leftTrait: `${leftName}: ilgiyi daha açık ve görünür hissetmek ister`,
        rightTrait: `${rightName}: sevgiyi daha doğal ve zamana yayılan biçimde gösterir`,
      };
    }
    if (/duygusal bag/.test(theme)) {
      return {
        leftTrait: `${leftName}: duygusal netlik ve temasla rahat eder`,
        rightTrait: `${rightName}: içini açarken önce güvenli alan arar`,
      };
    }
    if (/tutku|cekim/.test(theme)) {
      return {
        leftTrait: `${leftName}: kıvılcımı hızlı ve net hissettiğinde açılır`,
        rightTrait: `${rightName}: çekimi akış içinde büyütmeyi tercih eder`,
      };
    }
    if (/romantik akis/.test(theme)) {
      return {
        leftTrait: `${leftName}: romantizmi görünür jestlerle beslemeyi sever`,
        rightTrait: `${rightName}: küçük ama doğal yakınlık anlarıyla açılır`,
      };
    }
    if (/guven|baglilik/.test(theme)) {
      return {
        leftTrait: `${leftName}: söz ile davranışın aynı çizgide kalmasına önem verir`,
        rightTrait: `${rightName}: duygusal sıcaklık sürdükçe daha kolay güvenir`,
      };
    }
    if (/onarim|kirginlik/.test(theme)) {
      return {
        leftTrait: `${leftName}: kırgınlığı uzun taşımadan çözmek ister`,
        rightTrait: `${rightName}: sakinleşmeden geri dönmekte zorlanabilir`,
      };
    }
    return {
      leftTrait: `${leftName}: teması biraz daha sık kurunca rahatlar`,
      rightTrait: `${rightName}: alanı korunduğunda daha kolay yakınlaşır`,
    };
  }

  if (relationshipType === 'work') {
    if (/ortak hedef|plan uyumu|plan/.test(theme)) {
      return {
        leftTrait: `${leftName}: çerçeveyi erken netleştirip ilerlemek ister`,
        rightTrait: `${rightName}: ilerledikçe şekillenen plana daha rahattır`,
      };
    }
    if (/iletisim|karar/.test(theme)) {
      return {
        leftTrait: `${leftName}: kararın net ve kısa konuşulmasını ister`,
        rightTrait: `${rightName}: seçenekleri tartarak sonuca gitmeye yatkındır`,
      };
    }
    if (/gorev|rol|is takibi/.test(theme)) {
      return {
        leftTrait: `${leftName}: görevlerin görünür ve bölünmüş olmasını ister`,
        rightTrait: `${rightName}: esnek görev alanında daha rahat üretir`,
      };
    }
    if (/karar hizi|tempo/.test(theme)) {
      return {
        leftTrait: `${leftName}: hızlı netleşmeyle rahat eder`,
        rightTrait: `${rightName}: acele yerine sağlam karar arar`,
      };
    }
    return {
      leftTrait: `${leftName}: yükün görünür ve paylaşılmış olmasını ister`,
      rightTrait: `${rightName}: esnek alan olduğunda daha verimli çalışır`,
    };
  }

  if (relationshipType === 'friend') {
    if (/ortak ilgi/.test(theme)) {
      return {
        leftTrait: `${leftName}: temasın daha düzenli akmasıyla rahat eder`,
        rightTrait: `${rightName}: arkadaşlığı daha serbest bir ritimde yaşar`,
      };
    }
    if (/sohbet akisi/.test(theme)) {
      return {
        leftTrait: `${leftName}: konuşmanın daha sık ve sıcak kalmasını ister`,
        rightTrait: `${rightName}: az ama derin temasla da bağ kurabilir`,
      };
    }
    if (/eglence/.test(theme)) {
      return {
        leftTrait: `${leftName}: planlı keyif alanlarıyla daha rahat açılır`,
        rightTrait: `${rightName}: spontane akışta daha canlı hisseder`,
      };
    }
    if (/guven|destek|sadakat/.test(theme)) {
      return {
        leftTrait: `${leftName}: desteğin daha görünür olmasını önemser`,
        rightTrait: `${rightName}: niyetinin zaten hissedildiğini düşünebilir`,
      };
    }
    return {
      leftTrait: `${leftName}: sınırların açık konuşulmasıyla rahat eder`,
      rightTrait: `${rightName}: alanı korunduğunda daha sıcak kalır`,
    };
  }

  if (relationshipType === 'family') {
    if (/baglilik|aidiyet/.test(theme)) {
      return {
        leftTrait: `${leftName}: bağı sık temasla canlı tutmak ister`,
        rightTrait: `${rightName}: bağlılığı daha sessiz ama kalıcı yaşar`,
      };
    }
    if (/sefkat/.test(theme)) {
      return {
        leftTrait: `${leftName}: ilgiyi ve yakınlığı daha görünür hissetmek ister`,
        rightTrait: `${rightName}: hassas konularda önce içine dönüp toparlanabilir`,
      };
    }
    if (/onarim|kirginlik/.test(theme)) {
      return {
        leftTrait: `${leftName}: kırgınlık sonrası daha erken toparlanmak ister`,
        rightTrait: `${rightName}: yumuşamadan geri dönmekte zorlanabilir`,
      };
    }
    if (/sorumluluk|sinir/.test(theme)) {
      return {
        leftTrait: `${leftName}: yükün ve yakınlığın açık konuşulmasını ister`,
        rightTrait: `${rightName}: sınırını koruyarak katkı vermeyi seçer`,
      };
    }
    return {
      leftTrait: tFn('compare.conflictLeftTrait', { name: leftName }),
      rightTrait: tFn('compare.conflictRightTrait', { name: rightName }),
    };
  }

  if (/rekabet dili/.test(theme)) {
    return {
      leftTrait: `${leftName}: gücünü daha açık göstermeyi tercih eder`,
      rightTrait: `${rightName}: hamlesini daha kontrollü saklamaya yatkındır`,
    };
  }
  if (/strateji|tempo|zihinsel|hamle/.test(theme)) {
    return {
      leftTrait: `${leftName}: oyunu erken okuyup hamleyi netleştirmek ister`,
      rightTrait: `${rightName}: doğru anı bekleyerek ilerlemeye yatkındır`,
    };
  }
  if (/gerilim|kontrol|baski|performans/.test(theme)) {
    return {
      leftTrait: `${leftName}: baskı yükselince tepkiyi daha hızlı dışa vurabilir`,
      rightTrait: `${rightName}: kontrolü korumak için önce geri çekilebilir`,
    };
  }
  return {
    leftTrait: `${leftName}: kuralların net ve görünür kalmasını ister`,
    rightTrait: `${rightName}: esnek yorum alanı olduğunda daha rahat hareket eder`,
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function deriveValueSplit(score: number, seed: string): { leftValue: number; rightValue: number } {
  const amplitude = Math.max(8, Math.min(22, Math.round(8 + Math.abs(score - 60) * 0.28)));
  const direction = hashString(seed) % 2 === 0 ? 1 : -1;
  const microShift = (hashString(`${seed}-shift`) % 5) - 2;
  const leftValue = clampPercent(50 + direction * amplitude + microShift, 50);
  return { leftValue, rightValue: 100 - leftValue };
}

function buildOverviewSources(
  relationshipType: RelationshipType,
  summaryFallback: string,
  hintFallback: string,
  themeSections: Array<{
    theme: string;
    score: number;
    miniInsight: string;
    cards: Array<{ title: string; description: string; actionHint: string }>;
  }>,
  metricCards: Array<{ id: string; title: string; score: number; insight: string }>,
  topDrivers: {
    supportive: Array<{ title: string; impact: number; why: string; hint: string }>;
    challenging: Array<{ title: string; impact: number; why: string; hint: string }>;
    growth: Array<{ title: string; impact: number; why: string; hint: string }>;
  },
): OverviewSource[] {
  const sources: OverviewSource[] = [];

  themeSections.forEach((section, sectionIndex) => {
    const sectionThemeGroup = mapThemeGroup(section.theme, relationshipType);
    const leadCard = section.cards?.[0];
    const sectionSummary = compactText(section.miniInsight || leadCard?.description, summaryFallback, null);
    const sectionAdvice = compactText(leadCard?.actionHint, hintFallback, null);

    sources.push({
      id: `section-${sectionIndex + 1}`,
      kind: 'theme',
      title: compactText(section.theme, `Tema ${sectionIndex + 1}`, 48),
      score: clampPercent(section.score, 60),
      summary: sectionSummary,
      advice: sectionAdvice,
      themeGroup: sectionThemeGroup,
      search: normalizeSearch(
        `${section.theme} ${section.miniInsight} ${section.cards.map((card) => `${card.title} ${card.description}`).join(' ')}`,
      ),
    });

    section.cards.forEach((card, cardIndex) => {
      sources.push({
        id: `section-${sectionIndex + 1}-card-${cardIndex + 1}`,
        kind: 'theme-card',
        title: compactText(card.title, section.theme, 48),
        score: clampPercent(section.score, 60),
        summary: compactText(card.description, sectionSummary, null),
        advice: compactText(card.actionHint, sectionAdvice, null),
        themeGroup: mapThemeGroup(`${section.theme} ${card.title}`, relationshipType),
        search: normalizeSearch(`${section.theme} ${card.title} ${card.description} ${card.actionHint}`),
      });
    });
  });

  metricCards.forEach((metric, metricIndex) => {
    sources.push({
      id: `metric-${metric.id || metricIndex + 1}`,
      kind: 'metric',
      title: compactText(metric.title, `Başlık ${metricIndex + 1}`, 48),
      score: clampPercent(metric.score, 60),
      summary: compactText(metric.insight, summaryFallback, null),
      advice: compactText(hintFallback, hintFallback, null),
      themeGroup: mapThemeGroup(metric.title, relationshipType),
      search: normalizeSearch(`${metric.title} ${metric.insight}`),
    });
  });

  (['supportive', 'challenging', 'growth'] as const).forEach((driverType) => {
    topDrivers[driverType].forEach((driver, driverIndex) => {
      sources.push({
        id: `driver-${driverType}-${driverIndex + 1}`,
        kind: 'driver',
        title: compactText(driver.title, `İçgörü ${driverIndex + 1}`, 48),
        score: clampPercent(driver.impact, 60),
        summary: compactText(driver.why, summaryFallback, null),
        advice: compactText(driver.hint, hintFallback, null),
        themeGroup: mapThemeGroup(driver.title, relationshipType),
        search: normalizeSearch(`${driver.title} ${driver.why} ${driver.hint}`),
      });
    });
  });

  return sources;
}

function scoreOverviewSourceMatch(template: OverviewPanelTemplate, source: OverviewSource): number {
  let score = source.themeGroup === template.themeGroup ? 22 : 0;
  const templateTitle = normalizeSearch(template.title);
  const searchTokens = template.keywords.map(normalizeSearch).filter(Boolean);
  if (source.search.includes(templateTitle)) score += 12;

  searchTokens.forEach((keyword) => {
    if (keyword && source.search.includes(keyword)) score += 8;
  });

  templateTitle.split(' ').forEach((token) => {
    if (token.length >= 4 && source.search.includes(token)) score += 2;
  });

  const kindBoost = source.kind === 'theme'
    ? 14
    : source.kind === 'theme-card'
      ? 10
      : source.kind === 'metric'
        ? 4
        : 0;

  return score + kindBoost + Math.round(source.score / 20);
}

function selectOverviewSource(
  template: OverviewPanelTemplate,
  sources: OverviewSource[],
  usedSourceIds: Set<string>,
): OverviewSource | null {
  const rankSource = (source: OverviewSource) => ({
    source,
    rank: scoreOverviewSourceMatch(template, source),
  });

  const unusedRanked = sources
    .filter((source) => !usedSourceIds.has(source.id))
    .map(rankSource)
    .sort((left, right) => right.rank - left.rank);

  if (unusedRanked[0] && unusedRanked[0].rank > 0) return unusedRanked[0].source;

  const sameGroupFallback = sources
    .filter((source) => !usedSourceIds.has(source.id) && source.themeGroup === template.themeGroup)
    .sort((left, right) => right.score - left.score)[0];
  if (sameGroupFallback) return sameGroupFallback;

  return unusedRanked[0]?.source ?? sources[0] ?? null;
}

function buildOverviewSections(
  relationshipType: RelationshipType,
  leftName: string,
  rightName: string,
  summaryFallback: string,
  hintFallback: string,
  themeSections: Array<{
    theme: string;
    score: number;
    miniInsight: string;
    cards: Array<{ title: string; description: string; actionHint: string }>;
  }>,
  metricCards: Array<{ id: string; title: string; score: number; insight: string }>,
  topDrivers: {
    supportive: Array<{ title: string; impact: number; why: string; hint: string }>;
    challenging: Array<{ title: string; impact: number; why: string; hint: string }>;
    growth: Array<{ title: string; impact: number; why: string; hint: string }>;
  },
  tFn: (key: string, opts?: Record<string, string>) => string = (k) => k,
): CompareThemeSectionDTO[] {
  const templates = relationPanelTemplates(relationshipType);
  const sources = buildOverviewSources(
    relationshipType,
    summaryFallback,
    hintFallback,
    themeSections,
    metricCards,
    topDrivers,
  );
  const usedSourceIds = new Set<string>();
  const grouped = new Map<ThemeGroup, { scores: number[]; cards: ComparisonCardDTO[] }>();

  templates.forEach((template, index) => {
    const selectedSource = selectOverviewSource(template, sources, usedSourceIds);
    const traits = derivePanelTraits(relationshipType, template.title, leftName, rightName, tFn);
    const score = clampPercent(selectedSource?.score ?? 60, 60);
    const { leftValue, rightValue } = deriveValueSplit(score, `${leftName}:${rightName}:${template.id}`);

    const intersectionText = buildExpertThemeIntersection(
      relationshipType,
      template.themeGroup,
      template.title,
      selectedSource?.summary ?? template.fallbackSummary,
    );
    const adviceText = buildExpertThemeAdvice(
      relationshipType,
      template.themeGroup,
      selectedSource?.advice ?? template.fallbackHint,
    );

    if (selectedSource) usedSourceIds.add(selectedSource.id);

    const card = {
      id: `overview-${template.id}-${index + 1}`,
      relationshipType,
      themeGroup: template.themeGroup,
      title: template.title,
      leftPerson: {
        name: leftName,
        trait: compactText(traits.leftTrait, `${leftName}: bu ritimde daha fazla netlik ister`, null),
      },
      intersection: {
        plain: compactText(intersectionText, template.fallbackSummary, null),
      },
      rightPerson: {
        name: rightName,
        trait: compactText(traits.rightTrait, `${rightName}: bu ritmi daha akışta yaşamaya yatkın`, null),
      },
      label: mapScoreLabel(score),
      intensity: Math.abs(score - 60),
      leftValue,
      rightValue,
      advicePlain: compactText(adviceText, template.fallbackHint, null),
    } satisfies ComparisonCardDTO;

    const currentGroup = grouped.get(template.themeGroup) ?? { scores: [], cards: [] };
    currentGroup.scores.push(score);
    currentGroup.cards.push(card);
    grouped.set(template.themeGroup, currentGroup);
  });

  const orderedGroups = Array.from(
    new Set(templates.map((template) => template.themeGroup)),
  );

  const sections = orderedGroups
    .map((themeGroup) => {
      const bucket = grouped.get(themeGroup);
      if (!bucket?.cards.length) return null;
      const averageScore =
        bucket.scores.reduce((sum, value) => sum + value, 0) / Math.max(bucket.scores.length, 1);
      return {
        themeGroup,
        score: clampPercent(averageScore, 60),
        totalCount: bucket.cards.length,
        cards: bucket.cards,
      } satisfies CompareThemeSectionDTO;
    })
    .filter(Boolean) as CompareThemeSectionDTO[];

  if (sections.length) return sections;

  return [
    {
      themeGroup: relationshipType === 'work' ? 'İş Bölümü' : relationshipType === 'rival' ? 'Rekabet & Strateji' : 'Aşk & Çekim',
      score: 60,
      totalCount: 1,
      cards: [
        {
          id: 'fallback-theme',
          relationshipType,
          themeGroup: relationshipType === 'work' ? 'İş Bölümü' : relationshipType === 'rival' ? 'Rekabet & Strateji' : 'Aşk & Çekim',
          title: 'Genel Uyum Akışı',
          leftPerson: {
            name: leftName,
            trait: `${leftName}: netlik arayışıyla ilerler`,
          },
          intersection: {
            plain: compactText(summaryFallback, 'Bu modülde temel uyum dengeli ilerliyor.', null),
          },
          rightPerson: {
            name: rightName,
            trait: `${rightName}: akışta hareket etmeye yatkın`,
          },
          label: 'Gelişim',
          intensity: 52,
          leftValue: 50,
          rightValue: 50,
          advicePlain: compactText(hintFallback, 'Kısa ve düzenli check-in akışı dengeyi korur.', null),
        },
      ],
    },
  ];
}

function buildExpertThemeIntersection(
  relationshipType: RelationshipType,
  themeGroup: ThemeGroup,
  title: string,
  sourceText: string,
): string {
  const cleanSource = compactText(sourceText, '', null);
  if (cleanSource && cleanSource.length >= 110 && !/bu başlıkta|genel akış|destekleyici görünüyor/i.test(cleanSource)) {
    return cleanSource;
  }

  if (relationshipType === 'love') {
    if (themeGroup === 'Tutku' || /Çekim/.test(title)) {
      return 'Bir taraf yakınlığı daha hızlı hissettiğinde açılırken, diğer taraf ritmi biraz daha doğal akışta kurmak isteyebilir. Bu fark ilginin azlığından değil, yakınlaşmanın hangi hızda güvenli hissettirdiğinden doğar. Temasın dozunu konuşmak ilişkiyi gereksiz yormaz.';
    }
    if (themeGroup === 'Güven') {
      return 'Biriniz güveni daha çok tutarlılıkta, diğeriniz ise duygusal sıcaklıkta arıyor olabilir. Bu yüzden aynı ilişki bir tarafa yakın, diğer tarafa hâlâ eksik görünebilir. Küçük sözlerin ve görünür davranışların aynı çizgide kalması burada belirleyici olur.';
    }
    if (themeGroup === 'Romantik Akış') {
      return 'Romantik taraf açık kaldığında ilişki kendini kolay yeniliyor; fakat ilgi gösterme biçimi aynı değilse biri daha çok isterken diğeri bunu zaten verdiğini düşünebilir. Beklentiyi ima etmek yerine tarif etmek, kırgınlığı büyümeden keser.';
    }
    return 'Yakınlık ve duygusal cevap aynı hızda kurulmadığında, biri daha çok çabalayan diğeriyse geri çekilen taraftaymış gibi görünebilir. Oysa mesele çoğu zaman sevginin azlığı değil, ritmin farklı çalışmasıdır. Düzenli ama baskısız temas bu tarafı daha rahat taşır.';
  }

  if (relationshipType === 'work') {
    if (themeGroup === 'Plan Uyumu' || themeGroup === 'Karar & Plan') {
      return 'Bir taraf işi erkenden çerçeveleyip rahatlamak isterken, diğer taraf ilerledikçe netleştirmeyi tercih edebilir. Bu fark konuşulmazsa biri yavaşlatılmış, diğeri gereksiz baskı altında kalmış hissedebilir. Çerçeveyi görünür kılmak işi ve ilişkiyi aynı anda rahatlatır.';
    }
    if (themeGroup === 'Krizi Yönetme') {
      return 'Gerilim anında biriniz çözümü hemen duymak, diğeriniz önce tansiyonu düşürmek isteyebilir. İyi niyet aynı kalsa da zamanlama ayrıştığında sertlik hızla büyür. Önce konu sınırı, sonra çözüm sırası burada daha iyi çalışır.';
    }
    return 'İş akışı tamamen dağılmıyor; fakat tempo ve netlik beklentisi aynı değilse aynı hedef bile iki tarafa farklı yük gibi gelebilir. Kim neyi ne zaman kapatacak sorusu açık kaldığında yorgunluk kişiselleşmeye başlar. Roller görünür olduğunda iş birliği çok daha sakin ilerler.';
  }

  if (relationshipType === 'friend') {
    if (themeGroup === 'Destek & Sadakat' || themeGroup === 'Güven') {
      return 'Bağ sıcak olsa bile sadakat ve öncelik tanımı aynı kurulmamış olabilir. Bir taraf görünür sahiplenme beklerken diğer taraf bunu zaten hissettirdiğini düşünebilir. Açık beklenti konuşması bu arkadaşlığı sessiz kırgınlıktan korur.';
    }
    if (themeGroup === 'Sohbet Akışı' || themeGroup === 'Duygusal Tempo') {
      return 'Biriniz daha sık temasla yakınlık hissederken, diğeriniz aradaki boşluğun ilişkiyi eksiltmediğini düşünebilir. Bu fark konuşulmazsa biri geri planda kalmış, diğeri fazla talep görmüş hissedebilir. Küçük ama düzenli temas ritmi çoğu yanlış okumayı çözer.';
    }
    return 'Birlikte keyif alma tarafı güçlü olduğunda arkadaşlık kolay yenileniyor; fakat temas ve öncelik ritmi aynı değilse kırgınlık ses çıkarmadan birikebilir. Burada sorun çoğu zaman niyet değil, temasın ne kadar görünür kurulduğudur. Basit netlik bu bağı rahatlatır.';
  }

  if (relationshipType === 'family') {
    if (themeGroup === 'Sorumluluk' || themeGroup === 'Sınırlar') {
      return 'Bir taraf yükün daha görünür paylaşılmasını isterken, diğer taraf sorumluluğu sessizce üstlenmeye yatkın olabilir. Bu durumda emek görünmediğinde kırgınlık hızla içe çekilir. Görev ve alan sınırını açık tutmak aile içi tansiyonu belirgin biçimde düşürür.';
    }
    if (themeGroup === 'Onarım') {
      return 'Kırgınlık sonrası toparlanma hızı aynı olmayabilir; biri meseleyi erken kapatmak isterken diğeri duygusu yatışmadan yaklaşmakta zorlanabilir. Bu fark uzadığında mesafe kalıcı gibi görünür. Onarımın zamanını konuşmak ilişkiye nefes aldırır.';
    }
    return 'Duygu tonu yumuşak kaldığında bağ güçleniyor; fakat hassasiyet ve yük paylaşımı aynı çizgide buluşmazsa biriniz sessizce yorulabilir. Aile içinde çoğu gerilim sevgisizlikten değil, kimin neyi taşıdığının konuşulmamasından büyür. Duyguyu ve sorumluluğu aynı masaya koymak iyi gelir.';
  }

  if (themeGroup === 'Strateji' || themeGroup === 'Rekabet & Strateji') {
    return 'Bir taraf hamleyi erkenden koymak isterken, diğer taraf doğru anı bekleyerek avantaj kurmayı tercih edebilir. Bu fark baskı yükseldiğinde sabır ile hız arasında sert bir çekişmeye dönebilir. Oyunun çerçevesi baştan netse rekabet çok daha temiz akar.';
  }
  if (themeGroup === 'Krizi Yönetme' || themeGroup === 'Gerilim') {
    return 'Baskı yükseldiğinde biriniz tepkiyi daha görünür verirken diğeriniz kontrolü korumak için içine çekilebilir. Bu ayrışma küçük hata paylarını bile olduğundan büyük hissettirebilir. Kısa duraklama ve net karar sırası burada fark yaratır.';
  }
  return 'Kurallar ve tempo aynı yerden okunmadığında rekabet hızla sertleşebilir; buna rağmen çerçeve korunduğunda ilişki tamamen dağılmadan ilerler. Burada farkı yaratan şey yalnız güç değil, gücün hangi sınırla kullanılacağıdır. Net başlangıç, daha temiz sonuç üretir.';
}

function buildExpertThemeAdvice(
  relationshipType: RelationshipType,
  themeGroup: ThemeGroup,
  sourceText: string,
): string {
  const cleanSource = compactText(sourceText, '', null);
  if (cleanSource && cleanSource.length >= 70 && !/bu alanda|genel akış|güçlendirir/i.test(cleanSource)) {
    return cleanSource;
  }

  if (relationshipType === 'love') {
    if (themeGroup === 'Güven') return 'Söz, ilgi ve görünür davranış beklentisini aynı konuşmada netleştirmeniz güveni daha hızlı toparlar.';
    if (themeGroup === 'Yakınlık Dengesi') return 'Yakınlık ile alan ihtiyacını gerilim yükselmeden konuşmanız geri çekilme hissini ciddi biçimde azaltır.';
    return 'Yakınlaşma hızını tahmine bırakmak yerine küçük ve düzenli temas ritmi kurmanız ilişkiyi daha az yorar.';
  }
  if (relationshipType === 'work') {
    if (themeGroup === 'Krizi Yönetme') return 'Gerilimde önce konuyu daraltıp sonra çözüm konuşmanız gereksiz sertliği belirgin biçimde azaltır.';
    return 'Karar, teslim ve rol sınırını görünür tutmanız iyi niyetin yanlış okunmasını büyük ölçüde önler.';
  }
  if (relationshipType === 'friend') {
    if (themeGroup === 'Destek & Sadakat' || themeGroup === 'Güven') return 'Öncelik ve sadakat beklentisini varsayım yerine açık cümleyle kurmanız bu bağı sessiz kırılmadan korur.';
    return 'Temas sıklığını iki tarafın temposuna göre konuşmanız arkadaşlığı baskı değil rahatlık üzerinden tutar.';
  }
  if (relationshipType === 'family') {
    if (themeGroup === 'Sorumluluk') return 'Yük paylaşımını görünür hale getirmeniz sessiz kırgınlıkların birikmesini ciddi biçimde azaltır.';
    return 'Hassas konuşmalarda önce duygu sonra ihtiyaç cümlesi kurmanız aile içi tonu belirgin biçimde yumuşatır.';
  }
  if (themeGroup === 'Gerilim' || themeGroup === 'Krizi Yönetme') {
    return 'Baskı anı için kısa bir karar protokolü belirlemeniz hata payını ve gereksiz sertliği görünür biçimde düşürür.';
  }
  return 'Kuralları ve sınırları rekabet başlamadan netleştirmeniz oyunun adil ve öğretici kalmasına yardım eder.';
}

export default function CompareOverviewScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    matchId?: string;
    type?: string;
    leftName?: string;
    rightName?: string;
    leftAvatarUri?: string;
    rightAvatarUri?: string;
    leftSignLabel?: string;
    rightSignLabel?: string;
  }>();

  const matchId = parsePositiveInt(params.matchId);
  const typeParam = firstParam(params.type);
  const relationshipType = parseRelationshipTypeParam(typeParam, 'love');
  const hasTypeParam = Boolean(typeParam);

  const leftName = firstParam(params.leftName) ?? 'Kişi 1';
  const rightName = firstParam(params.rightName) ?? 'Kişi 2';
  const leftAvatarUri = firstParam(params.leftAvatarUri);
  const rightAvatarUri = firstParam(params.rightAvatarUri);
  const leftSignLabel = firstParam(params.leftSignLabel);
  const rightSignLabel = firstParam(params.rightSignLabel);

  const [isExplainabilityOpen, setExplainabilityOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const lastTrackedViewKey = useRef<string>('');

  const { data, error, loading, refetch } = useComparison({
    matchId,
    relationshipType,
    leftName,
    rightName,
    enabled: hasTypeParam && matchId != null,
  });

  const palette = getRelationshipPalette(relationshipType);
  const leftSign = parseLocalizedSignLabel(leftSignLabel, 'Burç');
  const rightSign = parseLocalizedSignLabel(rightSignLabel, 'Burç');

  useEffect(() => {
    setExpandedSections({});
  }, [relationshipType, matchId]);

  const overviewSections = useMemo(() => {
    if (!data) return [] as CompareThemeSectionDTO[];
    return buildOverviewSections(
      data.relationshipType,
      leftName,
      rightName,
      data.summary.shortNarrative,
      data.summary.dailyLifeHint,
      data.themeSections,
      data.metricCards,
      data.topDrivers,
      t,
    );
  }, [data, leftName, rightName]);

  const signalNotes = useMemo(() => {
    if (!data) return [] as string[];
    const notes: string[] = [];
    if (data.warningText?.trim()) notes.push(data.warningText.trim());
    if (data.explainability.missingBirthTimeImpact?.trim()) notes.push(data.explainability.missingBirthTimeImpact.trim());
    return notes.slice(0, 2);
  }, [data]);

  const spotlightDrivers = useMemo(() => {
    if (!data) return [] as Array<{ label: string; item: CompareDriverDTO }>;
    const strength = data.topDrivers.supportive?.[0];
    const tension = data.topDrivers.challenging?.[0];
    const growth = data.topDrivers.growth?.[0];
    return [
      strength ? { label: 'Güç', item: strength } : null,
      tension ? { label: 'Denge', item: tension } : null,
      growth ? { label: 'Gelişim', item: growth } : null,
    ].filter(Boolean) as Array<{ label: string; item: CompareDriverDTO }>;
  }, [data]);

  useEffect(() => {
    if (hasTypeParam) return;
    router.replace({
      pathname: '/compare/type-picker',
      params: {
        ...(params.matchId ? { matchId: firstParam(params.matchId) } : {}),
        ...(params.leftName ? { leftName: firstParam(params.leftName) } : {}),
        ...(params.rightName ? { rightName: firstParam(params.rightName) } : {}),
        ...(params.leftAvatarUri ? { leftAvatarUri: firstParam(params.leftAvatarUri) } : {}),
        ...(params.rightAvatarUri ? { rightAvatarUri: firstParam(params.rightAvatarUri) } : {}),
        ...(params.leftSignLabel ? { leftSignLabel: firstParam(params.leftSignLabel) } : {}),
        ...(params.rightSignLabel ? { rightSignLabel: firstParam(params.rightSignLabel) } : {}),
      },
    } as never);
  }, [
    hasTypeParam,
    params.leftAvatarUri,
    params.leftName,
    params.leftSignLabel,
    params.matchId,
    params.rightAvatarUri,
    params.rightName,
    params.rightSignLabel,
  ]);

  useEffect(() => {
    if (!data) return;
    const key = `${data.module}-${data.overall.score}-${data.overall.confidenceLabel}`;
    if (lastTrackedViewKey.current === key) return;
    lastTrackedViewKey.current = key;

    trackEvent('compare_module_view', {
      module: data.module,
      relationship_type: data.relationshipType,
      match_id: matchId ?? 0,
      score: data.overall.score,
      percentile: data.overall.percentile,
      confidence: data.overall.confidence,
      confidence_label: data.overall.confidenceLabel,
      level_label: data.overall.levelLabel,
      calculation_version: data.explainability.calculationVersion,
      data_quality: data.explainability.dataQuality,
      distribution_warning: data.explainability.distributionWarning ?? 'none',
      has_birth_time: !data.explainability.missingBirthTimeImpact,
    });
  }, [data, matchId]);

  const goBackToCompatibility = () => router.replace('/(tabs)/compatibility');
  const { headerPaddingTop, headerPaddingBottom, headerHorizontalPadding } = useInnerHeaderSpacing();

  const onSwitchType = (nextType: RelationshipType) => {
    trackEvent('compare_tab_switch', {
      from_module: relationshipType,
      to_module: nextType,
      match_id: matchId ?? 0,
      current_score: data?.overall.score ?? null,
      current_confidence_label: data?.overall.confidenceLabel ?? null,
    });

    router.replace({
      pathname: '/compare',
      params: {
        type: nextType,
        ...(matchId ? { matchId: String(matchId) } : {}),
        leftName,
        rightName,
        ...(leftAvatarUri ? { leftAvatarUri } : {}),
        ...(rightAvatarUri ? { rightAvatarUri } : {}),
        ...(leftSignLabel ? { leftSignLabel } : {}),
        ...(rightSignLabel ? { rightSignLabel } : {}),
      },
    } as never);
  };

  const goTechnical = () => {
    if (data) {
      trackEvent('compare_technical_open', {
        module: data.module,
        relationship_type: data.relationshipType,
        match_id: matchId ?? 0,
        score: data.overall.score,
        score_band: data.overall.levelLabel,
        confidence_label: data.overall.confidenceLabel,
        data_quality: data.explainability.dataQuality,
        calculation_version: data.explainability.calculationVersion,
        source: 'overview_cta',
      });
    }

    router.push({
      pathname: '/compare/technical',
      params: {
        type: relationshipType,
        ...(matchId ? { matchId: String(matchId) } : {}),
        leftName,
        rightName,
        ...(leftAvatarUri ? { leftAvatarUri } : {}),
        ...(rightAvatarUri ? { rightAvatarUri } : {}),
        ...(leftSignLabel ? { leftSignLabel } : {}),
        ...(rightSignLabel ? { rightSignLabel } : {}),
      },
    } as never);
  };

  const canRenderContent = useMemo(() => !loading && !!data, [loading, data]);

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={styles.screen}>
      <AppHeader
        title={moduleTitle(relationshipType)}
        onBack={goBackToCompatibility}
        rightActions={<HeaderRightIcons />}
      />
      <View
        style={[
          styles.screenContent,
          {
            paddingTop: headerPaddingTop,
            paddingBottom: headerPaddingBottom,
            paddingHorizontal: headerHorizontalPadding,
          },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CompareModuleTabs value={relationshipType} onChange={onSwitchType} />

          {!matchId && hasTypeParam ? (
            <View style={styles.stateCard}>
              <AccessibleText style={styles.errorText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Karşılaştırma için geçerli bir eşleşme bulunamadı. Önce uyum testi oluşturun.
              </AccessibleText>
            </View>
          ) : null}

          {loading && !data ? <LoadingSkeletonByModule /> : null}

          {!loading && error ? (
            <View style={styles.stateCard}>
              <AccessibleText style={styles.errorText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {error || 'Uyum verisi yüklenemedi.'}
              </AccessibleText>

              <Pressable
                onPress={() => {
                  void refetch();
                }}
                style={styles.retryBtn}
              >
                <AccessibleText style={styles.retryText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Tekrar dene
                </AccessibleText>
              </Pressable>
            </View>
          ) : null}

          {canRenderContent && data ? (
            <View style={styles.contentWrap}>
              <LinearGradient
                colors={[palette.surface, '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCard, { borderColor: palette.border }]}
              >
                <View style={styles.peopleRow}>
                  <View style={styles.personColumn}>
                    <PersonAvatar name={leftName} uri={leftAvatarUri} side="left" size={52} />
                    <AccessibleText style={styles.personName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                      {leftName}
                    </AccessibleText>
                    <AccessibleText style={styles.signText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                      {leftSign.icon} {leftSign.label}
                    </AccessibleText>
                  </View>

                  <View style={styles.scoreWrap}>
                    <MatchCircularScore score={data.overall.score} size={136} />
                  </View>

                  <View style={styles.personColumn}>
                    <PersonAvatar name={rightName} uri={rightAvatarUri} side="right" size={52} />
                    <AccessibleText style={styles.personName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                      {rightName}
                    </AccessibleText>
                    <AccessibleText style={styles.signText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                      {rightSign.icon} {rightSign.label}
                    </AccessibleText>
                  </View>
                </View>

                <View style={styles.heroMeta}>
                  <AccessibleText style={styles.heroHeadline} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {compactText(data.summary.headline, 'Uyum ritmi dengede', null)}
                  </AccessibleText>

                  <View style={styles.metaRow}>
                    <View style={[styles.levelPill, { borderColor: palette.border }]}>
                      <AccessibleText style={[styles.levelPillText, { color: palette.accent }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                        {data.overall.levelLabel}
                      </AccessibleText>
                    </View>
                    <AccessibleText style={styles.confidenceMeta} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                      Veri Güveni: {data.overall.confidenceLabel}
                    </AccessibleText>
                  </View>

                  <AccessibleText style={styles.heroSummary} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {compactText(data.summary.shortNarrative, 'Bu modülde genel uyum dengeli görünüyor.', null)}
                  </AccessibleText>

                  <View style={styles.hintRow}>
                    <Sparkles size={13} color={palette.accent} />
                    <AccessibleText style={styles.hintText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                      {compactText(data.summary.dailyLifeHint, 'Kısa check-in alışkanlığı ilişki ritmini güçlendirir.', null)}
                    </AccessibleText>
                  </View>
                </View>
              </LinearGradient>

              {signalNotes.length ? (
                <View style={styles.notesCard}>
                  {signalNotes.map((note, index) => (
                    <View key={`note-${index + 1}`} style={styles.noteRow}>
                      <Info size={12} color="#6D28D9" />
                      <AccessibleText style={styles.noteText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                        {compactText(note, note, null)}
                      </AccessibleText>
                    </View>
                  ))}
                </View>
              ) : null}

              {data.metricCards.length ? (
                <View style={styles.metricStripWrap}>
                  <AccessibleText style={styles.sectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    Temel Başlıklar
                  </AccessibleText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricStrip}>
                    {data.metricCards.slice(0, 5).map((metric) => (
                      <View key={metric.id} style={styles.metricPill}>
                        <AccessibleText style={styles.metricTitle} numberOfLines={2} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          {metric.title}
                        </AccessibleText>
                        <AccessibleText style={[styles.metricScore, { color: palette.accent }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          %{metric.score}
                        </AccessibleText>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {spotlightDrivers.length ? (
                <View style={styles.driverRow}>
                  {spotlightDrivers.map((driver) => (
                    <Pressable
                      key={`${driver.label}-${driver.item.title}`}
                      style={styles.driverPill}
                      onPress={() => {
                        trackEvent('compare_driver_expand', {
                          module: data.module,
                          relationship_type: data.relationshipType,
                          match_id: matchId ?? 0,
                          driver_type:
                            driver.label === 'Güç'
                              ? 'supportive'
                              : driver.label === 'Denge'
                                ? 'challenging'
                                : 'growth',
                          driver_title: driver.item.title,
                          driver_impact: driver.item.impact,
                          score: data.overall.score,
                          confidence_label: data.overall.confidenceLabel,
                        });
                      }}
                    >
                      <AccessibleText style={styles.driverLabel} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                        {driver.label}
                      </AccessibleText>
                      <AccessibleText style={styles.driverTitle} numberOfLines={1} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                        {driver.item.title}
                      </AccessibleText>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.sectionWrap}>
                <AccessibleText style={styles.sectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Uyum Haritası
                </AccessibleText>
                {overviewSections.map((section) => {
                  const isExpanded = expandedSections[section.themeGroup] ?? false;
                  const visibleCards = isExpanded ? section.cards : section.cards.slice(0, 3);
                  return (
                    <View key={section.themeGroup} style={styles.themeSectionBlock}>
                      <ThemeSectionHeader
                        themeGroup={section.themeGroup}
                        score={section.score}
                        totalCount={section.totalCount}
                        isExpanded={isExpanded}
                        onToggleExpand={() =>
                          setExpandedSections((current) => ({
                            ...current,
                            [section.themeGroup]: !current[section.themeGroup],
                          }))
                        }
                      />
                      <View style={styles.themeCardsStack}>
                        {visibleCards.map((card) => (
                          <ComparisonCard key={card.id} card={card} />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              <Pressable
                onPress={() => {
                  trackEvent('compare_explainability_open', {
                    module: data.module,
                    relationship_type: data.relationshipType,
                    match_id: matchId ?? 0,
                    score: data.overall.score,
                    confidence_label: data.overall.confidenceLabel,
                    distribution_warning: data.explainability.distributionWarning ?? 'none',
                    data_quality: data.explainability.dataQuality,
                    calculation_version: data.explainability.calculationVersion,
                  });
                  setExplainabilityOpen(true);
                }}
                style={styles.inlineAction}
              >
                <AccessibleText style={styles.inlineActionText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Bu skor nasıl hesaplandı?
                </AccessibleText>
              </Pressable>

              <Pressable onPress={goTechnical} style={styles.primaryCta}>
                <AccessibleText style={styles.primaryCtaText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Detaylı Analiz
                </AccessibleText>
              </Pressable>

              <Pressable
                onPress={() => {
                  trackEvent('compare_share_card_open', {
                    module: data.module,
                    relationship_type: data.relationshipType,
                    match_id: matchId ?? 0,
                    score: data.overall.score,
                  });
                  router.push({
                    pathname: '/share-card-preview',
                    params: {
                      matchId: String(matchId ?? ''),
                      personAName: leftName,
                      personBName: rightName,
                      personASignLabel: leftSignLabel ?? '',
                      personBSignLabel: rightSignLabel ?? '',
                      overallScore: String(data.overall.score),
                      relationshipType: String(data.relationshipType ?? ''),
                      relationLabel: `${RELATIONSHIP_TYPE_LABELS[data.relationshipType]} Uyumu`,
                    },
                  } as never);
                }}
                style={styles.shareBtn}
              >
                <Share2 size={18} color="#6D28D9" />
                <AccessibleText style={styles.shareBtnText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Paylaşılabilir Kart
                </AccessibleText>
              </Pressable>
            </View>
          ) : null}

          {!loading && hasTypeParam && !data && !error ? (
            <View style={styles.stateCard}>
              <AccessibleText style={styles.stateText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Bu modül için karşılaştırma verisi henüz hazır değil.
              </AccessibleText>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {data ? (
        <CompareTechnicalDrawer
          visible={isExplainabilityOpen}
          explainability={data.explainability}
          warningText={data.warningText}
          onClose={() => setExplainabilityOpen(false)}
        />
      ) : null}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F5FB',
  },
  screenContent: {
    flex: 1,
    gap: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 112,
    gap: 12,
  },
  contentWrap: {
    gap: 12,
  },
  stateCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E0EE',
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  stateText: {
    fontSize: 14,
    color: '#534A69',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    color: '#9F1239',
    fontWeight: '700',
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7C7F6',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5B21B6',
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#2D0A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personColumn: {
    width: 86,
    alignItems: 'center',
    gap: 4,
  },
  scoreWrap: {
    flex: 1,
    alignItems: 'center',
  },
  personName: {
    fontSize: 13,
    lineHeight: 17,
    color: '#2B2340',
    fontWeight: '800',
    textAlign: 'center',
  },
  signText: {
    fontSize: 11,
    color: '#6B6381',
    fontWeight: '700',
    textAlign: 'center',
  },
  heroMeta: {
    gap: 8,
  },
  heroHeadline: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    color: '#231C37',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  levelPill: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  confidenceMeta: {
    fontSize: 12,
    color: '#5F5775',
    fontWeight: '700',
  },
  heroSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4E4564',
    fontWeight: '600',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#473E5E',
    fontWeight: '700',
  },
  notesCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4D8F8',
    backgroundColor: '#F7F2FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#4E4270',
    fontWeight: '600',
  },
  metricStripWrap: {
    gap: 8,
  },
  metricStrip: {
    gap: 8,
    paddingRight: 8,
  },
  metricPill: {
    width: 132,
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
    justifyContent: 'space-between',
  },
  metricTitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#3B334F',
    fontWeight: '700',
    flexShrink: 1,
  },
  metricScore: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  driverRow: {
    flexDirection: 'row',
    gap: 8,
  },
  driverPill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E1F3',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  driverLabel: {
    fontSize: 11,
    color: '#7A718F',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  driverTitle: {
    fontSize: 13,
    lineHeight: 17,
    color: '#2C2441',
    fontWeight: '800',
  },
  sectionWrap: {
    gap: 8,
  },
  themeSectionBlock: {
    gap: 2,
  },
  themeCardsStack: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: '#231C37',
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#DCCBFF',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EDFF',
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5B21B6',
  },
  primaryCta: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D28D9',
    marginTop: 2,
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  shareBtn: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3EAFF',
    borderWidth: 1,
    borderColor: '#E0D0F7',
    marginTop: 2,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6D28D9',
    letterSpacing: -0.2,
  },
});
