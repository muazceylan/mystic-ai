import { useQuery } from '@tanstack/react-query';
import {
  fetchLocationCities,
  fetchLocationCountries,
  getFallbackLocationCities,
  getFallbackLocationCountries,
} from '../services/locationCatalog.service';

const LOCATION_CATALOG_STALE_TIME = 1000 * 60 * 60 * 24;

export function useLocationCountries() {
  return useQuery({
    queryKey: ['location-catalog', 'countries'],
    queryFn: fetchLocationCountries,
    initialData: getFallbackLocationCountries,
    staleTime: LOCATION_CATALOG_STALE_TIME,
  });
}

export function useLocationCities(countryCode: string) {
  return useQuery({
    queryKey: ['location-catalog', 'cities', countryCode],
    queryFn: () => fetchLocationCities(countryCode),
    enabled: Boolean(countryCode),
    initialData: () => getFallbackLocationCities(countryCode),
    staleTime: LOCATION_CATALOG_STALE_TIME,
  });
}
