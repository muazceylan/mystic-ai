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
    const firstSentence = cleanedText.split(/(?<=[.!?])\s+/)[0]?.trim() ?? '';
    if (firstSentence.length > 6 && firstSentence.length <= 72) return firstSentence;
  }

  return 'Kozmik Yorum';
}

export function splitPlainAiTextToBlocks(rawText: string): AiAccordionBlock[] {
  const cleaned = translateAstroTermsForUi(rawText);
  if (!cleaned) return [];

  const chunks = cleaned
    .split(/\n{2,}|(?:\r?\n[-*•]\s+)/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      if (part.length <= 320) return [part];
      const pieces = part.split(/(?<=[.!?])\s+/).reduce<string[]>((acc, sentence) => {
        const current = acc[acc.length - 1];
        if (!current) {
          acc.push(sentence);
          return acc;
        }
        if ((current + ' ' + sentence).length > 320) {
          acc.push(sentence);
        } else {
          acc[acc.length - 1] = `${current} ${sentence}`;
        }
        return acc;
      }, []);
      return pieces;
    });

  return chunks.slice(0, 12).map((body, index) => ({
    id: `plain-${index + 1}`,
    title: inferTurkishAiTitle(body),
    body,
  }));
}
