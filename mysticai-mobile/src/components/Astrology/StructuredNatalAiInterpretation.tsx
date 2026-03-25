import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { cleanAstroHeading, translateAstroTermsForUi } from '../../constants/astroLabelMap';
import {
  inferTurkishAiTitle,
  sanitizeAiNarrativeText,
  splitAiBodyToParagraphs,
  splitPlainAiTextToBlocks,
} from '../../utils/astroTextProcessor';
import StaggeredAiText from './StaggeredAiText';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type NatalAiSection = {
  id?: string;
  title?: string;
  body?: string;
  dailyLifeExample?: string;
  bulletPoints?: Array<{ title?: string; detail?: string }>;
};

type NatalAiPlanetHighlight = {
  planetId?: string;
  title?: string;
  intro?: string;
  character?: string;
  depth?: string;
  dailyLifeExample?: string;
  analysisLines?: Array<{ title?: string; text?: string; icon?: string }>;
};

type NatalAiStructuredPayload = {
  version?: string;
  tone?: string;
  opening?: string;
  coreSummary?: string;
  sections?: NatalAiSection[];
  planetHighlights?: NatalAiPlanetHighlight[];
  closing?: string;
};

type Props = {
  text: string;
  fallbackTextStyle?: any;
};

const HIDDEN_SECTION_TITLES = new Set(['kozmik ana tema']);

function normalizeSectionTitleForCompare(title?: string | null): string {
  return cleanAstroHeading(translateAstroTermsForUi(title ?? ''))
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldHideSectionTitle(title?: string | null): boolean {
  return HIDDEN_SECTION_TITLES.has(normalizeSectionTitleForCompare(title));
}

// ═══════════════════════════════════════════════════════════════════════
// PLANET META
// ═══════════════════════════════════════════════════════════════════════

const PLANET_META: Record<string, { glyph: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  sun: { glyph: '☉', label: 'Güneş', icon: 'sunny-outline' },
  moon: { glyph: '☽', label: 'Ay', icon: 'moon-outline' },
  mercury: { glyph: '☿', label: 'Merkür', icon: 'chatbubble-ellipses-outline' },
  venus: { glyph: '♀', label: 'Venüs', icon: 'heart-outline' },
  mars: { glyph: '♂', label: 'Mars', icon: 'flame-outline' },
  jupiter: { glyph: '♃', label: 'Jüpiter', icon: 'expand-outline' },
  saturn: { glyph: '♄', label: 'Satürn', icon: 'shield-outline' },
  uranus: { glyph: '♅', label: 'Uranüs', icon: 'flash-outline' },
  neptune: { glyph: '♆', label: 'Neptün', icon: 'water-outline' },
  pluto: { glyph: '♇', label: 'Plüton', icon: 'skull-outline' },
  chiron: { glyph: '⚷', label: 'Kiron', icon: 'medkit-outline' },
  north_node: { glyph: '☊', label: 'Kuzey Düğümü', icon: 'compass-outline' },
};

// ═══════════════════════════════════════════════════════════════════════
// JSON PARSING — robust, handles all LLM quirks
// ═══════════════════════════════════════════════════════════════════════

// JSON key names and English terms that must NEVER appear in user-visible text
const ENGLISH_TO_TURKISH: Array<[RegExp, string]> = [
  // JSON schema field names (camelCase & snake_case)
  [/\bbulletPoints?\b/gi, 'Öne Çıkan Noktalar'],
  [/\bbullet_points?\b/gi, 'Öne Çıkan Noktalar'],
  [/\bdailyLifeExample\b/gi, 'Günlük Hayat Örneği'],
  [/\bdaily_life_example\b/gi, 'Günlük Hayat Örneği'],
  [/\banalysisLines?\b/gi, 'Analiz Satırları'],
  [/\banalysis_lines?\b/gi, 'Analiz Satırları'],
  [/\bplanetHighlights?\b/gi, 'Gezegen Vurguları'],
  [/\bplanet_highlights?\b/gi, 'Gezegen Vurguları'],
  [/\bplanet_insights?\b/gi, 'Gezegen Görüşleri'],
  [/\bcoreSummary\b/gi, 'Temel Özet'],
  [/\bcore_summary\b/gi, 'Temel Özet'],
  [/\bsectionList\b/gi, 'Bölümler'],
  [/\bsection_list\b/gi, 'Bölümler'],
  [/\bplanetId\b/gi, ''],
  [/\bplanet_id\b/gi, ''],
  [/\bfinalNote\b/gi, 'Son Not'],
  [/\bfinal_note\b/gi, 'Son Not'],
  // Aspect types
  [/\bCONJUNCTION\b/gi, 'Kavuşum (Güç Birliği)'],
  [/\bSEXTILE\b/gi, 'Altıgen (Fırsat Akışı)'],
  [/\bSQUARE\b/gi, 'Kare (Gelişim Gerilimi)'],
  [/\bTRINE\b/gi, 'Üçgen (Doğal Akış)'],
  [/\bOPPOSITION\b/gi, 'Karşıt (Denge Dersi)'],
  // Section & analysis title translations (longer phrases first)
  [/\bInner Conflicts and Power Centers\b/gi, 'İç Çatışmalar ve Güç Merkezleri'],
  [/\bNatural Gifts and Talents\b/gi, 'Doğal Yetenekler ve Armağanlar'],
  [/\bCareer and Life Purpose\b/gi, 'Kariyer ve Yaşam Amacı'],
  [/\bStrengths and Weaknesses\b/gi, 'Güçlü ve Zayıf Yönler'],
  [/\bLove and Relationships?\b/gi, 'Aşk ve İlişkiler'],
  [/\bMoney and Abundance\b/gi, 'Para ve Bolluk'],
  [/\bThings To Watch Out For\b/gi, 'Dikkat Etmen Gerekenler'],
  [/\bHow It Affects You\b/gi, 'Seni Nasıl Etkiler'],
  [/\bCharacter Analysis\b/gi, 'Karakter Analizi'],
  [/\bHighlighted Traits\b/gi, 'Öne Çıkan Özellikler'],
  [/\bEmotional Intelligence\b/gi, 'Duygusal Zeka'],
  [/\bCommunication Style\b/gi, 'İletişim Tarzı'],
  [/\bPractical Reflection\b/gi, 'Pratik Yansıma'],
  [/\bPlanetary Placements?\b/gi, 'Gezegen Yerleşimleri'],
  [/\bRelationship Dynamics?\b/gi, 'İlişki Dinamikleri'],
  [/\bSpiritual Mission\b/gi, 'Ruhsal Misyon'],
  [/\bCore Portrait\b/gi, 'Kozmik Portrenin Özü'],
  [/\bCosmic Portrait\b/gi, 'Kozmik Portre'],
  [/\bCosmic Balance\b/gi, 'Kozmik Denge'],
  [/\bKarmic Tests?\b/gi, 'Kadersel Sınavlar'],
  [/\bHidden Talents?\b/gi, 'Gizli Yetenekler'],
  [/\bNatural Gifts?\b/gi, 'Doğal Yetenekler'],
  [/\bInner Conflicts?\b/gi, 'İç Çatışmalar'],
  [/\bPower Centers?\b/gi, 'Güç Merkezleri'],
  [/\bEmotional World\b/gi, 'Duygusal Dünya'],
  [/\bKey Strengths?\b/gi, 'Güçlü Yönler'],
  [/\bGrowth Areas?\b/gi, 'Gelişim Alanları'],
  [/\bLife Purpose\b/gi, 'Yaşam Amacı'],
  [/\bSoul Purpose\b/gi, 'Ruhsal Amaç'],
  [/\bBalance Point\b/gi, 'Denge Noktası'],
  [/\bMain Energy\b/gi, 'Ana Enerji'],
  [/\bMain Theme\b/gi, 'Ana Tema'],
  [/\bDeep Analysis\b/gi, 'Derin Analiz'],
  [/\bDetailed Reading\b/gi, 'Detaylı Okuma'],
  [/\bDaily Life\b/gi, 'Günlük Hayat'],
  [/\bNorth Node\b/gi, 'Kuzey Düğümü'],
  [/\bSouth Node\b/gi, 'Güney Düğümü'],
  [/\bPlacement\b/gi, 'Yerleşim'],
  [/\bAspects?\b/gi, 'Açılar'],
  // Generic English words that might leak as standalone text
  [/\bopening\b/gi, 'giriş'],
  [/\bclosing\b/gi, 'kapanış'],
  [/\bsections?\b/gi, 'bölümler'],
  [/\bversion\b/gi, ''],
  [/\btone\b/gi, ''],
  [/\bintro\b/gi, 'giriş'],
  [/\bdepth\b/gi, 'derinlik'],
  [/\boverview\b/gi, 'genel bakış'],
  [/\bconclusion\b/gi, 'sonuç'],
  [/\bsummary\b/gi, 'özet'],
  [/\bhighlights?\b/gi, 'vurgular'],
  [/\bdetails?\b/gi, 'detaylar'],
  [/\bexamples?\b/gi, 'örnekler'],
  [/\bstrengths?\b/gi, 'güçlü yönler'],
  [/\bweaknesses?\b/gi, 'zayıf yönler'],
  [/\binsights?\b/gi, 'içgörüler'],
  [/\bwarnings?\b/gi, 'uyarılar'],
  [/\badvice\b/gi, 'tavsiye'],
  [/\bpotential\b/gi, 'potansiyel'],
  [/\benergy\b/gi, 'enerji'],
  [/\bharmony\b/gi, 'uyum'],
  [/\btension\b/gi, 'gerilim'],
  [/\bbalance\b/gi, 'denge'],
  [/\bfocus\b/gi, 'odak'],
  [/\bgrowth\b/gi, 'gelişim'],
  [/\blesson\b/gi, 'ders'],
  [/\btalent\b/gi, 'yetenek'],
  [/\bgift\b/gi, 'armağan'],
  [/\bmission\b/gi, 'misyon'],
  [/\bdestiny\b/gi, 'kader'],
  [/\bkarma\b/gi, 'karma'],
];

// Values that are purely technical and should be filtered entirely
const TECHNICAL_VALUES = /^(natal_v\d+|scientific_warm|version|tone|opening|closing|sections?|bullet_?points?|daily_?life_?example|analysis_?lines?|planet_?highlights?|planet_?id|core_?summary|section_?list|final_?note|overview|conclusion|intro|depth|character|body|text|content|description|title|heading|name|label|detail|icon|id)$/i;

// AI meta/disclaimer sentences that leak into content
const META_NOISE_PATTERNS = [
  /temel yorum korunarak.*?zenginleşir\.?/gi,
  /detaylar yeniden üretimde.*?\.?/gi,
  /bu yorum yapay zeka tarafından.*?\.?/gi,
  /\bnot[ea]?\s*:\s*this (is|was) (a |an )?ai[- ]generated.*?\.?/gi,
];

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v.length) return null;
  // Filter out purely technical/meta values
  if (TECHNICAL_VALUES.test(v)) return null;

  let result = translateAstroTermsForUi(v);
  for (const [pattern, replacement] of ENGLISH_TO_TURKISH) {
    result = result.replace(pattern, replacement);
  }
  // Strip AI meta/disclaimer noise
  for (const noise of META_NOISE_PATTERNS) {
    result = result.replace(noise, '');
  }
  // Clean up any resulting double spaces or leading/trailing whitespace
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result || null;
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function unwrapCodeFence(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();
  return trimmed;
}

function normalizeJsonCandidate(text: string): string {
  let normalized = text
    .trim()
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
  normalized = normalized.replace(/,\s*([}\]])/g, '$1');
  normalized = normalized.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g, '$1"$2"$3');
  if (/'[^']+'\s*:/.test(normalized)) {
    normalized = normalized.replace(/([{,]\s*)'([^']+?)'(\s*:)/g, '$1"$2"$3');
  }
  normalized = normalized.replace(
    /:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(\s*[,}\]])/g,
    (_match, value: string, suffix: string) => `: "${value.replace(/"/g, '\\"')}"${suffix}`,
  );
  return normalized;
}

function extractJsonObjectBlock(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let idx = 0; idx < trimmed.length; idx += 1) {
    const char = trimmed[idx];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') { inString = false; }
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') { if (start === -1) start = idx; depth += 1; continue; }
    if (char === '}') {
      if (depth <= 0) continue;
      depth -= 1;
      if (start !== -1 && depth === 0) return trimmed.slice(start, idx + 1);
    }
  }

  if (start >= 0) {
    const end = trimmed.lastIndexOf('}');
    if (end > start) return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function tryParseJson(text: string): unknown {
  const candidates = new Set<string>();
  const raw = text.trim();
  const unwrapped = unwrapCodeFence(raw);
  const normalized = normalizeJsonCandidate(unwrapped);

  candidates.add(raw);
  candidates.add(unwrapped);
  candidates.add(extractJsonObjectBlock(unwrapped));
  candidates.add(normalized);
  candidates.add(extractJsonObjectBlock(normalized));

  // Handle double-stringified JSON
  try {
    const inner = JSON.parse(raw);
    if (typeof inner === 'string') {
      candidates.add(inner.trim());
      candidates.add(normalizeJsonCandidate(inner.trim()));
      candidates.add(extractJsonObjectBlock(normalizeJsonCandidate(inner.trim())));
    }
  } catch { /* ignore */ }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'string') {
        try {
          const inner = JSON.parse(parsed);
          if (inner && typeof inner === 'object') return inner;
        } catch { /* ignore */ }
        continue;
      }
      if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* ignore */ }
  }

  return null;
}

function normalizeBulletPoints(value: unknown): Array<{ title?: string; detail?: string }> {
  return safeArray<unknown>(value)
    .map((item): { title?: string; detail?: string } | null => {
      if (typeof item === 'string') {
        const detail = cleanText(item) ?? undefined;
        return detail ? { detail } : null;
      }
      const r = asRecord(item);
      if (!r) return null;
      return {
        title: cleanText(pick(r, 'title', 'label', 'name', 'başlık', 'baslik', 'isim')) ?? undefined,
        detail: cleanText(pick(r, 'detail', 'text', 'body', 'detay', 'açıklama', 'aciklama', 'içerik', 'icerik')) ?? undefined,
      };
    })
    .filter((bp): bp is { title?: string; detail?: string } => Boolean(bp && (bp.title || bp.detail)));
}

function normalizeSections(value: unknown): NatalAiSection[] {
  const arraySource = safeArray<unknown>(value);
  const mapSource = asRecord(value);

  const source = arraySource.length > 0
    ? arraySource
    : Object.entries(mapSource ?? {}).map(([id, section]) => ({ ...(asRecord(section) ?? {}), id }));

  return source
    .map((item) => {
      const s = asRecord(item);
      if (!s) return null;
      return {
        id: cleanText(pick(s, 'id', 'kimlik')) ?? undefined,
        title: cleanText(pick(s, 'title', 'heading', 'name', 'başlık', 'baslik')) ?? undefined,
        body: cleanText(pick(s, 'body', 'text', 'content', 'description', 'içerik', 'icerik', 'metin', 'açıklama', 'aciklama')) ?? undefined,
        dailyLifeExample: cleanText(pick(s, 'dailyLifeExample', 'daily_life_example', 'example', 'günlükHayatÖrneği', 'gunlukHayatOrnegi', 'günlükÖrnek', 'gunlukOrnek', 'örnek', 'ornek')) ?? undefined,
        bulletPoints: normalizeBulletPoints(pick(s, 'bulletPoints', 'bullet_points', 'bullets', 'vurgular', 'öneÇıkanlar', 'oneCikanlar', 'noktalar') as unknown),
      } as NatalAiSection;
    })
    .filter((section): section is NatalAiSection => Boolean(section && (section.title || section.body)));
}

function normalizePlanetHighlights(value: unknown): NatalAiPlanetHighlight[] {
  return safeArray<unknown>(value)
    .map((item) => {
      const p = asRecord(item);
      if (!p) return null;
      return {
        planetId: cleanText(pick(p, 'planetId', 'planet_id', 'planet', 'id', 'gezegen', 'gezegenId')) ?? undefined,
        title: cleanText(pick(p, 'title', 'başlık', 'baslik')) ?? undefined,
        intro: cleanText(pick(p, 'intro', 'giriş', 'giris', 'tanıtım', 'tanitim')) ?? undefined,
        character: cleanText(pick(p, 'character', 'karakter')) ?? undefined,
        depth: cleanText(pick(p, 'depth', 'derinlik', 'detay')) ?? undefined,
        dailyLifeExample: cleanText(pick(p, 'dailyLifeExample', 'daily_life_example', 'günlükHayatÖrneği', 'gunlukHayatOrnegi', 'örnek', 'ornek')) ?? undefined,
        analysisLines: safeArray<Record<string, unknown>>(pick(p, 'analysisLines', 'analysis_lines', 'analizSatırları', 'analizSatirlari', 'satırlar', 'satirlar') as unknown)
          .map((line) => {
            const lr = asRecord(line);
            if (!lr) return { title: undefined, text: undefined, icon: undefined };
            return {
              title: cleanText(pick(lr, 'title', 'başlık', 'baslik')) ?? undefined,
              text: cleanText(pick(lr, 'text', 'metin', 'açıklama', 'aciklama')) ?? undefined,
              icon: (typeof pick(lr, 'icon', 'ikon', 'simge') === 'string' ? pick(lr, 'icon', 'ikon', 'simge') as string : undefined),
            };
          })
          .filter((line) => line.title || line.text),
      } as NatalAiPlanetHighlight;
    })
    .filter((planet): planet is NatalAiPlanetHighlight => Boolean(
      planet && (planet.title || planet.intro || planet.character || planet.depth),
    ));
}

// Helper: get a field from a record by trying multiple key aliases (EN + TR)
function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  }
  return undefined;
}

function parseStructuredPayload(text: string): NatalAiStructuredPayload | null {
  const parsed = tryParseJson(text);
  const record = asRecord(parsed);
  if (!record) return null;

  // Support both English and Turkish JSON keys
  const opening = cleanText(
    pick(record, 'opening', 'intro', 'summary', 'giriş', 'giris', 'açılış', 'acilis', 'özet'),
  ) ?? undefined;

  const coreSummary = cleanText(
    pick(record, 'coreSummary', 'core_summary', 'overview', 'Temel Özet', 'temelÖzet', 'temelOzet', 'genelBakış', 'genelBakis'),
  ) ?? undefined;

  const closing = cleanText(
    pick(record, 'closing', 'conclusion', 'finalNote', 'final_note', 'kapanış', 'kapanis', 'sonuç', 'sonuc', 'sonNot'),
  ) ?? undefined;

  const sections = normalizeSections(
    pick(record, 'sections', 'sectionList', 'section_list', 'topics', 'bölümler', 'bolumler', 'bölüm', 'bolum'),
  );

  const planetHighlights = normalizePlanetHighlights(
    pick(record, 'planetHighlights', 'planet_highlights', 'planets', 'planet_insights', 'gezegenVurguları', 'gezegenVurgulari', 'gezegen_vurgulari', 'gezegenler'),
  );

  const hasContent = Boolean(opening) || Boolean(coreSummary) || sections.length > 0 || planetHighlights.length > 0;
  if (!hasContent) return null;

  const version = typeof record.version === 'string' ? record.version
    : typeof record[''] === 'string' && /^natal_v\d+$/i.test(record[''] as string) ? (record[''] as string)
    : undefined;

  return { version, tone: undefined, opening, coreSummary, sections, planetHighlights, closing };
}

// ═══════════════════════════════════════════════════════════════════════
// ICON MAPPING for analysisLines
// ═══════════════════════════════════════════════════════════════════════

const ANALYSIS_LINE_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  sparkles: 'sparkles-outline',
  rocket: 'rocket-outline',
  warning: 'warning-outline',
  star: 'star-outline',
  heart: 'heart-outline',
  shield: 'shield-outline',
  flash: 'flash-outline',
  eye: 'eye-outline',
  leaf: 'leaf-outline',
  compass: 'compass-outline',
};

function resolveLineIcon(icon?: string): keyof typeof Ionicons.glyphMap {
  if (!icon) return 'ellipse-outline';
  const key = icon.toLowerCase().replace(/[-_\s]/g, '');
  return ANALYSIS_LINE_ICON_MAP[key] ?? 'ellipse-outline';
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION ICON MAP
// ═══════════════════════════════════════════════════════════════════════

const SECTION_ICONS: Array<{ keywords: string[]; icon: keyof typeof Ionicons.glyphMap }> = [
  { keywords: ['portre', 'özü', 'big three', 'ana tema'], icon: 'sparkles-outline' },
  { keywords: ['çatışma', 'güç merkez', 'gerilim'], icon: 'flash-outline' },
  { keywords: ['yetenek', 'armağan', 'doğal'], icon: 'diamond-outline' },
  { keywords: ['gezegen', 'yerleşim'], icon: 'planet-outline' },
  { keywords: ['kariyer', 'iş', 'amaç', 'başarı'], icon: 'briefcase-outline' },
  { keywords: ['ilişki', 'partner', 'sevgi', 'aşk'], icon: 'heart-outline' },
  { keywords: ['kader', 'sınav', 'saturn', 'ders'], icon: 'shield-outline' },
  { keywords: ['gizli', 'derin', 'dönüşüm', 'plüton'], icon: 'eye-outline' },
  { keywords: ['ruhsal', 'misyon', 'düğüm', 'kuzey'], icon: 'compass-outline' },
];

function resolveSectionIcon(title?: string): keyof typeof Ionicons.glyphMap {
  if (!title) return 'book-outline';
  const normalized = title.toLocaleLowerCase('tr-TR');
  for (const rule of SECTION_ICONS) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) return rule.icon;
  }
  return 'book-outline';
}

// ═══════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════

// Parse inline **bold** / *italic* markdown into Text spans
function MarkdownText({
  children,
  baseStyle,
  headingStyle,
  bodyColor,
  headingColor,
}: {
  children: string;
  baseStyle: any;
  headingStyle: any;
  bodyColor: string;
  headingColor: string;
}) {
  const parts = useMemo(() => {
    const result: Array<{ type: 'text' | 'bold' | 'italic'; value: string }> = [];
    // Match **bold** first, then *italic*
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(children)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', value: children.slice(lastIndex, match.index) });
      }
      if (match[1]) {
        result.push({ type: 'bold', value: match[1] });
      } else if (match[2]) {
        result.push({ type: 'italic', value: match[2] });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < children.length) {
      result.push({ type: 'text', value: children.slice(lastIndex) });
    }
    return result;
  }, [children]);

  if (parts.length === 0) return null;

  // Check if this paragraph is a standalone bold heading (entire line is **bold**)
  const isBoldHeading = parts.length === 1 && parts[0].type === 'bold';

  if (isBoldHeading) {
    return (
      <Text style={[headingStyle, { color: headingColor }]}>
        {parts[0].value}
      </Text>
    );
  }

  const startsWithBoldHeading = parts[0]?.type === 'bold';

  if (startsWithBoldHeading) {
    const trailingParts = parts.slice(1).map((part, index) => ({
      ...part,
      value: index === 0 ? part.value.trimStart() : part.value,
    }));

    return (
      <View style={paragraphStyles.entry}>
        <Text style={[headingStyle, { color: headingColor }]}>
          {parts[0].value}
        </Text>
        {trailingParts.length > 0 ? (
          <Text style={[baseStyle, { color: bodyColor }]}>
            {trailingParts.map((part, i) => {
              if (part.type === 'bold') {
                return (
                  <Text key={i} style={{ fontWeight: '800', color: headingColor }}>
                    {part.value}
                  </Text>
                );
              }
              if (part.type === 'italic') {
                return (
                  <Text key={i} style={{ fontStyle: 'italic' }}>
                    {part.value}
                  </Text>
                );
              }
              return <Text key={i}>{part.value}</Text>;
            })}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Text style={[baseStyle, { color: bodyColor }]}>
      {parts.map((part, i) => {
        if (part.type === 'bold') {
          return (
            <Text key={i} style={{ fontWeight: '800', color: headingColor }}>
              {part.value}
            </Text>
          );
        }
        if (part.type === 'italic') {
          return (
            <Text key={i} style={{ fontStyle: 'italic' }}>
              {part.value}
            </Text>
          );
        }
        return <Text key={i}>{part.value}</Text>;
      })}
    </Text>
  );
}

function ParagraphRenderer({ text }: { text?: string | null }) {
  const { colors } = useTheme();
  const paragraphs = useMemo(() => splitAiBodyToParagraphs(text), [text]);
  if (paragraphs.length === 0) return null;

  return (
    <View style={paragraphStyles.wrap}>
      {paragraphs.map((paragraph, idx) => (
        <MarkdownText
          key={`p-${idx}`}
          baseStyle={paragraphStyles.text}
          headingStyle={paragraphStyles.heading}
          bodyColor={colors.body}
          headingColor={colors.text}
        >
          {paragraph}
        </MarkdownText>
      ))}
    </View>
  );
}

const paragraphStyles = StyleSheet.create({
  wrap: { gap: 12 },
  entry: { gap: 0 },
  text: { fontSize: 13.5, lineHeight: 21 },
  heading: { fontSize: 15, fontWeight: '900', lineHeight: 22, letterSpacing: -0.2, marginTop: 4, marginBottom: 6 },
});

function ExpandableSectionCard({
  title,
  icon,
  body,
  bulletPoints,
  dailyLifeExample,
  index,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  body?: string | null;
  bulletPoints?: Array<{ title?: string; detail?: string }>;
  dailyLifeExample?: string | null;
  index: number;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hasBullets = (bulletPoints ?? []).length > 0;
  const hasExample = Boolean(cleanText(dailyLifeExample));
  const previewText = useMemo(() => {
    const cleaned = sanitizeAiNarrativeText(cleanText(body) ?? '')
      .replace(/\*\*/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    if (!cleaned) return null;
    if (cleaned.length <= 320) return cleaned;

    const clipped = cleaned.slice(0, 320).trim();
    const sentenceEnd = Math.max(
      clipped.lastIndexOf('. '),
      clipped.lastIndexOf('! '),
      clipped.lastIndexOf('? '),
    );
    if (sentenceEnd >= 140) {
      return `${clipped.slice(0, sentenceEnd + 1).trim()}…`;
    }

    const lastSpace = clipped.lastIndexOf(' ');
    return `${clipped.slice(0, lastSpace > 180 ? lastSpace : 320).trim()}…`;
  }, [body]);

  return (
    <Reanimated.View entering={FadeInDown.delay(index * 70).duration(350)}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={[
          secStyles.card,
          {
            backgroundColor: colors.card,
            borderColor: expanded ? colors.violet + '55' : colors.border,
            shadowColor: expanded ? colors.violet : '#000',
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View
          style={[
            secStyles.topGlow,
            { backgroundColor: expanded ? colors.violet : colors.border },
          ]}
        />

        {/* Premium bold headline */}
        <View style={secStyles.headline}>
          <View style={[secStyles.headlineIconWrap, { backgroundColor: colors.violetBg }]}>
            <Ionicons name={icon} size={18} color={colors.violet} />
          </View>
          <View style={secStyles.headlineTitleWrap}>
            <Text style={[secStyles.headlineTitle, { color: colors.text }]} numberOfLines={2}>
              {cleanAstroHeading(title)}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>

        {/* Preview when collapsed */}
        {!expanded && previewText ? (
          <View style={[secStyles.previewWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
            <Text style={[secStyles.previewText, { color: colors.subtext }]}>
              {previewText}
            </Text>
          </View>
        ) : null}

        {/* Expanded content */}
        {expanded ? (
          <Reanimated.View entering={FadeIn.duration(200)} style={secStyles.body}>
            <View style={[secStyles.copyPanel, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <ParagraphRenderer text={body} />
            </View>

            {hasBullets ? (
              <View style={secStyles.bulletGroup}>
                <Text style={[secStyles.bulletGroupTitle, { color: colors.text }]}>
                  Öne Çıkan Noktalar
                </Text>
                {bulletPoints?.map((bp, bpIdx) => (
                  <View
                    key={`bp-${bpIdx}`}
                    style={[secStyles.bulletItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                  >
                    <View style={[secStyles.bulletDotWrap, { backgroundColor: colors.violetBg }]}>
                      <View style={[secStyles.bulletDot, { backgroundColor: colors.violet }]} />
                    </View>
                    <View style={secStyles.bulletContent}>
                      {bp.title ? (
                        <Text style={[secStyles.bulletTitle, { color: colors.text }]}>
                          {cleanAstroHeading(bp.title)}
                        </Text>
                      ) : null}
                      {bp.detail ? (
                        <ParagraphRenderer text={bp.detail} />
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {hasExample ? (
              <View style={[secStyles.exampleBox, { backgroundColor: colors.primaryTint, borderColor: colors.violet + '18' }]}>
                <View style={secStyles.exampleHeader}>
                  <Ionicons name="bulb-outline" size={14} color={colors.violet} />
                  <Text style={[secStyles.exampleLabel, { color: colors.violet }]}>
                    Günlük Hayat Örneği
                  </Text>
                </View>
                <ParagraphRenderer text={translateAstroTermsForUi(dailyLifeExample)} />
              </View>
            ) : null}
          </Reanimated.View>
        ) : null}
      </Pressable>
    </Reanimated.View>
  );
}

const secStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  topGlow: {
    height: 3,
    width: '100%',
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headlineIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headlineTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  previewWrap: {
    marginHorizontal: 18,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 16,
  },
  copyPanel: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bulletGroup: {
    gap: 10,
  },
  bulletGroupTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  bulletDotWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bulletContent: {
    flex: 1,
    gap: 8,
  },
  bulletTitle: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
    marginBottom: 2,
  },
  exampleBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
});

function PlanetCard({
  planet,
  index,
}: {
  planet: NatalAiPlanetHighlight & { _id: string };
  index: number;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const meta = PLANET_META[planet._id] ?? { glyph: '✦', label: 'Gezegen', icon: 'planet-outline' as keyof typeof Ionicons.glyphMap };

  const cardTitle = cleanAstroHeading(translateAstroTermsForUi(
    cleanText(planet.title) ?? `${meta.label} Yerleşimi`,
  ));

  const composedBody = useMemo(() => {
    return [
      cleanText(planet.intro),
      cleanText(planet.character),
      cleanText(planet.depth),
    ].filter(Boolean).join('\n\n');
  }, [planet.intro, planet.character, planet.depth]);

  const previewText = useMemo(() => {
    const first = cleanText(planet.character) ?? cleanText(planet.intro) ?? cleanText(planet.depth);
    if (!first) return null;
    if (first.length <= 120) return first;
    const clipped = first.slice(0, 120).trim();
    const lastSpace = clipped.lastIndexOf(' ');
    return `${clipped.slice(0, lastSpace > 70 ? lastSpace : 120).trim()}…`;
  }, [planet]);

  const lines = safeArray<{ title?: string; text?: string; icon?: string }>(planet.analysisLines)
    .filter((l) => l.title || l.text);

  return (
    <Reanimated.View entering={FadeInDown.delay(index * 70).duration(350)}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={[
          plStyles.card,
          {
            backgroundColor: colors.card,
            borderColor: expanded ? colors.violet + '55' : colors.border,
            shadowColor: expanded ? colors.violet : '#000',
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        {/* Premium bold headline */}
        <View style={plStyles.headline}>
          <View style={[plStyles.glyphWrap, { backgroundColor: colors.violetBg }]}>
            <Text style={[plStyles.glyph, { color: colors.violet }]}>{meta.glyph}</Text>
          </View>
          <View style={plStyles.headlineTitleWrap}>
            <Text style={[plStyles.headlineLabel, { color: colors.violet }]}>
              {meta.label}
            </Text>
            <Text style={[plStyles.headlineTitle, { color: colors.text }]} numberOfLines={2}>
              {cardTitle}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>

        {/* Preview when collapsed */}
        {!expanded && previewText ? (
          <View style={plStyles.previewWrap}>
            <Text style={[plStyles.previewText, { color: colors.subtext }]} numberOfLines={3}>
              {previewText}
            </Text>
          </View>
        ) : null}

        {/* Expanded content */}
        {expanded ? (
          <Reanimated.View entering={FadeIn.duration(200)} style={plStyles.body}>
            <View style={[plStyles.divider, { backgroundColor: colors.border }]} />

            {composedBody ? <ParagraphRenderer text={composedBody} /> : null}

            {lines.length > 0 ? (
              <View style={plStyles.linesGroup}>
                {lines.map((line, lineIdx) => (
                  <View
                    key={`line-${lineIdx}`}
                    style={[plStyles.lineItem, { borderColor: colors.borderLight }]}
                  >
                    <View style={[plStyles.lineIconWrap, { backgroundColor: colors.violetBg }]}>
                      <Ionicons name={resolveLineIcon(line.icon)} size={14} color={colors.violet} />
                    </View>
                    <View style={plStyles.lineContent}>
                      {line.title ? (
                        <Text style={[plStyles.lineTitle, { color: colors.text }]}>
                          {cleanAstroHeading(line.title)}
                        </Text>
                      ) : null}
                      {line.text ? (
                        <Text style={[plStyles.lineText, { color: colors.textSoft }]}>
                          {translateAstroTermsForUi(line.text)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {cleanText(planet.dailyLifeExample) ? (
              <View style={[plStyles.exampleBox, { backgroundColor: colors.primaryTint, borderColor: colors.violet + '18' }]}>
                <View style={plStyles.exampleHeader}>
                  <Ionicons name="bulb-outline" size={14} color={colors.violet} />
                  <Text style={[plStyles.exampleLabel, { color: colors.violet }]}>
                    Pratik Yansıması
                  </Text>
                </View>
                <Text style={[plStyles.exampleText, { color: colors.body }]}>
                  {translateAstroTermsForUi(planet.dailyLifeExample)}
                </Text>
              </View>
            ) : null}
          </Reanimated.View>
        ) : null}
      </Pressable>
    </Reanimated.View>
  );
}

const plStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  glyphWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 20,
    fontWeight: '800',
  },
  headlineTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headlineLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headlineTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  previewWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 19,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  linesGroup: {
    gap: 10,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  lineContent: {
    flex: 1,
    gap: 3,
  },
  lineTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  lineText: {
    fontSize: 13,
    lineHeight: 19,
  },
  exampleBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  exampleText: {
    fontSize: 13.5,
    lineHeight: 21,
  },
});

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function StructuredNatalAiInterpretation({ text, fallbackTextStyle }: Props) {
  const { colors } = useTheme();
  const payload = useMemo(() => parseStructuredPayload(text), [text]);

  // Structured sections
  const sections = useMemo(() => {
    if (!payload?.sections) return [];
    return payload.sections
      .map((section, idx) => {
        const body = cleanText(section.body);
        if (!body) return null;
        const title = inferTurkishAiTitle(body, cleanText(section.title) ?? section.id ?? `Bölüm ${idx + 1}`);
        return { ...section, body, title, _id: String(section.id ?? `section-${idx + 1}`) };
      })
      .filter((section) => section && !shouldHideSectionTitle(section.title))
      .filter(Boolean) as Array<NatalAiSection & { body: string; title: string; _id: string }>;
  }, [payload]);

  // Planet highlights
  const planets = useMemo(() => {
    if (!payload?.planetHighlights) return [];
    return payload.planetHighlights
      .slice(0, 10)
      .map((planet, idx) => ({
        ...planet,
        _id: (planet.planetId ?? `planet-${idx + 1}`).toLowerCase(),
      }));
  }, [payload]);

  const heroOpeningText = useMemo(() => {
    const cleaned = sanitizeAiNarrativeText(payload?.opening ?? '').trim();
    return cleaned.replace(/^\s*(?:g[iıİI]r[iıİI](?:ş|s)|opening|intro)\s*[.:,-]?\s*/iu, '').trim();
  }, [payload?.opening]);

  const heroSummaryText = useMemo(() => {
    const cleaned = sanitizeAiNarrativeText(payload?.coreSummary ?? '').trim();
    return cleaned.replace(/^\s*(?:g[iıİI]r[iıİI](?:ş|s)|opening|intro)\s*[.:,-]?\s*/iu, '').trim();
  }, [payload?.coreSummary]);

  const hasStructuredPayload = Boolean(
    payload?.opening
    || payload?.coreSummary
    || payload?.closing
    || sections.length > 0
    || planets.length > 0,
  );

  // Plain text fallback
  const plainBlocks = useMemo(() => {
    if (payload) return [];
    const safePlain = unwrapCodeFence(text);
    return splitPlainAiTextToBlocks(safePlain).filter((block) => !shouldHideSectionTitle(block.title));
  }, [text, payload]);

  const isStructured = hasStructuredPayload;

  // Complete fallback — unparseable text
  if (!isStructured && plainBlocks.length === 0) {
    return (
      <StaggeredAiText
        text={sanitizeAiNarrativeText(unwrapCodeFence(text))}
        style={fallbackTextStyle}
      />
    );
  }

  // ─── Structured Render ───────────────────────────────────────────
  if (isStructured) {
    return (
      <View style={mainStyles.container}>
        {/* Opening / Core Summary Hero */}
        {(payload?.opening || payload?.coreSummary) ? (
          <Reanimated.View entering={FadeIn.duration(400)}>
            <View style={[mainStyles.heroCard, { backgroundColor: colors.primaryTint, borderColor: colors.violet + '20' }]}>
              <View style={mainStyles.heroHeader}>
                <View style={[mainStyles.heroIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="sparkles" size={16} color={colors.violet} />
                </View>
                <Text style={[mainStyles.heroTitle, { color: colors.text }]}>Guru Yorum</Text>
              </View>
              {heroOpeningText ? (
                <View style={mainStyles.heroParagraphWrap}>
                  <ParagraphRenderer text={heroOpeningText} />
                </View>
              ) : null}
              {heroSummaryText && heroSummaryText !== heroOpeningText ? (
                <View style={mainStyles.heroParagraphWrap}>
                  <ParagraphRenderer text={heroSummaryText} />
                </View>
              ) : null}
            </View>
          </Reanimated.View>
        ) : null}

        {/* Sections */}
        {sections.length > 0 ? (
          <View style={mainStyles.group}>
            {sections.map((section, idx) => (
              <ExpandableSectionCard
                key={section._id}
                title={section.title}
                icon={resolveSectionIcon(section.title)}
                body={section.body}
                bulletPoints={section.bulletPoints}
                dailyLifeExample={section.dailyLifeExample}
                index={idx}
              />
            ))}
          </View>
        ) : null}

        {/* Planet Highlights */}
        {planets.length > 0 ? (
          <View style={mainStyles.group}>
            <View style={mainStyles.groupHeader}>
              <View style={[mainStyles.groupIconWrap, { backgroundColor: colors.violetBg }]}>
                <Ionicons name="planet-outline" size={16} color={colors.violet} />
              </View>
              <View style={mainStyles.groupTitleWrap}>
                <Text style={[mainStyles.groupTitle, { color: colors.text }]}>Gezegensel Etkiler</Text>
                <Text style={[mainStyles.groupHint, { color: colors.subtext }]}>
                  Haritandaki gezegen yerleşimleri ve sana olan etkileri
                </Text>
              </View>
            </View>
            {planets.map((planet, idx) => (
              <PlanetCard
                key={`${planet._id}-${idx}`}
                planet={planet}
                index={idx}
              />
            ))}
          </View>
        ) : null}

        {/* Closing */}
        {payload?.closing ? (
          <Reanimated.View entering={FadeIn.delay(200).duration(400)}>
            <View style={[mainStyles.closingCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <View style={mainStyles.closingHeader}>
                <Ionicons name="heart-outline" size={15} color={colors.violet} />
                <Text style={[mainStyles.closingTitle, { color: colors.text }]}>Seninle Kalsın</Text>
              </View>
              <ParagraphRenderer text={payload.closing} />
            </View>
          </Reanimated.View>
        ) : null}
      </View>
    );
  }

  // ─── Plain Text Blocks Render ────────────────────────────────────
  return (
    <View style={mainStyles.container}>
      {plainBlocks.map((block, idx) => (
        <ExpandableSectionCard
          key={block.id}
          title={block.title}
          icon={resolveSectionIcon(block.title)}
          body={block.body}
          index={idx}
        />
      ))}
    </View>
  );
}

const mainStyles = StyleSheet.create({
  container: {
    gap: 18,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroText: {
    fontSize: 14.5,
    lineHeight: 23,
  },
  heroSubText: {
    fontSize: 13.5,
    lineHeight: 21,
  },
  heroParagraphWrap: {
    gap: 10,
  },
  group: {
    gap: 12,
  },
  closingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  closingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closingTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  closingText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
