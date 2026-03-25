import { cleanAstroHeading, translateAstroTermsForUi } from '../constants/astroLabelMap';

export type AiAccordionBlock = {
  id: string;
  title: string;
  body: string;
};

type TitleRule = {
  title: string;
  keywords: string[];
};

const SENTENCE_BOUNDARY_REGEX = /(?<=[.!?])\s+(?=(?:["“”'‘’(]*[A-ZÇĞİÖŞÜ]))/g;

const TITLE_RULES: TitleRule[] = [
  { title: 'İş Hayatı ve Başarı', keywords: ['kariyer', 'meslek', 'başarı', 'hedef', 'iş hayatı', 'statü'] },
  { title: 'Duygusal Dünyan ve Sezgilerin', keywords: ['duygu', 'sezgi', 'hassas', 'güven', 'iç dünya', 'kalp'] },
  { title: 'İlişkiler ve Bağ Kurma Tarzın', keywords: ['ilişki', 'partner', 'bağ', 'sevgi', 'yakınlık', 'sosyal'] },
  { title: 'Para ve Bolluk', keywords: ['para', 'bolluk', 'maddi', 'kaynak', 'gelir', 'finans'] },
  { title: 'İletişim ve Zihin Akışı', keywords: ['iletişim', 'zihin', 'düşün', 'konuş', 'öğren', 'ifade'] },
  { title: 'Güçlü Yönlerin ve Yeteneklerin', keywords: ['yetenek', 'güçlü', 'potansiyel', 'armağan', 'yaratıc'] },
  { title: 'Zorluklar ve Gelişim Dersleri', keywords: ['zorlan', 'engel', 'ders', 'gerilim', 'sınav', 'dikkat'] },
  { title: 'Ruhsal Yön ve Anlam Arayışı', keywords: ['ruhsal', 'anlam', 'misyon', 'kadersel', 'kuzey düğümü'] },
];

function normalizeForMatch(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatAiHeading(title: string): string {
  const cleaned = cleanAstroHeading(translateAstroTermsForUi(title))
    .replace(/^[.:,\s-]+|[.:,\s-]+$/g, '')
    .trim();

  return cleaned ? `\n\n**${cleaned}**\n\n` : '\n\n';
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeAiNarrativeText(rawText: string): string {
  let normalized = translateAstroTermsForUi(rawText ?? '');

  normalized = normalized
    .replace(/\b(?:natal_v\d+|scientific_warm)\b\s*[.:]*/gi, ' ')
    .replace(/\b(?:giriş|giris|opening|intro)\b\s*[.:]\s*/gi, ' ')
    .replace(/\btitle\s*[.:]\s*([^.:\n]{2,120}?)\s*[.:]\s*(?:detaylar|details?)\s*[.:]\s*/gi, (_match, title: string) => formatAiHeading(title))
    .replace(/\btitle\s*[.:]\s*([^.:\n]{2,120}?)\s*[.:]\s*/gi, (_match, title: string) => formatAiHeading(title))
    .replace(/\bid\s*[.:]\s*[a-z0-9_]+\s*[.:]*/gi, ' ')
    .replace(/\b(?:body|detaylar|details?|description|content|text|label|heading|icon)\b\s*[.:]*/gi, ' ');

  const headingRules: Array<{ pattern: RegExp; heading: string }> = [
    { pattern: /\b(?:temel özet|temel ozet|coreSummary|core_summary|overview)\b\s*[.:]\s*/gi, heading: 'Temel Özet' },
    { pattern: /\bkozmik portrenin özeti\b\s*[.:]\s*/gi, heading: 'Kozmik Portrenin Özeti' },
    { pattern: /\b(?:günlük hayat örneği|gunluk hayat ornegi|dailyLifeExample|daily_life_example)\b\s*[.:]\s*/gi, heading: 'Günlük Hayat Örneği' },
    { pattern: /\b(?:öne çıkan noktalar|one cikan noktalar|bulletPoints|bullet_points)\b\s*[.:]\s*/gi, heading: 'Öne Çıkan Noktalar' },
  ];

  for (const { pattern, heading } of headingRules) {
    normalized = normalized.replace(pattern, formatAiHeading(heading));
  }

  const forcedInlineHeadings = [
    'Temel Özet',
    'Kozmik Portrenin Özeti',
    'Günlük Hayat Örneği',
    'Öne Çıkan Noktalar',
  ];

  for (const heading of forcedInlineHeadings) {
    const escapedHeading = escapeRegex(heading);
    normalized = normalized
      .replace(new RegExp(`([.!?])\\s*${escapedHeading}\\s*[.:]?`, 'giu'), (_match, punct: string) => `${punct}${formatAiHeading(heading)}`)
      .replace(new RegExp(`(^|\\n)\\s*${escapedHeading}\\s*[.:]?`, 'giu'), (_match, prefix: string) => `${prefix}${formatAiHeading(heading).trimStart()}`);
  }

  normalized = normalized
    .replace(/\b(?:bölümler|bolumler|bölüm|bolum|sections?|sectionList|section_list|topics|planetHighlights?|planet_highlights?|planet_insights|planets)\b\s*[.:]*/gi, ' ')
    .replace(/\b[a-z]+(?:_[a-z0-9]+)+\b(?=\s*[.:])/gi, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([.:])\s*(\*\*[^*]+\*\*)/g, '$1\n\n$2')
    .replace(/^[\s.:,;-]+|[\s.:,;-]+$/g, '')
    .trim();

  return normalized;
}

function normalizeAiTextForParagraphs(rawText: string): string {
  const withoutMetaNoise = sanitizeAiNarrativeText(rawText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return true;
      if (/^[{}\[\],"]+$/.test(line)) return false;
      if (/^("?)(version|tone|sections?|sectionList|topics|planetHighlights|planets|planet_insights|opening|coreSummary|overview|closing|conclusion|analysisLines|bulletPoints|dailyLifeExample|daily_life_example|planetId|intro|character|depth|title|body)\1\s*:/i.test(line)) {
        return false;
      }
      if (/^natal_v\d+$/i.test(line)) return false;
      return true;
    })
    .join('\n');

  return withoutMetaNoise
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    // LLM bazen tek satır sonu ile paragraf verir; cümle sonrası tek newline'ı paragraf kabul et.
    .replace(/([.!?])\n(?=[A-ZÇĞİÖŞÜ])/g, '$1\n\n')
    // Numaralı başlıkları görünür paragraf başlangıcına çevir.
    .replace(/\n(?=\d+\.\s)/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function inferTurkishAiTitle(rawText?: string | null, fallback?: string | null): string {
  const cleanedFallback = cleanAstroHeading(translateAstroTermsForUi(fallback ?? ''));
  if (cleanedFallback) {
    const normalizedFallback = normalizeForMatch(cleanedFallback);
    const looksTechnical =
      normalizedFallback.includes('section') ||
      normalizedFallback.includes('planet') ||
      normalizedFallback.includes('highlight');
    if (!looksTechnical && cleanedFallback.length >= 3) return cleanedFallback;
  }

  const cleanedText = translateAstroTermsForUi(rawText ?? '');
  const normalized = normalizeForMatch(cleanedText);

  let best: { title: string; score: number } | null = null;
  for (const rule of TITLE_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (normalized.includes(normalizeForMatch(keyword))) {
        score += 1;
      }
    }
    if (!best || score > best.score) {
      best = { title: rule.title, score };
    }
  }

  if (best && best.score > 0) return best.title;

  if (cleanedText) {
    const firstSentence = cleanedText.split(SENTENCE_BOUNDARY_REGEX)[0]?.trim() ?? '';
    if (firstSentence.length > 6 && firstSentence.length <= 72) return firstSentence;
  }

  return 'Kozmik Yorum';
}

export function splitPlainAiTextToBlocks(rawText: string): AiAccordionBlock[] {
  const normalizedRaw = normalizeAiTextForParagraphs(rawText);
  const cleaned = translateAstroTermsForUi(normalizedRaw);
  if (!cleaned) return [];

  const MAX_BLOCK_LEN = 520;
  const chunks = cleaned
    .split(/\n{2,}|(?:\r?\n[-*•]\s+)/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<string[]>((acc, part) => {
      const isHeadingOnly = /^\*\*[^*]+\*\*$/.test(part);
      if (isHeadingOnly) {
        const previous = acc[acc.length - 1];
        if (!previous) {
          acc.push(part);
          return acc;
        }

        if (/^\*\*[^*]+\*\*$/.test(previous)) {
          acc[acc.length - 1] = `${previous}\n\n${part}`;
          return acc;
        }
      }

      if (acc.length > 0 && /^\*\*[^*]+\*\*$/.test(acc[acc.length - 1])) {
        acc[acc.length - 1] = `${acc[acc.length - 1]}\n\n${part}`;
        return acc;
      }

      acc.push(part);
      return acc;
    }, [])
    .flatMap((part) => {
      if (part.length <= MAX_BLOCK_LEN) return [part];
      const pieces = part.split(SENTENCE_BOUNDARY_REGEX).reduce<string[]>((acc, sentence) => {
        if (!sentence.trim()) return acc;
        const current = acc[acc.length - 1];
        if (!current) {
          acc.push(sentence.trim());
          return acc;
        }
        if ((current + ' ' + sentence).length > MAX_BLOCK_LEN) {
          acc.push(sentence.trim());
        } else {
          acc[acc.length - 1] = `${current} ${sentence.trim()}`;
        }
        return acc;
      }, []);
      return pieces;
    });

  return chunks
    .filter((body) => body.length > 8)
    .slice(0, 10)
    .map((body, index) => ({
      id: `plain-${index + 1}`,
      title: inferTurkishAiTitle(body),
      body,
    }));
}

export function splitAiBodyToParagraphs(rawText?: string | null): string[] {
  const cleaned = normalizeAiTextForParagraphs(translateAstroTermsForUi(rawText ?? ''));
  if (!cleaned) return [];

  const parts = cleaned
    .split(/\n{2,}/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) return parts;

  // Tek paragraf geldiyse çok uzun metni mantıklı yerden böl.
  if (cleaned.length <= 260) return [cleaned];
  const sentences = cleaned.split(SENTENCE_BOUNDARY_REGEX).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const sentence of sentences) {
    const current = out[out.length - 1];
    if (!current) {
      out.push(sentence);
      continue;
    }
    if ((current + ' ' + sentence).length > 260) {
      out.push(sentence);
    } else {
      out[out.length - 1] = `${current} ${sentence}`;
    }
  }
  return out;
}
