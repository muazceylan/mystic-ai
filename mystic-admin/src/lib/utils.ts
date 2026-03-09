import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined) {
  if (!date) return '-';
  return format(new Date(date), 'dd.MM.yyyy HH:mm');
}

export function timeAgo(date: string | null | undefined) {
  if (!date) return '-';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr });
}

export function statusColor(status: string) {
  switch (status) {
    case 'DRAFT': return 'bg-gray-700 text-gray-300';
    case 'SCHEDULED': return 'bg-blue-900 text-blue-300';
    case 'SENT': return 'bg-green-900 text-green-300';
    case 'CANCELLED': return 'bg-yellow-900 text-yellow-300';
    case 'FAILED': return 'bg-red-900 text-red-300';
    case 'PUBLISHED': return 'bg-green-900 text-green-300';
    case 'ARCHIVED': return 'bg-gray-700 text-gray-400';
    default: return 'bg-gray-700 text-gray-300';
  }
}

export const ZODIAC_SIGNS = [
  'ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO',
  'LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES',
] as const;

export const ZODIAC_EMOJIS: Record<string, string> = {
  ARIES: '♈', TAURUS: '♉', GEMINI: '♊', CANCER: '♋',
  LEO: '♌', VIRGO: '♍', LIBRA: '♎', SCORPIO: '♏',
  SAGITTARIUS: '♐', CAPRICORN: '♑', AQUARIUS: '♒', PISCES: '♓',
};

export const ZODIAC_TR: Record<string, string> = {
  ARIES: 'Koç', TAURUS: 'Boğa', GEMINI: 'İkizler', CANCER: 'Yengeç',
  LEO: 'Aslan', VIRGO: 'Başak', LIBRA: 'Terazi', SCORPIO: 'Akrep',
  SAGITTARIUS: 'Yay', CAPRICORN: 'Oğlak', AQUARIUS: 'Kova', PISCES: 'Balık',
};

export function sourceTypeLabel(sourceType: string) {
  switch (sourceType) {
    case 'EXTERNAL_API': return 'Dış API';
    case 'ADMIN_CREATED': return 'Admin Oluşturdu';
    case 'ADMIN_OVERRIDDEN': return 'Admin Düzenledi';
    default: return sourceType;
  }
}

export function sourceTypeColor(sourceType: string) {
  switch (sourceType) {
    case 'EXTERNAL_API': return 'bg-blue-900 text-blue-300';
    case 'ADMIN_CREATED': return 'bg-violet-900 text-violet-300';
    case 'ADMIN_OVERRIDDEN': return 'bg-amber-900 text-amber-300';
    default: return 'bg-gray-700 text-gray-300';
  }
}

export function roleColor(role: string) {
  switch (role) {
    case 'SUPER_ADMIN': return 'bg-purple-900 text-purple-300';
    case 'PRODUCT_ADMIN': return 'bg-blue-900 text-blue-300';
    case 'NOTIFICATION_MANAGER': return 'bg-green-900 text-green-300';
    default: return 'bg-gray-700 text-gray-300';
  }
}
