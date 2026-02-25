import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import StaggeredAiText from './StaggeredAiText';
import { AccordionSection } from '../ui';
import { cleanAstroHeading, translateAstroTermsForUi } from '../../constants/astroLabelMap';
import { inferTurkishAiTitle, splitPlainAiTextToBlocks } from '../../utils/astroTextProcessor';

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

function extractJsonObjectBlock(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function parseStructuredNatalAi(text: string): NatalAiStructuredPayload | null {
  const jsonBlock = extractJsonObjectBlock(text);
  try {
    const parsed = JSON.parse(jsonBlock) as NatalAiStructuredPayload;
    const sections = safeArray<NatalAiSection>(parsed.sections).filter(
      (s) => cleanText(s?.title) || cleanText(s?.body),
    );
    const planetHighlights = safeArray<NatalAiPlanetHighlight>(parsed.planetHighlights).filter(
      (p) =>
        cleanText(p?.title) ||
        cleanText(p?.intro) ||
        cleanText(p?.character) ||
        cleanText(p?.depth),
    );

    const looksStructured =
      parsed?.version === 'natal_v2' ||
      Boolean(cleanText(parsed.opening)) ||
      sections.length > 0 ||
      planetHighlights.length > 0;

    if (!looksStructured) return null;

    return {
      version: parsed.version,
      tone: parsed.tone,
      opening: cleanText(parsed.opening) ?? undefined,
      coreSummary: cleanText(parsed.coreSummary) ?? undefined,
      sections: sections.map((section) => ({
        ...section,
        title: cleanText(section.title) ?? undefined,
        body: cleanText(section.body) ?? undefined,
        dailyLifeExample: cleanText(section.dailyLifeExample) ?? undefined,
        bulletPoints: safeArray<{ title?: string; detail?: string }>(section.bulletPoints)
          .map((bp) => ({
            title: cleanText(bp?.title) ?? undefined,
            detail: cleanText(bp?.detail) ?? undefined,
          }))
          .filter((bp) => bp.title || bp.detail),
      })),
      planetHighlights,
      closing: cleanText(parsed.closing) ?? undefined,
    };
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

export default function StructuredNatalAiInterpretation({ text, fallbackTextStyle }: Props) {
  const { colors } = useTheme();

  const payload = useMemo(() => parseStructuredNatalAi(text), [text]);
  const plainBlocks = useMemo(() => (payload ? [] : splitPlainAiTextToBlocks(text)), [payload, text]);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [openPlanetId, setOpenPlanetId] = useState<string | null>(null);

  useEffect(() => {
    setOpenSectionId(null);
    setOpenPlanetId(null);
  }, [text]);

  const parsedSections = useMemo(() => {
    if (!payload) return [];
    return (payload.sections ?? []).map((section, idx) => {
      const body = cleanText(section.body) ?? '';
      const title = inferTurkishAiTitle(body, cleanText(section.title) ?? section.id ?? `Bölüm ${idx + 1}`);
      return { ...section, body, title, _id: String(section.id ?? `section-${idx + 1}`) };
    });
  }, [payload]);

  const parsedPlanetHighlights = useMemo(() => {
    if (!payload) return [];
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
  }, [payload]);

  if (!payload && plainBlocks.length === 0) {
    return <StaggeredAiText text={text} style={fallbackTextStyle} />;
  }

  if (!payload && plainBlocks.length > 0) {
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
            <Text style={[styles.heroTitle, { color: colors.text }]}>Kozmik Yorum</Text>
          </View>
          <Text style={[styles.heroSubText, { color: colors.textSoft }]}>
            Ham yorum metni paragraf bazlı ayrıştırıldı. Başlıklara dokunarak alt bölümleri açabilirsin.
          </Text>
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>AI Analizi Bölümleri</Text>
          {plainBlocks.map((block, idx) => (
            <AccordionSection
              key={block.id}
              id={block.id}
              title={block.title}
              subtitle={`Paragraf ${idx + 1}`}
              icon="document-text-outline"
              expanded={openSectionId === block.id}
              onToggle={(id) => setOpenSectionId((prev) => (prev === id ? null : id))}
              lazy
              deferBodyMount
            >
              <View style={styles.nestedBody}>
                <Text style={[styles.sectionBody, { color: colors.body }]}>{block.body}</Text>
              </View>
            </AccordionSection>
          ))}
        </View>
      </View>
    );
  }

  const sections = parsedSections;
  const planetHighlights = parsedPlanetHighlights;
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
        </View>
      )}

      {sections.length > 0 && (
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>AI Analizi</Text>
          {sections.map((section, idx) => (
            <AccordionSection
              key={section._id}
              id={section._id}
              title={inferTurkishAiTitle(section.body, section.title)}
              subtitle={`Analiz Katmanı ${idx + 1}`}
              icon="sparkles-outline"
              expanded={openSectionId === section._id}
              onToggle={(id) => setOpenSectionId((prev) => (prev === id ? null : id))}
              lazy
              deferBodyMount
            >
              <View style={styles.nestedBody}>
                {cleanText(section.body) ? (
                  <Text style={[styles.sectionBody, { color: colors.body }]}>{section.body}</Text>
                ) : null}
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
