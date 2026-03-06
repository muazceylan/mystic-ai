import { type UserProfile } from '../store/useAuthStore';
import {
  calculateNatalChart,
  fetchLatestNatalChart,
  type NatalChartRequest,
  type NatalChartResponse,
} from './astrology.service';

function trimToNull(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBirthTime(birthTime: string | null | undefined): string | undefined {
  const trimmed = trimToNull(birthTime);
  if (!trimmed) return undefined;
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

export function buildNatalChartRequestFromUser(user: UserProfile | null): NatalChartRequest | null {
  if (!user?.id || !user.birthDate) return null;

  const birthLocation =
    trimToNull(user.birthLocation)
    ?? [trimToNull(user.birthCity), trimToNull(user.birthCountry)].filter(Boolean).join(', ');

  if (!birthLocation) return null;

  const fullName =
    trimToNull(user.name)
    ?? [trimToNull(user.firstName), trimToNull(user.lastName)].filter(Boolean).join(' ');

  return {
    userId: user.id,
    name: fullName || undefined,
    birthDate: user.birthDate,
    birthTime: user.birthTimeUnknown ? undefined : normalizeBirthTime(user.birthTime),
    birthLocation,
    timezone: trimToNull(user.timezone) ?? undefined,
    latitude: user.latitude ?? user.lat,
    longitude: user.longitude ?? user.lng,
  };
}

function isNotFoundError(error: any): boolean {
  return Number(error?.response?.status) === 404;
}

export async function ensureNatalChartForUser(user: UserProfile | null): Promise<NatalChartResponse | null> {
  if (!user?.id) return null;

  try {
    const latest = await fetchLatestNatalChart(user.id);
    return latest.data;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  const request = buildNatalChartRequestFromUser(user);
  if (!request) return null;

  const created = await calculateNatalChart(request);
  return created.data;
}
