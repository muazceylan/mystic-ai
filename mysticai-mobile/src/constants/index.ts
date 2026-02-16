// Countries list for birth country selection
export const COUNTRIES = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italia' },
  { code: 'ES', name: 'España' },
  { code: 'RU', name: 'Россия' },
  { code: 'CN', name: '中国' },
  { code: 'JP', name: '日本' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NL', name: 'Nederland' },
  { code: 'BE', name: 'België' },
  { code: 'CH', name: 'Schweiz' },
  { code: 'AT', name: 'Österreich' },
  { code: 'SE', name: 'Sverige' },
  { code: 'NO', name: 'Norge' },
  { code: 'DK', name: 'Danmark' },
  { code: 'FI', name: 'Suomi' },
  { code: 'PL', name: 'Polska' },
  { code: 'CZ', name: 'Česko' },
  { code: 'HU', name: 'Magyarország' },
  { code: 'GR', name: 'Ελλάδα' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Perú' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'مصر' },
  { code: 'SA', name: 'السعودية' },
  { code: 'AE', name: 'الإمارات' },
  { code: 'IL', name: 'י�שראל' },
  { code: 'IN', name: 'भारत' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'KR', name: '대한민국' },
  { code: 'TW', name: '台灣' },
  { code: 'HK', name: '香港' },
  { code: 'NZ', name: 'New Zealand' },
];

// Cities by country (main cities for Türkiye and popular international cities)
export const CITIES: Record<string, { name: string; timezone: string }[]> = {
  TR: [
    { name: 'İstanbul', timezone: 'Europe/Istanbul' },
    { name: 'Ankara', timezone: 'Europe/Istanbul' },
    { name: 'İzmir', timezone: 'Europe/Istanbul' },
    { name: 'Antalya', timezone: 'Europe/Istanbul' },
    { name: 'Bursa', timezone: 'Europe/Istanbul' },
    { name: 'Adana', timezone: 'Europe/Istanbul' },
    { name: 'Gaziantep', timezone: 'Europe/Istanbul' },
    { name: 'Konya', timezone: 'Europe/Istanbul' },
    { name: 'Kayseri', timezone: 'Europe/Istanbul' },
    { name: 'Mersin', timezone: 'Europe/Istanbul' },
    { name: 'Eskişehir', timezone: 'Europe/Istanbul' },
    { name: 'Samsun', timezone: 'Europe/Istanbul' },
    { name: 'Denizli', timezone: 'Europe/Istanbul' },
    { name: 'Şanlıurfa', timezone: 'Europe/Istanbul' },
    { name: 'Malatya', timezone: 'Europe/Istanbul' },
  ],
  US: [
    { name: 'New York', timezone: 'America/New_York' },
    { name: 'Los Angeles', timezone: 'America/Los_Angeles' },
    { name: 'Chicago', timezone: 'America/Chicago' },
    { name: 'Houston', timezone: 'America/Chicago' },
    { name: 'Phoenix', timezone: 'America/Phoenix' },
    { name: 'San Francisco', timezone: 'America/Los_Angeles' },
    { name: 'Miami', timezone: 'America/New_York' },
    { name: 'Seattle', timezone: 'America/Los_Angeles' },
  ],
  GB: [
    { name: 'London', timezone: 'Europe/London' },
    { name: 'Manchester', timezone: 'Europe/London' },
    { name: 'Birmingham', timezone: 'Europe/London' },
    { name: 'Edinburgh', timezone: 'Europe/London' },
    { name: 'Glasgow', timezone: 'Europe/London' },
  ],
  DE: [
    { name: 'Berlin', timezone: 'Europe/Berlin' },
    { name: 'Hamburg', timezone: 'Europe/Berlin' },
    { name: 'München', timezone: 'Europe/Berlin' },
    { name: 'Köln', timezone: 'Europe/Berlin' },
    { name: 'Frankfurt', timezone: 'Europe/Berlin' },
  ],
  default: [
    { name: 'Other/Manual Entry', timezone: 'UTC' },
  ],
};

// Zodiac signs with dates
export const ZODIAC_SIGNS = [
  { name: 'Oğlak', symbol: '♑', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
  { name: 'Kova', symbol: '♒', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
  { name: 'Balık', symbol: '♓', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
  { name: 'Koç', symbol: '♈', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
  { name: 'Boğa', symbol: '♉', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  { name: 'İkizler', symbol: '♊', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
  { name: 'Yengeç', symbol: '♋', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
  { name: 'Aslan', symbol: '♌', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
  { name: 'Başak', symbol: '♍', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
  { name: 'Terazi', symbol: '♎', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
  { name: 'Akrep', symbol: '♏', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
  { name: 'Yay', symbol: '♐', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
];

// Get zodiac sign by birth date
export function getZodiacSign(month: number, day: number): string {
  for (const sign of ZODIAC_SIGNS) {
    if (
      (month === sign.startMonth && day >= sign.startDay) ||
      (month === sign.endMonth && day <= sign.endDay)
    ) {
      return `${sign.symbol} ${sign.name}`;
    }
  }
  return '';
}

// Focus points for life intentions
export const FOCUS_POINTS = [
  { id: 'career', title: 'Kariyer', emoji: '💼', description: 'İş ve meslek' },
  { id: 'love', title: 'Aşk', emoji: '💕', description: 'Romantik ilişkiler' },
  { id: 'money', title: 'Para', emoji: '💰', description: 'Finansal bolluk' },
  { id: 'health', title: 'Sağlık', emoji: '❤️', description: 'Fiziksel wellness' },
  { id: 'family', title: 'Aile', emoji: '👨‍👩‍👧', description: 'Aile ilişkileri' },
  { id: 'spiritual', title: 'Ruhani', emoji: '✨', description: 'Maneviyat' },
];

// Gender options
export const GENDER_OPTIONS = [
  { id: 'female', title: 'Kadın', emoji: '👩' },
  { id: 'male', title: 'Erkek', emoji: '👨' },
  { id: 'prefer_not_to_say', title: 'Belirtmek İstemiyorum', emoji: '🌈' },
];

// Marital status options
export const MARITAL_STATUS_OPTIONS = [
  { id: 'single', title: 'Bekar', emoji: '✨' },
  { id: 'married', title: 'Evli', emoji: '💍' },
  { id: 'divorced', title: 'Boşanmış', emoji: '🌿' },
  { id: 'widowed', title: 'Dul', emoji: '🕊️' },
  { id: 'relationship', title: 'İlişkide', emoji: '💑' },
];
