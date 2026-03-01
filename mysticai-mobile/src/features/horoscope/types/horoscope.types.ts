export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export type HoroscopePeriod = 'daily' | 'weekly';

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

export interface HoroscopeResponse {
  date: string;
  period: HoroscopePeriod;
  sign: ZodiacSign;
  language: 'tr' | 'en';
  highlights: [string, string, string];
  sections: {
    general: string;
    love: string;
    career: string;
    money: string;
    health: string;
    advice: string;
  };
  meta?: {
    lucky_color?: string;
    lucky_number?: string;
    compatibility?: string;
    mood?: string;
  };
  sources?: UpstreamSource[];
}

export interface UpstreamSource {
  name: string;
  text: string;
  meta?: {
    lucky_color?: string;
    lucky_number?: string;
    compatibility?: string;
    mood?: string;
  };
}

export interface ZodiacSignData {
  id: ZodiacSign;
  emoji: string;
  nameTr: string;
  nameEn: string;
  dateRange: string;
  dateRangeTr: string;
  element: ZodiacElement;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}
