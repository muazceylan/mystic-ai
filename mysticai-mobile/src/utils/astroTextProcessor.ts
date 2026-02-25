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

function normalizeAiTextForParagraphs(rawText: string): string {
  return rawText
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
