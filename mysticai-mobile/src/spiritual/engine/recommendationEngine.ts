/**
 * Recommendation Engine — Doğum Haritası → Günlük Tema → İçerik Önerisi
 * Deterministik, test edilebilir, saf fonksiyonlar.
 */

import type { NatalChartResponse, PlanetPosition } from '../../services/astrology.service';
import type { EsmaItem, DuaItem } from '../types';

export type ThemeTag =
  | 'huzur' | 'kalp' | 'korunma' | 'teslimiyet'
  | 'sevgi' | 'iliski' | 'muhabbet'
  | 'motivasyon' | 'cesaret' | 'basari'
  | 'sabir' | 'disiplin' | 'azim'
  | 'ilim' | 'zihin' | 'hikmet'
  | 'sukur' | 'nimet' | 'tevhid'
  | 'tevbe' | 'magfiret' | 'arınma'
  | 'rizik' | 'bereket' | 'saglik';

export interface DailyTheme {
  tags: ThemeTag[];
  reason: string;
  score: Record<ThemeTag, number>;
}

export interface ContentRecommendation {
  esmaId: number;
  duaId: number;
  sureId: number;
  themeTags: ThemeTag[];
  reason: string;
}

// --- Planet & House Rules -----------------------------------------------

type PlanetRule = {
  planets: string[];
  houses: number[];
  tags: ThemeTag[];
  weight: number;
};

const RULES: PlanetRule[] = [
  {
    planets: ['Moon'],
    houses: [4, 12],
    tags: ['huzur', 'kalp', 'korunma', 'teslimiyet'],
    weight: 3,
  },
  {
    planets: ['Venus'],
    houses: [7],
    tags: ['sevgi', 'iliski', 'muhabbet'],
    weight: 3,
  },
  {
    planets: ['Mars'],
    houses: [1, 10],
    tags: ['motivasyon', 'cesaret', 'basari'],
    weight: 3,
  },
  {
    planets: ['Saturn'],
    houses: [6, 10],
    tags: ['sabir', 'disiplin', 'azim'],
    weight: 3,
  },
  {
    planets: ['Mercury'],
    houses: [3, 6],
    tags: ['ilim', 'zihin', 'hikmet'],
    weight: 2,
  },
  {
    planets: ['Jupiter'],
    houses: [2, 9, 11],
    tags: ['sukur', 'nimet', 'bereket'],
    weight: 2,
  },
  {
    planets: ['Sun'],
    houses: [1, 5, 10],
    tags: ['motivasyon', 'cesaret', 'basari'],
    weight: 2,
  },
  {
    planets: ['Neptune', 'Pluto'],
    houses: [8, 12],
    tags: ['teslimiyet', 'tevbe', 'arınma'],
    weight: 1,
  },
];

// --- Tema Üretici -------------------------------------------------------

export function buildDailyTheme(chart: NatalChartResponse | null): DailyTheme {
  if (!chart || !chart.planets || chart.planets.length === 0) {
    return {
      tags: ['huzur', 'sukur', 'teslimiyet'],
      reason: 'Doğum haritası bilgisi yok — genel huzur teması seçildi.',
      score: buildEmptyScore(),
    };
  }

  const score: Record<string, number> = {};

  const addScore = (tags: ThemeTag[], weight: number) => {
    tags.forEach((t) => {
      score[t] = (score[t] ?? 0) + weight;
    });
  };

  for (const planet of chart.planets) {
    for (const rule of RULES) {
      const planetMatch = rule.planets.some(
        (p) => p.toLowerCase() === planet.planet?.toLowerCase(),
      );
      const houseMatch = rule.houses.includes(planet.house);

      if (planetMatch && houseMatch) {
        addScore(rule.tags, rule.weight * 2); // Planet + house ikisi eşleşince bonus
      } else if (planetMatch) {
        addScore(rule.tags, rule.weight);
      } else if (houseMatch) {
        addScore(rule.tags, Math.floor(rule.weight / 2));
      }
    }
  }

  // Güneş turu bazlı ekstra hint (Sun sign seasonal flavor)
  const sunSign = chart.sunSign?.toLowerCase() ?? '';
  if (['aries', 'leo', 'sagittarius', 'koc', 'aslan', 'yay'].some((s) => sunSign.includes(s))) {
    addScore(['motivasyon', 'cesaret'], 1);
  } else if (['cancer', 'scorpio', 'pisces', 'yengec', 'akrep', 'balik'].some((s) => sunSign.includes(s))) {
    addScore(['huzur', 'kalp', 'teslimiyet'], 1);
  } else if (['taurus', 'virgo', 'capricorn', 'boga', 'basak', 'oglak'].some((s) => sunSign.includes(s))) {
    addScore(['sabir', 'disiplin', 'nimet'], 1);
  } else {
    addScore(['ilim', 'zihin', 'muhabbet'], 1);
  }

  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const topTags = sorted.slice(0, 4).map(([tag]) => tag as ThemeTag);

  const topPlanet = findTopPlanet(chart.planets);
  const reason = buildReason(topPlanet, topTags, chart);

  return { tags: topTags, reason, score: score as Record<ThemeTag, number> };
}

function findTopPlanet(planets: PlanetPosition[]): string {
  // Yükselen, Ay, Güneş sırasında önem
  const priority = ['Moon', 'Sun', 'Saturn', 'Mars', 'Venus', 'Mercury', 'Jupiter'];
  for (const p of priority) {
    if (planets.some((pl) => pl.planet?.toLowerCase() === p.toLowerCase())) return p;
  }
  return planets[0]?.planet ?? 'Güneş';
}

const SIGN_TR: Record<string, string> = {
  aries: 'Koç', taurus: 'Boğa', gemini: 'İkizler', cancer: 'Yengeç',
  leo: 'Aslan', virgo: 'Başak', libra: 'Terazi', scorpio: 'Akrep',
  sagittarius: 'Yay', capricorn: 'Oğlak', aquarius: 'Kova', pisces: 'Balık',
  koc: 'Koç', boga: 'Boğa', ikizler: 'İkizler', yengec: 'Yengeç',
  aslan: 'Aslan', basak: 'Başak', terazi: 'Terazi', akrep: 'Akrep',
  yay: 'Yay', oglak: 'Oğlak', kova: 'Kova', balik: 'Balık',
};

function buildReason(topPlanet: string, tags: ThemeTag[], chart?: NatalChartResponse | null): string {
  const tagStr = tags.slice(0, 3).join(', ');
  const planetTr: Record<string, string> = {
    Moon: 'Ay', Sun: 'Güneş', Saturn: 'Satürn', Mars: 'Mars',
    Venus: 'Venüs', Mercury: 'Merkür', Jupiter: 'Jüpiter',
  };
  const planetName = planetTr[topPlanet] ?? topPlanet;

  // Transit wording if chart has moon sign info
  const moonPlanet = chart?.planets?.find((p) => p.planet?.toLowerCase() === 'moon');
  if (moonPlanet?.sign) {
    const signTr = SIGN_TR[moonPlanet.sign.toLowerCase()] ?? moonPlanet.sign;
    return `Ay transit ${signTr}'te → ${tagStr} odaklı öneri seçildi.`;
  }

  return `Doğum haritanda ${planetName} teması öne çıkıyor → ${tagStr} odaklı öneri seçildi.`;
}

function buildEmptyScore(): Record<ThemeTag, number> {
  return {
    huzur: 0, kalp: 0, korunma: 0, teslimiyet: 0,
    sevgi: 0, iliski: 0, muhabbet: 0,
    motivasyon: 0, cesaret: 0, basari: 0,
    sabir: 0, disiplin: 0, azim: 0,
    ilim: 0, zihin: 0, hikmet: 0,
    sukur: 0, nimet: 0, tevhid: 0,
    tevbe: 0, magfiret: 0, arınma: 0,
    rizik: 0, bereket: 0, saglik: 0,
  };
}

// --- İçerik Puanlama -------------------------------------------------------

export function scoreContent(
  tags: string[],
  themeTags: ThemeTag[],
  themeScore: Record<string, number>,
): number {
  let score = 0;
  for (const tag of tags) {
    if (themeTags.includes(tag as ThemeTag)) {
      score += (themeScore[tag] ?? 1) * 2;
    } else if (themeScore[tag] !== undefined) {
      score += themeScore[tag];
    }
  }
  return score;
}

export function pickRecommendedEsma(
  esmaList: EsmaItem[],
  theme: DailyTheme,
  recentIds: number[], // son 2 günde gösterilen ID'ler
  dateISO: string,
): EsmaItem {
  const candidates = esmaList.filter((e) => !recentIds.includes(e.id));
  const pool = candidates.length > 0 ? candidates : esmaList;
  const scored = pool
    .map((e) => ({ esma: e, score: scoreContent(e.tags, theme.tags, theme.score) }))
    .sort((a, b) => b.score - a.score);
  const idx = stableHash(dateISO) % scored.length;
  return scored[idx]?.esma ?? scored[0].esma;
}

// scored içinde e tanımlı değil — düzelt
function pickScoredEsma(
  esmaList: EsmaItem[],
  theme: DailyTheme,
  recentIds: number[],
  dateISO: string,
): EsmaItem {
  const candidates = esmaList.filter((e) => !recentIds.includes(e.id));
  const pool = candidates.length > 0 ? candidates : esmaList;

  const scored = pool.map((e) => ({
    esma: e,
    score: scoreContent(e.tags, theme.tags, theme.score),
  })).sort((a, b) => b.score - a.score);

  // Top-N içinden deterministik seçim
  const topN = scored.slice(0, 5);
  const idx = stableHash(dateISO) % topN.length;
  return topN[idx]?.esma ?? scored[0].esma;
}

export function pickRecommendedDua(
  duaList: DuaItem[],
  theme: DailyTheme,
  recentIds: number[],
  dateISO: string,
): DuaItem {
  const candidates = duaList.filter((d) => !recentIds.includes(d.id));
  const pool = candidates.length > 0 ? candidates : duaList;

  const scored = pool.map((d) => ({
    dua: d,
    score: scoreContent(d.tags, theme.tags, theme.score),
  })).sort((a, b) => b.score - a.score);

  const topN = scored.slice(0, 5);
  const idx = (stableHash(dateISO) + 1) % topN.length;
  return topN[idx]?.dua ?? scored[0].dua;
}

export function pickRecommendedSure(
  sureList: DuaItem[],
  theme: DailyTheme,
  recentIds: number[],
  dateISO: string,
): DuaItem {
  const candidates = sureList.filter((d) => !recentIds.includes(d.id));
  const pool = candidates.length > 0 ? candidates : sureList;

  const scored = pool.map((d) => ({
    dua: d,
    score: scoreContent(d.tags, theme.tags, theme.score),
  })).sort((a, b) => b.score - a.score);

  const topN = scored.slice(0, 5);
  const idx = (stableHash(dateISO) + 2) % topN.length;
  return topN[idx]?.dua ?? scored[0].dua;
}

export function buildRecommendation(
  chart: NatalChartResponse | null,
  esmaList: EsmaItem[],
  duaList: DuaItem[],
  recentEsmaIds: number[],
  recentDuaIds: number[],
  dateISO: string,
  recentSureIds: number[] = [],
): ContentRecommendation {
  const theme = buildDailyTheme(chart);
  const pureDuas = duaList.filter((d) => d.category !== 'SURE');
  const sureOnly = duaList.filter((d) => d.category === 'SURE');
  const esma = pickScoredEsma(esmaList, theme, recentEsmaIds, dateISO);
  const dua = pickRecommendedDua(pureDuas, theme, recentDuaIds, dateISO);
  const sure = sureOnly.length > 0
    ? pickRecommendedSure(sureOnly, theme, recentSureIds, dateISO)
    : pureDuas[0]; // fallback

  return {
    esmaId: esma.id,
    duaId: dua.id,
    sureId: sure?.id ?? 0,
    themeTags: theme.tags,
    reason: theme.reason,
  };
}

// --- Yardımcı: Deterministik Hash (No Math.random) -----------------------

export function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // 32-bit int
  }
  return Math.abs(hash);
}
