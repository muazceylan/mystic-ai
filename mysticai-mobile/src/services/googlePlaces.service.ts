const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

export interface GooglePlaceSuggestion {
  placeId: string;
  description: string;
  primaryText: string;
  secondaryText?: string;
}

export interface GooglePlaceSelection {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

type GoogleStatus = 'OK' | 'ZERO_RESULTS' | string;

interface AutocompleteResponse {
  status: GoogleStatus;
  predictions?: Array<{
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text: string;
      secondary_text?: string;
    };
  }>;
  error_message?: string;
}

interface PlaceDetailsResponse {
  status: GoogleStatus;
  result?: {
    place_id: string;
    name?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  };
  error_message?: string;
}

interface TimezoneResponse {
  status: GoogleStatus;
  timeZoneId?: string;
  errorMessage?: string;
}

function hasGooglePlacesKey() {
  return Boolean(GOOGLE_API_KEY);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function searchGooglePlaceSuggestions(
  input: string,
  sessionToken?: string
): Promise<GooglePlaceSuggestion[]> {
  const query = input.trim();
  if (!query || query.length < 2 || !hasGooglePlacesKey()) {
    return [];
  }

  const params = new URLSearchParams({
    input: query,
    language: 'tr',
    key: GOOGLE_API_KEY,
  });

  if (sessionToken) {
    params.set('sessiontoken', sessionToken);
  }

  const data = await fetchJson<AutocompleteResponse>(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
  );

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || 'Google Places autocomplete failed');
  }

  return (data.predictions ?? []).map((item) => ({
    placeId: item.place_id,
    description: item.description,
    primaryText: item.structured_formatting?.main_text || item.description,
    secondaryText: item.structured_formatting?.secondary_text,
  }));
}

async function fetchTimezoneForLocation(latitude: number, longitude: number): Promise<string | null> {
  if (!hasGooglePlacesKey()) return null;

  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    timestamp: `${Math.floor(Date.now() / 1000)}`,
    language: 'tr',
    key: GOOGLE_API_KEY,
  });

  const data = await fetchJson<TimezoneResponse>(
    `https://maps.googleapis.com/maps/api/timezone/json?${params.toString()}`
  );

  if (data.status !== 'OK') {
    return null;
  }

  return data.timeZoneId ?? null;
}

export async function getGooglePlaceSelection(
  placeId: string,
  sessionToken?: string
): Promise<GooglePlaceSelection | null> {
  if (!placeId || !hasGooglePlacesKey()) {
    return null;
  }

  const params = new URLSearchParams({
    place_id: placeId,
    language: 'tr',
    fields: 'place_id,name,formatted_address,geometry',
    key: GOOGLE_API_KEY,
  });

  if (sessionToken) {
    params.set('sessiontoken', sessionToken);
  }

  const data = await fetchJson<PlaceDetailsResponse>(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
  );

  if (data.status !== 'OK' || !data.result?.geometry?.location) {
    return null;
  }

  const latitude = data.result.geometry.location.lat;
  const longitude = data.result.geometry.location.lng;
  const timezone = await fetchTimezoneForLocation(latitude, longitude);

  return {
    placeId: data.result.place_id,
    name: data.result.name || data.result.formatted_address || '',
    address: data.result.formatted_address || data.result.name || '',
    latitude,
    longitude,
    timezone,
  };
}

export function isGooglePlacesConfigured() {
  return hasGooglePlacesKey();
}

