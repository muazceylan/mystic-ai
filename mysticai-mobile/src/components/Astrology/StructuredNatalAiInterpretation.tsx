import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import StaggeredAiText from './StaggeredAiText';
import { AccordionSection } from '../ui';
import { cleanAstroHeading, translateAstroTermsForUi } from '../../constants/astroLabelMap';
import { inferTurkishAiTitle, splitAiBodyToParagraphs, splitPlainAiTextToBlocks } from '../../utils/astroTextProcessor';

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

const PLANET_META: Record<string, { glyph: string; label: string }> = {
  sun: { glyph: '☉', label: 'Güneş' },
  moon: { glyph: '☽', label: 'Ay' },
  mercury: { glyph: '☿', label: 'Merkür' },
  venus: { glyph: '♀', label: 'Venüs' },
  mars: { glyph: '♂', label: 'Mars' },
  jupiter: { glyph: '♃', label: 'Jüpiter' },
  saturn: { glyph: '♄', label: 'Satürn' },
  uranus: { glyph: '♅', label: 'Uranüs' },
  neptune: { glyph: '♆', label: 'Neptün' },
  pluto: { glyph: '♇', label: 'Plüton' },
  chiron: { glyph: '⚷', label: 'Kiron' },
  north_node: { glyph: '☊', label: 'Kuzey Düğümü' },
};

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v.length) return null;
  return translateAstroTermsForUi(v)
    .replace(/\bCONJUNCTION\b/gi, 'Kavuşum (Güç Birliği)')
    .replace(/\bSEXTILE\b/gi, 'Altıgen (Fırsat Akışı)')
    .replace(/\bSQUARE\b/gi, 'Kare (Gelişim Gerilimi)')
    .replace(/\bTRINE\b/gi, 'Üçgen (Doğal Akış)')
    .replace(/\bOPPOSITION\b/gi, 'Karşıt (Denge Dersi)');
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const TECHNICAL_RECOVERY_MARKERS = [
  'json şemasına',
  'normalize edilmiş',
  'teknik olarak düzeltildi',
  'yorum dönüştürme notu',
  'ham içerik özeti',
  'normalizasyon',
  'recovery',
];

function unwrapCodeFence(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();
  return trimmed;
}

function normalizeJsonCandidate(text: string): string {
  let normalized = text
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

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

function unwrapStringifiedJson(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'string' ? parsed.trim() : null;
  } catch {
    return null;
  }
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
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (start === -1) start = idx;
      depth += 1;
      continue;
    }
    if (char === '}') {
      if (depth <= 0) continue;
      depth -= 1;
      if (start !== -1 && depth === 0) {
        return trimmed.slice(start, idx + 1);
      }
    }
  }

  if (start >= 0) {
    const end = trimmed.lastIndexOf('}');
    if (end > start) return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function addUniqueCandidate(target: string[], candidate: string | null | undefined) {
  if (typeof candidate !== 'string') return;
  const trimmed = candidate.trim();
  if (!trimmed || target.includes(trimmed)) return;
  target.push(trimmed);
}

function buildJsonCandidates(text: string): string[] {
  const candidates: string[] = [];
  const raw = text.trim();
  const unwrapped = unwrapCodeFence(raw);
  const normalized = normalizeJsonCandidate(unwrapped);
  const stringified = unwrapStringifiedJson(unwrapped);

  addUniqueCandidate(candidates, raw);
  addUniqueCandidate(candidates, unwrapped);
  addUniqueCandidate(candidates, extractJsonObjectBlock(unwrapped));
  addUniqueCandidate(candidates, normalized);
  addUniqueCandidate(candidates, extractJsonObjectBlock(normalized));

  if (stringified) {
    const normalizedInner = normalizeJsonCandidate(stringified);
    addUniqueCandidate(candidates, stringified);
    addUniqueCandidate(candidates, extractJsonObjectBlock(stringified));
    addUniqueCandidate(candidates, normalizedInner);
    addUniqueCandidate(candidates, extractJsonObjectBlock(normalizedInner));
  }

  return candidates.slice(0, 12);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeBulletPoints(value: unknown): Array<{ title?: string; detail?: string }> {
  const mapped = safeArray<unknown>(value)
    .map((item): { title?: string; detail?: string } | null => {
      if (typeof item === 'string') {
        const detail = cleanText(item) ?? undefined;
        return detail ? { title: 'Ana Nokta', detail } : null;
      }
      const record = asRecord(item);
      if (!record) return null;
      return {
        title: cleanText(record.title ?? record.label ?? record.name) ?? undefined,
        detail: cleanText(record.detail ?? record.text ?? record.body) ?? undefined,
      };
    });
  return mapped.filter((bp): bp is { title?: string; detail?: string } => Boolean(bp && (bp.title || bp.detail)));
}

function normalizeSections(value: unknown): NatalAiSection[] {
  const arraySource = safeArray<unknown>(value);
  const mapSource = asRecord(value);

  const source = arraySource.length > 0
    ? arraySource
    : Object.entries(mapSource ?? {}).map(([id, section]) => ({ ...(asRecord(section) ?? {}), id }));

  return source
    .map((item) => {
      const section = asRecord(item);
      if (!section) return null;
      return {
        id: cleanText(section.id) ?? undefined,
        title: cleanText(section.title ?? section.heading ?? section.name) ?? undefined,
        body: cleanText(section.body ?? section.text ?? section.content ?? section.description) ?? undefined,
        dailyLifeExample: cleanText(
          section.dailyLifeExample ?? section.daily_life_example ?? section.example,
        ) ?? undefined,
        bulletPoints: normalizeBulletPoints(section.bulletPoints ?? section.bullets),
      } as NatalAiSection;
    })
    .filter((section): section is NatalAiSection => Boolean(section && (section.title || section.body)));
}

function normalizePlanetHighlights(value: unknown): NatalAiPlanetHighlight[] {
  return safeArray<unknown>(value)
    .map((item) => {
      const planet = asRecord(item);
      if (!planet) return null;
      return {
        planetId: cleanText(planet.planetId ?? planet.planet ?? planet.id) ?? undefined,
        title: cleanText(planet.title) ?? undefined,
        intro: cleanText(planet.intro) ?? undefined,
        character: cleanText(planet.character) ?? undefined,
        depth: cleanText(planet.depth) ?? undefined,
        dailyLifeExample: cleanText(planet.dailyLifeExample ?? planet.daily_life_example) ?? undefined,
        analysisLines: safeArray<{ title?: string; text?: string; icon?: string }>(planet.analysisLines)
          .map((line) => ({
            title: cleanText(line?.title) ?? undefined,
            text: cleanText(line?.text) ?? undefined,
            icon: cleanText(line?.icon) ?? undefined,
          }))
          .filter((line) => line.title || line.text),
      } as NatalAiPlanetHighlight;
    })
    .filter((planet): planet is NatalAiPlanetHighlight => Boolean(
      planet && (planet.title || planet.intro || planet.character || planet.depth),
    ));
}

function toStructuredPayload(value: unknown): NatalAiStructuredPayload | null {
  const parsed = asRecord(value);
  if (!parsed) return null;

  const sections = normalizeSections(parsed.sections ?? parsed.sectionList ?? parsed.topics);
  const planetHighlights = normalizePlanetHighlights(
    parsed.planetHighlights ?? parsed.planets ?? parsed.planet_insights,
  );

  const opening = cleanText(parsed.opening ?? parsed.intro ?? parsed.summary) ?? undefined;
  const coreSummary = cleanText(parsed.coreSummary ?? parsed.overview) ?? undefined;
  const closing = cleanText(parsed.closing ?? parsed.conclusion ?? parsed.finalNote) ?? undefined;

  const looksStructured =
    parsed.version === 'natal_v2'
    || Boolean(opening)
    || sections.length > 0
    || planetHighlights.length > 0;

  if (!looksStructured) return null;

  return {
    version: cleanText(parsed.version) ?? undefined,
    tone: cleanText(parsed.tone) ?? undefined,
    opening,
    coreSummary,
    sections,
    planetHighlights,
    closing,
  };
}

function parseStructuredNatalAi(text: string): NatalAiStructuredPayload | null {
  for (const candidate of buildJsonCandidates(text)) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (typeof parsed === 'string') {
        for (const innerCandidate of buildJsonCandidates(parsed)) {
          try {
            const innerParsed = JSON.parse(innerCandidate) as unknown;
            const nestedPayload = toStructuredPayload(innerParsed);
            if (nestedPayload) return nestedPayload;
          } catch {
            // Continue with next inner candidate.
          }
        }
        continue;
      }
      const payload = toStructuredPayload(parsed);
      if (payload) return payload;
    } catch {
      // Continue with next candidate.
    }
  }
  return null;
}

function looksLikeTechnicalRecoveryPayload(payload: NatalAiStructuredPayload): boolean {
  const haystack = [
    payload.opening,
    payload.coreSummary,
    payload.closing,
    ...(payload.sections ?? []).flatMap((section) => [
      section.id,
      section.title,
      section.body,
      section.dailyLifeExample,
      ...safeArray<{ title?: string; detail?: string }>(section.bulletPoints).flatMap((bp) => [bp.title, bp.detail]),
    ]),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLocaleLowerCase('tr-TR');

  return TECHNICAL_RECOVERY_MARKERS.some((marker) => haystack.includes(marker));
}

function isTechnicalNarrative(value?: string | null): boolean {
  const cleaned = cleanText(value);
  if (!cleaned) return false;
  const normalized = cleaned.toLocaleLowerCase('tr-TR');
  return TECHNICAL_RECOVERY_MARKERS.some((marker) => normalized.includes(marker));
}

function buildRecoveryNarrative(payload: NatalAiStructuredPayload, rawText: string): string {
  const fragments: string[] = [];
  const push = (value?: string | null) => {
    const cleaned = cleanText(value);
    if (!cleaned || isTechnicalNarrative(cleaned) || fragments.includes(cleaned)) return;
    fragments.push(cleaned);
  };

  push(payload.opening);
  push(payload.coreSummary);
  for (const section of payload.sections ?? []) {
    push(section.body);
    push(section.dailyLifeExample);
    for (const bullet of safeArray<{ title?: string; detail?: string }>(section.bulletPoints)) {
      push(bullet.detail);
    }
  }
  for (const planet of payload.planetHighlights ?? []) {
    push(planet.intro);
    push(planet.character);
    push(planet.depth);
    push(planet.dailyLifeExample);
  }
  push(payload.closing);

  if (fragments.length > 0) {
    return fragments.slice(0, 8).join('\n\n');
  }

  const fallback = unwrapCodeFence(rawText);
  if (fallback.includes('{') && fallback.includes('}')) {
    return normalizeJsonCandidate(fallback)
      .replace(/[{}[\]"]/g, ' ')
      .replace(/[,;]+/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return fallback;
}

function buildSafePlainText(text: string): string {
  return unwrapCodeFence(text);
}

function parsePlainBlocks(text: string) {
  const normalized = buildSafePlainText(text);
  if (!normalized) return [];
  return splitPlainAiTextToBlocks(normalized);
}

function parseAiMode(text: string, payload: NatalAiStructuredPayload | null) {
  if (!payload) {
    return {
      useStructured: false,
      plainSource: buildSafePlainText(text),
      isRecoveryMode: false,
    };
  }
  const isRecoveryMode = looksLikeTechnicalRecoveryPayload(payload);
  if (!isRecoveryMode) {
    return {
      useStructured: true,
      plainSource: '',
      isRecoveryMode: false,
    };
  }
  return {
    useStructured: false,
    plainSource: buildRecoveryNarrative(payload, text),
    isRecoveryMode: true,
  };
}

function parseStructuredText(text: string): NatalAiStructuredPayload | null {
  const payload = parseStructuredNatalAi(text);
  if (payload) return payload;
  try {
    const raw = JSON.parse(text.trim()) as unknown;
    return toStructuredPayload(raw);
  } catch {
    return null;
  }
}

function MiniInfoBlock({
  title,
  text,
}: {
  title: string;
  text?: string | null;
}) {
  const { colors } = useTheme();
  if (!text) return null;
  return (
    <View style={styles.infoBlock}>
      <Text style={[styles.infoBlockTitle, { color: colors.violet }]}>{title}</Text>
      <Text style={[styles.infoBlockText, { color: colors.body }]}>{text}</Text>
    </View>
  );
}

function BulletInfoBlock({
  title,
  detail,
}: {
  title?: string | null;
  detail?: string | null;
}) {
  const { colors } = useTheme();
  if (!title && !detail) return null;
  return (
    <View
      style={[
        styles.bulletCard,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {title ? <Text style={[styles.bulletTitle, { color: colors.text }]}>{cleanAstroHeading(title)}</Text> : null}
      {detail ? <Text style={[styles.bulletText, { color: colors.textSoft }]}>{detail}</Text> : null}
    </View>
  );
}

function ParagraphBlock({ text }: { text?: string | null }) {
  const { colors } = useTheme();
  const paragraphs = useMemo(() => splitAiBodyToParagraphs(text), [text]);
  if (paragraphs.length === 0) return null;

  return (
    <View style={styles.paragraphGroup}>
      {paragraphs.map((paragraph, idx) => (
        <Text key={`paragraph-${idx}`} style={[styles.sectionBody, { color: colors.body }]}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

export default function StructuredNatalAiInterpretation({ text, fallbackTextStyle }: Props) {
  const { colors } = useTheme();

  const payload = useMemo(() => parseStructuredText(text), [text]);
  const aiMode = useMemo(() => parseAiMode(text, payload), [text, payload]);
  const plainBlocks = useMemo(() => parsePlainBlocks(aiMode.plainSource), [aiMode.plainSource]);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [openPlanetId, setOpenPlanetId] = useState<string | null>(null);

  useEffect(() => {
    setOpenSectionId(null);
    setOpenPlanetId(null);
  }, [text]);

  const parsedSections = useMemo(() => {
    if (!payload || !aiMode.useStructured) return [];
    return (payload.sections ?? []).map((section, idx) => {
      const body = cleanText(section.body) ?? '';
      const title = inferTurkishAiTitle(body, cleanText(section.title) ?? section.id ?? `Bölüm ${idx + 1}`);
      return { ...section, body, title, _id: String(section.id ?? `section-${idx + 1}`) };
    });
  }, [aiMode.useStructured, payload]);

  const parsedPlanetHighlights = useMemo(() => {
    if (!payload || !aiMode.useStructured) return [];
    return (payload.planetHighlights ?? []).slice(0, 8).map((planet, idx) => {
      const id = (planet.planetId ?? `planet-${idx + 1}`).toLowerCase();
      const composedBody = [
        cleanText(planet.intro),
        cleanText(planet.character),
        cleanText(planet.depth),
        cleanText(planet.dailyLifeExample),
      ]
        .filter(Boolean)
        .join(' ');
      const title = inferTurkishAiTitle(composedBody, cleanText(planet.title) ?? `${id} yerleşimi`);
      return { ...planet, _id: id, _accordionTitle: title };
    });
  }, [aiMode.useStructured, payload]);

  const sections = parsedSections;
  const planetHighlights = parsedPlanetHighlights;

  if (!aiMode.useStructured && plainBlocks.length === 0) {
    return (
      <StaggeredAiText
        text={aiMode.plainSource || buildSafePlainText(text)}
        style={fallbackTextStyle}
      />
    );
  }

  if (!aiMode.useStructured && plainBlocks.length > 0) {
    const plainTitle = aiMode.isRecoveryMode ? 'Yorum Onarıldı' : 'Kozmik Yorum';
    const plainInfo = aiMode.isRecoveryMode
      ? 'AI çıktısı şema dışıydı; içerik başlıklara ayrıştırılarak okunabilir hale getirildi.'
      : 'Yorum metni güvenli biçimde başlıklara ayrıştırıldı. Başlıklara dokunarak alt bölümleri açabilirsin.';
    const plainModeLabel = aiMode.isRecoveryMode ? 'Kurtarılan içerik' : 'Serbest metin';

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.primaryTint,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <Ionicons name="sparkles" size={14} color={colors.violet} />
            <Text style={[styles.heroTitle, { color: colors.text }]}>{plainTitle}</Text>
          </View>
          <Text style={[styles.heroSubText, { color: colors.textSoft }]}>
            {plainInfo}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroMetaPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.heroMetaText, { color: colors.text }]}>
                {plainBlocks.length} bölüm
              </Text>
            </View>
            <View style={[styles.heroMetaPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.heroMetaText, { color: colors.textSoft }]}>
                {plainModeLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>Yorum Akışı</Text>
          {plainBlocks.map((block) => (
            <AccordionSection
              key={block.id}
              id={block.id}
              title={block.title}
              subtitle={undefined}
              icon="document-text-outline"
              expanded={openSectionId === block.id}
              onToggle={(id) => setOpenSectionId((prev) => (prev === id ? null : id))}
              lazy
              deferBodyMount
            >
              <View style={styles.nestedBody}>
                <ParagraphBlock text={block.body} />
              </View>
            </AccordionSection>
          ))}
        </View>
      </View>
    );
  }

  const structuredPayload = payload!;

  return (
    <View style={styles.container}>
      {(structuredPayload.opening || structuredPayload.coreSummary) && (
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.primaryTint,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <Ionicons name="sparkles" size={14} color={colors.violet} />
            <Text style={[styles.heroTitle, { color: colors.text }]}>Kozmik Özet</Text>
          </View>
          {structuredPayload.opening ? (
            <Text style={[styles.heroText, { color: colors.body }]}>{structuredPayload.opening}</Text>
          ) : null}
          {structuredPayload.coreSummary ? (
            <Text style={[styles.heroSubText, { color: colors.textSoft }]}>{structuredPayload.coreSummary}</Text>
          ) : null}
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroMetaPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.heroMetaText, { color: colors.text }]}>
                {sections.length} bölüm
              </Text>
            </View>
            {planetHighlights.length > 0 ? (
              <View style={[styles.heroMetaPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.heroMetaText, { color: colors.text }]}>
                  {planetHighlights.length} gezegen
                </Text>
              </View>
            ) : null}
            <View style={[styles.heroMetaPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.heroMetaText, { color: colors.textSoft }]}>Yapılandırılmış</Text>
            </View>
          </View>
        </View>
      )}

      {sections.length > 0 && (
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>Yorum Bölümleri</Text>
          {sections.map((section) => (
            <AccordionSection
              key={section._id}
              id={section._id}
              title={inferTurkishAiTitle(section.body, section.title)}
              subtitle={undefined}
              icon="sparkles-outline"
              expanded={openSectionId === section._id}
              onToggle={(id) => setOpenSectionId((prev) => (prev === id ? null : id))}
              lazy
              deferBodyMount
            >
              <View style={styles.nestedBody}>
                <ParagraphBlock text={section.body} />
                {(section.bulletPoints ?? []).length > 0 ? (
                  <View style={styles.bulletGroup}>
                    {section.bulletPoints?.map((bp, bpIdx) => (
                      <BulletInfoBlock
                        key={`${section.id ?? 'section'}-bp-${bpIdx}`}
                        title={bp.title}
                        detail={bp.detail}
                      />
                    ))}
                  </View>
                ) : null}
                {cleanText(section.dailyLifeExample) ? (
                  <View
                    style={[
                      styles.exampleBox,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Text style={[styles.exampleLabel, { color: colors.violet }]}>Günlük Hayat Örneği</Text>
                    <Text style={[styles.exampleText, { color: colors.textSoft }]}>
                      {translateAstroTermsForUi(section.dailyLifeExample)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </AccordionSection>
          ))}
        </View>
      )}

      {planetHighlights.length > 0 && (
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>Gezegen Rehberi</Text>
          {planetHighlights.map((planet, idx) => {
            const id = planet._id;
            const meta = PLANET_META[id] ?? { glyph: '✦', label: 'Gezegen' };
            const cardTitle = cleanAstroHeading(translateAstroTermsForUi(planet._accordionTitle ?? cleanText(planet.title) ?? `${meta.label} Yerleşimi`));
            return (
              <AccordionSection
                key={`${id || 'planet'}-${idx}`}
                id={`planet-${id || idx}`}
                title={`${meta.glyph} ${cardTitle}`}
                subtitle={`${meta.label} • Satır satır yorum`}
                icon="planet-outline"
                expanded={openPlanetId === `planet-${id || idx}`}
                onToggle={(itemId) => setOpenPlanetId((prev) => (prev === itemId ? null : itemId))}
                lazy
                deferBodyMount
              >
                <View style={styles.nestedBody}>
                  <View style={styles.planetHeader}>
                    <View style={[styles.planetGlyphWrap, { backgroundColor: colors.violetBg }]}>
                      <Text style={[styles.planetGlyph, { color: colors.violet }]}>{meta.glyph}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={[styles.planetTitle, { color: colors.text }]}>{cardTitle}</Text>
                      <Text style={[styles.planetSub, { color: colors.muted }]}>{meta.label}</Text>
                    </View>
                  </View>

                  {safeArray<{ title?: string; text?: string; icon?: string }>(planet.analysisLines).length > 0 ? (
                    <View style={styles.bulletGroup}>
                      {safeArray<{ title?: string; text?: string; icon?: string }>(planet.analysisLines).map((line, lineIdx) => (
                        <BulletInfoBlock
                          key={`${id}-line-${lineIdx}`}
                          title={inferTurkishAiTitle(line.text, line.title)}
                          detail={translateAstroTermsForUi(line.text)}
                        />
                      ))}
                    </View>
                  ) : (
                    <>
                      <MiniInfoBlock title="Karakter Analizi" text={cleanText(planet.character) ?? cleanText(planet.intro)} />
                      <MiniInfoBlock title="Seni Nasıl Etkiler?" text={cleanText(planet.depth)} />
                    </>
                  )}
                  <MiniInfoBlock title="Giriş" text={safeArray(planet.analysisLines).length ? null : cleanText(planet.intro)} />
                  <MiniInfoBlock title="Derinlik" text={safeArray(planet.analysisLines).length ? null : cleanText(planet.depth)} />

                  {cleanText(planet.dailyLifeExample) ? (
                    <View
                      style={[
                        styles.planetExample,
                        { backgroundColor: colors.primaryTint, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.exampleLabel, { color: colors.violet }]}>Hayat Senaryosu</Text>
                      <Text style={[styles.exampleText, { color: colors.textSoft }]}>
                        {translateAstroTermsForUi(planet.dailyLifeExample)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </AccordionSection>
            );
          })}
        </View>
      )}

      {structuredPayload.closing ? (
        <View
          style={[
            styles.closingCard,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.closingTitle, { color: colors.text }]}>Kapanış Notu</Text>
          <Text style={[styles.closingText, { color: colors.body }]}>{structuredPayload.closing}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  heroText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  heroSubText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  heroMetaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroMetaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  nestedBody: {
    gap: 10,
  },
  paragraphGroup: {
    gap: 8,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIndexDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIndexText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  exampleBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  exampleText: {
    fontSize: 12,
    lineHeight: 18,
  },
  planetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  planetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planetGlyphWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetGlyph: {
    fontSize: 18,
    fontWeight: '700',
  },
  planetTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  planetSub: {
    fontSize: 11,
  },
  infoBlock: {
    gap: 4,
  },
  infoBlockTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoBlockText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  bulletGroup: {
    gap: 8,
    marginTop: 2,
  },
  bulletCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  bulletTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 17,
  },
  planetExample: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  closingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  closingTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  closingText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
