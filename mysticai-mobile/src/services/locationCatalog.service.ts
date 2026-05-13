import api from './api';
import { CITIES, COUNTRIES } from '../constants';

export interface LocationCountry {
  code: string;
  name: string;
  cityCount?: number;
}

export interface LocationCity {
  name: string;
  timezone: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function getFallbackLocationCountries(): LocationCountry[] {
  return COUNTRIES.map((country) => ({
    code: country.code,
    name: country.name,
    cityCount: (CITIES[country.code] ?? []).filter((city) => city.name !== 'Other/Manual Entry').length,
  }));
}

export function getFallbackLocationCities(countryCode: string): LocationCity[] {
  return (CITIES[countryCode] ?? [])
    .filter((city) => city.name !== 'Other/Manual Entry')
    .map((city) => ({
      name: city.name,
      timezone: city.timezone,
      latitude: null,
      longitude: null,
    }));
}

export function normalizeLocationSearchText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim();
}

function mergeCountries(primary: LocationCountry[], fallback: LocationCountry[]): LocationCountry[] {
  const merged = new Map<string, LocationCountry>();

  for (const item of [...primary, ...fallback]) {
    if (!item.code) continue;
    merged.set(item.code, merged.get(item.code)
      ? {
          code: item.code,
          name: merged.get(item.code)?.name || item.name,
          cityCount: Math.max(merged.get(item.code)?.cityCount ?? 0, item.cityCount ?? 0),
        }
      : item);
  }

  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name, 'tr'));
}

function mergeCities(primary: LocationCity[], fallback: LocationCity[]): LocationCity[] {
  const merged = new Map<string, LocationCity>();

  for (const item of [...primary, ...fallback]) {
    const key = normalizeLocationSearchText(item.name);
    if (!key) continue;
    if (!merged.has(key)) {
      merged.set(key, item);
      continue;
    }

    const current = merged.get(key)!;
    merged.set(key, {
      name: current.name || item.name,
      timezone: current.timezone || item.timezone,
      latitude: current.latitude ?? item.latitude ?? null,
      longitude: current.longitude ?? item.longitude ?? null,
    });
  }

  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name, 'tr'));
}

export async function fetchLocationCountries(): Promise<LocationCountry[]> {
  const fallback = getFallbackLocationCountries();

  try {
    const response = await api.get<LocationCountry[]>('/api/v1/astrology/locations/countries');
    return mergeCountries(response.data ?? [], fallback);
  } catch {
    return fallback;
  }
}

export async function fetchLocationCities(countryCode: string): Promise<LocationCity[]> {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  const fallback = getFallbackLocationCities(normalizedCountryCode);

  if (!normalizedCountryCode) {
    return [];
  }

  try {
    const response = await api.get<LocationCity[]>(
      `/api/v1/astrology/locations/countries/${encodeURIComponent(normalizedCountryCode)}/cities`
    );
    const merged = mergeCities(response.data ?? [], fallback);
    return merged.length > 0 ? merged : fallback;
  } catch {
    return fallback;
  }
}

export async function searchLocationSettlements(
  countryCode: string,
  query: string,
): Promise<LocationCity[]> {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  if (!normalizedCountryCode || !query.trim()) return [];

  try {
    const response = await api.get<LocationCity[]>(
      `/api/v1/astrology/locations/countries/${encodeURIComponent(normalizedCountryCode)}/search`,
      { params: { q: query.trim() } },
    );
    return response.data ?? [];
  } catch {
    return [];
  }
}

export function resolveCountryNameByCode(
  code: string | null | undefined,
  countries?: LocationCountry[] | null,
): string {
  if (!code) return '';

  const normalizedCode = code.trim().toUpperCase();
  const match = countries?.find((country) => country.code === normalizedCode)
    ?? COUNTRIES.find((country) => country.code === normalizedCode);
  if (match) {
    return match.name;
  }

  try {
    const displayNames = new Intl.DisplayNames(['tr'], { type: 'region' });
    const localized = displayNames.of(normalizedCode);
    if (localized) {
      return localized;
    }
  } catch {}

  return normalizedCode;
}
